import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import os from 'os'
import { randomBytes } from 'crypto'

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw', 'workspace')
const KDE_DIR = path.join(WORKSPACE, 'knowledge', 'kde')
const LOCAL_KDE_FILE = path.join(process.cwd(), '.data', 'kde-entries.jsonl')

export interface KDEEntry {
  id: string
  title: string
  category: 'competitive-intel' | 'best-practices' | 'integration-patterns' | 'strategy-frameworks'
  content: string
  source: string
  confidence: number // 0-1
  tags: string[]
  createdAt: string
  agent?: string
}

async function loadFromJSONL(filePath: string): Promise<KDEEntry[]> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const entries: KDEEntry[] = []
    for (const line of content.split('\n').filter(l => l.trim())) {
      try {
        entries.push(JSON.parse(line))
      } catch { }
    }
    return entries
  } catch {
    return []
  }
}

async function appendToJSONL(filePath: string, entry: KDEEntry) {
  try {
    await mkdir(path.dirname(filePath), { recursive: true })
  } catch { }
  await writeFile(filePath, JSON.stringify(entry) + '\n', { flag: 'a' })
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const entries: KDEEntry[] = []
  const seen = new Set<string>()

  // Try workspace KDE directory first
  const workspaceFiles = [
    path.join(KDE_DIR, 'entries.jsonl'),
    path.join(KDE_DIR, 'competitive-intel.jsonl'),
    path.join(KDE_DIR, 'best-practices.jsonl'),
    path.join(KDE_DIR, 'integration-patterns.jsonl'),
    path.join(KDE_DIR, 'strategy-frameworks.jsonl'),
  ]

  for (const f of workspaceFiles) {
    const items = await loadFromJSONL(f)
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        entries.push(item)
      }
    }
  }

  // Also load local entries
  const localEntries = await loadFromJSONL(LOCAL_KDE_FILE)
  for (const item of localEntries) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      entries.push(item)
    }
  }

  // Sort by date descending
  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const categoryStats = entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({ entries, count: entries.length, categoryStats })
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json()
    const entry: KDEEntry = {
      id: randomBytes(8).toString('hex'),
      title: body.title || 'Untitled',
      category: body.category || 'best-practices',
      content: body.content || '',
      source: body.source || 'manual',
      confidence: typeof body.confidence === 'number' ? Math.min(1, Math.max(0, body.confidence)) : 0.8,
      tags: body.tags || [],
      createdAt: new Date().toISOString(),
      agent: body.agent,
    }

    await appendToJSONL(LOCAL_KDE_FILE, entry)
    return NextResponse.json({ ok: true, entry })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
