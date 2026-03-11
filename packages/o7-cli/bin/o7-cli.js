#!/usr/bin/env node
// Router: `npx @nicotinetool/o7-cli setup` runs o7-setup
// `npx @nicotinetool/o7-cli [cmd]` runs o7 [cmd]
import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const cmd = args[0];
const script = cmd === 'setup' ? 'o7-setup' : 'o7';
const scriptArgs = cmd === 'setup' ? args.slice(1) : args;

try {
  execFileSync('node', [join(__dirname, script), ...scriptArgs], { stdio: 'inherit' });
} catch (err) {
  process.exit(err.status || 1);
}
