import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const AGENTS_DIR = '/Users/eneseren/.openclaw/workspace/agents';

// Hardcoded agent metadata
const AGENT_META: Record<
  string,
  { role: string; model: string; pronouns?: string }
> = {
  cleon: { role: 'Emperor', model: 'opus-4.6' },
  mickey17: { role: 'Ops', model: 'opus-4.6' },
  forge: { role: 'Dev', model: 'sonnet-4.6' },
  raven: { role: 'Email', model: 'sonnet-4.6' },
  whisper: { role: 'Research', model: 'gemini-flash' },
  kimi: { role: 'Design', model: 'kimi-k2.5' },
  sentinel: { role: 'Ops', model: 'sonnet-4.6' },
  varys: { role: 'Email Lead', model: 'sonnet-4.6' },
  demerzel: { role: 'Dev Intel', model: 'sonnet-4.6', pronouns: 'she/her' },
  codex: { role: 'Coding', model: 'codex' },
};

export async function GET() {
  const agents: {
    id: string;
    role: string;
    model: string;
    description: string;
    pronouns?: string;
  }[] = [];

  for (const [id, meta] of Object.entries(AGENT_META)) {
    let description = '';
    const soulPath = path.join(AGENTS_DIR, id, 'SOUL.md');
    try {
      if (fs.existsSync(soulPath)) {
        const raw = fs.readFileSync(soulPath, 'utf-8');
        // Grab first paragraph after the title
        const lines = raw.split('\n').filter((l) => l.trim() !== '');
        const descLine = lines.find(
          (l) => !l.startsWith('#') && !l.startsWith('*') && l.length > 10
        );
        description = descLine?.trim() || '';
      }
    } catch {
      // Ignore read errors
    }

    agents.push({
      id,
      role: meta.role,
      model: meta.model,
      description,
      ...(meta.pronouns ? { pronouns: meta.pronouns } : {}),
    });
  }

  return NextResponse.json({ agents });
}
