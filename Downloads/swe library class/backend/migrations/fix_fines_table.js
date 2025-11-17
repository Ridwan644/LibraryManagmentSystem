const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// path to your library.db file
const DB_PATH = path.join(__dirname, '../database/library.db');

console.log("Using DB at:", DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Failed to open database:", err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  console.log('Starting fines table migration...');

  db.run(`ALTER TABLE fines RENAME TO fines_old`, (err) => {
    if (err) {
      console.error("Error renaming table:", err.message);
      process.exit(1);
    }

    db.run(`
      CREATE TABLE fines (
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
      )
    `, (err) => {
      if (err) {
        console.error("Error creating new fines table:", err.message);
        process.exit(1);
      }

      db.run(`
        INSERT INTO fines (
          fineID, loanID, userID, amount, rate, graceDays, maxFine, status, createdAt, paidAt
        )
        SELECT 
          fineID, loanID, userID, amount, rate, graceDays, maxFine, status, createdAt, paidAt
        FROM fines_old
      `, (err) => {
        if (err) {
          console.error("Error inserting migrated data:", err.message);
          process.exit(1);
        }

        db.run(`DROP TABLE fines_old`, (err) => {
          if (err) {
            console.error("Error dropping old table:", err.message);
            process.exit(1);
          }

          console.log("Migration complete.");
          db.close();
        });
      });
    });
  });
});
