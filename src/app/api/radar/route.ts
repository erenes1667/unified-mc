import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import os from 'os'

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw', 'workspace')
const TAGS_FILE = path.join(process.cwd(), '.data', 'radar-tags.json')

export interface RadarItem {
  id: string
  title: string
  source: string
  sourceType: 'reddit' | 'youtube' | 'newsletter' | 'research' | 'other'
  summary: string
  date: string
  agent: string
  kdeRelevant: boolean
  tags: string[]
  raw?: string
}

function detectSourceType(text: string, source: string): RadarItem['sourceType'] {
  const t = (text + source).toLowerCase()
  if (t.includes('reddit') || t.includes('r/')) return 'reddit'
  if (t.includes('youtube') || t.includes('youtu.be')) return 'youtube'
  if (t.includes('newsletter') || t.includes('substack') || t.includes('email')) return 'newsletter'
  if (t.includes('arxiv') || t.includes('paper') || t.includes('research') || t.includes('study')) return 'research'
  return 'other'
}

function extractTitle(content: string): string {
  const lines = content.split('\n').filter(l => l.trim())
  for (const line of lines) {
    if (line.startsWith('# ')) return line.replace(/^# /, '').trim()
    if (line.startsWith('## ')) return line.replace(/^## /, '').trim()
    if (line.length > 10 && line.length < 120) return line.replace(/^[#*-] /, '').trim()
  }
  return 'Untitled'
}

function extractSummary(content: string): string {
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'))
  return lines.slice(0, 3).join(' ').slice(0, 300)
}

async function loadTags(): Promise<Record<string, { kdeRelevant: boolean; tags: string[] }>> {
  try {
    const raw = await readFile(TAGS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function scanDigests(): Promise<RadarItem[]> {
  const items: RadarItem[] = []
  const tags = await loadTags()

  // Scan agent digest directories
  const agentsDir = path.join(WORKSPACE, 'agents')
  let agentDirs: string[] = []
  try {
    const entries = await readdir(agentsDir, { withFileTypes: true })
    agentDirs = entries.filter(e => e.isDirectory()).map(e => e.name)
  } catch { return items }

  for (const agent of agentDirs) {
    const digestsPath = path.join(agentsDir, agent, 'digests')
    let files: string[] = []
    try {
      files = await readdir(digestsPath)
    } catch { continue }

    for (const file of files.filter(f => f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.json'))) {
      try {
        const filePath = path.join(digestsPath, file)
        const content = await readFile(filePath, 'utf-8')
        const id = `${agent}-${file}`
        const tagData = tags[id] || { kdeRelevant: false, tags: [] }

        if (file.endsWith('.json')) {
          try {
            const parsed = JSON.parse(content)
            const arr = Array.isArray(parsed) ? parsed : [parsed]
            for (const entry of arr) {
              const eid = `${id}-${entry.id || entry.title || Math.random()}`
              const entryTagData = tags[eid] || { kdeRelevant: false, tags: [] }
              items.push({
                id: eid,
                title: entry.title || extractTitle(JSON.stringify(entry)),
                source: entry.source || entry.url || agent,
                sourceType: detectSourceType(JSON.stringify(entry), entry.source || ''),
                summary: entry.summary || entry.description || entry.content?.slice(0, 300) || '',
                date: entry.date || entry.publishedAt || new Date().toISOString(),
                agent,
                kdeRelevant: entryTagData.kdeRelevant,
                tags: entryTagData.tags,
              })
            }
          } catch {
            // treat as text
            const stat = await import('fs').then(m => m.statSync(path.join(agentsDir, agent, 'digests', file)))
            items.push({
              id,
              title: extractTitle(content) || file,
              source: agent,
              sourceType: detectSourceType(content, agent),
              summary: extractSummary(content),
              date: stat.mtime.toISOString(),
              agent,
              kdeRelevant: tagData.kdeRelevant,
              tags: tagData.tags,
            })
          }
        } else {
          const { statSync } = await import('fs')
          const stat = statSync(path.join(agentsDir, agent, 'digests', file))
          items.push({
            id,
            title: extractTitle(content) || file,
            source: agent,
            sourceType: detectSourceType(content, file),
            summary: extractSummary(content),
            date: stat.mtime.toISOString(),
            agent,
            kdeRelevant: tagData.kdeRelevant,
            tags: tagData.tags,
          })
        }
      } catch { continue }
    }
  }

  // Also scan workspace root for any research/digest files
  const rootFiles = ['BRIEFING-FROM-CLEON-2026-03-02.md', 'research.md', 'digest.md']
  for (const f of rootFiles) {
    try {
      const filePath = path.join(WORKSPACE, f)
      const content = await readFile(filePath, 'utf-8')
      const { statSync } = await import('fs')
      const stat = statSync(filePath)
      const id = `root-${f}`
      const tagData = tags[id] || { kdeRelevant: false, tags: [] }
      items.push({
        id,
        title: extractTitle(content) || f,
        source: 'workspace',
        sourceType: detectSourceType(content, f),
        summary: extractSummary(content),
        date: stat.mtime.toISOString(),
        agent: 'system',
        kdeRelevant: tagData.kdeRelevant,
        tags: tagData.tags,
      })
    } catch { continue }
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const items = await scanDigests()
  return NextResponse.json({ items, count: items.length })
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json()
    const { id, kdeRelevant, tags } = body

    const existing = await loadTags()
    existing[id] = { kdeRelevant: !!kdeRelevant, tags: tags || [] }
    await writeFile(TAGS_FILE, JSON.stringify(existing, null, 2))

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
