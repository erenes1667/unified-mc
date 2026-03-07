'use client';

import { useState, useEffect } from 'react';

interface CheckResult {
  name: string;
  status: 'ok' | 'missing' | 'error';
  version?: string;
  detail?: string;
  install?: string;
}

interface SetupData {
  checks: Record<string, CheckResult>;
  ts: number;
}

const STATUS_CONFIG = {
  ok: { color: '#34d399', label: '✓ Installed', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
  missing: { color: '#f59e0b', label: '⚠ Missing', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  error: { color: '#f87171', label: '✗ Error', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
};

function CheckItem({ item }: { item: CheckResult }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[item.status];

  return (
    <div
      className="glass"
      style={{
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 8,
        borderColor: cfg.border,
        background: cfg.bg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>
          {item.status === 'ok' ? '✅' : item.status === 'missing' ? '⚠️' : '❌'}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.name}</div>
          {item.detail && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.detail}</div>
          )}
          {item.version && (
            <div style={{ fontSize: 10, color: 'var(--cyan)', marginTop: 2, fontFamily: 'monospace' }}>{item.version}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 11, fontWeight: 600, color: cfg.color,
              padding: '2px 8px', borderRadius: 20, border: `1px solid ${cfg.border}`,
              background: cfg.bg,
            }}
          >
            {cfg.label}
          </span>
          {item.install && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="glass glass-hover"
              style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)',
              }}
            >
              {expanded ? 'Hide' : 'How to install'}
            </button>
          )}
        </div>
      </div>
      {expanded && item.install && (
        <div
          style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>
            Install command
          </div>
          <code style={{ fontSize: 12, color: 'var(--cyan)', fontFamily: 'monospace' }}>
            {item.install}
          </code>
        </div>
      )}
    </div>
  );
}

export default function SetupPage() {
  const [data, setData] = useState<SetupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch('/api/setup')
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const checks = data ? Object.values(data.checks) : [];
  const okCount = checks.filter(c => c.status === 'ok').length;
  const totalCount = checks.length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>⚙️ Setup Wizard</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Check and configure required tools & integrations
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="glass glass-hover"
          style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
            color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)',
          }}
        >
          {loading ? '⏳ Checking...' : '🔄 Re-check'}
        </button>
      </div>

      {/* Summary */}
      {!loading && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          <div className="glass" style={{ padding: '16px 20px', borderRadius: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#34d399' }}>{okCount}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Installed</div>
          </div>
          <div className="glass" style={{ padding: '16px 20px', borderRadius: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>
              {checks.filter(c => c.status === 'missing').length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Missing</div>
          </div>
          <div className="glass" style={{ padding: '16px 20px', borderRadius: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f87171' }}>
              {checks.filter(c => c.status === 'error').length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Errors</div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {!loading && totalCount > 0 && (
        <div className="glass" style={{ borderRadius: 10, padding: '12px 18px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Setup progress</span>
            <span style={{ fontSize: 12, color: 'var(--gold)' }}>{okCount}/{totalCount}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(okCount / totalCount) * 100}%`,
                background: okCount === totalCount ? '#34d399' : 'var(--gold)',
                borderRadius: 3,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Checklist */}
      {loading ? (
        <div className="glass" style={{ borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          ⏳ Running checks...
        </div>
      ) : error ? (
        <div className="glass" style={{ borderRadius: 12, padding: 24, color: '#f87171' }}>
          Error: {error}
        </div>
      ) : (
        <div>
          {checks.map((check, i) => <CheckItem key={i} item={check} />)}
        </div>
      )}
    </div>
  );
}
