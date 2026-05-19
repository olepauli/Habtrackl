const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, persist } = require('./db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'habtrack-secret-change-in-production';

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: 'Alle Felder sind erforderlich.' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben.' });

    const db = await getDb();

    // Check if user exists
    const existing = db.exec(
      `SELECT id FROM users WHERE email = ? OR username = ?`,
      [email.toLowerCase(), username]
    );
    if (existing.length > 0 && existing[0].values.length > 0)
      return res.status(409).json({ error: 'Nutzername oder E-Mail bereits vergeben.' });

    const hash = await bcrypt.hash(password, 10);
    const userAvatar = avatar || '🧑';

    db.run(
      `INSERT INTO users (username, email, password_hash, avatar) VALUES (?, ?, ?, ?)`,
      [username, email.toLowerCase(), hash, userAvatar]
    );

    // Get the new user id
    const result = db.exec(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
    const userId = result[0].values[0][0];

    // Create default profile
    db.run(`INSERT INTO profile (user_id) VALUES (?)`, [userId]);

    persist();

    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: { id: userId, username, email: email.toLowerCase(), avatar: userAvatar }
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Serverfehler beim Registrieren.' });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });

    const db = await getDb();
    const result = db.exec(
      `SELECT id, username, email, password_hash, avatar FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );

    if (!result.length || !result[0].values.length)
      return res.status(401).json({ error: 'Ungültige E-Mail oder Passwort.' });

    const [userId, username, userEmail, hash, avatar] = result[0].values[0];

    const valid = await bcrypt.compare(password, hash);
    if (!valid)
      return res.status(401).json({ error: 'Ungültige E-Mail oder Passwort.' });

    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: { id: userId, username, email: userEmail, avatar }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Serverfehler beim Login.' });
  }
});

// ── Verify token (check if still valid) ──────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Kein Token.' });

    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const db = await getDb();
    const result = db.exec(
      `SELECT id, username, email, avatar FROM users WHERE id = ?`,
      [decoded.userId]
    );

    if (!result.length || !result[0].values.length)
      return res.status(404).json({ error: 'User nicht gefunden.' });

    const [id, username, email, avatar] = result[0].values[0];
    res.json({ user: { id, username, email, avatar } });

  } catch (err) {
    res.status(401).json({ error: 'Token ungültig.' });
  }
});

module.exports = router;
