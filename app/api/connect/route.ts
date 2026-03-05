import os from 'os';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const HOME = os.homedir();

// Check if OpenClaw is installed and find configuration
function detectInstallation(): {
  installed: boolean;
  workspaceExists: boolean;
  gatewayUrl: string;
  hasAuthProfiles: boolean;
  agentCount: number;
} {
  const openclawDir = path.join(HOME, '.openclaw');
  const workspaceDir = path.join(openclawDir, 'workspace');
  const authProfiles = path.join(openclawDir, 'auth-profiles.json');
  const agentsDir = path.join(workspaceDir, 'agents');

  const installed = fs.existsSync(openclawDir);
  const workspaceExists = fs.existsSync(workspaceDir);
  const hasAuthProfiles = fs.existsSync(authProfiles);

  let agentCount = 0;
  try {
    if (fs.existsSync(agentsDir)) {
      agentCount = fs.readdirSync(agentsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_') && e.name !== 'archive')
        .length;
    }
  } catch {}

  return {
    installed,
    workspaceExists,
    gatewayUrl: 'ws://127.0.0.1:18789',
    hasAuthProfiles,
    agentCount,
  };
}

// Try to find gateway token from device auth or config
function findGatewayToken(): string | null {
  // Check device-auth.json
  const deviceAuth = path.join(HOME, '.openclaw', 'device-auth.json');
  try {
    if (fs.existsSync(deviceAuth)) {
      const data = JSON.parse(fs.readFileSync(deviceAuth, 'utf-8'));
      if (data.token) return data.token;
    }
  } catch {}

  // Check devices directory for any token
  const devicesDir = path.join(HOME, '.openclaw', 'devices');
  try {
    if (fs.existsSync(devicesDir)) {
      const files = fs.readdirSync(devicesDir);
      for (const f of files) {
        if (f.endsWith('.json')) {
          const data = JSON.parse(fs.readFileSync(path.join(devicesDir, f), 'utf-8'));
          if (data.token) return data.token;
        }
      }
    }
  } catch {}

  return null;
}

// Check if gateway is actually reachable
async function checkGatewayHealth(gatewayUrl: string): Promise<boolean> {
  // Convert ws:// to http:// and try a health check
  const httpUrl = gatewayUrl.replace('ws://', 'http://').replace('wss://', 'https://');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(httpUrl, { signal: controller.signal }).catch(() => null);
    clearTimeout(timeout);
    return res !== null && res.status < 500;
  } catch {
    return false;
  }
}

export async function GET() {
  const installation = detectInstallation();
  const token = findGatewayToken();

  return NextResponse.json({
    ...installation,
    hasToken: !!token,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const gatewayUrl = body.gatewayUrl || 'ws://127.0.0.1:18789';

  // Validate the gateway connection
  const healthy = await checkGatewayHealth(gatewayUrl);

  return NextResponse.json({
    connected: healthy,
    gatewayUrl,
    message: healthy ? 'Gateway connection verified' : 'Could not reach gateway',
  });
}
