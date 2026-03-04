import Link from 'next/link';

const QUICK_STATS = [
  { label: 'Active Agents', value: '9', color: '#00ffd1' },
  { label: 'Tasks In Progress', value: '3', color: '#c9a84c' },
  { label: 'Messages Today', value: '47', color: '#c9a84c' },
  { label: 'Gateway', value: 'LIVE', color: '#00ffd1' },
];

const RECENT_ACTIVITY = [
  { time: '10:42', agent: 'Mickey17', action: 'Spawned chunk 1 scaffold for unified-mc', icon: '⚡' },
  { time: '10:38', agent: 'Cleon', action: 'Wrote HANDOFF-MAR4.md with full build spec', icon: '📋' },
  { time: '10:35', agent: 'Demerzel', action: 'Checked O7 OS codebase for reusable modules', icon: '🔍' },
  { time: '10:20', agent: 'Varys', action: 'Processed 3 incoming emails, flagged 1 for Enes', icon: '📧' },
];

export default function Home() {
  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Welcome */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#c9a84c', marginBottom: 4 }}>
          ⚡ Dynasty Command Center
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          Welcome back, Emperor. All systems nominal.
        </p>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {QUICK_STATS.map(stat => (
          <div
            key={stat.label}
            className="glass"
            style={{ padding: '20px 24px', borderRadius: 12 }}
          >
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
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#c9a84c', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
            Recent Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, marginTop: 1 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#f4f4f5', marginBottom: 2 }}>
                    <span style={{ color: '#c9a84c' }}>{item.agent}</span>
                    {' — '}
                    {item.action}
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

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
              { label: 'KDE Metrics', href: '/kde-metrics', icon: '📊', color: '#00ffd1' },
            ].map(item => (
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
  );
}
