'use client';

import { useState, useEffect } from 'react';

interface ProviderInfo {
  name: string;
  provider: string;
  active: boolean;
  costPerMInput: number;
  costPerMOutput: number;
}

interface DailyActivity {
  date: string;
  day: string;
  events: number;
}

interface UsageData {
  providers: ProviderInfo[];
  daily: DailyActivity[];
  uptime: string | null;
  totalEvents: number;
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxEvents = data ? Math.max(...data.daily.map((d) => d.events), 1) : 1;
  const paidProviders = data?.providers.filter((p) => p.costPerMInput > 0) || [];
  const freeProviders = data?.providers.filter((p) => p.costPerMInput === 0) || [];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>📈 Usage</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
        Token usage and cost tracking
        {data?.uptime && <span> — Gateway up {data.uptime}</span>}
      </p>

      {loading ? (
        <div className="glass" style={{ borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          Loading usage data...
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--cyan)' }}>
                {data?.providers.length || 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Active Providers</div>
            </div>
            <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--gold)' }}>
                {paidProviders.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Paid Providers</div>
            </div>
            <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#34d399' }}>
                {freeProviders.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Free Providers</div>
            </div>
            <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>
                {data?.totalEvents.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Events (7d)</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Activity Chart */}
            <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Gateway Events (7d)
                </h2>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['daily', 'weekly'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 10,
                        cursor: 'pointer',
                        background: period === p ? 'rgba(201,168,76,0.15)' : 'transparent',
                        border: `1px solid ${period === p ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
                        color: period === p ? 'var(--gold)' : 'var(--muted)',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
                {(data?.daily || []).map((d) => (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{d.events}</span>
                    <div
                      style={{
                        width: '100%',
                        borderRadius: '4px 4px 0 0',
                        height: `${Math.max((d.events / maxEvents) * 120, 2)}px`,
                        background: d.events > 0
                          ? 'linear-gradient(180deg, var(--gold), rgba(201,168,76,0.3))'
                          : 'rgba(255,255,255,0.05)',
                      }}
                    />
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Provider Breakdown */}
            <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
                Provider Breakdown
              </h2>
              {data?.providers.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 12, padding: 20, textAlign: 'center' }}>
                  No providers configured
                </div>
              ) : (
                (data?.providers || []).map((p) => (
                  <div key={p.provider} className="glass" style={{ padding: '14px 16px', borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: p.active ? '#00ffd1' : '#ef4444',
                            display: 'inline-block',
                          }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: p.costPerMInput > 0 ? 'var(--gold)' : '#34d399' }}>
                        {p.costPerMInput > 0 ? `$${p.costPerMInput}/M in` : 'Free'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)' }}>
                      <span>Input: ${p.costPerMInput}/M</span>
                      <span>Output: ${p.costPerMOutput}/M</span>
                      <span style={{ color: p.active ? '#00ffd1' : '#ef4444' }}>
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
