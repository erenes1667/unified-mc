import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import os from 'os'
import { runClawdbot } from '@/lib/command'

const PIPELINES_DIR = join(os.homedir(), '.openclaw', 'workspace', 'pipelines')
const RUNS_DIR = join(os.homedir(), '.openclaw', 'workspace', 'pipeline-runs')

export interface StepStatus {
  stepId: string
  label: string
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
  sessionId?: string
  startedAt?: string
  completedAt?: string
  error?: string
  output?: string
}

export interface PipelineRun {
  runId: string
  pipelineId: string
  pipelineName: string
  status: 'running' | 'done' | 'failed'
  steps: StepStatus[]
  startedAt: string
  completedAt?: string
  triggeredBy: string
}

async function ensureDirs() {
  await mkdir(PIPELINES_DIR, { recursive: true })
  await mkdir(RUNS_DIR, { recursive: true })
}

async function saveRun(run: PipelineRun) {
  await mkdir(RUNS_DIR, { recursive: true })
  await writeFile(join(RUNS_DIR, `${run.runId}.json`), JSON.stringify(run, null, 2))
}

/**
 * POST /api/agent-pipelines/[id]/run - execute pipeline
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await ensureDirs()

  let pipeline: any
  try {
    const raw = await readFile(join(PIPELINES_DIR, `${id}.json`), 'utf-8')
    pipeline = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
  }

  const runId = `run-${Date.now()}`
  const run: PipelineRun = {
    runId,
    pipelineId: id,
    pipelineName: pipeline.name,
    status: 'running',
    startedAt: new Date().toISOString(),
    triggeredBy: 'ui',
    steps: (pipeline.steps || []).map((s: any) => ({
      stepId: s.id,
      label: s.label,
      status: 'pending' as const,
    })),
  }

  await saveRun(run)

  // Run async — don't await
  executeRun(run, pipeline.steps || []).catch(() => {})

  return NextResponse.json({ runId, status: 'running' }, { status: 202 })
}

async function executeRun(run: PipelineRun, steps: any[]) {
  const update = async (stepId: string, patch: Partial<StepStatus>) => {
    const idx = run.steps.findIndex(s => s.stepId === stepId)
    if (idx >= 0) run.steps[idx] = { ...run.steps[idx], ...patch }
    await saveRun(run)
  }

  try {
    // Process steps sequentially, handling parallel forks
    for (const step of steps) {
      await update(step.id, { status: 'running', startedAt: new Date().toISOString() })

      try {
        if (step.kind === 'spawn' && step.agent && step.task) {
          const spawnPayload = {
            task: step.task,
            label: `${step.agent}: ${step.label}`,
            runTimeoutSeconds: step.timeout || 300,
          }
          const commandArg = `sessions_spawn(${JSON.stringify(spawnPayload)})`
          const { stdout } = await runClawdbot(['-c', commandArg], { timeoutMs: (step.timeout || 300) * 1000 + 5000 })
          await update(step.id, {
            status: 'done',
            completedAt: new Date().toISOString(),
            output: stdout?.slice(0, 500) || 'Spawned',
          })
        } else if (step.kind === 'wait') {
          const ms = (step.timeout || 5) * 1000
          await new Promise(r => setTimeout(r, Math.min(ms, 30000)))
          await update(step.id, { status: 'done', completedAt: new Date().toISOString() })
        } else if (step.kind === 'condition') {
          // Condition is always true in the API (evaluation is client-side)
          await update(step.id, { status: 'done', completedAt: new Date().toISOString() })
        } else if (step.kind === 'parallel') {
          // Fire branches simultaneously
          const branchSteps = step.branches || []
          await Promise.all(branchSteps.map((branch: any[]) => executeRun({ ...run, steps: [] }, branch)))
          await update(step.id, { status: 'done', completedAt: new Date().toISOString() })
        } else {
          await update(step.id, { status: 'done', completedAt: new Date().toISOString() })
        }
      } catch (err) {
        await update(step.id, {
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: String(err),
        })
        run.status = 'failed'
        run.completedAt = new Date().toISOString()
        await saveRun(run)
        return
      }
    }

    run.status = 'done'
    run.completedAt = new Date().toISOString()
    await saveRun(run)
  } catch (err) {
    run.status = 'failed'
    run.completedAt = new Date().toISOString()
    await saveRun(run)
  }
}
