import os from 'os';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

const MEMORY_DIR = path.join(os.homedir(), '.openclaw', 'workspace', 'memory');

// In-memory cache for list/tree modes — TTL 30s
const memCache = new Map<string, { data: unknown; expiresAt: number }>();
const MEM_TTL = 30_000;

interface TreeNode {
  name: string;
  path: string; // relative to MEMORY_DIR
  type: 'file' | 'dir';
  sizeKB?: number;
  date?: string;
  children?: TreeNode[];
}

async function buildTree(dir: string, relativePath = ''): Promise<TreeNode[]> {
  const nodes: TreeNode[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        const children = await buildTree(fullPath, relPath);
        nodes.push({ name: entry.name, path: relPath, type: 'dir', children });
      } else {
        const stat = await fs.stat(fullPath);
        nodes.push({
          name: entry.name,
          path: relPath,
          type: 'file',
          sizeKB: Math.round((stat.size / 1024) * 10) / 10,
          date: stat.mtime.toISOString(),
        });
      }
    }
  } catch {}
  // Sort: dirs first, then by name
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return nodes;
}

async function searchFiles(query: string): Promise<{ path: string; line: string; lineNum: number }[]> {
  const results: { path: string; line: string; lineNum: number }[] = [];
  const q = query.toLowerCase();

  async function walk(dir: string, relPath: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      const rel = relPath ? `${relPath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await walk(full, rel);
      } else {
        try {
          const content = await fs.readFile(full, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(q)) {
              results.push({ path: rel, line: lines[i].trim().slice(0, 200), lineNum: i + 1 });
              if (results.length >= 50) return;
            }
          }
        } catch {}
      }
      if (results.length >= 50) return;
    }
  }

  await walk(MEMORY_DIR, '');
  return results;
}

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get('file');
  const search = req.nextUrl.searchParams.get('search');
  const mode = req.nextUrl.searchParams.get('mode');

  // Single file mode: return full content (supports subdirectory paths)
  if (file) {
    // Sanitize: prevent path traversal
    const normalized = path.normalize(file).replace(/^(\.\.[/\\])+/, '');
    const fullPath = path.join(MEMORY_DIR, normalized);
    if (!fullPath.startsWith(MEMORY_DIR)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return NextResponse.json({ filename: path.basename(normalized), path: normalized, content });
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  }

  // Search mode
  if (search) {
    const results = await searchFiles(search);
    return NextResponse.json({ results });
  }

  // Tree mode
  if (mode === 'tree') {
    const cacheKey = 'tree';
    const now = Date.now();
    const cached = memCache.get(cacheKey);
    if (cached && now < cached.expiresAt) return NextResponse.json(cached.data);
    const tree = await buildTree(MEMORY_DIR);
    const result = { tree };
    memCache.set(cacheKey, { data: result, expiresAt: now + MEM_TTL });
    return NextResponse.json(result);
  }

  // Default list mode (backward compatible)
  const cacheKey = 'list';
  const now = Date.now();
  const cached = memCache.get(cacheKey);
  if (cached && now < cached.expiresAt) return NextResponse.json(cached.data);

  try {
    const entries = await fs.readdir(MEMORY_DIR);
    const mdFiles = entries.filter((f) => f.endsWith('.md'));

    const files = await Promise.all(
      mdFiles.map(async (filename) => {
        const filePath = path.join(MEMORY_DIR, filename);
        const stat = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim());
        return {
          filename,
          date: stat.mtime.toISOString(),
          sizeKB: Math.round((stat.size / 1024) * 10) / 10,
          firstLines: lines.slice(0, 3),
        };
      })
    );

    files.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const longTerm = files.find((f) => f.filename === 'MEMORY.md') || null;
    const daily = files.filter((f) => f.filename !== 'MEMORY.md');

    // Also get subdirectories
    const subdirs: string[] = [];
    for (const entry of entries) {
      const full = path.join(MEMORY_DIR, entry);
      try {
        const stat = await fs.stat(full);
        if (stat.isDirectory() && !entry.startsWith('.')) subdirs.push(entry);
      } catch {}
    }

    const result = { longTerm, daily, subdirs };
    memCache.set(cacheKey, { data: result, expiresAt: now + MEM_TTL });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ longTerm: null, daily: [], subdirs: [] });
  }
}
