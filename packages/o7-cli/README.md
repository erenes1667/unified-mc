# @nicotinetool/o7-cli

One command to set up Optimum7's AI assistant platform (OpenClaw + Mission Control).

## Install

```bash
npx @nicotinetool/o7-cli o7-setup
```

That's it. The wizard handles everything: dependencies, AI model auth, gateway, dashboard, and device registration.

## Usage

After setup, install globally for convenience:

```bash
npm i -g @nicotinetool/o7-cli
```

Then:

```bash
o7 start      # Start Gateway + Mission Control
o7 status     # Show running status
o7 stop       # Stop both
o7 restart    # Restart both
o7 update     # Pull latest, rebuild, restart
o7 doctor     # Config-level health check + auto-fix
```

## What Gets Installed

- **OpenClaw Gateway** — AI assistant runtime (runs as macOS service)
- **Mission Control** — Dashboard UI at http://localhost:3000
- **AI Models** — Guided setup for Claude, ChatGPT, Kimi, Gemini
- **Antigravity** — Self-healing engine (auto-fixes issues every 30 min)
- **Device Registration** — Shows up in the O7 OS admin dashboard

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `O7_MC_DIR` | `~/Projects/unified-mc` | Path to Mission Control |
