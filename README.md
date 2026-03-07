# Unified Mission Control v2.0.0

A unified agent orchestration dashboard combining glassmorphism UI, real-time chat, fleet management, pipeline builder, dynasty roster, cost analytics, and more.

## Quick Start

```bash
git clone https://github.com/erenes1667/unified-mc.git
cd unified-mc
cp .env.example .env.local   # Required — edit values for your setup
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** The app connects to a local OpenClaw gateway at `127.0.0.1:18789` by default. Set `OPENCLAW_GATEWAY_HOST` and `OPENCLAW_GATEWAY_PORT` in `.env.local` if yours differs.

## Features

- 🎨 Glassmorphism UI with starfield background
- 💬 Real-time chat with Ed25519 auth
- 🤖 Agent fleet management & dynasty roster
- 🔧 Pipeline builder (visual drag-and-drop)
- 📊 Cost analytics & token usage tracking
- 📅 Cron calendar, memory browser, project explorer
- 🚀 One-click macOS installer

## Installation (macOS)

```bash
cd installer
chmod +x install.sh
./install.sh
```

## Development

```bash
npm install
npm run dev       # Start dev server on port 3000
npm run build     # Production build
npm run typecheck # TypeScript check
```

## Architecture

Built with Next.js 15, React 19, Tailwind CSS v4, TypeScript.

API routes live in `app/api/` and `src/app/api/`.
UI pages in `app/` with panel components in `components/`.
