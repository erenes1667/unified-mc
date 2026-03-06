'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  Handle,
  Position,
  MarkerType,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'

// ─── Node type definitions ────────────────────────────────────────────────────

type NodeKind = 'trigger' | 'action' | 'condition' | 'delay' | 'webhook'

interface PipelineNodeData {
  label: string
  kind: NodeKind
  config: Record<string, string>
}

const NODE_COLORS: Record<NodeKind, { bg: string; border: string; badge: string; text: string }> = {
  trigger:   { bg: '#1a2a1a', border: '#22c55e', badge: '#16a34a', text: '#86efac' },
  action:    { bg: '#1a1f2e', border: '#3b82f6', badge: '#1d4ed8', text: '#93c5fd' },
  condition: { bg: '#2a1a2a', border: '#a855f7', badge: '#7e22ce', text: '#d8b4fe' },
  delay:     { bg: '#2a2a1a', border: '#eab308', badge: '#a16207', text: '#fde047' },
  webhook:   { bg: '#2a1a1a', border: '#f97316', badge: '#c2410c', text: '#fdba74' },
}

const NODE_ICONS: Record<NodeKind, string> = {
  trigger:   '⚡',
  action:    '▶',
  condition: '◆',
  delay:     '⏱',
  webhook:   '🔗',
}

function PipelineNode({ data, selected }: { data: PipelineNodeData; selected?: boolean }) {
  const colors = NODE_COLORS[data.kind]
  return (
    <div
      style={{
        background: colors.bg,
        border: `2px solid ${selected ? '#fff' : colors.border}`,
        borderRadius: 10,
        minWidth: 160,
        boxShadow: selected ? `0 0 0 2px ${colors.border}55` : 'none',
      }}
      className="transition-all"
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.border, border: 'none' }} />
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <span
            style={{ background: colors.badge }}
            className="text-xs px-1.5 py-0.5 rounded font-mono uppercase tracking-wide"
          >
            {NODE_ICONS[data.kind]} {data.kind}
          </span>
        </div>
        <div style={{ color: colors.text }} className="font-semibold text-sm">
          {data.label}
        </div>
        {Object.entries(data.config).slice(0, 2).map(([k, v]) => (
          <div key={k} className="text-xs text-gray-500 mt-0.5 truncate">
            <span className="text-gray-600">{k}:</span> {v}
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: colors.border, border: 'none' }} />
    </div>
  )
}

const nodeTypes: NodeTypes = {
  pipeline: PipelineNode,
}

// ─── Templates ───────────────────────────────────────────────────────────────

interface PipelineTemplate {
  id: string
  name: string
  description: string
  nodes: Node<PipelineNodeData>[]
  edges: Edge[]
}

const BUILT_IN_TEMPLATES: PipelineTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch',
    nodes: [],
    edges: [],
  },
  {
    id: 'webhook-action',
    name: 'Webhook → Action',
    description: 'Receive webhook and run action',
    nodes: [
      { id: 'n1', type: 'pipeline', position: { x: 200, y: 80 }, data: { label: 'Incoming Webhook', kind: 'webhook', config: { method: 'POST', path: '/hook' } } },
      { id: 'n2', type: 'pipeline', position: { x: 200, y: 220 }, data: { label: 'Process Data', kind: 'action', config: { script: 'process.js' } } },
    ],
    edges: [{ id: 'e1-2', source: 'n1', target: 'n2', markerEnd: { type: MarkerType.ArrowClosed } }],
  },
  {
    id: 'schedule-condition-notify',
    name: 'Schedule → Check → Notify',
    description: 'Cron trigger with conditional notification',
    nodes: [
      { id: 'n1', type: 'pipeline', position: { x: 200, y: 60 }, data: { label: 'Cron Schedule', kind: 'trigger', config: { cron: '0 9 * * *' } } },
      { id: 'n2', type: 'pipeline', position: { x: 200, y: 200 }, data: { label: 'Check Condition', kind: 'condition', config: { field: 'status', op: 'equals', value: 'active' } } },
      { id: 'n3', type: 'pipeline', position: { x: 80, y: 340 }, data: { label: 'Send Notification', kind: 'action', config: { channel: 'telegram' } } },
      { id: 'n4', type: 'pipeline', position: { x: 320, y: 340 }, data: { label: 'Log Skip', kind: 'action', config: { level: 'info' } } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: 'n2', target: 'n3', label: 'true', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-4', source: 'n2', target: 'n4', label: 'false', markerEnd: { type: MarkerType.ArrowClosed } },
    ],
  },
  {
    id: 'delay-chain',
    name: 'Trigger → Delay → Action',
    description: 'Event-driven with delay buffer',
    nodes: [
      { id: 'n1', type: 'pipeline', position: { x: 200, y: 60 }, data: { label: 'On Event', kind: 'trigger', config: { event: 'agent.completed' } } },
      { id: 'n2', type: 'pipeline', position: { x: 200, y: 200 }, data: { label: 'Wait 5 min', kind: 'delay', config: { duration: '5m' } } },
      { id: 'n3', type: 'pipeline', position: { x: 200, y: 340 }, data: { label: 'Run Cleanup', kind: 'action', config: { fn: 'cleanup' } } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: 'n2', target: 'n3', markerEnd: { type: MarkerType.ArrowClosed } },
    ],
  },
]

