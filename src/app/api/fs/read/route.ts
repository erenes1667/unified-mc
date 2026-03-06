import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import os from 'node:os'

const WORKSPACE_DIR = process.env.OPENCLAW_WORKSPACE || join(os.homedir(), '.openclaw', 'workspace')

function isSafe(filePath: string): boolean {
  const resolved = resolve(filePath)
  const base = resolve(WORKSPACE_DIR)
  return resolved === base || resolved.startsWith(base + sep)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const relativePath = searchParams.get('path')

  if (!relativePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
  }

  const fullPath = join(WORKSPACE_DIR, relativePath)

  if (!isSafe(fullPath)) {
    return NextResponse.json({ error: 'Access denied: path outside workspace' }, { status: 403 })
  }

  try {
    const info = await stat(fullPath)
    if (!info.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 })
    }

    const content = await readFile(fullPath, 'utf-8')
    return NextResponse.json({
      path: relativePath,
      content,
      size: info.size,
      modified: info.mtimeMs,
    })
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found', content: null }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
