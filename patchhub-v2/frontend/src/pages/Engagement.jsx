import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';

const EVENT_ICONS = {
  contact_created: '👤',
  contact_updated: '✏️',
  dm_sent: '📤',
  dm_queued: '⏳',
  opt_out: '🚫',
  reply_received: '💬',
  default: '📋'
};

export default function Engagement() {
  const { api } = useAuth();
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [eventFilter, setEventFilter] = useState('');

  useEffect(() => { loadData(); }, [days, eventFilter]);

  async function loadData() {
    setLoading(true);
    const params = new URLSearchParams({ days, limit: 100 });
    if (eventFilter) params.set('event_type', eventFilter);

    const [eventsData, summaryData] = await Promise.all([
      api.get(`/engagement?${params}`),
      api.get(`/engagement/summary?days=${days}`),
    ]);

    setEvents(eventsData.events || []);
    setSummary(summaryData);
    setLoading(false);
  }

  const totalEvents = summary?.by_event?.reduce((s, e) => s + parseInt(e.count), 0) || 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Engagement Tracking</h1>
        <p className="text-gray-500 text-sm mt-1">All contact interactions across your CRM</p>
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-6">
        {[7, 14, 30, 90].map(d => (
          <button key={d}
            onClick={() => setDays(d)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              days === d ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {d}d
          </button>
        ))}
        <select className="input max-w-[180px] text-sm" value={eventFilter}
          onChange={e => setEventFilter(e.target.value)}>
          <option value="">All Events</option>
          <option value="contact_created">Contact Created</option>
          <option value="contact_updated">Contact Updated</option>
          <option value="dm_sent">DM Sent</option>
          <option value="dm_queued">DM Queued</option>
          <option value="opt_out">Opt-Out</option>
          <option value="reply_received">Reply Received</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading engagement data...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary panels */}
          <div className="lg:col-span-1 space-y-4">
            {/* By event type */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Events by Type</h3>
              <div className="space-y-2">
                {summary?.by_event?.length ? summary.by_event.map(e => (
                  <div key={e.event_type} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                      <span>{EVENT_ICONS[e.event_type] || EVENT_ICONS.default}</span>
                      {e.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium text-gray-900">{e.count}</span>
                  </div>
                )) : <p className="text-xs text-gray-400">No events in this period</p>}
              </div>
              {totalEvents > 0 && (
                <div className="mt-3 pt-3 border-t text-sm font-semibold text-gray-900 flex justify-between">
                  <span>Total</span><span>{totalEvents}</span>
                </div>
              )}
            </div>

            {/* By platform */}
            {summary?.by_platform?.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Events by Platform</h3>
                <div className="space-y-2">
                  {summary.by_platform.map(p => (
                    <div key={p.platform} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 capitalize">{p.platform}</span>
                      <span className="font-medium">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Event feed */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Recent Events</h3>
                <span className="text-xs text-gray-400">{events.length} shown</span>
              </div>

              {events.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No engagement events in this period
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                  {events.map(e => (
                    <div key={e.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">{EVENT_ICONS[e.event_type] || EVENT_ICONS.default}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {e.event_type?.replace(/_/g, ' ')}
                            </span>
                            {e.first_name && (
                              <span className="text-sm text-gray-500">
                                — {e.first_name} {e.last_name}
                              </span>
                            )}
                            {e.platform && (
                              <span className="badge bg-gray-100 text-gray-600 text-xs">{e.platform}</span>
                            )}
                            {e.direction === 'inbound' && (
                              <span className="badge bg-green-100 text-green-600 text-xs">inbound</span>
                            )}
                          </div>
                          {e.body && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{e.body}</p>
                          )}
                          {e.draft_name && (
                            <p className="text-xs text-sky-500 mt-0.5">Campaign: {e.draft_name}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
