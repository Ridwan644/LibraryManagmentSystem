import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, FiBook, FiUsers, FiRefreshCw, FiSearch, 
  FiBarChart2, FiSettings, FiLogOut, FiMenu, FiX 
} from 'react-icons/fi';
import './Layout.css';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: FiHome, label: 'Dashboard' },
    { path: '/books', icon: FiBook, label: 'Book Management' },
    { path: '/members', icon: FiUsers, label: 'Member Management' },
    { path: '/issue-return', icon: FiRefreshCw, label: 'Issue / Return' },
    { path: '/search', icon: FiSearch, label: 'Search' },
    { path: '/reports', icon: FiBarChart2, label: 'Reports' }
  ];

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <FiBook className="logo-icon" />
            <span className="logo-text">LibSys</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="nav-icon" />
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">A</div>
            {sidebarOpen && (
              <div className="user-info">
                <div className="user-name">Admin</div>
                <div className="user-role">Librarian</div>
              </div>
            )}
          </div>
          <div className="sidebar-actions">
            <button className="action-btn">
              <FiSettings />
              {sidebarOpen && <span>Settings</span>}
            </button>
            <button className="action-btn">
              <FiLogOut />
              {sidebarOpen && <span>Log Out</span>}
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;

