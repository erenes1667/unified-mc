'use client'

import { useState, useEffect, useCallback } from 'react'

interface FileChange {
  filename: string
  additions: number
  deletions: number
  status: string
}

interface PRItem {
  id: number
  number: number
  title: string
  body: string
  author: string
  repo: string
  branch: string
  base: string
  state: string
  isDraft: boolean
  createdAt: string
  updatedAt: string
  url: string
  diffSummary?: string
  files?: FileChange[]
  labels: string[]
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  const h = Math.floor(diff / 3600000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  return 'just now'
}

export function ApprovalsPanel() {
  const [prs, setPRs] = useState<PRItem[]>([])
  const [repos, setRepos] = useState<string[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [diffData, setDiffData] = useState<Record<string, FileChange[]>>({})
  const [loadingDiff, setLoadingDiff] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<Record<string, string>>({})
  const [commentText, setCommentText] = useState<Record<string, string>>({})

  const load = useCallback(async (repo?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = repo && repo !== 'all' ? `/api/approvals?repo=${encodeURIComponent(repo)}` : '/api/approvals'
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPRs(data.prs || [])
      if (data.repos) setRepos(data.repos)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const loadDiff = async (pr: PRItem) => {
    const key = `${pr.repo}-${pr.number}`
    if (diffData[key] || loadingDiff === key) return
    setLoadingDiff(key)
    try {
      const res = await fetch(`/api/approvals?repo=${encodeURIComponent(pr.repo)}&pr=${pr.number}&action=diff`)
      const data = await res.json()
      setDiffData(prev => ({ ...prev, [key]: data.files || [] }))
    } catch { }
    setLoadingDiff(null)
  }

  const toggleExpand = (pr: PRItem) => {
    if (expanded === pr.number) {
      setExpanded(null)
    } else {
      setExpanded(pr.number)
      loadDiff(pr)
    }
  }

  const doAction = async (pr: PRItem, action: 'approve' | 'request-changes' | 'comment') => {
    const key = `${pr.repo}-${pr.number}-${action}`
    setActionLoading(key)
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: pr.repo,
          prNumber: pr.number,
          action,
          body: commentText[`${pr.repo}-${pr.number}`] || undefined,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setActionResult(prev => ({ ...prev, [`${pr.repo}-${pr.number}`]: `✅ ${action} submitted` }))
        if (action === 'approve') {
          setPRs(prev => prev.filter(p => !(p.repo === pr.repo && p.number === pr.number)))
        }
      } else {
        setActionResult(prev => ({ ...prev, [`${pr.repo}-${pr.number}`]: `❌ ${data.error || 'Failed'}` }))
      }
    } catch (e: any) {
      setActionResult(prev => ({ ...prev, [`${pr.repo}-${pr.number}`]: `❌ ${e.message}` }))
    }
    setActionLoading(null)
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#c9a84c' }}>✅ Approvals</h2>
          <p className="text-xs opacity-50">PR review queue · {prs.length} open</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedRepo}
            onChange={e => { setSelectedRepo(e.target.value); load(e.target.value) }}
            className="px-2 py-1.5 rounded text-xs outline-none"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', maxWidth: 160 }}
          >
            <option value="all">All Repos</option>
            {repos.map(r => <option key={r} value={r}>{r.split('/')[1] || r}</option>)}
          </select>
          <button onClick={() => load(selectedRepo)} disabled={loading} className="px-3 py-1 rounded text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', opacity: loading ? 0.5 : 1 }}>
            {loading ? '⟳' : '↻'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded text-xs shrink-0" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
          {error} — Make sure <code>gh</code> CLI is authenticated
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {prs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-40 opacity-30">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-sm">{error ? 'gh CLI error — check authentication' : 'No open PRs found'}</div>
          </div>
        )}

        {prs.map(pr => {
          const key = `${pr.repo}-${pr.number}`
          const files = diffData[key]
          const isExpanded = expanded === pr.number
          const result = actionResult[key]

          return (
            <div
              key={key}
              className="rounded-lg overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* PR Header */}
              <div
                className="p-3 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleExpand(pr)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono opacity-40">#{pr.number}</span>
                      {pr.isDraft && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(107,114,128,0.2)', color: '#9ca3af' }}>
                          Draft
                        </span>
                      )}
                      {pr.labels.map(l => (
                        <span key={l} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>
                          {l}
                        </span>
                      ))}
                    </div>
                    <div className="text-sm font-medium mt-0.5">{pr.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs opacity-40">
                      <span>{pr.repo}</span>
                      <span>·</span>
                      <span>{pr.branch} → {pr.base}</span>
                      <span>·</span>
                      <span>by {pr.author}</span>
                      <span>·</span>
                      <span>{timeAgo(pr.updatedAt)}</span>
                    </div>
                  </div>
                  <span className="text-xs opacity-30">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded diff + actions */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* Body */}
                  {pr.body && (
                    <div className="text-xs opacity-60 leading-relaxed pt-2 line-clamp-3">{pr.body}</div>
                  )}

                  {/* Files changed */}
                  <div className="rounded p-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="text-xs opacity-40 mb-1.5">Files Changed</div>
                    {loadingDiff === key && <div className="text-xs opacity-30">Loading diff...</div>}
                    {files && files.length === 0 && <div className="text-xs opacity-30">No file data available</div>}
                    {files && files.map(f => (
                      <div key={f.filename} className="flex items-center gap-2 py-0.5">
                        <span className="text-xs font-mono truncate flex-1 opacity-70">{f.filename}</span>
                        <span className="text-xs font-mono shrink-0" style={{ color: '#22c55e' }}>+{f.additions}</span>
                        <span className="text-xs font-mono shrink-0" style={{ color: '#ef4444' }}>-{f.deletions}</span>
                      </div>
                    ))}
                  </div>

                  {/* Comment input */}
                  <textarea
                    value={commentText[key] || ''}
                    onChange={e => setCommentText(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder="Add comment (optional for approve, required for request-changes)..."
                    rows={2}
                    className="w-full px-3 py-2 rounded text-xs outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit' }}
                  />

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => doAction(pr, 'approve')}
                      disabled={!!actionLoading}
                      className="flex-1 py-1.5 rounded text-xs font-medium transition-all"
                      style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => doAction(pr, 'request-changes')}
                      disabled={!!actionLoading || !commentText[key]}
                      className="flex-1 py-1.5 rounded text-xs font-medium transition-all"
                      style={{
                        background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#ef4444',
                        opacity: !commentText[key] ? 0.5 : 1,
                      }}
                    >
                      ✗ Request Changes
                    </button>
                    <button
                      onClick={() => doAction(pr, 'comment')}
                      disabled={!!actionLoading}
                      className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      💬
                    </button>
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      onClick={e => e.stopPropagation()}
                    >
                      ↗
                    </a>
                  </div>

                  {result && (
                    <div className="text-xs px-2 py-1.5 rounded" style={{ background: result.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                      {result}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
