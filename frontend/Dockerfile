# Immagine del frontend BiblioStack.
#   target "dev"  -> server di sviluppo Vite (usato da docker/compose.dev.yml)
#   target "prod" -> build compilata servita da Caddy, con HTTPS e proxy verso il backend (docker/compose.prod.yml)
FROM node:22-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./

# ---------- sviluppo ----------
FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 5173
# --host 0.0.0.0 è necessario perché Vite sia raggiungibile dall'esterno del container
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

# ---------- build di produzione ----------
# VITE_* vengono incise nel bundle al momento del build: l'API è sullo stesso dominio, sotto /api
FROM base AS build
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_API_URL=$VITE_API_URL VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# ---------- produzione ----------
# Caddy serve i file statici compilati, inoltra /api al backend e gestisce HTTPS (Let's Encrypt o certificato interno)
FROM caddy:2.10.0-alpine AS prod
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80 443
