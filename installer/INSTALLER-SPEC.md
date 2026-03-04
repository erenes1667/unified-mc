# Unified MC Installer — Build Spec

## What This Is
A one-command installer + interactive onboarding wizard for Unified Mission Control.
User pastes one curl command, gets walked through everything, ends up with a working AI command center.

## Target User
Non-technical (or semi-technical) Mac users at Optimum7 or similar companies.
They don't know what an API key is. Walk them through it.

## Installation Flow

### Phase 1: Prerequisites Check
- Check Node.js >= 18 (if missing, offer to install via Homebrew)
- Check git (if missing, offer to install)
- Check if OpenClaw is already installed

### Phase 2: Install OpenClaw
- `npm install -g openclaw` if not present
- Run `openclaw gateway start` to initialize

### Phase 3: Interactive Onboarding Wizard
This is the main event. An interactive CLI wizard (use Node.js with readline, no heavy deps).

#### 3a: Personal Info
```
👋 Welcome to Unified Mission Control!
Let's set you up. This takes about 5 minutes.

What's your name? > Kevin Cook
What's your role? (e.g., Marketing Manager, Developer, CEO) > Strategy Lead
What company do you work at? > Optimum7
What's your timezone? (e.g., America/New_York) > America/New_York
```

#### 3b: AI Provider Setup
Walk them through getting API keys with actual URLs and step-by-step instructions.

```
🤖 Let's set up your AI brain.

You need at least ONE of these API keys:

1. Anthropic (Claude) — Best quality, recommended
   → Go to: https://console.anthropic.com/settings/keys
   → Click "Create Key", copy the key starting with "sk-ant-..."
   
2. OpenAI (GPT) — Good alternative
   → Go to: https://platform.openai.com/api-keys
   → Click "Create new secret key"

3. Google (Gemini) — Free tier available
   → Go to: https://aistudio.google.com/apikey
   → Click "Create API Key"

Paste your Anthropic API key (or press Enter to skip): > sk-ant-...
Paste your OpenAI API key (or press Enter to skip): > 
Paste your Gemini API key (or press Enter to skip): > 
```

At least one key required. Error if none provided.

#### 3c: Agent Setup
Don't give them Enes's agents. Generate fresh ones based on their role.

```
🤖 Let's name your AI assistant.

What should your main AI assistant be called? (default: Atlas) > 
What personality vibe? 
  1. Professional & efficient
  2. Casual & friendly  
  3. Witty & direct
  4. Custom (describe it)
> 2
```

Generate a SOUL.md based on their choice. Keep it simple, not the Mickey17 backstory.

#### 3d: Integrations (ALL READ-ONLY BY DEFAULT)
```
📧 Optional integrations (all READ-ONLY by default):

Would you like to connect Gmail? (read-only: check inbox, no sending) [y/N] > 
Would you like to connect Google Calendar? (read-only) [y/N] >
Would you like to connect Slack? (read-only: monitor mentions) [y/N] >
Would you like to connect GitHub? [y/N] >

⚠️  All integrations are READ-ONLY unless you explicitly change permissions later.
Your AI cannot send emails, post to Slack, or push code without your approval.
```

#### 3e: Use Case / Tasks
```
📋 What will you mainly use this for? (pick all that apply)
  1. Email management & triage
  2. Project tracking
  3. Code review & development
  4. Research & competitive intelligence
  5. Content creation
  6. Client management
  7. Data analysis
  8. Other (describe)
> 1, 4, 6
```

Use these to pre-configure relevant skills and cron jobs.

### Phase 4: Generate Configuration
Based on all answers, generate:

1. `~/.openclaw/openclaw.json` — Gateway config with their API keys, model preferences
2. `~/.openclaw/workspace/SOUL.md` — Personalized agent personality
3. `~/.openclaw/workspace/USER.md` — Their info (name, role, company, timezone)
4. `~/.openclaw/workspace/AGENTS.md` — Simple workspace rules
5. `~/.openclaw/workspace/HEARTBEAT.md` — Based on their use cases
6. Agent configs in `~/.openclaw/workspace/agents/{name}/` — Their custom agent, not Enes's team

### Phase 5: Build & Launch
1. Clone unified-mc repo (or copy from local)
2. `npm install`
3. `npm run build`
4. Start with launchd plist (auto-starts on boot)
5. Open browser to localhost:5173

### Phase 6: Welcome Screen
```
✅ Unified Mission Control is ready!

🌐 Open: http://localhost:5173
🤖 Your AI assistant "{name}" is online
📧 Gmail: connected (read-only)
📅 Calendar: connected (read-only)

Quick tips:
- Click the chat panel to talk to {name}
- The sidebar has all your tools
- Settings panel to change permissions

Need help? https://docs.openclaw.ai
```

## Files to Create

```
installer/
├── install.sh              # Entry point (curl | bash)
├── onboard.mjs             # Interactive wizard (Node.js ESM)
├── templates/
│   ├── openclaw.json.tmpl  # Gateway config template
│   ├── soul.md.tmpl        # Agent personality templates (per vibe)
│   ├── user.md.tmpl        # User info template  
│   ├── agents.md.tmpl      # Workspace rules
│   └── heartbeat.md.tmpl   # Heartbeat config per use case
└── com.unified-mc.plist    # launchd template
```

## CRITICAL Rules
1. **NO personal data from Enes's setup.** No Mickey17, no Dynasty, no client names, no API keys.
2. **ALL external integrations READ-ONLY by default.** Gmail = read. Slack = read. Drive = read. Calendar = read. No sending, posting, or modifying without explicit opt-in.
3. **The wizard must be friendly and non-intimidating.** Colors, emojis, clear instructions.
4. **Must work on any Mac** (Intel or Apple Silicon, macOS 13+).
5. **Fail gracefully.** If something goes wrong, explain what happened and how to fix it.
6. **Don't require sudo.** Everything installs to user space.
7. **The onboarding creates THEIR OWN OpenClaw identity.** Their own agent name, personality, skills. Not a clone of Enes's setup.
8. **Store API keys securely.** In openclaw.json only, not in plain text files scattered around.
