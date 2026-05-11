import React, { useState, useEffect, createContext, useContext } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import DmDrafts from './pages/DmDrafts';
import Integrations from './pages/Integrations';
import Engagement from './pages/Engagement';

// ─── Auth Context ─────────────────────────────────────────────────────────────

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// ─── API Helper ───────────────────────────────────────────────────────────────

export function createApi(token) {
  const base = '/api';
  const headers = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  return {
    get: (path) => fetch(`${base}${path}`, { headers: headers() }).then(r => r.json()),
    post: (path, body) => fetch(`${base}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(r => r.json()),
    put: (path, body) => fetch(`${base}${path}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(r => r.json()),
    delete: (path) => fetch(`${base}${path}`, { method: 'DELETE', headers: headers() }).then(r => r.json()),
    upload: (path, formData) => fetch(`${base}${path}`, { method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: formData }).then(r => r.json()),
  };
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'contacts', label: 'Contacts', icon: '👥' },
  { id: 'dms', label: 'DM Drafts', icon: '✉️' },
  { id: 'integrations', label: 'Integrations', icon: '🔌' },
  { id: 'engagement', label: 'Engagement', icon: '📈' },
];

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('ph_token'));
  const [partner, setPartner] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [authPage, setAuthPage] = useState('login');
  const [loading, setLoading] = useState(true);

  const api = createApi(token);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(data => {
          if (data.error) { logout(); }
          else { setPartner(data); }
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  function login(newToken, partnerData) {
    localStorage.setItem('ph_token', newToken);
    setToken(newToken);
    setPartner(partnerData);
    setPage('dashboard');
  }

  function logout() {
    localStorage.removeItem('ph_token');
    setToken(null);
    setPartner(null);
    setAuthPage('login');
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3">🚀</div>
          <p className="text-gray-500 text-sm">Loading PatchHub...</p>
        </div>
      </div>
    );
  }

  if (!token || !partner) {
    return (
      <AuthContext.Provider value={{ api, login, logout }}>
        {authPage === 'login'
          ? <Login onSwitch={() => setAuthPage('signup')} />
          : <Signup onSwitch={() => setAuthPage('login')} />}
      </AuthContext.Provider>
    );
  }

  const ctx = { api: createApi(token), partner, login, logout };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'contacts': return <Contacts />;
      case 'dms': return <DmDrafts />;
      case 'integrations': return <Integrations />;
      case 'engagement': return <Engagement />;
      default: return <Dashboard />;
    }
  };

  return (
    <AuthContext.Provider value={ctx}>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className="w-60 bg-gray-900 text-white flex flex-col">
          <div className="px-6 py-5 border-b border-gray-700">
            <div className="text-xl font-bold text-sky-400">🩹 PatchHub</div>
            <div className="text-xs text-gray-400 mt-1 truncate">{partner.display_name || partner.username}</div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  page === item.id
                    ? 'bg-sky-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="px-3 pb-4 border-t border-gray-700 pt-4">
            <div className="text-xs text-gray-500 mb-2 px-3">
              Plan: <span className="text-sky-400 capitalize">{partner.plan}</span>
            </div>
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              🚪 Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </AuthContext.Provider>
  );
}
