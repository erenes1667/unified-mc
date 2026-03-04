'use client';

import { useState } from 'react';

interface Integration {
  name: string;
  icon: string;
  connected: boolean;
  readOnly: boolean;
}

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [timezone, setTimezone] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [integrations, setIntegrations] = useState<Integration[]>([
    { name: 'Gmail', icon: '📧', connected: false, readOnly: true },
    { name: 'Google Calendar', icon: '📅', connected: false, readOnly: true },
    { name: 'Slack', icon: '💬', connected: false, readOnly: true },
    { name: 'GitHub', icon: '🐙', connected: false, readOnly: true },
  ]);
  const [saved, setSaved] = useState(false);

  const toggleIntegration = (i: number) => {
    setIntegrations(prev => prev.map((int, idx) => idx === i ? { ...int, connected: !int.connected } : int));
  };

  const maskKey = (key: string) => key ? key.slice(0, 8) + '•'.repeat(20) + key.slice(-4) : '';

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>🔩 Settings</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Configure your workspace</p>

      {/* Profile */}
      <div className="glass" style={{ borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>Profile</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { label: 'Name', value: name, set: setName, placeholder: 'Your name' },
            { label: 'Role', value: role, set: setRole, placeholder: 'e.g., Marketing Manager' },
            { label: 'Timezone', value: timezone, set: setTimezone, placeholder: 'e.g., America/New_York' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>{f.label}</label>
              <input
                value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
                  color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div className="glass" style={{ borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>API Keys</h2>
        {[
          { label: 'Anthropic (Claude)', value: anthropicKey, set: setAnthropicKey, placeholder: 'sk-ant-...' },
          { label: 'OpenAI (GPT)', value: openaiKey, set: setOpenaiKey, placeholder: 'sk-...' },
          { label: 'Google (Gemini)', value: geminiKey, set: setGeminiKey, placeholder: 'AI...' },
        ].map(k => (
          <div key={k.label} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>{k.label}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="password" value={k.value} onChange={e => k.set(e.target.value)} placeholder={k.placeholder}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
                  color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
                }}
              />
              {k.value && (
                <span style={{ fontSize: 10, color: '#34d399', alignSelf: 'center', whiteSpace: 'nowrap' }}>
                  {maskKey(k.value)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Integrations */}
      <div className="glass" style={{ borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>Integrations</h2>
        <p style={{ fontSize: 11, color: '#f59e0b', marginBottom: 16 }}>⚠ All integrations are READ-ONLY by default</p>
        {integrations.map((int, i) => (
          <div key={int.name} className="glass" style={{
            padding: '14px 16px', borderRadius: 8, marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>{int.icon}</span>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{int.name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {int.connected ? 'Connected' : 'Not connected'}
                  {int.connected && int.readOnly && (
                    <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 4, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: 9 }}>READ-ONLY</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleIntegration(i)}
              style={{
                width: 44, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none',
                background: int.connected ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: int.connected ? '#34d399' : '#6b7280',
                position: 'absolute', top: 3,
                left: int.connected ? 23 : 3,
                transition: 'left 0.2s, background 0.2s',
              }} />
            </button>
          </div>
        ))}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        style={{
          padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          background: saved ? 'rgba(52,211,153,0.2)' : 'rgba(201,168,76,0.2)',
          border: `1px solid ${saved ? 'rgba(52,211,153,0.4)' : 'rgba(201,168,76,0.3)'}`,
          color: saved ? '#34d399' : 'var(--gold)',
          fontFamily: 'inherit',
        }}
      >
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
}
