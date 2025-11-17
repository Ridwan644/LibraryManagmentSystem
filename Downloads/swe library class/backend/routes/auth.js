const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, firstName, lastName, phone, address, membershipType } = req.body;
    const database = db.getDb();

    // Check if user exists
    database.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (user) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate membership ID
      database.get('SELECT MAX(CAST(SUBSTR(membershipID, 5) AS INTEGER)) as maxID FROM users WHERE membershipID LIKE "LIB-%"', 
        (err, row) => {
          const nextID = (row?.maxID || 0) + 1;
          const membershipID = `LIB-${String(nextID).padStart(5, '0')}`;

          // Insert user
          database.run(
            `INSERT INTO users (username, email, password, firstName, lastName, phone, address, role, status, membershipID, membershipType, joinDate)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, firstName, lastName, phone || null, address || null, 'member', 'pending', 
             membershipID, membershipType || 'Adult', new Date().toISOString()],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to create user' });
              }

              res.status(201).json({
                message: 'Registration successful. Please wait for admin approval.',
                userID: this.lastID,
                membershipID
              });
            }
          );
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const database = db.getDb();

    database.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.status !== 'approved') {
        return res.status(403).json({ error: 'Account pending approval' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Create JWT token
      const token = jwt.sign(
        { userID: user.userID, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Create session
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      database.run(
        'INSERT INTO sessions (userID, token, expiresAt) VALUES (?, ?, ?)',
        [user.userID, token, expiresAt.toISOString()],
        (err) => {
          if (err) {
            console.error('Error creating session:', err);
          }

          res.json({
            token,
            user: {
              userID: user.userID,
              username: user.username,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              membershipID: user.membershipID
            }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', authenticate, (req, res) => {
  const database = db.getDb();
  database.run('UPDATE sessions SET revoked = 1 WHERE token = ?', [req.token], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  const database = db.getDb();
  database.get('SELECT userID, username, email, firstName, lastName, phone, address, role, status, membershipID, membershipType, joinDate, membershipExpiration FROM users WHERE userID = ?',
    [req.user.userID], (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    });
});

// Approve member registration (Admin/Librarian only)
router.post('/approve/:userID', authenticate, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'librarian') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { userID } = req.params;
  const database = db.getDb();

  // Set expiration date (1 year from now)
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);

  database.run(
    'UPDATE users SET status = ?, membershipExpiration = ? WHERE userID = ?',
    ['approved', expirationDate.toISOString(), userID],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to approve user' });
      }
      res.json({ message: 'User approved successfully' });
    }
  );
});

module.exports = router;

