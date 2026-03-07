import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface ClientActivity {
  client: string;
  emails_24h?: number;
  recent_campaigns?: string[];
  last_contact?: string; // ISO string
  status?: string;
  [key: string]: unknown;
}

export async function GET() {
  const dir = path.join(os.homedir(), '.openclaw', 'workspace', 'memory', 'client-activity');
  const clients: (ClientActivity & { stale: boolean })[] = [];

  if (!fs.existsSync(dir)) {
    return NextResponse.json({ clients: [], ts: Date.now(), message: 'No client-activity directory found' });
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const data = JSON.parse(raw) as ClientActivity;

      // Derive client name from filename if not in data
      if (!data.client) {
        data.client = path.basename(file, '.json').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }

      const lastContact = data.last_contact ? new Date(data.last_contact).getTime() : 0;
      const stale = !lastContact || (now - lastContact) > sevenDays;

      clients.push({ ...data, stale });
    } catch {
      // skip malformed files
    }
  }

  // Sort: active first, then by last_contact desc
  clients.sort((a, b) => {
    if (a.stale !== b.stale) return a.stale ? 1 : -1;
    const aTime = a.last_contact ? new Date(a.last_contact).getTime() : 0;
    const bTime = b.last_contact ? new Date(b.last_contact).getTime() : 0;
    return bTime - aTime;
  });

  return NextResponse.json({ clients, ts: Date.now() });
}
