#!/usr/bin/env bash
# ─── setup-vps.sh — Configuração inicial da VPS Hostinger KVM 4 ──────────────
# Executar como root na primeira vez: bash setup-vps.sh
# Ubuntu 22.04 LTS
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEPLOY_USER="deploy"
APP_DIR="/home/${DEPLOY_USER}/andrequice"

echo "==> [1/8] Atualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

echo "==> [2/8] Instalando dependências base..."
apt-get install -y -qq \
  curl wget git unzip \
  ufw fail2ban \
  ca-certificates gnupg lsb-release

echo "==> [3/8] Instalando Docker Engine..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> [4/8] Criando usuário de deploy..."
if ! id "${DEPLOY_USER}" &>/dev/null; then
  useradd -m -s /bin/bash "${DEPLOY_USER}"
  usermod -aG docker "${DEPLOY_USER}"
  echo "  → Usuário ${DEPLOY_USER} criado. Defina uma senha ou configure SSH key."
else
  echo "  → Usuário ${DEPLOY_USER} já existe."
  usermod -aG docker "${DEPLOY_USER}"
fi

echo "==> [5/8] Criando estrutura de diretórios..."
mkdir -p "${APP_DIR}/deploy/production/ssl"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"

echo "==> [6/8] Configurando firewall (UFW)..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP'
ufw allow 443/tcp  comment 'HTTPS'
ufw --force enable
echo "  → Firewall configurado."

echo "==> [7/8] Configurando fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled  = true
maxretry = 5
bantime  = 3600
findtime = 600
EOF
systemctl enable fail2ban --quiet
systemctl restart fail2ban

echo "==> [8/8] Configurando swap (2GB para segurança)..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "  → Swap de 2GB criado."
else
  echo "  → Swap já existe."
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Setup da VPS concluído!                                     ║"
echo "║                                                              ║"
echo "║  Próximos passos:                                            ║"
echo "║  1. Copiar .env.production.example → .env e preencher        ║"
echo "║  2. Executar scripts/ssl-init.sh para emitir certificados    ║"
echo "║  3. Executar scripts/deploy.sh para subir os containers      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
