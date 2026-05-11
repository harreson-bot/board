import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';

const PLATFORM_ICONS = { instagram: '📷', facebook: '👤', tiktok: '🎵', twitter: '🐦', sms: '📱', email: '📧' };

export default function Contacts() {
  const { api } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [tags, setTags] = useState([]);
  const [selected, setSelected] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [detail, setDetail] = useState(null);
  const [page, setPage] = useState(0);
  const [importStatus, setImportStatus] = useState(null);
  const fileRef = useRef();
  const LIMIT = 50;

  useEffect(() => { loadContacts(); }, [search, tagFilter, page]);
  useEffect(() => { loadTags(); }, []);

  async function loadContacts() {
    setLoading(true);
    const params = new URLSearchParams({ limit: LIMIT, offset: page * LIMIT });
    if (search) params.set('search', search);
    if (tagFilter) params.set('tag', tagFilter);
    const data = await api.get(`/contacts?${params}`);
    setContacts(data.contacts || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  async function loadTags() {
    const data = await api.get('/contacts/tags/list');
    setTags(Array.isArray(data) ? data : []);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this contact?')) return;
    await api.delete(`/contacts/${id}`);
    loadContacts();
  }

  async function handleBulkTag() {
    const tag = prompt('Enter tag name to apply:');
    if (!tag || !selected.length) return;
    const res = await api.post('/contacts/bulk/tag', { contact_ids: selected, tag });
    alert(`Tagged ${res.updated} contacts with "${tag}"`);
    setSelected([]);
    loadContacts();
    loadTags();
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.length} contacts? This cannot be undone.`)) return;
    const res = await api.post('/contacts/bulk/delete', { contact_ids: selected });
    alert(`Deleted ${res.deleted} contacts`);
    setSelected([]);
    loadContacts();
  }

  function toggleSelect(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function toggleSelectAll() {
    if (selected.length === contacts.length) setSelected([]);
    else setSelected(contacts.map(c => c.id));
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const isVcf = file.name.endsWith('.vcf');
    const formData = new FormData();
    formData.append('file', file);
    setImportStatus({ status: 'processing', message: 'Uploading...' });
    const res = await api.upload(`/contacts/import/${isVcf ? 'vcf' : 'csv'}`, formData);
    if (res.import_id) {
      pollImport(res.import_id);
    } else {
      setImportStatus({ status: 'error', message: res.error || 'Upload failed' });
    }
  }

  async function pollImport(importId) {
    const interval = setInterval(async () => {
      const status = await api.get(`/contacts/imports/status/${importId}`);
      setImportStatus(status);
      if (status.status === 'complete' || status.status === 'failed') {
        clearInterval(interval);
        if (status.status === 'complete') {
          loadContacts();
          loadTags();
        }
      }
    }, 1500);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} total contacts</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAdd(true)} className="btn-secondary text-sm">
            + Add Contact
          </button>
          <button onClick={() => setShowImport(true)} className="btn-primary text-sm">
            ⬆️ Import CSV/VCF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          className="input max-w-xs"
          placeholder="Search name, email, phone..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
        />
        <select
          className="input max-w-[180px]"
          value={tagFilter}
          onChange={e => { setTagFilter(e.target.value); setPage(0); }}
        >
          <option value="">All Tags</option>
          {tags.map(t => (
            <option key={t.name} value={t.name}>{t.name} ({t.contact_count})</option>
          ))}
        </select>
        {tagFilter && (
          <button className="btn-secondary text-sm" onClick={() => setTagFilter('')}>✕ Clear</button>
        )}
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-4 text-sm">
          <span className="text-sky-700 font-medium">{selected.length} selected</span>
          <button onClick={handleBulkTag} className="text-sky-600 hover:underline">Add Tag</button>
          <button onClick={handleBulkDelete} className="text-red-600 hover:underline">Delete</button>
          <button onClick={() => setSelected([])} className="text-gray-500 hover:underline ml-auto">Clear selection</button>
        </div>
      )}

      {/* Import status banner */}
      {importStatus && (
        <div className={`rounded-lg px-4 py-3 mb-4 text-sm border ${
          importStatus.status === 'complete' ? 'bg-green-50 border-green-200 text-green-700' :
          importStatus.status === 'failed' ? 'bg-red-50 border-red-200 text-red-700' :
          'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          {importStatus.status === 'processing' && '⏳ Importing...'}
          {importStatus.status === 'complete' && `✅ Imported ${importStatus.imported_count} contacts (${importStatus.duplicate_count} duplicates skipped)`}
          {importStatus.status === 'failed' && '❌ Import failed'}
          <button onClick={() => setImportStatus(null)} className="float-right font-bold">×</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left w-8">
                <input type="checkbox" checked={selected.length === contacts.length && contacts.length > 0}
                  onChange={toggleSelectAll} className="rounded" />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tags</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Score</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                {search || tagFilter ? 'No contacts match your search' : 'No contacts yet — import a CSV to get started'}
              </td></tr>
            ) : contacts.map(c => (
              <tr key={c.id} className={`hover:bg-gray-50 ${c.opted_out ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.includes(c.id)}
                    onChange={() => toggleSelect(c.id)} className="rounded" />
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setDetail(c)} className="font-medium text-gray-900 hover:text-sky-600 text-left">
                    {c.first_name} {c.last_name}
                    {c.opted_out && <span className="ml-1 text-xs text-red-500">(opt-out)</span>}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{c.email}</td>
                <td className="px-4 py-3 text-gray-500">{c.phone}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">{c.company}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(c.tags || []).slice(0, 2).map(t => (
                      <span key={t} className="badge bg-indigo-50 text-indigo-600 text-xs">{t}</span>
                    ))}
                    {(c.tags || []).length > 2 && <span className="text-xs text-gray-400">+{c.tags.length - 2}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{c.engagement_score}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}</span>
            <div className="flex gap-2">
              <button className="btn-secondary py-1 text-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn-secondary py-1 text-xs" disabled={(page + 1) * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Import Contacts</h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload a <strong>.csv</strong> or <strong>.vcf</strong> file. Columns are auto-detected.
              Duplicates (same email or phone) are skipped automatically.
            </p>
            <input type="file" accept=".csv,.vcf" ref={fileRef} onChange={handleFileUpload} className="block mb-4" />
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => fileRef.current?.click()}>Choose File</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{detail.first_name} {detail.last_name}</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="space-y-2 text-sm">
              {detail.email && <div><span className="text-gray-500">Email:</span> <span>{detail.email}</span></div>}
              {detail.phone && <div><span className="text-gray-500">Phone:</span> <span>{detail.phone}</span></div>}
              {detail.company && <div><span className="text-gray-500">Company:</span> <span>{detail.company}</span></div>}
              {detail.city && <div><span className="text-gray-500">Location:</span> <span>{detail.city}, {detail.state}</span></div>}
              {detail.notes && <div><span className="text-gray-500">Notes:</span> <span>{detail.notes}</span></div>}
              {detail.tags?.length > 0 && (
                <div><span className="text-gray-500">Tags:</span>{' '}
                  {detail.tags.map(t => <span key={t} className="badge bg-indigo-50 text-indigo-600 mr-1">{t}</span>)}
                </div>
              )}
              <div><span className="text-gray-500">Engagement Score:</span> <span className="font-medium">{detail.engagement_score}</span></div>
              <div><span className="text-gray-500">Source:</span> <span>{detail.source}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
