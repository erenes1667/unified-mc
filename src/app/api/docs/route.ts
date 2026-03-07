import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, resolve, sep, relative, extname } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'

const execAsync = promisify(exec)
const WORKSPACE_DIR = process.env.OPENCLAW_WORKSPACE || join(os.homedir(), '.openclaw', 'workspace')
const DOCS_DIR = join(WORKSPACE_DIR, 'docs')

function isSafe(filePath: string): boolean {
  const resolved = resolve(filePath)
  const base = resolve(DOCS_DIR)
  return resolved === base || resolved.startsWith(base + sep)
}

interface DocFile {
  path: string
  name: string
  title: string
  tags: string[]
  size: number
  modified: number
  excerpt?: string
}

function extractFrontmatter(content: string): { title?: string; tags?: string[] } {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const fm: { title?: string; tags?: string[] } = {}
  const lines = match[1].split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split(':')
    const value = rest.join(':').trim()
    if (key.trim() === 'title') fm.title = value.replace(/^["']|["']$/g, '')
    if (key.trim() === 'tags') {
      fm.tags = value.replace(/[\[\]]/g, '').split(',').map(t => t.trim()).filter(Boolean)
    }
  }
  return fm
}

function inferTagsFromPath(filePath: string): string[] {
  const parts = filePath.split('/')
  return parts.slice(0, -1).filter(p => p && p !== 'docs')
}

async function scanDocs(dir: string): Promise<DocFile[]> {
  const docs: DocFile[] = []
  try {
    const entries = await readdir(dir)
    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      const fullPath = join(dir, entry)
      if (!isSafe(fullPath)) continue
      try {
        const info = await stat(fullPath)
        if (info.isDirectory()) {
          const sub = await scanDocs(fullPath)
          docs.push(...sub)
        } else if (extname(entry) === '.md' || extname(entry) === '.mdx') {
          const content = await readFile(fullPath, 'utf-8')
          const fm = extractFrontmatter(content)
          const relPath = relative(DOCS_DIR, fullPath)
          const inferredTags = inferTagsFromPath(relPath)
          // Extract first non-frontmatter line as excerpt
          const body = content.replace(/^---[\s\S]*?---\n/, '').trim()
          const firstLine = body.split('\n').find(l => l.trim() && !l.startsWith('#'))
          docs.push({
            path: relPath,
            name: entry,
            title: fm.title || entry.replace(/\.mdx?$/, '').replace(/[-_]/g, ' '),
            tags: [...(fm.tags || []), ...inferredTags].filter((t, i, a) => a.indexOf(t) === i),
            size: info.size,
            modified: info.mtimeMs,
            excerpt: firstLine?.slice(0, 120),
          })
        }
      } catch {
        // skip
      }
    }
  } catch {
    // docs dir may not exist
  }
  return docs
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'list'
  const query = searchParams.get('q')
  const tag = searchParams.get('tag')
  const filePath = searchParams.get('path')

  if (action === 'read' && filePath) {
    const fullPath = join(DOCS_DIR, filePath)
    if (!isSafe(fullPath)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    try {
      const content = await readFile(fullPath, 'utf-8')
      const info = await stat(fullPath)
      return NextResponse.json({ path: filePath, content, size: info.size, modified: info.mtimeMs })
    } catch (err: any) {
      if (err.code === 'ENOENT') return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ error: 'Read failed' }, { status: 500 })
    }
  }

  if (action === 'search' && query) {
    try {
      const safeQuery = query.replace(/'/g, "'\\''")
      const { stdout } = await execAsync(
        `find "${DOCS_DIR}" -name "*.md" -o -name "*.mdx" 2>/dev/null | xargs grep -li '${safeQuery}' 2>/dev/null | head -30`,
        { timeout: 8000 }
      )
      const files = stdout.trim().split('\n').filter(Boolean)
      const results = await Promise.all(files.map(async (f) => {
        if (!isSafe(f)) return null
        try {
          const content = await readFile(f, 'utf-8')
          const info = await stat(f)
          const fm = extractFrontmatter(content)
          const relPath = relative(DOCS_DIR, f)
          const { stdout: grepOut } = await execAsync(
            `grep -n -m 2 -i '${safeQuery}' "${f}" 2>/dev/null`,
            { timeout: 2000 }
          ).catch(() => ({ stdout: '' }))
          return {
            path: relPath,
            name: f.split('/').pop()!,
            title: fm.title || relPath.replace(/\.mdx?$/, ''),
            snippets: grepOut.trim().split('\n').filter(Boolean).slice(0, 2),
            modified: info.mtimeMs,
          }
        } catch { return null }
      }))
      return NextResponse.json({ results: results.filter(Boolean), query })
    } catch (err: any) {
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }
  }

  // Default: list all docs
  const allDocs = await scanDocs(DOCS_DIR)

  let filtered = allDocs
  if (tag) filtered = filtered.filter(d => d.tags.includes(tag))

  const allTags = [...new Set(allDocs.flatMap(d => d.tags))].sort()

  return NextResponse.json({
    docs: filtered.sort((a, b) => b.modified - a.modified),
    tags: allTags,
    total: filtered.length,
  })
}
