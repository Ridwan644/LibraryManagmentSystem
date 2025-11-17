import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Books API
export const booksAPI = {
  getAll: (params) => api.get('/books', { params }),
  getById: (id) => api.get(`/books/${id}`),
  create: (data) => api.post('/books', data),
  update: (id, data) => api.put(`/books/${id}`, data),
  delete: (id) => api.delete(`/books/${id}`),
  getGenres: () => api.get('/books/data/genres')
};

// Members API
export const membersAPI = {
  getAll: (params) => api.get('/members', { params }),
  getById: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members', data),
  update: (id, data) => api.put(`/members/${id}`, data),
  deactivate: (id) => api.post(`/members/${id}/deactivate`),
  reactivate: (id) => api.post(`/members/${id}/reactivate`),
  getBorrowingHistory: (id) => api.get(`/members/${id}/borrowing-history`),
  getMembershipTypes: () => api.get('/members/data/membership-types')
};

// Loans API
export const loansAPI = {
  getAll: (params) => api.get('/loans', { params }),
  getById: (id) => api.get(`/loans/${id}`),
  issue: (data) => api.post('/loans/issue', data),
  return: (loanID) => api.post(`/loans/return/${loanID}`),
  renew: (loanID) => api.post(`/loans/renew/${loanID}`),
  getMemberCurrentLoans: (userID) => api.get(`/loans/member/${userID}/current`)
};

// Search API
export const searchAPI = {
  search: (query, type = 'books', params = {}) => 
    api.get('/search', { params: { q: query, type, ...params } })
};

// Reports API
export const reportsAPI = {
  getDashboard: (params) => api.get('/reports/dashboard', { params }),
  getBorrowingTrends: (params) => api.get('/reports/borrowing-trends', { params }),
  getPopularBooks: (params) => api.get('/reports/popular-books', { params }),
  getActiveMembers: (params) => api.get('/reports/active-members', { params }),
  getFines: () => api.get('/reports/fines')
};

// Open Library API
export const openLibraryAPI = {
  search: (query, params = {}) => api.get('/openlibrary/search', { params: { q: query, ...params } })
};

// Fees API
export const feesAPI = {
  getMemberFees: (userID) => api.get(`/fees/member/${userID}`),
  getPendingFees: () => api.get('/fees/pending'),
  getFeeById: (id) => api.get(`/fees/${id}`),
  payFee: (id, data) => api.post(`/fees/${id}/pay`, data),
  addFee: (data) => api.post('/fees/add', data),
  updateFee: (id, data) => api.put(`/fees/${id}`, data),
  deleteFee: (id) => api.delete(`/fees/${id}`),
  getMemberSummary: (userID) => api.get(`/fees/member/${userID}/summary`)
};

export default api;

