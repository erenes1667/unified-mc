'use client';

import { useState } from 'react';

type Status = 'planning' | 'building' | 'testing' | 'live' | 'paused';
type Priority = 'P0' | 'P1' | 'P2' | 'P3';

interface Milestone {
  title: string;
  done: boolean;
}

interface Project {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  status: Status;
  mrr: number | null;
  mrrPotential: number | null;
  owner: string;
  milestones: Milestone[];
  tags: string[];
  updatedAt: string;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  planning: { label: 'Planning', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  building: { label: 'Building', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  testing: { label: 'Testing', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  live: { label: 'Live', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  paused: { label: 'Paused', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

const PRIORITY_COLORS: Record<Priority, string> = {
  P0: '#ef4444', P1: '#f59e0b', P2: '#3b82f6', P3: '#6b7280',
};

const INITIAL_PROJECTS: Project[] = [
  {
    id: '1', name: 'Decision Engine', description: 'AI-powered email marketing orchestration platform. Full pipeline: client onboarding, campaign generation, send optimization, analytics.',
    priority: 'P0', status: 'building', mrr: 0, mrrPotential: 15000, owner: 'You',
    milestones: [
      { title: 'Core API & auth', done: true },
      { title: 'Client dashboard', done: true },
      { title: 'AI chat per client', done: true },
      { title: 'Campaign generator', done: false },
      { title: 'Template library', done: false },
      { title: 'Analytics & reporting', done: false },
      { title: 'Beta launch (2 clients)', done: false },
      { title: 'Production (7 clients)', done: false },
    ],
    tags: ['revenue', 'product', 'ai'], updatedAt: '2h ago',
  },
  {
    id: '2', name: 'Unified Mission Control', description: 'Internal AI command center. Dashboard for agents, tasks, metrics, email ops. Also serves as O7 employee assistant.',
    priority: 'P1', status: 'building', mrr: null, mrrPotential: null, owner: 'You',
    milestones: [
      { title: 'App scaffold & glassmorphism shell', done: true },
      { title: 'Chat panel with WebSocket', done: true },
      { title: 'All panels built', done: true },
      { title: 'Onboarding wizard', done: true },
      { title: 'Cross-platform installer', done: true },
      { title: 'Agent task routing', done: false },
      { title: 'Real data integrations', done: false },
    ],
    tags: ['internal', 'product'], updatedAt: '30m ago',
  },
  {
    id: '3', name: 'BSI Site Intelligence', description: 'Automated lead scoring & outreach pipeline. Dealfront → n8n → Clay → Salesforce → Instantly.',
    priority: 'P1', status: 'building', mrr: null, mrrPotential: 5000, owner: 'You',
    milestones: [
      { title: 'n8n workflow created', done: true },
      { title: 'Clay enrichment table', done: true },
      { title: 'Lead scoring formula', done: true },
      { title: 'Salesforce integration', done: false },
      { title: 'Instantly cold email', done: false },
      { title: 'End-to-end test', done: false },
    ],
    tags: ['client', 'pipeline'], updatedAt: '1d ago',
  },
  {
    id: '4', name: 'Mass Email Process', description: 'Scalable newsletter and mass email production. SEO volatility, Magento EOL, industry campaigns.',
    priority: 'P0', status: 'live', mrr: null, mrrPotential: null, owner: 'You',
    milestones: [
      { title: 'Template system', done: true },
      { title: 'Image generation pipeline', done: true },
      { title: 'Magento 2028 EOL email', done: true },
      { title: 'SEO volatility email', done: true },
      { title: 'Automated send workflow', done: false },
    ],
    tags: ['email', 'content'], updatedAt: '4h ago',
  },
  {
    id: '5', name: 'Client Email Ops', description: 'Ongoing email marketing for active clients. Flows, campaigns, segmentation, deliverability.',
    priority: 'P0', status: 'live', mrr: null, mrrPotential: null, owner: 'You',
    milestones: [
      { title: 'Garrett flows active', done: true },
      { title: 'GenPower campaigns', done: true },
      { title: 'Fasteners segmentation', done: true },
      { title: 'LCE recovery (21 templates)', done: false },
      { title: 'Machinery Masters onboarding', done: false },
      { title: 'Trophy Outlet welcome series', done: false },
    ],
    tags: ['client', 'email'], updatedAt: '6h ago',
  },
  {
    id: '6', name: 'O7 OS', description: 'Company-wide AI assistant platform. Module engine, marketplace, admin dashboard.',
    priority: 'P1', status: 'live', mrr: null, mrrPotential: null, owner: 'You',
    milestones: [
      { title: 'Module engine', done: true },
      { title: '17 modules deployed', done: true },
      { title: 'Admin dashboard', done: true },
      { title: 'Marketplace', done: true },
      { title: 'Team deployment', done: false },
    ],
    tags: ['internal', 'product'], updatedAt: '2d ago',
  },
];

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'mrr' | 'progress'>('priority');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') {
      const order: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
      return order[a.priority] - order[b.priority];
    }
    if (sortBy === 'mrr') {
      return (b.mrrPotential ?? 0) - (a.mrrPotential ?? 0);
    }
    // progress
    const pctA = a.milestones.length ? a.milestones.filter(m => m.done).length / a.milestones.length : 0;
    const pctB = b.milestones.length ? b.milestones.filter(m => m.done).length / b.milestones.length : 0;
    return pctB - pctA;
  });

  const totalMRR = projects.reduce((s, p) => s + (p.mrr ?? 0), 0);
  const totalPotential = projects.reduce((s, p) => s + (p.mrrPotential ?? 0), 0);
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => {
        const pct = p.milestones.length ? (p.milestones.filter(m => m.done).length / p.milestones.length) * 100 : 0;
        return s + pct;
      }, 0) / projects.length)
    : 0;

