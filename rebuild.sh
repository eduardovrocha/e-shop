#!/bin/bash
set -e

COMPOSE_FILE="deploy/development/docker-compose.yml"

echo "==> Andrequicé — Rebuild Completo"
echo ""

echo "==> Parando containers..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true

echo "==> Removendo imagens do projeto..."
docker compose -f "$COMPOSE_FILE" down --rmi local 2>/dev/null || true

echo "==> Removendo volumes do projeto..."
docker compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true

echo "==> Limpando cache de build do Docker..."
docker builder prune -f

echo ""
echo "==> Rebuild das imagens..."
docker compose -f "$COMPOSE_FILE" build --no-cache

echo ""
echo "==> Iniciando ambiente..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "==> Rebuild concluído!"
echo "    Frontend:  http://localhost:3090"
echo "    Backend:   http://localhost:3091/api/v1/health"
