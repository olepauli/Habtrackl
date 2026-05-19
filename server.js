require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/habits',  require('./routes/habits'));
app.use('/api/profile', require('./routes/profile'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route nicht gefunden.' }));

// ── Start ─────────────────────────────────────────────────────────────────────
getDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 habtrack Backend läuft auf Port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });
});
