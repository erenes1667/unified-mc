'use client';

import { useEffect, useState } from 'react';

interface CronJob {
  id: string;
  name: string;
  model: string;
  type: 'research' | 'ops' | 'strategy' | 'build' | 'backup';
  days: number[];
  hours: number[];
  minute: number;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  research: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)' },
  ops:      { bg: 'rgba(34, 197, 94, 0.2)',  text: '#4ade80', border: 'rgba(34, 197, 94, 0.4)' },
  strategy: { bg: 'rgba(201, 168, 76, 0.2)', text: '#c9a84c', border: 'rgba(201, 168, 76, 0.4)' },
  build:    { bg: 'rgba(168, 85, 247, 0.2)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.4)' },
  backup:   { bg: 'rgba(107, 114, 128, 0.2)', text: '#9ca3af', border: 'rgba(107, 114, 128, 0.4)' },
};

const TYPE_LABELS: Record<string, string> = {
  research: 'Research',
  ops: 'Operations',
  strategy: 'Strategy',
  build: 'Build',
  backup: 'Backup',
};

export default function CalendarPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cron')
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  // Collect all hours that have at least one job
  const activeHours = new Set<number>();
  for (const job of jobs) {
    for (const h of job.hours) activeHours.add(h);
  }
  const sortedHours = Array.from(activeHours).sort((a, b) => a - b);

  // Build a lookup: [dayIndex][hour] => CronJob[]
  const grid: Record<string, CronJob[]> = {};
  for (const job of jobs) {
    for (const day of job.days) {
      for (const hour of job.hours) {
        const key = `${day}-${hour}`;
        if (!grid[key]) grid[key] = [];
        grid[key].push(job);
      }
    }
  }

  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12} ${period}`;
  };

  const totalJobs = jobs.length;
  const dailyJobs = jobs.filter((j) => j.days.length === 7).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            📅 Cron Calendar
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13 }}>
            {totalJobs} scheduled jobs &middot; {dailyJobs} run daily
          </p>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_COLORS).map(([type, c]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: c.text,
                }}
              />
              <span style={{ color: 'var(--muted)' }}>{TYPE_LABELS[type]}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          className="glass"
          style={{ borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}
        >
          Loading schedule...
        </div>
      ) : (
        /* Weekly Grid */
        <div
          className="glass"
          style={{ borderRadius: 12, overflow: 'hidden' }}
        >
          {/* Day headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '72px repeat(7, 1fr)',
              borderBottom: '1px solid var(--glass-border)',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                fontSize: 11,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Time
            </div>
            {DAY_LABELS.map((day, i) => {
              const isToday = new Date().getDay() === (i === 6 ? 0 : i + 1);
              return (
                <div
                  key={day}
                  style={{
                    padding: '12px 8px',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'center',
                    color: isToday ? 'var(--gold)' : 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    borderLeft: '1px solid var(--glass-border)',
                    background: isToday ? 'rgba(201, 168, 76, 0.05)' : 'transparent',
                  }}
                >
                  {day}
                  {isToday && (
                    <span
                      style={{
                        display: 'block',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: 'var(--gold)',
                        margin: '4px auto 0',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Hour rows */}
          {sortedHours.map((hour) => (
            <div
              key={hour}
              style={{
                display: 'grid',
                gridTemplateColumns: '72px repeat(7, 1fr)',
                borderBottom: '1px solid var(--glass-border)',
                minHeight: 56,
              }}
            >
              {/* Time label */}
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: 11,
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  paddingTop: 12,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatHour(hour)}
              </div>

              {/* Day cells */}
              {DAY_LABELS.map((_, dayIdx) => {
                const cellJobs = grid[`${dayIdx}-${hour}`] || [];
                const isToday = new Date().getDay() === (dayIdx === 6 ? 0 : dayIdx + 1);
                return (
                  <div
                    key={dayIdx}
                    style={{
                      padding: '6px 4px',
                      borderLeft: '1px solid var(--glass-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      background: isToday ? 'rgba(201, 168, 76, 0.02)' : 'transparent',
                    }}
                  >
                    {cellJobs.map((job) => {
                      const c = TYPE_COLORS[job.type];
                      return (
                        <div
                          key={job.id}
                          title={`${job.name} — ${job.model} (${formatHour(hour)}:${String(job.minute).padStart(2, '0')})`}
                          style={{
                            background: c.bg,
                            border: `1px solid ${c.border}`,
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: 10,
                            color: c.text,
                            fontWeight: 500,
                            lineHeight: 1.3,
                            cursor: 'default',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span style={{ opacity: 0.6, marginRight: 4 }}>
                            {job.minute > 0 ? `:${String(job.minute).padStart(2, '0')}` : ''}
                          </span>
                          {job.name}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Stats row */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {Object.entries(TYPE_COLORS).map(([type, c]) => {
            const count = jobs.filter((j) => j.type === type).length;
            const executions = jobs
              .filter((j) => j.type === type)
              .reduce((sum, j) => sum + j.days.length * j.hours.length, 0);
            return (
              <div
                key={type}
                className="glass"
                style={{
                  borderRadius: 10,
                  padding: '16px 20px',
                  borderLeft: `3px solid ${c.border}`,
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {TYPE_LABELS[type]}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.text, marginTop: 4 }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {executions} runs / week
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
