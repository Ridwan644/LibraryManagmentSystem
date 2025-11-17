const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Verify session is still valid
      const database = db.getDb();
      database.get(
        'SELECT * FROM sessions WHERE token = ? AND revoked = 0 AND expiresAt > datetime("now")',
        [token],
        (err, session) => {
          if (err || !session) {
            return res.status(401).json({ error: 'Session expired or invalid' });
          }

          req.user = decoded;
          req.token = token;
          next();
        }
      );
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  JWT_SECRET
};

