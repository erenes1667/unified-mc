'use client';

import { useState, useEffect } from 'react';

interface ToolStatus {
  id: string;
  name: string;
  category: string;
  installed: boolean;
  path?: string;
  version?: string;
}

interface ToolsData {
  tools: ToolStatus[];
  ts: number;
}

export default function ToolsPage() {
  const [data, setData] = useState<ToolsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => {
    setLoading(true);
    fetch('/api/tools')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const tools = data?.tools || [];
  const categories = ['all', ...Array.from(new Set(tools.map(t => t.category)))];
  const filtered = filter === 'all' ? tools : tools.filter(t => t.category === filter);
  const installedCount = tools.filter(t => t.installed).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>🔧 Tools Status</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Installed tools and MCPs availability</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="glass glass-hover"
          style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)' }}
        >
          {loading ? '⏳ Checking...' : '🔄 Re-check'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="glass" style={{ padding: '16px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold)' }}>{tools.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Tools</div>
        </div>
        <div className="glass" style={{ padding: '16px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#34d399' }}>{installedCount}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Installed</div>
        </div>
        <div className="glass" style={{ padding: '16px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f87171' }}>{tools.length - installedCount}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Missing</div>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="glass glass-hover"
            style={{
              padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11,
              color: filter === cat ? 'var(--gold)' : 'var(--muted)',
              border: filter === cat ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
              background: filter === cat ? 'rgba(201,168,76,0.1)' : undefined,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass" style={{ borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          Checking tool availability...
        </div>
      ) : (
        <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 2fr 1fr',
            padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)',
            fontSize: 10, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase',
          }}>
            <span>Tool Name</span>
            <span>Category</span>
            <span>Installed</span>
            <span>Path</span>
            <span>Version</span>
          </div>
          {filtered.map((tool, i) => (
            <div
              key={tool.id}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 2fr 1fr',
                padding: '13px 18px', alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: !tool.installed ? 'rgba(248,113,113,0.03)' : undefined,
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                {tool.installed ? '✅ ' : '❌ '}{tool.name}
              </span>
              <span style={{
                fontSize: 10, color: tool.category === 'MCP' ? '#818cf8' : 'var(--cyan)',
                padding: '2px 8px', borderRadius: 20, width: 'fit-content',
                border: `1px solid ${tool.category === 'MCP' ? 'rgba(129,140,248,0.3)' : 'rgba(0,255,209,0.3)'}`,
                background: tool.category === 'MCP' ? 'rgba(129,140,248,0.1)' : 'rgba(0,255,209,0.1)',
              }}>
                {tool.category}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: tool.installed ? '#34d399' : '#f87171' }}>
                {tool.installed ? 'Yes' : 'No'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tool.path || '—'}
              </span>
              <span style={{ fontSize: 11, color: tool.version ? 'var(--text)' : 'var(--muted)', fontFamily: 'monospace' }}>
                {tool.version ? tool.version.slice(0, 30) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
