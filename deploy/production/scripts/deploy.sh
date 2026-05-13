#!/usr/bin/env bash
# ─── deploy.sh — Deploy contínuo Andrequicé ──────────────────────────────────
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

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Andrequicé Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Versão: ${VERSION}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Exportar versão para o compose
export APP_VERSION="${VERSION}"

echo ""
echo "[1/6] Atualizando repositório..."
cd "${APP_DIR}"
git fetch --all --tags
git checkout "${VERSION}" 2>/dev/null || git pull origin main

echo ""
echo "[2/6] Build das imagens..."
${COMPOSE} build --no-cache api frontend dashboard

echo ""
echo "[3/6] Subindo dependências (postgres, redis, minio)..."
${COMPOSE} up -d postgres redis minio
echo "  Aguardando healthchecks..."
sleep 15

echo ""
echo "[4/6] Criando bucket MinIO se não existir..."
# Carrega variáveis do .env para uso direto no docker run
set -a; source "${ENV_FILE}"; set +a
docker run --rm \
  --network "${COMPOSE_PROJECT_NAME:-andrequice}_internal" \
  --entrypoint sh \
  minio/mc -c "
    mc alias set local http://minio:9000 \
      \"${MINIO_ROOT_USER}\" \"${MINIO_ROOT_PASSWORD}\" --quiet &&
    mc mb local/${STORAGE_BUCKET} --ignore-existing --quiet
  "

echo ""
echo "[5/6] Rodando migrations..."
${COMPOSE} run --rm api bundle exec rails db:migrate

echo ""
echo "[6/6] Substituindo containers (zero-downtime)..."
${COMPOSE} up -d --no-deps --remove-orphans api sidekiq frontend dashboard nginx

echo ""
echo "  Limpando imagens antigas..."
docker image prune -f --filter "until=48h" 2>/dev/null || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Deploy concluído: ${VERSION}"
echo ""
echo "  Status dos serviços:"
${COMPOSE} ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
