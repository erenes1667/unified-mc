'use client';

const models = [
  { name: 'Claude Sonnet', msgs: 142, tokens: '1.2M', cost: '$4.80', pct: 45 },
  { name: 'Gemini Flash', msgs: 89, tokens: '890K', cost: '$0.00', pct: 28 },
  { name: 'GPT-4o', msgs: 54, tokens: '620K', cost: '$3.10', pct: 17 },
  { name: 'Local Ollama', msgs: 31, tokens: '410K', cost: '$0.00', pct: 10 },
];

const topics = [
  { name: 'Email triage', count: 47, pct: 30 },
  { name: 'Code review', count: 38, pct: 24 },
  { name: 'Research queries', count: 29, pct: 18 },
  { name: 'Task management', count: 22, pct: 14 },
  { name: 'Data analysis', count: 12, pct: 8 },
  { name: 'Other', count: 10, pct: 6 },
];

export default function KDEMetricsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>📊 KDE Metrics</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Knowledge Decision Engine performance</p>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Queries Today', value: '316', color: 'var(--cyan)' },
          { label: 'Avg Response', value: '1.8s', color: 'var(--gold)' },
          { label: 'Success Rate', value: '99.2%', color: '#34d399' },
          { label: 'Total Cost', value: '$7.90', color: 'var(--gold)' },
        ].map(s => (
          <div key={s.label} className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Model Usage */}
        <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>Model Usage</h2>
          {models.map(m => (
            <div key={m.name} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--text)' }}>{m.name}</span>
                <span style={{ color: 'var(--muted)' }}>{m.msgs} msgs · {m.tokens} tokens · {m.cost}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${m.pct}%`, background: 'linear-gradient(90deg, var(--gold), var(--cyan))', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Top Topics */}
        <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>Top Query Topics</h2>
          {topics.map(t => (
            <div key={t.name} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--text)' }}>{t.name}</span>
                <span style={{ color: 'var(--muted)' }}>{t.count} queries ({t.pct}%)</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${t.pct}%`, background: 'var(--cyan)', borderRadius: 3, opacity: 0.7 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
