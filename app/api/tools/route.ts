import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TOOLS = [
  { id: 'gws', name: 'gws (Google Workspace CLI)', category: 'CLI' },
  { id: 'gog', name: 'gog (Google Ops CLI)', category: 'CLI' },
  { id: 'gh', name: 'gh (GitHub CLI)', category: 'CLI' },
  { id: 'mcporter', name: 'mcporter (MCP Manager)', category: 'MCP' },
  { id: 'jcodemunch-mcp', name: 'jCodeMunch MCP', category: 'MCP' },
  { id: 'summarize', name: 'summarize', category: 'CLI' },
  { id: 'firecrawl', name: 'firecrawl', category: 'CLI' },
  { id: 'obsidian-cli', name: 'obsidian-cli', category: 'CLI' },
  { id: 'openclaw', name: 'openclaw', category: 'CLI' },
  { id: 'himalaya', name: 'himalaya (Email CLI)', category: 'CLI' },
];

async function checkTool(id: string) {
  try {
    const { stdout } = await execAsync(`which ${id}`, { timeout: 3000 });
    const path = stdout.trim();
    // try to get version
    let version: string | undefined;
    try {
      const vr = await execAsync(`${id} --version 2>/dev/null || ${id} version 2>/dev/null`, { timeout: 3000 });
      version = vr.stdout.trim().split('\n')[0] || undefined;
    } catch {}
    return { installed: true, path, version };
  } catch {
    return { installed: false, path: undefined, version: undefined };
  }
}

export async function GET() {
  const results = await Promise.all(
    TOOLS.map(async (tool) => {
      const check = await checkTool(tool.id);
      return {
        ...tool,
        ...check,
      };
    })
  );

  return NextResponse.json({ tools: results, ts: Date.now() });
}
