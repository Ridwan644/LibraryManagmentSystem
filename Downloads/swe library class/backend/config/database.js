const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_DIR = path.join(__dirname, '../database');
const DB_PATH = path.join(DB_DIR, 'library.db');

let db = null;

const init = async () => {
  return new Promise((resolve, reject) => {
    // Create database directory if it doesn't exist
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
      console.log('Created database directory');
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
};

const createTables = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        userID INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT,
        lastName TEXT,
        phone TEXT,
        address TEXT,
        role TEXT NOT NULL DEFAULT 'member',
        status TEXT DEFAULT 'pending',
        membershipID TEXT UNIQUE,
        membershipType TEXT,
        joinDate TEXT,
        membershipExpiration TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`);

      // Books table
      db.run(`CREATE TABLE IF NOT EXISTS books (
        bookID INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT UNIQUE NOT NULL,
        genre TEXT,
        category TEXT,
        publicationYear INTEGER,
        availabilityStatus TEXT DEFAULT 'available',
        quantity INTEGER DEFAULT 1,
        coverImage TEXT,
        description TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`);

      // Sessions table
      db.run(`CREATE TABLE IF NOT EXISTS sessions (
        sessionID INTEGER PRIMARY KEY AUTOINCREMENT,
        userID INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        issuedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        expiresAt TEXT NOT NULL,
        revoked INTEGER DEFAULT 0,
        FOREIGN KEY (userID) REFERENCES users(userID)
      )`);

      // Loans table
      db.run(`CREATE TABLE IF NOT EXISTS loans (
        loanID INTEGER PRIMARY KEY AUTOINCREMENT,
        userID INTEGER NOT NULL,
        bookID INTEGER NOT NULL,
        borrowDate TEXT NOT NULL,
        dueDate TEXT NOT NULL,
        returnDate TEXT,
        status TEXT DEFAULT 'active',
        renewalCount INTEGER DEFAULT 0,
        FOREIGN KEY (userID) REFERENCES users(userID),
        FOREIGN KEY (bookID) REFERENCES books(bookID)
      )`);

      // Fines table
// Fines table
db.run(`CREATE TABLE IF NOT EXISTS fines (
    fineID INTEGER PRIMARY KEY AUTOINCREMENT,
    loanID INTEGER,
    userID INTEGER NOT NULL,
    amount REAL NOT NULL,
    rate REAL DEFAULT 0.50,
    graceDays INTEGER DEFAULT 0,
    maxFine REAL DEFAULT 50.00,
    status TEXT DEFAULT 'pending',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    paidAt TEXT,
    FOREIGN KEY (loanID) REFERENCES loans(loanID),
    FOREIGN KEY (userID) REFERENCES users(userID)
  )`);
  

      // Payments table
      db.run(`CREATE TABLE IF NOT EXISTS payments (
        paymentID INTEGER PRIMARY KEY AUTOINCREMENT,
        userID INTEGER NOT NULL,
        loanID INTEGER,
        fineID INTEGER,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        reference TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userID) REFERENCES users(userID),
        FOREIGN KEY (loanID) REFERENCES loans(loanID),
        FOREIGN KEY (fineID) REFERENCES fines(fineID)
      )`);

      // Inventory updates table
      db.run(`CREATE TABLE IF NOT EXISTS inventoryUpdates (
        logID INTEGER PRIMARY KEY AUTOINCREMENT,
        bookID INTEGER NOT NULL,
        action TEXT NOT NULL,
        beforeQty INTEGER,
        afterQty INTEGER,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        userID INTEGER,
        FOREIGN KEY (bookID) REFERENCES books(bookID),
        FOREIGN KEY (userID) REFERENCES users(userID)
      )`);

      // Create default admin user
      db.get("SELECT * FROM users WHERE role = 'admin'", async (err, row) => {
        if (!row) {
          const hashedPassword = await bcrypt.hash('admin123', 10);
          const membershipID = 'LIB-ADMIN-001';
          db.run(`INSERT INTO users (username, email, password, firstName, lastName, role, status, membershipID, membershipType, joinDate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['admin', 'admin@library.com', hashedPassword, 'Admin', 'User', 'admin', 'approved', membershipID, 'Staff', new Date().toISOString()],
            (err) => {
              if (err) {
                console.error('Error creating admin user:', err);
              } else {
                console.log('Default admin user created (username: admin, password: admin123)');
              }
            });
        }
      });

      // Create sample librarian
      db.get("SELECT * FROM users WHERE role = 'librarian'", async (err, row) => {
        if (!row) {
          const hashedPassword = await bcrypt.hash('librarian123', 10);
          const membershipID = 'LIB-LIB-001';
          db.run(`INSERT INTO users (username, email, password, firstName, lastName, role, status, membershipID, membershipType, joinDate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['librarian', 'librarian@library.com', hashedPassword, 'Anna', 'Synovitz', 'librarian', 'approved', membershipID, 'Staff', new Date().toISOString()],
            (err) => {
              if (err) {
                console.error('Error creating librarian user:', err);
              } else {
                console.log('Default librarian user created (username: librarian, password: librarian123)');
              }
            });
        }
      });

      // Check if books exist - if not, they can be populated using the populateBooks script
      db.get("SELECT COUNT(*) as count FROM books", (err, row) => {
        if (err) {
          console.error('Error checking books:', err);
          resolve();
          return;
        }
        
        if (row && row.count === 0) {
          console.log('No books found. Run "npm run populate-books" to populate books from Open Library API.');
        } else {
          console.log(`Database has ${row.count} books.`);
        }
        resolve();
      });
    });
  });
};

const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

const close = () => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
};

module.exports = {
  init,
  getDb,
  close
};

