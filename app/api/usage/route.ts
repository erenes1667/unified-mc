import os from 'os';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const HOME = os.homedir();
const AUTH_PROFILES = path.join(HOME, '.openclaw', 'auth-profiles.json');
const GATEWAY_LOG = path.join(HOME, '.openclaw', 'logs', 'gateway.log');

// Cost per 1M tokens (approximate, input/output)
const COST_TABLE: Record<string, { input: number; output: number }> = {
  anthropic: { input: 3.0, output: 15.0 },
  'google-gemini-cli': { input: 0.0, output: 0.0 },
  ollama: { input: 0.0, output: 0.0 },
  openai: { input: 2.5, output: 10.0 },
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Claude (Anthropic)',
  'google-gemini-cli': 'Gemini (Google)',
  ollama: 'Ollama (Local/Cloud)',
  openai: 'GPT (OpenAI)',
};

interface ProviderInfo {
  name: string;
  provider: string;
  active: boolean;
  costPerMInput: number;
  costPerMOutput: number;
}

function getProviders(): ProviderInfo[] {
  try {
    const raw = JSON.parse(fs.readFileSync(AUTH_PROFILES, 'utf-8'));
    const providers: ProviderInfo[] = [];
    const seen = new Set<string>();

    for (const [key, val] of Object.entries(raw)) {
      if (key === 'profiles') {
        // Nested profiles (e.g., google-gemini-cli)
        for (const [pKey, pVal] of Object.entries(val as Record<string, { provider?: string }>)) {
          const prov = pVal?.provider || pKey.split(':')[0];
          if (!seen.has(prov)) {
            seen.add(prov);
            const costs = COST_TABLE[prov] || { input: 0, output: 0 };
            providers.push({
              name: PROVIDER_LABELS[prov] || prov,
              provider: prov,
              active: true,
              costPerMInput: costs.input,
              costPerMOutput: costs.output,
            });
          }
        }
        continue;
      }
      const entry = val as { provider?: string };
      const prov = entry?.provider || key.split(':')[0];
      if (!seen.has(prov)) {
        seen.add(prov);
        const costs = COST_TABLE[prov] || { input: 0, output: 0 };
        providers.push({
          name: PROVIDER_LABELS[prov] || prov,
          provider: prov,
          active: true,
          costPerMInput: costs.input,
          costPerMOutput: costs.output,
        });
      }
    }
    return providers;
  } catch {
    return [];
  }
}

interface DailyActivity {
  date: string;
  day: string;
  events: number;
}

function getDailyActivity(): DailyActivity[] {
  const days: DailyActivity[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Count gateway log events per day for the last 7 days
  try {
    const log = fs.readFileSync(GATEWAY_LOG, 'utf-8');
    const lines = log.split('\n').filter((l) => l.trim());
    const counts: Record<string, number> = {};

    for (const line of lines) {
      const ts = line.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
      if (ts) {
        counts[ts] = (counts[ts] || 0) + 1;
      }
    }

    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({
        date: dateStr,
        day: dayNames[d.getDay()],
        events: counts[dateStr] || 0,
      });
    }
  } catch {
    // Generate empty days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.push({
        date: d.toISOString().slice(0, 10),
        day: dayNames[d.getDay()],
        events: 0,
      });
    }
  }

  return days;
}

function getGatewayUptime(): string | null {
  try {
    const log = fs.readFileSync(GATEWAY_LOG, 'utf-8');
    const lines = log.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = lines[i].match(/^(\S+)\s+\[gateway\] listening on/);
      if (m) {
        const start = new Date(m[1]);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        const hours = Math.floor(diffMs / 3600000);
        const minutes = Math.floor((diffMs % 3600000) / 60000);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      }
    }
  } catch {}
  return null;
}

export async function GET() {
  const providers = getProviders();
  const daily = getDailyActivity();
  const uptime = getGatewayUptime();
  const totalEvents = daily.reduce((s, d) => s + d.events, 0);

  return NextResponse.json({
    providers,
    daily,
    uptime,
    totalEvents,
    timestamp: new Date().toISOString(),
  });
}
