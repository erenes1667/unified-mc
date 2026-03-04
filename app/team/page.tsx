'use client';

import { useEffect, useState } from 'react';

interface Agent {
  id: string;
  role: string;
  model: string;
  description: string;
  pronouns?: string;
}

const MODEL_COLORS: Record<string, string> = {
  'opus-4.6': '#c9a84c',
  'sonnet-4.6': '#7c9aff',
  'gemini-flash': '#34d399',
  'kimi-k2.5': '#f472b6',
  codex: '#a78bfa',
};

const ROLE_ICONS: Record<string, string> = {
  Emperor: '👑',
  Ops: '⚙️',
  Dev: '🔨',
  Email: '📧',
  Research: '🔍',
  Design: '🎨',
  'Email Lead': '📬',
  'Dev Intel': '🧠',
  Coding: '💻',
};

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((d) => setAgents(d.agents))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Loading team...</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
          Agent Team
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          {agents.length} agents deployed
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="glass"
            style={{
              borderRadius: 12,
              padding: 20,
              cursor: 'default',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Status dot */}
            <div
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 8px rgba(52,211,153,0.5)',
              }}
            />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(201,168,76,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {ROLE_ICONS[agent.role] || '🤖'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--text)',
                    textTransform: 'capitalize',
                  }}
                >
                  {agent.id}
                  {agent.pronouns && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--muted)',
                        fontWeight: 400,
                        marginLeft: 6,
                      }}
                    >
                      ({agent.pronouns})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gold)' }}>{agent.role}</div>
              </div>
            </div>

            {/* Description */}
            {agent.description && (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  lineHeight: 1.5,
                  marginBottom: 12,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {agent.description}
              </p>
            )}

            {/* Model badge */}
            <div
              style={{
                display: 'inline-block',
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                padding: '3px 8px',
                borderRadius: 6,
                background: `${MODEL_COLORS[agent.model] || '#6b7280'}15`,
                color: MODEL_COLORS[agent.model] || '#6b7280',
                border: `1px solid ${MODEL_COLORS[agent.model] || '#6b7280'}30`,
              }}
            >
              {agent.model}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
