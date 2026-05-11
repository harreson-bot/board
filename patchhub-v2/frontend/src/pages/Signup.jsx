import React, { useState } from 'react';
import { useAuth } from '../App';

export default function Signup({ onSwitch }) {
  const { api, login } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', display_name: '', company: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', form);
      if (res.error) { setError(res.error); }
      else { login(res.token, res.partner); }
    } catch { setError('Network error — try again'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🩹</div>
          <h1 className="text-3xl font-bold text-white">PatchHub</h1>
          <p className="text-gray-400 mt-1">Create your partner account</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Get Started Free</h2>
          <p className="text-sm text-gray-500 mb-6">14-day trial · 50 demo leads auto-loaded · No credit card</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input className="input" placeholder="john_doe" value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input className="input" placeholder="John Doe" value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company (optional)</label>
              <input className="input" placeholder="Your Business Name" value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input className="input" type="password" placeholder="Min 8 characters" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creating account...' : '🚀 Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <button onClick={onSwitch} className="text-sky-600 hover:underline font-medium">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
}
