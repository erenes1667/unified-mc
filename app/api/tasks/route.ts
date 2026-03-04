import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const DATA_FILE = path.join(os.homedir(), '.openclaw', 'workspace', 'projects', 'unified-mc', 'data', 'projects.json');

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}

function readProjects() {
  ensureDataDir();
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); }
  catch { return []; }
}

function writeProjects(data: unknown) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  return NextResponse.json(readProjects());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const projects = readProjects();
  const newProject = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: body.name || 'Untitled Project',
    description: body.description || '',
    priority: body.priority || 'P2',
    status: body.status || 'planning',
    mrr: body.mrr ?? null,
    mrrPotential: body.mrrPotential ?? null,
    owner: body.owner || 'You',
    milestones: body.milestones || [],
    tags: body.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.push(newProject);
  writeProjects(projects);
  return NextResponse.json(newProject, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const projects = readProjects();
  const idx = projects.findIndex((p: { id: string }) => p.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  projects[idx] = { ...projects[idx], ...body, updatedAt: new Date().toISOString() };
  writeProjects(projects);
  return NextResponse.json(projects[idx]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  let projects = readProjects();
  projects = projects.filter((p: { id: string }) => p.id !== id);
  writeProjects(projects);
  return NextResponse.json({ ok: true });
}
