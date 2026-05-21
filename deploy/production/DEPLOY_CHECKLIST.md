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
- SMTP já configurado via Rails credentials (`smtp.*` em `credentials.yml.enc`)

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
- `RAILS_MASTER_KEY` — descriptografa `credentials.yml.enc` (SMTP + mail vivem lá)
- `POSTGRES_PASSWORD`
- `HOSTINGER_OBJ_ACCESS_KEY` + `HOSTINGER_OBJ_SECRET_KEY` + `HOSTINGER_OBJ_ENDPOINT`
- `ADMIN_SEED_PASSWORD`
- `CORS_ORIGINS`

> Credenciais Stripe (publishable / secret / webhook, modos test e live) ficam
> encriptadas em `stripe_settings` e são gerenciadas pelo admin via
> `/admin/stripe` no dashboard. Nenhuma variável de ambiente Stripe é
> necessária no servidor.

> SMTP (`smtp.address`, `smtp.user_name`, `smtp.password`) e e-mail de
> suporte (`mail.support`, `mail.from`) vivem em `config/credentials.yml.enc`
> e são descriptografados em tempo de boot usando `RAILS_MASTER_KEY`.
> Para editar: `docker exec -it production-api-1 sh -c 'EDITOR=nano bin/rails credentials:edit'`.

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

- URL: `https://api.andrequice.com.br/api/v1/payments/webhook`
- Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.dispute.created`
- Copiar o `Signing secret` e colar em `/admin/stripe` no dashboard
  (campo `Webhook secret` do modo correspondente). Repetir para o modo
  oposto se quiser permitir alternância entre test e live.

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
