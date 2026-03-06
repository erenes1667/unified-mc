import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import os from 'os'

const PIPELINES_DIR = join(os.homedir(), '.openclaw', 'workspace', 'pipelines')

function filePath(id: string) {
  return join(PIPELINES_DIR, `${id}.json`)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const raw = await readFile(filePath(id), 'utf-8')
    return NextResponse.json({ pipeline: JSON.parse(raw) })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const existing = JSON.parse(await readFile(filePath(id), 'utf-8'))
    const body = await request.json()
    const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() }
    await writeFile(filePath(id), JSON.stringify(updated, null, 2))
    return NextResponse.json({ pipeline: updated })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await unlink(filePath(id))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
