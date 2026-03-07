import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { join, resolve, sep, relative } from 'node:path'
import os from 'node:os'

const execAsync = promisify(exec)
const WORKSPACE_DIR = process.env.OPENCLAW_WORKSPACE || join(os.homedir(), '.openclaw', 'workspace')

function isSafe(filePath: string): boolean {
  const resolved = resolve(filePath)
  const base = resolve(WORKSPACE_DIR)
  return resolved === base || resolved.startsWith(base + sep)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const subdir = searchParams.get('dir') || ''

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 })
  }

  const searchDir = subdir ? join(WORKSPACE_DIR, subdir) : WORKSPACE_DIR

  if (!isSafe(searchDir)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const safeQuery = query.replace(/'/g, "'\\''")
    const { stdout } = await execAsync(
      `grep -rli --include="*.md" '${safeQuery}' "${searchDir}" 2>/dev/null | head -50`,
      { timeout: 10000 }
    )

    const files = stdout.trim().split('\n').filter(Boolean)

    // Get snippets for each file
    const results = await Promise.all(
      files.slice(0, 20).map(async (filePath) => {
        if (!isSafe(filePath)) return null
        try {
          const { stdout: grepOut } = await execAsync(
            `grep -n -m 3 -i '${safeQuery}' "${filePath}" 2>/dev/null`,
            { timeout: 3000 }
          )
          const snippets = grepOut.trim().split('\n').filter(Boolean).slice(0, 3)
          return {
            path: relative(WORKSPACE_DIR, filePath),
            name: filePath.split('/').pop() || filePath,
            matches: snippets.length,
            snippets,
          }
        } catch {
          return {
            path: relative(WORKSPACE_DIR, filePath),
            name: filePath.split('/').pop() || filePath,
            matches: 1,
            snippets: [],
          }
        }
      })
    )

    return NextResponse.json({
      query,
      results: results.filter(Boolean),
      total: files.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Search failed', details: err.message }, { status: 500 })
  }
}
