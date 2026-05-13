# Andrequicé — Checklist de Deploy em Produção

## Pré-requisitos na VPS

- [ ] VPS Hostinger KVM 4 provisionada (Ubuntu 22.04 LTS)
- [ ] DNS configurado e propagado:
  - `andrequice.com.br` → IP da VPS
  - `www.andrequice.com.br` → IP da VPS
  - `api.andrequice.com.br` → IP da VPS
  - `dashboard.andrequice.com.br` → IP da VPS
- [ ] Bucket criado no Hostinger Object Storage com acesso público para leitura
- [ ] Credenciais de acesso ao Object Storage geradas (Access Key + Secret Key)

---

## Passo 1 — Setup inicial da VPS (executar uma vez)

```bash
# Na VPS como root:
bash scripts/setup-vps.sh
```

Resultado esperado: Docker instalado, usuário `deploy` criado, UFW ativo, swap configurado.

---

## Passo 2 — Aplicar patches no código-fonte

Antes do primeiro build, aplicar as correções dos bloqueadores:

### 2.1 — production.rb
Aplicar `production.rb.patch`:
- Descomentar `config.require_master_key = true`
- Alterar `active_storage.service` para `:amazon`
- Adicionar bloco completo de SMTP

### 2.2 — storage.yml
Aplicar `storage.yml.patch` — adicionar serviço `:amazon` com `force_path_style: true`.

### 2.3 — ShippingSetting model
```ruby
# app/models/shipping_setting.rb
encrypts :me_client_secret, :me_access_token, :me_refresh_token, deterministic: false
```

### 2.4 — database.yml
```yaml
# Linha ~21
sslmode: <%= ENV.fetch("POSTGRES_SSLMODE", Rails.env.production? ? "require" : "prefer") %>
```

### 2.5 — seeds.rb
```ruby
# Adicionar no topo do bloco de criação do admin:
if Rails.env.production? && ENV["ADMIN_SEED_PASSWORD"].blank?
  raise "ADMIN_SEED_PASSWORD é obrigatória em produção"
end
```

---

## Passo 3 — Configurar variáveis de ambiente

```bash
# Na VPS como usuário deploy:
cp deploy/production/.env.production.example /home/deploy/andrequice/.env
nano /home/deploy/andrequice/.env
# Preencher TODOS os campos marcados como SUBSTITUIR
```

Variáveis obrigatórias para o deploy:
- `RAILS_MASTER_KEY`
- `POSTGRES_PASSWORD`
- `HOSTINGER_OBJ_ACCESS_KEY` + `HOSTINGER_OBJ_SECRET_KEY` + `HOSTINGER_OBJ_ENDPOINT`
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- `SMTP_HOST` + `SMTP_USERNAME` + `SMTP_PASSWORD`
- `ADMIN_SEED_PASSWORD`
- `CORS_ORIGINS`

---

## Passo 4 — Primeiro deploy

```bash
# Deploy inicial (sem SSL ainda — Nginx só em HTTP)
# Comentar temporariamente os blocos `listen 443 ssl` no nginx.conf
bash scripts/deploy.sh

# Emitir certificados SSL
bash scripts/ssl-init.sh

# Descomentar os blocos SSL e recarregar
docker compose -f deploy/production/docker-compose.yml exec nginx nginx -s reload
```

---

## Passo 5 — Seed do banco (apenas na primeira vez)

```bash
docker compose -f deploy/production/docker-compose.yml run --rm api \
  bundle exec rails db:seed
```

---

## Passo 6 — Configurar webhook no Stripe Dashboard

- URL: `https://api.andrequice.com.br/webhooks/stripe`
- Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.dispute.created`
- Copiar o `Signing secret` para `STRIPE_WEBHOOK_SECRET` no `.env`

---

## Deploy contínuo (versões futuras)

```bash
bash scripts/deploy.sh v1.1.0
```

---

## Verificação pós-deploy

- [ ] `https://andrequice.com.br` carrega a loja
- [ ] `https://dashboard.andrequice.com.br` carrega o admin
- [ ] Login admin funciona
- [ ] Upload de imagem de produto salva no Object Storage
- [ ] Email de teste recebido (trigger manual via Rails console se necessário)
- [ ] Webhook Stripe respondendo 200 (verificar no Stripe Dashboard)
- [ ] `docker compose ps` — todos os serviços `healthy` ou `running`

---

## Console MinIO

O console web do MinIO **não é exposto publicamente**. Acesse via túnel SSH:

```bash
ssh -L 9001:localhost:9001 deploy@IP_DA_VPS
```

Depois abra **http://localhost:9001** no browser local.

Credenciais: `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` definidas no `.env`.

---

## Comandos úteis

```bash
# Ver logs de todos os serviços
docker compose -f deploy/production/docker-compose.yml logs -f

# Logs apenas da API
docker compose -f deploy/production/docker-compose.yml logs -f api

# Rails console em produção
docker compose -f deploy/production/docker-compose.yml exec api bundle exec rails c

# Status do Sidekiq
docker compose -f deploy/production/docker-compose.yml exec api bundle exec sidekiq status
```
