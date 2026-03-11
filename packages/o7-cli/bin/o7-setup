#!/usr/bin/env node
import { execFileSync, execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir, platform, hostname, arch, release } from 'os';
import { randomUUID } from 'crypto';

const VERSION = '1.0.2';
const O7_ADMIN_URL = 'https://o7-os-admin-production.up.railway.app';

if (platform() === 'win32') {
  console.error('Windows is not supported. Use macOS or Linux.');
  process.exit(1);
}

// Parse --profile flag (default: o7)
let profile = 'o7';
const profileIdx = process.argv.indexOf('--profile');
if (profileIdx !== -1 && process.argv[profileIdx + 1]) {
  profile = process.argv[profileIdx + 1];
}

// Sanitize profile: alphanumeric, hyphens, underscores only
if (!/^[a-zA-Z0-9_-]+$/.test(profile)) {
  console.error(`Invalid profile name: "${profile}". Use only letters, numbers, hyphens, underscores.`);
  process.exit(1);
}

// Look for installer in known locations
const locations = [
  join(homedir(), 'Projects/unified-mc/installer/install.sh'),
  join(process.cwd(), 'installer/install.sh'),
];

let installerPath = locations.find(p => existsSync(p));

if (!installerPath) {
  console.error('Installer not found locally.');
  console.error('Clone the repo first, then run from the repo root:');
  console.error('  git clone https://github.com/erenes1667/unified-mc.git');
  console.error('  cd unified-mc && npx @erenes1667/o7-cli o7-setup');
  process.exit(1);
}

console.log(`\n\x1b[1mO7 OpenClaw Setup\x1b[0m v${VERSION} (profile: ${profile})\n`);

try {
  // Use execFileSync to avoid shell injection
  execFileSync('bash', [installerPath, '--profile', profile], {
    stdio: 'inherit',
    env: { ...process.env },
    timeout: 600000, // 10 min max for full install
  });
} catch (err) {
  console.error('\nInstallation failed. Check the output above for details.');
  process.exit(1);
}

// ── Register device with O7 OS admin ─────────────────────────────────────────

async function registerDevice() {
  const o7osDir = join(homedir(), '.openclaw', 'o7os');
  const deviceFile = join(o7osDir, 'device.json');

  // Check if already registered
  if (existsSync(deviceFile)) {
    try {
      const existing = JSON.parse(readFileSync(deviceFile, 'utf8'));
      if (existing.device_id && existing.api_key) {
        console.log(`\x1b[32m✓\x1b[0m Device already registered (${existing.device_id.slice(0, 8)}...)`);
        return;
      }
    } catch {}
  }

  const deviceName = hostname();
  const osVersion = `${platform()} ${release()}`;
  let ocVersion = 'unknown';
  try { ocVersion = execSync('openclaw --version', { encoding: 'utf8', timeout: 5000 }).trim(); } catch {}

  const body = JSON.stringify({
    device_name: deviceName,
    os: osVersion,
    openclaw_version: ocVersion,
  });

  try {
    const { default: https } = await import('https');
    const result = await new Promise((resolve, reject) => {
      const url = new URL(`${O7_ADMIN_URL}/api/devices`);
      const req = https.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 10000,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.write(body);
      req.end();
    });

    // Save device info locally
    mkdirSync(o7osDir, { recursive: true });
    const deviceData = {
      device_id: result.id,
      device_name: deviceName,
      os: osVersion,
      openclaw_version: ocVersion,
      o7os_version: VERSION,
      installed_at: new Date().toISOString(),
      api_key: result.api_key,
    };
    writeFileSync(deviceFile, JSON.stringify(deviceData, null, 2) + '\n');
    console.log(`\x1b[32m✓\x1b[0m Registered with O7 OS admin (device: ${result.id?.slice(0, 8) || 'ok'}...)`);
  } catch (err) {
    console.log(`\x1b[33m⚠\x1b[0m Could not register with O7 OS admin (${err.message}). Non-blocking.`);
  }
}

await registerDevice();

console.log(`
\x1b[32m✓ Installation complete!\x1b[0m

Next steps:
  npx @erenes1667/o7-cli o7 start      Start Gateway + Mission Control
  npx @erenes1667/o7-cli o7 status     Check running status

Or install globally:
  npm i -g @erenes1667/o7-cli
  o7 start
`);
