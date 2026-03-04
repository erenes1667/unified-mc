import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const MEMORY_DIR = '/Users/eneseren/.openclaw/workspace/memory';

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get('file');

  // Single file mode: return full content
  if (file) {
    const safe = path.basename(file);
    if (!safe.endsWith('.md')) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }
    try {
      const content = await fs.readFile(path.join(MEMORY_DIR, safe), 'utf-8');
      return NextResponse.json({ filename: safe, content });
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  }

  // List mode: return all memory files with metadata
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

    // Separate MEMORY.md (long-term) from daily files
    const longTerm = files.find((f) => f.filename === 'MEMORY.md') || null;
    const daily = files.filter((f) => f.filename !== 'MEMORY.md');

    return NextResponse.json({ longTerm, daily });
  } catch {
    return NextResponse.json({ longTerm: null, daily: [] });
  }
}
