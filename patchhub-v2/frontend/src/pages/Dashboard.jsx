import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';

function StatCard({ label, value, icon, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-gray-400">{sub}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { api, partner } = useAuth();
  const [contactStats, setContactStats] = useState(null);
  const [dmStats, setDmStats] = useState(null);
  const [engSummary, setEngSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/contacts/stats/summary'),
      api.get('/dms/stats/overview'),
      api.get('/engagement/summary?days=7'),
    ]).then(([cs, ds, es]) => {
      setContactStats(cs);
      setDmStats(ds);
      setEngSummary(es);
    }).finally(() => setLoading(false));
  }, []);

  const trialDaysLeft = partner.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(partner.trial_ends_at) - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {partner.display_name || partner.username} 👋
            </h1>
            <p className="text-gray-500 mt-1">Here's what's happening with your CRM</p>
          </div>
          {trialDaysLeft !== null && partner.plan === 'starter' && (
            <div className="bg-sky-50 border border-sky-200 text-sky-700 text-sm rounded-lg px-4 py-2">
              ⏰ {trialDaysLeft} days left in trial
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading dashboard...</div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon="👥"
              label="Total Contacts"
              value={contactStats?.totals?.total || 0}
              sub="all time"
            />
            <StatCard
              icon="📤"
              label="DMs Sent"
              value={dmStats?.total_sent || 0}
              sub="all time"
            />
            <StatCard
              icon="💬"
              label="Replies"
              value={dmStats?.total_replies || 0}
              sub="all time"
            />
            <StatCard
              icon="📈"
              label="Events (7d)"
              value={engSummary?.by_event?.reduce((s, e) => s + parseInt(e.count), 0) || 0}
              sub="last 7 days"
            />
          </div>

          {/* Two column: Top tags + Recent events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Tags */}
            <div className="card p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">🏷️ Top Tags</h3>
              {contactStats?.top_tags?.length ? (
                <div className="space-y-2">
                  {contactStats.top_tags.map(tag => (
                    <div key={tag.name} className="flex items-center justify-between text-sm">
                      <span className="badge bg-indigo-100 text-indigo-700">{tag.name}</span>
                      <span className="text-gray-400">{tag.contact_count} contacts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No tags yet — import contacts to see tags</p>
              )}
            </div>

            {/* Contact sources */}
            <div className="card p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">📋 Contact Sources</h3>
              {contactStats?.by_source?.length ? (
                <div className="space-y-2">
                  {contactStats.by_source.map(s => (
                    <div key={s.source} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 capitalize">{s.source?.replace('_', ' ') || 'Unknown'}</span>
                      <span className="font-medium text-gray-900">{s.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No contacts yet</p>
              )}
            </div>

            {/* DM Status */}
            <div className="card p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">✉️ DM Drafts Status</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Drafts', val: dmStats?.drafts, color: 'text-gray-600' },
                  { label: 'Queued', val: dmStats?.queued, color: 'text-yellow-600' },
                  { label: 'Sending', val: dmStats?.sending, color: 'text-blue-600' },
                  { label: 'Sent', val: dmStats?.sent, color: 'text-green-600' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className={item.color}>{item.label}</span>
                    <span className="font-medium">{item.val || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Engagement trend */}
            <div className="card p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">📅 Engagement (7d)</h3>
              {engSummary?.daily_trend?.length ? (
                <div className="space-y-1">
                  {engSummary.daily_trend.slice(-7).map(d => (
                    <div key={d.date} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="font-medium text-gray-900">{d.events} events</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No engagement data yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
