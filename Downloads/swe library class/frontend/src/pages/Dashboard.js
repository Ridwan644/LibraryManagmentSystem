import React, { useState, useEffect } from 'react';
import { reportsAPI, loansAPI } from '../services/api';
import { FiBook, FiUsers, FiAlertCircle, FiPlus } from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentLoans, setRecentLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, loansRes] = await Promise.all([
        reportsAPI.getDashboard({ dateRange: '30' }),
        loansAPI.getAll({ limit: 10 })
      ]);

      setStats(statsRes.data);
      setRecentLoans(loansRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome to the Library Management System</p>
        </div>
        <button className="btn-primary">
          <FiPlus /> Add New Book
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FiBook />
          </div>
          <div className="stat-content">
            <h3>Total Books</h3>
            <div className="stat-value">{stats?.totalCheckouts || 0}</div>
            <div className="stat-label">In collection</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <FiUsers />
          </div>
          <div className="stat-content">
            <h3>Active Members</h3>
            <div className="stat-value">{stats?.activeMembers || 0}</div>
            <div className="stat-label">Registered users</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <FiAlertCircle />
          </div>
          <div className="stat-content">
            <h3>Overdue Items</h3>
            <div className="stat-value">{stats?.overdueItems || 0}</div>
            <div className="stat-label">Need attention</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <FiPlus />
          </div>
          <div className="stat-content">
            <h3>New Acquisitions</h3>
            <div className="stat-value">{stats?.newAcquisitions || 0}</div>
            <div className="stat-label">This month</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="recent-activity">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {recentLoans.length === 0 ? (
              <p className="no-data">No recent activity</p>
            ) : (
              recentLoans.map(loan => (
                <div key={loan.loanID} className="activity-item">
                  <div className="activity-icon">
                    <FiBook />
                  </div>
                  <div className="activity-content">
                    <p>
                      <strong>{loan.memberName}</strong> borrowed <strong>{loan.title}</strong>
                    </p>
                    <span className="activity-date">
                      {new Date(loan.borrowDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-card">
              <FiBook />
              <span>Add Book</span>
            </button>
            <button className="action-card">
              <FiUsers />
              <span>Add Member</span>
            </button>
            <button className="action-card">
              <FiAlertCircle />
              <span>View Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

