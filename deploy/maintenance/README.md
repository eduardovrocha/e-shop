# Modo manutenção — Andrequicé

Página estática **503 "Em manutenção"** servida pelo **Nginx**, independente de
Rails e React. Cobre storefront (`andrequice.store`), admin
(`dashboard.andrequice.store`) e API (`api.andrequice.store`).

Webhooks Stripe e health checks **continuam funcionando** durante a manutenção.

## Uso (via SSH na VPS)

```bash
ssh deploy@31.97.31.85
maintenance on       # ativa  — site/admin/API respondem 503
maintenance status   # verifica estado
maintenance off      # desativa — tráfego normal restaurado
maintenance log      # auditoria (ON/OFF com timestamp e origem)
```

> Roda como o usuário **`deploy`** (membro do grupo `docker`) — **não precisa de
> `sudo`**. O reload do nginx é feito via `docker compose exec`.

A ativação é por **presença do arquivo flag** `/var/www/maintenance/enabled`.
O nginx avalia `if (-f .../enabled)` a cada request, então o toggle é imediato;
o reload apenas valida e garante resolução limpa (zero downtime).

## Editar o visual ou o texto

Alterar [`index.html`](index.html) (ou [`api.json`](api.json) para a resposta da
API), commitar, dar deploy. O `deploy/scripts/update.sh` sincroniza os arquivos
para `/var/www/maintenance/` no host **sem nunca tocar no flag `enabled`**.

Tokens de cor e tipografia vêm de `source/frontend/tailwind.config.js`
(`--cream #FAF5EE`, `--sand #E8D1B0`, `--gold #D4A261`, `--copper #B86E2E`,
`--navy #0D2B45`, `--brown #4A2E1A`; Playfair Display + Inter com fallback de
sistema). Página autossuficiente: sem JS, sem fontes/CDN externas.

## Bypass por IP (testar sem afetar usuários)

No `deploy/production/nginx.conf`, descomentar em cada server block:

```nginx
# if ($remote_addr = "SEU.IP.AQUI") { set $maintenance 0; }
```

## Instalação no host (one-time)

Página + flag vivem em `/var/www/maintenance/`, montado read-only no container
nginx (`docker-compose.yml`). Setup inicial como **root**:

```bash
# 1. Diretório persistente, escrito pelo usuário deploy
sudo mkdir -p /var/www/maintenance
sudo chown deploy:deploy /var/www/maintenance

# 2. Página inicial (o update.sh re-sincroniza a cada deploy)
sudo -u deploy cp /home/deploy/andrequice/deploy/maintenance/index.html /var/www/maintenance/
sudo -u deploy cp /home/deploy/andrequice/deploy/maintenance/api.json   /var/www/maintenance/
# NÃO criar o arquivo `enabled` — manutenção começa DESLIGADA.

# 3. Comando global `maintenance`
sudo ln -sf /home/deploy/andrequice/deploy/scripts/maintenance /usr/local/bin/maintenance

# 4. Recriar o container nginx para aplicar o novo volume
cd /home/deploy/andrequice
docker compose -f deploy/production/docker-compose.yml --env-file .env up -d nginx
```

## ⚠️ Deploy durante manutenção

Os smoke tests do `update.sh` checam a **raiz** do storefront e do dashboard
esperando HTTP 200 (fatal → rollback). Com a manutenção **ativa**, essas raízes
respondem 503 e o deploy faria **rollback**. Health (`/up`) segue 200, então a
API passa, mas o front/dashboard não.

**Regra:** não faça deploy com a manutenção ligada. Sequência segura:
`maintenance off` → deploy → `maintenance on` (se ainda necessário).

## Testes (rodar via SSH após o setup)

```bash
maintenance on

# Storefront → 503 + HTML, com Retry-After
curl -sI https://andrequice.store/            | grep -E 'HTTP|Retry-After|Cache-Control'
# Dashboard (admin) → 503 + HTML
curl -sI https://dashboard.andrequice.store/  | grep -E 'HTTP|Retry-After'
# API → 503 + JSON
curl -si  https://api.andrequice.store/api/v1/products | head -20

# Exceções continuam funcionando:
curl -sI https://api.andrequice.store/up                       # 200
curl -si -X POST https://api.andrequice.store/api/v1/payments/webhook | head -1  # NÃO 503

maintenance off
curl -sI https://andrequice.store/            | head -1   # 200
maintenance log
```
