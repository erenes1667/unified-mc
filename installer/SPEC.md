# O7 OpenClaw Installer — macOS One-Click Setup

## Goal
A single `curl | bash` command that sets up OpenClaw + Unified Mission Control on any team member's MacBook. Smart, guided, self-healing.

## Command
```bash
curl -sL https://install.optimum7.com/mac | bash
```
(For now, the script lives at `installer/install.sh` and is run locally.)

## What It Must Do (In Order)

### Phase 1: System Check
- Detect macOS version (require 13+)
- Check if Homebrew is installed, install if not
- Check if Node 22+ is installed, install via brew if not
- Check if git is installed
- Check disk space (need 2GB free minimum)
- Display a nice welcome banner with O7 branding

### Phase 2: Install OpenClaw
- `npm install -g openclaw@latest`
- Verify installation: `openclaw --version`
- If fails, run Antigravity diagnosis

### Phase 3: Smart Auth Setup (THE KEY PART)
DO NOT ask for raw API keys. Guide users through OAuth/CLI auth methods:

#### Claude (Anthropic) — setup-token flow
1. Tell user: "Open https://console.anthropic.com/settings/keys and create a token"
2. OR better: use `--auth-choice setup-token` which does browser-based auth
3. Validate the token works before proceeding

#### ChatGPT/Codex — OAuth flow
1. Use `--auth-choice openai-codex` which triggers OAuth browser login
2. User just logs into ChatGPT in browser, done
3. Validate: test a simple completion

#### Gemini — CLI OAuth
1. Use `--auth-choice google-gemini-cli` for browser OAuth
2. Free tier, no credit card needed
3. Validate: test completion

#### Kimi K2.5 (Ollama Cloud) — API Key
1. Tell user: "Go to https://ollama.com/settings/keys and copy your API key"
2. Ask for the key
3. Configure as custom provider with base URL `https://ollama.com/v1`
4. Model: `kimi-k2.5:cloud`
5. Validate: test completion

#### GitHub Copilot — CLI auth
1. Use `--auth-choice github-copilot`
2. Triggers `gh auth login` flow
3. Validate: test completion

### Phase 4: Smart Validation
After EACH auth setup:
- Test an actual API call
- If it fails:
  - Parse the error (401 = bad token, 403 = no access, 429 = rate limited, network error)
  - Give SPECIFIC guidance: "Your token seems expired. Go to X and create a new one."
  - Offer to retry
  - Log the error for Antigravity
- Color-coded status: ✅ working, ⚠️ issue, ❌ failed
- Minimum requirement: at least ONE model must work to proceed

### Phase 5: Role Selection
Ask user their role at O7:
- Marketing (email marketer) → pre-configure email/Klaviyo skills
- PPC → pre-configure ads dashboard skills
- Dev → pre-configure coding agent, GitHub skills
- Admin → full access, all skills
- Custom → pick and choose

Load role config from `config/roles/{role}.json`

### Phase 6: Channel Setup (Optional)
Ask if they want to connect any channels:
- Telegram (guided bot token setup)
- Slack (workspace token)
- Discord
- Skip for now (can do later)

### Phase 7: Install Daemon
- `openclaw onboard --install-daemon` (non-interactive parts)
- Set up launchd service
- Verify gateway starts and responds

### Phase 8: Install Mission Control
- Clone/pull the mission-control repo
- `pnpm install`
- Set up launchd service for MC (port 3000)
- Open browser to localhost:3000

### Phase 9: Antigravity Setup
- Install Antigravity self-healer
- Configure it with the Gemini API key from Phase 3
- Run initial health check
- Set up a launchd timer to run health checks every 30 minutes
- If ANY step in the entire install failed, run Antigravity heal on it

### Phase 10: Summary
- Show what was installed and configured
- Show what's working and what needs attention
- Show the webchat URL
- Show MC URL
- Save install log to `~/.openclaw/install.log`

## Smart Error Handling
The installer must be SMART:
- Every external command wrapped in error handling
- On failure: don't just exit. Diagnose WHY, suggest fix, offer retry
- Network errors: check connectivity first
- Permission errors: suggest `sudo` or fix permissions
- Already installed: detect and skip (idempotent)
- Partial install: detect previous attempt, resume from where it left off

## UX Requirements
- Colorful terminal output (but degrade gracefully if no color support)
- Progress indicators for long operations
- Clear section headers
- No walls of text — short, actionable messages
- Emoji for status (✅ ⚠️ ❌ 🔧 🚀)
- At NO point should the user need to edit JSON files manually
- Total install time target: under 10 minutes on good internet

## Files to Create
1. `installer/install.sh` — Main installer script
2. `installer/lib/checks.sh` — System check functions
3. `installer/lib/auth.sh` — Auth setup functions (the smart part)
4. `installer/lib/validate.sh` — Validation and testing functions
5. `installer/lib/antigravity.sh` — Antigravity integration
6. `installer/lib/ui.sh` — Terminal UI helpers (colors, prompts, progress)

## Reference
- OpenClaw onboard flags: see `openclaw onboard --help` output
- Auth choices: setup-token, oauth, claude-cli, codex-cli, google-gemini-cli, github-copilot
- Antigravity: `~/.openclaw/workspace/projects/o7-os/module-engine/antigravity.js`
- Role configs: `~/projects/mission-control/config/roles/*.json`
- Kimi K2.5 cloud: base URL `https://ollama.com/v1`, needs API key from ollama.com
