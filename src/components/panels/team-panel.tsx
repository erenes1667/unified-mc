'use client'

import React, { useState, useEffect, useCallback } from 'react'

const DYNASTY_ROSTER = [
  { id: 'cleon', name: 'Cleon', emoji: '👑', role: 'Emperor/Strategy', model: 'claude-opus-4-5', memory: 'agents/cleon/MEMORY.md' },
  { id: 'mickey17', name: 'Mickey17', emoji: '🐭', role: 'Daily Ops', model: 'claude-sonnet-4-5', memory: 'agents/mickey17/MEMORY.md' },
  { id: 'forge', name: 'Forge', emoji: '🔨', role: 'Developer', model: 'claude-sonnet-4-5', memory: 'agents/forge/MEMORY.md' },
  { id: 'raven', name: 'Raven', emoji: '🐦‍⬛', role: 'Email Ops', model: 'kimi-k2.5', memory: 'agents/raven/MEMORY.md' },
  { id: 'whisper', name: 'Whisper', emoji: '🔍', role: 'Research', model: 'gemini-flash', memory: 'agents/whisper/MEMORY.md' },
  { id: 'kimi', name: 'Kimi', emoji: '🌸', role: 'Design', model: 'qwen3.5', memory: 'agents/kimi/MEMORY.md' },
  { id: 'sentinel', name: 'Sentinel', emoji: '🛡️', role: 'Ops', model: 'gemini-flash', memory: 'agents/sentinel/MEMORY.md' },
  { id: 'varys', name: 'Varys', emoji: '🕷️', role: 'Email Domain', model: 'claude-sonnet-4-5', memory: 'agents/varys/MEMORY.md' },
  { id: 'demerzel', name: 'Demerzel', emoji: '⚙️', role: 'Dev Intelligence', model: 'qwen3-coder', memory: 'agents/demerzel/MEMORY.md' },
]

type AgentStatus = 'active' | 'idle' | 'offline'

interface AgentSession {
  agent: string
  active: boolean
  model?: string
  kind?: string
  age?: string
}

interface AgentWithStatus {
  id: string
  name: string
  emoji: string
  role: string
  model: string
  memory: string
  status: AgentStatus
  sessionInfo?: AgentSession
}

interface ModalData {
  agent: AgentWithStatus
  memoryContent: string | null
  loading: boolean
}

function StatusDot({ status }: { status: AgentStatus }) {
  const colors: Record<AgentStatus, string> = {
    active: '#00ffd1',
    idle: '#c9a84c',
    offline: '#555',
  }
  return (
    <div style={{
      width: '8px', height: '8px', borderRadius: '50%',
      background: colors[status],
      boxShadow: status === 'active' ? `0 0 6px ${colors[status]}` : 'none',
    }} />
  )
}

function AgentCard({ agent, onClick }: { agent: AgentWithStatus; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${agent.status === 'active' ? 'rgba(0,255,209,0.2)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,168,76,0.3)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
        ;(e.currentTarget as HTMLElement).style.borderColor = agent.status === 'active' ? 'rgba(0,255,209,0.2)' : 'rgba(255,255,255,0.08)'
      }}
    >
      {/* Top: emoji + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ fontSize: '32px' }}>{agent.emoji}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <StatusDot status={agent.status} />
          <span style={{
            fontSize: '10px',
            color: agent.status === 'active' ? '#00ffd1' : agent.status === 'idle' ? '#c9a84c' : 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {agent.status}
          </span>
        </div>
      </div>

      {/* Name + role */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{agent.name}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{agent.role}</div>
      </div>

      {/* Model badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 8px',
        background: 'rgba(201,168,76,0.1)',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: '4px',
        fontSize: '10px', color: '#c9a84c',
      }}>
        {agent.model}
      </div>

      {/* Active session info */}
      {agent.sessionInfo && agent.status === 'active' && (
        <div style={{
          marginTop: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.3)',
        }}>
          {agent.sessionInfo.kind} · {agent.sessionInfo.age}
        </div>
      )}
    </div>
  )
}

export function TeamPanel() {
  const [agents, setAgents] = useState<AgentWithStatus[]>(
    DYNASTY_ROSTER.map(a => ({ ...a, status: 'offline' as AgentStatus }))
  )
  const [modal, setModal] = useState<ModalData | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStatus = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/sessions')
      const data = await res.json()
      const sessions: AgentSession[] = data.sessions || data || []

      setAgents(prev => prev.map(agent => {
        // Match session by agent id (case-insensitive)
        const session = sessions.find(s =>
          s.agent?.toLowerCase() === agent.id.toLowerCase() ||
          s.agent?.toLowerCase().includes(agent.name.toLowerCase())
        )

        let status: AgentStatus = 'offline'
        if (session) {
          status = session.active ? 'active' : 'idle'
        }

        return { ...agent, status, sessionInfo: session || undefined }
      }))
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const openAgentModal = async (agent: AgentWithStatus) => {
    setModal({ agent, memoryContent: null, loading: true })

    try {
      const res = await fetch(`/api/fs/read?path=${encodeURIComponent(agent.memory)}`)
      const data = await res.json()
      setModal(prev => prev ? { ...prev, memoryContent: data.content || null, loading: false } : null)
    } catch {
      setModal(prev => prev ? { ...prev, memoryContent: null, loading: false } : null)
    }
  }

  const activeCount = agents.filter(a => a.status === 'active').length
  const idleCount = agents.filter(a => a.status === 'idle').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#c9a84c' }}>🏛️ Dynasty</h2>
        <div style={{ display: 'flex', gap: '12px', marginLeft: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ffd1' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{activeCount} active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c9a84c' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{idleCount} idle</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {lastUpdated && (
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchStatus}
            disabled={isRefreshing}
            style={{
              padding: '4px 10px', fontSize: '11px',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
            }}
          >
            {isRefreshing ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '12px',
        alignContent: 'start',
      }}>
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} onClick={() => openAgentModal(agent)} />
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{
              background: 'rgba(12,12,20,0.98)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px',
              padding: '24px',
              width: '560px', maxWidth: '90vw',
              maxHeight: '80vh',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '36px' }}>{modal.agent.emoji}</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#c9a84c' }}>{modal.agent.name}</h3>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{modal.agent.role} · {modal.agent.model}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <StatusDot status={modal.agent.status} />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{modal.agent.status}</span>
              </div>
              <button
                onClick={() => setModal(null)}
                style={{
                  padding: '4px 8px', background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Memory content */}
            <div style={{ fontWeight: 600, fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              MEMORY.md
            </div>
            <div style={{
              flex: 1, overflowY: 'auto',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', padding: '16px',
              fontSize: '13px', lineHeight: '1.6',
              color: 'rgba(255,255,255,0.8)',
              fontFamily: 'JetBrains Mono, monospace',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {modal.loading ? (
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>Loading memory...</span>
              ) : modal.memoryContent ? (
                modal.memoryContent
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>No MEMORY.md found for this agent.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
