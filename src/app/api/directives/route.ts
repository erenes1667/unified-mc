import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import os from 'os'

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw', 'workspace')
const OVERRIDES_FILE = path.join(process.cwd(), '.data', 'directives-overrides.json')

const DYNASTY_AGENTS = ['cleon', 'mickey17', 'forge', 'raven', 'whisper', 'kimi', 'sentinel', 'varys', 'demerzel', 'system']

export interface Directive {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'done'
  priority: 'high' | 'medium' | 'low'
  assignee: string
  source: string
  date: string
}

async function loadOverrides(): Promise<Record<string, Partial<Directive>>> {
  try {
    const raw = await readFile(OVERRIDES_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function parseDirectivesFromMarkdown(content: string, source: string): Omit<Directive, 'status' | 'assignee'>[] {
  const directives: Omit<Directive, 'status' | 'assignee'>[] = []
  const lines = content.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    
    // Look for directive markers
    const directivePatterns = [
      /^(?:#+\s+)?(?:DIRECTIVE|TASK|TODO|ACTION|PRIORITY)\s*[:\-–]\s*(.+)/i,
      /^[-*]\s+\*\*(.+?)\*\*(?:\s*[-–:]\s*(.+))?/,
      /^#+\s+(.+)/,  // any heading
    ]

    for (const pattern of directivePatterns) {
      const match = line.match(pattern)
      if (match) {
        const title = match[1].replace(/\*\*/g, '').trim()
        if (title.length < 5 || title.length > 200) break

        // Gather description from following lines
        const descLines: string[] = match[2] ? [match[2]] : []
        let j = i + 1
        while (j < lines.length && j < i + 5) {
          const dl = lines[j].trim()
          if (!dl || dl.startsWith('#') || dl.match(/^[-*]\s+\*\*/)) break
          if (dl.length > 10) descLines.push(dl)
          j++
        }

        // Detect priority
        let priority: 'high' | 'medium' | 'low' = 'medium'
        const titleLower = title.toLowerCase()
        const descText = descLines.join(' ').toLowerCase()
        if (titleLower.includes('urgent') || titleLower.includes('critical') || titleLower.includes('priority #1') || descText.includes('priority: high')) priority = 'high'
        else if (titleLower.includes('low priority') || descText.includes('priority: low')) priority = 'low'

        const id = `${source}-${Buffer.from(title).toString('base64').slice(0, 16)}`

        directives.push({
          id,
          title,
          description: descLines.join(' ').slice(0, 400),
          priority,
          source,
          date: new Date().toISOString(),
        })
        break
      }
    }
    i++
  }

  return directives
}

async function scanDirectives(): Promise<Directive[]> {
  const overrides = await loadOverrides()
  const allDirectives: Directive[] = []
  const seen = new Set<string>()

  // Files to scan
  const filesToScan: Array<{ filePath: string; source: string }> = []

  // Workspace root files
  const rootPatterns = [
    'FROM-BIG-D.md', 'DIRECTIVES.md', 'TASKS.md', 'PRIORITIES.md',
    'BRIEFING-FROM-CLEON-2026-03-02.md', 'BRIEFING.md', 'MISSION.md',
  ]
  for (const f of rootPatterns) {
    filesToScan.push({ filePath: path.join(WORKSPACE, f), source: f.replace('.md', '') })
  }

  // Agent memory files - look for directives
  const agentsDir = path.join(WORKSPACE, 'agents')
  try {
    const agentDirs = await readdir(agentsDir, { withFileTypes: true })
    for (const d of agentDirs.filter(e => e.isDirectory())) {
      const agent = d.name
      const memFile = path.join(agentsDir, agent, 'MEMORY.md')
      filesToScan.push({ filePath: memFile, source: `${agent}/MEMORY` })
      
      // Also check specs directory
      const specsDir = path.join(agentsDir, agent, 'specs')
      try {
        const specs = await readdir(specsDir)
        for (const s of specs.filter(f => f.endsWith('.md')).slice(0, 3)) {
          filesToScan.push({ filePath: path.join(specsDir, s), source: `${agent}/${s.replace('.md', '')}` })
        }
      } catch { }
    }
  } catch { }

  for (const { filePath, source } of filesToScan) {
    try {
      const content = await readFile(filePath, 'utf-8')
      const parsed = parseDirectivesFromMarkdown(content, source)

      for (const d of parsed) {
        if (seen.has(d.id)) continue
        seen.add(d.id)

        const override = overrides[d.id] || {}

        // Detect assignee from source or content
        let assignee = 'unassigned'
        for (const agent of DYNASTY_AGENTS) {
          if (source.toLowerCase().includes(agent) || d.title.toLowerCase().includes(agent) || d.description.toLowerCase().includes(agent)) {
            assignee = agent
            break
          }
        }

        // Detect status from content
        let status: 'pending' | 'in-progress' | 'done' = 'pending'
        const combined = (d.title + ' ' + d.description).toLowerCase()
        if (combined.includes('done') || combined.includes('completed') || combined.includes('✅') || combined.includes('fixed') || combined.includes('shipped')) status = 'done'
        else if (combined.includes('in progress') || combined.includes('working') || combined.includes('building') || combined.includes('wip')) status = 'in-progress'

        allDirectives.push({
          ...d,
          status: (override.status as Directive['status']) || status,
          assignee: override.assignee || assignee,
          priority: (override.priority as Directive['priority']) || d.priority,
        })
      }
    } catch { continue }
  }

  // Limit to most relevant (max 100)
  return allDirectives.slice(0, 100)
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const directives = await scanDirectives()
  const stats = {
    total: directives.length,
    pending: directives.filter(d => d.status === 'pending').length,
    inProgress: directives.filter(d => d.status === 'in-progress').length,
    done: directives.filter(d => d.status === 'done').length,
  }

  return NextResponse.json({ directives, stats })
}

export async function PATCH(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json()
    const { id, ...updates } = body

    const overrides = await loadOverrides()
    overrides[id] = { ...(overrides[id] || {}), ...updates }
    await writeFile(OVERRIDES_FILE, JSON.stringify(overrides, null, 2))

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
