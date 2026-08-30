# Démo de sensibilisation au quishing

Application self-hosted et gratuite pour simuler un "appel de présence" par QR code
piégé. Les stagiaires renseignent nom et prénom sur un écran unique, puis
voient automatiquement l'alerte de piège s'afficher 10 secondes après avoir
validé — sans aucune permission ni notification à accepter, pour ne pas
éveiller les soupçons avant la révélation.

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

## 3bis. Lancement via Docker (alternative)

Si vous préférez isoler l'application dans un conteneur (recommandé pour ne
rien installer sur votre machine hôte hors Docker) :

```bash
docker compose up --build
```

- L'application est accessible uniquement en local, depuis votre navigateur,
  via **http://localhost:3000** (le port n'est mappé que sur `127.0.0.1`,
  donc invisible depuis le réseau local — seul le tunnel Cloudflare/ngrok
  que vous lancerez à côté sera exposé publiquement, voir section 4).
- Pour changer le mot de passe admin, éditez la variable `ADMIN_PASSWORD`
  dans `docker-compose.yml` avant de lancer, ou surchargez-la en ligne de commande :

```bash
ADMIN_PASSWORD="votre_mot_de_passe" docker compose up --build
```

- Pour arrêter : `docker compose down`
- Les données des stagiaires (noms saisis) sont en mémoire dans le conteneur :
  elles sont perdues à chaque `docker compose down` / redémarrage, ce qui est
  volontaire (pas de trace entre deux sessions).

Sans Docker Compose, en Docker classique :

```bash
docker build -t quishing-demo .
docker run --rm -p 127.0.0.1:3000:3000 -e ADMIN_PASSWORD=formation2026 quishing-demo
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
2. Les stagiaires scannent, renseignent leur nom et prénom sur le **seul et
   unique écran** de la page, et cliquent sur **"Valider ma présence"**
3. Ils voient un message de confirmation ("Présence enregistrée")
4. **10 secondes plus tard, automatiquement**, l'écran d'alerte du piège
   s'affiche sur leur téléphone — aucune action, aucune permission à accepter
   entre-temps : rien ne pouvait laisser deviner ce qui allait se passer
5. La page admin affiche en temps réel le nombre de présences validées
6. Si vous voulez révéler le piège plus tôt pour tout le monde (par exemple
   pour clore l'exercice immédiatement), cliquez sur **"🎣 Déclencher le
   piège maintenant"** dans la page admin

### Contrainte à connaître

Ce fonctionnement nécessite que le stagiaire **garde l'onglet ouvert** sur
son téléphone pendant les quelques secondes qui suivent la validation (le
temps que le minuteur de 10 secondes s'écoule). C'est un choix assumé : les
vraies notifications système (Web Push) auraient permis de recevoir l'alerte
même onglet fermé, mais cela impose systématiquement une popup native du
navigateur demandant l'autorisation d'envoyer des notifications — visible et
incontournable, ce qui aurait révélé la démonstration avant l'heure. Dans ce
contexte de sensibilisation où la surprise est l'objectif pédagogique, le
minuteur silencieux est la meilleure option.

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
- Il n'est techniquement pas possible, et nous ne le proposons pas, de
  récupérer automatiquement le numéro de téléphone d'un stagiaire : aucun
  navigateur n'expose cette information à une page web. Seul un champ
  explicitement rempli par la personne (si vous choisissiez d'en ajouter un
  au formulaire) permettrait de le collecter.
