#!/usr/bin/env bash
# ─── ssl-init.sh — Emissão inicial de certificados Let's Encrypt ─────────────
# Executar UMA VEZ após o deploy inicial, com Nginx já rodando na porta 80.
# Os domínios precisam estar apontando para o IP da VPS antes de rodar.
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/home/deploy/andrequice"
COMPOSE="docker compose -f ${APP_DIR}/deploy/production/docker-compose.yml --env-file ${APP_DIR}/.env"

# ── Ajustar domínios e email ────────────────────────────────────────────────
DOMAIN_FRONTEND="andrequice.store"
DOMAIN_API="api.andrequice.store"
DOMAIN_DASHBOARD="dashboard.andrequice.store"
DOMAIN_STORAGE="storage.andrequice.store"
EMAIL="seu-email@andrequice.store"   # recebe alertas de expiração

echo "==> Iniciando apenas o Nginx (para ACME challenge)..."
${COMPOSE} up -d nginx

sleep 3

echo "==> Emitindo certificado para ${DOMAIN_FRONTEND} e www..."
docker run --rm \
  -v "${APP_DIR}/deploy/production/certbot_conf:/etc/letsencrypt" \
  -v "${APP_DIR}/deploy/production/certbot_www:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN_FRONTEND}" \
    -d "www.${DOMAIN_FRONTEND}"

echo "==> Emitindo certificado para ${DOMAIN_API}..."
docker run --rm \
  -v "${APP_DIR}/deploy/production/certbot_conf:/etc/letsencrypt" \
  -v "${APP_DIR}/deploy/production/certbot_www:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN_API}"

echo "==> Emitindo certificado para ${DOMAIN_DASHBOARD}..."
docker run --rm \
  -v "${APP_DIR}/deploy/production/certbot_conf:/etc/letsencrypt" \
  -v "${APP_DIR}/deploy/production/certbot_www:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN_DASHBOARD}"

echo "==> Emitindo certificado para ${DOMAIN_STORAGE}..."
docker run --rm \
  -v "${APP_DIR}/deploy/production/certbot_conf:/etc/letsencrypt" \
  -v "${APP_DIR}/deploy/production/certbot_www:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN_STORAGE}"

echo "==> Recarregando Nginx com SSL ativado..."
${COMPOSE} exec nginx nginx -s reload

echo ""
echo "✓ Certificados emitidos. SSL ativo para todos os domínios:"
echo "  - ${DOMAIN_FRONTEND} + www"
echo "  - ${DOMAIN_API}"
echo "  - ${DOMAIN_DASHBOARD}"
echo "  - ${DOMAIN_STORAGE}"
echo "  Renovação automática: o serviço certbot no compose roda a cada 12h."
