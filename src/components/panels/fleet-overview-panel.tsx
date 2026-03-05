'use client'

import { useState, useCallback } from 'react'
import { useMissionControl } from '@/store'
import { useSmartPoll } from '@/lib/use-smart-poll'

interface FleetData {
  agents: {
    total: number
    active: number
    idle: number
    offline: number
    error: number
    statusBreakdown: Record<string, number>
  }
  tasks: {
    total: number
    byStatus: Record<string, number>
    completedToday: number
  }
  topAgentsByCompletion: Array<{
    name: string; role: string; status: string; last_seen: number | null
    completed: number; in_progress: number; total_tasks: number
  }>
  topAgentsByTokens: Array<{
    agent_name: string; total_tokens: number; total_cost: number; request_count: number
  }>
  recentActivity: Array<{
    id: number; type: string; entity_type: string; entity_id: number
    actor: string; description: string; created_at: number
  }>
  activityCounts: { today: number; week: number }
  healthScore: number
}

export function FleetOverviewPanel() {
  const { setActiveTab, connection } = useMissionControl()
  const [data, setData] = useState<FleetData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadFleetData = useCallback(async () => {
    try {
      const res = await fetch('/api/fleet')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }, [])

  useSmartPoll(loadFleetData, 30000, { pauseWhenConnected: false })

  if (isLoading) {
    return (
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-lg shimmer" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-64 rounded-lg shimmer" />)}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Failed to load fleet data</p>
        <button onClick={loadFleetData} className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Retry</button>
      </div>
    )
  }

  const healthColor = data.healthScore >= 80 ? 'green' : data.healthScore >= 50 ? 'amber' : 'red'

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="border-b border-border pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agent Fleet Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time fleet status and performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <HealthBadge score={data.healthScore} color={healthColor} />
            <button
              onClick={loadFleetData}
              className="px-3 py-1.5 text-xs bg-secondary text-muted-foreground rounded-md hover:bg-secondary/80 transition-smooth"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatusCard
          label="Total Agents"
          value={data.agents.total}
          icon={<AgentIcon />}
          color="blue"
          onClick={() => setActiveTab('agents')}
        />
        <StatusCard
          label="Active"
          value={data.agents.active}
          sub={`${data.agents.total > 0 ? Math.round((data.agents.active / data.agents.total) * 100) : 0}%`}
          icon={<ActiveIcon />}
          color="green"
        />
        <StatusCard
          label="Idle"
          value={data.agents.idle}
          icon={<IdleIcon />}
          color="amber"
        />
        <StatusCard
          label="Offline"
          value={data.agents.offline}
          icon={<OfflineIcon />}
          color={data.agents.offline > 0 ? 'red' : 'green'}
        />
        <StatusCard
          label="Errors"
          value={data.agents.error}
          icon={<ErrorIcon />}
          color={data.agents.error > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Fleet Health + Task Overview */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Fleet Health */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="text-sm font-semibold text-foreground">Fleet Health</h3>
          </div>
          <div className="panel-body space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-secondary" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${data.healthScore * 3.14} ${314 - data.healthScore * 3.14}`}
                    className={healthColor === 'green' ? 'text-green-500' : healthColor === 'amber' ? 'text-amber-500' : 'text-red-500'}
                    stroke="currentColor"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold font-mono-tight ${
                    healthColor === 'green' ? 'text-green-400' : healthColor === 'amber' ? 'text-amber-400' : 'text-red-400'
                  }`}>{data.healthScore}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <HealthRow label="Gateway" value={connection.isConnected ? 'Connected' : 'Disconnected'} status={connection.isConnected ? 'good' : 'bad'} />
              <HealthRow label="Active Agents" value={`${data.agents.active}/${data.agents.total}`} status={data.agents.active > 0 ? 'good' : 'warn'} />
              <HealthRow label="Error Agents" value={String(data.agents.error)} status={data.agents.error > 0 ? 'bad' : 'good'} />
              <HealthRow label="Tasks Today" value={String(data.tasks.completedToday)} status="good" />
            </div>
          </div>
        </div>

        {/* Top Agents by Completion */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="text-sm font-semibold text-foreground">Top Agents by Tasks</h3>
            <span className="text-2xs text-muted-foreground">{data.topAgentsByCompletion.length} agents</span>
          </div>
          <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
            {data.topAgentsByCompletion.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">No agents with tasks yet</div>
            ) : (
              data.topAgentsByCompletion.map((agent, i) => (
                <div key={agent.name} className="px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/30 transition-smooth">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-2xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{agent.name}</div>
                    <div className="text-2xs text-muted-foreground">{agent.role}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <AgentStatusDot status={agent.status} />
                    <div className="text-right">
                      <div className="text-xs font-mono-tight text-green-400">{agent.completed} done</div>
                      <div className="text-2xs text-muted-foreground">{agent.in_progress} active</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Agents by Token Usage */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="text-sm font-semibold text-foreground">Top Agents by Tokens</h3>
            <span className="text-2xs text-muted-foreground">Last 24h</span>
          </div>
          <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
            {data.topAgentsByTokens.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">No token usage data yet</div>
            ) : (
              data.topAgentsByTokens.map((agent, i) => (
                <div key={agent.agent_name} className="px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/30 transition-smooth">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-2xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{agent.agent_name}</div>
                    <div className="text-2xs text-muted-foreground">{agent.request_count} requests</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono-tight text-foreground">{formatNumber(agent.total_tokens)}</div>
                    <div className="text-2xs text-muted-foreground">${agent.total_cost.toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Task Summary + Activity Timeline */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Task Summary */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="text-sm font-semibold text-foreground">Task Summary</h3>
            <span className="text-2xs text-muted-foreground">{data.tasks.total} total</span>
          </div>
          <div className="panel-body space-y-3">
            {data.tasks.total === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-4">No tasks yet</div>
            ) : (
              <>
                <div className="flex items-center gap-1 h-4 rounded-full overflow-hidden bg-secondary">
                  {Object.entries(data.tasks.byStatus).map(([status, count]) => {
                    const pct = (count / data.tasks.total) * 100
                    if (pct === 0) return null
                    return (
                      <div
                        key={status}
                        className={`h-full ${taskStatusColor(status)}`}
                        style={{ width: `${pct}%` }}
                        title={`${status}: ${count}`}
                      />
                    )
                  })}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(data.tasks.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${taskStatusDot(status)}`} />
                      <span className="text-2xs text-muted-foreground truncate">{status}</span>
                      <span className="text-2xs font-mono-tight text-foreground ml-auto">{count}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Completed today</span>
                  <span className="text-xs font-mono-tight text-green-400">{data.tasks.completedToday}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xs text-muted-foreground">{data.activityCounts.today} today</span>
              <button
                onClick={() => setActiveTab('activity')}
                className="text-2xs text-primary hover:underline"
              >
                View all
              </button>
            </div>
          </div>
          <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
            {data.recentActivity.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">No recent activity</div>
            ) : (
              data.recentActivity.map((activity) => (
                <div key={activity.id} className="px-4 py-2 hover:bg-secondary/30 transition-smooth">
                  <div className="flex items-start gap-2">
                    <ActivityTypeDot type={activity.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground/80 break-words">
                        {activity.description.length > 100 ? activity.description.slice(0, 100) + '...' : activity.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-2xs text-muted-foreground font-mono-tight">{activity.actor}</span>
                        <span className="text-2xs text-muted-foreground/40">&middot;</span>
                        <span className="text-2xs text-muted-foreground">{formatTimeAgo(activity.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <QuickAction label="Spawn Agent" desc="Launch new agent" tab="spawn" icon={<SpawnIcon />} setActiveTab={setActiveTab} />
        <QuickAction label="Task Board" desc="Manage tasks" tab="tasks" icon={<TaskIcon />} setActiveTab={setActiveTab} />
        <QuickAction label="Cost Analytics" desc="Track spending" tab="cost-analytics" icon={<CostIcon />} setActiveTab={setActiveTab} />
        <QuickAction label="Pipelines" desc="Orchestrate workflows" tab="pipelines" icon={<PipelineIcon />} setActiveTab={setActiveTab} />
      </div>
    </div>
  )
}

// --- Sub-components ---

function StatusCard({ label, value, sub, icon, color, onClick }: {
  label: string; value: number; sub?: string; icon: React.ReactNode
  color: 'blue' | 'green' | 'amber' | 'red'; onClick?: () => void
}) {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  return (
    <div
      className={`rounded-lg border p-3.5 ${colorMap[color]} ${onClick ? 'cursor-pointer hover:opacity-80 transition-smooth' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-80">{label}</span>
        <div className="w-5 h-5 opacity-60">{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono-tight">{value}</span>
        {sub && <span className="text-xs opacity-50 font-mono-tight">{sub}</span>}
      </div>
    </div>
  )
}

function HealthBadge({ score, color }: { score: number; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
      color === 'green' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
      color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
      'bg-red-500/10 border-red-500/20 text-red-400'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        color === 'green' ? 'bg-green-500' : color === 'amber' ? 'bg-amber-500' : 'bg-red-500'
      }`} />
      <span className="text-xs font-medium">Health: {score}/100</span>
    </div>
  )
}

function HealthRow({ label, value, status }: {
  label: string; value: string; status: 'good' | 'warn' | 'bad'
}) {
  const statusColor = status === 'good' ? 'text-green-400' : status === 'warn' ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium font-mono-tight ${statusColor}`}>{value}</span>
    </div>
  )
}

function AgentStatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    busy: 'bg-blue-500',
    idle: 'bg-amber-500',
    offline: 'bg-muted-foreground/30',
    error: 'bg-red-500',
  }
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colors[status] || 'bg-muted-foreground/30'}`} />
}

function ActivityTypeDot({ type }: { type: string }) {
  const isError = type.includes('error') || type.includes('fail')
  const isCreate = type.includes('create') || type.includes('spawn')
  const isComplete = type.includes('complete') || type.includes('done')
  return (
    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
      isError ? 'bg-red-500' :
      isCreate ? 'bg-blue-500' :
      isComplete ? 'bg-green-500' :
      'bg-muted-foreground/50'
    }`} />
  )
}

function QuickAction({ label, desc, tab, icon, setActiveTab }: {
  label: string; desc: string; tab: string; icon: React.ReactNode
  setActiveTab: (tab: string) => void
}) {
  return (
    <button
      onClick={() => setActiveTab(tab)}
      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-smooth text-left group"
    >
      <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-smooth">
        <div className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-smooth">{icon}</div>
      </div>
      <div>
        <div className="text-xs font-medium text-foreground">{label}</div>
        <div className="text-2xs text-muted-foreground">{desc}</div>
      </div>
    </button>
  )
}

// --- Utility functions ---

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function formatTimeAgo(unix: number): string {
  const seconds = Math.floor(Date.now() / 1000) - unix
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function taskStatusColor(status: string): string {
  switch (status) {
    case 'done': return 'bg-green-500'
    case 'in_progress': return 'bg-blue-500'
    case 'review': case 'quality_review': return 'bg-purple-500'
    case 'assigned': return 'bg-amber-500'
    case 'inbox': return 'bg-muted-foreground/40'
    default: return 'bg-muted-foreground/30'
  }
}

function taskStatusDot(status: string): string {
  switch (status) {
    case 'done': return 'bg-green-500'
    case 'in_progress': return 'bg-blue-500'
    case 'review': case 'quality_review': return 'bg-purple-500'
    case 'assigned': return 'bg-amber-500'
    case 'inbox': return 'bg-muted-foreground/40'
    default: return 'bg-muted-foreground/30'
  }
}

// --- SVG Icons ---

function AgentIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </svg>
  )
}
function ActiveIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" /><path d="M5 8l2 2 4-4" />
    </svg>
  )
}
function IdleIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 2" />
    </svg>
  )
}
function OfflineIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" /><path d="M6 6l4 4M10 6l-4 4" />
    </svg>
  )
}
function ErrorIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 1l7 13H1L8 1zM8 6v3M8 11.5v.5" />
    </svg>
  )
}
function SpawnIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 2v12M8 2l-3 3M8 2l3 3" />
    </svg>
  )
}
function TaskIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="1" width="12" height="14" rx="1.5" /><path d="M5 5l2 2 3-3M5 10h6" />
    </svg>
  )
}
function CostIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6.5" /><path d="M8 4v8M5.5 6h5a1.5 1.5 0 010 3H6" />
    </svg>
  )
}
function PipelineIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="3" cy="8" r="2" /><circle cx="13" cy="4" r="2" /><circle cx="13" cy="12" r="2" />
      <path d="M5 7l6-2M5 9l6 2" />
    </svg>
  )
}
