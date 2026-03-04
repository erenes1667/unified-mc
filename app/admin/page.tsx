'use client';

import { useState } from 'react';

interface HealthIndicator {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  metric: string;
  metricLabel: string;
}

interface RateLimit {
  id: string;
  label: string;
  max: number;
  value: number;
}

interface ModelEntry {
  id: number;
  name: string;
  role: string;
  color: string;
  enabled: boolean;
}

interface UserRow {
  username: string;
  role: string;
  roleColor: string;
  access: string;
  status: 'Active' | 'Inactive';
}

const healthData: HealthIndicator[] = [
  { name: 'API Gateway', status: 'healthy', metric: '99.97%', metricLabel: 'uptime' },
  { name: 'Database', status: 'healthy', metric: '12ms', metricLabel: 'latency' },
  { name: 'Queue', status: 'warning', metric: '847', metricLabel: 'pending' },
  { name: 'Storage', status: 'healthy', metric: '67%', metricLabel: 'used' },
];

const statusDotColor: Record<string, string> = {
  healthy: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
};

const initialRateLimits: RateLimit[] = [
  { id: 'claude', label: 'Claude messages/hour', max: 100, value: 45 },
  { id: 'gpt', label: 'GPT messages/hour', max: 100, value: 30 },
  { id: 'gemini', label: 'Gemini messages/hour', max: 200, value: 120 },
];

const initialModels: ModelEntry[] = [
  { id: 1, name: 'Claude Opus 4.6', role: 'primary', color: 'var(--gold)', enabled: true },
  { id: 2, name: 'Claude Sonnet 4.6', role: 'fallback 1', color: '#60a5fa', enabled: true },
  { id: 3, name: 'Gemini Flash', role: 'fallback 2', color: '#22c55e', enabled: true },
  { id: 4, name: 'Kimi K2.5', role: 'fallback 3', color: '#f472b6', enabled: true },
];

const usersData: UserRow[] = [
  { username: 'emperor', role: 'Admin', roleColor: 'var(--gold)', access: 'Full Access', status: 'Active' },
  { username: 'operator-1', role: 'Operator', roleColor: '#60a5fa', access: 'Standard', status: 'Active' },
  { username: 'viewer-1', role: 'Viewer', roleColor: '#a78bfa', access: 'Read Only', status: 'Active' },
  { username: 'bot-service', role: 'Service', roleColor: '#22c55e', access: 'API Only', status: 'Active' },
  { username: 'auditor', role: 'Auditor', roleColor: 'var(--cyan)', access: 'Audit Trail', status: 'Active' },
  { username: 'guest', role: 'Guest', roleColor: 'var(--muted)', access: 'Limited', status: 'Inactive' },
];

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--text)',
  marginBottom: 14,
};

const rangeTrackStyle = `
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: rgba(255,255,255,0.08);
    outline: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--gold);
    cursor: pointer;
    border: 2px solid rgba(201,168,76,0.4);
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--gold);
    cursor: pointer;
    border: 2px solid rgba(201,168,76,0.4);
  }
  input[type="range"]::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: rgba(255,255,255,0.08);
  }
`;

