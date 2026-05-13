# Andrequicé — Plataforma de E-commerce

Monorepo da plataforma de e-commerce Andrequicé. Inclui API Rails, loja pública em Vite/React, painel administrativo em React e infraestrutura Docker Compose para desenvolvimento e produção.

---

## Visão geral

```
e-shop/
├── source/
│   ├── backend/    # API Rails 7.2 (JSON, sem views HTML)
│   ├── frontend/   # Loja pública (Vite + React 19 + TypeScript)
│   └── dashboard/  # Painel admin (Vite + React 19 + TypeScript)
├── deploy/
│   ├── development/  # Docker Compose + Dockerfiles para dev local
│   └── production/   # Docker Compose + Dockerfiles + Nginx + scripts de deploy
└── docs/             # Documentação interna (não versionada)
```

---

## Arquitetura

```
                        Internet
                            │
                     ┌──────▼──────┐
                     │    Nginx    │  :80 → HTTPS redirect
                     │ (proxy SSL) │  :443 → roteamento por domínio
                     └──┬───┬───┬──┘
                        │   │   │
           ┌────────────┘   │   └─────────────┐
           ▼                ▼                  ▼
    ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
    │  Frontend   │  │  Dashboard  │  │  API Rails   │
    │  :3001      │  │  :3002      │  │  :3000       │
    │  Nginx/SPA  │  │  Nginx/SPA  │  │  Puma        │
    └─────────────┘  └─────────────┘  └──────┬───────┘
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
                 ┌────────────┐       ┌──────────────┐      ┌────────────┐
                 │ PostgreSQL │       │    Redis     │      │   MinIO    │
                 │    :5432   │       │    :6379     │      │  (storage) │
                 └────────────┘       └──────────────┘      └────────────┘
                                             │
                                      ┌──────▼──────┐
                                      │   Sidekiq   │
                                      │  (workers)  │
                                      └─────────────┘

Domínios de produção:
  andrequice.store          → Frontend público
  dashboard.andrequice.store → Painel admin
  api.andrequice.store       → API Rails
  storage.andrequice.store   → MinIO (Object Storage)
```

---

## Stack

| Componente   | Tecnologia                        | Versão     |
|--------------|-----------------------------------|------------|
| API          | Ruby on Rails                     | 7.2.x      |
| Linguagem    | Ruby                              | 3.3.0      |
| Banco        | PostgreSQL                        | 16         |
| Cache/Filas  | Redis                             | 7          |
| Workers      | Sidekiq                           | —          |
| Storage      | MinIO (S3-compatible, self-hosted)| latest     |
| Frontend     | Vite + React + TypeScript         | React 19   |
| Dashboard    | Vite + React + TypeScript         | React 19   |
| Proxy        | Nginx                             | 1.25       |
| SSL          | Let's Encrypt via Certbot         | —          |
| Pagamentos   | Stripe (Payment Intents)          | —          |
| Frete        | Melhor Envio                      | —          |
| Deploy       | Docker Compose (single-VPS)       | —          |

---

## Escopo da aplicação

### Frontend (`source/frontend/`)

Loja pública acessível em `andrequice.store`. Responsável por:

- Catálogo de produtos com filtros e variantes (tamanho/cor)
- Página de produto com galeria de imagens (Active Storage → MinIO)
- Carrinho de compras com persistência local (Zustand)
- Checkout com cálculo de frete via CEP (Melhor Envio) e pagamento via Stripe (Payment Intents)
- Confirmação de pedido pós-pagamento
- Rastreamento de pedido por token público (`/rastrear/:token`)
- SPA com roteamento client-side (React Router)

### Dashboard (`source/dashboard/`)

Painel administrativo em `dashboard.andrequice.store/admin`. Responsável por:

- Autenticação JWT com proteção de rotas
- Visão geral com métricas (pedidos, receita, estoque)
- Gestão completa de pedidos: listagem, detalhe, atualização de status, reenvio de e-mail
- Gestão de produtos: criação, edição, upload/reordenação de imagens, ativação
- Controle de estoque por variante (SKU, quantidade, reserva)
- Gestão de clientes com histórico de pedidos e endereços
- Configurações da loja (nome, endereço de retirada, contato)
- Configurações de frete: credenciais Melhor Envio, transportadoras, regras de frete grátis
- Cupons: backend implementado, **UI desabilitada** (a definir)

### API (`source/backend/`)

API JSON em `api.andrequice.store/api/v1`. Responsável por:

