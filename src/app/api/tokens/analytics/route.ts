import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { requireRole } from '@/lib/auth'

/**
 * GET /api/tokens/analytics
 * Time-series cost and token analytics with date range filtering
 */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') // unix timestamp or ISO date
    const to = searchParams.get('to')
    const granularity = searchParams.get('granularity') || 'day' // hour|day|week
    const groupBy = searchParams.get('groupBy') || 'day' // day|model|agent

    const db = getDatabase()
    const now = Math.floor(Date.now() / 1000)

    // Parse date range
    let fromTs = now - 30 * 86400 // default: last 30 days
    let toTs = now

    if (from) {
      fromTs = isNaN(Number(from)) ? Math.floor(new Date(from).getTime() / 1000) : Number(from)
    }
    if (to) {
      toTs = isNaN(Number(to)) ? Math.floor(new Date(to).getTime() / 1000) : Number(to)
    }

    // Check if token_usage table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='token_usage'
    `).get()

    if (!tableExists) {
      return NextResponse.json({
        timeSeries: [],
        summary: { totalTokens: 0, totalCost: 0, requestCount: 0 },
        byModel: [],
        byAgent: [],
        dateRange: { from: fromTs, to: toTs },
      })
    }

    // Time-series aggregation
    let dateFormat: string
    if (granularity === 'hour') {
      dateFormat = `strftime('%Y-%m-%dT%H:00:00', datetime(created_at, 'unixepoch'))`
    } else if (granularity === 'week') {
      dateFormat = `strftime('%Y-W%W', datetime(created_at, 'unixepoch'))`
    } else {
      dateFormat = `strftime('%Y-%m-%d', datetime(created_at, 'unixepoch'))`
    }

    const timeSeries = db.prepare(`
      SELECT
        ${dateFormat} as period,
        SUM(total_tokens) as tokens,
        SUM(cost) as cost,
        COUNT(*) as requests,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens
      FROM token_usage
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY period
      ORDER BY period ASC
    `).all(fromTs, toTs) as Array<{
      period: string; tokens: number; cost: number; requests: number
      input_tokens: number; output_tokens: number
    }>

    // By model breakdown
    const byModel = db.prepare(`
      SELECT
        model,
        SUM(total_tokens) as tokens,
        SUM(cost) as cost,
        COUNT(*) as requests
      FROM token_usage
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY model
      ORDER BY cost DESC
    `).all(fromTs, toTs) as Array<{ model: string; tokens: number; cost: number; requests: number }>

    // By agent breakdown (extract from session_id)
    const byAgent = db.prepare(`
      SELECT
        CASE
          WHEN INSTR(session_id, ':') > 0 THEN SUBSTR(session_id, 1, INSTR(session_id, ':') - 1)
          ELSE session_id
        END as agent,
        SUM(total_tokens) as tokens,
        SUM(cost) as cost,
        COUNT(*) as requests
      FROM token_usage
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY agent
      ORDER BY cost DESC
      LIMIT 20
    `).all(fromTs, toTs) as Array<{ agent: string; tokens: number; cost: number; requests: number }>

    // Summary
    const summary = db.prepare(`
      SELECT
        SUM(total_tokens) as totalTokens,
        SUM(cost) as totalCost,
        COUNT(*) as requestCount,
        AVG(total_tokens) as avgTokensPerRequest
      FROM token_usage
      WHERE created_at >= ? AND created_at <= ?
    `).get(fromTs, toTs) as {
      totalTokens: number; totalCost: number; requestCount: number; avgTokensPerRequest: number
    } | null

    // Previous period for comparison
    const periodLength = toTs - fromTs
    const prevSummary = db.prepare(`
      SELECT
        SUM(total_tokens) as totalTokens,
        SUM(cost) as totalCost,
        COUNT(*) as requestCount
      FROM token_usage
      WHERE created_at >= ? AND created_at <= ?
    `).get(fromTs - periodLength, fromTs) as {
      totalTokens: number; totalCost: number; requestCount: number
    } | null

    return NextResponse.json({
      timeSeries: timeSeries.map(r => ({
        period: r.period,
        tokens: r.tokens || 0,
        cost: Number((r.cost || 0).toFixed(4)),
        requests: r.requests || 0,
        inputTokens: r.input_tokens || 0,
        outputTokens: r.output_tokens || 0,
      })),
      byModel: byModel.map(r => ({
        model: r.model,
        tokens: r.tokens || 0,
        cost: Number((r.cost || 0).toFixed(4)),
        requests: r.requests || 0,
      })),
      byAgent: byAgent.map(r => ({
        agent: r.agent,
        tokens: r.tokens || 0,
        cost: Number((r.cost || 0).toFixed(4)),
        requests: r.requests || 0,
      })),
      summary: {
        totalTokens: summary?.totalTokens || 0,
        totalCost: Number((summary?.totalCost || 0).toFixed(4)),
        requestCount: summary?.requestCount || 0,
        avgTokensPerRequest: Math.round(summary?.avgTokensPerRequest || 0),
      },
      previousPeriod: {
        totalTokens: prevSummary?.totalTokens || 0,
        totalCost: Number((prevSummary?.totalCost || 0).toFixed(4)),
        requestCount: prevSummary?.requestCount || 0,
      },
      dateRange: { from: fromTs, to: toTs, granularity },
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
