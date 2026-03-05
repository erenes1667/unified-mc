'use client';

import { useState, useEffect } from 'react';

interface CronJob {
  id: string;
  name: string;
  model: string;
  type: 'research' | 'ops' | 'strategy' | 'build' | 'backup';
  days: number[];
  hours: number[];
  minute: number;
}

type StageStatus = 'passing' | 'failing' | 'running' | 'pending' | 'skipped';

interface Stage {
  name: string;
  status: StageStatus;
  duration?: string;
}

interface Pipeline {
  id: number;
  repo: string;
  branch: string;
  commit: string;
  author: string;
  timeAgo: string;
  totalDuration: string;
  stages: Stage[];
}

const STATUS_COLORS: Record<StageStatus, string> = {
  passing: '#34d399',
  failing: '#ef4444',
  running: 'var(--cyan)',
  pending: 'var(--muted)',
  skipped: 'rgba(107,114,128,0.4)',
};

const STATUS_ICONS: Record<StageStatus, string> = {
  passing: '\u2713',
  failing: '\u2717',
  running: '\u25CB',
  pending: '\u2014',
  skipped: '\u2014',
};

const TYPE_COLORS: Record<string, string> = {
  research: '#a78bfa',
  ops: '#00ffd1',
  strategy: '#c9a84c',
  build: '#60a5fa',
  backup: '#6b7280',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Sample pipelines (would be replaced with real data from GitHub Actions/Railway)
const pipelines: Pipeline[] = [
  {
    id: 1, repo: 'unified-mc', branch: 'main', commit: 'a3f7c2d', author: 'Cleon', timeAgo: '3m ago', totalDuration: '2m 34s',
    stages: [
      { name: 'Build', status: 'passing', duration: '0m 42s' },
      { name: 'Test', status: 'passing', duration: '1m 18s' },
      { name: 'Deploy', status: 'passing', duration: '0m 34s' },
    ],
  },
  {
    id: 2, repo: 'unified-mc', branch: 'feature/email-v2', commit: 'e91b4f8', author: 'Varys', timeAgo: '1m ago', totalDuration: '1m 12s',
    stages: [
      { name: 'Build', status: 'passing', duration: '0m 38s' },
      { name: 'Test', status: 'running', duration: '0m 34s' },
      { name: 'Deploy', status: 'pending' },
    ],
  },
  {
    id: 3, repo: 'agent-core', branch: 'main', commit: 'c44d1a7', author: 'Demerzel', timeAgo: '12m ago', totalDuration: '1m 12s',
    stages: [
      { name: 'Build', status: 'passing', duration: '0m 28s' },
      { name: 'Test', status: 'passing', duration: '0m 31s' },
      { name: 'Deploy', status: 'passing', duration: '0m 13s' },
    ],
  },
  {
    id: 4, repo: 'agent-core', branch: 'fix/memory-leak', commit: '7f2e9b1', author: 'Forge', timeAgo: '8m ago', totalDuration: '0m 55s',
    stages: [
      { name: 'Build', status: 'passing', duration: '0m 26s' },
      { name: 'Test', status: 'failing', duration: '0m 29s' },
      { name: 'Deploy', status: 'skipped' },
    ],
  },
];

function getPipelineStatus(stages: Stage[]): StageStatus {
  if (stages.some((s) => s.status === 'failing')) return 'failing';
  if (stages.some((s) => s.status === 'running')) return 'running';
  if (stages.every((s) => s.status === 'passing' || s.status === 'skipped')) return 'passing';
  return 'pending';
}

function getNextRun(job: CronJob): string {
  const now = new Date();
  const currentDay = (now.getDay() + 6) % 7; // Convert to Mon=0
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const checkDay = (currentDay + dayOffset) % 7;
    if (!job.days.includes(checkDay)) continue;

    for (const hour of job.hours) {
      const jobMinutes = hour * 60 + job.minute;
      if (dayOffset === 0 && jobMinutes <= currentMinutes) continue;

      if (dayOffset === 0) {
        const diff = jobMinutes - currentMinutes;
        if (diff < 60) return `in ${diff}m`;
        return `in ${Math.floor(diff / 60)}h ${diff % 60}m`;
      }
      return `${DAY_LABELS[checkDay]} ${String(hour).padStart(2, '0')}:${String(job.minute).padStart(2, '0')}`;
    }
  }
  return 'Next week';
}

