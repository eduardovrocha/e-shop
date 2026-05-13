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
mkdir -p "${APP_DIR}/deploy/logs"
mkdir -p "${APP_DIR}/deploy/backups"
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

echo "==> [+] Configurando repositório git..."
if [ ! -d "${APP_DIR}/.git" ]; then
  git config --global --add safe.directory "${APP_DIR}"
  cd "${APP_DIR}"
  git init
  git remote add origin git@github.com:eduardovrocha/e-shop.git
  git fetch origin production
  git checkout -b production --track origin/production
  echo "  → Repositório clonado na branch production."
else
  echo "  → Repositório git já configurado."
  git -C "${APP_DIR}" remote set-url origin git@github.com:eduardovrocha/e-shop.git
fi

echo "==> [+] Verificando GitHub deploy key..."
if [ ! -f /root/.ssh/github_deploy ]; then
  echo "  ⚠️  Nenhuma deploy key encontrada em /root/.ssh/github_deploy."
  echo "  → Gere uma com: ssh-keygen -t ed25519 -C 'deploy@andrequice' -f /root/.ssh/github_deploy -N ''"
  echo "  → Adicione a chave pública no GitHub: Settings → Deploy keys → Add deploy key"
else
  echo "  → Deploy key presente."
  # Garante que o SSH usa a deploy key para github.com
  if ! grep -q "github.com" /root/.ssh/config 2>/dev/null; then
    cat >> /root/.ssh/config <<'SSHCONF'

Host github.com
  HostName github.com
  User git
  IdentityFile /root/.ssh/github_deploy
  StrictHostKeyChecking no
SSHCONF
    chmod 600 /root/.ssh/config
    echo "  → SSH config atualizado para usar deploy key."
  fi
fi

echo "==> [+] Executando migrations iniciais..."
COMPOSE="docker compose -f ${APP_DIR}/deploy/production/docker-compose.yml --env-file ${APP_DIR}/.env"
if $COMPOSE ps api 2>/dev/null | grep -q "Up"; then
  $COMPOSE exec -T api bundle exec rails db:migrate RAILS_ENV=production \
    && echo "  → Migrations aplicadas." \
    || echo "  ⚠️  Migrations falharam. Execute manualmente após subir os containers."
else
  echo "  → Containers não estão rodando. Execute db:migrate após subir com deploy.sh."
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Setup da VPS concluído!                                     ║"
echo "║                                                              ║"
echo "║  Próximos passos:                                            ║"
echo "║  1. Copiar .env.production.example → .env e preencher        ║"
echo "║     ATENÇÃO: HOST_URL deve ser https://api.andrequice.store  ║"
echo "║              não https://andrequice.store (frontend)         ║"
echo "║  2. Executar scripts/ssl-init.sh para emitir certificados    ║"
echo "║  3. Executar scripts/deploy.sh para subir os containers      ║"
echo "║  4. Executar deploy/scripts/update.sh para deploys futuros   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
