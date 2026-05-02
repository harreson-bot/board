import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    }
  };

  const handleLogin = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    setCurrentPage('dashboard');
  };

  const handleRegister = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    setCurrentPage('dashboard');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setCurrentPage('login');
  };

  if (!token) {
    return (
      <div>
        {currentPage === 'login' && (
          <Login onLogin={handleLogin} setCurrentPage={setCurrentPage} />
        )}
        {currentPage === 'register' && (
          <Register onRegister={handleRegister} setCurrentPage={setCurrentPage} />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          🚀 PatchHub
        </div>
        <ul className="sidebar-menu">
          <li>
            <button
              className={`nav-button ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentPage('dashboard')}
            >
              📊 Dashboard
            </button>
          </li>
          <li>
            <button
              className={`nav-button ${currentPage === 'contacts' ? 'active' : ''}`}
              onClick={() => setCurrentPage('contacts')}
            >
              👥 Contacts
            </button>
          </li>
          <li>
            <button
              className={`nav-button ${currentPage === 'campaigns' ? 'active' : ''}`}
              onClick={() => setCurrentPage('campaigns')}
            >
              📢 Campaigns
            </button>
          </li>
          <li>
            <button
              className={`nav-button ${currentPage === 'analytics' ? 'active' : ''}`}
              onClick={() => setCurrentPage('analytics')}
            >
              📈 Analytics
            </button>
          </li>
        </ul>
        <div className="sidebar-footer">
          <div className="user-info">
            <p>{user?.name || user?.email}</p>
            <span className="plan">{user?.plan}</span>
          </div>
          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <h1>
            {currentPage === 'dashboard' && '📊 Dashboard'}
            {currentPage === 'contacts' && '👥 Contacts'}
            {currentPage === 'campaigns' && '📢 Campaigns'}
            {currentPage === 'analytics' && '📈 Analytics'}
          </h1>
        </header>

        <div className="page-content">
          {currentPage === 'dashboard' && (
            <Dashboard token={token} setCurrentPage={setCurrentPage} />
          )}
          {currentPage === 'contacts' && (
            <Contacts token={token} />
          )}
          {currentPage === 'campaigns' && !selectedCampaign && (
            <Campaigns token={token} setSelectedCampaign={setSelectedCampaign} setCurrentPage={() => {}} />
          )}
          {currentPage === 'campaigns' && selectedCampaign && (
            <CampaignDetail campaignId={selectedCampaign} token={token} onBack={() => setSelectedCampaign(null)} />
          )}
          {currentPage === 'analytics' && (
            <Analytics token={token} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