export default function PipelinePage() {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [tab, setTab] = useState<'pipelines' | 'cron' | 'workflow'>('pipelines');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch('/api/cron')
      .then((r) => r.json())
      .then((d) => setCronJobs(d.jobs || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(interval);
  }, []);

  const passingCount = pipelines.filter((p) => getPipelineStatus(p.stages) === 'passing').length;
  const failingCount = pipelines.filter((p) => getPipelineStatus(p.stages) === 'failing').length;
  const runningCount = pipelines.filter((p) => getPipelineStatus(p.stages) === 'running').length;

  return (
    <div>
      <style>{`
        @keyframes runningPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes progressSlide { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes spinDot { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>Pipeline & Automation</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            CI/CD pipelines, cron schedules, and agent workflows
          </p>
        </div>
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['pipelines', 'cron', 'workflow'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                background: tab === t ? 'rgba(201,168,76,0.15)' : 'transparent',
                border: `1px solid ${tab === t ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
                color: tab === t ? 'var(--gold)' : 'var(--muted)',
                textTransform: 'capitalize',
              }}
            >
              {t === 'pipelines' ? '🔧 Pipelines' : t === 'cron' ? '📅 Cron Jobs' : '🔄 Workflow'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'pipelines' && (
        <>
          {/* Stats Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Passing', count: passingCount, color: '#34d399' },
              { label: 'Failing', count: failingCount, color: '#ef4444' },
              { label: 'Running', count: runningCount, color: 'var(--cyan)' },
            ].map((stat) => (
              <div key={stat.label} className="glass" style={{ borderRadius: 10, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: stat.color, boxShadow: `0 0 8px ${stat.color}` }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{stat.count}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{stat.label}</span>
              </div>
            ))}
            <div className="glass" style={{ borderRadius: 10, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{pipelines.length} pipelines total</span>
            </div>
          </div>

          {/* Pipeline Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pipelines.map((pipeline) => {
              const overallStatus = getPipelineStatus(pipeline.stages);
              return (
                <div key={pipeline.id} className="glass glass-hover" style={{
                  borderRadius: 12, padding: 20, borderLeft: `3px solid ${STATUS_COLORS[overallStatus]}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{pipeline.repo}</span>
                      <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 6 }}>/</span>
                      <span style={{ fontSize: 13, color: pipeline.branch === 'main' ? 'var(--cyan)' : 'var(--gold)', marginLeft: 6 }}>
                        {pipeline.branch}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>
                        {pipeline.commit}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{pipeline.author}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{pipeline.timeAgo}</span>
                      <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>{pipeline.totalDuration}</span>
                    </div>
                  </div>
                  {/* Stages */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {pipeline.stages.map((stage, idx) => {
                      const color = STATUS_COLORS[stage.status];
                      const isRunning = stage.status === 'running';
                      const isLast = idx === pipeline.stages.length - 1;
                      return (
                        <div key={stage.name} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <div style={{
                            flex: 1, borderRadius: 8, padding: '10px 14px', position: 'relative', overflow: 'hidden',
                            background: isRunning ? 'rgba(0,255,209,0.06)' : stage.status === 'passing' ? 'rgba(52,211,153,0.06)' : stage.status === 'failing' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isRunning ? 'rgba(0,255,209,0.2)' : stage.status === 'passing' ? 'rgba(52,211,153,0.15)' : stage.status === 'failing' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}`,
                          }}>
                            {isRunning && (
                              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,209,0.08) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'progressSlide 2s linear infinite' }} />
                            )}
                            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                  width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`,
                                  animation: isRunning ? 'runningPulse 1.5s ease-in-out infinite' : undefined,
                                }}>
                                  {isRunning ? (
                                    <div style={{ width: 10, height: 10, border: `2px solid ${color}`, borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spinDot 1s linear infinite' }} />
                                  ) : STATUS_ICONS[stage.status]}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 500, color: stage.status === 'skipped' || stage.status === 'pending' ? 'var(--muted)' : 'var(--text)' }}>
                                  {stage.name}
                                </span>
                              </div>
                              {stage.duration && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{stage.duration}</span>}
                            </div>
                          </div>
                          {!isLast && (
                            <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 10, color: stage.status === 'passing' ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.15)' }}>▸</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'cron' && (
        <>
          {/* Cron stats */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {Object.entries(
              cronJobs.reduce((acc, j) => { acc[j.type] = (acc[j.type] || 0) + 1; return acc; }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <div key={type} className="glass" style={{ borderRadius: 10, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[type] || 'var(--muted)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{count}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{type}</span>
              </div>
            ))}
          </div>

          {/* Cron Job Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cronJobs.map((job) => (
              <div key={job.id} className="glass glass-hover" style={{
                borderRadius: 12, padding: '16px 20px',
                borderLeft: `3px solid ${TYPE_COLORS[job.type] || 'var(--muted)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{job.name}</span>
                    <span style={{
                      marginLeft: 10, fontSize: 10, padding: '2px 8px', borderRadius: 4,
                      background: `${TYPE_COLORS[job.type]}15`, color: TYPE_COLORS[job.type],
                      border: `1px solid ${TYPE_COLORS[job.type]}30`, textTransform: 'uppercase',
                    }}>
                      {job.type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Model: {job.model}</span>
                    <span style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 500 }}>
                      Next: {getNextRun(job)}
                    </span>
                  </div>
                </div>
                {/* Schedule visualization */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', width: 50 }}>Schedule:</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {DAY_LABELS.map((label, i) => {
                      const active = job.days.includes(i);
                      return (
                        <span key={label} style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 4,
                          background: active ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                          color: active ? 'var(--gold)' : 'rgba(255,255,255,0.15)',
                          border: `1px solid ${active ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
                        }}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
                    at {job.hours.map((h) => `${String(h).padStart(2, '0')}:${String(job.minute).padStart(2, '0')}`).join(', ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'workflow' && (
        <div>
          {/* Agent Workflow Visualization */}
          <div className="glass" style={{ borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 20, letterSpacing: 1, textTransform: 'uppercase' }}>
              Agent Processing Pipeline
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {[
                { name: 'Input', desc: 'Telegram / Slack / Web', color: '#60a5fa', icon: '📨' },
                { name: 'Gateway', desc: 'Route & Auth', color: '#00ffd1', icon: '⚡' },
                { name: 'Agent Select', desc: 'Model + Role', color: '#c9a84c', icon: '🤖' },
                { name: 'Process', desc: 'LLM + Tools', color: '#a78bfa', icon: '🧠' },
                { name: 'Respond', desc: 'Channel Reply', color: '#34d399', icon: '💬' },
              ].map((stage, i, arr) => (
                <div key={stage.name} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    flex: 1, padding: 16, borderRadius: 10, textAlign: 'center',
                    background: `${stage.color}08`, border: `1px solid ${stage.color}25`,
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{stage.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: stage.color, marginBottom: 4 }}>{stage.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{stage.desc}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>→</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Data flow */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
                Data Sources
              </h2>
              {[
                { name: 'Workspace Memory', path: '~/.openclaw/workspace/memory/', status: 'active' },
                { name: 'Agent Configs', path: '~/.openclaw/workspace/agents/', status: 'active' },
                { name: 'Auth Profiles', path: '~/.openclaw/auth-profiles.json', status: 'active' },
                { name: 'Gateway Logs', path: '~/.openclaw/logs/gateway.log', status: 'active' },
                { name: 'Cron Scheduler', path: '~/.openclaw/cron/', status: 'active' },
              ].map((src) => (
                <div key={src.name} className="glass" style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: src.status === 'active' ? '#00ffd1' : '#ef4444', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>{src.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{src.path}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
                Channels
              </h2>
              {[
                { name: 'Telegram (Cleon)', status: 'connected', icon: '📱' },
                { name: 'Telegram (Demerzel)', status: 'connected', icon: '📱' },
                { name: 'Telegram (Varys)', status: 'connected', icon: '📱' },
                { name: 'Slack', status: 'connected', icon: '💬' },
                { name: 'WebChat', status: 'connected', icon: '🌐' },
                { name: 'Browser Control', status: 'listening', icon: '🖥️' },
              ].map((ch) => (
                <div key={ch.name} className="glass" style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14 }}>{ch.icon}</span>
                  <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>{ch.name}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(0,255,209,0.08)', color: '#00ffd1',
                    border: '1px solid rgba(0,255,209,0.2)',
                  }}>
                    {ch.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
