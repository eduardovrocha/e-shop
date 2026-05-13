#!/bin/bash
set -e

COMPOSE_FILE="deploy/development/docker-compose.yml"
ENV_FILE="deploy/development/.env"
ENV_EXAMPLE="deploy/development/.env.example"

echo "==> Andrequicé — Ambiente de Desenvolvimento"
echo ""

# Validar docker
if ! command -v docker &>/dev/null; then
  echo "ERRO: Docker não encontrado. Instale em https://docs.docker.com/get-docker/"
  exit 1
fi

# Validar docker compose
if ! docker compose version &>/dev/null; then
  echo "ERRO: Docker Compose não encontrado. Instale o Docker Desktop ou o plugin compose."
  exit 1
fi

echo "✓ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
echo "✓ Docker Compose $(docker compose version --short)"
echo ""

# Criar .env se não existir
if [ ! -f "$ENV_FILE" ]; then
  echo "==> Criando $ENV_FILE a partir do exemplo..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "    Edite $ENV_FILE com suas credenciais antes de continuar."
  echo ""
fi

# ─── Detectar IP local ────────────────────────────────────────────────────────
detect_local_ip() {
  local ip=""

  # macOS: en0 (Wi-Fi), en1 (Ethernet)
  if command -v ipconfig &>/dev/null; then
    ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || "")
  fi

  # Linux fallback via ip route
  if [ -z "$ip" ] && command -v ip &>/dev/null; then
    ip=$(ip route get 1.1.1.1 2>/dev/null | awk '/src/{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')
  fi

  # Último recurso: hostname -I (Linux)
  if [ -z "$ip" ] && command -v hostname &>/dev/null; then
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi

  echo "${ip:-127.0.0.1}"
}

LOCAL_IP=$(detect_local_ip)

# Exportar HOST_URL com o IP detectado para geração correta de URLs pelo Rails
# (ex: URLs de redirect do ActiveStorage)
export HOST_URL="http://${LOCAL_IP}"

# ─── Build e start ────────────────────────────────────────────────────────────
echo "==> Construindo imagens..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo ""
echo "==> Iniciando containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Andrequicé — URLs de acesso"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Local (esta máquina):"
echo "    Frontend:   http://localhost"
echo "    Dashboard:  http://localhost/admin"
echo "    API health: http://localhost/api/v1/health"
echo ""
if [ "$LOCAL_IP" != "127.0.0.1" ]; then
  echo "  Rede local (celular, tablet, outros devices):"
  echo "    Frontend:   http://${LOCAL_IP}"
  echo "    Dashboard:  http://${LOCAL_IP}/admin"
  echo "    API health: http://${LOCAL_IP}/api/v1/health"
  echo ""
fi
echo "  Acesso direto (debug):"
echo "    Backend:    http://localhost:3091/api/v1/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  NOTA: porta 80 (nginx) é a entrada principal."
echo "        Certifique-se de que não há outro processo usando a porta 80."
echo ""
echo "==> Para ver logs:"
echo "    docker compose -f $COMPOSE_FILE logs -f"
echo ""
echo "==> Para parar:"
echo "    docker compose -f $COMPOSE_FILE down"
