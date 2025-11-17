import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import BookManagement from './pages/BookManagement';
import MemberManagement from './pages/MemberManagement';
import IssueReturn from './pages/IssueReturn';
import Search from './pages/Search';
import Reports from './pages/Reports';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/books" element={<BookManagement />} />
          <Route path="/members" element={<MemberManagement />} />
          <Route path="/issue-return" element={<IssueReturn />} />
          <Route path="/search" element={<Search />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

