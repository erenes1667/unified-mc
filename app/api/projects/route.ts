import os from 'os';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const PROJECTS_DIR = path.join(os.homedir(), '.openclaw', 'workspace', 'projects');

export async function GET() {
  try {
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_'));

    const projects = await Promise.all(
      dirs.map(async (dir) => {
        const dirPath = path.join(PROJECTS_DIR, dir.name);
        const files = await fs.readdir(dirPath).catch(() => []);
        const stat = await fs.stat(dirPath);

        let hasReadme = false;
        let readmePreview: string[] = [];
        try {
          const readme = await fs.readFile(path.join(dirPath, 'README.md'), 'utf-8');
          hasReadme = true;
          readmePreview = readme
            .split('\n')
            .filter((l) => l.trim())
            .slice(0, 3);
        } catch {
          // no README
        }

        return {
          name: dir.name,
          hasReadme,
          readmePreview,
          fileCount: files.length,
          lastModified: stat.mtime.toISOString(),
        };
      })
    );

    projects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json({ projects: [] });
  }
}
