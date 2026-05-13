#!/usr/bin/env bash
set -euo pipefail

# ─── update.sh — Atualização segura em produção ──────────────────────────────
# Executar dentro do servidor 31.97.31.85 como usuário deploy.
# Consome exclusivamente a branch 'production' do repositório GitHub.
# Em caso de falha em qualquer etapa, rollback automático é acionado.
# ─────────────────────────────────────────────────────────────────────────────

APP_DIR="/home/deploy/andrequice"
ENV_FILE="${APP_DIR}/.env"
COMPOSE="docker compose -f ${APP_DIR}/deploy/production/docker-compose.yml --env-file ${ENV_FILE}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${APP_DIR}/deploy/logs/update_${TIMESTAMP}.log"
BACKUP_FILE="${APP_DIR}/deploy/backups/db_${TIMESTAMP}.sql.gz"
SERVICES="postgres redis minio api sidekiq frontend dashboard nginx"

mkdir -p "${APP_DIR}/deploy/logs"
mkdir -p "${APP_DIR}/deploy/backups"

# ── Tee: exibir e salvar log simultaneamente ──────────────────────────────────
exec > >(tee -a "$LOG_FILE") 2>&1

echo "════════════════════════════════════════════════════════════"
echo "  Andrequicé — Update em Produção"
echo "  Início: $(date)"
echo "  Servidor: $(hostname) (31.97.31.85)"
echo "════════════════════════════════════════════════════════════"

# ── Capturar estado anterior para rollback ────────────────────────────────────
PREVIOUS_COMMIT=$(git -C "$APP_DIR" rev-parse HEAD)
PREVIOUS_SHORT=$(git -C "$APP_DIR" rev-parse --short HEAD)

echo ""
echo "[1/8] Commit atual em produção: ${PREVIOUS_SHORT}"

# ── Função de rollback ────────────────────────────────────────────────────────
rollback() {
  local reason="${1:-erro desconhecido}"
  echo ""
  echo "⚠️  ROLLBACK INICIADO — Motivo: ${reason}"
  echo "    Restaurando commit: ${PREVIOUS_SHORT}"

  git -C "$APP_DIR" checkout production
  git -C "$APP_DIR" reset --hard "$PREVIOUS_COMMIT"

  echo "    Reiniciando containers com versão anterior..."
  $COMPOSE up -d --build --no-deps 2>/dev/null || true

  echo ""
  echo "❌ Update ABORTADO. Sistema restaurado para ${PREVIOUS_SHORT}."
  echo "   Log completo: ${LOG_FILE}"
  exit 1
}

# ── Função de health check ────────────────────────────────────────────────────
check_service() {
  local service="$1"
  local max_attempts=12
  local attempt=0

  echo -n "    Aguardando ${service}..."
  while [ $attempt -lt $max_attempts ]; do
    status=$($COMPOSE ps "$service" --format json 2>/dev/null \
      | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Health','') or d.get('State',''))" \
      2>/dev/null || echo "unknown")

    if echo "$status" | grep -qiE "healthy|running"; then
      echo " ✅"
      return 0
    fi
    sleep 5
    attempt=$((attempt + 1))
    echo -n "."
  done

  echo " ❌"
  return 1
}

# ── [2/8] Pull da branch production ──────────────────────────────────────────
echo ""
echo "[2/8] Atualizando código da branch production..."

cd "$APP_DIR"
git fetch origin production

NEW_COMMIT=$(git rev-parse origin/production)
NEW_SHORT=$(git rev-parse --short origin/production)

if [ "$PREVIOUS_COMMIT" = "$NEW_COMMIT" ] && [ "${FORCE_DEPLOY:-false}" != "true" ]; then
  echo "    Nenhuma atualização disponível. Código já está na versão ${NEW_SHORT}."
  echo ""
  echo "✅ Nada a fazer. Produção já está atualizada."
  exit 0
fi

echo "    Novo commit disponível: ${NEW_SHORT}"
echo "    $(git log --oneline "${PREVIOUS_COMMIT}..origin/production" | head -5)"

git checkout production
git reset --hard origin/production

# ── [3/8] Detectar migrations pendentes ──────────────────────────────────────
echo ""
echo "[3/8] Verificando migrations pendentes..."

PENDING_MIGRATIONS=$($COMPOSE exec -T api \
  bundle exec rails db:migrate:status 2>/dev/null \
  | grep "down" | wc -l || echo "0")

if [ "$PENDING_MIGRATIONS" -gt 0 ]; then
  echo "    ${PENDING_MIGRATIONS} migration(s) pendente(s) detectada(s)."
  NEEDS_MIGRATION=true
else
  echo "    Nenhuma migration pendente."
  NEEDS_MIGRATION=false
fi

# ── [4/8] Backup do banco antes de qualquer alteração ────────────────────────
echo ""
echo "[4/8] Realizando backup do banco de dados..."

# Carregar variáveis do .env para ter POSTGRES_USER e POSTGRES_DB disponíveis
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

$COMPOSE exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-andrequice}" \
  "${POSTGRES_DB:-andrequice_production}" \
  | gzip > "$BACKUP_FILE"

if [ -s "$BACKUP_FILE" ]; then
  BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  echo "    ✅ Backup criado: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
  echo "    ❌ Backup falhou ou está vazio."
  rollback "falha no backup do banco de dados"
fi

# Manter apenas os 10 backups mais recentes
ls -t "${APP_DIR}/deploy/backups/"*.sql.gz 2>/dev/null \
  | tail -n +11 | xargs rm -f || true

