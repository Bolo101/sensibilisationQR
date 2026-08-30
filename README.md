# Démo de sensibilisation au quishing

Application self-hosted et gratuite pour simuler un "appel de présence" par QR code
piégé, avec déclenchement en direct d'une notification d'alerte sur les téléphones
des stagiaires.

Le panneau de contrôle (`admin.html`) est volontairement neutre : il n'affiche
que le QR code et un compteur de présences, et peut être projeté au tableau
sans éveiller les soupçons. Seul le formateur, en le sachant, sait que le
bouton **"Finalisation saisie présence"** déclenche l'alerte sur les téléphones
des stagiaires connectés.

## Déploiement recommandé : Docker (tout-en-un, tunnel inclus)

Un seul conteneur embarque le serveur Node **et** `cloudflared` : le tunnel
public est lancé automatiquement au démarrage, son URL est détectée puis
injectée dans l'application, qui régénère aussitôt le QR code. Rien à copier-
coller.

### Prérequis
- Docker + Docker Compose installés

### Lancement

```bash
docker compose up --build
```

Cela va :
1. Construire l'image (Node + binaire `cloudflared`)
2. Démarrer le serveur sur le port 3000
3. Ouvrir un tunnel Cloudflare (`*.trycloudflare.com`)
4. Détecter automatiquement l'URL attribuée et mettre à jour le QR code

Consultez les logs pour repérer la ligne :

```
[entrypoint] URL publique détectée : https://xxxx.trycloudflare.com
```

Ouvrez ensuite `http://localhost:3000/admin.html` (mot de passe par défaut :
`formation2026`, modifiable dans `docker-compose.yml`) : le QR code est déjà
à jour, prêt à être projeté.

### Changer le mot de passe admin

Modifiez `docker-compose.yml` :

```yaml
environment:
  - ADMIN_PASSWORD=votre_mot_de_passe
```

puis relancez `docker compose up --build`.

### Arrêt

```bash
docker compose down
```

### Note sur le tunnel gratuit Cloudflare (`trycloudflare.com`)

Il s'agit d'un tunnel "rapide", sans compte Cloudflare requis, mais son URL
change à chaque redémarrage du conteneur — ce qui est pris en charge
automatiquement (le QR code se régénère seul, via un événement temps réel
qui rafraîchit la page admin sans avoir besoin de la recharger). Pour une URL
fixe et durable, il faudrait un tunnel Cloudflare nommé (compte Cloudflare
gratuit + domaine), ce qui dépasse le besoin d'une démo ponctuelle en salle.

---

## Déploiement alternatif : sans Docker

Si vous préférez lancer l'application directement avec Node, sans conteneur.

### Prérequis
- Node.js v18 ou plus — https://nodejs.org

### Installation

```bash
npm install
```

### Lancement

```bash
node server.js
```

- Mot de passe admin par défaut : `formation2026`
  (changez-le via `ADMIN_PASSWORD="votre_mot_de_passe" node server.js`)
- Page admin : http://localhost:3000/admin.html

### Exposer le serveur en HTTPS (obligatoire pour scanner le QR code)

Lancez, dans un second terminal :

```bash
# Cloudflare Tunnel
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
./cloudflared tunnel --url http://localhost:3000
```

Copiez l'URL affichée (`https://xxxx.trycloudflare.com`) puis définissez-la
manuellement via cette requête (le panneau admin n'a plus de champ dédié,
puisqu'en mode Docker c'est automatique) :

```bash
curl -X POST http://localhost:3000/api/set-url \
  -H "Content-Type: application/json" \
  -H "x-admin-password: formation2026" \
  -d '{"url":"https://xxxx.trycloudflare.com"}'
```

Le QR code sur la page admin se met à jour automatiquement (sans recharger la
page) dès que l'URL est définie.

---

## Déroulé de la session

1. Vous projetez la page admin (QR code + compteur), déjà à jour
2. Les stagiaires scannent et renseignent leur nom → ils voient "Présence
   enregistrée" et gardent l'onglet ouvert
3. Le compteur de présences se met à jour en temps réel sur l'écran projeté
4. Vous déroulez votre formation normalement
5. Au moment choisi, cliquez discrètement sur **"Finalisation saisie
   présence"**
6. Tous les téléphones connectés affichent instantanément un écran
   d'alerte expliquant qu'il s'agissait d'une simulation de quishing

## Entre deux sessions

Cliquez sur **"Réinitialiser la session"** dans la page admin pour vider la
liste des participants avant le groupe suivant.

## Notes de sécurité / confidentialité

- Aucune donnée n'est envoyée à un tiers : tout reste sur votre machine
  (les noms saisis sont stockés en mémoire uniquement, perdus à l'arrêt
  du conteneur/serveur)
- Le tunnel Cloudflare chiffre le trafic et n'expose que ce que vous
  choisissez de lancer
- Pensez à informer vos stagiaires, en fin de session, du cadre pédagogique
  de cette démonstration