// ─── Log entry ────────────────────────────────────────────────────────────────

interface LogEntry {
  ts: number
  level: 'info' | 'warn' | 'error' | 'success'
  msg: string
}

// ─── Config panel ─────────────────────────────────────────────────────────────

function NodeConfigPanel({
  node,
  onChange,
  onClose,
}: {
  node: Node<PipelineNodeData>
  onChange: (id: string, data: PipelineNodeData) => void
  onClose: () => void
}) {
  const [label, setLabel] = useState(node.data.label)
  const [config, setConfig] = useState<Record<string, string>>(node.data.config)
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')
  const colors = NODE_COLORS[node.data.kind]

  function save() {
    onChange(node.id, { ...node.data, label, config })
    onClose()
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#0f1117] border-l border-border p-4 flex flex-col gap-3 z-50 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span style={{ color: colors.text }} className="font-bold text-sm uppercase tracking-wide">
          {NODE_ICONS[node.data.kind]} {node.data.kind} Node
        </span>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Label</label>
        <input
          className="w-full bg-[#1a1a2e] border border-border rounded px-2 py-1 text-sm text-white"
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Config</label>
        <div className="space-y-1">
          {Object.entries(config).map(([k, v]) => (
            <div key={k} className="flex gap-1 items-center">
              <input
                className="flex-1 bg-[#1a1a2e] border border-border rounded px-2 py-1 text-xs text-gray-400"
                value={k}
                readOnly
              />
              <input
                className="flex-1 bg-[#1a1a2e] border border-border rounded px-2 py-1 text-xs text-white"
                value={v}
                onChange={e => setConfig({ ...config, [k]: e.target.value })}
              />
              <button
                onClick={() => { const c = { ...config }; delete c[k]; setConfig(c) }}
                className="text-red-400 hover:text-red-300 px-1"
              >×</button>
            </div>
          ))}
          <div className="flex gap-1 mt-2">
            <input
              className="flex-1 bg-[#1a1a2e] border border-border rounded px-2 py-1 text-xs text-gray-400"
              placeholder="key"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
            />
            <input
              className="flex-1 bg-[#1a1a2e] border border-border rounded px-2 py-1 text-xs text-white"
              placeholder="value"
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
            />
            <button
              onClick={() => { if (newKey) { setConfig({ ...config, [newKey]: newVal }); setNewKey(''); setNewVal('') } }}
              className="bg-blue-700 hover:bg-blue-600 text-white px-2 rounded text-xs"
            >+</button>
          </div>
        </div>
      </div>

      <button
        onClick={save}
        className="mt-auto bg-blue-600 hover:bg-blue-500 text-white rounded py-1.5 text-sm font-medium"
      >
        Save Node
      </button>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

let nodeIdCounter = 100

export function PipelineBuilderPanel() {
  // ─── Coming Soon overlay ──────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
      <div className="mb-4 text-5xl">🚧</div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Pipeline Builder</h2>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Visual workflow automation is coming soon. This will let you chain agent actions, conditions, and triggers into automated pipelines.
      </p>
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium cursor-not-allowed select-none">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        Coming Soon
      </span>
    </div>
  )

  // eslint-disable-next-line no-unreachable
  const [nodes, setNodes, onNodesChange] = useNodesState<PipelineNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node<PipelineNodeData> | null>(null)
  const [pipelineName, setPipelineName] = useState('My Pipeline')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [savedPipelines, setSavedPipelines] = useState<PipelineTemplate[]>([])
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Load saved pipelines from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mc_pipelines') || '[]')
      setSavedPipelines(saved)
    } catch {}
  }, [])

  function pushLog(level: LogEntry['level'], msg: string) {
    setLogs(prev => [...prev, { ts: Date.now(), level, msg }])
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed }, animated: true }, eds))
  }, [setEdges])

  function addNode(kind: NodeKind) {
    const id = `n${++nodeIdCounter}`
    const defaultConfigs: Record<NodeKind, Record<string, string>> = {
      trigger:   { event: 'agent.completed' },
      action:    { script: 'my-action.js' },
      condition: { field: 'status', op: 'equals', value: 'active' },
      delay:     { duration: '1m' },
      webhook:   { method: 'POST', path: '/hook' },
    }
    const newNode: Node<PipelineNodeData> = {
      id,
      type: 'pipeline',
      position: { x: 150 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { label: `New ${kind}`, kind, config: defaultConfigs[kind] },
    }
    setNodes(nds => [...nds, newNode])
  }

  function updateNodeData(id: string, data: PipelineNodeData) {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data } : n))
    setSelectedNode(null)
  }

  function onNodeClick(_: React.MouseEvent, node: Node) {
    setSelectedNode(node as Node<PipelineNodeData>)
  }

  function loadTemplate(tpl: PipelineTemplate) {
    setNodes(tpl.nodes.map(n => ({ ...n })))
    setEdges(tpl.edges.map(e => ({ ...e, animated: true })))
    setPipelineName(tpl.name === 'Blank' ? 'My Pipeline' : tpl.name)
    setActiveTemplate(tpl.id)
    setShowTemplates(false)
    setSelectedNode(null)
    setLogs([])
  }

  function savePipeline() {
    const tpl: PipelineTemplate = {
      id: `custom_${Date.now()}`,
      name: pipelineName,
      description: `Saved pipeline with ${nodes.length} nodes`,
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e })),
    }
    const updated = [...savedPipelines, tpl]
    setSavedPipelines(updated)
    localStorage.setItem('mc_pipelines', JSON.stringify(updated))
    pushLog('success', `Pipeline "${pipelineName}" saved locally`)
  }

  function deleteSaved(id: string) {
    const updated = savedPipelines.filter(p => p.id !== id)
    setSavedPipelines(updated)
    localStorage.setItem('mc_pipelines', JSON.stringify(updated))
  }

  async function executePipeline() {
    if (nodes.length === 0) { pushLog('warn', 'No nodes in pipeline'); return }
    setIsRunning(true)
    setShowLogs(true)
    setLogs([])
    pushLog('info', `Starting pipeline "${pipelineName}" with ${nodes.length} nodes...`)

    // Simulate execution by topological traversal
    const adjacency: Record<string, string[]> = {}
    for (const n of nodes) adjacency[n.id] = []
    for (const e of edges) adjacency[e.source]?.push(e.target)

    // Find roots (no incoming edges)
    const inDegree: Record<string, number> = {}
    for (const n of nodes) inDegree[n.id] = 0
    for (const e of edges) inDegree[e.target] = (inDegree[e.target] || 0) + 1
    const queue = nodes.filter(n => inDegree[n.id] === 0)

    const visited = new Set<string>()
    const executeNode = async (node: Node<PipelineNodeData>) => {
      if (visited.has(node.id)) return
      visited.add(node.id)
      pushLog('info', `  → Running [${node.data.kind}] ${node.data.label}...`)
      await new Promise(r => setTimeout(r, 600 + Math.random() * 800))

      if (node.data.kind === 'condition') {
        pushLog('info', `    ✓ Condition evaluated: ${node.data.config.field} ${node.data.config.op} ${node.data.config.value} → true`)
      } else if (node.data.kind === 'delay') {
        pushLog('info', `    ⏱ Delay ${node.data.config.duration} simulated`)
      } else if (node.data.kind === 'webhook') {
        pushLog('info', `    🔗 Webhook ${node.data.config.method} ${node.data.config.path} → 200 OK`)
      } else {
        pushLog('success', `    ✓ ${node.data.label} completed`)
      }

      // Process children
      for (const childId of adjacency[node.id] || []) {
        const childNode = nodes.find(n => n.id === childId)
        if (childNode) await executeNode(childNode)
      }
    }

    try {
      for (const root of queue) await executeNode(root)
      pushLog('success', `✅ Pipeline "${pipelineName}" completed successfully`)
    } catch (err) {
      pushLog('error', `❌ Pipeline failed: ${err}`)
    } finally {
      setIsRunning(false)
    }
  }

  const allTemplates = [...BUILT_IN_TEMPLATES, ...savedPipelines]

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-[#0a0d14]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-[#0f1117]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔀</span>
          <input
            className="bg-transparent text-white font-bold text-base border-none outline-none"
            value={pipelineName}
            onChange={e => setPipelineName(e.target.value)}
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowTemplates(t => !t)}
          className="text-xs px-3 py-1.5 rounded border border-border text-gray-400 hover:text-white hover:border-white/30 transition"
        >
          Templates
        </button>
        <button
          onClick={savePipeline}
          className="text-xs px-3 py-1.5 rounded border border-blue-700 text-blue-300 hover:bg-blue-900/30 transition"
        >
          Save
        </button>
        <button
          onClick={() => setShowLogs(s => !s)}
          className="text-xs px-3 py-1.5 rounded border border-border text-gray-400 hover:text-white transition"
        >
          {showLogs ? 'Hide Logs' : 'Show Logs'}
        </button>
        <button
          onClick={executePipeline}
          disabled={isRunning || nodes.length === 0}
          className="text-xs px-4 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white font-medium disabled:opacity-50 transition"
        >
          {isRunning ? '▶ Running...' : '▶ Run'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Templates sidebar */}
        {showTemplates && (
          <div className="w-64 border-r border-border bg-[#0f1117] flex flex-col overflow-y-auto shrink-0">
            <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-border">
              Built-in Templates
            </div>
            {BUILT_IN_TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => loadTemplate(tpl)}
                className={`text-left px-3 py-2.5 border-b border-border/50 hover:bg-white/5 transition ${activeTemplate === tpl.id ? 'bg-white/5 border-l-2 border-l-blue-500' : ''}`}
              >
                <div className="text-sm text-white font-medium">{tpl.name}</div>
                <div className="text-xs text-gray-500">{tpl.description}</div>
              </button>
            ))}

            {savedPipelines.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-border mt-2">
                  Saved Pipelines
                </div>
                {savedPipelines.map(tpl => (
                  <div key={tpl.id} className="flex items-center border-b border-border/50 hover:bg-white/5">
                    <button
                      onClick={() => loadTemplate(tpl)}
                      className="flex-1 text-left px-3 py-2.5"
                    >
                      <div className="text-sm text-white font-medium">{tpl.name}</div>
                      <div className="text-xs text-gray-500">{tpl.nodes.length} nodes</div>
                    </button>
                    <button
                      onClick={() => deleteSaved(tpl.id)}
                      className="pr-2 text-red-500 hover:text-red-400 text-xs"
                    >×</button>
                  </div>
                ))}
              </>
            )}

            {/* Add node buttons */}
            <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-border mt-2">
              Add Node
            </div>
            {(['trigger', 'action', 'condition', 'delay', 'webhook'] as NodeKind[]).map(kind => {
              const c = NODE_COLORS[kind]
              return (
                <button
                  key={kind}
                  onClick={() => { addNode(kind); setShowTemplates(false) }}
                  style={{ borderLeft: `3px solid ${c.border}` }}
                  className="text-left px-3 py-2 border-b border-border/50 hover:bg-white/5 transition flex items-center gap-2"
                >
                  <span>{NODE_ICONS[kind]}</span>
                  <span style={{ color: c.text }} className="text-sm capitalize">{kind}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 relative" style={{ minHeight: 400 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            fitView
            style={{ background: '#0a0d14' }}
            defaultEdgeOptions={{ animated: true, markerEnd: { type: MarkerType.ArrowClosed } }}
          >
            <Controls className="!bg-[#0f1117] !border-border" />
            <Background variant={BackgroundVariant.Dots} color="#1a2030" gap={20} />
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="mt-8 text-center text-gray-600">
                  <div className="text-4xl mb-3">🔀</div>
                  <div className="text-sm">Choose a template or add nodes to build your pipeline</div>
                </div>
              </Panel>
            )}
          </ReactFlow>

          {/* Node config panel */}
          {selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onChange={updateNodeData}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </div>

        {/* Logs panel */}
        {showLogs && (
          <div className="w-72 border-l border-border bg-[#070a0f] flex flex-col shrink-0">
            <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-border flex items-center gap-2">
              <span>Execution Log</span>
              {isRunning && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
              <button onClick={() => setLogs([])} className="ml-auto text-gray-600 hover:text-gray-400">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-0.5">
              {logs.length === 0 && (
                <div className="text-gray-600 text-center mt-4">No logs yet</div>
              )}
              {logs.map((log, i) => (
                <div key={i} className={`
                  ${log.level === 'error' ? 'text-red-400' : ''}
                  ${log.level === 'warn' ? 'text-yellow-400' : ''}
                  ${log.level === 'success' ? 'text-green-400' : ''}
                  ${log.level === 'info' ? 'text-gray-400' : ''}
                  leading-5 whitespace-pre-wrap break-all
                `}>
                  <span className="text-gray-600">{new Date(log.ts).toLocaleTimeString('en', { hour12: false })} </span>
                  {log.msg}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
