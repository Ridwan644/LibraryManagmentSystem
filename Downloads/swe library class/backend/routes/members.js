const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const router = express.Router();

// Get all members
router.get('/', (req, res) => {
  const database = db.getDb();
  const { search, membershipType, status, limit = 50, offset = 0 } = req.query;

  let query = 'SELECT * FROM users WHERE role = "member" AND 1=1';
  const params = [];

  if (search) {
    query += ' AND (firstName LIKE ? OR lastName LIKE ? OR membershipID LIKE ? OR email LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (membershipType) {
    query += ' AND membershipType = ?';
    params.push(membershipType);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY joinDate DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  database.all(query, params, (err, members) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Remove password from response
    const safeMembers = members.map(m => {
      const { password, ...member } = m;
      return member;
    });

    res.json(safeMembers);
  });
});

// Get member by ID
router.get('/:id', (req, res) => {
  const database = db.getDb();
  database.get('SELECT userID, username, email, firstName, lastName, phone, address, role, status, membershipID, membershipType, joinDate, membershipExpiration FROM users WHERE userID = ?', 
    [req.params.id], (err, member) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      res.json(member);
    });
});

// Get member borrowing history
router.get('/:id/borrowing-history', (req, res) => {
  const database = db.getDb();
  database.all(
    `SELECT l.*, b.title, b.author, b.isbn 
     FROM loans l 
     JOIN books b ON l.bookID = b.bookID 
     WHERE l.userID = ? 
     ORDER BY l.borrowDate DESC`,
    [req.params.id],
    (err, loans) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(loans);
    }
  );
});

// Add new member
router.post('/', (req, res) => {
  const database = db.getDb();
  const { firstName, lastName, email, phone, address, membershipType } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'First name, last name, and email are required' });
  }

  // Check if email already exists
  database.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate username and membership ID
    database.get('SELECT MAX(CAST(SUBSTR(membershipID, 5) AS INTEGER)) as maxID FROM users WHERE membershipID LIKE "LIB-%"', 
      (err, row) => {
        if (err) {
          console.error('Error getting max ID:', err);
          // If query fails, start from 1
          var nextID = 1;
        } else {
          nextID = (row?.maxID || 0) + 1;
        }
        
        const membershipID = `LIB-${String(nextID).padStart(5, '0')}`;
        const username = email.split('@')[0] + nextID;

        const expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);

        // Since this is a static system without auth, use a default password
        const defaultPassword = 'password123'; // Can be changed later if needed
        
        database.run(
          `INSERT INTO users (username, email, password, firstName, lastName, phone, address, role, status, membershipID, membershipType, joinDate, membershipExpiration)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [username, email, defaultPassword, firstName, lastName, phone || null, address || null, 'member', 'approved', 
           membershipID, membershipType || 'Adult', new Date().toISOString(), expirationDate.toISOString()],
          function(err) {
            if (err) {
              console.error('Error inserting member:', err);
              if (err.message.includes('UNIQUE constraint')) {
                return res.status(400).json({ error: 'Email or username already exists' });
              }
              return res.status(500).json({ error: 'Failed to add member: ' + err.message });
            }

            res.status(201).json({
              message: 'Member added successfully',
              userID: this.lastID,
              membershipID
            });
          }
        );
      }
    );
  });
});

// Update member
router.put('/:id', (req, res) => {
  const database = db.getDb();
  const { firstName, lastName, email, phone, address, membershipType, status, membershipExpiration } = req.body;

  database.get('SELECT * FROM users WHERE userID = ?', [req.params.id], (err, member) => {
    if (err || !member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    database.run(
      `UPDATE users 
       SET firstName = ?, lastName = ?, email = ?, phone = ?, address = ?, 
           membershipType = ?, status = ?, membershipExpiration = ?
       WHERE userID = ?`,
      [
        firstName || member.firstName,
        lastName || member.lastName,
        email || member.email,
        phone !== undefined ? phone : member.phone,
        address !== undefined ? address : member.address,
        membershipType || member.membershipType,
        status || member.status,
        membershipExpiration || member.membershipExpiration,
        req.params.id
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update member' });
        }
        res.json({ message: 'Member updated successfully' });
      }
    );
  });
});

// Deactivate member
router.post('/:id/deactivate', (req, res) => {
  const database = db.getDb();
  database.run('UPDATE users SET status = "suspended" WHERE userID = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to deactivate member' });
    }
    res.json({ message: 'Member deactivated successfully' });
  });
});

// Reactivate member
router.post('/:id/reactivate', (req, res) => {
  const database = db.getDb();
  
  // Check if membership expiration needs to be updated
  database.get('SELECT * FROM users WHERE userID = ?', [req.params.id], (err, member) => {
    if (err || !member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // If membership expired, extend it by 1 year from now
    let expirationDate = member.membershipExpiration;
    if (!expirationDate || new Date(expirationDate) < new Date()) {
      const newExpiration = new Date();
      newExpiration.setFullYear(newExpiration.getFullYear() + 1);
      expirationDate = newExpiration.toISOString();
    }

    database.run(
      'UPDATE users SET status = "approved", membershipExpiration = ? WHERE userID = ?',
      [expirationDate, req.params.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to reactivate member' });
        }
        res.json({ message: 'Member reactivated successfully' });
      }
    );
  });
});

// Get membership types
router.get('/data/membership-types', (req, res) => {
  res.json(['Adult', 'Student', 'Child', 'Senior']);
});

module.exports = router;

