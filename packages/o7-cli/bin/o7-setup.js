#!/usr/bin/env node
import { execSync } from 'child_process';
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

// Look for installer in known locations
const locations = [
  join(homedir(), 'Projects/unified-mc/installer/install.sh'),
  join(process.cwd(), 'installer/install.sh'),
];

let installerPath = locations.find(p => existsSync(p));

if (!installerPath) {
  console.log('Installer not found locally. Cloning from GitHub...');
  const tmpDir = join(homedir(), '.openclaw/.setup-tmp');
  try {
    execSync(`git clone --depth 1 https://github.com/nicotinetool/unified-mc.git "${tmpDir}"`, { stdio: 'inherit' });
    installerPath = join(tmpDir, 'installer/install.sh');
  } catch {
    console.error('Failed to clone repository. Check your network and try again.');
    process.exit(1);
  }
}

console.log(`\n\x1b[1mO7 OpenClaw Setup\x1b[0m (profile: ${profile})\n`);

try {
  execSync(`bash "${installerPath}" --profile ${profile}`, {
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
