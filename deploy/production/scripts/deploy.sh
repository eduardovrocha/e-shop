#!/usr/bin/env bash
# ─── deploy.sh — Deploy contínuo Andrequicé ──────────────────────────────────
# Deploy direto na VPS (single-host, sem registry externo).
# As imagens são buildadas localmente e não são publicadas em registry.
# Para ambientes multi-host, substituir por: build → push → pull → up.
#
# Uso: bash deploy.sh [versão]
#   Ex: bash deploy.sh v1.2.0
#       bash deploy.sh          (usa 'latest')
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/home/deploy/andrequice"
ENV_FILE="${APP_DIR}/.env"
COMPOSE_FILE="${APP_DIR}/deploy/production/docker-compose.yml"
VERSION="${1:-latest}"

COMPOSE="docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE}"

# ── Função de rollback ────────────────────────────────────────────────────────
rollback() {
    if [ "${PREVIOUS_VERSION:-none}" = "none" ]; then
        echo "  Sem versão anterior conhecida — rollback manual necessário."
        return 1
    fi
    echo "⚠️  Rollback para ${PREVIOUS_VERSION}..."
    APP_VERSION="${PREVIOUS_VERSION}" ${COMPOSE} up -d --no-build api sidekiq frontend dashboard nginx
    echo "  Rollback concluído. Verifique os logs: ${COMPOSE} logs -f"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Andrequicé Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Versão: ${VERSION}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

export APP_VERSION="${VERSION}"

# Capturar versão atual em execução para eventual rollback
PREVIOUS_VERSION=$(${COMPOSE} ps --format "{{.Image}}" api 2>/dev/null \
    | head -1 | sed 's/.*://' || echo "none")
echo "  Versão anterior: ${PREVIOUS_VERSION}"

echo ""
echo "[1/7] Atualizando repositório..."
cd "${APP_DIR}"
git fetch --all --tags
git checkout "${VERSION}" 2>/dev/null || git pull origin main

echo ""
echo "[2/7] Build das imagens..."
${COMPOSE} build --no-cache api frontend dashboard

echo ""
echo "[3/7] Subindo dependências (postgres, redis, minio)..."
${COMPOSE} up -d postgres redis minio
echo "  Aguardando healthchecks..."
sleep 15

echo ""
echo "[4/7] Criando bucket MinIO se não existir..."
# Carrega variáveis do .env para uso direto no docker run
set -a; source "${ENV_FILE}"; set +a
docker run --rm \
    --network "${COMPOSE_PROJECT_NAME:-andrequice}_internal" \
    --entrypoint sh \
    minio/mc -c "
        mc alias set local http://minio:9000 \
            \"${STORAGE_ACCESS_KEY}\" \"${STORAGE_SECRET_KEY}\" --quiet &&
        mc mb local/${STORAGE_BUCKET} --ignore-existing --quiet
    "

echo ""
echo "[5/7] Rodando migrations..."
${COMPOSE} run --rm api bundle exec rails db:migrate

echo ""
echo "[6/7] Substituindo containers (zero-downtime)..."
${COMPOSE} up -d --no-deps --remove-orphans api sidekiq frontend dashboard nginx

echo ""
echo "[7/7] Verificando saúde dos serviços..."
TIMEOUT=60
START=$(date +%s)

for service in postgres redis minio api sidekiq frontend dashboard nginx; do
    echo -n "  Aguardando ${service}..."
    while true; do
        STATUS=$(${COMPOSE} ps --format "{{.Status}}" "${service}" 2>/dev/null | head -1)
        if echo "${STATUS}" | grep -qEi "healthy|running|up"; then
            echo " ✓"
            break
        fi
        ELAPSED=$(( $(date +%s) - START ))
        if [ "${ELAPSED}" -ge "${TIMEOUT}" ]; then
            echo " ✗"
            echo "❌ ${service} não subiu em ${TIMEOUT}s — iniciando rollback"
            rollback
            exit 1
        fi
        sleep 2
    done
done

echo ""
echo "  Limpando imagens antigas..."
docker image prune -f --filter "until=48h" 2>/dev/null || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Deploy ${VERSION} concluído em $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "  Status dos serviços:"
${COMPOSE} ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
