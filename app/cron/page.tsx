'use client';

import { useState, useEffect } from 'react';

interface CronJob {
  id: string;
  name: string;
  model: string;
  type: string;
  days: number[];
  hours: number[];
  minute: number;
  // runtime status (may not be present if gateway offline)
  lastRun?: string;
  status?: 'ok' | 'error' | 'pending';
  lastError?: string;
  duration?: number;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TYPE_COLORS: Record<string, string> = {
  research: '#818cf8',
  ops: 'var(--cyan)',
  strategy: 'var(--gold)',
  build: '#34d399',
  backup: '#9ca3af',
};

function formatSchedule(job: CronJob): string {
  const hoursStr = job.hours.map(h => `${h.toString().padStart(2, '0')}:${job.minute.toString().padStart(2, '0')}`).join(', ');
  const allDays = job.days.length === 7;
  const weekdays = job.days.length === 5 && !job.days.includes(5) && !job.days.includes(6);
  const daysStr = allDays ? 'Daily' : weekdays ? 'Weekdays' : job.days.map(d => DAY_LABELS[d]).join(', ');
  return `${daysStr} @ ${hoursStr}`;
}

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  const load = () => {
    setLoading(true);
    fetch('/api/cron')
      .then(r => r.json())
      .then(d => setJobs(d.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const runJob = async (id: string) => {
    setRunning(id);
    try {
      const res = await fetch(`/api/cron/${id}/run`, { method: 'POST' });
      const data = await res.json();
      showToast(data.message || `Job ${id} triggered`);
    } catch {
      showToast(`Failed to trigger ${id}`);
    } finally {
      setRunning(null);
    }
  };

  const types = ['all', ...Array.from(new Set(jobs.map(j => j.type)))];
  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.type === filter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>⏰ Cron Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Scheduled agent jobs and their status</p>
        </div>
        <button
          onClick={load}
          className="glass glass-hover"
          style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)' }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 999,
          background: 'rgba(0,255,209,0.15)', border: '1px solid rgba(0,255,209,0.3)',
          borderRadius: 10, padding: '10px 18px', color: 'var(--cyan)', fontSize: 12,
        }}>
          {toast}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="glass" style={{ padding: '16px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold)' }}>{jobs.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Jobs</div>
        </div>
        {['research', 'ops', 'build'].map(type => (
          <div key={type} className="glass" style={{ padding: '16px 20px', borderRadius: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: TYPE_COLORS[type] || 'var(--text)' }}>
              {jobs.filter(j => j.type === type).length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>{type}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className="glass glass-hover"
            style={{
              padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11,
              color: filter === t ? 'var(--gold)' : 'var(--muted)',
              border: filter === t ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
              background: filter === t ? 'rgba(201,168,76,0.1)' : undefined,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass" style={{ borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          Loading cron jobs...
        </div>
      ) : (
        <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 1fr 0.8fr 1fr 0.8fr 1fr',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            fontSize: 10, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase',
          }}>
            <span>Name</span>
            <span>Schedule</span>
            <span>Model</span>
            <span>Type</span>
            <span>Last Run</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {filtered.map((job, i) => (
            <div
              key={job.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 0.8fr 1fr 0.8fr 1fr',
                padding: '12px 16px',
                alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{job.name}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{formatSchedule(job)}</span>
              <span style={{ fontSize: 11, color: 'var(--cyan)' }}>{job.model}</span>
              <span
                style={{
                  fontSize: 10, color: TYPE_COLORS[job.type] || 'var(--muted)',
                  padding: '2px 7px', borderRadius: 20, width: 'fit-content',
                  border: `1px solid ${TYPE_COLORS[job.type] || 'rgba(255,255,255,0.1)'}20`,
                  background: `${TYPE_COLORS[job.type] || 'rgba(255,255,255,0.1)'}15`,
                  textTransform: 'capitalize',
                }}
              >
                {job.type}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {job.lastRun ? new Date(job.lastRun).toLocaleString() : '—'}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: job.status === 'ok' ? '#34d399' : job.status === 'error' ? '#f87171' : 'var(--muted)',
              }}>
                {job.status === 'ok' ? '✓ ok' : job.status === 'error' ? '✗ error' : '—'}
              </span>
              <button
                onClick={() => runJob(job.id)}
                disabled={running === job.id}
                className="glass glass-hover"
                style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  color: 'var(--cyan)', border: '1px solid rgba(0,255,209,0.2)',
                  opacity: running === job.id ? 0.5 : 1,
                }}
              >
                {running === job.id ? '⏳' : '▶ Run'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
