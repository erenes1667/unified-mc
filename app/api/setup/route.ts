import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

async function run(cmd: string): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 5000 });
    return { stdout: stdout.trim(), stderr: stderr.trim(), ok: true };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string };
    return { stdout: err.stdout?.trim() || '', stderr: err.stderr?.trim() || '', ok: false };
  }
}

export async function GET() {
  const results: Record<string, {
    name: string;
    status: 'ok' | 'missing' | 'error';
    version?: string;
    detail?: string;
    install?: string;
  }> = {};

  // 1. OpenClaw Gateway
  try {
    const res = await fetch('http://localhost:18789/api/status', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      results.gateway = { name: 'OpenClaw Gateway', status: 'ok', detail: 'Running on localhost:18789' };
    } else {
      results.gateway = { name: 'OpenClaw Gateway', status: 'error', detail: `HTTP ${res.status}`, install: 'openclaw gateway start' };
    }
  } catch {
    results.gateway = { name: 'OpenClaw Gateway', status: 'missing', detail: 'Not reachable on localhost:18789', install: 'openclaw gateway start' };
  }

  // 2. gws CLI
  const gwsWhich = await run('which gws');
  if (gwsWhich.ok) {
    const gwsVersion = await run('gws --version 2>/dev/null || gws version 2>/dev/null || echo "unknown"');
    const gwsAuth = await run('gws auth status 2>/dev/null || echo "unknown"');
    results.gws = {
      name: 'gws CLI (Google Workspace)',
      status: 'ok',
      version: gwsVersion.stdout || undefined,
      detail: gwsAuth.stdout.includes('unknown') ? 'Auth status unknown' : gwsAuth.stdout.slice(0, 100),
    };
  } else {
    results.gws = { name: 'gws CLI (Google Workspace)', status: 'missing', install: 'npm install -g @openclaw/gws' };
  }

  // 3. jCodeMunch MCP
  const jcmWhich = await run('which jcodemunch-mcp');
  if (jcmWhich.ok) {
    const jcmVersion = await run('jcodemunch-mcp --version 2>/dev/null || echo "unknown"');
    results.jcodemunch = { name: 'jCodeMunch MCP', status: 'ok', version: jcmVersion.stdout || undefined, detail: jcmWhich.stdout };
  } else {
    results.jcodemunch = { name: 'jCodeMunch MCP', status: 'missing', install: 'npm install -g jcodemunch-mcp' };
  }

  // 4. GitHub Agentic Workflows
  const ghExt = await run('gh extension list 2>/dev/null');
  if (ghExt.ok && ghExt.stdout.includes('aw')) {
    results.ghaw = { name: 'GitHub Agentic Workflows (gh aw)', status: 'ok', detail: 'Extension installed' };
  } else if (ghExt.ok) {
    results.ghaw = { name: 'GitHub Agentic Workflows (gh aw)', status: 'missing', detail: 'gh extension not found', install: 'gh extension install github/gh-agentic-workflows' };
  } else {
    results.ghaw = { name: 'GitHub Agentic Workflows (gh aw)', status: 'error', detail: 'gh CLI not available or error', install: 'brew install gh && gh extension install github/gh-agentic-workflows' };
  }

  // 5. Harvest API
  const harvestToken = process.env.HARVEST_TOKEN || process.env.HARVEST_ACCESS_TOKEN;
  const harvestId = process.env.HARVEST_ACCOUNT_ID;
  if (harvestToken && harvestId) {
    results.harvest = { name: 'Harvest API', status: 'ok', detail: `Token configured, account ID: ${harvestId}` };
  } else {
    results.harvest = { name: 'Harvest API', status: 'missing', detail: 'HARVEST_TOKEN / HARVEST_ACCOUNT_ID not set', install: 'export HARVEST_TOKEN=... && export HARVEST_ACCOUNT_ID=...' };
  }

  // 6. Dayflow SQLite
  const dayflowPath = path.join(os.homedir(), 'Library', 'Application Support', 'Dayflow', 'chunks.sqlite');
  if (fs.existsSync(dayflowPath)) {
    const stat = fs.statSync(dayflowPath);
    results.dayflow = { name: 'Dayflow', status: 'ok', detail: `DB at ${dayflowPath} (${(stat.size / 1024).toFixed(1)} KB)` };
  } else {
    results.dayflow = { name: 'Dayflow', status: 'missing', detail: `SQLite not found at ${dayflowPath}`, install: 'Install Dayflow from https://dayflow.app' };
  }

  return NextResponse.json({ checks: results, ts: Date.now() });
}
