'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface FleetData {
  agents: { total: number; names: string[] };
  tasks: { total: number; inProgress: number; planning: number };
  gateway: { status: string; pid: string | null; upSince: string | null };
  activity: { time: string; agent: string; action: string; icon: string; source: string }[];
  memory: { totalFiles: number; todayUpdated: boolean };
  timestamp: string;
}

export default function Home() {
  const [data, setData] = useState<FleetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = () =>
      fetch('/api/fleet')
        .then((r) => r.json())
        .then((d) => mounted && setData(d))
        .catch(() => {})
        .finally(() => mounted && setLoading(false));
    load();
    const interval = setInterval(load, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const stats = data
    ? [
        { label: 'Active Agents', value: String(data.agents.total), color: '#00ffd1' },
        { label: 'Tasks', value: `${data.tasks.inProgress || data.tasks.planning}/${data.tasks.total}`, color: '#c9a84c' },
        { label: 'Memory Files', value: String(data.memory.totalFiles), color: '#c9a84c' },
        { label: 'Gateway', value: data.gateway.status, color: data.gateway.status === 'LIVE' ? '#00ffd1' : '#ef4444' },
      ]
    : [
        { label: 'Active Agents', value: '—', color: '#6b7280' },
        { label: 'Tasks', value: '—', color: '#6b7280' },
        { label: 'Memory Files', value: '—', color: '#6b7280' },
        { label: 'Gateway', value: '—', color: '#6b7280' },
      ];

  const activity = data?.activity || [];

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Welcome */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#c9a84c', marginBottom: 4 }}>
          ⚡ Command Center
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          {loading ? 'Loading fleet status...' : data?.gateway.status === 'LIVE'
            ? `All systems nominal. Gateway PID ${data.gateway.pid}`
            : 'Gateway status unknown. Check connection.'}
        </p>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {stats.map((stat) => (
          <div key={stat.label} className="glass" style={{ padding: '20px 24px', borderRadius: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, marginBottom: 4 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Activity */}
        <div className="glass" style={{ padding: 24, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#c9a84c', letterSpacing: 1, textTransform: 'uppercase' }}>
              Live Activity
            </h2>
            {data && (
              <span style={{ fontSize: 10, color: '#6b7280' }}>
                Updated {new Date(data.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              <div style={{ fontSize: 12, color: '#6b7280', padding: 20, textAlign: 'center' }}>Loading activity feed...</div>
            ) : activity.length === 0 ? (
              <div style={{ fontSize: 12, color: '#6b7280', padding: 20, textAlign: 'center' }}>No recent activity</div>
            ) : (
              activity.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, marginTop: 1 }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#f4f4f5', marginBottom: 2 }}>
                      <span style={{ color: '#c9a84c' }}>{item.agent}</span>
                      {' — '}
                      {item.action}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>
                      {item.time}
                      {item.source !== 'gateway' && (
                        <span style={{ marginLeft: 8, opacity: 0.6 }}>{item.source}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Agent Fleet */}
          {data && data.agents.names.length > 0 && (
            <div className="glass" style={{ padding: 24, borderRadius: 12 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: '#c9a84c', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
                Agent Fleet
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.agents.names.map((name) => (
                  <div
                    key={name}
                    className="glass"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ffd1', display: 'inline-block' }} />
                    {name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Launch */}
          <div className="glass" style={{ padding: 24, borderRadius: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#c9a84c', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
              Quick Launch
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Open Chat', href: '/chat', icon: '💬', color: '#00ffd1' },
                { label: 'View Tasks', href: '/tasks', icon: '✅', color: '#c9a84c' },
                { label: 'Team Status', href: '/team', icon: '👥', color: '#c9a84c' },
                { label: 'Memory', href: '/memory', icon: '🧠', color: '#00ffd1' },
                { label: 'Email Ops', href: '/email-ops', icon: '📧', color: '#c9a84c' },
                { label: 'Usage', href: '/usage', icon: '📈', color: '#00ffd1' },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    className="glass glass-hover"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      color: '#9ca3af',
                    }}
                  >
                    <span style={{ fontSize: 16, color: item.color }}>{item.icon}</span>
                    {item.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
