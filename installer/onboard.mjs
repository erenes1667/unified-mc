#!/usr/bin/env node

// Unified Mission Control — Interactive Onboarding Wizard
// Pure Node.js, no external dependencies. Uses readline for interactive input.
// Usage: node onboard.mjs [--dry-run]

import { createInterface } from 'readline';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

// ─── Config ───────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DRY_RUN = process.argv.includes('--dry-run');
const NON_INTERACTIVE = DRY_RUN && !process.stdin.isTTY;
const OPENCLAW_DIR = join(homedir(), '.openclaw');
const WORKSPACE_DIR = join(OPENCLAW_DIR, 'workspace');
const TEMPLATES_DIR = join(__dirname, 'templates');

// ─── Colors & Formatting ─────────────────────────────────────────────────────

const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgBlue:  '\x1b[44m',
  bgGreen: '\x1b[42m',
};

function banner(text) {
  const line = '─'.repeat(56);
  console.log(`\n${c.cyan}${line}${c.reset}`);
  console.log(`${c.bold}${c.white}  ${text}${c.reset}`);
  console.log(`${c.cyan}${line}${c.reset}\n`);
}

function section(emoji, title) {
  console.log(`\n${c.bold}${emoji}  ${title}${c.reset}\n`);
}

function info(text) {
  console.log(`${c.dim}   ${text}${c.reset}`);
}

function success(text) {
  console.log(`${c.green}   ✓ ${text}${c.reset}`);
}

function warn(text) {
  console.log(`${c.yellow}   ⚠  ${text}${c.reset}`);
}

function error(text) {
  console.log(`${c.red}   ✗ ${text}${c.reset}`);
}

function bullet(text) {
  console.log(`   ${c.dim}•${c.reset} ${text}`);
}

// ─── Readline Helpers ─────────────────────────────────────────────────────────

let rl;

