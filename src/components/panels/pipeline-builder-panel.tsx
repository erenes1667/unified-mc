'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { DYNASTY_ROSTER } from '@/data/dynasty-roster'

// ─── Types ────────────────────────────────────────────────────────────────────

type StepKind = 'spawn' | 'wait' | 'condition' | 'parallel'

interface PipelineStep {
  id: string
  kind: StepKind
  label: string
  agent?: string
  task?: string
  timeout?: number
  dependsOn?: string[]
  condition?: string
  branches?: PipelineStep[][]
}

interface Pipeline {
  id: string
  name: string
  description?: string
  steps: PipelineStep[]
  createdAt: string
  updatedAt: string
}

interface StepStatus {
  stepId: string
  label: string
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
  sessionId?: string
  startedAt?: string
  completedAt?: string
  error?: string
  output?: string
}

interface PipelineRun {
  runId: string
  pipelineId: string
  pipelineName: string
  status: 'running' | 'done' | 'failed'
  steps: StepStatus[]
  startedAt: string
  completedAt?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_KIND_META: Record<StepKind, { icon: string; color: string; border: string; label: string }> = {
  spawn:     { icon: '🤖', color: '#1a2e1a', border: '#22c55e', label: 'Spawn Agent' },
  wait:      { icon: '⏱', color: '#2a2a1a', border: '#eab308', label: 'Wait' },
  condition: { icon: '◆', color: '#2a1a2a', border: '#a855f7', label: 'Condition' },
  parallel:  { icon: '⫸', color: '#1a1f2e', border: '#3b82f6', label: 'Parallel Fork' },
}

const STATUS_COLORS: Record<StepStatus['status'], string> = {
  pending: '#6b7280',
  running: '#3b82f6',
  done:    '#22c55e',
  failed:  '#ef4444',
  skipped: '#f59e0b',
}

const STATUS_ICONS: Record<StepStatus['status'], string> = {
  pending: '○',
  running: '●',
  done:    '✓',
  failed:  '✗',
  skipped: '⊘',
}

// ─── Pipeline templates ───────────────────────────────────────────────────────

const PIPELINE_TEMPLATES: Omit<Pipeline, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'tpl-research-report',
    name: 'Research & Report',
    description: 'Whisper researches, Forge writes report',
    steps: [
      { id: 's1', kind: 'spawn', label: 'Research Topic', agent: 'Whisper', task: 'Research the given topic and summarize key findings', timeout: 120 },
      { id: 's2', kind: 'wait', label: 'Wait for results', timeout: 5 },
      { id: 's3', kind: 'spawn', label: 'Write Report', agent: 'Forge', task: 'Using the research output, write a structured report', timeout: 180, dependsOn: ['s1'] },
    ],
  },
  {
    id: 'tpl-code-review',
    name: 'Code Review',
    description: 'Forge implements, Demerzel reviews',
    steps: [
      { id: 's1', kind: 'spawn', label: 'Implement Feature', agent: 'Forge', task: 'Implement the requested feature', timeout: 300 },
      { id: 's2', kind: 'spawn', label: 'Code Review', agent: 'Demerzel', task: 'Review the implementation for correctness, security, and performance', timeout: 120, dependsOn: ['s1'] },
      { id: 's3', kind: 'condition', label: 'Review Passed?', condition: 'review.approved === true' },
    ],
  },
  {
    id: 'tpl-email-campaign',
    name: 'Email Campaign',
    description: 'Raven drafts, Lord Varys reviews, Sentinel deploys',
    steps: [
      { id: 's1', kind: 'spawn', label: 'Draft Campaign', agent: 'Raven', task: 'Draft an email campaign based on the brief', timeout: 180 },
      { id: 's2', kind: 'spawn', label: 'Review & Approve', agent: 'Lord Varys', task: 'Review the email campaign draft and provide approval or edits', timeout: 120, dependsOn: ['s1'] },
      { id: 's3', kind: 'spawn', label: 'Deploy Campaign', agent: 'Sentinel', task: 'Deploy the approved campaign to Klaviyo', timeout: 60, dependsOn: ['s2'] },
    ],
  },
]

// ─── Drag-and-drop helpers ────────────────────────────────────────────────────

