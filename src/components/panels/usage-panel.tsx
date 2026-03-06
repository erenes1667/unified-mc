'use client'

import { useState, useEffect, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const AGENT_COLORS: Record<string, string> = {
  cleon: '#c9a84c',
  mickey17: '#00ffd1',
  forge: '#f97316',
  raven: '#a855f7',
  whisper: '#3b82f6',
  kimi: '#ec4899',
  sentinel: '#22c55e',
  varys: '#ef4444',
  demerzel: '#06b6d4',
}

const MODEL_COLORS = [
  '#c9a84c', '#00ffd1', '#f97316', '#a855f7', '#3b82f6', '#ec4899', '#22c55e', '#ef4444',
]

interface AgentStat {
  agent: string
  model: string
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  cost: number
  sessionCount: number
  lastActive: string | null
}

interface UsageData {
  agents: AgentStat[]
  totals: { inputTokens: number; outputTokens: number; cachedTokens: number; cost: number }
  modelDistribution: { model: string; tokens: number }[]
  date: string
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

function formatCost(n: number) {
  return `$${n.toFixed(4)}`
}

export function UsagePanel() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'table' | 'chart'>('table')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/usage')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const pieData = data?.modelDistribution.filter(d => d.tokens > 0).map(d => ({
    name: d.model.replace('anthropic/', '').replace('google/', '').replace('moonshot/', ''),
    value: d.tokens,
  })) || []

  return (
    <div className="h-full flex flex-col gap-4 overflow-auto p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#c9a84c' }}>📊 Usage Panel</h2>
          <p className="text-xs opacity-50">Per-agent model usage · {data?.date || 'today'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('table')}
            className="px-3 py-1 rounded text-xs"
            style={{
              background: view === 'table' ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)',
              border: '1px solid',
              borderColor: view === 'table' ? '#c9a84c' : 'rgba(255,255,255,0.1)',
              color: view === 'table' ? '#c9a84c' : 'inherit',
            }}
          >
            Table
          </button>
          <button
            onClick={() => setView('chart')}
            className="px-3 py-1 rounded text-xs"
            style={{
              background: view === 'chart' ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)',
              border: '1px solid',
              borderColor: view === 'chart' ? '#c9a84c' : 'rgba(255,255,255,0.1)',
              color: view === 'chart' ? '#c9a84c' : 'inherit',
            }}
          >
            Chart
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1 rounded text-xs"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? '⟳' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
          Error: {error}
        </div>
      )}

      {/* Totals row */}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Input', value: formatTokens(data.totals.inputTokens), color: '#3b82f6' },
            { label: 'Output', value: formatTokens(data.totals.outputTokens), color: '#00ffd1' },
            { label: 'Cached', value: formatTokens(data.totals.cachedTokens), color: '#a855f7' },
            { label: 'Cost', value: formatCost(data.totals.cost), color: '#c9a84c' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-xs opacity-50">{label}</div>
              <div className="text-lg font-bold font-mono" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {view === 'table' && data && (
        <div className="flex-1 overflow-auto rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th className="text-left px-3 py-2 opacity-50">Agent</th>
                <th className="text-left px-3 py-2 opacity-50">Model</th>
                <th className="text-right px-3 py-2 opacity-50">Input</th>
                <th className="text-right px-3 py-2 opacity-50">Output</th>
                <th className="text-right px-3 py-2 opacity-50">Cached</th>
                <th className="text-right px-3 py-2 opacity-50">Cost</th>
                <th className="text-right px-3 py-2 opacity-50">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {data.agents.filter(a => a.sessionCount > 0 || a.inputTokens > 0).map((agent) => (
                <tr
                  key={agent.agent}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-3 py-2 font-medium" style={{ color: AGENT_COLORS[agent.agent] || '#ffffff' }}>
                    {agent.agent}
                  </td>
                  <td className="px-3 py-2 opacity-70 font-mono text-xs">
                    {(agent.model || 'unknown').replace('anthropic/', '').replace('google/', '')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: '#3b82f6' }}>
                    {formatTokens(agent.inputTokens)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: '#00ffd1' }}>
                    {formatTokens(agent.outputTokens)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: '#a855f7' }}>
                    {formatTokens(agent.cachedTokens)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: '#c9a84c' }}>
                    {formatCost(agent.cost)}
                  </td>
                  <td className="px-3 py-2 text-right opacity-50">{agent.sessionCount}</td>
                </tr>
              ))}
              {data.agents.filter(a => a.sessionCount === 0 && a.inputTokens === 0).length > 0 && (
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <td colSpan={7} className="px-3 py-2 text-center opacity-30 text-xs italic">
                    {data.agents.filter(a => a.sessionCount === 0).map(a => a.agent).join(', ')} — no activity today
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'chart' && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', height: 280 }}>
            <div className="text-xs opacity-50 mb-2">Model Distribution (by tokens)</div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={entry.name} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                    formatter={(val: number) => [formatTokens(val), 'tokens']}
                  />
                  <Legend
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full opacity-30 text-sm">No model usage data</div>
            )}
          </div>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="flex-1 flex items-center justify-center opacity-30 text-sm">Loading usage data...</div>
      )}
    </div>
  )
}
