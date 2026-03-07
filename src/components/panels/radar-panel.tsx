'use client'

import { useState, useEffect, useCallback } from 'react'

interface RadarItem {
  id: string
  title: string
  source: string
  sourceType: 'reddit' | 'youtube' | 'newsletter' | 'research' | 'other'
  summary: string
  date: string
  agent: string
  kdeRelevant: boolean
  tags: string[]
}

const SOURCE_TYPE_ICONS: Record<string, string> = {
  reddit: '🟠',
  youtube: '🔴',
  newsletter: '📧',
  research: '🔬',
  other: '📄',
}

const SOURCE_TYPE_COLORS: Record<string, string> = {
  reddit: '#ff4500',
  youtube: '#ff0000',
  newsletter: '#00ffd1',
  research: '#a855f7',
  other: 'rgba(255,255,255,0.5)',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  return 'just now'
}

export function RadarPanel() {
  const [items, setItems] = useState<RadarItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [tagging, setTagging] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/radar')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleKDE = async (item: RadarItem) => {
    setTagging(item.id)
    try {
      await fetch('/api/radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, kdeRelevant: !item.kdeRelevant, tags: item.tags }),
      })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, kdeRelevant: !i.kdeRelevant } : i))
    } catch { }
    setTagging(null)
  }

  const filtered = items.filter(item => {
    if (filterType !== 'all' && item.sourceType !== filterType) return false
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !item.summary.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const typeCounts = items.reduce((acc, i) => {
    acc[i.sourceType] = (acc[i.sourceType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#c9a84c' }}>📡 Radar Panel</h2>
          <p className="text-xs opacity-50">Research feed · {items.length} items</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1 rounded text-xs"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', opacity: loading ? 0.5 : 1 }}
        >
          {loading ? '⟳' : '↻ Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="flex-1 min-w-0 px-3 py-1.5 rounded text-xs outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit' }}
        />
        {['all', 'reddit', 'youtube', 'newsletter', 'research', 'other'].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className="px-2 py-1 rounded text-xs whitespace-nowrap"
            style={{
              background: filterType === type ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)',
              border: '1px solid',
              borderColor: filterType === type ? '#c9a84c' : 'rgba(255,255,255,0.1)',
              color: filterType === type ? '#c9a84c' : 'rgba(255,255,255,0.7)',
            }}
          >
            {type === 'all' ? `All (${items.length})` : `${SOURCE_TYPE_ICONS[type]} ${type} (${typeCounts[type] || 0})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-3 py-2 rounded text-xs shrink-0" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filtered.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-40 opacity-30">
            <div className="text-3xl mb-2">📡</div>
            <div className="text-sm">
              {items.length === 0 ? 'No digest files found in agent directories' : 'No items match filters'}
            </div>
            <div className="text-xs mt-1">
              Digests expected at: ~/.openclaw/workspace/agents/*/digests/
            </div>
          </div>
        )}

        {filtered.map(item => (
          <div
            key={item.id}
            className="rounded-lg p-3 transition-all"
            style={{
              background: item.kdeRelevant ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
              border: '1px solid',
              borderColor: item.kdeRelevant ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">{SOURCE_TYPE_ICONS[item.sourceType]}</span>
                <span className="text-xs font-medium truncate" style={{ color: SOURCE_TYPE_COLORS[item.sourceType] }}>
                  {item.source}
                </span>
                <span className="text-xs opacity-30">·</span>
                <span className="text-xs opacity-40">{item.agent}</span>
                <span className="text-xs opacity-30">·</span>
                <span className="text-xs opacity-40">{timeAgo(item.date)}</span>
              </div>
              <button
                onClick={() => toggleKDE(item)}
                disabled={tagging === item.id}
                title={item.kdeRelevant ? 'Remove KDE tag' : 'Tag as KDE-relevant'}
                className="shrink-0 px-2 py-0.5 rounded text-xs transition-all"
                style={{
                  background: item.kdeRelevant ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid',
                  borderColor: item.kdeRelevant ? '#c9a84c' : 'rgba(255,255,255,0.1)',
                  color: item.kdeRelevant ? '#c9a84c' : 'rgba(255,255,255,0.4)',
                }}
              >
                {tagging === item.id ? '⟳' : item.kdeRelevant ? '⚡ KDE' : '+ KDE'}
              </button>
            </div>

            <div className="text-sm font-medium mb-1 leading-snug">{item.title}</div>
            <div className="text-xs opacity-60 leading-relaxed line-clamp-2">{item.summary}</div>

            {item.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {item.tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(0,255,209,0.1)', color: '#00ffd1' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
