import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'

/**
 * GET /api/fleet - Fleet overview statistics
 * Returns aggregated agent stats, top performers, fleet health, and recent activity
 */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const db = getDatabase()
    const now = Math.floor(Date.now() / 1000)
    const dayAgo = now - 86400
    const weekAgo = now - 604800

    // Agent status breakdown
    const statusBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count FROM agents GROUP BY status
    `).all() as Array<{ status: string; count: number }>

    const statusMap: Record<string, number> = {}
    let totalAgents = 0
    for (const row of statusBreakdown) {
      statusMap[row.status] = row.count
      totalAgents += row.count
    }

    // Top agents by task completion
    const topByCompletion = db.prepare(`
      SELECT a.name, a.role, a.status, a.last_seen,
        COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed,
        COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(*) as total_tasks
      FROM agents a
      LEFT JOIN tasks t ON t.assigned_to = a.name
      GROUP BY a.id
      HAVING total_tasks > 0
      ORDER BY completed DESC
      LIMIT 10
    `).all() as Array<{
      name: string; role: string; status: string; last_seen: number | null
      completed: number; in_progress: number; total_tasks: number
    }>

    // Top agents by token usage (from token_usage table)
    let topByTokens: Array<{
      agent_name: string; total_tokens: number; total_cost: number; request_count: number
    }> = []
    try {
      topByTokens = db.prepare(`
        SELECT
          SUBSTR(session_id, 1, INSTR(session_id, ':') - 1) as agent_name,
          SUM(total_tokens) as total_tokens,
          SUM(cost) as total_cost,
          COUNT(*) as request_count
        FROM token_usage
        WHERE timestamp >= ?
        GROUP BY agent_name
        ORDER BY total_tokens DESC
        LIMIT 10
      `).all(dayAgo * 1000) as typeof topByTokens
    } catch {
      // token_usage table may not have data
    }

    // Recent activity timeline (last 24h)
    const recentActivities = db.prepare(`
      SELECT id, type, entity_type, entity_id, actor, description, created_at
      FROM activities
      WHERE created_at >= ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(dayAgo) as Array<{
      id: number; type: string; entity_type: string; entity_id: number
      actor: string; description: string; created_at: number
    }>

    // Task summary
    const taskSummary = db.prepare(`
      SELECT status, COUNT(*) as count FROM tasks GROUP BY status
    `).all() as Array<{ status: string; count: number }>

    const taskMap: Record<string, number> = {}
    let totalTasks = 0
    for (const row of taskSummary) {
      taskMap[row.status] = row.count
      totalTasks += row.count
    }

    // Tasks completed today
    const tasksCompletedToday = db.prepare(`
      SELECT COUNT(*) as count FROM tasks WHERE status = 'done' AND updated_at >= ?
    `).get(dayAgo) as { count: number }

    // Activity counts
    const activityCounts = db.prepare(`
      SELECT
        COUNT(CASE WHEN created_at >= ? THEN 1 END) as today,
        COUNT(CASE WHEN created_at >= ? THEN 1 END) as week
      FROM activities
    `).get(dayAgo, weekAgo) as { today: number; week: number }

    // Fleet health score calculation (0-100)
    const activeAgents = (statusMap['busy'] || 0) + (statusMap['idle'] || 0)
    const offlineAgents = statusMap['offline'] || 0
    const errorAgents = statusMap['error'] || 0

    let healthScore = 100
    // Deduct for offline agents (proportional)
    if (totalAgents > 0) {
      healthScore -= Math.round((offlineAgents / totalAgents) * 30)
      healthScore -= Math.round((errorAgents / totalAgents) * 40)
    }
    // Deduct for stale agents (no heartbeat in 10 minutes)
    const staleThreshold = now - 600
    const staleAgents = db.prepare(`
      SELECT COUNT(*) as count FROM agents
      WHERE status != 'offline' AND (last_seen IS NULL OR last_seen < ?)
    `).get(staleThreshold) as { count: number }
    if (totalAgents > 0) {
      healthScore -= Math.round((staleAgents.count / totalAgents) * 20)
    }
    // Bonus for task completion rate
    const completedTasks = taskMap['done'] || 0
    if (totalTasks > 0) {
      const completionRate = completedTasks / totalTasks
      healthScore += Math.round(completionRate * 10)
    }
    healthScore = Math.max(0, Math.min(100, healthScore))

    return NextResponse.json({
      agents: {
        total: totalAgents,
        active: statusMap['busy'] || 0,
        idle: statusMap['idle'] || 0,
        offline: statusMap['offline'] || 0,
        error: statusMap['error'] || 0,
        statusBreakdown: statusMap,
      },
      tasks: {
        total: totalTasks,
        byStatus: taskMap,
        completedToday: tasksCompletedToday.count,
      },
      topAgentsByCompletion: topByCompletion,
      topAgentsByTokens: topByTokens,
      recentActivity: recentActivities,
      activityCounts,
      healthScore,
    })
  } catch (error) {
    logger.error({ err: error }, 'GET /api/fleet error')
    return NextResponse.json({ error: 'Failed to fetch fleet overview' }, { status: 500 })
  }
}
