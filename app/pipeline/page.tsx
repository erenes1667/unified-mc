'use client';

import { useState, useEffect } from 'react';

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

const pipelines: Pipeline[] = [
  {
    id: 1,
    repo: 'unified-mc',
    branch: 'main',
    commit: 'a3f7c2d',
    author: 'Cleon',
    timeAgo: '3m ago',
    totalDuration: '2m 34s',
    stages: [
      { name: 'Build', status: 'passing', duration: '0m 42s' },
      { name: 'Test', status: 'passing', duration: '1m 18s' },
      { name: 'Deploy', status: 'passing', duration: '0m 34s' },
    ],
  },
  {
    id: 2,
    repo: 'unified-mc',
    branch: 'feature/email-v2',
    commit: 'e91b4f8',
    author: 'Varys',
    timeAgo: '1m ago',
    totalDuration: '1m 12s',
    stages: [
      { name: 'Build', status: 'passing', duration: '0m 38s' },
      { name: 'Test', status: 'running', duration: '0m 34s' },
      { name: 'Deploy', status: 'pending' },
    ],
  },
  {
    id: 3,
    repo: 'agent-core',
    branch: 'main',
    commit: 'c44d1a7',
    author: 'Demerzel',
    timeAgo: '12m ago',
    totalDuration: '1m 12s',
    stages: [
      { name: 'Build', status: 'passing', duration: '0m 28s' },
      { name: 'Test', status: 'passing', duration: '0m 31s' },
      { name: 'Deploy', status: 'passing', duration: '0m 13s' },
    ],
  },
  {
    id: 4,
    repo: 'agent-core',
    branch: 'fix/memory-leak',
    commit: '7f2e9b1',
    author: 'Forge',
    timeAgo: '8m ago',
    totalDuration: '0m 55s',
    stages: [
      { name: 'Build', status: 'passing', duration: '0m 26s' },
      { name: 'Test', status: 'failing', duration: '0m 29s' },
      { name: 'Deploy', status: 'skipped' },
    ],
  },
  {
    id: 5,
    repo: 'kde-engine',
    branch: 'main',
    commit: '5ba0e3c',
    author: 'Kimi',
    timeAgo: '22m ago',
    totalDuration: '3m 01s',
    stages: [
      { name: 'Build', status: 'passing', duration: '0m 52s' },
      { name: 'Test', status: 'passing', duration: '1m 44s' },
      { name: 'Deploy', status: 'passing', duration: '0m 25s' },
    ],
  },
  {
    id: 6,
    repo: 'kde-engine',
    branch: 'refactor/cache',
    commit: 'd9a1f6e',
    author: 'Demerzel',
    timeAgo: '2m ago',
    totalDuration: '4m 10s',
    stages: [
      { name: 'Lint', status: 'passing', duration: '0m 15s' },
      { name: 'Build', status: 'passing', duration: '0m 48s' },
      { name: 'Test', status: 'passing', duration: '1m 32s' },
      { name: 'Security Scan', status: 'passing', duration: '0m 41s' },
      { name: 'Deploy', status: 'running', duration: '0m 54s' },
    ],
  },
  {
    id: 7,
    repo: 'email-service',
    branch: 'main',
    commit: '1c8b3d4',
    author: 'Varys',
    timeAgo: '45m ago',
    totalDuration: '0m 48s',
    stages: [
      { name: 'Build', status: 'passing', duration: '0m 19s' },
      { name: 'Test', status: 'passing', duration: '0m 16s' },
      { name: 'Deploy', status: 'passing', duration: '0m 13s' },
    ],
  },
  {
    id: 8,
    repo: 'email-service',
    branch: 'hotfix/bounce-handler',
    commit: 'f3e7a90',
    author: 'Mickey17',
    timeAgo: '5m ago',
    totalDuration: '0m 31s',
    stages: [
      { name: 'Build', status: 'failing', duration: '0m 31s' },
      { name: 'Test', status: 'skipped' },
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

export default function PipelinePage() {
  const [tick, setTick] = useState(0);

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
        @keyframes runningPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes progressSlide {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spinDot {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
          Pipeline Status
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          CI/CD pipeline monitoring across all repositories
        </p>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Passing', count: passingCount, color: '#34d399' },
          { label: 'Failing', count: failingCount, color: '#ef4444' },
          { label: 'Running', count: runningCount, color: 'var(--cyan)' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass"
            style={{
              borderRadius: 10,
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: stat.color,
                boxShadow: `0 0 8px ${stat.color}`,
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              {stat.count}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{stat.label}</span>
          </div>
        ))}
        <div
          className="glass"
          style={{
            borderRadius: 10,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginLeft: 'auto',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {pipelines.length} pipelines total
          </span>
        </div>
      </div>

      {/* Pipeline Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pipelines.map((pipeline) => {
          const overallStatus = getPipelineStatus(pipeline.stages);
          const borderLeftColor = STATUS_COLORS[overallStatus];

          return (
            <div
              key={pipeline.id}
              className="glass glass-hover"
              style={{
                borderRadius: 12,
                padding: 20,
                cursor: 'default',
                borderLeft: `3px solid ${borderLeftColor}`,
              }}
            >
              {/* Pipeline header row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {pipeline.repo}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 6 }}>
                      /
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color:
                          pipeline.branch === 'main'
                            ? 'var(--cyan)'
                            : 'var(--gold)',
                        marginLeft: 6,
                      }}
                    >
                      {pipeline.branch}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Commit hash */}
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: 'inherit',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--muted)',
                    }}
                  >
                    {pipeline.commit}
                  </span>
                  {/* Author */}
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {pipeline.author}
                  </span>
                  {/* Time */}
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {pipeline.timeAgo}
                  </span>
                  {/* Duration */}
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text)',
                      fontWeight: 500,
                    }}
                  >
                    {pipeline.totalDuration}
                  </span>
                </div>
              </div>

              {/* Stages progress bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0,
                }}
              >
                {pipeline.stages.map((stage, idx) => {
                  const color = STATUS_COLORS[stage.status];
                  const isRunning = stage.status === 'running';
                  const isPassing = stage.status === 'passing';
                  const isFailing = stage.status === 'failing';
                  const isLast = idx === pipeline.stages.length - 1;

                  return (
                    <div
                      key={stage.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flex: 1,
                      }}
                    >
                      {/* Stage block */}
                      <div
                        style={{
                          flex: 1,
                          borderRadius: 8,
                          padding: '10px 14px',
                          position: 'relative',
                          overflow: 'hidden',
                          background:
                            isRunning
                              ? 'rgba(0,255,209,0.06)'
                              : isPassing
                              ? 'rgba(52,211,153,0.06)'
                              : isFailing
                              ? 'rgba(239,68,68,0.06)'
                              : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${
                            isRunning
                              ? 'rgba(0,255,209,0.2)'
                              : isPassing
                              ? 'rgba(52,211,153,0.15)'
                              : isFailing
                              ? 'rgba(239,68,68,0.2)'
                              : 'rgba(255,255,255,0.05)'
                          }`,
                        }}
                      >
                        {/* Running animated gradient overlay */}
                        {isRunning && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background:
                                'linear-gradient(90deg, transparent 0%, rgba(0,255,209,0.08) 50%, transparent 100%)',
                              backgroundSize: '200% 100%',
                              animation: 'progressSlide 2s linear infinite',
                            }}
                          />
                        )}

                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* Status icon */}
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                fontWeight: 700,
                                color: color,
                                background: `${color}18`,
                                border: `1px solid ${color}30`,
                                animation: isRunning ? 'runningPulse 1.5s ease-in-out infinite' : undefined,
                              }}
                            >
                              {isRunning ? (
                                <div
                                  style={{
                                    width: 10,
                                    height: 10,
                                    border: `2px solid ${color}`,
                                    borderTop: '2px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spinDot 1s linear infinite',
                                  }}
                                />
                              ) : (
                                STATUS_ICONS[stage.status]
                              )}
                            </div>

                            {/* Stage name */}
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color:
                                  stage.status === 'skipped' || stage.status === 'pending'
                                    ? 'var(--muted)'
                                    : 'var(--text)',
                              }}
                            >
                              {stage.name}
                            </span>
                          </div>

                          {/* Duration */}
                          {stage.duration && (
                            <span
                              style={{
                                fontSize: 10,
                                color: 'var(--muted)',
                              }}
                            >
                              {stage.duration}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Connector arrow between stages */}
                      {!isLast && (
                        <div
                          style={{
                            width: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color:
                                stage.status === 'passing'
                                  ? 'rgba(52,211,153,0.5)'
                                  : 'rgba(255,255,255,0.15)',
                            }}
                          >
                            {'\u25B8'}
                          </span>
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
    </div>
  );
}
