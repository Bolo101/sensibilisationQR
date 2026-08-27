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

## 3bis. Lancement via Docker (alternative)

Si vous préférez isoler l'application dans un conteneur (recommandé pour ne
rien installer sur votre machine hôte hors Docker) :

```bash
touch vapid-keys.json   # important, voir note ci-dessous
docker compose up --build
```

> **Important** : créez d'abord un fichier vide `vapid-keys.json` à la racine
> avec `touch` avant le premier lancement. Sans ça, Docker crée un **dossier**
> à la place du fichier monté en volume, ce qui empêche le serveur de
> persister ses clés Web Push — et donc invalide tous les abonnements
> notification des stagiaires à chaque redémarrage du conteneur.

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
2. Les stagiaires scannent, renseignent leur nom, et cliquent sur **"Valider
   ma présence"**. Ce même clic déclenche aussitôt la demande d'autorisation
   de notifications du navigateur (une seule popup native, à accepter) —
   il n'y a pas de bouton séparé « activer les notifications »
3. Une fois la permission accordée, les stagiaires peuvent fermer l'onglet
   ou changer d'application : ils **n'ont plus besoin de garder la page
   ouverte**
4. La page admin affiche en temps réel le nombre de présences validées et
   le nombre d'abonnements notification actifs
5. Vous déroulez votre formation normalement
6. Au moment choisi, cliquez sur **"🎣 Déclencher le piège maintenant"**
7. Chaque stagiaire reçoit alors :
   - **une vraie notification système**, affichée automatiquement par le
     téléphone (aucun clic à faire pour la voir, elle apparaît d'elle-même),
     s'il a accepté les notifications à l'étape 2 ; ou
   - **un écran plein écran** avec le message d'alerte s'il a refusé les
     notifications ou si son navigateur ne les supporte pas — cet écran se
     ferme tout seul au bout d'une minute, sans action requise

### Limitation connue : iPhone / Safari

Sur iPhone, les notifications push de sites web ne fonctionnent que si la
page a été **ajoutée à l'écran d'accueil** au préalable (limitation Apple).
La page affiche automatiquement un message d'aide à ce sujet sur iOS.
Pour les stagiaires sur iPhone qui n'ont pas fait cette manipulation, prévoyez
qu'ils gardent simplement l'onglet ouvert : ils recevront l'écran plein écran
via le fallback.

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