function genId() {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  total,
  runStatus,
  selected,
  onSelect,
  onMove,
  onDelete,
}: {
  step: PipelineStep
  index: number
  total: number
  runStatus?: StepStatus
  selected: boolean
  onSelect: () => void
  onMove: (from: number, to: number) => void
  onDelete: () => void
}) {
  const meta = STEP_KIND_META[step.kind]
  const statusColor = runStatus ? STATUS_COLORS[runStatus.status] : '#374151'
  const statusIcon = runStatus ? STATUS_ICONS[runStatus.status] : '○'
  const isRunning = runStatus?.status === 'running'

  return (
    <div
      className={`relative group rounded-lg border-2 cursor-pointer transition-all select-none ${selected ? 'ring-2 ring-white/30' : ''}`}
      style={{
        background: meta.color,
        borderColor: selected ? meta.border : `${meta.border}66`,
      }}
      onClick={onSelect}
    >
      {/* Step number + connector */}
      {index < total - 1 && (
        <div className="absolute left-7 top-full w-px h-3 bg-gray-700 z-10" />
      )}

      <div className="px-3 py-2.5 flex items-start gap-3">
        {/* Status dot */}
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <span
            className={`text-sm font-mono ${isRunning ? 'animate-pulse' : ''}`}
            style={{ color: statusColor }}
          >
            {statusIcon}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs">{meta.icon}</span>
            <span className="text-xs font-mono uppercase tracking-wide" style={{ color: meta.border }}>
              {meta.label}
            </span>
            {step.agent && (
              <span className="text-xs text-gray-500">
                {DYNASTY_ROSTER.find(a => a.name === step.agent)?.emoji} {step.agent}
              </span>
            )}
          </div>
          <div className="text-sm text-white font-medium truncate">{step.label}</div>
          {step.task && (
            <div className="text-xs text-gray-500 truncate mt-0.5">{step.task}</div>
          )}
          {step.kind === 'wait' && (
            <div className="text-xs text-yellow-500/70 mt-0.5">⏱ {step.timeout || 5}s</div>
          )}
          {step.dependsOn && step.dependsOn.length > 0 && (
            <div className="text-xs text-gray-600 mt-0.5">depends on: {step.dependsOn.join(', ')}</div>
          )}
          {runStatus?.error && (
            <div className="text-xs text-red-400 mt-1 truncate">{runStatus.error}</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {index > 0 && (
            <button
              onClick={e => { e.stopPropagation(); onMove(index, index - 1) }}
              className="text-gray-500 hover:text-white text-xs leading-none px-1"
              title="Move up"
            >↑</button>
          )}
          {index < total - 1 && (
            <button
              onClick={e => { e.stopPropagation(); onMove(index, index + 1) }}
              className="text-gray-500 hover:text-white text-xs leading-none px-1"
              title="Move down"
            >↓</button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="text-gray-600 hover:text-red-400 text-xs leading-none px-1"
            title="Delete step"
          >✕</button>
        </div>
      </div>
    </div>
  )
}

// ─── Step editor ──────────────────────────────────────────────────────────────

function StepEditor({
  step,
  allStepIds,
  onChange,
  onClose,
}: {
  step: PipelineStep
  allStepIds: string[]
  onChange: (s: PipelineStep) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState({ ...step })
  const meta = STEP_KIND_META[draft.kind]

  function set<K extends keyof PipelineStep>(key: K, value: PipelineStep[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  return (
    <div className="border border-border rounded-lg bg-[#0f1117] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span style={{ color: meta.border }} className="text-sm font-bold">
          {meta.icon} Edit Step
        </span>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-base leading-none">×</button>
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Label</label>
        <input
          className="w-full bg-[#1a1a2e] border border-border rounded px-2 py-1 text-sm text-white"
          value={draft.label}
          onChange={e => set('label', e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Step Type</label>
        <select
          className="w-full bg-[#1a1a2e] border border-border rounded px-2 py-1 text-sm text-white"
          value={draft.kind}
          onChange={e => set('kind', e.target.value as StepKind)}
        >
          {(Object.keys(STEP_KIND_META) as StepKind[]).map(k => (
            <option key={k} value={k}>{STEP_KIND_META[k].icon} {STEP_KIND_META[k].label}</option>
          ))}
        </select>
      </div>

      {draft.kind === 'spawn' && (
        <>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Agent</label>
            <select
              className="w-full bg-[#1a1a2e] border border-border rounded px-2 py-1 text-sm text-white"
              value={draft.agent || ''}
              onChange={e => set('agent', e.target.value)}
            >
              <option value="">— Select Agent —</option>
              {DYNASTY_ROSTER.map(a => (
                <option key={a.name} value={a.name}>{a.emoji} {a.name} — {a.role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Task Prompt</label>
            <textarea
              className="w-full bg-[#1a1a2e] border border-border rounded px-2 py-1 text-sm text-white resize-none"
              rows={4}
              value={draft.task || ''}
              onChange={e => set('task', e.target.value)}
              placeholder="Describe what the agent should do..."
            />
          </div>
        </>
      )}

      {draft.kind === 'condition' && (
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Condition Expression</label>
          <input
            className="w-full bg-[#1a1a2e] border border-border rounded px-2 py-1 text-sm text-white font-mono"
            value={draft.condition || ''}
            onChange={e => set('condition', e.target.value)}
            placeholder="e.g. result.approved === true"
          />
        </div>
      )}

      {(draft.kind === 'spawn' || draft.kind === 'wait') && (
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Timeout (seconds) {draft.kind === 'wait' ? '— how long to wait' : '— max run time'}
          </label>
          <input
            type="number"
            className="w-full bg-[#1a1a2e] border border-border rounded px-2 py-1 text-sm text-white"
            value={draft.timeout || ''}
            onChange={e => set('timeout', parseInt(e.target.value) || undefined)}
            placeholder={draft.kind === 'wait' ? '5' : '300'}
          />
        </div>
      )}

      {draft.kind === 'spawn' && allStepIds.filter(sid => sid !== draft.id).length > 0 && (
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Depends On</label>
          <div className="space-y-1">
            {allStepIds.filter(sid => sid !== draft.id).map(sid => (
              <label key={sid} className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-blue-500"
                  checked={(draft.dependsOn || []).includes(sid)}
                  onChange={e => {
                    const deps = draft.dependsOn || []
                    set('dependsOn', e.target.checked ? [...deps, sid] : deps.filter(d => d !== sid))
                  }}
                />
                {sid}
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => { onChange(draft); onClose() }}
        className="bg-blue-600 hover:bg-blue-500 text-white rounded py-1.5 text-sm font-medium"
      >
        Save Step
      </button>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function PipelineBuilderPanel() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [activeRun, setActiveRun] = useState<PipelineRun | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [view, setView] = useState<'list' | 'builder'>('list')
  const [showTemplates, setShowTemplates] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load pipelines
  async function loadPipelines() {
    const res = await fetch('/api/agent-pipelines')
    if (res.ok) {
      const data = await res.json()
      setPipelines(data.pipelines || [])
    }
  }

  useEffect(() => {
    loadPipelines()
  }, [])

  // Poll run status
  useEffect(() => {
    if (!activeRun || !activePipeline) return
    if (activeRun.status !== 'running') {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/agent-pipelines/${activePipeline.id}/status?runId=${activeRun.runId}`)
      if (res.ok) {
        const run: PipelineRun = await res.json()
        setActiveRun(run)
        if (run.status !== 'running') {
          setIsRunning(false)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      }
    }, 1500)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeRun?.runId, activeRun?.status, activePipeline?.id])

  function newPipeline() {
    const now = new Date().toISOString()
    const p: Pipeline = {
      id: `pipeline-${Date.now()}`,
      name: 'New Pipeline',
      description: '',
      steps: [],
      createdAt: now,
      updatedAt: now,
    }
    setActivePipeline(p)
    setSelectedStepId(null)
    setActiveRun(null)
    setView('builder')
  }

  function loadTemplate(tpl: Omit<Pipeline, 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    setActivePipeline({ ...tpl, id: `pipeline-${Date.now()}`, createdAt: now, updatedAt: now })
    setSelectedStepId(null)
    setActiveRun(null)
    setShowTemplates(false)
    setView('builder')
  }

  async function savePipeline() {
    if (!activePipeline) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/agent-pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activePipeline),
      })
      if (res.ok) {
        const data = await res.json()
        setActivePipeline(data.pipeline)
        await loadPipelines()
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function deletePipeline(id: string) {
    await fetch(`/api/agent-pipelines/${id}`, { method: 'DELETE' })
    await loadPipelines()
    if (activePipeline?.id === id) {
      setActivePipeline(null)
      setView('list')
    }
  }

  async function runPipeline() {
    if (!activePipeline) return
    setIsRunning(true)
    setActiveRun(null)

    // Save first
    await savePipeline()

    const res = await fetch(`/api/agent-pipelines/${activePipeline.id}/run`, { method: 'POST' })
    if (res.ok) {
      const { runId } = await res.json()
      // Seed initial run state from pipeline steps
      const run: PipelineRun = {
        runId,
        pipelineId: activePipeline.id,
        pipelineName: activePipeline.name,
        status: 'running',
        startedAt: new Date().toISOString(),
        steps: activePipeline.steps.map(s => ({
          stepId: s.id,
          label: s.label,
          status: 'pending',
        })),
      }
      setActiveRun(run)
    } else {
      setIsRunning(false)
    }
  }

  function addStep(kind: StepKind) {
    if (!activePipeline) return
    const step: PipelineStep = {
      id: genId(),
      kind,
      label: `New ${STEP_KIND_META[kind].label}`,
      ...(kind === 'spawn' ? { agent: '', task: '', timeout: 300 } : {}),
      ...(kind === 'wait' ? { timeout: 5 } : {}),
      ...(kind === 'condition' ? { condition: '' } : {}),
    }
    setActivePipeline(p => p ? { ...p, steps: [...p.steps, step] } : p)
    setSelectedStepId(step.id)
  }

  function updateStep(updated: PipelineStep) {
    setActivePipeline(p => p ? {
      ...p,
      steps: p.steps.map(s => s.id === updated.id ? updated : s)
    } : p)
  }

  function deleteStep(id: string) {
    setActivePipeline(p => p ? { ...p, steps: p.steps.filter(s => s.id !== id) } : p)
    if (selectedStepId === id) setSelectedStepId(null)
  }

  function moveStep(from: number, to: number) {
    if (!activePipeline) return
    const steps = [...activePipeline.steps]
    const [item] = steps.splice(from, 1)
    steps.splice(to, 0, item)
    setActivePipeline(p => p ? { ...p, steps } : p)
  }

  const selectedStep = activePipeline?.steps.find(s => s.id === selectedStepId) || null

  // ─── Pipeline list view ───────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div className="flex flex-col h-full bg-[#0a0d14] p-4 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🔀</span> Pipeline Builder
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Visual agent workflow automation</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplates(t => !t)}
              className="text-xs px-3 py-1.5 rounded border border-border text-gray-400 hover:text-white transition"
            >
              Templates
            </button>
            <button
              onClick={newPipeline}
              className="text-xs px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white transition"
            >
              + New Pipeline
            </button>
          </div>
        </div>

        {/* Templates */}
        {showTemplates && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PIPELINE_TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => loadTemplate(tpl)}
                className="text-left p-3 rounded-lg border border-border bg-[#0f1117] hover:bg-white/5 transition"
              >
                <div className="font-medium text-white text-sm">{tpl.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{tpl.description}</div>
                <div className="text-xs text-gray-600 mt-2">{tpl.steps.length} steps</div>
              </button>
            ))}
          </div>
        )}

        {/* Pipelines list */}
        {pipelines.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <div className="text-4xl">🔀</div>
            <div className="text-gray-400 font-medium">No pipelines yet</div>
            <div className="text-gray-600 text-sm max-w-xs">
              Create a pipeline to automate multi-agent workflows. Chain agents together with conditions, waits, and parallel forks.
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowTemplates(true)}
                className="text-sm px-4 py-2 rounded border border-border text-gray-300 hover:text-white transition"
              >
                Browse Templates
              </button>
              <button
                onClick={newPipeline}
                className="text-sm px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white transition"
              >
                + New Pipeline
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pipelines.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-[#0f1117] hover:bg-white/5 transition group"
              >
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setActivePipeline(p); setView('builder'); setActiveRun(null); setSelectedStepId(null) }}>
                  <div className="font-medium text-white text-sm">{p.name}</div>
                  {p.description && <div className="text-xs text-gray-500 truncate">{p.description}</div>}
                  <div className="text-xs text-gray-600 mt-0.5">
                    {p.steps.length} steps · Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setActivePipeline(p); setView('builder'); setActiveRun(null); setSelectedStepId(null) }}
                    className="text-xs px-2 py-1 rounded border border-border text-gray-400 hover:text-white"
                  >Edit</button>
                  <button
                    onClick={() => deletePipeline(p.id)}
                    className="text-xs px-2 py-1 rounded border border-red-900/50 text-red-500 hover:text-red-400"
                  >Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Builder view ─────────────────────────────────────────────────────────

  if (!activePipeline) return null

  const runStepMap = new Map(activeRun?.steps.map(s => [s.stepId, s]) || [])

  return (
    <div className="flex flex-col h-full bg-[#0a0d14]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-[#0f1117] shrink-0">
        <button
          onClick={() => setView('list')}
          className="text-gray-500 hover:text-white text-sm transition"
        >
          ← Pipelines
        </button>
        <span className="text-gray-700">/</span>
        <input
          className="bg-transparent text-white font-bold text-sm border-none outline-none min-w-0 flex-1"
          value={activePipeline.name}
          onChange={e => setActivePipeline(p => p ? { ...p, name: e.target.value } : p)}
        />
        <div className="flex gap-2 shrink-0">
          <button
            onClick={savePipeline}
            disabled={isSaving}
            className="text-xs px-3 py-1.5 rounded border border-blue-700 text-blue-300 hover:bg-blue-900/30 disabled:opacity-50 transition"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={runPipeline}
            disabled={isRunning || activePipeline.steps.length === 0}
            className="text-xs px-4 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white font-medium disabled:opacity-50 transition"
          >
            {isRunning ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Running…
              </span>
            ) : '▶ Run Pipeline'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: step palette */}
        <div className="w-48 border-r border-border bg-[#0f1117] flex flex-col shrink-0 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-border">
            Add Step
          </div>
          {(Object.keys(STEP_KIND_META) as StepKind[]).map(kind => {
            const m = STEP_KIND_META[kind]
            return (
              <button
                key={kind}
                onClick={() => addStep(kind)}
                style={{ borderLeft: `3px solid ${m.border}` }}
                className="text-left px-3 py-2.5 border-b border-border/50 hover:bg-white/5 transition flex items-center gap-2"
              >
                <span>{m.icon}</span>
                <span style={{ color: m.border }} className="text-xs font-medium">{m.label}</span>
              </button>
            )
          })}

          <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-border mt-2">
            Templates
          </div>
          {PIPELINE_TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => loadTemplate(tpl)}
              className="text-left px-3 py-2 border-b border-border/50 hover:bg-white/5 transition"
            >
              <div className="text-xs text-white font-medium">{tpl.name}</div>
              <div className="text-xs text-gray-600">{tpl.steps.length} steps</div>
            </button>
          ))}

          {/* Pipeline description */}
          <div className="px-3 py-2 mt-2">
            <div className="text-xs text-gray-500 mb-1">Description</div>
            <textarea
              className="w-full bg-[#1a1a2e] border border-border rounded px-2 py-1 text-xs text-white resize-none"
              rows={3}
              value={activePipeline.description || ''}
              onChange={e => setActivePipeline(p => p ? { ...p, description: e.target.value } : p)}
              placeholder="What does this pipeline do?"
            />
          </div>
        </div>

        {/* Center: step list */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-1.5">
          {activePipeline.steps.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-gray-600">
              <div className="text-3xl">🔀</div>
              <div className="text-sm">Add steps from the left panel</div>
            </div>
          ) : (
            activePipeline.steps.map((step, i) => (
              <StepCard
                key={step.id}
                step={step}
                index={i}
                total={activePipeline.steps.length}
                runStatus={runStepMap.get(step.id)}
                selected={selectedStepId === step.id}
                onSelect={() => setSelectedStepId(selectedStepId === step.id ? null : step.id)}
                onMove={moveStep}
                onDelete={() => deleteStep(step.id)}
              />
            ))
          )}
        </div>

        {/* Right: step editor or run status */}
        <div className="w-72 border-l border-border bg-[#0f1117] flex flex-col shrink-0 overflow-y-auto">
          {selectedStep ? (
            <div className="p-3">
              <StepEditor
                step={selectedStep}
                allStepIds={activePipeline.steps.map(s => s.id)}
                onChange={updateStep}
                onClose={() => setSelectedStepId(null)}
              />
            </div>
          ) : activeRun ? (
            <div className="flex flex-col h-full">
              <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-border flex items-center gap-2">
                <span>Run Status</span>
                {activeRun.status === 'running' && (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-auto" />
                )}
                {activeRun.status === 'done' && (
                  <span className="text-green-400 ml-auto">✓ Done</span>
                )}
                {activeRun.status === 'failed' && (
                  <span className="text-red-400 ml-auto">✗ Failed</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {activeRun.steps.map(s => (
                  <div key={s.stepId} className="flex items-start gap-2 text-xs">
                    <span style={{ color: STATUS_COLORS[s.status] }} className={`mt-0.5 ${s.status === 'running' ? 'animate-pulse' : ''}`}>
                      {STATUS_ICONS[s.status]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{s.label}</div>
                      {s.status === 'running' && (
                        <div className="text-blue-400">Running…</div>
                      )}
                      {s.status === 'done' && s.completedAt && (
                        <div className="text-gray-600">
                          {new Date(s.completedAt).toLocaleTimeString()}
                        </div>
                      )}
                      {s.error && <div className="text-red-400 truncate">{s.error}</div>}
                    </div>
                  </div>
                ))}
              </div>
              {activeRun.completedAt && (
                <div className="px-3 py-2 border-t border-border text-xs text-gray-600">
                  Completed {new Date(activeRun.completedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 text-sm text-center p-4 gap-2">
              <div className="text-2xl">←</div>
              <div>Click a step to edit it</div>
              <div className="text-xs text-gray-700">or press ▶ Run Pipeline to execute</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