# ── [5/8] Build e subida dos containers ──────────────────────────────────────
echo ""
echo "[5/8] Buildando e subindo containers..."

BUILD_DATE=$(date +'%d/%m/%Y')
APP_VERSION=$(git -C "$APP_DIR" describe --tags --abbrev=0 2>/dev/null || echo "0.1.0")
APP_VERSION="${APP_VERSION#v}"

$COMPOSE build \
  --no-cache \
  --parallel \
  --build-arg VITE_APP_VERSION="${APP_VERSION}" \
  --build-arg VITE_BUILD_DATE="${BUILD_DATE}" \
  || rollback "falha no build dos containers"

$COMPOSE up -d \
  || rollback "falha ao subir os containers"

# Nginx retém o IP do container anterior após recriação — reload resolve DNS
echo "    Recarregando nginx para resolver novo IP dos containers..."
$COMPOSE exec -T nginx nginx -s reload 2>/dev/null || true

# ── [6/8] Executar migrations (se necessário) ────────────────────────────────
echo ""
echo "[6/8] Executando migrations..."

if [ "$NEEDS_MIGRATION" = true ]; then
  $COMPOSE exec -T api bundle exec rails db:migrate \
    || rollback "falha ao executar migrations"
  echo "    ✅ Migrations aplicadas."

  # Após migrations, caches Rails que serializam modelos podem estar com
  # schema desatualizado — limpar caches conhecidos para forçar recarregamento
  echo "    Limpando caches Rails afetados por schema change..."
  $COMPOSE exec -T api bundle exec rails runner \
    "Rails.cache.delete(StoreSetting::CACHE_KEY) rescue nil; puts 'cache limpo'" \
    2>/dev/null || true
else
  echo "    Nenhuma migration a executar."
fi

# ── [7/8] Health checks de todos os serviços ─────────────────────────────────
echo ""
echo "[7/8] Verificando saúde dos serviços..."

ALL_HEALTHY=true
for service in $SERVICES; do
  check_service "$service" || ALL_HEALTHY=false
done

if [ "$ALL_HEALTHY" = false ]; then
  rollback "um ou mais serviços não ficaram saudáveis após o deploy"
fi

# ── [8/8] Smoke tests ────────────────────────────────────────────────────────
echo ""
echo "[8/8] Executando smoke tests..."

# Nginx pode reter IP antigo após recriação de containers — recarrega antes dos testes
$COMPOSE exec -T nginx nginx -s reload 2>/dev/null || true
sleep 3

API_STATUS="000"
for attempt in 1 2 3; do
  API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 https://api.andrequice.store/up 2>/dev/null || echo "000")
  [ "$API_STATUS" = "200" ] && break
  echo "    ⏳ Tentativa ${attempt}/3 — API retornou HTTP ${API_STATUS}, recarregando nginx..."
  $COMPOSE exec -T nginx nginx -s reload 2>/dev/null || true
  sleep 5
done

if [ "$API_STATUS" = "200" ]; then
  echo "    ✅ API respondendo (HTTP ${API_STATUS})"
else
  echo "    ❌ API não respondeu corretamente (HTTP ${API_STATUS})"
  rollback "API não passou no smoke test (HTTP ${API_STATUS})"
fi

SETTINGS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 10 https://api.andrequice.store/api/v1/store_settings \
  2>/dev/null || echo "000")

if [ "$SETTINGS_STATUS" = "200" ]; then
  echo "    ✅ Endpoint store_settings respondendo (HTTP ${SETTINGS_STATUS})"
else
  echo "    ⚠️  Endpoint store_settings retornou HTTP ${SETTINGS_STATUS}"
fi

FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 10 https://andrequice.store 2>/dev/null || echo "000")

if [ "$FRONTEND_STATUS" = "200" ]; then
  echo "    ✅ Frontend público respondendo (HTTP ${FRONTEND_STATUS})"
else
  echo "    ❌ Frontend não respondeu (HTTP ${FRONTEND_STATUS})"
  rollback "frontend não passou no smoke test (HTTP ${FRONTEND_STATUS})"
fi

DASHBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 10 https://dashboard.andrequice.store 2>/dev/null || echo "000")

if [ "$DASHBOARD_STATUS" = "200" ]; then
  echo "    ✅ Dashboard respondendo (HTTP ${DASHBOARD_STATUS})"
else
  echo "    ❌ Dashboard não respondeu (HTTP ${DASHBOARD_STATUS})"
  rollback "dashboard não passou no smoke test (HTTP ${DASHBOARD_STATUS})"
fi

# ── Limpeza de imagens Docker não utilizadas ──────────────────────────────────
echo ""
echo "🧹 Limpando imagens Docker antigas..."
docker image prune -f --filter "until=24h" 2>/dev/null || true

# ── Relatório final ───────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Update concluído com sucesso"
echo "  Versão anterior : ${PREVIOUS_SHORT}"
echo "  Versão atual    : ${NEW_SHORT}"
echo "  Versão do build : v.${APP_VERSION:-0.1.0}, ${BUILD_DATE:-$(date +'%d/%m/%Y')}"
echo "  Migrations      : ${NEEDS_MIGRATION}"
echo "  Backup          : ${BACKUP_FILE}"
echo "  Log             : ${LOG_FILE}"
echo "  Término         : $(date)"
echo "════════════════════════════════════════════════════════════"
