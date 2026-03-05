'use client';

import { useState, useEffect } from 'react';

interface SetupState {
  installed: boolean;
  workspaceExists: boolean;
  gatewayUrl: string;
  hasAuthProfiles: boolean;
  hasToken: boolean;
  agentCount: number;
}

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<SetupState | null>(null);
  const [gatewayUrl, setGatewayUrl] = useState('ws://127.0.0.1:18789');
  const [token, setToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [loading, setLoading] = useState(true);

  // Detect installation on mount
  useEffect(() => {
    fetch('/api/connect')
      .then((r) => r.json())
      .then((d) => {
        setState(d);
        setGatewayUrl(d.gatewayUrl || 'ws://127.0.0.1:18789');
        // If fully configured, skip wizard
        if (d.installed && d.workspaceExists) {
          setStep(1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayUrl, token }),
      });
      const data = await res.json();
      setTestResult(data.connected ? 'success' : 'fail');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };

  const finish = () => {
    localStorage.setItem('umc_gateway_url', gatewayUrl);
    if (token) localStorage.setItem('umc_gateway_token', token);
    localStorage.setItem('umc_setup_complete', 'true');
    onComplete();
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)',
      }}>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>Detecting installation...</div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)',
    }}>
      <div className="glass" style={{ maxWidth: 520, width: '100%', borderRadius: 16, padding: 40 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #c9a84c, #a07830)',
            borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: '0 0 24px rgba(201,168,76,0.4)',
          }}>
            ⚡
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>
            Unified Mission Control
          </h1>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>O7 OS — Setup Wizard</p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {['Detect', 'Configure', 'Connect'].map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600,
                background: i <= step ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${i <= step ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: i <= step ? 'var(--gold)' : 'var(--muted)',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 11, color: i <= step ? 'var(--text)' : 'var(--muted)' }}>{label}</span>
              {i < 2 && <span style={{ color: 'var(--muted)', fontSize: 10 }}>→</span>}
            </div>
          ))}
        </div>

        {/* Step 0: Detection */}
        {step === 0 && (
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Installation Detection</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              <StatusRow label="OpenClaw installed" ok={state?.installed || false} />
              <StatusRow label="Workspace exists" ok={state?.workspaceExists || false} />
              <StatusRow label="Auth profiles found" ok={state?.hasAuthProfiles || false} />
              <StatusRow label="Agents configured" ok={(state?.agentCount || 0) > 0} detail={state?.agentCount ? `${state.agentCount} agents` : undefined} />
            </div>
            {!state?.installed ? (
              <div className="glass" style={{ padding: 16, borderRadius: 8, marginBottom: 20 }}>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  OpenClaw installation not detected. Install OpenClaw first, or configure manually in the next step.
                </p>
              </div>
            ) : null}
            <button onClick={() => setStep(1)} style={{
              width: '100%', padding: '12px', borderRadius: 8, border: '1px solid rgba(201,168,76,0.3)',
              background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Continue →
            </button>
          </div>
        )}

        {/* Step 1: Configure */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Gateway Configuration</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Gateway URL</label>
              <input
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                placeholder="ws://127.0.0.1:18789"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text)', outline: 'none',
                }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Gateway Token <span style={{ opacity: 0.5 }}>(optional)</span>
              </label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Leave empty for local gateway"
                type="password"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text)', outline: 'none',
                }}
              />
              {state?.hasToken && (
                <p style={{ fontSize: 11, color: '#34d399', marginTop: 6 }}>
                  Token auto-detected from installation
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(0)} style={{
                padding: '12px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
              }}>
                ← Back
              </button>
              <button onClick={() => setStep(2)} style={{
                flex: 1, padding: '12px', borderRadius: 8, border: '1px solid rgba(201,168,76,0.3)',
                background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Connect */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Test Connection</h2>
            <div className="glass" style={{ padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: 'var(--muted)' }}>Gateway</span>
                <span style={{ color: 'var(--text)' }}>{gatewayUrl}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>Token</span>
                <span style={{ color: 'var(--text)' }}>{token ? '••••••' : 'None'}</span>
              </div>
            </div>

            {testResult === 'success' && (
              <div style={{
                padding: 12, borderRadius: 8, marginBottom: 16,
                background: 'rgba(0,255,209,0.05)', border: '1px solid rgba(0,255,209,0.2)',
                fontSize: 12, color: '#00ffd1', textAlign: 'center',
              }}>
                Connection verified successfully
              </div>
            )}
            {testResult === 'fail' && (
              <div style={{
                padding: 12, borderRadius: 8, marginBottom: 16,
                background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
                fontSize: 12, color: '#ef4444', textAlign: 'center',
              }}>
                Could not reach gateway. You can still continue — the dashboard will work with file-based data.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setStep(1)} style={{
                padding: '12px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
              }}>
                ← Back
              </button>
              <button onClick={testConnection} disabled={testing} style={{
                flex: 1, padding: '12px', borderRadius: 8, border: '1px solid rgba(0,255,209,0.3)',
                background: 'rgba(0,255,209,0.05)', color: 'var(--cyan)', fontSize: 13, cursor: 'pointer',
                opacity: testing ? 0.5 : 1,
              }}>
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
            <button onClick={finish} style={{
              width: '100%', padding: '12px', borderRadius: 8, border: '1px solid rgba(201,168,76,0.3)',
              background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Launch Mission Control →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: ok ? '#00ffd1' : 'rgba(255,255,255,0.15)',
        boxShadow: ok ? '0 0 6px #00ffd1' : 'none',
      }} />
      <span style={{ fontSize: 12, color: ok ? 'var(--text)' : 'var(--muted)', flex: 1 }}>{label}</span>
      {detail && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{detail}</span>}
    </div>
  );
}
