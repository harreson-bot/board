import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  queued: 'bg-yellow-100 text-yellow-700',
  sending: 'bg-orange-100 text-orange-700',
  sent: 'bg-green-100 text-green-700',
  paused: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-600',
};

const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'twitter', 'sms', 'email'];
const PLATFORM_ICONS = { instagram: '📷', facebook: '👤', tiktok: '🎵', twitter: '🐦', sms: '📱', email: '📧' };

export default function DmDrafts() {
  const { api } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showQueue, setShowQueue] = useState(null); // draft object
  const [showPreview, setShowPreview] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ name: '', body: '', platform: 'instagram' });
  const [queueForm, setQueueForm] = useState({ tag: '', send_at: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadDrafts(); }, [statusFilter]);

  async function loadDrafts() {
    setLoading(true);
    const params = new URLSearchParams({ limit: 100 });
    if (statusFilter) params.set('status', statusFilter);
    const data = await api.get(`/dms?${params}`);
    setDrafts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name || !form.body) return;
    setSaving(true);
    const res = await api.post('/dms', form);
    setSaving(false);
    if (res.error) { alert(res.error); return; }
    setShowCreate(false);
    setForm({ name: '', body: '', platform: 'instagram' });
    loadDrafts();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this draft?')) return;
    await api.delete(`/dms/${id}`);
    loadDrafts();
  }

  async function handlePause(id) {
    await api.post(`/dms/${id}/pause`, {});
    loadDrafts();
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this draft and clear its queue?')) return;
    await api.post(`/dms/${id}/cancel`, {});
    loadDrafts();
  }

  async function handlePreview(draft) {
    setShowPreview(draft);
    const res = await api.post(`/dms/${draft.id}/preview`, {});
    setPreviewResult(res);
  }

  async function handleQueue(e) {
    e.preventDefault();
    if (!showQueue) return;
    setSaving(true);
    const payload = {};
    if (queueForm.tag) payload.tag = queueForm.tag;
    if (queueForm.send_at) payload.send_at = queueForm.send_at;
    const res = await api.post(`/dms/${showQueue.id}/queue`, payload);
    setSaving(false);
    if (res.error) { alert(res.error); return; }
    alert(`✅ Queued ${res.queued} messages!`);
    setShowQueue(null);
    setQueueForm({ tag: '', send_at: '' });
    loadDrafts();
  }

  const variables = form.body.match(/\{\{(\w+)\}\}/g) || [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DM Drafts</h1>
          <p className="text-sm text-gray-500 mt-1">{drafts.length} drafts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          + New Draft
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-5">
        {['', 'draft', 'queued', 'sending', 'sent', 'paused'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === s
                ? 'border-sky-500 bg-sky-50 text-sky-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Draft list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading drafts...</div>
      ) : drafts.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">✉️</div>
          <p className="font-medium">No drafts yet</p>
          <p className="text-sm mt-1">Create a DM draft with personalization variables like {'{{first_name}}'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map(d => (
            <div key={d.id} className="card p-5 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-medium text-gray-900">{d.name}</span>
                  <span className={`badge ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-600'}`}>
                    {d.status}
                  </span>
                  <span className="text-sm text-gray-400">
                    {PLATFORM_ICONS[d.platform]} {d.platform}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate max-w-xl">{d.body_preview}...</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span>📤 {d.sent_count || 0} sent</span>
                  <span>👥 {d.recipient_count || 0} recipients</span>
                  <span>💬 {d.reply_count || 0} replies</span>
                  {d.scheduled_at && <span>⏰ {new Date(d.scheduled_at).toLocaleDateString()}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <button onClick={() => handlePreview(d)} className="btn-secondary text-xs py-1.5">Preview</button>
                {['draft', 'paused', 'scheduled'].includes(d.status) && (
                  <button onClick={() => setShowQueue(d)} className="btn-primary text-xs py-1.5">Queue →</button>
                )}
                {['queued', 'sending'].includes(d.status) && (
                  <button onClick={() => handlePause(d.id)} className="btn-secondary text-xs py-1.5">Pause</button>
                )}
                {!['sent'].includes(d.status) && (
                  <button onClick={() => handleCancel(d.id)} className="text-red-500 hover:text-red-700 text-xs">Cancel</button>
                )}
                {d.status === 'draft' && (
                  <button onClick={() => handleDelete(d.id)} className="text-gray-400 hover:text-gray-600 text-xs">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Draft Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">New DM Draft</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Draft Name</label>
                <input className="input" placeholder="e.g. Welcome Intro — Realtors" required
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select className="input" value={form.platform}
                  onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                  {PLATFORMS.map(p => (
                    <option key={p} value={p}>{PLATFORM_ICONS[p]} {p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
                <p className="text-xs text-gray-400 mb-1">
                  Use {'{{first_name}}'}, {'{{last_name}}'}, {'{{company}}'}, {'{{city}}'}, {'{{state}}'} for personalization
                </p>
                <textarea className="input h-36 resize-none" placeholder="Hey {{first_name}}! I wanted to reach out..."
                  value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required />
                <div className="flex justify-between text-xs mt-1 text-gray-400">
                  <span>{variables.length > 0 && `Variables: ${[...new Set(variables.map(v => v.replace(/[{}]/g, '')))].join(', ')}`}</span>
                  <span>{form.body.length} chars</span>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Draft'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Preview — {showPreview.name}</h3>
              <button onClick={() => { setShowPreview(null); setPreviewResult(null); }} className="text-gray-400 text-xl">×</button>
            </div>
            {previewResult ? (
              <>
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">PERSONALIZED (sample contact)</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm whitespace-pre-wrap">{previewResult.personalized}</div>
                </div>
                <div className="text-xs text-gray-400 flex gap-4">
                  <span>Platform: {PLATFORM_ICONS[previewResult.platform]} {previewResult.platform}</span>
                  <span>{previewResult.character_count} chars</span>
                  {previewResult.variables?.length > 0 && <span>Variables: {previewResult.variables.join(', ')}</span>}
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">Loading preview...</p>
            )}
          </div>
        </div>
      )}

      {/* Queue Modal */}
      {showQueue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Queue "{showQueue.name}"</h3>
            <p className="text-sm text-gray-500 mb-4">Select recipients by tag. Opted-out contacts are excluded automatically.</p>
            <form onSubmit={handleQueue} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Tag (leave empty for all)</label>
                <input className="input" placeholder="e.g. warm-lead" value={queueForm.tag}
                  onChange={e => setQueueForm(f => ({ ...f, tag: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule (optional)</label>
                <input className="input" type="datetime-local" value={queueForm.send_at}
                  onChange={e => setQueueForm(f => ({ ...f, send_at: e.target.value }))} />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
                ⚠️ Real sending requires social integrations connected. Queue creates the plan — review before activating.
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" className="btn-secondary" onClick={() => setShowQueue(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Queuing...' : 'Queue Messages'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
