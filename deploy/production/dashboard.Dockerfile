# ─── Dashboard admin — Dockerfile de produção ────────────────────────────────
# Build context: raiz do repositório (e-shop/)
# Multi-stage: Stage 1 = build Vite / Stage 2 = Nginx serve estático
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY source/dashboard/package.json \
     source/dashboard/package-lock.json* \
     ./

RUN npm ci

COPY source/dashboard/ .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runner

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist                         /usr/share/nginx/html
COPY deploy/production/dashboard.nginx.conf           /etc/nginx/conf.d/dashboard.conf

EXPOSE 3002

CMD ["nginx", "-g", "daemon off;"]
