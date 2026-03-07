import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { join, resolve, sep, relative } from 'node:path'
import { stat } from 'node:fs/promises'
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
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  try {
    const { stdout } = await execAsync(
      `find "${WORKSPACE_DIR}" -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" | xargs ls -t 2>/dev/null | head -${limit}`,
      { timeout: 10000 }
    )

    const files = stdout.trim().split('\n').filter(Boolean)

    const results = await Promise.all(
      files.map(async (filePath) => {
        if (!isSafe(filePath)) return null
        try {
          const info = await stat(filePath)
          return {
            path: relative(WORKSPACE_DIR, filePath),
            name: filePath.split('/').pop() || filePath,
            modified: info.mtimeMs,
            size: info.size,
          }
        } catch {
          return null
        }
      })
    )

    return NextResponse.json({
      files: results.filter(Boolean),
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to list recent files', details: err.message }, { status: 500 })
  }
}
