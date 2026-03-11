# @erenes1667/o7-cli

One-command installer and lifecycle manager for Optimum7's OpenClaw + Mission Control setup.

## Quick Start

```bash
# Install globally (recommended)
npm i -g @erenes1667/o7-cli

# Or use npx
npx --package @erenes1667/o7-cli o7 status
```

## Setup

Clone the repo first, then run the installer:

```bash
git clone https://github.com/erenes1667/unified-mc.git
cd unified-mc
o7-setup
```

This runs the full installer which sets up OpenClaw, AI model auth, and Mission Control.

## Usage

```bash
o7 start      # Start Gateway + Mission Control
o7 status     # Show running status
o7 stop       # Stop both
o7 restart    # Restart both
o7 update     # Pull latest, rebuild, restart
```

## Profile Isolation

The installer defaults to `--profile o7`, which sets `OPENCLAW_HOME=~/.openclaw-o7`. This keeps work config separate from personal OpenClaw.

```bash
o7-setup --profile staging
```

## Device Registration

On first setup, your machine is registered with the O7 OS admin dashboard. This enables:
- Fleet visibility (who's installed, who's online)
- Heartbeat monitoring (auto-restarts if gateway goes down)
- Module sync and quota management

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `O7_MC_DIR` | `~/Projects/unified-mc` | Path to Mission Control |
