const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Get all fees for a member
router.get('/member/:userID', (req, res) => {
  const database = db.getDb();
  database.all(
    `SELECT f.*, l.borrowDate, l.dueDate, l.returnDate,
     b.title, b.author, b.isbn
     FROM fines f
     LEFT JOIN loans l ON f.loanID = l.loanID
     LEFT JOIN books b ON l.bookID = b.bookID
     WHERE f.userID = ?
     ORDER BY f.createdAt DESC`,
    [req.params.userID],
    (err, fees) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(fees);
    }
  );
});

// Get all pending fees
router.get('/pending', (req, res) => {
  const database = db.getDb();
  database.all(
    `SELECT f.*, 
     u.firstName || ' ' || u.lastName as memberName, 
     u.membershipID,
     b.title, b.author, 
     l.borrowDate, l.dueDate
     FROM fines f
     JOIN users u ON f.userID = u.userID
     LEFT JOIN loans l ON f.loanID = l.loanID
     LEFT JOIN books b ON l.bookID = b.bookID
     WHERE f.status = 'pending'
     ORDER BY f.createdAt DESC`,
    [],
    (err, fees) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(fees);
    }
  );
});

// Get fee by ID
router.get('/:id', (req, res) => {
  const database = db.getDb();
  database.get(
    `SELECT f.*, 
     u.firstName || ' ' || u.lastName as memberName, 
     u.membershipID,
     b.title, b.author, 
     l.borrowDate, l.dueDate, l.returnDate
     FROM fines f
     JOIN users u ON f.userID = u.userID
     LEFT JOIN loans l ON f.loanID = l.loanID
     LEFT JOIN books b ON l.bookID = b.bookID
     WHERE f.fineID = ?`,
    [req.params.id],
    (err, fee) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!fee) return res.status(404).json({ error: 'Fee not found' });
      res.json(fee);
    }
  );
});

// Pay a fee
router.post('/:id/pay', (req, res) => {
  const database = db.getDb();
  const { amount, reference } = req.body;

  database.get('SELECT * FROM fines WHERE fineID = ?', [req.params.id], (err, fine) => {
    if (err || !fine) return res.status(404).json({ error: 'Fee not found' });

    if (fine.status === 'paid') {
      return res.status(400).json({ error: 'Fee already paid' });
    }

    const paymentAmount = amount || fine.amount;
    const paymentDate = new Date().toISOString();

    database.run(
      'UPDATE fines SET status = "paid", paidAt = ? WHERE fineID = ?',
      [paymentDate, req.params.id],
      (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update fee status' });

        database.run(
          `INSERT INTO payments (userID, loanID, fineID, amount, type, reference)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [fine.userID, fine.loanID || null, fine.fineID, paymentAmount, 'fine', reference || null],
          function (err) {
            if (err) console.error('Error creating payment record:', err);

            res.json({
              message: 'Fee paid successfully',
              paymentID: this ? this.lastID : null
            });
          }
        );
      }
    );
  });
});

// Add manual fee
router.post('/add', (req, res) => {
  const database = db.getDb();
  const { userID, loanID, amount, rate, maxFine } = req.body;

  if (!userID || !amount) {
    return res.status(400).json({ error: 'User ID and amount are required' });
  }

  database.run(
    `INSERT INTO fines (userID, loanID, amount, rate, maxFine, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userID,
      loanID || null,
      amount,
      rate || 0.50,
      maxFine || 50.00,
      'pending'
    ],
    function (err) {
      if (err) {
        console.error("🔥 SQLite error adding fee:", err.message);
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        message: 'Fee added successfully',
        fineID: this.lastID
      });
    }
  );
});

// Update fee
router.put('/:id', (req, res) => {
  const database = db.getDb();
  const { amount, status, rate, maxFine } = req.body;

  database.get('SELECT * FROM fines WHERE fineID = ?', [req.params.id], (err, fine) => {
    if (err || !fine) return res.status(404).json({ error: 'Fee not found' });

    database.run(
      `UPDATE fines 
       SET amount = ?, status = ?, rate = ?, maxFine = ?
       WHERE fineID = ?`,
      [
        amount !== undefined ? amount : fine.amount,
        status || fine.status,
        rate !== undefined ? rate : fine.rate,
        maxFine !== undefined ? maxFine : fine.maxFine,
        req.params.id
      ],
      (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update fee' });
        res.json({ message: 'Fee updated successfully' });
      }
    );
  });
});

// Delete fee
router.delete('/:id', (req, res) => {
  const database = db.getDb();
  database.run('DELETE FROM fines WHERE fineID = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete fee' });
    res.json({ message: 'Fee deleted successfully' });
  });
});

// Fee summary
router.get('/member/:userID/summary', (req, res) => {
  const database = db.getDb();
  database.get(
    `SELECT 
       COUNT(*) as totalFees,
       SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pendingAmount,
       SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paidAmount,
       SUM(amount) as totalAmount
     FROM fines
     WHERE userID = ?`,
    [req.params.userID],
    (err, summary) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(summary || { totalFees: 0, pendingAmount: 0, paidAmount: 0, totalAmount: 0 });
    }
  );
});

module.exports = router;
