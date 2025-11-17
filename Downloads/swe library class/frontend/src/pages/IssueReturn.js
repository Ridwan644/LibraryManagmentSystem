import React, { useState, useEffect } from 'react';
import { membersAPI, booksAPI, loansAPI } from '../services/api';
import { FiSearch, FiAlertCircle } from 'react-icons/fi';
import './IssueReturn.css';

const IssueReturn = () => {
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [members, setMembers] = useState([]);
  const [currentLoans, setCurrentLoans] = useState([]);
  const [activeTab, setActiveTab] = useState('issue');
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (memberSearch) {
      searchMembers();
    } else {
      setMembers([]);
    }
  }, [memberSearch]);

  useEffect(() => {
    if (selectedMember) {
      loadCurrentLoans();
    }
  }, [selectedMember]);

  useEffect(() => {
    if (bookSearch && activeTab === 'issue') {
      searchBooks();
    } else {
      setBookResults([]);
    }
  }, [bookSearch, activeTab]);

  const searchMembers = async () => {
    try {
      const response = await membersAPI.getAll({ search: memberSearch, limit: 10 });
      setMembers(response.data);
    } catch (error) {
      console.error('Error searching members:', error);
    }
  };

  const loadCurrentLoans = async () => {
    if (!selectedMember) return;
    try {
      const response = await loansAPI.getMemberCurrentLoans(selectedMember.userID);
      setCurrentLoans(response.data);
    } catch (error) {
      console.error('Error loading current loans:', error);
    }
  };

  const searchBooks = async () => {
    try {
      const response = await booksAPI.getAll({ search: bookSearch, status: 'available', limit: 10 });
      setBookResults(response.data);
    } catch (error) {
      console.error('Error searching books:', error);
    }
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setMemberSearch(`${member.firstName} ${member.lastName}`);
    setMembers([]);
  };

  const handleBookSelect = (book) => {
    setSelectedBook(book);
    setBookSearch(book.title);
    setBookResults([]);
  };

  const handleIssue = async () => {
    if (!selectedMember || !selectedBook) {
      alert('Please select both a member and a book');
      return;
    }

    try {
      setLoading(true);
      await loansAPI.issue({
        userID: selectedMember.userID,
        bookID: selectedBook.bookID,
        dueDate: dueDate
      });
      alert('Book issued successfully!');
      setSelectedBook(null);
      setBookSearch('');
      await loadCurrentLoans();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to issue book');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (loanID) => {
    if (!window.confirm('Are you sure you want to return this book?')) return;

    try {
      setLoading(true);
      await loansAPI.return(loanID);
      alert('Book returned successfully!');
      await loadCurrentLoans();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to return book');
    } finally {
      setLoading(false);
    }
  };

  const getLoanStatus = (loan) => {
    if (loan.isOverdue) {
      return <span className="status-badge status-overdue">Overdue ({loan.daysOverdue} days)</span>;
    }
    return <span className="status-badge status-on-loan">On Loan</span>;
  };

  return (
    <div className="issue-return">
      <div className="page-header">
        <h1>Issue & Return Books</h1>
      </div>

      <div className="content-wrapper">
        <div className="member-panel">
          <h2>Member Search</h2>
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
          </div>

          {members.length > 0 && (
            <div className="search-results">
              {members.map(member => (
                <div
                  key={member.userID}
                  className="result-item"
                  onClick={() => handleMemberSelect(member)}
                >
                  <div className="result-avatar">
                    {member.firstName[0]}{member.lastName[0]}
                  </div>
                  <div>
                    <div className="result-name">{member.firstName} {member.lastName}</div>
                    <div className="result-id">{member.membershipID}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedMember && (
            <div className="member-card">
              <div className="member-avatar-large">
                {selectedMember.firstName[0]}{selectedMember.lastName[0]}
              </div>
              <div className="member-info">
                <h3>{selectedMember.firstName} {selectedMember.lastName}</h3>
                <p className="member-id">ID: {selectedMember.membershipID}</p>
                <p className="member-status">Active</p>
                <p className="member-loans">
                  {currentLoans.length} Book{currentLoans.length !== 1 ? 's' : ''} on Loan
                  {currentLoans.filter(l => l.isOverdue).length > 0 && (
                    <span className="overdue-count">
                      , {currentLoans.filter(l => l.isOverdue).length} Overdue
                    </span>
                  )}
                </p>
              </div>
              {currentLoans.filter(l => l.isOverdue).length > 0 && (
                <div className="warning-box">
                  <FiAlertCircle />
                  <span>Overdue items and pending fines!</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="action-panel">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'issue' ? 'active' : ''}`}
              onClick={() => setActiveTab('issue')}
            >
              Issue Book
            </button>
            <button
              className={`tab ${activeTab === 'return' ? 'active' : ''}`}
              onClick={() => setActiveTab('return')}
            >
              Return Book
            </button>
          </div>

          {activeTab === 'issue' && (
            <div className="tab-content">
              {selectedMember ? (
                <>
                  <h3>Issue a New Book to {selectedMember.firstName} {selectedMember.lastName}</h3>
                  <div className="form-group">
                    <label>Book Search</label>
                    <div className="search-box">
                      <FiSearch className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search by title, author, or ISBN..."
                        value={bookSearch}
                        onChange={(e) => setBookSearch(e.target.value)}
                      />
                    </div>
                    {bookResults.length > 0 && (
                      <div className="book-results">
                        {bookResults.map(book => (
                          <div
                            key={book.bookID}
                            className="book-result-item"
                            onClick={() => handleBookSelect(book)}
                          >
                            <div>
                              <strong>{book.title}</strong>
                              <p>by {book.author}</p>
                            </div>
                            <span className="book-isbn">{book.isbn}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedBook && (
                      <div className="selected-book">
                        Selected: <strong>{selectedBook.title}</strong> by {selectedBook.author}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn-primary btn-large"
                    onClick={handleIssue}
                    disabled={loading || !selectedBook}
                  >
                    Issue Book
                  </button>
                </>
              ) : (
                <div className="empty-state">
                  <p>Please select a member to issue a book</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'return' && (
            <div className="tab-content">
              {selectedMember ? (
                <>
                  <h3>Return Books for {selectedMember.firstName} {selectedMember.lastName}</h3>
                  {currentLoans.length === 0 ? (
                    <div className="empty-state">
                      <p>No active loans for this member</p>
                    </div>
                  ) : (
                    <div className="loans-list">
                      {currentLoans.map(loan => (
                        <div key={loan.loanID} className="loan-item">
                          <div>
                            <strong>{loan.title}</strong>
                            <p>by {loan.author}</p>
                          </div>
                          <div className="loan-dates">
                            <p>Issued: {new Date(loan.borrowDate).toLocaleDateString()}</p>
                            <p className={loan.isOverdue ? 'overdue' : ''}>
                              Due: {new Date(loan.dueDate).toLocaleDateString()}
                            </p>
                            {getLoanStatus(loan)}
                          </div>
                          <button
                            className="btn-primary"
                            onClick={() => handleReturn(loan.loanID)}
                            disabled={loading}
                          >
                            Return
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <p>Please select a member to return books</p>
                </div>
              )}
            </div>
          )}

          <div className="borrowed-books-section">
            <h3>Currently Borrowed Books</h3>
            {selectedMember && currentLoans.length > 0 ? (
              <table className="loans-table">
                <thead>
                  <tr>
                    <th>Book Title & Author</th>
                    <th>Date Issued</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLoans.map(loan => (
                    <tr key={loan.loanID}>
                      <td>
                        <strong>{loan.title}</strong>
                        <p>by {loan.author}</p>
                      </td>
                      <td>{new Date(loan.borrowDate).toLocaleDateString()}</td>
                      <td className={loan.isOverdue ? 'overdue' : ''}>
                        {new Date(loan.dueDate).toLocaleDateString()}
                      </td>
                      <td>{getLoanStatus(loan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="no-data">No borrowed books</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueReturn;

