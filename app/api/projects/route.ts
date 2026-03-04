import os from 'os';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import fss from 'fs';
import path from 'path';

const PROJECTS_DIR = path.join(os.homedir(), '.openclaw', 'workspace', 'projects');

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const detail = searchParams.get('name');

  // Detail view for a single project
  if (detail) {
    const dirPath = path.join(PROJECTS_DIR, detail);
    if (!fss.existsSync(dirPath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const files = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
    const stat = await fs.stat(dirPath);

    let readme = '';
    try { readme = await fs.readFile(path.join(dirPath, 'README.md'), 'utf-8'); } catch {}

    // Check for package.json (launchable)
    let packageJson = null;
    try {
      const pkg = await fs.readFile(path.join(dirPath, 'package.json'), 'utf-8');
      packageJson = JSON.parse(pkg);
    } catch {}

    // Check for .env or config files
    const hasEnv = fss.existsSync(path.join(dirPath, '.env')) || fss.existsSync(path.join(dirPath, '.env.local'));

    // Check for Railway/Vercel deployment
    let deployUrl = null;
    try {
      const railwayJson = await fs.readFile(path.join(dirPath, 'railway.json'), 'utf-8');
      const rj = JSON.parse(railwayJson);
      if (rj.deploy?.url) deployUrl = rj.deploy.url;
    } catch {}
    // Also check for CNAME or vercel.json
    try {
      const vj = await fs.readFile(path.join(dirPath, 'vercel.json'), 'utf-8');
      const parsed = JSON.parse(vj);
      if (parsed.alias) deployUrl = `https://${Array.isArray(parsed.alias) ? parsed.alias[0] : parsed.alias}`;
    } catch {}

    const fileList = files.map(f => ({
      name: f.name,
      isDir: f.isDirectory(),
    })).sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      name: detail,
      path: dirPath,
      readme,
      fileCount: files.length,
      files: fileList,
      lastModified: stat.mtime.toISOString(),
      packageJson: packageJson ? { name: packageJson.name, scripts: Object.keys(packageJson.scripts || {}), dependencies: Object.keys(packageJson.dependencies || {}).length } : null,
      hasEnv,
      deployUrl,
      launchable: !!(packageJson?.scripts?.dev || packageJson?.scripts?.start),
      launchPort: null, // Could be detected from scripts
    });
  }

  // List all projects
  try {
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_'));

    const projects = await Promise.all(dirs.map(async dir => {
      const dirPath = path.join(PROJECTS_DIR, dir.name);
      const files = await fs.readdir(dirPath).catch(() => []);
      const stat = await fs.stat(dirPath);

      let hasReadme = false;
      let readmePreview: string[] = [];
      try {
        const readme = await fs.readFile(path.join(dirPath, 'README.md'), 'utf-8');
        hasReadme = true;
        readmePreview = readme.split('\n').filter(l => l.trim()).slice(0, 3);
      } catch {}

      let launchable = false;
      try {
        const pkg = await fs.readFile(path.join(dirPath, 'package.json'), 'utf-8');
        const pj = JSON.parse(pkg);
        launchable = !!(pj.scripts?.dev || pj.scripts?.start);
      } catch {}

      return {
        name: dir.name, hasReadme, readmePreview, fileCount: files.length,
        lastModified: stat.mtime.toISOString(), launchable,
      };
    }));

    projects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json({ projects: [] });
  }
}
