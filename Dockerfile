# --- Image légère basée sur Node LTS ---
FROM node:20-alpine

WORKDIR /app

# On copie d'abord les manifestes pour profiter du cache Docker sur les dépendances
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Puis le reste du code applicatif
COPY server.js ./
COPY public ./public

# Port interne de l'application (mappé en localhost côté hôte via docker-compose)
EXPOSE 3000

# Mot de passe admin par défaut : à surcharger via docker-compose.yml ou -e ADMIN_PASSWORD=...
ENV ADMIN_PASSWORD=formation2026
ENV PORT=3000

# Exécution avec un utilisateur non-root pour limiter les privilèges du conteneur
USER node

CMD ["node", "server.js"]
