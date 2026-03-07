'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'

interface DailyBreakdown {
  date: string
  tokens: number
  cost: number
  requests: number
}

interface ModelStats {
  totalTokens: number
  totalCost: number
  requestCount: number
  avgTokensPerRequest: number
  avgCostPerRequest: number
}

interface UsageStats {
  summary: ModelStats
  models: Record<string, ModelStats>
  sessions: Record<string, ModelStats>
  agents?: Record<string, ModelStats>
  timeframe: string
  recordCount: number
}

interface BudgetAlert {
  id: string
  threshold: number
  period: 'daily' | 'weekly' | 'monthly'
  enabled: boolean
  triggered: boolean
  currentSpend: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export function CostAnalyticsPanel() {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week')
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [dailyData, setDailyData] = useState<DailyBreakdown[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('mc-budget-alerts')
      return saved ? JSON.parse(saved) : [
        { id: '1', threshold: 50, period: 'daily', enabled: true, triggered: false, currentSpend: 0 },
        { id: '2', threshold: 200, period: 'weekly', enabled: true, triggered: false, currentSpend: 0 },
        { id: '3', threshold: 500, period: 'monthly', enabled: false, triggered: false, currentSpend: 0 },
      ]
    } catch { return [] }
  })
  const [showBudgetConfig, setShowBudgetConfig] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [statsRes, trendsRes] = await Promise.all([
        fetch(`/api/tokens?action=stats&timeframe=${timeframe}`),
        fetch(`/api/tokens?action=trends&timeframe=${timeframe}`),
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
        // Update budget alerts with current spend
        updateBudgetAlerts(data.summary.totalCost)
      }

      if (trendsRes.ok) {
        const data = await trendsRes.json()
        if (data.trends) {
          // Group by day for daily breakdown
          const daily: Record<string, DailyBreakdown> = {}
          for (const trend of data.trends) {
            const date = trend.timestamp.slice(0, 10)
            if (!daily[date]) daily[date] = { date, tokens: 0, cost: 0, requests: 0 }
            daily[date].tokens += trend.tokens
            daily[date].cost += trend.cost
            daily[date].requests += trend.requests
          }
          setDailyData(Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)))
        }
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }, [timeframe])

  useEffect(() => { loadData() }, [loadData])

  const updateBudgetAlerts = (currentCost: number) => {
    setBudgetAlerts(prev => {
      const updated = prev.map(alert => ({
        ...alert,
        currentSpend: currentCost,
        triggered: alert.enabled && currentCost >= alert.threshold,
      }))
      try { localStorage.setItem('mc-budget-alerts', JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  const updateAlert = (id: string, updates: Partial<BudgetAlert>) => {
    setBudgetAlerts(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...updates } : a)
      try { localStorage.setItem('mc-budget-alerts', JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  const exportCSV = async () => {
    setIsExporting(true)
    try {
      const res = await fetch(`/api/tokens?action=export&timeframe=${timeframe}&format=csv`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cost-analytics-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      // silent
    } finally {
      setIsExporting(false)
    }
  }

  const formatCost = (cost: number) => '$' + cost.toFixed(2)
  const formatCostPrecise = (cost: number) => '$' + cost.toFixed(4)
  const formatNumber = (n: number) => {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
    return n.toString()
  }

  const modelChartData = stats ? Object.entries(stats.models)
    .map(([model, s]) => ({
      name: model.split('/').pop() || model,
      cost: Number(s.totalCost.toFixed(4)),
      tokens: s.totalTokens,
      requests: s.requestCount,
    }))
    .sort((a, b) => b.cost - a.cost) : []

  const costPerTaskData = stats?.agents ? Object.entries(stats.agents)
    .map(([agent, s]) => ({
      name: agent,
      costPerRequest: Number((s.totalCost / Math.max(1, s.requestCount)).toFixed(4)),
      totalCost: Number(s.totalCost.toFixed(4)),
      requests: s.requestCount,
    }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10) : []

  const triggeredAlerts = budgetAlerts.filter(a => a.triggered)

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-12 shimmer rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 shimmer rounded-lg" />)}
        </div>
        <div className="h-64 shimmer rounded-lg" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cost Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Track spending across models, agents, and time periods</p>
          </div>
          <div className="flex items-center gap-2">
            {(['day', 'week', 'month'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {tf === 'day' ? 'Daily' : tf === 'week' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Budget Alert Banners */}
      {triggeredAlerts.length > 0 && (
        <div className="space-y-2">
          {triggeredAlerts.map(alert => (
            <div key={alert.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/5">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-red-400 shrink-0">
                <path d="M8 1l7 13H1L8 1zM8 6v3M8 11.5v.5" strokeLinecap="round" />
              </svg>
              <div className="flex-1">
                <span className="text-sm font-medium text-red-400">Budget Alert: </span>
                <span className="text-sm text-foreground">
                  {alert.period} spend ({formatCost(alert.currentSpend)}) exceeds threshold ({formatCost(alert.threshold)})
                </span>
              </div>
              <button
                onClick={() => updateAlert(alert.id, { enabled: false })}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label={`Total Cost (${timeframe})`} value={formatCost(stats.summary.totalCost)} color="blue" />
          <SummaryCard label="Total Tokens" value={formatNumber(stats.summary.totalTokens)} color="purple" />
          <SummaryCard label="API Requests" value={formatNumber(stats.summary.requestCount)} color="green" />
          <SummaryCard
            label="Cost per Request"
            value={formatCostPrecise(stats.summary.avgCostPerRequest)}
            color="amber"
          />
        </div>
      )}

      {/* Charts Row 1: Daily/Weekly/Monthly Trend + Cost by Model */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Cost Trend Area Chart */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Cost Trend</h3>
          <div className="h-56">
            {dailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No trend data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" tickFormatter={(v) => '$' + (v || 0).toFixed(2)} />
                  <Tooltip formatter={(v) => v != null ? ['$' + Number(v).toFixed(4), 'Cost'] : ['-', 'Cost']} />
                  <Area type="monotone" dataKey="cost" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Token Usage Trend */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Token Usage Trend</h3>
          <div className="h-56">
            {dailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No trend data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip formatter={(v, name) => [formatNumber(v as number), name]} />
                  <Legend />
                  <Line type="monotone" dataKey="tokens" stroke="#8b5cf6" strokeWidth={2} name="Tokens" dot={false} />
                  <Line type="monotone" dataKey="requests" stroke="#10b981" strokeWidth={2} name="Requests" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Model Breakdown + Cost Distribution */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Per-Model Cost Bar Chart */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Cost by Model</h3>
          <div className="h-56">
            {modelChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No model data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" tickFormatter={(v) => '$' + (v || 0).toFixed(2)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={120} />
                  <Tooltip formatter={(v) => v != null ? ['$' + Number(v).toFixed(4), 'Cost'] : ['-', 'Cost']} />
                  <Bar dataKey="cost" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {modelChartData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Model Distribution Pie */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Cost Distribution</h3>
          <div className="h-56">
            {modelChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modelChartData.slice(0, 8)}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={80}
                    paddingAngle={3}
                    dataKey="cost"
                    nameKey="name"
                  >
                    {modelChartData.slice(0, 8).map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCostPrecise(v as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Cost Per Task/Agent */}
      {costPerTaskData && costPerTaskData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Cost per Agent</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Agent</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Total Cost</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Requests</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Cost/Request</th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {costPerTaskData.map(agent => {
                  const maxCost = costPerTaskData[0]?.totalCost || 1
                  const barPct = (agent.totalCost / maxCost) * 100
                  return (
                    <tr key={agent.name} className="hover:bg-secondary/30 transition-smooth">
                      <td className="py-2 px-3 font-medium text-foreground">{agent.name}</td>
                      <td className="py-2 px-3 text-right font-mono-tight">{formatCostPrecise(agent.totalCost)}</td>
                      <td className="py-2 px-3 text-right font-mono-tight text-muted-foreground">{agent.requests}</td>
                      <td className="py-2 px-3 text-right font-mono-tight text-muted-foreground">{formatCostPrecise(agent.costPerRequest)}</td>
                      <td className="py-2 px-3">
                        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${barPct}%` }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Budget Alerts Config + Export */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Budget Alerts */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Budget Alerts</h3>
            <button
              onClick={() => setShowBudgetConfig(!showBudgetConfig)}
              className="text-xs text-primary hover:underline"
            >
              {showBudgetConfig ? 'Hide' : 'Configure'}
            </button>
          </div>
          <div className="space-y-3">
            {budgetAlerts.map(alert => (
              <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                alert.triggered ? 'border-red-500/30 bg-red-500/5' :
                alert.enabled ? 'border-border bg-secondary/30' :
                'border-border/50 bg-secondary/10 opacity-50'
              }`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  alert.triggered ? 'bg-red-500' : alert.enabled ? 'bg-green-500' : 'bg-muted-foreground/30'
                }`} />
                <div className="flex-1">
                  <div className="text-xs font-medium text-foreground capitalize">{alert.period} Limit</div>
                  <div className="text-2xs text-muted-foreground">{formatCost(alert.threshold)}</div>
                </div>
                {showBudgetConfig && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={alert.threshold}
                      onChange={e => updateAlert(alert.id, { threshold: Number(e.target.value) })}
                      className="w-20 h-7 px-2 text-xs rounded bg-secondary border border-border text-foreground"
                      min={0}
                      step={10}
                    />
                    <button
                      onClick={() => updateAlert(alert.id, { enabled: !alert.enabled })}
                      className={`h-7 px-2 rounded text-2xs ${
                        alert.enabled ? 'bg-green-500/20 text-green-400' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {alert.enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                )}
                {!showBudgetConfig && alert.triggered && (
                  <span className="text-2xs text-red-400 font-medium">EXCEEDED</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Export */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Export Data</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Download cost and usage data for the selected timeframe as CSV for spreadsheet analysis.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md text-sm hover:bg-blue-500/30 disabled:opacity-50 transition-smooth"
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={async () => {
                setIsExporting(true)
                try {
                  const res = await fetch(`/api/tokens?action=export&timeframe=${timeframe}&format=json`)
                  if (!res.ok) throw new Error()
                  const blob = await res.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `cost-analytics-${timeframe}-${new Date().toISOString().split('T')[0]}.json`
                  document.body.appendChild(a)
                  a.click()
                  window.URL.revokeObjectURL(url)
                  document.body.removeChild(a)
                } catch {} finally { setIsExporting(false) }
              }}
              disabled={isExporting}
              className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md text-sm hover:bg-green-500/30 disabled:opacity-50 transition-smooth"
            >
              Export JSON
            </button>
          </div>
          {stats && (
            <div className="mt-4 p-3 rounded-lg bg-secondary/30 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{stats.recordCount}</span> records in selected timeframe
              &middot; {Object.keys(stats.models).length} models &middot; {Object.keys(stats.sessions).length} sessions
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: 'blue' | 'purple' | 'green' | 'amber' }) {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <div className="text-2xl font-bold font-mono-tight">{value}</div>
      <div className="text-xs font-medium opacity-80 mt-1">{label}</div>
    </div>
  )
}
