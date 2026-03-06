'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

const DYNASTY_AGENTS = [
  { id: 'cleon', name: 'Cleon', emoji: '👑', role: 'Emperor/Strategy' },
  { id: 'mickey17', name: 'Mickey17', emoji: '🐭', role: 'Daily Ops' },
  { id: 'forge', name: 'Forge', emoji: '🔨', role: 'Developer' },
  { id: 'raven', name: 'Raven', emoji: '🐦‍⬛', role: 'Email Ops' },
  { id: 'whisper', name: 'Whisper', emoji: '🔍', role: 'Research' },
  { id: 'kimi', name: 'Kimi', emoji: '🌸', role: 'Design' },
  { id: 'sentinel', name: 'Sentinel', emoji: '🛡️', role: 'Ops' },
  { id: 'varys', name: 'Varys', emoji: '🕷️', role: 'Email Domain' },
  { id: 'demerzel', name: 'Demerzel', emoji: '⚙️', role: 'Dev Intelligence' },
]

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  agentId?: string
}

interface ChatWindow {
  id: string
  agentId: string
  messages: Message[]
  input: string
  isConnected: boolean
  isLoading: boolean
}

type LayoutMode = 'tabs' | 'split'

function renderMarkdown(text: string): string {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="chat-code-block"><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
}

