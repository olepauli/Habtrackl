const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'habtrack-secret-change-in-production';

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Nicht eingeloggt.' });

  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Kein Token.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch {
    res.status(401).json({ error: 'Token abgelaufen oder ungültig. Bitte erneut einloggen.' });
  }
};
