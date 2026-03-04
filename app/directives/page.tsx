'use client';

import { useState } from 'react';

interface Directive {
  id: number;
  priority: 'P0' | 'P1' | 'P2';
  title: string;
  description: string;
  active: boolean;
  scope: string;
  created: string;
  details: string;
}

const initialDirectives: Directive[] = [
  {
    id: 1,
    priority: 'P0',
    title: 'Never expose API keys in logs',
    description: 'All logging must sanitize sensitive credentials, tokens, and API keys before output.',
    active: true,
    scope: 'All Agents',
    created: '2026-01-15',
    details: 'Applies to stdout, stderr, file logs, and any external logging service. Keys must be masked with the pattern sk-...XXXX. Violations trigger an immediate alert to the security channel.',
  },
  {
    id: 2,
    priority: 'P0',
    title: 'Rate limit all external API calls',
    description: 'Enforce per-minute and per-hour rate limits on every outbound API integration.',
    active: true,
    scope: 'All Agents',
    created: '2026-01-15',
    details: 'Default limits: 60 req/min, 1000 req/hr per service. Configurable via admin panel. Exceeding limits queues requests with exponential backoff. Critical services (auth, billing) have higher thresholds.',
  },
  {
    id: 3,
    priority: 'P1',
    title: 'Use Claude Opus for complex reasoning',
    description: 'Route multi-step reasoning, code generation, and architectural tasks to Claude Opus.',
    active: true,
    scope: 'Dev Team',
    created: '2026-01-22',
    details: 'Simple queries (status checks, lookups, formatting) should use Sonnet or Flash to conserve budget. Complexity is determined by the task classifier. Override available via #force-opus flag.',
  },
  {
    id: 4,
    priority: 'P1',
    title: 'CC security team on all deployment notifications',
    description: 'Every production deployment must notify the security channel with a diff summary.',
    active: true,
    scope: 'Security',
    created: '2026-02-01',
    details: 'Notifications include: commit range, changed files count, dependency updates, and any modified environment variables. Security team has 30-minute review window for critical services.',
  },
  {
    id: 5,
    priority: 'P1',
    title: 'Summarize all research findings before sharing',
    description: 'Raw research data must be distilled into structured summaries before distribution.',
    active: true,
    scope: 'All Agents',
    created: '2026-02-05',
    details: 'Summary format: Executive brief (2-3 sentences), Key findings (bullet points), Data sources, Confidence level, Recommended actions. Raw data attached as appendix only.',
  },
  {
    id: 6,
    priority: 'P2',
    title: 'Prefer TypeScript over JavaScript',
    description: 'All new files should be written in TypeScript with strict mode enabled.',
    active: true,
    scope: 'Dev Team',
    created: '2026-02-10',
    details: 'tsconfig strict: true, noImplicitAny: true. Existing JS files should be migrated opportunistically during refactors. Type definitions required for all public APIs and shared interfaces.',
  },
  {
    id: 7,
    priority: 'P2',
    title: 'Log all email bounces for weekly review',
    description: 'Bounced emails are collected and surfaced in the weekly ops digest.',
    active: false,
    scope: 'Email Ops',
    created: '2026-02-12',
    details: 'Bounce types tracked: hard bounce, soft bounce, complaint, unsubscribe. Weekly report includes bounce rate trends, top failing domains, and recommended list cleanup actions. Currently paused pending new email provider migration.',
  },
  {
    id: 8,
    priority: 'P2',
    title: 'Run security scan before merge',
    description: 'Automated security scanning runs on every PR targeting main branch.',
    active: true,
    scope: 'Security',
    created: '2026-02-15',
    details: 'Scans include: dependency vulnerability check (npm audit), static analysis (semgrep), secret detection (truffleHog), and license compliance. PRs with critical findings are blocked from merge.',
  },
  {
    id: 9,
    priority: 'P1',
    title: 'Archive completed tasks after 7 days',
    description: 'Tasks marked done are auto-archived after 7 days to keep boards clean.',
    active: false,
    scope: 'All Agents',
    created: '2026-02-18',
    details: 'Archived tasks remain searchable and can be restored. Archive runs daily at 02:00 UTC. Tasks with the #keep tag are exempt. Currently paused to evaluate retention policy changes.',
  },
  {
    id: 10,
    priority: 'P2',
    title: 'Use dark theme for all generated UIs',
    description: 'Any auto-generated interface must follow the dark glassmorphism design system.',
    active: true,
    scope: 'Dev Team',
    created: '2026-02-20',
    details: 'Base palette: --bg #0a0a0f, --glass rgba(255,255,255,0.05). Font: JetBrains Mono. Accent: gold #c9a84c. All components must pass WCAG AA contrast ratios against dark backgrounds.',
  },
];

