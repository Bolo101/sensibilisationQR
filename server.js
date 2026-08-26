const express = require('express');
const http = require('http');
const path = require('path');
const QRCode = require('qrcode');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
// Mot de passe admin : changez-le avant votre session, ou lancez avec:
//   ADMIN_PASSWORD=monmotdepasse node server.js
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'formation2026';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// URL publique utilisée pour générer le QR code (à définir après avoir lancé
// le tunnel cloudflared/ngrok). Configurable sans redémarrer via /api/set-url.
let PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// Liste des stagiaires ayant "fait l'appel" (en mémoire, RAM uniquement)
const participants = [];

// --- Middleware simple pour protéger les routes admin ---
function checkAdmin(req, res, next) {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Mot de passe admin invalide' });
  }
  next();
}

// --- Appel de présence : le stagiaire soumet son nom ---
app.post('/api/presence', (req, res) => {
  const name = (req.body.name || '').toString().trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: 'Nom requis' });

  const entry = { name, time: new Date().toISOString() };
  participants.push(entry);
  io.to('admins').emit('participant-joined', entry);

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

// --- Liste des participants (admin uniquement) ---
app.get('/api/participants', checkAdmin, (req, res) => {
  res.json({ participants });
});

// --- Déclenchement du piège en direct ---
app.post('/api/trigger-trap', checkAdmin, (req, res) => {
  io.to('presence-room').emit('trap-triggered');
  res.json({ ok: true, notified: participants.length });
});

// --- Réinitialisation entre deux sessions ---
app.post('/api/reset', checkAdmin, (req, res) => {
  participants.length = 0;
  res.json({ ok: true });
});

// --- Sockets ---
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
