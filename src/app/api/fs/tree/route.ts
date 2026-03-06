import { NextRequest, NextResponse } from 'next/server'
import { readdir, stat } from 'node:fs/promises'
import { join, resolve, sep, relative } from 'node:path'
import os from 'node:os'

const WORKSPACE_DIR = process.env.OPENCLAW_WORKSPACE || join(os.homedir(), '.openclaw', 'workspace')

function isSafe(filePath: string): boolean {
  const resolved = resolve(filePath)
  const base = resolve(WORKSPACE_DIR)
  return resolved === base || resolved.startsWith(base + sep)
}

interface FileNode {
  path: string
  name: string
  type: 'file' | 'directory'
  size?: number
  modified?: number
  children?: FileNode[]
}

async function buildTree(dir: string, depth: number = 0, maxDepth: number = 3): Promise<FileNode[]> {
  if (depth > maxDepth) return []
  if (!isSafe(dir)) return []

  try {
    const entries = await readdir(dir)
    const nodes: FileNode[] = []

    for (const entry of entries) {
      if (entry.startsWith('.') && depth === 0) continue
      if (['node_modules', '.git', '__pycache__'].includes(entry)) continue

      const fullPath = join(dir, entry)
      if (!isSafe(fullPath)) continue

      try {
        const info = await stat(fullPath)
        if (info.isDirectory()) {
          const children = depth < maxDepth ? await buildTree(fullPath, depth + 1, maxDepth) : []
          nodes.push({
            path: relative(WORKSPACE_DIR, fullPath),
            name: entry,
            type: 'directory',
            modified: info.mtimeMs,
            children,
          })
        } else {
          nodes.push({
            path: relative(WORKSPACE_DIR, fullPath),
            name: entry,
            type: 'file',
            size: info.size,
            modified: info.mtimeMs,
          })
        }
      } catch {
        // skip
      }
    }

    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subdir = searchParams.get('dir') || ''
  const maxDepth = Math.min(parseInt(searchParams.get('depth') || '3'), 5)

  const rootDir = subdir ? join(WORKSPACE_DIR, subdir) : WORKSPACE_DIR
  if (!isSafe(rootDir)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const tree = await buildTree(rootDir, 0, maxDepth)
  return NextResponse.json({ tree, root: subdir || '/' })
}
