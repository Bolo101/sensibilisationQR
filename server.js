const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const webpush = require('web-push');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
// Mot de passe admin : changez-le avant votre session, ou lancez avec:
//   ADMIN_PASSWORD=monmotdepasse node server.js
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'formation2026';

// --- Clés VAPID (Web Push) : générées une fois puis persistées sur disque,
// pour que les abonnements restent valides d'un redémarrage à l'autre. ---
const VAPID_FILE = path.join(__dirname, 'vapid-keys.json');
let vapidKeys;
if (fs.existsSync(VAPID_FILE)) {
  vapidKeys = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2));
}
webpush.setVapidDetails('mailto:formateur@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

app.use(express.json());

// La racine "/" (ex: l'URL brute du tunnel Cloudflare/ngrok) redirige vers la
// page de présence, pour éviter un "Cannot GET /" quand on ouvre l'URL sans
// chemin précis dans un navigateur.
app.get('/', (req, res) => {
  res.redirect('/presence.html');
});

app.use(express.static(path.join(__dirname, 'public')));

// URL publique utilisée pour générer le QR code (à définir après avoir lancé
// le tunnel cloudflared/ngrok). Configurable sans redémarrer via /api/set-url.
let PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// Participants : { name, time } — pour l'affichage du compteur de présence
const participants = [];

// Abonnements Web Push, indépendants des participants (un stagiaire peut
// s'abonner sans que ce soit lié nommément à sa présence). Dédupliqués par
// endpoint pour éviter les doublons en cas de re-abonnement.
const subscriptions = [];
function addSubscription(sub) {
  if (!sub || !sub.endpoint) return;
  if (!subscriptions.find((s) => s.endpoint === sub.endpoint)) {
    subscriptions.push(sub);
  }
}
function removeSubscriptionByEndpoint(endpoint) {
  const idx = subscriptions.findIndex((s) => s.endpoint === endpoint);
  if (idx !== -1) subscriptions.splice(idx, 1);
}

// --- Middleware simple pour protéger les routes admin ---
function checkAdmin(req, res, next) {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Mot de passe admin invalide' });
  }
  next();
}

// --- Clé publique VAPID, nécessaire côté client pour s'abonner au push ---
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// --- Appel de présence : le stagiaire soumet son nom ---
app.post('/api/presence', (req, res) => {
  const name = (req.body.name || '').toString().trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: 'Nom requis' });

  const entry = { name, time: new Date().toISOString() };
  participants.push(entry);
  io.to('admins').emit('participant-joined', entry);

  res.json({ ok: true });
});

// --- Abonnement Web Push (appelé juste après la présence, une fois la
// permission navigateur accordée) ---
app.post('/api/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Abonnement invalide' });
  addSubscription(sub);
  io.to('admins').emit('subscription-count', { count: subscriptions.length });
  res.json({ ok: true });
});

// --- QR code pointant vers la page de présence ---
app.get('/api/qrcode.png', async (req, res) => {
  try {
    const target = `${PUBLIC_URL}/presence.html`;
    const png = await QRCode.toBuffer(target, { width: 400, margin: 2 });
    res.type('png').send(png);
  } catch (e) {
    res.status(500).send('Erreur génération QR code');
  }
});

// --- Permet de définir/mettre à jour l'URL publique (après lancement tunnel) ---
app.post('/api/set-url', checkAdmin, (req, res) => {
  const url = (req.body.url || '').toString().trim().replace(/\/$/, '');
  if (!url) return res.status(400).json({ error: 'URL requise' });
  PUBLIC_URL = url;
  res.json({ ok: true, PUBLIC_URL });
});

app.get('/api/current-url', (req, res) => {
  res.json({ PUBLIC_URL });
});

// --- Liste des participants + nombre d'abonnements push (admin uniquement) ---
app.get('/api/participants', checkAdmin, (req, res) => {
  res.json({
    participants,
    subscriptionCount: subscriptions.length
  });
});

// --- Déclenchement du piège en direct : Web Push + fallback socket (onglet ouvert) ---
app.post('/api/trigger-trap', checkAdmin, async (req, res) => {
  // 1) Fallback temps réel pour les onglets restés ouverts au premier plan
  io.to('presence-room').emit('trap-triggered');

  // 2) Vraie notification système via Web Push pour tout le monde (fermé,
  // arrière-plan, ou premier plan : le Service Worker choisit la restitution)
  const payload = JSON.stringify({
    title: '🎣 Vous venez d\'être piégé',
    body: "Ce QR code d'appel de présence était une simulation de quishing."
  });

  const pushTotal = subscriptions.length;
  let sent = 0;
  let failed = 0;
  const deadEndpoints = [];

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (err) {
      failed++;
      // Abonnement expiré/invalide (désinstallation, permission révoquée...) :
      // on le retire pour ne plus retenter aux prochains déclenchements
      if (err.statusCode === 404 || err.statusCode === 410) {
        deadEndpoints.push(sub.endpoint);
      }
    }
  }));

  deadEndpoints.forEach(removeSubscriptionByEndpoint);

  res.json({ ok: true, notified: participants.length, pushSent: sent, pushFailed: failed, pushTotal });
});

// --- Réinitialisation entre deux sessions ---
app.post('/api/reset', checkAdmin, (req, res) => {
  participants.length = 0;
  res.json({ ok: true });
});

// --- Sockets (fallback affichage plein écran si l'onglet reste ouvert/actif) ---
io.on('connection', (socket) => {
  socket.on('join-presence', () => {
    socket.join('presence-room');
  });

  socket.on('join-admin', (pwd) => {
    if (pwd === ADMIN_PASSWORD) {
      socket.join('admins');
      socket.emit('admin-joined', { ok: true });
    } else {
      socket.emit('admin-joined', { ok: false });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Serveur quishing-demo lancé sur http://localhost:${PORT}`);
  console.log(`Mot de passe admin: ${ADMIN_PASSWORD}`);
  console.log(`Page stagiaires : http://localhost:${PORT}/presence.html`);
  console.log(`Page admin      : http://localhost:${PORT}/admin.html`);
});
