const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Get all books
router.get('/', (req, res) => {
  const database = db.getDb();
  const { search, genre, status, limit = 50, offset = 0 } = req.query;

  let query = 'SELECT * FROM books WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (genre) {
    query += ' AND genre = ?';
    params.push(genre);
  }

  if (status) {
    query += ' AND availabilityStatus = ?';
    params.push(status);
  }

  query += ' ORDER BY title LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  database.all(query, params, (err, books) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(books);
  });
});

// Get book by ID
router.get('/:id', (req, res) => {
  const database = db.getDb();
  database.get('SELECT * FROM books WHERE bookID = ?', [req.params.id], (err, book) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  });
});

// Add new book
router.post('/', (req, res) => {
  const database = db.getDb();
  const { title, author, isbn, genre, category, publicationYear, quantity, description, coverImage } = req.body;

  if (!title || !author || !isbn) {
    return res.status(400).json({ error: 'Title, author, and ISBN are required' });
  }

  // Generate cover image URL if not provided
  let coverURL = coverImage;
  if (!coverURL && isbn) {
    const cleanISBN = isbn.replace(/-/g, '');
    coverURL = `https://covers.openlibrary.org/b/isbn/${cleanISBN}-M.jpg`;
  }

  database.run(
    `INSERT INTO books (title, author, isbn, genre, category, publicationYear, quantity, description, availabilityStatus, coverImage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, author, isbn, genre || null, category || null, publicationYear || null, quantity || 1, description || null, 'available', coverURL || null],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ error: 'Book with this ISBN already exists' });
        }
        return res.status(500).json({ error: 'Failed to add book' });
      }

      // Log inventory update
      database.run(
        'INSERT INTO inventoryUpdates (bookID, action, beforeQty, afterQty) VALUES (?, ?, ?, ?)',
        [this.lastID, 'add', 0, quantity || 1]
      );

      res.status(201).json({
        message: 'Book added successfully',
        bookID: this.lastID
      });
    }
  );
});

// Update book
router.put('/:id', (req, res) => {
  const database = db.getDb();
  const { title, author, isbn, genre, category, publicationYear, availabilityStatus, quantity, description } = req.body;

  // Get current book data
  database.get('SELECT * FROM books WHERE bookID = ?', [req.params.id], (err, book) => {
    if (err || !book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Generate cover image URL if ISBN changed and no cover provided
  let coverURL = req.body.coverImage;
  if (!coverURL && (isbn || book.isbn)) {
    const cleanISBN = (isbn || book.isbn).replace(/-/g, '');
    coverURL = `https://covers.openlibrary.org/b/isbn/${cleanISBN}-M.jpg`;
  }

  database.run(
      `UPDATE books 
       SET title = ?, author = ?, isbn = ?, genre = ?, category = ?, publicationYear = ?, 
           availabilityStatus = ?, quantity = ?, description = ?, coverImage = ?
       WHERE bookID = ?`,
      [
        title || book.title,
        author || book.author,
        isbn || book.isbn,
        genre !== undefined ? genre : book.genre,
        category !== undefined ? category : book.category,
        publicationYear || book.publicationYear,
        availabilityStatus || book.availabilityStatus,
        quantity !== undefined ? quantity : book.quantity,
        description !== undefined ? description : book.description,
        coverURL !== undefined ? coverURL : book.coverImage,
        req.params.id
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update book' });
        }

        // Log inventory update if quantity changed
        if (quantity !== undefined && quantity !== book.quantity) {
          database.run(
            'INSERT INTO inventoryUpdates (bookID, action, beforeQty, afterQty) VALUES (?, ?, ?, ?)',
            [req.params.id, 'update', book.quantity, quantity]
          );
        }

        res.json({ message: 'Book updated successfully' });
      }
    );
  });
});

// Delete book
router.delete('/:id', (req, res) => {
  const database = db.getDb();

  // Check if book is currently borrowed
  database.get('SELECT * FROM loans WHERE bookID = ? AND status = "active"', [req.params.id], (err, loan) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (loan) {
      return res.status(400).json({ error: 'Cannot delete book that is currently borrowed' });
    }

    // Get book data before deletion
    database.get('SELECT * FROM books WHERE bookID = ?', [req.params.id], (err, book) => {
      if (err || !book) {
        return res.status(404).json({ error: 'Book not found' });
      }

      database.run('DELETE FROM books WHERE bookID = ?', [req.params.id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete book' });
        }

        // Log inventory update
        database.run(
          'INSERT INTO inventoryUpdates (bookID, action, beforeQty, afterQty) VALUES (?, ?, ?, ?)',
          [req.params.id, 'delete', book.quantity, 0]
        );

        res.json({ message: 'Book deleted successfully' });
      });
    });
  });
});

// Get genres
router.get('/data/genres', (req, res) => {
  const database = db.getDb();
  database.all('SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows.map(row => row.genre));
  });
});

module.exports = router;

