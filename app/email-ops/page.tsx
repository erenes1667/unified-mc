'use client';

const stats = [
  { label: 'Sent', value: '12,847', color: 'var(--cyan)', change: '+3.2%' },
  { label: 'Delivered', value: '12,691', color: 'var(--cyan)', change: '98.8%' },
  { label: 'Opened', value: '4,832', color: 'var(--gold)', change: '38.1%' },
  { label: 'Clicked', value: '892', color: 'var(--gold)', change: '7.0%' },
  { label: 'Bounced', value: '156', color: '#ef4444', change: '1.2%' },
  { label: 'Unsubscribed', value: '23', color: '#f59e0b', change: '0.2%' },
];

const campaigns = [
  { name: 'Weekly Newsletter #42', sent: '3,241', opened: '41.2%', clicked: '8.3%', status: 'delivered' },
  { name: 'Product Update: March', sent: '5,102', opened: '36.8%', clicked: '6.1%', status: 'delivered' },
  { name: 'Welcome Series: Step 1', sent: '892', opened: '52.3%', clicked: '12.7%', status: 'delivered' },
  { name: 'Re-engagement Campaign', sent: '1,456', opened: '18.4%', clicked: '3.2%', status: 'delivered' },
  { name: 'Flash Sale Announcement', sent: '2,156', opened: '44.1%', clicked: '9.8%', status: 'scheduled' },
];

const STATUS_COLORS: Record<string, string> = { delivered: '#34d399', scheduled: '#fbbf24', draft: '#6b7280' };

export default function EmailOpsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>📧 Email Operations</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Campaign performance and deliverability</p>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="glass" style={{ padding: '16px 18px', borderRadius: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{s.label}</span>
              <span style={{ color: s.color }}>{s.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Deliverability Gauge */}
      <div className="glass" style={{ borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>Deliverability Score</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: `conic-gradient(#34d399 0% 98.8%, rgba(255,255,255,0.05) 98.8% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--bg, #0a0a0f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#34d399' }}>98.8%</div>
          </div>
          <div>
            <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>Excellent deliverability</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Bounce rate under 2%, spam complaints at 0.01%</div>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>Recent Campaigns</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', gap: 0, fontSize: 12 }}>
          <div style={{ padding: '8px 0', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>Campaign</div>
          <div style={{ padding: '8px 0', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>Sent</div>
          <div style={{ padding: '8px 0', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>Open Rate</div>
          <div style={{ padding: '8px 0', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>Click Rate</div>
          <div style={{ padding: '8px 0', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>Status</div>
          {campaigns.map((c, i) => (
            <div key={i} style={{ display: 'contents' }}>
              <div style={{ padding: '12px 0', color: 'var(--text)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{c.name}</div>
              <div style={{ padding: '12px 0', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{c.sent}</div>
              <div style={{ padding: '12px 0', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{c.opened}</div>
              <div style={{ padding: '12px 0', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{c.clicked}</div>
              <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: `${STATUS_COLORS[c.status]}22`, color: STATUS_COLORS[c.status] }}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