- Catálogo público de produtos (`GET /api/v1/products`)
- Configurações públicas da loja (`GET /api/v1/store`)
- Verificação de estoque (`POST /api/v1/stock/check`)
- Criação de Payment Intent Stripe com reserva atômica de estoque (`POST /api/v1/payments/create_intent`)
- Webhook Stripe: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.dispute.created`
- Cálculo de frete via Melhor Envio (`POST /api/v1/shipping/calculate`)
- Rastreamento de pedido (`GET /api/v1/orders/track/:token`)
- Rotas admin protegidas por JWT (`/api/v1/admin/*`)
- Health check (`GET /api/v1/health` e `GET /up`)
- Jobs Sidekiq: envio de e-mails transacionais, notificação de disputas, limpeza de webhooks

---

## Pré-requisitos (desenvolvimento)

- Docker ≥ 24.x com Docker Compose plugin
- PostgreSQL rodando no host (ou via Docker externo)
- Redis rodando no host (ou via Docker externo)
- Conta Stripe em modo teste (para pagamentos)

> O script `start.sh` verifica automaticamente a presença do Docker e do Compose.

---

## Configuração do ambiente de desenvolvimento

```bash
# 1. Copiar e preencher o arquivo de variáveis
cp deploy/development/.env.example deploy/development/.env
# Editar .env com suas credenciais (PostgreSQL, Redis, Stripe)

# 2. Subir todos os containers
bash start.sh
```

O `start.sh` detecta o IP local da máquina, exporta `HOST_URL` para que URLs do Active Storage funcionem via rede local, faz o build das imagens e sobe os containers.

### URLs após `start.sh`

| Serviço         | URL                              |
|-----------------|----------------------------------|
| Frontend        | http://localhost                 |
| Dashboard admin | http://localhost/admin           |
| API health      | http://localhost/api/v1/health   |
| API direto      | http://localhost:3091/api/v1/health |

### Parar o ambiente

```bash
docker compose -f deploy/development/docker-compose.yml down
```

### Variáveis obrigatórias em desenvolvimento

| Variável                  | Descrição                                   |
|---------------------------|---------------------------------------------|
| `POSTGRES_HOST`           | Host do PostgreSQL (padrão: host.docker.internal) |
| `POSTGRES_PASSWORD`       | Senha do PostgreSQL                         |
| `REDIS_HOST`              | Host do Redis (padrão: host.docker.internal) |
| `STRIPE_SECRET_KEY`       | Chave secreta Stripe (modo teste: `sk_test_`) |
| `STRIPE_WEBHOOK_SECRET`   | Segredo do webhook Stripe                   |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Chave pública Stripe                   |
| `JWT_SECRET`              | Segredo para assinar tokens JWT             |

---

## Testes e qualidade

### API (RSpec)

```bash
# Dentro do container backend em desenvolvimento:
docker compose -f deploy/development/docker-compose.yml exec backend bundle exec rspec

# Análise de segurança estática
docker compose -f deploy/development/docker-compose.yml exec backend bin/brakeman --no-pager

# Lint
docker compose -f deploy/development/docker-compose.yml exec backend bin/rubocop
```

### Frontend e Dashboard (Vitest)

```bash
# Frontend
cd source/frontend
npm test          # modo watch
npm run test:run  # execução única
npm run coverage  # com cobertura

# Dashboard
cd source/dashboard
npm run test:run
```

### CI

O GitHub Actions executa automaticamente em push para `main` e em pull requests:
- Brakeman (segurança Rails)
- RuboCop (lint Ruby)
- RSpec (testes de integração com PostgreSQL real)

---

## Deploy em produção

### Primeiro deploy (VPS nova)

```bash
# 1. Configurar a VPS (Docker, UFW, fail2ban, swap)
bash deploy/production/scripts/setup-vps.sh

# 2. Copiar e preencher o .env de produção
cp deploy/production/.env.production.example /home/deploy/andrequice/.env
# Editar com credenciais reais

# 3. Emitir certificados SSL (executar com Nginx já respondendo na porta 80)
bash deploy/production/scripts/ssl-init.sh

# 4. Deploy inicial
bash deploy/production/scripts/deploy.sh
```

### Deploys subsequentes

```bash
bash deploy/production/scripts/deploy.sh          # usa 'latest'
bash deploy/production/scripts/deploy.sh v1.2.0   # versão específica
```

O script realiza: atualização do repositório → build local das imagens → criação do bucket MinIO → migrations → substituição dos containers → verificação de saúde com rollback automático em caso de falha.

> **Modelo de deploy:** as imagens são buildadas diretamente na VPS (single-host, sem registry externo). Para ambientes multi-host, o fluxo deve ser adaptado para `build → push → pull → up`.

### Variáveis críticas de produção

Ver `deploy/production/.env.production.example` para a lista completa. As principais:

| Variável                | Descrição                                      |
|-------------------------|------------------------------------------------|
| `RAILS_MASTER_KEY`      | Chave mestra do Rails (descriptografa credentials) |
| `POSTGRES_PASSWORD`     | Senha do PostgreSQL                            |
| `STORAGE_ACCESS_KEY`    | Credencial MinIO / Active Storage              |
| `STORAGE_SECRET_KEY`    | Senha MinIO / Active Storage                   |
| `STORAGE_ENDPOINT`      | URL pública do MinIO (ex: https://storage.andrequice.store) |
| `STRIPE_SECRET_KEY`     | Chave secreta Stripe (produção: `sk_live_`)    |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook Stripe                      |
| `ME_CLIENT_ID`          | Client ID Melhor Envio                         |
| `ME_CLIENT_SECRET`      | Client Secret Melhor Envio                     |
| `JWT_SECRET`            | Segredo JWT (mínimo 64 bytes aleatórios)       |

---

## Acesso ao console MinIO (produção)

O console MinIO (:9001) não está exposto publicamente. Acesso via túnel SSH:

```bash
ssh -L 9001:localhost:9001 deploy@<IP_DA_VPS>
# Depois abrir: http://localhost:9001
```

---

## Licença

Proprietário — uso interno.
