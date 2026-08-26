# Démo de sensibilisation au quishing

Application self-hosted et gratuite pour simuler un "appel de présence" par QR code
piégé, avec déclenchement en direct d'une notification d'alerte sur les téléphones
des stagiaires.

## 1. Prérequis

- Node.js installé (v18 ou plus) — https://nodejs.org
- Une connexion réseau (le serveur + les téléphones doivent pouvoir se joindre)

## 2. Installation

```bash
npm install
```

## 3. Lancement

```bash
node server.js
```

Par défaut :
- Mot de passe admin : `formation2026`
- Page stagiaires : http://localhost:3000/presence.html
- Page admin (vous) : http://localhost:3000/admin.html

Pour changer le mot de passe :

```bash
ADMIN_PASSWORD="votre_mot_de_passe" node server.js
```

## 4. Rendre le QR code accessible aux téléphones (HTTPS obligatoire)

Les smartphones exigent une URL en HTTPS valide pour scanner un QR code sans
avertissement. Deux options gratuites, au choix :

### Option A — Cloudflare Tunnel (recommandé)

```bash
# Installation (une fois)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# Lancement (à chaque session)
./cloudflared tunnel --url http://localhost:3000
```

Le terminal affiche une URL du type `https://xxxx.trycloudflare.com`.

### Option B — ngrok

```bash
ngrok http 3000
```

Le terminal affiche une URL du type `https://xxxx.ngrok-free.app`.

## 5. Configurer l'URL publique dans l'appli

1. Ouvrez la page admin : `http://localhost:3000/admin.html`
2. Connectez-vous avec le mot de passe admin
3. Collez l'URL du tunnel (ex: `https://xxxx.trycloudflare.com`) dans le champ
   "QR code — appel de présence" puis cliquez sur **Définir**
4. Le QR code se met à jour automatiquement : projetez-le à l'écran

## 6. Déroulé de la session

1. Vous projetez le QR code depuis la page admin
2. Les stagiaires scannent et renseignent leur nom → ils voient "Présence
   enregistrée" et gardent l'onglet ouvert
3. La page admin affiche en temps réel le nombre de présences validées
4. Vous déroulez votre formation normalement
5. Au moment choisi, cliquez sur **"🎣 Déclencher le piège maintenant"**
6. Tous les téléphones connectés affichent instantanément un écran
   d'alerte expliquant qu'il s'agissait d'une simulation de quishing

## 7. Entre deux sessions

Cliquez sur **"Réinitialiser la session"** dans la page admin pour vider la
liste des participants avant le groupe suivant.

## Notes de sécurité / confidentialité

- Aucune donnée n'est envoyée à un tiers : tout reste sur votre machine
  (les noms saisis sont stockés en mémoire uniquement, perdus à l'arrêt du serveur)
- Le tunnel Cloudflare/ngrok chiffre le trafic et n'expose que ce que vous
  choisissez de lancer
- Pensez à informer vos stagiaires, en fin de session, du cadre pédagogique
  de cette démonstration
