import os from 'os';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const HOME = os.homedir();
const AGENTS_DIR = path.join(HOME, '.openclaw', 'workspace', 'agents');
const DATA_FILE = path.join(HOME, '.openclaw', 'workspace', 'projects', 'unified-mc', 'data', 'projects.json');
const MEMORY_DIR = path.join(HOME, '.openclaw', 'workspace', 'memory');
const GATEWAY_LOG = path.join(HOME, '.openclaw', 'logs', 'gateway.log');
const COMMANDS_LOG = path.join(HOME, '.openclaw', 'logs', 'commands.log');

function countAgents(): { total: number; names: string[] } {
  try {
    const entries = fs.readdirSync(AGENTS_DIR, { withFileTypes: true });
    const dirs = entries.filter(
      (e) => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_') && e.name !== 'archive'
    );
    return { total: dirs.length, names: dirs.map((d) => d.name) };
  } catch {
    return { total: 0, names: [] };
  }
}

function countTasks(): { total: number; inProgress: number; planning: number } {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const total = data.length;
    const inProgress = data.filter((p: { status: string }) => p.status === 'in-progress' || p.status === 'active').length;
    const planning = data.filter((p: { status: string }) => p.status === 'planning').length;
    return { total, inProgress, planning };
  } catch {
    return { total: 0, inProgress: 0, planning: 0 };
  }
}

function checkGateway(): { status: string; pid: string | null; upSince: string | null } {
  try {
    const log = fs.readFileSync(GATEWAY_LOG, 'utf-8');
    const lines = log.split('\n').filter((l) => l.trim());
    // Find latest "listening on" line
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = lines[i].match(/^(\S+)\s+\[gateway\] listening on .* \(PID (\d+)\)/);
      if (m) {
        return { status: 'LIVE', pid: m[2], upSince: m[1] };
      }
    }
    return { status: 'UNKNOWN', pid: null, upSince: null };
  } catch {
    return { status: 'OFFLINE', pid: null, upSince: null };
  }
}

interface ActivityItem {
  time: string;
  agent: string;
  action: string;
  icon: string;
  source: string;
}

function getRecentActivity(): ActivityItem[] {
  const items: ActivityItem[] = [];

  // Parse gateway log for recent events
  try {
    const log = fs.readFileSync(GATEWAY_LOG, 'utf-8');
    const lines = log.split('\n').filter((l) => l.trim());
    const recent = lines.slice(-50);

    for (const line of recent) {
      const ts = line.match(/^(\S+)/)?.[1] || '';
      const time = ts ? new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

      if (line.includes('[telegram] sendMessage ok')) {
        const chat = line.match(/chat=(\d+)/)?.[1] || '';
        items.push({ time, agent: 'Telegram', action: `Message sent (chat ${chat})`, icon: '📨', source: 'gateway' });
      } else if (line.includes('[slack] socket mode connected')) {
        items.push({ time, agent: 'Slack', action: 'Socket mode connected', icon: '🔌', source: 'gateway' });
      } else if (line.includes('[ws] webchat connected')) {
        items.push({ time, agent: 'WebChat', action: 'Client connected', icon: '💬', source: 'gateway' });
      } else if (line.includes('[gateway] listening on')) {
        items.push({ time, agent: 'Gateway', action: 'Started and listening', icon: '⚡', source: 'gateway' });
      } else if (line.includes('[health-monitor] started')) {
        items.push({ time, agent: 'System', action: 'Health monitor active', icon: '🏥', source: 'gateway' });
      } else if (line.includes('[telegram]') && line.includes('starting provider')) {
        const bot = line.match(/\[(\w+)\] starting provider/)?.[1] || 'bot';
        items.push({ time, agent: bot, action: 'Telegram provider started', icon: '🤖', source: 'gateway' });
      }
    }
  } catch {
    // gateway log not available
  }

  // Parse memory files for recent entries
  try {
    const today = new Date().toISOString().slice(0, 10);
    const todayFile = path.join(MEMORY_DIR, `${today}.md`);
    if (fs.existsSync(todayFile)) {
      const stat = fs.statSync(todayFile);
      const time = stat.mtime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      items.push({ time, agent: 'Memory', action: `Daily log updated (${today})`, icon: '🧠', source: 'memory' });
    }
  } catch {
    // no memory file today
  }

  // Return most recent 10, sorted by time descending
  return items.reverse().slice(0, 10);
}

function getMemoryStats(): { totalFiles: number; todayUpdated: boolean } {
  try {
    const entries = fs.readdirSync(MEMORY_DIR);
    const mdFiles = entries.filter((f) => f.endsWith('.md'));
    const today = new Date().toISOString().slice(0, 10);
    const todayUpdated = mdFiles.some((f) => f.includes(today));
    return { totalFiles: mdFiles.length, todayUpdated };
  } catch {
    return { totalFiles: 0, todayUpdated: false };
  }
}

export async function GET() {
  const agents = countAgents();
  const tasks = countTasks();
  const gateway = checkGateway();
  const activity = getRecentActivity();
  const memory = getMemoryStats();

  return NextResponse.json({
    agents,
    tasks,
    gateway,
    activity,
    memory,
    timestamp: new Date().toISOString(),
  });
}
