const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Get all loans
router.get('/', (req, res) => {
  const database = db.getDb();
  const { status, userID } = req.query;

  let query = `SELECT l.*, b.title, b.author, b.isbn, 
               u.firstName || ' ' || u.lastName as memberName, u.membershipID
               FROM loans l
               JOIN books b ON l.bookID = b.bookID
               JOIN users u ON l.userID = u.userID
               WHERE 1=1`;
  const params = [];

  if (status) {
    query += ' AND l.status = ?';
    params.push(status);
  }

  if (userID) {
    query += ' AND l.userID = ?';
    params.push(userID);
  }

  query += ' ORDER BY l.borrowDate DESC';

  database.all(query, params, (err, loans) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(loans);
  });
});

// Get loan by ID
router.get('/:id', (req, res) => {
  const database = db.getDb();
  database.get(
    `SELECT l.*, b.title, b.author, b.isbn, 
     u.firstName || ' ' || u.lastName as memberName, u.membershipID
     FROM loans l
     JOIN books b ON l.bookID = b.bookID
     JOIN users u ON l.userID = u.userID
     WHERE l.loanID = ?`,
    [req.params.id],
    (err, loan) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!loan) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      res.json(loan);
    }
  );
});

// Issue book (borrow)
router.post('/issue', (req, res) => {
  const database = db.getDb();
  const { userID, bookID, dueDate } = req.body;

  if (!userID || !bookID) {
    return res.status(400).json({ error: 'User ID and Book ID are required' });
  }

  // Check if book is available
  database.get('SELECT * FROM books WHERE bookID = ?', [bookID], (err, book) => {
    if (err || !book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.availabilityStatus !== 'available') {
      return res.status(400).json({ error: 'Book is not available' });
    }

    // Check if user exists
    database.get('SELECT * FROM users WHERE userID = ? AND role = "member"', [userID], (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'Member not found' });
      }

      if (user.status !== 'approved') {
        return res.status(400).json({ error: 'Member account is not active' });
      }

      // Calculate due date (14 days from now if not provided)
      const borrowDate = new Date();
      const calculatedDueDate = dueDate ? new Date(dueDate) : new Date();
      if (!dueDate) {
        calculatedDueDate.setDate(calculatedDueDate.getDate() + 14);
      }

      // Create loan
      database.run(
        `INSERT INTO loans (userID, bookID, borrowDate, dueDate, status)
         VALUES (?, ?, ?, ?, ?)`,
        [userID, bookID, borrowDate.toISOString(), calculatedDueDate.toISOString(), 'active'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create loan' });
          }

          // Update book status
          database.run(
            'UPDATE books SET availabilityStatus = "checked_out" WHERE bookID = ?',
            [bookID]
          );

          res.status(201).json({
            message: 'Book issued successfully',
            loanID: this.lastID,
            borrowDate: borrowDate.toISOString(),
            dueDate: calculatedDueDate.toISOString()
          });
        }
      );
    });
  });
});

// Return book
router.post('/return/:loanID', (req, res) => {
  const database = db.getDb();
  const loanID = req.params.loanID;

  database.get('SELECT * FROM loans WHERE loanID = ?', [loanID], (err, loan) => {
    if (err || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status === 'returned') {
      return res.status(400).json({ error: 'Book already returned' });
    }

    const returnDate = new Date();
    const dueDate = new Date(loan.dueDate);
    const isOverdue = returnDate > dueDate;

    // Update loan
    database.run(
      'UPDATE loans SET returnDate = ?, status = "returned" WHERE loanID = ?',
      [returnDate.toISOString(), loanID],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to return book' });
        }

        // Update book status
        database.run(
          'UPDATE books SET availabilityStatus = "available" WHERE bookID = ?',
          [loan.bookID]
        );

        // Calculate fine if overdue
        if (isOverdue) {
          const daysOverdue = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
          const fineAmount = Math.min(daysOverdue * 0.50, 50.00); // $0.50 per day, max $50

          database.run(
            `INSERT INTO fines (loanID, userID, amount, status)
             VALUES (?, ?, ?, ?)`,
            [loanID, loan.userID, fineAmount, 'pending']
          );
        }

        res.json({
          message: 'Book returned successfully',
          isOverdue,
          fineAmount: isOverdue ? Math.min(Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24)) * 0.50, 50.00) : 0
        });
      }
    );
  });
});

// Renew book
router.post('/renew/:loanID', (req, res) => {
  const database = db.getDb();
  const loanID = req.params.loanID;

  database.get('SELECT * FROM loans WHERE loanID = ?', [loanID], (err, loan) => {
    if (err || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'active') {
      return res.status(400).json({ error: 'Only active loans can be renewed' });
    }

    // Check if book is on hold
    database.get('SELECT * FROM books WHERE bookID = ?', [loan.bookID], (err, book) => {
      if (err || book.availabilityStatus === 'on_hold') {
        return res.status(400).json({ error: 'Book is on hold and cannot be renewed' });
      }

      // Check if overdue
      const now = new Date();
      const dueDate = new Date(loan.dueDate);
      if (now > dueDate) {
        return res.status(400).json({ error: 'Overdue books cannot be renewed' });
      }

      // Extend due date by 14 days
      const newDueDate = new Date(dueDate);
      newDueDate.setDate(newDueDate.getDate() + 14);

      database.run(
        'UPDATE loans SET dueDate = ?, renewalCount = renewalCount + 1 WHERE loanID = ?',
        [newDueDate.toISOString(), loanID],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to renew loan' });
          }

          res.json({
            message: 'Book renewed successfully',
            newDueDate: newDueDate.toISOString()
          });
        }
      );
    });
  });
});

// Get member's current loans
router.get('/member/:userID/current', (req, res) => {
  const database = db.getDb();
  database.all(
    `SELECT l.*, b.title, b.author, b.isbn,
     CASE 
       WHEN datetime(l.dueDate) < datetime('now') THEN 'overdue'
       ELSE 'on_loan'
     END as loanStatus
     FROM loans l
     JOIN books b ON l.bookID = b.bookID
     WHERE l.userID = ? AND l.status = 'active'
     ORDER BY l.dueDate ASC`,
    [req.params.userID],
    (err, loans) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Calculate overdue days
      const loansWithStatus = loans.map(loan => {
        const dueDate = new Date(loan.dueDate);
        const now = new Date();
        const isOverdue = now > dueDate;
        const daysOverdue = isOverdue ? Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24)) : 0;

        return {
          ...loan,
          isOverdue,
          daysOverdue
        };
      });

      res.json(loansWithStatus);
    }
  );
});

module.exports = router;

