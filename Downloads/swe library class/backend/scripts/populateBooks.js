const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const https = require('https');

const DB_DIR = path.join(__dirname, '../database');
const DB_PATH = path.join(DB_DIR, 'library.db');

// Open Library API endpoint for popular books
const OPEN_LIBRARY_API = 'https://openlibrary.org/search.json';

// Popular book subjects to fetch
const SUBJECTS = [
  'fiction',
  'science fiction',
  'mystery',
  'romance',
  'fantasy',
  'biography',
  'history',
  'philosophy'
];

// Function to fetch books from Open Library API
function fetchBooksFromAPI(subject, limit = 20) {
  return new Promise((resolve, reject) => {
    const url = `${OPEN_LIBRARY_API}?subject=${encodeURIComponent(subject)}&limit=${limit}&fields=title,author_name,isbn,first_publish_year,subject,cover_edition_key,edition_key`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.docs || []);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Function to extract ISBN
function extractISBN(book) {
  if (book.isbn && book.isbn.length > 0) {
    // Prefer ISBN-13, fallback to ISBN-10
    const isbn13 = book.isbn.find(isbn => isbn.length === 13);
    const isbn10 = book.isbn.find(isbn => isbn.length === 10);
    return isbn13 || isbn10 || book.isbn[0];
  }
  return null;
}

// Function to get cover image URL
function getCoverImageURL(isbn, olid) {
  if (isbn) {
    // Remove hyphens from ISBN
    const cleanISBN = isbn.replace(/-/g, '');
    return `https://covers.openlibrary.org/b/isbn/${cleanISBN}-M.jpg`;
  }
  if (olid) {
    return `https://covers.openlibrary.org/b/olid/${olid}-M.jpg`;
  }
  return null;
}

// Function to extract author
function extractAuthor(book) {
  if (book.author_name && book.author_name.length > 0) {
    return book.author_name[0];
  }
  return 'Unknown Author';
}

// Function to extract genre
function extractGenre(book) {
  if (book.subject && book.subject.length > 0) {
    // Get the first subject that's not too generic
    const genres = book.subject.filter(s => 
      s.length < 30 && 
      !s.includes('Accessible book') &&
      !s.includes('Protected DAISY')
    );
    if (genres.length > 0) {
      return genres[0];
    }
  }
  return 'General';
}

// Main function to populate books
async function populateBooks() {
  return new Promise((resolve, reject) => {
    // Create database directory if it doesn't exist
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to database');
    });

    // Check if books already exist
    db.get('SELECT COUNT(*) as count FROM books', async (err, row) => {
      if (err) {
        console.error('Error checking books:', err);
        db.close();
        reject(err);
        return;
      }

      if (row.count > 0) {
        console.log(`Database already has ${row.count} books. Skipping population.`);
        db.close();
        resolve();
        return;
      }

      console.log('Fetching books from Open Library API...');
      const allBooks = [];
      
      try {
        // Fetch books from multiple subjects
        for (const subject of SUBJECTS) {
          console.log(`Fetching ${subject} books...`);
          const books = await fetchBooksFromAPI(subject, 15);
          
          for (const book of books) {
            if (book.title && book.title.length < 200) {
              const isbn = extractISBN(book);
              const olid = book.cover_edition_key || book.edition_key?.[0] || null;
              const coverImage = getCoverImageURL(isbn, olid);
              
              if (isbn) { // Only add books with valid ISBNs
                allBooks.push({
                  title: book.title,
                  author: extractAuthor(book),
                  isbn: isbn,
                  genre: extractGenre(book),
                  publicationYear: book.first_publish_year || null,
                  availabilityStatus: 'available',
                  quantity: 1,
                  coverImage: coverImage
                });
              }
            }
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Remove duplicates based on ISBN
        const uniqueBooks = [];
        const seenISBNs = new Set();
        
        for (const book of allBooks) {
          if (!seenISBNs.has(book.isbn)) {
            seenISBNs.add(book.isbn);
            uniqueBooks.push(book);
          }
        }

        console.log(`Inserting ${uniqueBooks.length} books into database...`);

        // Insert books
        const stmt = db.prepare(`INSERT INTO books 
          (title, author, isbn, genre, publicationYear, availabilityStatus, quantity, coverImage)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

        let inserted = 0;
        for (const book of uniqueBooks.slice(0, 100)) { // Limit to 100 books
          stmt.run([
            book.title,
            book.author,
            book.isbn,
            book.genre,
            book.publicationYear,
            book.availabilityStatus,
            book.quantity,
            book.coverImage || null
          ], (err) => {
            if (err && !err.message.includes('UNIQUE constraint')) {
              console.error('Error inserting book:', err);
            } else {
              inserted++;
            }
          });
        }

        stmt.finalize((err) => {
          if (err) {
            console.error('Error finalizing statement:', err);
          } else {
            console.log(`Successfully inserted ${inserted} books!`);
          }
          db.close();
          resolve();
        });

      } catch (error) {
        console.error('Error fetching books:', error);
        db.close();
        reject(error);
      }
    });
  });
}

// Run if called directly
if (require.main === module) {
  populateBooks()
    .then(() => {
      console.log('Book population completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error populating books:', error);
      process.exit(1);
    });
}

module.exports = { populateBooks };

