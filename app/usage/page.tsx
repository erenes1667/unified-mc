'use client';

import { useState } from 'react';

const MODELS = [
  { name: 'Claude Sonnet', msgs: 142, inputTokens: '820K', outputTokens: '380K', cost: 4.80 },
  { name: 'Gemini Flash', msgs: 89, inputTokens: '640K', outputTokens: '250K', cost: 0.00 },
  { name: 'GPT-4o', msgs: 54, inputTokens: '420K', outputTokens: '200K', cost: 3.10 },
  { name: 'Local Ollama', msgs: 31, inputTokens: '290K', outputTokens: '120K', cost: 0.00 },
];

const DAILY = [
  { day: 'Mon', msgs: 48, cost: 1.20 },
  { day: 'Tue', msgs: 62, cost: 1.55 },
  { day: 'Wed', msgs: 55, cost: 1.40 },
  { day: 'Thu', msgs: 71, cost: 1.85 },
  { day: 'Fri', msgs: 42, cost: 1.10 },
  { day: 'Sat', msgs: 18, cost: 0.40 },
  { day: 'Sun', msgs: 20, cost: 0.40 },
];

const maxMsgs = Math.max(...DAILY.map(d => d.msgs));

export default function UsagePage() {
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const totalCost = MODELS.reduce((s, m) => s + m.cost, 0);
  const totalMsgs = MODELS.reduce((s, m) => s + m.msgs, 0);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>📈 Usage</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Token usage and cost tracking</p>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--cyan)' }}>{totalMsgs}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Messages</div>
        </div>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--gold)' }}>${totalCost.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Cost</div>
        </div>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>2.17M</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Input Tokens</div>
        </div>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>950K</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Output Tokens</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Bar Chart */}
        <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', letterSpacing: 1, textTransform: 'uppercase' }}>Messages This Week</h2>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['daily', 'weekly'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
                  background: period === p ? 'rgba(201,168,76,0.15)' : 'transparent',
                  border: `1px solid ${period === p ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
                  color: period === p ? 'var(--gold)' : 'var(--muted)',
                }}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
            {DAILY.map(d => (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{d.msgs}</span>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  height: `${(d.msgs / maxMsgs) * 120}px`,
                  background: 'linear-gradient(180deg, var(--gold), rgba(201,168,76,0.3))',
                }} />
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-Model Breakdown */}
        <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>Per-Model Breakdown</h2>
          {MODELS.map(m => (
            <div key={m.name} className="glass" style={{ padding: '14px 16px', borderRadius: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.name}</span>
                <span style={{ fontSize: 12, color: m.cost > 0 ? 'var(--gold)' : '#34d399' }}>
                  {m.cost > 0 ? `$${m.cost.toFixed(2)}` : 'Free'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)' }}>
                <span>{m.msgs} msgs</span>
                <span>In: {m.inputTokens}</span>
                <span>Out: {m.outputTokens}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