  const toggleMilestone = (projectId: string, milestoneIdx: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const ms = [...p.milestones];
      ms[milestoneIdx] = { ...ms[milestoneIdx], done: !ms[milestoneIdx].done };
      return { ...p, milestones: ms };
    }));
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>✅ Projects & Roadmap</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Track milestones, priority, and revenue potential</p>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--cyan)' }}>{projects.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Active Projects</div>
        </div>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--gold)' }}>${totalMRR.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Current MRR</div>
        </div>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#34d399' }}>${totalPotential.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>MRR Potential</div>
        </div>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{avgProgress}%</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Avg Progress</div>
        </div>
      </div>

      {/* Filters & Sort */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'planning', 'building', 'testing', 'live', 'paused'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="glass glass-hover"
              style={{
                padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                color: filter === f ? (f === 'all' ? 'var(--gold)' : STATUS_CONFIG[f as Status]?.color ?? 'var(--gold)') : 'var(--muted)',
                background: filter === f ? 'rgba(201,168,76,0.1)' : 'var(--glass)',
                borderColor: filter === f ? 'rgba(201,168,76,0.2)' : 'transparent',
                textTransform: 'capitalize',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>Sort:</span>
          {(['priority', 'mrr', 'progress'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
                background: sortBy === s ? 'rgba(201,168,76,0.15)' : 'transparent',
                border: `1px solid ${sortBy === s ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
                color: sortBy === s ? 'var(--gold)' : 'var(--muted)',
                textTransform: 'capitalize', fontFamily: 'inherit',
              }}
            >
              {s === 'mrr' ? 'MRR' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Project List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map(project => {
          const doneCount = project.milestones.filter(m => m.done).length;
          const totalCount = project.milestones.length;
          const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
          const isExpanded = expandedId === project.id;
          const sc = STATUS_CONFIG[project.status];

          return (
            <div key={project.id} className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
              {/* Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : project.id)}
                style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'flex-start' }}
                className="glass-hover"
              >
                {/* Priority badge */}
                <div style={{
                  width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${PRIORITY_COLORS[project.priority]}15`, border: `1px solid ${PRIORITY_COLORS[project.priority]}40`,
                  color: PRIORITY_COLORS[project.priority], fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {project.priority}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{project.name}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: sc.bg, color: sc.color, fontWeight: 600 }}>
                      {sc.label}
                    </span>
                    {project.tags.map(t => (
                      <span key={t} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{project.description}</div>

                  {/* Progress bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, borderRadius: 3,
                        background: pct === 100 ? '#34d399' : 'linear-gradient(90deg, var(--gold), var(--cyan))',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {doneCount}/{totalCount} ({pct}%)
                    </span>
                  </div>
                </div>

                {/* MRR */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {project.mrrPotential !== null && (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}>
                        ${(project.mrrPotential ?? 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>MRR potential</div>
                    </>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{project.updatedAt}</div>
                </div>

                {/* Expand arrow */}
                <span style={{ color: 'var(--muted)', fontSize: 12, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0, marginTop: 4 }}>▶</span>
              </div>

              {/* Expanded: Milestones */}
              {isExpanded && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', padding: '14px 0 10px', letterSpacing: 1, textTransform: 'uppercase' }}>
                    Roadmap
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {project.milestones.map((ms, i) => (
                      <div
                        key={i}
                        onClick={() => toggleMilestone(project.id, i)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                          borderRadius: 6, cursor: 'pointer', fontSize: 13,
                          background: ms.done ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${ms.done ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)'}`,
                        }}
                        className="glass-hover"
                      >
                        <span style={{
                          width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: ms.done ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${ms.done ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
                          fontSize: 11, color: ms.done ? '#34d399' : 'transparent',
                        }}>
                          ✓
                        </span>
                        <span style={{ color: ms.done ? 'var(--muted)' : 'var(--text)', textDecoration: ms.done ? 'line-through' : 'none' }}>
                          {ms.title}
                        </span>
                        <span style={{
                          marginLeft: 'auto', fontSize: 9, padding: '2px 6px', borderRadius: 4,
                          background: ms.done ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
                          color: ms.done ? '#34d399' : '#fbbf24',
                        }}>
                          {ms.done ? 'Done' : `Step ${i + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
