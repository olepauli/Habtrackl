const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'habtrack-secret-change-in-production';

/**
 * Middleware to verify JWT token and extract userId
 * Expects Authorization header: "Bearer <token>"
 */
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Kein Token vorhanden.' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token Format ungültig.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token abgelaufen.' });
    }
    return res.status(401).json({ error: 'Token ungültig.' });
  }
};

module.exports = auth;