function MessageBubble({ msg, agentId }: { msg: Message; agentId: string }) {
  const agent = DYNASTY_AGENTS.find(a => a.id === agentId)
  const isUser = msg.role === 'user'

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: '8px',
      marginBottom: '12px',
      alignItems: 'flex-start',
    }}>
      {!isUser && (
        <div style={{
          width: '32px', height: '32px',
          borderRadius: '50%',
          background: 'rgba(201,168,76,0.2)',
          border: '1px solid rgba(201,168,76,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', flexShrink: 0,
        }}>
          {agent?.emoji || '🤖'}
        </div>
      )}
      <div style={{
        maxWidth: '75%',
        padding: '8px 12px',
        borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        background: isUser
          ? 'rgba(201,168,76,0.2)'
          : 'rgba(255,255,255,0.07)',
        border: `1px solid ${isUser ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.1)'}`,
        fontSize: '13px',
        lineHeight: '1.5',
        color: 'rgba(255,255,255,0.9)',
      }}>
        {!isUser && (
          <div style={{ fontSize: '11px', color: '#c9a84c', marginBottom: '4px', fontWeight: 600 }}>
            {agent?.name || agentId}
          </div>
        )}
        <div
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
          style={{ wordBreak: 'break-word' }}
        />
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', textAlign: 'right' }}>
          {new Date(msg.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

function ChatWindowView({ win, onSend, onInputChange }: {
  win: ChatWindow
  onSend: (windowId: string) => void
  onInputChange: (windowId: string, value: string) => void
}) {
  const agent = DYNASTY_AGENTS.find(a => a.id === win.agentId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [win.messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Agent header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{ fontSize: '20px' }}>{agent?.emoji || '🤖'}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#c9a84c' }}>{agent?.name || win.agentId}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{agent?.role || ''}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: win.isConnected ? '#00ffd1' : '#ff4444',
          }} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            {win.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column',
      }}>
        {win.messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.2)', fontSize: '13px', flexDirection: 'column', gap: '8px',
          }}>
            <span style={{ fontSize: '32px' }}>{agent?.emoji || '🤖'}</span>
            <span>Start a conversation with {agent?.name || win.agentId}</span>
          </div>
        )}
        {win.messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} agentId={win.agentId} />
        ))}
        {win.isLoading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            <span style={{ fontSize: '16px' }}>{agent?.emoji || '🤖'}</span>
            <span style={{ animation: 'pulse 1s infinite' }}>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', gap: '8px',
      }}>
        <textarea
          value={win.input}
          onChange={e => onInputChange(win.id, e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend(win.id)
            }
          }}
          placeholder={`Message ${agent?.name || win.agentId}... (Enter to send, Shift+Enter for newline)`}
          style={{
            flex: 1, padding: '8px 12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '13px',
            resize: 'none',
            minHeight: '40px',
            maxHeight: '120px',
            outline: 'none',
            fontFamily: 'inherit',
          }}
          rows={1}
        />
        <button
          onClick={() => onSend(win.id)}
          disabled={!win.input.trim() || win.isLoading}
          style={{
            padding: '8px 16px',
            background: win.input.trim() && !win.isLoading ? '#c9a84c' : 'rgba(201,168,76,0.2)',
            border: 'none', borderRadius: '8px',
            color: win.input.trim() && !win.isLoading ? '#0a0a0f' : 'rgba(255,255,255,0.3)',
            cursor: win.input.trim() && !win.isLoading ? 'pointer' : 'not-allowed',
            fontWeight: 600, fontSize: '13px',
            transition: 'all 0.2s',
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

export function ChatPanel() {
  const [windows, setWindows] = useState<ChatWindow[]>([])
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null)
  const [layout, setLayout] = useState<LayoutMode>('tabs')
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const wsRefs = useRef<Map<string, WebSocket>>(new Map())

  const createWindow = useCallback((agentId: string) => {
    const id = `${agentId}-${Date.now()}`
    const newWindow: ChatWindow = {
      id, agentId, messages: [], input: '', isConnected: false, isLoading: false,
    }
    setWindows(prev => [...prev, newWindow])
    setActiveWindowId(id)
    setShowAgentPicker(false)

    // Connect WebSocket
    const wsUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'ws://127.0.0.1:18789'
    try {
      const ws = new WebSocket(wsUrl)
      wsRefs.current.set(id, ws)

      ws.onopen = () => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isConnected: true } : w))
      }

      ws.onclose = () => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isConnected: false } : w))
        wsRefs.current.delete(id)
      }

      ws.onerror = () => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isConnected: false } : w))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const content = data.content || data.message || data.text || JSON.stringify(data)
          const msg: Message = {
            id: `msg-${Date.now()}-${Math.random()}`,
            role: 'assistant',
            content,
            timestamp: Date.now(),
            agentId,
          }
          setWindows(prev => prev.map(w =>
            w.id === id ? { ...w, messages: [...w.messages, msg], isLoading: false } : w
          ))
        } catch {
          // ignore parse errors
        }
      }
    } catch (err) {
      console.error('WebSocket connection failed:', err)
    }
  }, [])

  const closeWindow = useCallback((windowId: string) => {
    const ws = wsRefs.current.get(windowId)
    if (ws) { ws.close(); wsRefs.current.delete(windowId) }
    setWindows(prev => {
      const remaining = prev.filter(w => w.id !== windowId)
      if (activeWindowId === windowId && remaining.length > 0) {
        setActiveWindowId(remaining[remaining.length - 1].id)
      } else if (remaining.length === 0) {
        setActiveWindowId(null)
      }
      return remaining
    })
  }, [activeWindowId])

  const handleSend = useCallback(async (windowId: string) => {
    const win = windows.find(w => w.id === windowId)
    if (!win || !win.input.trim()) return

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: win.input.trim(),
      timestamp: Date.now(),
    }

    setWindows(prev => prev.map(w =>
      w.id === windowId ? { ...w, messages: [...w.messages, userMsg], input: '', isLoading: true } : w
    ))

    // Try WebSocket first, fall back to HTTP API
    const ws = wsRefs.current.get(windowId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'message',
          agent: win.agentId,
          content: userMsg.content,
        }))
        return
      } catch {
        // fall through to HTTP
      }
    }

    // HTTP fallback via chat API
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: win.agentId,
          message: userMsg.content,
        }),
      })
      const data = await res.json()
      const reply: Message = {
        id: `msg-${Date.now()}-reply`,
        role: 'assistant',
        content: data.reply || data.message || data.content || 'No response',
        timestamp: Date.now(),
        agentId: win.agentId,
      }
      setWindows(prev => prev.map(w =>
        w.id === windowId ? { ...w, messages: [...w.messages, reply], isLoading: false } : w
      ))
    } catch {
      setWindows(prev => prev.map(w =>
        w.id === windowId ? { ...w, isLoading: false } : w
      ))
    }
  }, [windows])

  const handleInputChange = useCallback((windowId: string, value: string) => {
    setWindows(prev => prev.map(w => w.id === windowId ? { ...w, input: value } : w))
  }, [])

  useEffect(() => {
    return () => {
      wsRefs.current.forEach(ws => ws.close())
    }
  }, [])

  const visibleWindows = layout === 'split' ? windows : (activeWindowId ? windows.filter(w => w.id === activeWindowId) : [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#c9a84c' }}>💬 Chat</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setLayout(l => l === 'tabs' ? 'split' : 'tabs')}
            style={{
              padding: '4px 10px', fontSize: '11px',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
            }}
          >
            {layout === 'tabs' ? '⊞ Split' : '⊟ Tabs'}
          </button>
          <button
            onClick={() => setShowAgentPicker(true)}
            style={{
              padding: '4px 10px', fontSize: '11px',
              background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '6px', color: '#c9a84c', cursor: 'pointer',
            }}
          >
            + New Chat
          </button>
        </div>
      </div>

      {/* Agent picker modal */}
      {showAgentPicker && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setShowAgentPicker(false)}
        >
          <div
            style={{
              background: 'rgba(15,15,25,0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px', padding: '20px',
              minWidth: '320px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#c9a84c' }}>Choose Agent</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {DYNASTY_AGENTS.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => createWindow(agent.id)}
                  style={{
                    padding: '10px 12px', textAlign: 'left',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.9)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{agent.emoji}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{agent.name}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{agent.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs (when in tab mode) */}
      {layout === 'tabs' && windows.length > 0 && (
        <div style={{
          display: 'flex', gap: '4px', padding: '8px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          overflowX: 'auto',
        }}>
          {windows.map(win => {
            const agent = DYNASTY_AGENTS.find(a => a.id === win.agentId)
            return (
              <div
                key={win.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '4px 10px',
                  background: activeWindowId === win.id ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${activeWindowId === win.id ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '6px', cursor: 'pointer',
                  fontSize: '12px', whiteSpace: 'nowrap',
                  color: activeWindowId === win.id ? '#c9a84c' : 'rgba(255,255,255,0.6)',
                }}
                onClick={() => setActiveWindowId(win.id)}
              >
                <span>{agent?.emoji}</span>
                <span>{agent?.name}</span>
                <div
                  onClick={e => { e.stopPropagation(); closeWindow(win.id) }}
                  style={{ marginLeft: '4px', color: 'rgba(255,255,255,0.3)', fontSize: '10px', cursor: 'pointer' }}
                >
                  ✕
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Chat area */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {windows.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.3)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>No active chats</div>
            <button
              onClick={() => setShowAgentPicker(true)}
              style={{
                padding: '8px 20px', fontSize: '13px',
                background: 'rgba(201,168,76,0.2)',
                border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: '8px', color: '#c9a84c', cursor: 'pointer', marginTop: '8px',
              }}
            >
              Start a Chat
            </button>
          </div>
        ) : layout === 'split' ? (
          <div style={{
            flex: 1, display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(windows.length, 3)}, 1fr)`,
            overflow: 'hidden',
          }}>
            {windows.map((win, i) => (
              <div key={win.id} style={{
                borderRight: i < windows.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
              }}>
                <ChatWindowView win={win} onSend={handleSend} onInputChange={handleInputChange} />
              </div>
            ))}
          </div>
        ) : (
          visibleWindows.length > 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <ChatWindowView win={visibleWindows[0]} onSend={handleSend} onInputChange={handleInputChange} />
            </div>
          )
        )}
      </div>
    </div>
  )
}
