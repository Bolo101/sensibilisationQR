#!/bin/sh
set -e

ADMIN_PASSWORD="${ADMIN_PASSWORD:-formation2026}"
PORT="${PORT:-3000}"
LOG_FILE="/tmp/cloudflared.log"

echo "[entrypoint] Démarrage du serveur Node sur le port ${PORT}..."
node server.js &
NODE_PID=$!

# Attend que le serveur Node réponde avant de lancer le tunnel
echo "[entrypoint] Attente de la disponibilité du serveur..."
until curl -s -o /dev/null "http://localhost:${PORT}/api/current-url"; do
  sleep 0.5
done
echo "[entrypoint] Serveur Node prêt."

echo "[entrypoint] Démarrage du tunnel Cloudflare (trycloudflare.com)..."
cloudflared tunnel --no-autoupdate --url "http://localhost:${PORT}" > "$LOG_FILE" 2>&1 &
CF_PID=$!

# Surveille le log cloudflared jusqu'à obtenir l'URL publique attribuée,
# puis la transmet automatiquement à l'application (régénère le QR code).
(
  URL=""
  ATTEMPTS=0
  while [ -z "$URL" ] && [ "$ATTEMPTS" -lt 60 ]; do
    URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | head -n1 || true)
    [ -z "$URL" ] && sleep 1
    ATTEMPTS=$((ATTEMPTS + 1))
  done

  if [ -n "$URL" ]; then
    echo "[entrypoint] URL publique détectée : $URL"
    curl -s -X POST "http://localhost:${PORT}/api/set-url" \
      -H "Content-Type: application/json" \
      -H "x-admin-password: ${ADMIN_PASSWORD}" \
      -d "{\"url\":\"${URL}\"}" > /dev/null
    echo "[entrypoint] QR code mis à jour automatiquement."
  else
    echo "[entrypoint] ATTENTION : URL Cloudflare non détectée après 60s. Consultez $LOG_FILE"
  fi
) &

# Si l'un des deux processus principaux s'arrête, on arrête proprement le conteneur
trap 'kill $NODE_PID $CF_PID 2>/dev/null' TERM INT

wait $NODE_PID
