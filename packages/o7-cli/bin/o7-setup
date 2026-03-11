#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';

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
  console.error('  cd unified-mc && npx o7-setup');
  process.exit(1);
}

console.log(`\n\x1b[1mO7 OpenClaw Setup\x1b[0m (profile: ${profile})\n`);

try {
  // Use execFileSync to avoid shell injection
  execFileSync('bash', [installerPath, '--profile', profile], {
    stdio: 'inherit',
    env: { ...process.env },
  });
} catch {
  console.error('\nInstallation failed. Check the output above for details.');
  process.exit(1);
}

console.log(`
\x1b[32m✓ Installation complete!\x1b[0m

Next steps:
  npx o7 start      Start Gateway + Mission Control
  npx o7 status     Check running status
`);
