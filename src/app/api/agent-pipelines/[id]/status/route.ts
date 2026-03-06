import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import os from 'os'

const RUNS_DIR = join(os.homedir(), '.openclaw', 'workspace', 'pipeline-runs')

/**
 * GET /api/agent-pipelines/[id]/status?runId=xxx
 * Returns the most recent run for the pipeline (or a specific runId)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get('runId')

  try {
    if (runId) {
      const raw = await readFile(join(RUNS_DIR, `${runId}.json`), 'utf-8')
      return NextResponse.json(JSON.parse(raw))
    }

    // Find the most recent run for this pipeline
    const files = await readdir(RUNS_DIR).catch(() => [])
    const runs: any[] = []
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const raw = await readFile(join(RUNS_DIR, file), 'utf-8')
        const run = JSON.parse(raw)
        if (run.pipelineId === id) runs.push(run)
      } catch {}
    }
    if (runs.length === 0) return NextResponse.json({ error: 'No runs found' }, { status: 404 })
    runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    return NextResponse.json(runs[0])
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
