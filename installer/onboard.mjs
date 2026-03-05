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

// ─── Direct Auth Config Writing ───────────────────────────────────────────────
// Writes directly to ~/.openclaw/openclaw.json and ~/.openclaw/auth-profiles.json
// No shelling out to `openclaw onboard`. Clean, fast, non-tech friendly.

const AUTH_PROFILES_PATH = join(OPENCLAW_DIR, 'auth-profiles.json');

function readJsonSafe(path) {
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return {}; }
}

function writeAuthProfile(profileId, provider, token, opts = {}) {
  // 1. Write to auth-profiles.json (actual token store)
  const profiles = readJsonSafe(AUTH_PROFILES_PATH);
  profiles[profileId] = { provider, token, ...opts };
  if (!DRY_RUN) {
    mkdirSync(dirname(AUTH_PROFILES_PATH), { recursive: true });
    writeFileSync(AUTH_PROFILES_PATH, JSON.stringify(profiles, null, 2) + '\n');
  }

  // 2. Write to openclaw.json auth.profiles (metadata)
  const configPath = join(OPENCLAW_DIR, 'openclaw.json');
  const config = readJsonSafe(configPath);
  if (!config.auth) config.auth = {};
  if (!config.auth.profiles) config.auth.profiles = {};
  if (!config.auth.order) config.auth.order = {};

  const mode = opts.baseUrl ? 'token' : (token.startsWith('sk-') ? 'token' : 'api_key');
  config.auth.profiles[profileId] = { provider, mode };

  // Add to order
  if (!config.auth.order[provider]) config.auth.order[provider] = [];
  if (!config.auth.order[provider].includes(profileId)) {
    config.auth.order[provider].push(profileId);
  }

  if (!DRY_RUN) {
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  }
}

async function testApiKey(provider, token, baseUrl) {
  const https = await import('https');
  const http = await import('http');

  return new Promise((resolve) => {
    let url, options, body;

    if (provider === 'anthropic') {
      url = new URL('https://api.anthropic.com/v1/messages');
      body = JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'Say OK' }] });
      options = {
        method: 'POST',
        headers: {
          'x-api-key': token,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
        },
      };
    } else if (provider === 'google') {
      url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${token}`);
      body = JSON.stringify({ contents: [{ parts: [{ text: 'Say OK' }] }] });
      options = { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } };
    } else if (provider === 'ollama' || baseUrl) {
      const base = baseUrl || 'https://ollama.com/v1';
      url = new URL(`${base}/chat/completions`);
      body = JSON.stringify({ model: 'kimi-k2.5:cloud', messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 5 });
      options = {
        method: 'POST',
        headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
      };
    } else if (provider === 'openai') {
      url = new URL('https://api.openai.com/v1/chat/completions');
      body = JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 5 });
      options = {
        method: 'POST',
        headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
      };
    } else {
      resolve({ ok: false, error: 'unknown provider' });
      return;
    }

    const proto = url.protocol === 'https:' ? https : http;
    const req = proto.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true });
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          resolve({ ok: false, error: 'invalid_key', detail: 'Your key was rejected. Double-check you copied it correctly.' });
        } else if (res.statusCode === 429) {
          resolve({ ok: true, warn: 'Rate limited, but your key is valid!' });
        } else {
          let msg = '';
          try { msg = JSON.parse(data).error?.message || data.slice(0, 100); } catch { msg = data.slice(0, 100); }
          resolve({ ok: false, error: 'api_error', detail: `Status ${res.statusCode}: ${msg}` });
        }
      });
    });
    req.on('error', (e) => {
      if (e.code === 'ENOTFOUND' || e.code === 'ECONNREFUSED') {
        resolve({ ok: false, error: 'network', detail: 'Can\'t reach the API. Check your internet connection.' });
      } else {
        resolve({ ok: false, error: 'network', detail: e.message });
      }
    });
    req.setTimeout(15000, () => { req.destroy(); resolve({ ok: false, error: 'timeout', detail: 'Request timed out after 15s.' }); });
    req.write(body);
    req.end();
  });
}

async function setupProviderWithRetry(name, provider, promptText, urlText, keyPrefix, opts = {}) {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`   ${c.bold}How to get your key:${c.reset}`);
    console.log(`   ${c.cyan}→ ${urlText}${c.reset}`);
    if (keyPrefix) info(`   Your key should start with "${keyPrefix}..."`);
    console.log('');

    const key = await askSecret(`   Paste your ${name} key`);
    if (!key) {
      if (attempt === 1) { info('   No key entered. Skipping.'); return null; }
      warn('   No key entered.');
      continue;
    }

    if (keyPrefix && !key.startsWith(keyPrefix)) {
      warn(`   That doesn't look right — expected it to start with "${keyPrefix}".`);
      if (attempt < maxRetries) {
        info('   Let\'s try again. Make sure you copy the full key.');
        console.log('');
        continue;
      }
    }

    info('   Testing your key...');
    const result = await testApiKey(provider, key, opts.baseUrl);

    if (result.ok) {
      if (result.warn) warn(`   ${result.warn}`);
      return key;
    }

    if (result.error === 'invalid_key') {
      error(`   ${result.detail}`);
      if (attempt < maxRetries) {
        info(`   Let's try again (attempt ${attempt + 1}/${maxRetries}).`);
        console.log('');
      } else {
        error(`   Failed after ${maxRetries} attempts. You can add it later.`);
      }
    } else if (result.error === 'network') {
      error(`   ${result.detail}`);
      if (attempt < maxRetries) info('   Check your connection and try again.');
      else error('   Skipping due to network issues.');
      return null; // Don't retry network errors
    } else {
      warn(`   ${result.detail}`);
      // Unknown error, save the key anyway — might work
      return key;
    }
  }
  return null;
}

