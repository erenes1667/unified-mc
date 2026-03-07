import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import os from 'os'

const PIPELINES_DIR = join(os.homedir(), '.openclaw', 'workspace', 'pipelines')

async function ensureDir() {
  await mkdir(PIPELINES_DIR, { recursive: true })
}

export interface AgentPipelineStep {
  id: string
  kind: 'spawn' | 'wait' | 'condition' | 'parallel'
  agent?: string
  task?: string
  timeout?: number
  dependsOn?: string[]
  condition?: string
  branches?: AgentPipelineStep[][]
  label: string
}

export interface AgentPipeline {
  id: string
  name: string
  description?: string
  steps: AgentPipelineStep[]
  createdAt: string
  updatedAt: string
}

/**
 * GET /api/agent-pipelines - list all pipelines
 */
export async function GET() {
  await ensureDir()
  try {
    const files = await readdir(PIPELINES_DIR)
    const jsonFiles = files.filter(f => f.endsWith('.json'))
    const pipelines: AgentPipeline[] = []
    for (const file of jsonFiles) {
      try {
        const raw = await readFile(join(PIPELINES_DIR, file), 'utf-8')
        pipelines.push(JSON.parse(raw))
      } catch {}
    }
    return NextResponse.json({ pipelines: pipelines.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * POST /api/agent-pipelines - save/create pipeline
 */
export async function POST(request: NextRequest) {
  await ensureDir()
  try {
    const body = await request.json()
    const now = new Date().toISOString()
    const pipeline: AgentPipeline = {
      id: body.id || `pipeline-${Date.now()}`,
      name: body.name || 'Untitled Pipeline',
      description: body.description,
      steps: body.steps || [],
      createdAt: body.createdAt || now,
      updatedAt: now,
    }
    await writeFile(join(PIPELINES_DIR, `${pipeline.id}.json`), JSON.stringify(pipeline, null, 2))
    return NextResponse.json({ pipeline }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
