/**
 * Rate Limiter — localStorage-based, hourly window
 * Tracks Claude messages per "user" (device) per hour.
 * When limit hit: silently switch to kimi-k2.5.
 * Emperor role = no limits.
 */

export interface RateLimitState {
  /** Model to use for this message */
  model: string;
  /** Whether this is the fallback model (limit hit) */
  isFallback: boolean;
  /** How many Claude messages remain this hour */
  remaining: number;
  /** Max allowed per hour (null = unlimited) */
  limit: number | null;
  /** Epoch ms when counter resets */
  resetAt: number;
}

const LS_KEY = 'umc.rateLimit.v1';
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const PRIMARY_MODEL = 'anthropic/claude-sonnet-4-6';
const FALLBACK_MODEL = 'kimi-k2.5';

interface LSRecord {
  timestamps: number[];
}

function load(): LSRecord {
  if (typeof window === 'undefined') return { timestamps: [] };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { timestamps: [] };
    return JSON.parse(raw) as LSRecord;
  } catch {
    return { timestamps: [] };
  }
}

function save(record: LSRecord): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(record));
  } catch {
    /* ignore */
  }
}

function prune(record: LSRecord, now: number): void {
  const cutoff = now - WINDOW_MS;
  record.timestamps = record.timestamps.filter((t) => t > cutoff);
}

/**
 * Check quota and return the model to use.
 * @param maxPerHour - from role config (null = unlimited)
 */
export function checkRateLimit(maxPerHour: number | null): RateLimitState {
  const now = Date.now();

  // Emperor / null = unlimited
  if (maxPerHour === null) {
    return {
      model: PRIMARY_MODEL,
      isFallback: false,
      remaining: Infinity,
      limit: null,
      resetAt: now + WINDOW_MS,
    };
  }

  const record = load();
  prune(record, now);

  const used = record.timestamps.length;
  const remaining = Math.max(0, maxPerHour - used);
  const resetAt =
    record.timestamps.length > 0
      ? record.timestamps[0] + WINDOW_MS
      : now + WINDOW_MS;

  if (remaining > 0) {
    return {
      model: PRIMARY_MODEL,
      isFallback: false,
      remaining,
      limit: maxPerHour,
      resetAt,
    };
  }

  // Silent fallback to kimi
  return {
    model: FALLBACK_MODEL,
    isFallback: true,
    remaining: 0,
    limit: maxPerHour,
    resetAt,
  };
}

/**
 * Record a Claude message (only call when model is PRIMARY_MODEL).
 */
export function recordUsage(): void {
  const now = Date.now();
  const record = load();
  prune(record, now);
  record.timestamps.push(now);
  save(record);
}

/**
 * Get current usage without recording.
 */
export function getUsage(maxPerHour: number | null): { used: number; remaining: number | null; resetAt: number } {
  const now = Date.now();
  const record = load();
  prune(record, now);
  const used = record.timestamps.length;
  const resetAt =
    record.timestamps.length > 0
      ? record.timestamps[0] + WINDOW_MS
      : now + WINDOW_MS;
  return {
    used,
    remaining: maxPerHour === null ? null : Math.max(0, maxPerHour - used),
    resetAt,
  };
}
