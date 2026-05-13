# ─── Frontend público — Dockerfile de produção ───────────────────────────────
# Build context: raiz do repositório (e-shop/)
# Multi-stage: Stage 1 = build Vite / Stage 2 = Nginx serve estático
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Manifests primeiro — camada de cache separada das fontes
COPY source/frontend/package.json \
     source/frontend/package-lock.json* \
     source/frontend/yarn.lock* \
     source/frontend/pnpm-lock.yaml* \
     ./

RUN \
  if   [ -f yarn.lock ];      then yarn install --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm install --frozen-lockfile; \
  else npm ci; \
  fi

COPY source/frontend/ .

# Injetadas em build-time via --build-arg; gravadas no bundle pelo Vite
ARG VITE_API_URL
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_SENTRY_DSN
ARG VITE_APP_VERSION=0.1.0
ARG VITE_BUILD_DATE=""

ENV VITE_API_URL=$VITE_API_URL \
    VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_APP_VERSION=$VITE_APP_VERSION \
    VITE_BUILD_DATE=$VITE_BUILD_DATE

RUN npm run build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runner

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist                        /usr/share/nginx/html
COPY deploy/production/frontend.nginx.conf           /etc/nginx/conf.d/frontend.conf

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]
