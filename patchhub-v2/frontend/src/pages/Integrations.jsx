import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';

const STATUS_STYLE = {
  active: 'bg-green-100 text-green-700',
  disconnected: 'bg-gray-100 text-gray-500',
  expired: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-600',
  coming_soon: 'bg-purple-100 text-purple-600',
};

export default function Integrations() {
  const { api } = useAuth();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);

  useEffect(() => { loadPlatforms(); }, []);

  async function loadPlatforms() {
    setLoading(true);
    const data = await api.get('/integrations');
    setPlatforms(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleConnect(platform) {
    setConnecting(platform);
    const res = await api.get(`/integrations/${platform}/oauth/start`);
    setConnecting(null);

    if (res.status === 'not_configured') {
      alert(`${platform} OAuth is not yet configured on this server.\n\n${res.message}\n\nDocs: ${res.docs}`);
    } else if (res.status === 'coming_soon') {
      alert(res.error);
    } else if (res.auth_url) {
      window.open(res.auth_url, '_blank', 'width=600,height=700');
    }
  }

  async function handleDisconnect(platform) {
    if (!confirm(`Disconnect ${platform}?`)) return;
    await api.delete(`/integrations/${platform}/disconnect`);
    loadPlatforms();
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Social Integrations</h1>
        <p className="text-gray-500 text-sm mt-1">Connect your social accounts to send DMs directly from PatchHub</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading integrations...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map(p => (
            <div key={p.platform} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{p.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <span className={`badge text-xs ${
                      p.connected ? STATUS_STYLE.active :
                      p.status === 'coming_soon' ? STATUS_STYLE.coming_soon :
                      STATUS_STYLE.disconnected
                    }`}>
                      {p.connected ? '● Connected' : p.status === 'coming_soon' ? 'Coming Soon' : '○ Not connected'}
                    </span>
                  </div>
                </div>
              </div>

              {p.connected && p.connection && (
                <div className="text-xs text-gray-500 mb-4 space-y-1">
                  {p.connection.platform_username && <div>Account: @{p.connection.platform_username}</div>}
                  <div>Connected: {new Date(p.connection.connected_at).toLocaleDateString()}</div>
                  {p.connection.scopes?.length > 0 && (
                    <div>Scopes: {p.connection.scopes.join(', ')}</div>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-400 mb-4">
                <strong>DM scope:</strong> {p.scopes?.slice(0, 2).join(', ')}
                {p.scopes?.length > 2 && ` +${p.scopes.length - 2} more`}
              </div>

              <div className="flex gap-2">
                {p.connected ? (
                  <>
                    <span className="btn-secondary text-xs py-1.5 flex-1 text-center text-green-700 border-green-200">✅ Active</span>
                    <button onClick={() => handleDisconnect(p.platform)}
                      className="btn-secondary text-xs py-1.5 text-red-500 hover:text-red-700">Disconnect</button>
                  </>
                ) : p.status === 'coming_soon' ? (
                  <span className="btn-secondary text-xs py-1.5 flex-1 text-center opacity-50 cursor-not-allowed">Coming Soon</span>
                ) : (
                  <button
                    onClick={() => handleConnect(p.platform)}
                    disabled={connecting === p.platform}
                    className="btn-primary text-xs py-1.5 flex-1"
                  >
                    {connecting === p.platform ? 'Opening OAuth...' : `Connect ${p.name}`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 card p-5 bg-sky-50 border-sky-200">
        <h3 className="font-medium text-sky-900 mb-2">🔧 Setup Instructions</h3>
        <div className="text-sm text-sky-700 space-y-2">
          <p><strong>Instagram / Facebook:</strong> Create a Facebook App at developers.facebook.com, add FACEBOOK_APP_ID to .env</p>
          <p><strong>Twitter / X:</strong> Create a Twitter App at developer.twitter.com, add TWITTER_CLIENT_ID to .env</p>
          <p><strong>TikTok:</strong> Apply for TikTok for Developers access — integration coming soon</p>
          <p className="text-xs mt-3 text-sky-600">OAuth tokens are stored securely in the database. Tokens are never exposed to the frontend.</p>
        </div>
      </div>
    </div>
  );
}
