'use client';

import { useState, useEffect } from 'react';

interface ClientActivity {
  client: string;
  emails_24h?: number;
  recent_campaigns?: string[];
  last_contact?: string;
  status?: string;
  stale: boolean;
}

interface ClientsData {
  clients: ClientActivity[];
  ts: number;
  message?: string;
}

function timeAgo(iso: string | undefined): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Recently';
}

export default function ClientsPage() {
  const [data, setData] = useState<ClientsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const clients = data?.clients || [];
  const filtered = clients.filter(c =>
    c.client.toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = clients.filter(c => !c.stale).length;
  const staleCount = clients.filter(c => c.stale).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>👥 Client Tracker</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Per-client activity from workspace memory</p>
        </div>
        <input
          placeholder="🔍 Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="glass"
          style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 12, width: 220,
            color: 'var(--text)', outline: 'none', border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
          }}
        />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="glass" style={{ padding: '16px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold)' }}>{clients.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Clients</div>
        </div>
        <div className="glass" style={{ padding: '16px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#34d399' }}>{activeCount}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Active</div>
        </div>
        <div className="glass" style={{ padding: '16px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f87171' }}>{staleCount}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Stale (7+ days)</div>
        </div>
      </div>

      {loading ? (
        <div className="glass" style={{ borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          Loading client data...
        </div>
      ) : clients.length === 0 ? (
        <div className="glass" style={{ borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <div style={{ marginBottom: 8 }}>{data?.message || 'No client activity data found'}</div>
          <div style={{ fontSize: 11 }}>
            Expected location: <code style={{ color: 'var(--cyan)' }}>~/.openclaw/workspace/memory/client-activity/*.json</code>
          </div>
        </div>
      ) : (
        <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr 1fr',
            padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)',
            fontSize: 10, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase',
          }}>
            <span>Client Name</span>
            <span>Emails (24h)</span>
            <span>Recent Campaigns</span>
            <span>Last Contact</span>
            <span>Status</span>
          </div>
          {filtered.map((client, i) => (
            <div
              key={client.client}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr 1fr',
                padding: '14px 18px', alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: client.stale ? 'rgba(248,113,113,0.04)' : undefined,
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                {client.stale ? '🔴 ' : '🟢 '}{client.client}
              </span>
              <span style={{ fontSize: 13, color: client.emails_24h ? 'var(--cyan)' : 'var(--muted)' }}>
                {client.emails_24h ?? '—'}
              </span>
              <div>
                {client.recent_campaigns?.length ? (
                  client.recent_campaigns.slice(0, 2).map((c, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>· {c}</div>
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
                )}
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{timeAgo(client.last_contact)}</span>
              <span
                style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, width: 'fit-content',
                  color: client.stale ? '#f87171' : '#34d399',
                  border: `1px solid ${client.stale ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)'}`,
                  background: client.stale ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
                }}
              >
                {client.stale ? 'stale' : 'active'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
