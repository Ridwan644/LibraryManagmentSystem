const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', (req, res) => {
  const database = db.getDb();
  const { dateRange = '30' } = req.query;
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

  const stats = {};

  // Total checkouts
  database.get(
    `SELECT COUNT(*) as count FROM loans WHERE borrowDate >= ?`,
    [daysAgo.toISOString()],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      stats.totalCheckouts = row.count;

      // Active members
      database.get(
        `SELECT COUNT(*) as count FROM users WHERE role = 'member' AND status = 'approved'`,
        [],
        (err, row) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          stats.activeMembers = row.count;

          // Overdue items
          database.get(
            `SELECT COUNT(*) as count FROM loans 
             WHERE status = 'active' AND datetime(dueDate) < datetime('now')`,
            [],
            (err, row) => {
              if (err) return res.status(500).json({ error: 'Database error' });
              stats.overdueItems = row.count;

              // New acquisitions
              database.get(
                `SELECT COUNT(*) as count FROM books WHERE createdAt >= ?`,
                [daysAgo.toISOString()],
                (err, row) => {
                  if (err) return res.status(500).json({ error: 'Database error' });
                  stats.newAcquisitions = row.count;

                  res.json(stats);
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get borrowing trends
router.get('/borrowing-trends', (req, res) => {
  const database = db.getDb();
  const { dateRange = '30' } = req.query;
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

  database.all(
    `SELECT DATE(borrowDate) as date, COUNT(*) as count
     FROM loans
     WHERE borrowDate >= ?
     GROUP BY DATE(borrowDate)
     ORDER BY date ASC`,
    [daysAgo.toISOString()],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Get most popular books
router.get('/popular-books', (req, res) => {
  const database = db.getDb();
  const { dateRange = '30', limit = 10 } = req.query;
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

  database.all(
    `SELECT b.title, b.author, COUNT(l.loanID) as borrowCount
     FROM loans l
     JOIN books b ON l.bookID = b.bookID
     WHERE l.borrowDate >= ?
     GROUP BY b.bookID
     ORDER BY borrowCount DESC
     LIMIT ?`,
    [daysAgo.toISOString(), parseInt(limit)],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Get top active members
router.get('/active-members', (req, res) => {
  const database = db.getDb();
  const { dateRange = '30', limit = 10 } = req.query;
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

  database.all(
    `SELECT u.firstName || ' ' || u.lastName as memberName, u.membershipID, COUNT(l.loanID) as borrowCount
     FROM loans l
     JOIN users u ON l.userID = u.userID
     WHERE l.borrowDate >= ?
     GROUP BY u.userID
     ORDER BY borrowCount DESC
     LIMIT ?`,
    [daysAgo.toISOString(), parseInt(limit)],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Get fines summary
router.get('/fines', (req, res) => {
  const database = db.getDb();
  database.all(
    `SELECT f.*, u.firstName || ' ' || u.lastName as memberName, u.membershipID,
     b.title, b.author
     FROM fines f
     JOIN users u ON f.userID = u.userID
     JOIN loans l ON f.loanID = l.loanID
     JOIN books b ON l.bookID = b.bookID
     WHERE f.status = 'pending'
     ORDER BY f.createdAt DESC`,
    [],
    (err, fines) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(fines);
    }
  );
});

module.exports = router;

