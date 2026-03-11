#!/usr/bin/env node
import { execFileSync, execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir, platform, hostname, release } from 'os';

const VERSION = '1.2.0';
const O7_ADMIN_URL = 'https://o7-os-admin-production.up.railway.app';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (platform() === 'win32') {
  console.error('Windows is not supported. Use macOS or Linux.');
  process.exit(1);
}

// Parse flags
let profile = 'o7';
let useWizard = false;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--profile' && args[i + 1]) { profile = args[++i]; }
  if (args[i] === '--wizard') { useWizard = true; }
}

// Sanitize profile
if (!/^[a-zA-Z0-9_-]+$/.test(profile)) {
  console.error(`Invalid profile name: "${profile}". Use only letters, numbers, hyphens, underscores.`);
  process.exit(1);
}

// Find installer: bundled first, then local repo
const bundledInstaller = join(__dirname, '..', 'installer', 'install.sh');
const localLocations = [
  join(homedir(), 'Projects/unified-mc/installer/install.sh'),
  join(process.cwd(), 'installer/install.sh'),
];

let installerPath = existsSync(bundledInstaller) ? bundledInstaller : localLocations.find(p => existsSync(p));

if (!installerPath) {
  console.error('Installer not found. This package may be corrupted.');
  console.error('Try reinstalling: npm i -g @nicotinetool/o7-cli@latest');
  process.exit(1);
}

console.log(`\n\x1b[1mO7 OpenClaw Setup\x1b[0m v${VERSION} (profile: ${profile})\n`);

// Run the wizard (onboard.mjs) or the shell installer
if (useWizard) {
  const wizardPath = join(dirname(installerPath), 'onboard.mjs');
  if (existsSync(wizardPath)) {
    try {
      execFileSync('node', [wizardPath], { stdio: 'inherit', env: { ...process.env }, timeout: 600000 });
    } catch {
      console.error('\nWizard failed. Falling back to shell installer.');
      useWizard = false;
    }
  } else {
    console.log('Wizard not available, using shell installer.');
  }
}

if (!useWizard) {
  const { spawn: spawnProc } = await import('child_process');
  const exitCode = await new Promise((resolve) => {
    const child = spawnProc('bash', [installerPath, '--profile', profile], {
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('close', resolve);
    child.on('error', () => resolve(1));
  });
  if (exitCode !== 0) {
    console.error('\nInstallation failed. Check the output above for details.');
    process.exit(1);
  }
}

// Register device with O7 OS admin
async function registerDevice() {
  const o7osDir = join(homedir(), '.openclaw', 'o7os');
  const deviceFile = join(o7osDir, 'device.json');

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

  const body = JSON.stringify({ device_name: deviceName, os: osVersion, openclaw_version: ocVersion });

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
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
          else reject(new Error(`HTTP ${res.statusCode}`));
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.write(body);
      req.end();
    });

    mkdirSync(o7osDir, { recursive: true });
    writeFileSync(deviceFile, JSON.stringify({
      device_id: result.id, device_name: deviceName, os: osVersion,
      openclaw_version: ocVersion, o7os_version: VERSION,
      installed_at: new Date().toISOString(), api_key: result.api_key,
    }, null, 2) + '\n');
    console.log(`\x1b[32m✓\x1b[0m Registered with O7 OS admin`);
  } catch (err) {
    console.log(`\x1b[33m⚠\x1b[0m Could not register with admin (${err.message}). Non-blocking.`);
  }
}

await registerDevice();

console.log(`
\x1b[32m✓ Installation complete!\x1b[0m

Get started:
  o7 start       Start Gateway + Mission Control
  o7 status      Check running status
  o7 doctor      Run health check
`);
