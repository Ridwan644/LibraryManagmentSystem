const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Universal search
router.get('/', (req, res) => {
  const database = db.getDb();
  const { q, type = 'books', limit = 50, offset = 0 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const searchTerm = `%${q}%`;

  if (type === 'books') {
    database.all(
      `SELECT * FROM books 
       WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ? OR genre LIKE ?
       ORDER BY title
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, searchTerm, searchTerm, parseInt(limit), parseInt(offset)],
      (err, books) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(books);
      }
    );
  } else if (type === 'members') {
    database.all(
      `SELECT userID, username, email, firstName, lastName, membershipID, membershipType, status
       FROM users 
       WHERE role = 'member' 
       AND (firstName LIKE ? OR lastName LIKE ? OR membershipID LIKE ? OR email LIKE ?)
       ORDER BY lastName, firstName
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, searchTerm, searchTerm, parseInt(limit), parseInt(offset)],
      (err, members) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(members);
      }
    );
  } else if (type === 'transactions') {
    database.all(
      `SELECT l.*, b.title, b.author, u.firstName || ' ' || u.lastName as memberName
       FROM loans l
       JOIN books b ON l.bookID = b.bookID
       JOIN users u ON l.userID = u.userID
       WHERE b.title LIKE ? OR b.author LIKE ? OR u.firstName LIKE ? OR u.lastName LIKE ?
       ORDER BY l.borrowDate DESC
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, searchTerm, searchTerm, parseInt(limit), parseInt(offset)],
      (err, transactions) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(transactions);
      }
    );
  } else {
    res.status(400).json({ error: 'Invalid search type' });
  }
});

module.exports = router;