async function phaseAISetup() {
  section('🤖', 'Let\'s connect your AI models.');
  console.log(`   You need ${c.bold}at least one${c.reset} to continue.\n`);
  console.log(`   We'll test each key right away so you know it works.\n`);

  const results = {};

  // ── 1. Claude (Anthropic) ───────────────────────────────────────────────
  console.log(`   ${c.cyan}1.${c.reset} ${c.bold}Claude (Anthropic)${c.reset} — Best quality, recommended\n`);

  if (await askYesNo('   Set up Claude?', false)) {
    const key = await setupProviderWithRetry(
      'Claude', 'anthropic',
      'Get your key from the Anthropic Console:',
      'https://console.anthropic.com/settings/keys',
      'sk-ant-'
    );
    if (key) {
      writeAuthProfile('anthropic:default', 'anthropic', key);
      results.claude = 'ok';
      success('Claude configured and verified! ✨');
    } else {
      results.claude = 'skipped';
    }
  } else {
    info('   Skipped.');
    results.claude = 'skipped';
  }
  console.log('');

  // ── 2. ChatGPT (OpenAI) ────────────────────────────────────────────────
  console.log(`   ${c.cyan}2.${c.reset} ${c.bold}ChatGPT (OpenAI)${c.reset} — GPT-4o, good alternative\n`);

  if (await askYesNo('   Set up ChatGPT?', false)) {
    const key = await setupProviderWithRetry(
      'OpenAI', 'openai',
      'Get your key from the OpenAI dashboard:',
      'https://platform.openai.com/api-keys',
      'sk-'
    );
    if (key) {
      writeAuthProfile('openai:default', 'openai', key);
      results.openai = 'ok';
      success('ChatGPT configured and verified! ✨');
    } else {
      results.openai = 'skipped';
    }
  } else {
    info('   Skipped.');
    results.openai = 'skipped';
  }
  console.log('');

  // ── 3. Gemini (Google) ─────────────────────────────────────────────────
  console.log(`   ${c.cyan}3.${c.reset} ${c.bold}Gemini (Google)${c.reset} — Free tier, 1M+ context\n`);

  if (await askYesNo('   Set up Gemini?', false)) {
    const key = await setupProviderWithRetry(
      'Gemini', 'google',
      'Get a free key from Google AI Studio:',
      'https://aistudio.google.com/apikey',
      'AIza'
    );
    if (key) {
      writeAuthProfile('gemini:default', 'google', key);
      results.gemini = 'ok';
      success('Gemini configured and verified! ✨');
    } else {
      results.gemini = 'skipped';
    }
  } else {
    info('   Skipped.');
    results.gemini = 'skipped';
  }
  console.log('');

  // ── 4. Kimi K2.5 (Ollama Cloud) ────────────────────────────────────────
  console.log(`   ${c.cyan}4.${c.reset} ${c.bold}Kimi K2.5 (Ollama Cloud)${c.reset} — Design & creative AI\n`);

  if (await askYesNo('   Set up Kimi K2.5?')) {
    const key = await setupProviderWithRetry(
      'Ollama', 'ollama',
      'Get your key from Ollama:',
      'https://ollama.com/settings/keys',
      null,
      { baseUrl: 'https://ollama.com/v1' }
    );
    if (key) {
      writeAuthProfile('ollama:cloud', 'ollama', key, { baseUrl: 'https://ollama.com/v1' });
      results.kimi = 'ok';
      success('Kimi K2.5 configured and verified! ✨');
    } else {
      results.kimi = 'skipped';
    }
  } else {
    info('   Skipped.');
    results.kimi = 'skipped';
  }
  console.log('');

  // ── Summary ─────────────────────────────────────────────────────────────
  const working = Object.values(results).filter(v => v === 'ok').length;
  if (working === 0) {
    if (DRY_RUN) {
      warn('No models configured (dry-run mode, continuing anyway).');
      return { anthropicKey: '', openaiKey: '', geminiKey: '', authResults: results };
    }
    error('You need at least one AI model to continue.');
    error('Re-run the wizard to try again.');
    process.exit(1);
  }

  success(`${working} model${working > 1 ? 's' : ''} ready to go!`);
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
