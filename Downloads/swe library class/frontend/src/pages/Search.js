import React, { useState, useEffect } from 'react';
import { searchAPI } from '../services/api';
import { FiSearch, FiEye, FiEdit2, FiList } from 'react-icons/fi';
import './Search.css';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('books');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    status: ''
  });

  useEffect(() => {
    if (searchQuery) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchQuery, activeTab]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const response = await searchAPI.search(searchQuery, activeTab);
      setResults(response.data);
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setLoading(false);
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
    <div className="search-page">
      <div className="search-layout">
        <div className="filters-panel">
          <h2>Filters</h2>
          <div className="filter-section">
            <div className="filter-header">
              <span>Book Details</span>
            </div>
            <div className="filter-inputs">
              <input
                type="text"
                placeholder="Filter by Title..."
                value={filters.title}
                onChange={(e) => setFilters({ ...filters, title: e.target.value })}
              />
              <input
                type="text"
                placeholder="Filter by Author..."
                value={filters.author}
                onChange={(e) => setFilters({ ...filters, author: e.target.value })}
              />
              <input
                type="text"
                placeholder="Filter by ISBN..."
                value={filters.isbn}
                onChange={(e) => setFilters({ ...filters, isbn: e.target.value })}
              />
            </div>
          </div>
          <div className="filter-section">
            <div className="filter-header">
              <span>Genre</span>
            </div>
            <select
              value={filters.genre}
              onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
            >
              <option value="">All Genres</option>
            </select>
          </div>
          <div className="filter-section">
            <div className="filter-header">
              <span>Status</span>
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="checked_out">Checked Out</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
        </div>

        <div className="search-content">
          <div className="search-header">
            <div>
              <h1>Search</h1>
              <p>Search for books, members, or other library resources.</p>
            </div>
          </div>

          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by keyword, title, author, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="search-tabs">
            <button
              className={`tab ${activeTab === 'books' ? 'active' : ''}`}
              onClick={() => setActiveTab('books')}
            >
              Books
            </button>
            <button
              className={`tab ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              Members
            </button>
            <button
              className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              Transactions
            </button>
          </div>

          <div className="results-header">
            <span>Showing {results.length} of {results.length} results.</span>
            <select>
              <option>Sort by: Title</option>
              <option>Sort by: Author</option>
              <option>Sort by: Date</option>
            </select>
          </div>

          {loading ? (
            <div className="loading">Searching...</div>
          ) : activeTab === 'books' ? (
            <div className="results-table">
              <table>
                <thead>
                  <tr>
                    <th>COVER</th>
                    <th>TITLE</th>
                    <th>AUTHOR</th>
                    <th>ISBN</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(book => (
                    <tr key={book.bookID}>
                      <td>
                        {book.coverImage ? (
                          <img 
                            src={book.coverImage} 
                            alt={book.title}
                            className="book-cover"
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
                      <td>{getStatusBadge(book.availabilityStatus)}</td>
                      <td>
                        <div className="action-icons">
                          <button className="icon-btn" title="View">
                            <FiEye />
                          </button>
                          <button className="icon-btn" title="Edit">
                            <FiEdit2 />
                          </button>
                          <button className="icon-btn" title="Add to list">
                            <FiList />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'members' ? (
            <div className="results-table">
              <table>
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>MEMBERSHIP ID</th>
                    <th>TYPE</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(member => (
                    <tr key={member.userID}>
                      <td>{member.firstName} {member.lastName}</td>
                      <td>{member.membershipID}</td>
                      <td>{member.membershipType}</td>
                      <td>{member.status}</td>
                      <td>
                        <div className="action-icons">
                          <button className="icon-btn" title="View">
                            <FiEye />
                          </button>
                          <button className="icon-btn" title="Edit">
                            <FiEdit2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="results-table">
              <table>
                <thead>
                  <tr>
                    <th>BOOK</th>
                    <th>MEMBER</th>
                    <th>BORROW DATE</th>
                    <th>DUE DATE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(transaction => (
                    <tr key={transaction.loanID}>
                      <td>
                        <strong>{transaction.title}</strong>
                        <p>by {transaction.author}</p>
                      </td>
                      <td>{transaction.memberName}</td>
                      <td>{new Date(transaction.borrowDate).toLocaleDateString()}</td>
                      <td>{new Date(transaction.dueDate).toLocaleDateString()}</td>
                      <td>{transaction.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && results.length === 0 && searchQuery && (
            <div className="no-results">
              <p>No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;

