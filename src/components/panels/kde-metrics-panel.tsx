'use client'

import { useState, useEffect, useCallback } from 'react'

interface KDEEntry {
  id: string
  title: string
  category: 'competitive-intel' | 'best-practices' | 'integration-patterns' | 'strategy-frameworks'
  content: string
  source: string
  confidence: number
  tags: string[]
  createdAt: string
  agent?: string
}

const CATEGORIES = [
  { key: 'competitive-intel', label: 'Competitive Intel', icon: '🔍', color: '#ef4444' },
  { key: 'best-practices', label: 'Best Practices', icon: '⭐', color: '#22c55e' },
  { key: 'integration-patterns', label: 'Integration Patterns', icon: '🔗', color: '#3b82f6' },
  { key: 'strategy-frameworks', label: 'Strategy Frameworks', icon: '🎯', color: '#c9a84c' },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  const h = Math.floor(diff / 3600000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  return 'just now'
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-1.5" title={`Confidence: ${pct}%`}>
      <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs opacity-50 w-8 text-right">{pct}%</span>
    </div>
  )
}

const EMPTY_FORM = {
  title: '', category: 'best-practices' as KDEEntry['category'], content: '', source: 'manual', confidence: 0.8, tags: '',
}

export function KDEMetricsPanel() {
  const [entries, setEntries] = useState<KDEEntry[]>([])
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'timeline' | 'add'>('timeline')
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/kde')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEntries(data.entries || [])
      setCategoryStats(data.categoryStats || {})
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/kde', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setForm(EMPTY_FORM)
      setView('timeline')
      await load()
    } catch (e: any) {
      setError(e.message)
    }
    setSubmitting(false)
  }

  const filtered = entries.filter(e => {
    if (filterCat !== 'all' && e.category !== filterCat) return false
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.content.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#c9a84c' }}>⚡ KDE Metrics</h2>
          <p className="text-xs opacity-50">Knowledge base · {entries.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView(view === 'add' ? 'timeline' : 'add')} className="px-3 py-1 rounded text-xs"
            style={{ background: view === 'add' ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid', borderColor: view === 'add' ? '#c9a84c' : 'rgba(255,255,255,0.1)', color: view === 'add' ? '#c9a84c' : 'inherit' }}>
            {view === 'add' ? '← Timeline' : '+ Add Entry'}
          </button>
          <button onClick={load} disabled={loading} className="px-3 py-1 rounded text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', opacity: loading ? 0.5 : 1 }}>
            {loading ? '⟳' : '↻'}
          </button>
        </div>
      </div>

      {/* Category stats */}
      <div className="grid grid-cols-4 gap-2 shrink-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setFilterCat(filterCat === cat.key ? 'all' : cat.key)}
            className="rounded-lg p-2 text-left transition-all"
            style={{
              background: filterCat === cat.key ? `${cat.color}20` : 'rgba(255,255,255,0.03)',
              border: '1px solid',
              borderColor: filterCat === cat.key ? `${cat.color}60` : 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="text-sm">{cat.icon}</div>
            <div className="text-lg font-bold font-mono" style={{ color: cat.color }}>{categoryStats[cat.key] || 0}</div>
            <div className="text-xs opacity-40 leading-tight mt-0.5">{cat.label.split(' ')[0]}</div>
          </button>
        ))}
      </div>

      {error && (
        <div className="px-3 py-2 rounded text-xs shrink-0" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {view === 'add' && (
        <div className="flex-1 overflow-y-auto rounded-lg p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-sm font-medium" style={{ color: '#c9a84c' }}>Add Knowledge Entry</div>
          
          {[
            { key: 'title', label: 'Title', type: 'text', placeholder: 'What did you learn?' },
            { key: 'source', label: 'Source', type: 'text', placeholder: 'URL, client, conversation...' },
            { key: 'tags', label: 'Tags (comma-separated)', type: 'text', placeholder: 'klaviyo, email, automation' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="text-xs opacity-50 block mb-1">{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded text-xs outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit' }}
              />
            </div>
          ))}

          <div>
            <label className="text-xs opacity-50 block mb-1">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value as KDEEntry['category'] }))}
              className="w-full px-3 py-2 rounded text-xs outline-none"
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit' }}
            >
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs opacity-50 block mb-1">Content / Observation</label>
            <textarea
              value={form.content}
              onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Describe what you observed, learned, or want to track..."
              rows={4}
              className="w-full px-3 py-2 rounded text-xs outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit' }}
            />
          </div>

          <div>
            <label className="text-xs opacity-50 block mb-1">Confidence: {Math.round(form.confidence * 100)}%</label>
            <input
              type="range" min="0" max="1" step="0.05"
              value={form.confidence}
              onChange={e => setForm(prev => ({ ...prev, confidence: parseFloat(e.target.value) }))}
              className="w-full"
            />
          </div>

          <button
            onClick={submit}
            disabled={submitting || !form.title.trim() || !form.content.trim()}
            className="w-full py-2 rounded text-sm font-medium transition-all"
            style={{ background: '#c9a84c', color: '#0a0a0f', opacity: submitting || !form.title.trim() ? 0.5 : 1 }}
          >
            {submitting ? 'Saving...' : 'Save to Knowledge Base'}
          </button>
        </div>
      )}

      {view === 'timeline' && (
        <>
          <div className="shrink-0">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search knowledge base..."
              className="w-full px-3 py-1.5 rounded text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit' }}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filtered.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-40 opacity-30">
                <div className="text-3xl mb-2">⚡</div>
                <div className="text-sm">{entries.length === 0 ? 'Knowledge base is empty' : 'No items match filters'}</div>
                <div className="text-xs mt-1">{entries.length === 0 && 'Use + Add Entry to log your first insight'}</div>
              </div>
            )}

            {filtered.map(entry => {
              const cat = CATEGORIES.find(c => c.key === entry.category) || CATEGORIES[0]
              return (
                <div
                  key={entry.id}
                  className="rounded-lg p-3 cursor-pointer transition-all"
                  style={{
                    background: expanded === entry.id ? `${cat.color}10` : 'rgba(255,255,255,0.03)',
                    border: '1px solid',
                    borderColor: expanded === entry.id ? `${cat.color}40` : 'rgba(255,255,255,0.08)',
                  }}
                  onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm shrink-0 mt-0.5">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{entry.title}</span>
                        <span className="text-xs shrink-0 opacity-40">{timeAgo(entry.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${cat.color}15`, color: cat.color }}>
                          {cat.label}
                        </span>
                        {entry.source && entry.source !== 'manual' && (
                          <span className="text-xs opacity-40 truncate">{entry.source}</span>
                        )}
                        {entry.agent && <span className="text-xs opacity-30">{entry.agent}</span>}
                      </div>
                      <div className="mt-2">
                        <ConfidenceBar value={entry.confidence} />
                      </div>
                    </div>
                  </div>

                  {expanded === entry.id && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="text-xs leading-relaxed opacity-80">{entry.content}</div>
                      {entry.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {entry.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(0,255,209,0.1)', color: '#00ffd1' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
