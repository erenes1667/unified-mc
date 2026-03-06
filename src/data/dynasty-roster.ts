/**
 * Dynasty Agent Roster — canonical source of truth for agent identities.
 * Status is determined at runtime by querying the OpenClaw sessions store.
 */
export const DYNASTY_ROSTER = [
  { name: 'Cleon', role: 'Emperor / Strategy', emoji: '👑', model: 'opus' },
  { name: 'Mickey17', role: 'Daily Ops', emoji: '🐭', model: 'sonnet' },
  { name: 'Forge', role: 'Developer', emoji: '🔨', model: 'sonnet' },
  { name: 'Raven', role: 'Email Ops', emoji: '🐦‍⬛', model: 'sonnet' },
  { name: 'Whisper', role: 'Research & Intel', emoji: '🔍', model: 'gemini-flash' },
  { name: 'Kimi', role: 'Design & UI', emoji: '🎨', model: 'qwen3.5' },
  { name: 'Sentinel', role: 'Ops & Admin', emoji: '🛡️', model: 'gemini-flash' },
  { name: 'Lord Varys', role: 'Email Domain Lead', emoji: '🕷️', model: 'sonnet' },
  { name: 'Demerzel', role: 'Dev Intelligence', emoji: '🤖', model: 'qwen3-coder' },
] as const

export type DynastyAgent = (typeof DYNASTY_ROSTER)[number]
