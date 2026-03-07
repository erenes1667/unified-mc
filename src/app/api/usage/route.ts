import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getAllGatewaySessions } from '@/lib/sessions'
import { config } from '@/lib/config'
import { readFile } from 'fs/promises'
import path from 'path'

const DYNASTY_AGENTS = [
  'cleon', 'mickey17', 'forge', 'raven', 'whisper', 'kimi', 'sentinel', 'varys', 'demerzel'
]

const MODEL_COST_PER_1K: Record<string, { input: number; output: number; cached: number }> = {
  'claude-opus-4': { input: 0.015, output: 0.075, cached: 0.0015 },
  'claude-opus-4-5': { input: 0.015, output: 0.075, cached: 0.0015 },
  'claude-sonnet-4': { input: 0.003, output: 0.015, cached: 0.0003 },
  'claude-sonnet-4-5': { input: 0.003, output: 0.015, cached: 0.0003 },
  'claude-sonnet-4-6': { input: 0.003, output: 0.015, cached: 0.0003 },
  'claude-haiku-3': { input: 0.00025, output: 0.00125, cached: 0.000025 },
  'anthropic/claude-sonnet-4-6': { input: 0.003, output: 0.015, cached: 0.0003 },
  'anthropic/claude-opus-4': { input: 0.015, output: 0.075, cached: 0.0015 },
  'google/gemini-flash-1.5': { input: 0.000075, output: 0.0003, cached: 0 },
  'qwen/qwen3.5-coder': { input: 0, output: 0, cached: 0 },
  'moonshot/kimi-k2.5': { input: 0, output: 0, cached: 0 },
  'default': { input: 0.003, output: 0.015, cached: 0.0003 },
}

function calcCost(model: string, input: number, output: number, cached: number) {
  const pricing = MODEL_COST_PER_1K[model] || MODEL_COST_PER_1K['default']
  return (
    (input / 1000) * pricing.input +
    (output / 1000) * pricing.output +
    (cached / 1000) * pricing.cached
  )
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    // Pull from session data
    const gatewaySessions = getAllGatewaySessions()

    // Read stored token data if available
    let tokenRecords: any[] = []
    try {
      const raw = await readFile(config.tokensPath, 'utf-8')
      const parsed = JSON.parse(raw)
      tokenRecords = Array.isArray(parsed) ? parsed : (parsed.usage || [])
    } catch { /* no stored data */ }

    // Build per-agent stats from sessions
    const agentStats: Record<string, {
      agent: string
      model: string
      inputTokens: number
      outputTokens: number
      cachedTokens: number
      cost: number
      sessionCount: number
      lastActive: string | null
    }> = {}

    for (const agent of DYNASTY_AGENTS) {
      agentStats[agent] = {
        agent,
        model: 'unknown',
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        cost: 0,
        sessionCount: 0,
        lastActive: null,
      }
    }

    // Map session data to agents
    for (const s of gatewaySessions) {
      const agentKey = (s.agent || '').toLowerCase()
      if (!agentStats[agentKey]) {
        agentStats[agentKey] = {
          agent: agentKey,
          model: s.model || 'unknown',
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          cost: 0,
          sessionCount: 0,
          lastActive: null,
        }
      }
      const stat = agentStats[agentKey]
      stat.model = s.model || stat.model
      const total = s.totalTokens || 0
      // Approximate: 60% input, 35% output, 5% cached
      const inp = Math.floor(total * 0.6)
      const out = Math.floor(total * 0.35)
      const cac = total - inp - out
      stat.inputTokens += inp
      stat.outputTokens += out
      stat.cachedTokens += cac
      stat.cost += calcCost(stat.model, inp, out, cac)
      stat.sessionCount += 1
      if (s.updatedAt) {
        const ts = new Date(s.updatedAt).toISOString()
        if (!stat.lastActive || ts > stat.lastActive) stat.lastActive = ts
      }
    }

    // Add token record data (more accurate, has per-session breakdown)
    const today = new Date().toDateString()
    for (const rec of tokenRecords) {
      const agentKey = (rec.sessionId || '').split(':')[1]?.toLowerCase() || 'unknown'
      const recDate = new Date(rec.timestamp || rec.createdAt || 0).toDateString()
      if (recDate !== today) continue
      if (agentStats[agentKey]) {
        const s = agentStats[agentKey]
        s.inputTokens += rec.inputTokens || 0
        s.outputTokens += rec.outputTokens || 0
        s.cachedTokens += rec.cachedTokens || 0
        s.cost += rec.cost || calcCost(
          rec.model || s.model,
          rec.inputTokens || 0,
          rec.outputTokens || 0,
          rec.cachedTokens || 0
        )
      }
    }

    // Model distribution for pie chart
    const modelDist: Record<string, number> = {}
    for (const stat of Object.values(agentStats)) {
      const m = stat.model || 'unknown'
      modelDist[m] = (modelDist[m] || 0) + stat.inputTokens + stat.outputTokens
    }

    const modelDistArray = Object.entries(modelDist)
      .map(([model, tokens]) => ({ model, tokens }))
      .sort((a, b) => b.tokens - a.tokens)

    const agents = Object.values(agentStats)
      .sort((a, b) => (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens))

    const totals = agents.reduce(
      (acc, s) => ({
        inputTokens: acc.inputTokens + s.inputTokens,
        outputTokens: acc.outputTokens + s.outputTokens,
        cachedTokens: acc.cachedTokens + s.cachedTokens,
        cost: acc.cost + s.cost,
      }),
      { inputTokens: 0, outputTokens: 0, cachedTokens: 0, cost: 0 }
    )

    return NextResponse.json({
      agents,
      totals,
      modelDistribution: modelDistArray,
      date: new Date().toISOString().split('T')[0],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
