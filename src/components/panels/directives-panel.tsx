'use client'

import { useState, useEffect, useCallback } from 'react'

interface Directive {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'done'
  priority: 'high' | 'medium' | 'low'
  assignee: string
  source: string
  date: string
}

interface Stats {
  total: number
  pending: number
  inProgress: number
  done: number
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  'pending': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Pending' },
  'in-progress': { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'In Progress' },
  'done': { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: 'Done' },
}

const PRIORITY_STYLES: Record<string, { color: string; label: string }> = {
  'high': { color: '#ef4444', label: '🔴' },
  'medium': { color: '#f59e0b', label: '🟡' },
  'low': { color: '#6b7280', label: '⚪' },
}

const DYNASTY_AGENTS = ['cleon', 'mickey17', 'forge', 'raven', 'whisper', 'kimi', 'sentinel', 'varys', 'demerzel', 'unassigned']

export function DirectivesPanel() {
  const [directives, setDirectives] = useState<Directive[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/directives')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDirectives(data.directives || [])
      setStats(data.stats)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateDirective = async (id: string, updates: Partial<Directive>) => {
    setEditing(id)
    try {
      await fetch('/api/directives', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      setDirectives(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
    } catch { }
    setEditing(null)
  }

  const filtered = directives.filter(d => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    if (filterAssignee !== 'all' && d.assignee !== filterAssignee) return false
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const assignees = Array.from(new Set(directives.map(d => d.assignee))).filter(Boolean)

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#c9a84c' }}>📋 Directives</h2>
          <p className="text-xs opacity-50">Strategy tracker · {stats?.total || 0} directives</p>
        </div>
        <button onClick={load} disabled={loading} className="px-3 py-1 rounded text-xs"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', opacity: loading ? 0.5 : 1 }}>
          {loading ? '⟳' : '↻ Refresh'}
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 shrink-0">
          {[
            { label: 'Total', value: stats.total, color: '#ffffff' },
            { label: 'Pending', value: stats.pending, color: '#f59e0b' },
            { label: 'In Progress', value: stats.inProgress, color: '#3b82f6' },
            { label: 'Done', value: stats.done, color: '#22c55e' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-xs opacity-40">{label}</div>
              <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="flex-1 min-w-0 px-3 py-1.5 rounded text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit' }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-2 py-1.5 rounded text-xs outline-none"
          style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit' }}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select
          value={filterAssignee}
          onChange={e => setFilterAssignee(e.target.value)}
          className="px-2 py-1.5 rounded text-xs outline-none"
          style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit' }}
        >
          <option value="all">All Agents</option>
          {assignees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {error && (
        <div className="px-3 py-2 rounded text-xs shrink-0" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filtered.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-40 opacity-30">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm">{directives.length === 0 ? 'No directives found in workspace files' : 'No items match filters'}</div>
          </div>
        )}

        {filtered.map(d => {
          const statusStyle = STATUS_STYLES[d.status]
          const priorityStyle = PRIORITY_STYLES[d.priority]
          return (
            <div key={d.id} className="rounded-lg p-3" style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid',
              borderColor: d.status === 'in-progress' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)',
            }}>
              <div className="flex items-start gap-2 mb-1.5">
                <span title={d.priority} className="text-sm shrink-0 mt-0.5">{priorityStyle.label}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-snug">{d.title}</div>
                  {d.description && (
                    <div className="text-xs opacity-50 mt-0.5 leading-relaxed line-clamp-2">{d.description}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {/* Status selector */}
                <select
                  value={d.status}
                  onChange={e => updateDirective(d.id, { status: e.target.value as Directive['status'] })}
                  disabled={editing === d.id}
                  className="px-2 py-0.5 rounded text-xs outline-none cursor-pointer"
                  style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.color}40`, color: statusStyle.color }}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>

                {/* Assignee selector */}
                <select
                  value={d.assignee}
                  onChange={e => updateDirective(d.id, { assignee: e.target.value })}
                  disabled={editing === d.id}
                  className="px-2 py-0.5 rounded text-xs outline-none cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                >
                  {DYNASTY_AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>

                {/* Priority selector */}
                <select
                  value={d.priority}
                  onChange={e => updateDirective(d.id, { priority: e.target.value as Directive['priority'] })}
                  disabled={editing === d.id}
                  className="px-2 py-0.5 rounded text-xs outline-none cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                >
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">⚪ Low</option>
                </select>

                <span className="text-xs opacity-30 ml-auto">{d.source}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
