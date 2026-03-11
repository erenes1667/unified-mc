# o7-cli

One-command installer and lifecycle manager for Optimum7's OpenClaw + Mission Control setup.

## Install

```bash
npx o7-setup
```

This runs the full installer with `--profile o7` (isolates work config from personal OpenClaw).

## Usage

```bash
# Start Gateway + Mission Control
npx o7 start

# Check status
npx o7 status

# Stop everything
npx o7 stop

# Restart
npx o7 restart

# Pull latest, rebuild, restart
npx o7 update
```

## Profile Isolation

By default, the installer uses `--profile o7`, which sets `OPENCLAW_HOME=~/.openclaw-o7`. This keeps your work OpenClaw config completely separate from any personal setup.

```bash
# Use a different profile
npx o7-setup --profile staging
```

## Environment Variables

- `O7_MC_DIR` - Path to Mission Control directory (default: `~/Projects/unified-mc`)
