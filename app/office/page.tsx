'use client';

import { useState, useEffect } from 'react';

type Status = 'online' | 'busy' | 'idle';

interface Agent {
  name: string;
  emoji: string;
  role: string;
  status: Status;
  row: number;
  col: number;
}

const agents: Agent[] = [
  { name: 'Cleon', emoji: '👑', role: 'Emperor', status: 'online', row: 1, col: 3 },
  { name: 'Agent', emoji: '⚙️', role: 'Ops', status: 'busy', row: 1, col: 1 },
  { name: 'Forge', emoji: '🔨', role: 'Dev', status: 'online', row: 1, col: 5 },
  { name: 'Raven', emoji: '🔍', role: 'Research', status: 'idle', row: 2, col: 1 },
  { name: 'Whisper', emoji: '🎨', role: 'Design', status: 'online', row: 2, col: 3 },
  { name: 'Kimi', emoji: '🧠', role: 'Intel', status: 'busy', row: 2, col: 5 },
  { name: 'Sentinel', emoji: '🛡️', role: 'Security', status: 'online', row: 3, col: 2 },
  { name: 'Varys', emoji: '📧', role: 'Email', status: 'idle', row: 3, col: 4 },
  { name: 'Demerzel', emoji: '💻', role: 'Coding', status: 'online', row: 3, col: 3 },
  { name: 'Codex', emoji: '📚', role: 'Docs', status: 'idle', row: 3, col: 1 },
];

const STATUS_CONFIG: Record<Status, { color: string; label: string }> = {
  online: { color: '#34d399', label: 'Online' },
  busy: { color: 'var(--gold)', label: 'Busy' },
  idle: { color: 'var(--muted)', label: 'Idle' },
};

export default function OfficePage() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  const idleAgents = agents.filter((a) => a.status === 'idle');

  return (
    <div>
      <style>{`
        @keyframes busyPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px currentColor; }
          50% { opacity: 0.4; box-shadow: 0 0 12px currentColor; }
        }
        @keyframes onlineGlow {
          0%, 100% { box-shadow: 0 0 4px currentColor; }
          50% { box-shadow: 0 0 8px currentColor; }
        }
        @keyframes deskHover {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
        @keyframes waterBubble {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
            The Office
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Who&apos;s where right now
          </p>
        </div>

        {/* Status Legend */}
        <div
          className="glass"
          style={{
            borderRadius: 10,
            padding: '10px 16px',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
          }}
        >
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: cfg.color,
                  boxShadow: `0 0 6px ${cfg.color}`,
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Office Floor Plan */}
      <div
        className="glass"
        style={{
          borderRadius: 12,
          padding: 24,
          position: 'relative',
        }}
      >
        {/* Floor label */}
        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 2 }}>
          Floor 1 &mdash; Main Office
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridTemplateRows: 'repeat(3, auto)',
            gap: 8,
          }}
        >
          {Array.from({ length: 15 }).map((_, i) => {
            const row = Math.floor(i / 5) + 1;
            const col = (i % 5) + 1;
            const agent = agents.find((a) => a.row === row && a.col === col);

            // Water cooler area - bottom right
            if (row === 3 && col === 5) {
              return (
                <div
                  key={i}
                  style={{
                    borderRadius: 10,
                    padding: 12,
                    minHeight: 110,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 255, 209, 0.03)',
                    border: '1px dashed rgba(0, 255, 209, 0.15)',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🚰</div>
                  <div style={{ fontSize: 9, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Water Cooler
                  </div>
                  {/* Idle agents gathering */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {idleAgents.map((a) => (
                      <span
                        key={a.name}
                        title={a.name}
                        style={{
                          fontSize: 12,
                          opacity: 0.6,
                          animation: 'waterBubble 3s ease-in-out infinite',
                          animationDelay: `${idleAgents.indexOf(a) * 0.5}s`,
                        }}
                      >
                        {a.emoji}
                      </span>
                    ))}
                  </div>
                </div>
              );
            }

            if (!agent) {
              // Empty hallway cell
              return (
                <div
                  key={i}
                  style={{
                    borderRadius: 10,
                    minHeight: 110,
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                  }} />
                </div>
              );
            }

            const statusCfg = STATUS_CONFIG[agent.status];

            return (
              <div
                key={i}
                className="glass glass-hover"
                style={{
                  borderRadius: 10,
                  padding: 12,
                  minHeight: 110,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'default',
                  position: 'relative',
                  boxShadow:
                    agent.status === 'online'
                      ? `0 2px 0 rgba(52,211,153,0.15), inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 8px rgba(0,0,0,0.3)`
                      : agent.status === 'busy'
                      ? `0 2px 0 rgba(201,168,76,0.15), inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 8px rgba(0,0,0,0.3)`
                      : `0 2px 0 rgba(107,114,128,0.1), inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 8px rgba(0,0,0,0.3)`,
                  animation: agent.status === 'busy' ? 'deskHover 2s ease-in-out infinite' : undefined,
                }}
              >
                {/* Status dot */}
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: statusCfg.color,
                    color: statusCfg.color,
                    animation:
                      agent.status === 'busy'
                        ? 'busyPulse 1.5s ease-in-out infinite'
                        : agent.status === 'online'
                        ? 'onlineGlow 3s ease-in-out infinite'
                        : undefined,
                  }}
                />

                {/* Pixel desk surface */}
                <div
                  style={{
                    width: 48,
                    height: 28,
                    background: 'rgba(201, 168, 76, 0.06)',
                    border: '1px solid rgba(201, 168, 76, 0.12)',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 6,
                    boxShadow: '0 2px 0 rgba(0,0,0,0.2), inset 0 -1px 0 rgba(255,255,255,0.03)',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{agent.emoji}</span>
                </div>

                {/* Agent name */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: 2,
                  }}
                >
                  {agent.name}
                </div>

                {/* Role */}
                <div
                  style={{
                    fontSize: 9,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  {agent.role}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hallway dividers - horizontal lines between rows */}
        <div
          style={{
            position: 'absolute',
            left: 40,
            right: 40,
            top: '36%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.08), transparent)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 40,
            right: 40,
            top: '64%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.08), transparent)',
          }}
        />
      </div>

      {/* Bottom stats */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 16,
        }}
      >
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = agents.filter((a) => a.status === key).length;
          return (
            <div
              key={key}
              className="glass"
              style={{
                borderRadius: 10,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: cfg.color,
                  boxShadow: `0 0 6px ${cfg.color}`,
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{count}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{cfg.label}</span>
            </div>
          );
        })}
        <div
          className="glass"
          style={{
            borderRadius: 10,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginLeft: 'auto',
          }}
        >
          <span style={{ fontSize: 12 }}>🏢</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{agents.length} desks occupied</span>
        </div>
      </div>
    </div>
  );
}
