#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const MC_DIR = process.env.O7_MC_DIR || join(homedir(), 'Projects/unified-mc');
const STATE_DIR = join(homedir(), '.openclaw');
const PID_FILE = join(STATE_DIR, '.mc.pid');

mkdirSync(STATE_DIR, { recursive: true });

const cmd = process.argv[2];

function run(c, opts = {}) {
  try {
    return execSync(c, { stdio: 'inherit', ...opts });
  } catch {
    return null;
  }
}

function getMcPid() {
  if (!existsSync(PID_FILE)) return null;
  const pid = Number(readFileSync(PID_FILE, 'utf8').trim());
  try {
    process.kill(pid, 0);
    return pid;
  } catch {
    unlinkSync(PID_FILE);
    return null;
  }
}

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
    console.error('Set O7_MC_DIR env var or install first with: npx o7-setup');
    process.exit(1);
  }

  console.log('Starting Mission Control...');
  const mc = spawn('pnpm', ['start'], {
    cwd: MC_DIR,
    detached: true,
    stdio: 'ignore',
  });
  mc.unref();
  writeFileSync(PID_FILE, String(mc.pid));
  console.log(`\n\x1b[32m✓ Mission Control started\x1b[0m (PID ${mc.pid})`);
  console.log('  http://localhost:3005');
}

function stop() {
  const pid = getMcPid();
  if (pid) {
    try {
      process.kill(pid, 'SIGTERM');
      console.log('Mission Control stopped');
    } catch {}
    if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
  } else {
    console.log('Mission Control was not running');
  }
  run('openclaw gateway stop');
}

function restart() {
  stop();
  start();
}

function update() {
  console.log('Pulling latest changes...');
  run('git pull', { cwd: MC_DIR });
  console.log('Installing dependencies...');
  run('pnpm install', { cwd: MC_DIR });
  console.log('Rebuilding...');
  run('pnpm build', { cwd: MC_DIR });
  restart();
}

const commands = { status, start, stop, restart, update };

if (!cmd || !commands[cmd]) {
  console.log(`
\x1b[1mO7 - Optimum7 OpenClaw Manager\x1b[0m

Usage: o7 <command>

Commands:
  start     Start Gateway + Mission Control
  stop      Stop both
  restart   Restart both
  update    Pull latest, install deps, rebuild, restart
  status    Show running status
`);
  process.exit(cmd ? 1 : 0);
}

commands[cmd]();