const priorityStyles: Record<string, { background: string; border: string; color: string }> = {
  P0: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' },
  P1: { background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--gold)' },
  P2: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted)' },
};

const scopeColors: Record<string, string> = {
  'All Agents': 'var(--cyan)',
  'Dev Team': '#818cf8',
  'Email Ops': '#f472b6',
  'Security': '#ef4444',
};

export default function DirectivesPage() {
  const [directives, setDirectives] = useState<Directive[]>(initialDirectives);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const toggleActive = (id: number) => {
    setDirectives((prev) =>
      prev.map((d) => (d.id === id ? { ...d, active: !d.active } : d))
    );
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div style={{ fontFamily: 'inherit', color: 'var(--text)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Directives</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0 0' }}>Standing orders and operational rules</p>
        </div>
        <button
          style={{
            fontSize: 12,
            fontFamily: 'inherit',
            padding: '8px 16px',
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid var(--gold)',
            color: 'var(--gold)',
            cursor: 'pointer',
          }}
        >
          + Add Directive
        </button>
      </div>

      {/* Directive List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {directives.map((d) => {
          const isExpanded = expandedId === d.id;
          const isHovered = hoveredId === d.id;
          const pStyle = priorityStyles[d.priority];
          const scopeColor = scopeColors[d.scope] || 'var(--muted)';

          return (
            <div
              key={d.id}
              className="glass glass-hover"
              style={{ borderRadius: 12, padding: 20, cursor: 'pointer', position: 'relative' }}
              onClick={() => toggleExpand(d.id)}
              onMouseEnter={() => setHoveredId(d.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Priority badge */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: pStyle.background,
                    border: pStyle.border,
                    color: pStyle.color,
                    flexShrink: 0,
                  }}
                >
                  {d.priority}
                </span>

                {/* Title + description */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{d.title}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--muted)',
                      marginTop: 3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: isExpanded ? 'normal' : 'nowrap',
                    }}
                  >
                    {d.description}
                  </div>
                </div>

                {/* Scope badge */}
                <span
                  style={{
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: `${scopeColor}11`,
                    border: `1px solid ${scopeColor}33`,
                    color: scopeColor,
                    flexShrink: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  {d.scope}
                </span>

                {/* Status toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActive(d.id);
                  }}
                  style={{
                    fontSize: 10,
                    fontFamily: 'inherit',
                    padding: '3px 10px',
                    borderRadius: 6,
                    background: d.active ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                    border: d.active ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.08)',
                    color: d.active ? '#22c55e' : 'var(--muted)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {d.active ? 'Active' : 'Paused'}
                </button>

                {/* Edit indicator */}
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    opacity: isHovered ? 0.7 : 0,
                    transition: 'opacity 150ms ease',
                    flexShrink: 0,
                  }}
                >
                  &#9998;
                </span>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid var(--glass-border)',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.7, marginBottom: 14 }}>
                    {d.details}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)' }}>
                    <span>Created: {d.created}</span>
                    <span>Scope: {d.scope}</span>
                    <span>Priority: {d.priority}</span>
                    <span>Status: {d.active ? 'Active' : 'Paused'}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer summary */}
      <div style={{ marginTop: 20, fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 16 }}>
        <span>{directives.length} directives</span>
        <span>{directives.filter((d) => d.active).length} active</span>
        <span>{directives.filter((d) => !d.active).length} paused</span>
        <span>{directives.filter((d) => d.priority === 'P0').length} critical</span>
      </div>
    </div>
  );
}
