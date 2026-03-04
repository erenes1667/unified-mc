# Unified Mission Control

Unified Mission Control dashboard with glassmorphism UI, real-time chat, agent team view, cron calendar, memory browser, and project explorer.

## Quick Start

```bash
git clone <repo-url> && cd unified-mc
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Panels

| Panel | Route | Data Source |
|-------|-------|-------------|
| Chat | `/chat` | WebSocket to OpenClaw gateway (ws://127.0.0.1:18789) |
| Team | `/team` | Reads `~/.openclaw/workspace/agents/` |
| Calendar | `/calendar` | 12 real cron jobs, weekly grid |
| Memory | `/memory` | Reads `~/.openclaw/workspace/memory/*.md` |
| Projects | `/projects` | Reads `~/.openclaw/workspace/projects/` |

## Stack

Next.js 15, TypeScript, Tailwind CSS, glassmorphism UI with starfield background.
