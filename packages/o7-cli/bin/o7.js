#!/usr/bin/env node
import { execSync, spawn, execFileSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir, hostname, platform, arch, release } from 'os';

const VERSION = '1.1.6';
const O7_ADMIN_URL = 'https://o7-os-admin-production.up.railway.app';
const MC_DIR = process.env.O7_MC_DIR || join(homedir(), 'Projects/unified-mc');
const STATE_DIR = join(homedir(), '.openclaw');
const O7OS_DIR = join(STATE_DIR, 'o7os');
const PID_FILE = join(STATE_DIR, '.mc.pid');
const DEVICE_FILE = join(O7OS_DIR, 'device.json');

mkdirSync(STATE_DIR, { recursive: true });

const cmd = process.argv[2];

// Handle flags before command dispatch
if (cmd === '--help' || cmd === '-h') { showHelp(); process.exit(0); }
if (cmd === '--version' || cmd === '-v') { console.log(VERSION); process.exit(0); }

// ── Helpers ──────────────────────────────────────────────────────────────────

function run(c, opts = {}) {
  try {
    return execSync(c, { stdio: 'inherit', timeout: 30000, ...opts });
  } catch {
    return null;
  }
}

function runSilent(c, opts = {}) {
  try {
    return execSync(c, { encoding: 'utf8', timeout: 15000, ...opts }).trim();
  } catch {
    return '';
  }
}

function getMcPid() {
  if (!existsSync(PID_FILE)) return null;
  const raw = readFileSync(PID_FILE, 'utf8').trim();
  const pid = Number(raw);
  if (!pid || isNaN(pid)) {
    unlinkSync(PID_FILE);
    return null;
  }
  try {
    process.kill(pid, 0);
    return pid;
  } catch {
    unlinkSync(PID_FILE);
    return null;
  }
}

function getDeviceInfo() {
  try {
    if (existsSync(DEVICE_FILE)) return JSON.parse(readFileSync(DEVICE_FILE, 'utf8'));
  } catch {}
  return null;
}

// ── Commands ─────────────────────────────────────────────────────────────────

function status() {
  console.log('\x1b[1m--- Gateway ---\x1b[0m');
  run('openclaw gateway status');

  console.log('\n\x1b[1m--- Mission Control ---\x1b[0m');
  const pid = getMcPid();
  if (pid) {
    console.log(`Running (PID ${pid}) at http://localhost:3005`);
  } else {
    console.log('Not running');
  }

  console.log('\n\x1b[1m--- Device ---\x1b[0m');
  const device = getDeviceInfo();
  if (device) {
    console.log(`ID: ${device.device_id || 'unregistered'}`);
    console.log(`Name: ${device.device_name || hostname()}`);
    console.log(`OS: ${device.os || platform()}`);
    console.log(`Registered: ${device.installed_at || 'unknown'}`);
  } else {
    console.log('Not registered with O7 OS');
  }
}

function start() {
  console.log('Starting OpenClaw gateway...');
  run('openclaw gateway start');

  const existingPid = getMcPid();
  if (existingPid) {
    console.log(`Mission Control already running (PID ${existingPid})`);
    return;
  }

  if (!existsSync(MC_DIR)) {
    console.error(`Mission Control directory not found: ${MC_DIR}`);
    console.error('Set O7_MC_DIR env var or install first with: npx @erenes1667/o7-cli o7-setup');
    process.exit(1);
  }

  console.log('Starting Mission Control...');
  const envPath = `${dirname(process.execPath)}:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ''}`;
  const mc = spawn('pnpm', ['start'], {
    cwd: MC_DIR,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, PATH: envPath },
  });
  if (!mc.pid) {
    console.error('Failed to start Mission Control. Is pnpm installed?');
    process.exit(1);
  }
  mc.unref();
  writeFileSync(PID_FILE, String(mc.pid));
  console.log(`\n\x1b[32m✓ Mission Control started\x1b[0m (PID ${mc.pid})`);
  console.log('  http://localhost:3005');

  // Phone home (best-effort, non-blocking)
  phoneHome().catch(() => {});
}

function stop() {
  const pid = getMcPid();
  if (pid) {
    try {
      // Kill the process group to catch child processes
      process.kill(-pid, 'SIGTERM');
    } catch {
      try { process.kill(pid, 'SIGTERM'); } catch {}
    }
    console.log('Mission Control stopped');
    if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
  } else {
    console.log('Mission Control was not running');
  }
  run('openclaw gateway stop');
}

function restart() {
  stop();
  setTimeout(() => start(), 1000);
}

function update() {
  if (!existsSync(MC_DIR)) {
    console.error(`Mission Control directory not found: ${MC_DIR}`);
    process.exit(1);
  }
  console.log('Pulling latest changes...');
  run('git pull', { cwd: MC_DIR });
  console.log('Installing dependencies...');
  run('pnpm install', { cwd: MC_DIR });
  console.log('Rebuilding...');
  run('pnpm build', { cwd: MC_DIR });
  restart();
}

// ── Phone Home ───────────────────────────────────────────────────────────────

async function phoneHome() {
  const device = getDeviceInfo();
  if (!device || !device.device_id || !device.api_key) return;

  const url = `${O7_ADMIN_URL}/api/devices/${device.device_id}/heartbeat`;
  const ocVer = runSilent('openclaw --version');
  const body = JSON.stringify({
    openclaw_version: ocVer || 'unknown',
    o7_cli_version: VERSION,
  });

  try {
    const { default: https } = await import('https');
    const reqUrl = new URL(url);
    const req = https.request(reqUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${device.api_key}`,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 5000,
    });
    req.on('error', () => {});
    req.write(body);
    req.end();
  } catch {}
}

// ── Help ─────────────────────────────────────────────────────────────────────

function showHelp() {
  console.log(`
\x1b[1mO7 - Optimum7 OpenClaw Manager\x1b[0m  v${VERSION}

Usage: o7 <command>

Commands:
  start     Start Gateway + Mission Control
  stop      Stop both
  restart   Restart both
  update    Pull latest, install deps, rebuild, restart
  status    Show running status
  doctor    Config-level health check + auto-fix

Options:
  --help, -h       Show this help
  --version, -v    Show version

Environment:
  O7_MC_DIR    Path to Mission Control (default: ~/Projects/unified-mc)
`);
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

function doctor() {
  const doctorScript = join(dirname(new URL(import.meta.url).pathname), 'o7-doctor');
  try {
    execSync(`node "${doctorScript}" ${process.argv.slice(3).join(' ')}`, { stdio: 'inherit', timeout: 60000 });
  } catch (err) {
    // doctor exits 1 if issues found, that's expected
    if (err.status > 1) {
      console.error('Doctor script failed to run.');
      process.exit(1);
    }
  }
}

const commands = { status, start, stop, restart, update, doctor };

if (!cmd) { showHelp(); process.exit(0); }
if (!commands[cmd]) {
  console.error(`Unknown command: ${cmd}`);
  showHelp();
  process.exit(1);
}

commands[cmd]();
