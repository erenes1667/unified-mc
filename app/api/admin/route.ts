import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'openclaw.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {}
  return null;
}

function writeConfig(data: unknown) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  const config = readConfig();
  if (!config) return NextResponse.json({ error: 'No config found' }, { status: 404 });

  // Extract safe info (no secrets)
  const safeConfig: Record<string, unknown> = {
    models: [],
    gateway: { port: config.gateway?.port ?? 18789 },
    hasAnthropicKey: false,
    hasOpenaiKey: false,
    hasGeminiKey: false,
  };

  // Check which API keys exist
  const profiles = config.auth?.profiles || {};
  for (const [, profile] of Object.entries(profiles)) {
    const p = profile as { provider?: string };
    if (p.provider === 'anthropic') safeConfig.hasAnthropicKey = true;
    if (p.provider === 'openai') safeConfig.hasOpenaiKey = true;
    if (p.provider === 'google') safeConfig.hasGeminiKey = true;
  }

  // Get model configs
  if (config.models) safeConfig.models = Object.keys(config.models);

  // System health
  const uptime = process.uptime();
  const mem = process.memoryUsage();
  safeConfig.health = {
    uptime: Math.floor(uptime),
    memoryMB: Math.floor(mem.rss / 1024 / 1024),
    nodeVersion: process.version,
    platform: process.platform,
  };

  return NextResponse.json(safeConfig);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const config = readConfig();
  if (!config) return NextResponse.json({ error: 'No config found' }, { status: 404 });

  // Only allow safe updates (rate limits, model order)
  if (body.rateLimits) {
    if (!config.rateLimits) config.rateLimits = {};
    config.rateLimits = { ...config.rateLimits, ...body.rateLimits };
  }

  writeConfig(config);
  return NextResponse.json({ ok: true });
}
