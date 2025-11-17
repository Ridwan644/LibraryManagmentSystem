import React, { useState, useEffect } from 'react';
import { booksAPI, openLibraryAPI } from '../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiBook } from 'react-icons/fi';
import './BookManagement.css';

const BookManagement = () => {
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genres, setGenres] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    publicationYear: '',
    availabilityStatus: 'available',
    quantity: 1,
    description: ''
  });

  useEffect(() => {
    loadBooks();
    loadGenres();
  }, [searchTerm, genreFilter, statusFilter]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (genreFilter) params.genre = genreFilter;
      if (statusFilter) params.status = statusFilter;
      const response = await booksAPI.getAll(params);
      setBooks(response.data);
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGenres = async () => {
    try {
      const response = await booksAPI.getGenres();
      setGenres(response.data);
    } catch (error) {
      console.error('Error loading genres:', error);
    }
  };

  const handleBookClick = (book) => {
    setSelectedBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre || '',
      publicationYear: book.publicationYear || '',
      availabilityStatus: book.availabilityStatus,
      quantity: book.quantity || 1,
      description: book.description || ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const response = await openLibraryAPI.search(searchQuery, { limit: 20 });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching books:', error);
      alert('Failed to search for books. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectBook = (book) => {
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre || '',
      publicationYear: book.publicationYear || '',
      availabilityStatus: 'available',
      quantity: 1,
      description: book.description || ''
    });
    setShowSearchModal(false);
    setShowAddModal(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSave = async () => {
    try {
      if (selectedBook) {
        await booksAPI.update(selectedBook.bookID, formData);
      } else {
        await booksAPI.create(formData);
      }
      await loadBooks();
      setShowAddModal(false);
      setSelectedBook(null);
      setFormData({
        title: '',
        author: '',
        isbn: '',
        genre: '',
        publicationYear: '',
        availabilityStatus: 'available',
        quantity: 1,
        description: ''
      });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save book');
    }
  };

  const handleDelete = async (bookID) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await booksAPI.delete(bookID);
      await loadBooks();
      if (selectedBook?.bookID === bookID) {
        setSelectedBook(null);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete book');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      available: { label: 'Available', class: 'status-available' },
      checked_out: { label: 'Checked Out', class: 'status-checked-out' },
      on_hold: { label: 'On Hold', class: 'status-on-hold' }
    };
    const statusInfo = statusMap[status] || { label: status, class: 'status-default' };
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.label}</span>;
  };

  return (
    <div className="book-management">
      <div className="book-layout">
        <div className="main-content">
          <div className="page-header">
            <div>
              <h1>Book Management</h1>
              <p>Add, edit, and manage the library's book collection.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={() => {
                setShowSearchModal(true);
                setSearchQuery('');
                setSearchResults([]);
              }}>
                <FiSearch /> Search & Add from Open Library
              </button>
              <button className="btn-primary" onClick={() => {
                setShowAddModal(true);
                setSelectedBook(null);
                setFormData({
                  title: '',
                  author: '',
                  isbn: '',
                  genre: '',
                  publicationYear: '',
                  availabilityStatus: 'available',
                  quantity: 1,
                  description: ''
                });
              }}>
                <FiPlus /> Add New Book Manually
              </button>
            </div>
          </div>
          <div className="filters">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by Title, Author, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}>
              <option value="">All Genres</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="checked_out">Checked Out</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          {loading ? (
            <div className="loading">Loading books...</div>
          ) : (
            <div className="books-table">
              <table>
                <thead>
                  <tr>
                    <th>COVER</th>
                    <th>TITLE</th>
                    <th>AUTHOR</th>
                    <th>ISBN</th>
                    <th>GENRE</th>
                    <th>YEAR</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map(book => (
                    <tr
                      key={book.bookID}
                      className={selectedBook?.bookID === book.bookID ? 'selected' : ''}
                      onClick={() => handleBookClick(book)}
                    >
                      <td>
                        {book.coverImage ? (
                          <img 
                            src={book.coverImage} 
                            alt={book.title}
                            className="book-cover-thumb"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="book-cover-placeholder" style={{ display: book.coverImage ? 'none' : 'flex' }}>
                          {book.title.charAt(0)}
                        </div>
                      </td>
                      <td>{book.title}</td>
                      <td>{book.author}</td>
                      <td>{book.isbn}</td>
                      <td>{book.genre || '-'}</td>
                      <td>{book.publicationYear || '-'}</td>
                      <td>{getStatusBadge(book.availabilityStatus)}</td>
                      <td>
                        <button
                          className="icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(book.bookID);
                          }}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedBook && (
          <div className="edit-panel">
            <h2>{`Edit '${selectedBook.title}'`}</h2>
            <p className="panel-subtitle">
              Modify the details of the selected book.
            </p>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Author</label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>ISBN</label>
              <input
                type="text"
                name="isbn"
                value={formData.isbn}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Genre</label>
              <select
                name="genre"
                value={formData.genre}
                onChange={handleInputChange}
              >
                <option value="">Select Genre</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Publication Year</label>
              <input
                type="number"
                name="publicationYear"
                value={formData.publicationYear}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Availability Status</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="availabilityStatus"
                    value="available"
                    checked={formData.availabilityStatus === 'available'}
                    onChange={handleInputChange}
                  />
                  Available
                </label>
                <label>
                  <input
                    type="radio"
                    name="availabilityStatus"
                    value="on_hold"
                    checked={formData.availabilityStatus === 'on_hold'}
                    onChange={handleInputChange}
                  />
                  On Hold
                </label>
                <label>
                  <input
                    type="radio"
                    name="availabilityStatus"
                    value="checked_out"
                    checked={formData.availabilityStatus === 'checked_out'}
                    onChange={handleInputChange}
                  />
                  Checked Out
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => {
                setSelectedBook(null);
              }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div className="modal-overlay" onClick={() => setShowSearchModal(false)}>
          <div className="modal-content search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Search Open Library</h2>
              <button className="close-btn" onClick={() => setShowSearchModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="search-input-group">
                <input
                  type="text"
                  placeholder="Search for books (e.g., 'Things Fall Apart', '1984', 'Harry Potter')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="search-input"
                />
                <button className="btn-primary" onClick={handleSearch} disabled={searching}>
                  <FiSearch /> {searching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {searching && (
                <div className="loading" style={{ padding: '2rem', textAlign: 'center' }}>
                  Searching Open Library...
                </div>
              )}

              {!searching && searchResults.length > 0 && (
                <div className="search-results-list">
                  <h3>Search Results ({searchResults.length})</h3>
                  <div className="results-grid">
                    {searchResults.map((book, index) => (
                      <div key={index} className="book-result-card" onClick={() => handleSelectBook(book)}>
                        <div className="book-cover-large">
                          {book.coverImage ? (
                            <img src={book.coverImage} alt={book.title} onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }} />
                          ) : null}
                          <div className="book-cover-placeholder-large" style={{ display: book.coverImage ? 'none' : 'flex' }}>
                            <FiBook />
                          </div>
                        </div>
                        <div className="book-result-info">
                          <h4>{book.title}</h4>
                          <p className="book-author">{book.author}</p>
                          {book.isbn && <p className="book-isbn">ISBN: {book.isbn}</p>}
                          {book.publicationYear && <p className="book-year">{book.publicationYear}</p>}
                          {book.genre && <p className="book-genre">{book.genre}</p>}
                        </div>
                        <button className="btn-primary btn-small">Add to Library</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!searching && searchQuery && searchResults.length === 0 && (
                <div className="no-results" style={{ padding: '2rem', textAlign: 'center' }}>
                  No books found. Try a different search term.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && !selectedBook && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Book</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Author</label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>ISBN</label>
                <input
                  type="text"
                  name="isbn"
                  value={formData.isbn}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Genre</label>
                <select
                  name="genre"
                  value={formData.genre}
                  onChange={handleInputChange}
                >
                  <option value="">Select Genre</option>
                  {genres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Publication Year</label>
                <input
                  type="number"
                  name="publicationYear"
                  value={formData.publicationYear}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>Availability Status</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="availabilityStatus"
                      value="available"
                      checked={formData.availabilityStatus === 'available'}
                      onChange={handleInputChange}
                    />
                    Available
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="availabilityStatus"
                      value="on_hold"
                      checked={formData.availabilityStatus === 'on_hold'}
                      onChange={handleInputChange}
                    />
                    On Hold
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="availabilityStatus"
                      value="checked_out"
                      checked={formData.availabilityStatus === 'checked_out'}
                      onChange={handleInputChange}
                    />
                    Checked Out
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                Add Book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookManagement;

