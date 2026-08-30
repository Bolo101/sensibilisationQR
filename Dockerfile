# --- Image unique : serveur Node + tunnel Cloudflare embarqué ---
FROM node:20-slim

ARG TARGETARCH

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Installe le binaire cloudflared correspondant à l'architecture de build
# (amd64 ou arm64, détecté automatiquement par Docker BuildKit)
RUN curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${TARGETARCH}" \
      -o /usr/local/bin/cloudflared \
    && chmod +x /usr/local/bin/cloudflared

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./
COPY public ./public
COPY entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

ENV PORT=3000
ENV ADMIN_PASSWORD=formation2026
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
