import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import { FiDownload } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './Reports.css';

const Reports = () => {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [popularBooks, setPopularBooks] = useState([]);
  const [activeMembers, setActiveMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [branch, setBranch] = useState('Main Library');
  const [genre, setGenre] = useState('All');

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const params = { dateRange };

      const [statsRes, trendsRes, popularRes, membersRes] = await Promise.all([
        reportsAPI.getDashboard(params),
        reportsAPI.getBorrowingTrends(params),
        reportsAPI.getPopularBooks({ ...params, limit: 7 }),
        reportsAPI.getActiveMembers({ ...params, limit: 10 })
      ]);

      setStats(statsRes.data);
      setTrends(trendsRes.data);
      setPopularBooks(popularRes.data);
      setActiveMembers(membersRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTrendsData = () => {
    // Group by week if needed, or use daily data
    return trends.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: item.count
    }));
  };

  const calculatePercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="reports-page">
        <div className="loading">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1>Reporting & Analytics</h1>
          <p>An overview of library performance and usage statistics.</p>
        </div>
        <button className="btn-primary">
          <FiDownload /> Export as PDF
        </button>
      </div>

      <div className="filters-bar">
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="365">Last Year</option>
        </select>
        <select value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option value="Main Library">Main Library</option>
        </select>
        <select value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="All">All</option>
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <h3>Total Checkouts</h3>
          </div>
          <div className="stat-value">{stats?.totalCheckouts || 0}</div>
          <div className="stat-change positive">+12.5%</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>Active Members</h3>
          </div>
          <div className="stat-value">{stats?.activeMembers || 0}</div>
          <div className="stat-change positive">+2.1%</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>Overdue Items</h3>
          </div>
          <div className="stat-value">{stats?.overdueItems || 0}</div>
          <div className="stat-change negative">+5.4%</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>New Acquisitions</h3>
          </div>
          <div className="stat-value">{stats?.newAcquisitions || 0}</div>
          <div className="stat-change positive">+8.0%</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Borrowing Trends Last {dateRange} Days</h3>
            <span className="trend-indicator positive">+12.5%</span>
          </div>
          <div className="chart-content">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={formatTrendsData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Most Popular Books Last {dateRange} Days</h3>
          </div>
          <div className="chart-content">
            <div className="popular-books-list">
              {popularBooks.map((book, index) => (
                <div key={index} className="popular-book-item">
                  <div className="book-info">
                    <span className="book-rank">{index + 1}</span>
                    <div>
                      <div className="book-title">{book.title}</div>
                      <div className="book-count">{book.borrowCount} checkouts</div>
                    </div>
                  </div>
                  <div className="book-bar">
                    <div
                      className="book-bar-fill"
                      style={{
                        width: `${(book.borrowCount / (popularBooks[0]?.borrowCount || 1)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="active-members-section">
        <h3>Top Active Members</h3>
        <div className="members-list">
          {activeMembers.map((member, index) => (
            <div key={index} className="member-item">
              <div className="member-rank">{index + 1}</div>
              <div className="member-details">
                <div className="member-name">{member.memberName}</div>
                <div className="member-id">{member.membershipID}</div>
              </div>
              <div className="member-count">{member.borrowCount} books</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reports;