export default function AdminPage() {
  const [rateLimits, setRateLimits] = useState<RateLimit[]>(initialRateLimits);
  const [models, setModels] = useState<ModelEntry[]>(initialModels);

  const updateRate = (id: string, value: number) => {
    setRateLimits((prev) => prev.map((r) => (r.id === id ? { ...r, value } : r)));
  };

  const toggleModel = (id: number) => {
    setModels((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
  };

  const moveModel = (id: number, direction: 'up' | 'down') => {
    setModels((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (direction === 'up' && idx > 0) {
        const copy = [...prev];
        [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
        return copy;
      }
      if (direction === 'down' && idx < prev.length - 1) {
        const copy = [...prev];
        [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
        return copy;
      }
      return prev;
    });
  };

  return (
    <div style={{ fontFamily: 'inherit', color: 'var(--text)' }}>
      <style>{rangeTrackStyle}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Admin</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0 0' }}>System configuration and fleet management</p>
      </div>

      {/* Section 1: System Health */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={sectionTitleStyle}>System Health</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {healthData.map((h) => (
            <div key={h.name} className="glass" style={{ borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: statusDotColor[h.status],
                    display: 'inline-block',
                    boxShadow: `0 0 8px ${statusDotColor[h.status]}66`,
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{h.status}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{h.name}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: h.status === 'warning' ? '#eab308' : 'var(--text)' }}>
                {h.metric}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{h.metricLabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Rate Limiter Controls */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={sectionTitleStyle}>Rate Limiter Controls</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {rateLimits.map((r) => (
            <div key={r.id} className="glass" style={{ borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{r.value}</span>
              </div>
              <input
                type="range"
                min={0}
                max={r.max}
                value={r.value}
                onChange={(e) => updateRate(r.id, Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--muted)' }}>
                <span>0</span>
                <span>{r.max}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Model Waterfall Config */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={sectionTitleStyle}>Model Waterfall Config</h2>
        <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16 }}>
            If primary fails, fall through to next enabled model
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {models.map((m, idx) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: m.enabled ? 'rgba(255,255,255,0.03)' : 'transparent',
                  border: '1px solid',
                  borderColor: m.enabled ? 'var(--glass-border)' : 'rgba(255,255,255,0.04)',
                  opacity: m.enabled ? 1 : 0.45,
                }}
              >
                {/* Order number */}
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 18, textAlign: 'center', flexShrink: 0 }}>
                  {idx + 1}.
                </span>

                {/* Model name */}
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{m.name}</span>

                {/* Role badge */}
                <span
                  style={{
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: `${m.color}18`,
                    border: `1px solid ${m.color}40`,
                    color: m.color,
                    fontFamily: 'inherit',
                  }}
                >
                  {m.role}
                </span>

                {/* Up/Down buttons */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => moveModel(m.id, 'up')}
                    disabled={idx === 0}
                    style={{
                      fontSize: 11,
                      fontFamily: 'inherit',
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--glass-border)',
                      color: idx === 0 ? 'rgba(255,255,255,0.15)' : 'var(--muted)',
                      cursor: idx === 0 ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    &#9650;
                  </button>
                  <button
                    onClick={() => moveModel(m.id, 'down')}
                    disabled={idx === models.length - 1}
                    style={{
                      fontSize: 11,
                      fontFamily: 'inherit',
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--glass-border)',
                      color: idx === models.length - 1 ? 'rgba(255,255,255,0.15)' : 'var(--muted)',
                      cursor: idx === models.length - 1 ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    &#9660;
                  </button>
                </div>

                {/* Enable/Disable toggle */}
                <button
                  onClick={() => toggleModel(m.id)}
                  style={{
                    fontSize: 10,
                    fontFamily: 'inherit',
                    padding: '3px 10px',
                    borderRadius: 6,
                    background: m.enabled ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                    border: m.enabled ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.08)',
                    color: m.enabled ? '#22c55e' : 'var(--muted)',
                    cursor: 'pointer',
                  }}
                >
                  {m.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: User Role Management */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={sectionTitleStyle}>User Role Management</h2>
        <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 1fr',
              padding: '12px 20px',
              borderBottom: '1px solid var(--glass-border)',
              fontSize: 11,
              color: 'var(--muted)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <span>User</span>
            <span>Role</span>
            <span>Access Level</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {/* Table rows */}
          {usersData.map((u, idx) => (
            <div
              key={u.username}
              className="glass-hover"
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 1fr',
                padding: '14px 20px',
                alignItems: 'center',
                borderBottom: idx < usersData.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                fontSize: 12,
              }}
            >
              {/* Username */}
              <span style={{ fontWeight: 500 }}>{u.username}</span>

              {/* Role badge */}
              <span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: `${u.roleColor}18`,
                    border: `1px solid ${u.roleColor}40`,
                    color: u.roleColor,
                    fontFamily: 'inherit',
                  }}
                >
                  {u.role}
                </span>
              </span>

              {/* Access */}
              <span style={{ color: 'var(--muted)' }}>{u.access}</span>

              {/* Status */}
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: u.status === 'Active' ? '#22c55e' : 'var(--muted)',
                    display: 'inline-block',
                  }}
                />
                <span style={{ color: u.status === 'Active' ? 'var(--text)' : 'var(--muted)' }}>{u.status}</span>
              </span>

              {/* Actions */}
              <span style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => console.log(`Edit user: ${u.username}`)}
                  style={{
                    fontSize: 10,
                    fontFamily: 'inherit',
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => console.log(`Suspend user: ${u.username}`)}
                  style={{
                    fontSize: 10,
                    fontFamily: 'inherit',
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    color: '#ef4444',
                    cursor: 'pointer',
                  }}
                >
                  Suspend
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
