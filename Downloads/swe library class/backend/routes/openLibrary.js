const express = require('express');
const https = require('https');
const router = express.Router();

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json';

// Search Open Library for books
router.get('/search', (req, res) => {
  const { q, limit = 20 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const url = `${OPEN_LIBRARY_SEARCH}?q=${encodeURIComponent(q)}&limit=${limit}&fields=title,author_name,isbn,first_publish_year,subject,cover_edition_key,edition_key,language,number_of_pages_median,publisher,description`;

  https.get(url, (apiRes) => {
    let data = '';

    apiRes.on('data', (chunk) => {
      data += chunk;
    });

    apiRes.on('end', () => {
      try {
        const json = JSON.parse(data);
        const books = (json.docs || []).map(book => {
          // Extract ISBN (prefer ISBN-13, fallback to ISBN-10)
          let isbn = null;
          if (book.isbn && book.isbn.length > 0) {
            const isbn13 = book.isbn.find(i => i.length === 13);
            const isbn10 = book.isbn.find(i => i.length === 10);
            isbn = isbn13 || isbn10 || book.isbn[0];
          }

          // Get cover image URL
          let coverImage = null;
          if (isbn) {
            const cleanISBN = isbn.replace(/-/g, '');
            coverImage = `https://covers.openlibrary.org/b/isbn/${cleanISBN}-M.jpg`;
          } else if (book.cover_edition_key) {
            coverImage = `https://covers.openlibrary.org/b/olid/${book.cover_edition_key}-M.jpg`;
          } else if (book.edition_key && book.edition_key.length > 0) {
            coverImage = `https://covers.openlibrary.org/b/olid/${book.edition_key[0]}-M.jpg`;
          }

          // Extract author
          const author = book.author_name && book.author_name.length > 0 
            ? book.author_name[0] 
            : 'Unknown Author';

          // Extract genre/category
          let genre = 'General';
          if (book.subject && book.subject.length > 0) {
            const genres = book.subject.filter(s => 
              s.length < 30 && 
              !s.includes('Accessible book') &&
              !s.includes('Protected DAISY') &&
              !s.includes('In library')
            );
            if (genres.length > 0) {
              genre = genres[0];
            }
          }

          // Extract description
          let description = null;
          if (book.description) {
            if (typeof book.description === 'string') {
              description = book.description;
            } else if (book.description.value) {
              description = book.description.value;
            }
          }

          return {
            title: book.title,
            author: author,
            isbn: isbn,
            genre: genre,
            publicationYear: book.first_publish_year || null,
            description: description,
            coverImage: coverImage,
            publisher: book.publisher && book.publisher.length > 0 ? book.publisher[0] : null,
            pages: book.number_of_pages_median || null,
            language: book.language && book.language.length > 0 ? book.language[0] : null
          };
        }).filter(book => book.isbn); // Only return books with ISBNs

        res.json(books);
      } catch (error) {
        console.error('Error parsing Open Library response:', error);
        res.status(500).json({ error: 'Failed to parse search results' });
      }
    });
  }).on('error', (error) => {
    console.error('Error searching Open Library:', error);
    res.status(500).json({ error: 'Failed to search Open Library' });
  });
});

module.exports = router;

