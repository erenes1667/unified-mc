'use client';

import { useState } from 'react';

const ICONS = ['⚡', '📧', '🔍', '✅', '📋', '🧠', '🔧', '📊'];
const AGENTS = ['Atlas', 'System', 'Monitor', 'Scheduler'];
const ACTIONS = [
  'Completed email triage, flagged 2 items',
  'Ran scheduled health check, all systems nominal',
  'Processed incoming webhook from GitHub',
  'Updated memory with new observations',
  'Checked Gmail inbox, 0 unread requiring attention',
  'Compiled daily metrics summary',
  'Refreshed project status from API',
  'Scanned Slack mentions, nothing urgent',
  'Generated weekly usage report',
  'Synced calendar events for today',
  'Indexed 12 new documents for search',
  'Cleared stale cache entries',
];

function generateEntries() {
  const entries = [];
  const now = Date.now();
  for (let i = 0; i < 20; i++) {
    const ts = new Date(now - i * 180000 - Math.random() * 60000);
    entries.push({
      id: i,
      time: ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      agent: AGENTS[Math.floor(Math.random() * AGENTS.length)],
      action: ACTIONS[Math.floor(Math.random() * ACTIONS.length)],
      icon: ICONS[Math.floor(Math.random() * ICONS.length)],
    });
  }
  return entries;
}

export default function ActivityPage() {
  const [entries] = useState(generateEntries);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? entries : entries.filter(e => e.agent === filter);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>⚡ Activity Feed</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Real-time agent activity log</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', ...AGENTS].map(a => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className="glass glass-hover"
            style={{
              padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
              color: filter === a ? 'var(--gold)' : 'var(--muted)',
              borderColor: filter === a ? 'rgba(201,168,76,0.3)' : 'transparent',
              background: filter === a ? 'rgba(201,168,76,0.1)' : 'var(--glass)',
            }}
          >
            {a === 'all' ? 'All' : a}
          </button>
        ))}
      </div>

      <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
        {filtered.map((entry, i) => (
          <div
            key={entry.id}
            style={{
              display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 0',
              borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}
          >
            <span style={{ fontSize: 16, marginTop: 2 }}>{entry.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>
                <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{entry.agent}</span>
                {' — '}{entry.action}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{entry.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
