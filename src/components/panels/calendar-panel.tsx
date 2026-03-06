'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface CronJob {
  id?: string
  name: string
  schedule: string
  enabled: boolean
  agentId?: string
  lastRun?: number
  nextRun?: number
  lastStatus?: 'success' | 'error' | 'running'
  lastError?: string
  description?: string
}

interface TimeBlock {
  job: CronJob
  day: number   // 0-6 (Sun-Sat)
  hour: number  // 0-23
  color: string
}

const AGENT_COLORS: Record<string, string> = {
  cleon: '#c9a84c',
  mickey17: '#00ffd1',
  forge: '#4caf50',
  raven: '#9c27b0',
  whisper: '#2196f3',
  kimi: '#e91e63',
  sentinel: '#ff9800',
  varys: '#607d8b',
  demerzel: '#f44336',
  default: '#888',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

/** Parse cron expression → array of {day, hour} blocks for a week view */
function cronToBlocks(job: CronJob): { day: number; hour: number }[] {
  const blocks: { day: number; hour: number }[] = []
  const parts = job.schedule.trim().split(/\s+/)
  if (parts.length < 5) return blocks

  const [min, hourExpr, , , dowExpr] = parts

  // Parse hours
  const hours: number[] = parseField(hourExpr, 0, 23)
  // Parse days of week
  const days: number[] = parseField(dowExpr, 0, 6)

  for (const d of days) {
    for (const h of hours) {
      blocks.push({ day: d, hour: h })
    }
  }

  // If no specific day/hour hit, put in "all" as hourly
  return blocks
}

function parseField(expr: string, min: number, max: number): number[] {
  if (expr === '*') return Array.from({ length: max - min + 1 }, (_, i) => i + min)
  if (expr.startsWith('*/')) {
    const step = parseInt(expr.slice(2))
    const result: number[] = []
    for (let i = min; i <= max; i += step) result.push(i)
    return result
  }
  if (expr.includes(',')) return expr.split(',').map(Number).filter(n => n >= min && n <= max)
  if (expr.includes('-')) {
    const [start, end] = expr.split('-').map(Number)
    const result: number[] = []
    for (let i = start; i <= end; i++) result.push(i)
    return result
  }
  const n = parseInt(expr)
  if (!isNaN(n) && n >= min && n <= max) return [n]
  return []
}

function getAgentColor(agentId?: string): string {
  if (!agentId) return AGENT_COLORS.default
  const key = agentId.toLowerCase()
  return AGENT_COLORS[key] || AGENT_COLORS.default
}

export function CalendarPanel() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null)
  const [hoveredBlock, setHoveredBlock] = useState<{ job: CronJob; x: number; y: number } | null>(null)

  const loadJobs = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/cron?action=list')
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch (err) {
      console.error('Failed to load cron jobs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  const toggleJob = async (job: CronJob) => {
    try {
      await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', jobName: job.name, enabled: !job.enabled }),
      })
      setJobs(prev => prev.map(j => j.name === job.name ? { ...j, enabled: !j.enabled } : j))
      if (selectedJob?.name === job.name) {
        setSelectedJob(prev => prev ? { ...prev, enabled: !prev.enabled } : null)
      }
    } catch (err) {
      console.error('Failed to toggle job:', err)
    }
  }

  // Build grid: day → hour → jobs[]
  const grid: Map<string, CronJob[]> = new Map()
  for (const job of jobs) {
    if (!job.enabled) continue
    const blocks = cronToBlocks(job)
    for (const { day, hour } of blocks) {
      const key = `${day}-${hour}`
      if (!grid.has(key)) grid.set(key, [])
      grid.get(key)!.push(job)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#c9a84c' }}>📅 Cron Calendar</h2>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
          {jobs.filter(j => j.enabled).length} active / {jobs.length} total jobs
        </span>
        <button
          onClick={loadJobs}
          disabled={isLoading}
          style={{
            marginLeft: 'auto', padding: '4px 10px', fontSize: '11px',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
          }}
        >
          {isLoading ? '⟳ Loading...' : '⟳ Refresh'}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Calendar grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {Object.entries(AGENT_COLORS).filter(([k]) => k !== 'default').map(([agent, color]) => {
              const hasJobs = jobs.some(j => (j.agentId || '').toLowerCase() === agent)
              if (!hasJobs) return null
              return (
                <div key={agent} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color }} />
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{agent}</span>
                </div>
              )
            })}
          </div>

          {/* Grid */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', minWidth: '500px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', padding: '4px 8px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.05)' }}></th>
                  {DAYS.map(d => (
                    <th key={d} style={{
                      padding: '4px 8px', fontSize: '11px', color: 'rgba(255,255,255,0.6)',
                      textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontWeight: 600,
                    }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => (
                  <tr key={hour}>
                    <td style={{
                      padding: '2px 8px', fontSize: '10px',
                      color: 'rgba(255,255,255,0.3)', textAlign: 'right',
                      whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}>
                      {hour.toString().padStart(2, '0')}:00
                    </td>
                    {DAYS.map((_, day) => {
                      const key = `${day}-${hour}`
                      const cellJobs = grid.get(key) || []
                      return (
                        <td
                          key={day}
                          style={{
                            padding: '2px',
                            height: '28px',
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            borderLeft: '1px solid rgba(255,255,255,0.03)',
                            verticalAlign: 'middle',
                          }}
                        >
                          {cellJobs.length > 0 && (
                            <div
                              style={{
                                display: 'flex', gap: '2px', flexWrap: 'wrap',
                                justifyContent: 'center',
                              }}
                            >
                              {cellJobs.slice(0, 3).map((job, i) => (
                                <div
                                  key={i}
                                  title={job.name}
                                  onClick={() => setSelectedJob(job)}
                                  style={{
                                    width: cellJobs.length === 1 ? '100%' : '8px',
                                    height: '20px',
                                    borderRadius: '3px',
                                    background: getAgentColor(job.agentId),
                                    opacity: 0.8,
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    fontSize: '8px',
                                    padding: cellJobs.length === 1 ? '2px 4px' : '0',
                                    color: '#000',
                                    fontWeight: 700,
                                    display: 'flex', alignItems: 'center',
                                    transition: 'opacity 0.1s',
                                  }}
                                  onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.opacity = '1'
                                  }}
                                  onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.opacity = '0.8'
                                  }}
                                >
                                  {cellJobs.length === 1 ? job.name.slice(0, 20) : ''}
                                </div>
                              ))}
                              {cellJobs.length > 3 && (
                                <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)' }}>
                                  +{cellJobs.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Job list sidebar */}
        <div style={{
          width: '220px', borderLeft: '1px solid rgba(255,255,255,0.08)',
          overflowY: 'auto', padding: '12px',
          display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            All Jobs ({jobs.length})
          </div>
          {jobs.map(job => (
            <div
              key={job.name}
              onClick={() => setSelectedJob(job)}
              style={{
                padding: '8px 10px',
                background: selectedJob?.name === job.name ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedJob?.name === job.name ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '6px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                background: job.enabled ? getAgentColor(job.agentId) : 'rgba(255,255,255,0.2)',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {job.name}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                  {job.schedule}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected job detail */}
      {selectedJob && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setSelectedJob(null)}
        >
          <div
            style={{
              background: 'rgba(12,12,20,0.98)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px', padding: '24px',
              width: '480px', maxWidth: '90vw',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '12px', height: '12px', borderRadius: '3px',
                background: getAgentColor(selectedJob.agentId),
              }} />
              <h3 style={{ margin: 0, fontSize: '16px', color: '#c9a84c' }}>{selectedJob.name}</h3>
              <button onClick={() => setSelectedJob(null)} style={{
                marginLeft: 'auto', padding: '4px 8px', background: 'none',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {[
                ['Schedule', selectedJob.schedule],
                ['Agent', selectedJob.agentId || 'N/A'],
                ['Status', selectedJob.lastStatus || 'N/A'],
                ['Last Run', formatTime(selectedJob.lastRun)],
                ['Next Run', formatTime(selectedJob.nextRun)],
                ['Enabled', selectedJob.enabled ? 'Yes' : 'No'],
              ].map(([label, value]) => (
                <div key={label} style={{
                  padding: '10px', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px',
                }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>{value}</div>
                </div>
              ))}
            </div>

            {selectedJob.lastError && (
              <div style={{
                padding: '10px', background: 'rgba(244,67,54,0.1)',
                border: '1px solid rgba(244,67,54,0.2)', borderRadius: '6px',
                fontSize: '12px', color: '#f44336', marginBottom: '16px',
              }}>
                {selectedJob.lastError}
              </div>
            )}

            <button
              onClick={() => toggleJob(selectedJob)}
              style={{
                width: '100%', padding: '10px',
                background: selectedJob.enabled ? 'rgba(244,67,54,0.15)' : 'rgba(76,175,80,0.15)',
                border: `1px solid ${selectedJob.enabled ? 'rgba(244,67,54,0.3)' : 'rgba(76,175,80,0.3)'}`,
                borderRadius: '8px',
                color: selectedJob.enabled ? '#f44336' : '#4caf50',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              }}
            >
              {selectedJob.enabled ? '⏸ Disable Job' : '▶ Enable Job'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  function formatTime(ts?: number) {
    if (!ts) return 'Never'
    return new Date(ts).toLocaleString()
  }
}