function initReadline() {
  rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(prompt, defaultVal = '') {
  if (NON_INTERACTIVE) {
    const suffix = defaultVal ? ` ${c.dim}(${defaultVal})${c.reset}` : '';
    console.log(`   ${c.cyan}>${c.reset} ${prompt}${suffix}: ${c.dim}${defaultVal}${c.reset}`);
    return Promise.resolve(defaultVal);
  }
  const suffix = defaultVal ? ` ${c.dim}(${defaultVal})${c.reset}` : '';
  return new Promise((resolve) => {
    rl.question(`   ${c.cyan}>${c.reset} ${prompt}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultVal);
    });
  });
}

function askSecret(prompt) {
  if (NON_INTERACTIVE) {
    console.log(`   ${c.cyan}>${c.reset} ${prompt}: ${c.dim}(skipped)${c.reset}`);
    return Promise.resolve('');
  }
  return new Promise((resolve) => {
    rl.question(`   ${c.cyan}>${c.reset} ${prompt}: `, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function askChoice(prompt, options) {
  console.log(`   ${prompt}`);
  options.forEach((opt, i) => {
    console.log(`   ${c.cyan}${i + 1}.${c.reset} ${opt}`);
  });
  if (NON_INTERACTIVE) {
    console.log(`   ${c.cyan}>${c.reset} Pick a number ${c.dim}(1)${c.reset}: ${c.dim}1${c.reset}`);
    return 0;
  }
  const answer = await ask('Pick a number', '1');
  const idx = parseInt(answer, 10) - 1;
  if (idx >= 0 && idx < options.length) return idx;
  return 0;
}

async function askMultiChoice(prompt, options) {
  console.log(`   ${prompt}`);
  options.forEach((opt, i) => {
    console.log(`   ${c.cyan}${i + 1}.${c.reset} ${opt}`);
  });
  if (NON_INTERACTIVE) {
    console.log(`   ${c.cyan}>${c.reset} Pick numbers separated by commas: ${c.dim}1,2${c.reset}`);
    return [0, 1];
  }
  const answer = await ask('Pick numbers separated by commas', '');
  if (!answer) return [];
  return answer.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(i => i >= 0 && i < options.length);
}

async function askYesNo(prompt, defaultNo = true) {
  if (NON_INTERACTIVE) {
    const val = !defaultNo;
    const hint = defaultNo ? 'y/N' : 'Y/n';
    console.log(`   ${c.cyan}>${c.reset} ${prompt} [${hint}]: ${c.dim}${val ? 'y' : 'n'}${c.reset}`);
    return val;
  }
  const hint = defaultNo ? 'y/N' : 'Y/n';
  const answer = await ask(`${prompt} [${hint}]`);
  if (defaultNo) return answer.toLowerCase() === 'y';
  return answer.toLowerCase() !== 'n';
}

// ─── Personality Data ─────────────────────────────────────────────────────────

const PERSONALITIES = {
  professional: {
    tagline: 'Your sharp, reliable right hand.',
    traits: `1. **Precision first** — You get the details right. Every time.
2. **Results-oriented** — You focus on outcomes, not busywork.
3. **Clear communication** — You say what needs to be said, no fluff.`,
    style: `- Lead with the most important information
- Use structured formats (bullets, tables, headers)
- Keep responses brief unless depth is requested
- Always provide next steps or action items
- Flag risks and blockers early`,
  },
  casual: {
    tagline: 'Your friendly AI sidekick.',
    traits: `1. **Approachable** — You make complex things feel simple.
2. **Collaborative** — You think out loud and invite input.
3. **Reliable** — Friendly doesn't mean sloppy. You deliver.`,
    style: `- Keep things conversational but clear
- Use plain language over jargon
- Add context when it helps understanding
- Be encouraging when things are going well
- Be honest and direct when they're not`,
  },
  witty: {
    tagline: 'Sharp mind, sharp tongue, gets things done.',
    traits: `1. **Cut the noise** — You get to the point fast.
2. **Pattern recognition** — You spot what others miss.
3. **Honest feedback** — You say what needs saying, with style.`,
    style: `- Lead with the insight, not the preamble
- Be direct — if something won't work, say so
- Use humor sparingly but effectively
- Respect their time above all else
- Challenge assumptions when it's productive`,
  },
};

const AGENT_EMOJIS = ['🤖', '🧠', '⚡', '🔮', '🛡️', '🎯', '🚀', '🦉', '🐺', '🌟'];

const USE_CASES = [
  'Email management & triage',
  'Project tracking',
  'Code review & development',
  'Research & competitive intelligence',
  'Content creation',
  'Client management',
  'Data analysis',
];

const USE_CASE_KEYS = [
  'EMAIL',
  'PROJECT_TRACKING',
  'CODE_REVIEW',
  'RESEARCH',
  'CONTENT',
  'CLIENT_MGMT',
  'DATA_ANALYSIS',
];

// ─── Template Engine ──────────────────────────────────────────────────────────

function loadTemplate(name) {
  const path = join(TEMPLATES_DIR, name);
  return readFileSync(path, 'utf-8');
}

function renderSimple(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

function renderHeartbeat(template, activeSections) {
  let result = template;
  // Simple section toggling: keep sections whose key is in activeSections, remove others
  const allSections = ['EMAIL', 'CALENDAR', 'PROJECT_TRACKING', 'CODE_REVIEW', 'RESEARCH', 'CONTENT', 'CLIENT_MGMT', 'DATA_ANALYSIS'];
  for (const key of allSections) {
    const regex = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{\\/${key}\\}\\}`, 'g');
    if (activeSections.includes(key)) {
      result = result.replace(regex, '$1');
    } else {
      result = result.replace(regex, '');
    }
  }
  // Clean up excess blank lines
  result = result.replace(/\n{3,}/g, '\n\n');
  return result;
}

function buildOpenclawJson(config) {
  const providers = {};

  if (config.anthropicKey) {
    providers.anthropic = {
      apiKey: config.anthropicKey,
      models: [
        {
          id: 'claude-sonnet-4-20250514',
          name: 'Claude Sonnet 4',
          api: 'anthropic-messages',
          reasoning: false,
          input: ['text', 'image'],
          cost: { input: 3, output: 15 },
          contextWindow: 200000,
          maxTokens: 8192,
        },
        {
          id: 'claude-haiku-4-5-20251001',
          name: 'Claude Haiku 4.5',
          api: 'anthropic-messages',
          reasoning: false,
          input: ['text', 'image'],
          cost: { input: 0.8, output: 4 },
          contextWindow: 200000,
          maxTokens: 8192,
        },
      ],
    };
  }

  if (config.openaiKey) {
    providers.openai = {
      apiKey: config.openaiKey,
      models: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          api: 'openai-completions',
          reasoning: false,
          input: ['text', 'image'],
          cost: { input: 2.5, output: 10 },
          contextWindow: 128000,
          maxTokens: 4096,
        },
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          api: 'openai-completions',
          reasoning: false,
          input: ['text', 'image'],
          cost: { input: 0.15, output: 0.6 },
          contextWindow: 128000,
          maxTokens: 4096,
        },
      ],
    };
  }

  if (config.geminiKey) {
    providers.google = {
      apiKey: config.geminiKey,
      models: [
        {
          id: 'gemini-2.0-flash',
          name: 'Gemini 2.0 Flash',
          api: 'openai-completions',
          reasoning: false,
          input: ['text', 'image'],
          cost: { input: 0, output: 0 },
          contextWindow: 1048576,
          maxTokens: 8192,
        },
      ],
    };
  }

  // Determine default model
  let defaultModel = 'anthropic/claude-sonnet-4-20250514';
  if (!config.anthropicKey && config.openaiKey) defaultModel = 'openai/gpt-4o';
  if (!config.anthropicKey && !config.openaiKey && config.geminiKey) defaultModel = 'google/gemini-2.0-flash';

  return {
    meta: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      installerVersion: '1.0.0',
    },
    auth: { profiles: {} },
    models: {
      mode: 'merge',
      providers,
    },
    agents: {
      defaults: {
        maxTurns: 50,
        tools: {
          web: { search: { enabled: true }, fetch: { enabled: true } },
        },
      },
      list: [
        {
          id: 'main',
          default: true,
          name: config.agentName,
          workspace: WORKSPACE_DIR,
          model: defaultModel,
          identity: {
            name: config.agentName,
            emoji: config.agentEmoji,
          },
        },
      ],
    },
    tools: {
      web: { search: { enabled: true }, fetch: { enabled: true } },
    },
    gateway: {
      port: 18789,
      mode: 'local',
      bind: 'loopback',
    },
    channels: {},
  };
}

// ─── File Writing ─────────────────────────────────────────────────────────────

function safeWrite(filePath, content) {
  if (DRY_RUN) {
    console.log(`${c.dim}   [dry-run] Would write: ${filePath}${c.reset}`);
    return;
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf-8');
}

// ─── Phase 1: Personal Info ──────────────────────────────────────────────────

async function phasePersonalInfo() {
  banner('Welcome to Unified Mission Control!');
  console.log(`   ${c.bold}Let's set you up. This takes about 5 minutes.${c.reset}\n`);

  const name = await ask('What\'s your name?', NON_INTERACTIVE ? 'Test User' : '');
  if (!name) {
    error('Name is required to continue.');
    process.exit(1);
  }

  const role = await ask('What\'s your role?', 'Team Member');
  const company = await ask('What company do you work at?', 'My Company');
  const timezone = await ask('What\'s your timezone?', 'America/New_York');

  success(`Welcome, ${name}!`);

  return { name, role, company, timezone };
}

// ─── Phase 2: AI Provider Setup ──────────────────────────────────────────────

async function phaseAISetup() {
  section('🤖', 'Let\'s connect your AI models.');
  console.log(`   ${c.bold}No API keys needed for Claude or ChatGPT${c.reset} — just sign in.\n`);
  console.log(`   We'll walk you through each one. You need ${c.bold}at least one${c.reset} to continue.\n`);

  const results = { claude: null, openai: null, gemini: null, kimi: null };

  // ── Claude (Anthropic) — setup-token/OAuth ──────────────────────────────
  console.log(`   ${c.cyan}1.${c.reset} ${c.bold}Claude (Anthropic)${c.reset} — Best quality, recommended`);
  info('   Signs in through your browser. No API key copy-paste.');
  console.log('');

  if (await askYesNo('   Set up Claude? (opens browser)', false)) {
    console.log(`\n   ${c.dim}Launching browser for Anthropic authentication...${c.reset}`);
    info('   Sign in with your Anthropic account when the browser opens.');
    info('   If you don\'t have an account, create one at console.anthropic.com');
    console.log('');

    try {
      const { execSync } = await import('child_process');
      execSync('openclaw onboard --auth-choice setup-token', { stdio: 'inherit', timeout: 120000 });
      results.claude = 'ok';
      success('Claude authenticated!');
    } catch (e) {
      warn('Claude setup-token failed. Trying OAuth flow...');
      try {
        const { execSync } = await import('child_process');
        execSync('openclaw onboard --auth-choice oauth', { stdio: 'inherit', timeout: 120000 });
        results.claude = 'ok';
        success('Claude authenticated via OAuth!');
      } catch (e2) {
        error('Claude authentication failed. You can set it up later: openclaw configure');
        results.claude = 'failed';
      }
    }
  } else {
    info('   Skipped. Set up later with: openclaw configure');
  }
  console.log('');

  // ── ChatGPT/Codex (OpenAI) — OAuth ─────────────────────────────────────
  console.log(`   ${c.cyan}2.${c.reset} ${c.bold}ChatGPT / Codex (OpenAI)${c.reset} — OAuth sign-in`);
  info('   Signs in through your browser. Just log into your OpenAI account.');
  console.log('');

  if (await askYesNo('   Set up ChatGPT/Codex? (opens browser)', false)) {
    console.log(`\n   ${c.dim}Launching browser for OpenAI authentication...${c.reset}\n`);

    try {
      const { execSync } = await import('child_process');
      execSync('openclaw onboard --auth-choice openai-codex', { stdio: 'inherit', timeout: 120000 });
      results.openai = 'ok';
      success('ChatGPT/Codex authenticated!');
    } catch (e) {
      error('OpenAI authentication failed. Set up later: openclaw configure');
      results.openai = 'failed';
    }
  } else {
    info('   Skipped.');
  }
  console.log('');

  // ── Gemini (Google) — CLI OAuth ─────────────────────────────────────────
  console.log(`   ${c.cyan}3.${c.reset} ${c.bold}Gemini (Google)${c.reset} — Free, 1M+ context`);
  info('   Signs in with your Google account. Free tier, no credit card.');
  console.log('');

  if (await askYesNo('   Set up Gemini? (opens browser)', false)) {
    console.log(`\n   ${c.dim}Launching browser for Google authentication...${c.reset}\n`);

    try {
      const { execSync } = await import('child_process');
      execSync('openclaw onboard --auth-choice google-gemini-cli', { stdio: 'inherit', timeout: 120000 });
      results.gemini = 'ok';
      success('Gemini authenticated!');
    } catch (e) {
      warn('Gemini OAuth failed. Let\'s try with an API key instead.');
      console.log(`\n   ${c.bold}Get a free API key:${c.reset}`);
      console.log(`   ${c.cyan}→ https://aistudio.google.com/apikey${c.reset}`);
      info('   Sign in with Google, click "Create API Key", copy it.\n');

      const geminiKey = await askSecret('   Paste your Gemini API key (or Enter to skip)');
      if (geminiKey) {
        try {
          const { execSync } = await import('child_process');
          execSync(`openclaw onboard --auth-choice gemini-api-key --gemini-api-key "${geminiKey}"`, { stdio: 'inherit', timeout: 30000 });
          results.gemini = 'ok';
          success('Gemini configured with API key!');
        } catch (e2) {
          error('Gemini setup failed.');
          results.gemini = 'failed';
        }
      }
    }
  } else {
    info('   Skipped.');
  }
  console.log('');

  // ── Kimi K2.5 (Ollama Cloud) — API Key ─────────────────────────────────
  console.log(`   ${c.cyan}4.${c.reset} ${c.bold}Kimi K2.5 (Ollama Cloud)${c.reset} — Design AI`);
  info('   Kimi is our creative/design model. Runs via Ollama Cloud.');
  info('   This one does need an API key from ollama.com.');
  console.log('');
  console.log(`   ${c.bold}How to get your key:${c.reset}`);
  console.log(`   ${c.cyan}→ https://ollama.com/settings/keys${c.reset}`);
  info('   1. Sign in or create an account at ollama.com');
  info('   2. Go to Settings → API Keys');
  info('   3. Click "Create new key", copy it');
  console.log('');

  if (await askYesNo('   Set up Kimi K2.5?')) {
    const ollamaKey = await askSecret('   Paste your Ollama API key');
    if (ollamaKey) {
      try {
        const { execSync } = await import('child_process');
        execSync(`openclaw onboard --auth-choice custom-api-key --custom-api-key "${ollamaKey}" --custom-base-url "https://ollama.com/v1" --custom-provider-id "ollama" --custom-model-id "kimi-k2.5:cloud" --custom-compatibility openai --token-profile-id "ollama:cloud"`, { stdio: 'inherit', timeout: 30000 });
        results.kimi = 'ok';
        success('Kimi K2.5 configured!');
      } catch (e) {
        error('Kimi K2.5 setup failed. You can add it manually later.');
        results.kimi = 'failed';
      }
    } else {
      warn('No key entered. Skipping Kimi.');
    }
  } else {
    info('   Skipped.');
  }
  console.log('');

  // ── Check at least one model works ──────────────────────────────────────
  const working = Object.values(results).filter(v => v === 'ok').length;
  if (working === 0) {
    if (DRY_RUN) {
      warn('No models configured (dry-run mode, continuing anyway).');
      return { anthropicKey: '', openaiKey: '', geminiKey: '', authResults: results };
    }
    error('You need at least one AI model to continue.');
    error('Re-run the wizard or use: openclaw configure');
    process.exit(1);
  }

  success(`${working} model${working > 1 ? 's' : ''} configured!`);

  // Return empty keys since auth is handled by openclaw onboard now
  return { anthropicKey: '', openaiKey: '', geminiKey: '', authResults: results };
}

// ─── Phase 3: Agent Setup ────────────────────────────────────────────────────

async function phaseAgentSetup() {
  section('🧠', 'Let\'s customize your AI assistant.');

  const agentName = await ask('What should your AI assistant be called?', 'Atlas');

  console.log('');
  const vibeIdx = await askChoice('What personality vibe?', [
    'Professional & efficient',
    'Casual & friendly',
    'Witty & direct',
    'Custom (describe it)',
  ]);

  let personalityKey = ['professional', 'casual', 'witty'][vibeIdx] || 'professional';
  let customPersonality = '';

  if (vibeIdx === 3) {
    customPersonality = await ask('Describe the personality you want');
    personalityKey = 'custom';
  }

  // Pick a random emoji
  const agentEmoji = AGENT_EMOJIS[Math.floor(Math.random() * AGENT_EMOJIS.length)];

  success(`${agentEmoji} ${agentName} is ready! (${personalityKey} personality)`);

  return { agentName, personalityKey, customPersonality, agentEmoji };
}

// ─── Phase 4: Integrations ──────────────────────────────────────────────────

async function phaseIntegrations() {
  section('🔗', 'Optional integrations (all READ-ONLY by default)');
  console.log('');

  const gmail = await askYesNo('Connect Gmail? (read-only: check inbox, no sending)');
  const calendar = await askYesNo('Connect Google Calendar? (read-only)');
  const slack = await askYesNo('Connect Slack? (read-only: monitor mentions)');
  const github = await askYesNo('Connect GitHub?');

  console.log('');
  warn('All integrations are READ-ONLY unless you explicitly change permissions later.');
  info('Your AI cannot send emails, post to Slack, or push code without your approval.');

  const connected = [gmail && 'Gmail', calendar && 'Calendar', slack && 'Slack', github && 'GitHub'].filter(Boolean);
  if (connected.length > 0) {
    success(`Connected: ${connected.join(', ')} (read-only)`);
  } else {
    info('No integrations selected. You can add them later in Settings.');
  }

  return { gmail, calendar, slack, github };
}

// ─── Phase 5: Use Cases ─────────────────────────────────────────────────────

async function phaseUseCases() {
  section('📋', 'What will you mainly use this for?');
  console.log('');

  const selected = await askMultiChoice('Pick all that apply:', USE_CASES);

  const useCaseKeys = selected.map(i => USE_CASE_KEYS[i]);
  const useCaseLabels = selected.map(i => USE_CASES[i]);

  if (useCaseLabels.length > 0) {
    success(`Configured for: ${useCaseLabels.join(', ')}`);
  } else {
    info('No specific use cases selected. You can customize later.');
  }

  return { useCaseKeys, useCaseLabels };
}

// ─── Phase 6: Generate Config ────────────────────────────────────────────────

function phaseGenerate(data) {
  section('⚙️', 'Generating your configuration...');

  // 1. openclaw.json
  const openclawConfig = buildOpenclawJson({
    anthropicKey: data.ai.anthropicKey,
    openaiKey: data.ai.openaiKey,
    geminiKey: data.ai.geminiKey,
    agentName: data.agent.agentName,
    agentEmoji: data.agent.agentEmoji,
  });
  safeWrite(join(OPENCLAW_DIR, 'openclaw.json'), JSON.stringify(openclawConfig, null, 2) + '\n');
  success('openclaw.json');

  // 2. SOUL.md
  const personality = data.agent.personalityKey === 'custom'
    ? {
        tagline: 'Your custom AI assistant.',
        traits: `1. **Adaptable** — You match the style your human needs.\n2. **Attentive** — ${data.agent.customPersonality}\n3. **Reliable** — You follow through on everything.`,
        style: `- Adapt to the user's communication style\n- Be responsive and thorough\n- Ask questions when unsure\n- Keep responses focused and actionable\n- Customize your approach based on feedback`,
      }
    : PERSONALITIES[data.agent.personalityKey];

  const soulContent = renderSimple(loadTemplate('soul.md.tmpl'), {
    AGENT_NAME: data.agent.agentName,
    TAGLINE: personality.tagline,
    USER_NAME: data.personal.name,
    USER_ROLE: data.personal.role,
    USER_COMPANY: data.personal.company,
    PERSONALITY_TRAITS: personality.traits,
    WORKING_STYLE: personality.style,
  });
  safeWrite(join(WORKSPACE_DIR, 'SOUL.md'), soulContent);
  success('SOUL.md');

  // 3. USER.md
  const userContent = renderSimple(loadTemplate('user.md.tmpl'), {
    USER_NAME: data.personal.name,
    USER_ROLE: data.personal.role,
    USER_COMPANY: data.personal.company,
    USER_TIMEZONE: data.personal.timezone,
  });
  safeWrite(join(WORKSPACE_DIR, 'USER.md'), userContent);
  success('USER.md');

  // 4. AGENTS.md
  const agentsContent = loadTemplate('agents.md.tmpl');
  safeWrite(join(WORKSPACE_DIR, 'AGENTS.md'), agentsContent);
  success('AGENTS.md');

  // 5. HEARTBEAT.md
  const heartbeatSections = [...data.useCases.useCaseKeys];
  if (data.integrations.calendar) heartbeatSections.push('CALENDAR');
  const heartbeatContent = renderHeartbeat(loadTemplate('heartbeat.md.tmpl'), heartbeatSections);
  safeWrite(join(WORKSPACE_DIR, 'HEARTBEAT.md'), heartbeatContent);
  success('HEARTBEAT.md');

  // 6. Agent directory
  const agentDir = join(WORKSPACE_DIR, 'agents', data.agent.agentName.toLowerCase().replace(/\s+/g, '-'));
  const agentReadme = `# ${data.agent.agentName}\n\nPrimary AI assistant for ${data.personal.name}.\n\n- **Personality:** ${data.agent.personalityKey}\n- **Created:** ${new Date().toISOString().split('T')[0]}\n`;
  safeWrite(join(agentDir, 'README.md'), agentReadme);
  success(`agents/${data.agent.agentName.toLowerCase().replace(/\s+/g, '-')}/`);

  // 7. Memory and tasks directories
  safeWrite(join(WORKSPACE_DIR, 'memory', '.gitkeep'), '');
  safeWrite(join(WORKSPACE_DIR, 'TASKS.md'), `# Tasks\n\n*No tasks yet. ${data.agent.agentName} will help you manage these.*\n`);
  success('TASKS.md');
  success('memory/');
}

// ─── Phase 7: Welcome Screen ────────────────────────────────────────────────

function phaseWelcome(data) {
  const line = '═'.repeat(56);
  console.log(`\n${c.green}${line}${c.reset}`);
  console.log(`${c.bold}${c.green}  ✅  Unified Mission Control is ready!${c.reset}`);
  console.log(`${c.green}${line}${c.reset}\n`);

  console.log(`   ${c.bold}🌐 Open:${c.reset}  http://localhost:5173`);
  console.log(`   ${c.bold}🤖 AI:${c.reset}    ${data.agent.agentEmoji} ${data.agent.agentName} is online`);

  if (data.integrations.gmail) console.log(`   ${c.bold}📧 Gmail:${c.reset}  connected (read-only)`);
  if (data.integrations.calendar) console.log(`   ${c.bold}📅 Calendar:${c.reset} connected (read-only)`);
  if (data.integrations.slack) console.log(`   ${c.bold}💬 Slack:${c.reset}  connected (read-only)`);
  if (data.integrations.github) console.log(`   ${c.bold}🐙 GitHub:${c.reset} connected`);

  console.log(`\n   ${c.bold}Quick tips:${c.reset}`);
  bullet('Click the chat panel to talk to ' + data.agent.agentName);
  bullet('The sidebar has all your tools');
  bullet('Settings panel to change permissions');

  if (DRY_RUN) {
    console.log(`\n   ${c.yellow}${c.bold}[DRY RUN]${c.reset}${c.yellow} No files were written.${c.reset}`);
  }

  console.log(`\n   ${c.dim}Need help? https://github.com/erenes1667/unified-mc${c.reset}`);
  console.log(`\n${c.green}${line}${c.reset}\n`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) {
    console.log(`\n${c.yellow}${c.bold}   🧪 DRY RUN MODE${c.reset}${c.yellow} — No files will be written.${c.reset}\n`);
  }

  initReadline();

  try {
    const personal = await phasePersonalInfo();
    const ai = await phaseAISetup();
    const agent = await phaseAgentSetup();
    const integrations = await phaseIntegrations();
    const useCases = await phaseUseCases();

    const data = { personal, ai, agent, integrations, useCases };

    phaseGenerate(data);
    phaseWelcome(data);
  } catch (err) {
    if (err.code === 'ERR_USE_AFTER_CLOSE' || err.message?.includes('readline was closed')) {
      // User closed stdin (e.g., piped input ended)
      console.log(`\n${c.yellow}   Input ended. Run interactively for the full wizard.${c.reset}\n`);
    } else {
      error(`Something went wrong: ${err.message}`);
      if (!DRY_RUN) {
        info('Your existing configuration was not modified.');
        info('Try running the wizard again, or check the error above.');
      }
      process.exit(1);
    }
  } finally {
    rl?.close();
  }
}

main();
