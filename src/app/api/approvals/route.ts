import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function runGH(args: string): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execAsync(`gh ${args}`, { timeout: 15000 })
  } catch (e: any) {
    return { stdout: e.stdout || '', stderr: e.stderr || e.message }
  }
}

export interface PRItem {
  id: number
  number: number
  title: string
  body: string
  author: string
  authorAvatar?: string
  repo: string
  branch: string
  base: string
  state: string
  isDraft: boolean
  createdAt: string
  updatedAt: string
  url: string
  diffSummary?: string
  files?: { filename: string; additions: number; deletions: number; status: string }[]
  reviewState?: string
  labels: string[]
}

async function fetchPRsForRepo(repo: string): Promise<PRItem[]> {
  const { stdout } = await runGH(
    `pr list --repo ${repo} --state open --json number,title,body,author,createdAt,updatedAt,url,headRefName,baseRefName,isDraft,labels --limit 20`
  )
  if (!stdout.trim()) return []

  try {
    const prs = JSON.parse(stdout)
    return prs.map((pr: any) => ({
      id: pr.number,
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      author: pr.author?.login || 'unknown',
      repo,
      branch: pr.headRefName || '',
      base: pr.baseRefName || 'main',
      state: 'open',
      isDraft: pr.isDraft || false,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      url: pr.url,
      labels: (pr.labels || []).map((l: any) => l.name || l),
    }))
  } catch {
    return []
  }
}

async function fetchDiff(repo: string, prNumber: number): Promise<{ files: PRItem['files']; diffSummary: string }> {
  const { stdout: filesJson } = await runGH(
    `pr view ${prNumber} --repo ${repo} --json files`
  )
  
  let files: PRItem['files'] = []
  try {
    const parsed = JSON.parse(filesJson)
    files = (parsed.files || []).map((f: any) => ({
      filename: f.path || f.filename,
      additions: f.additions || 0,
      deletions: f.deletions || 0,
      status: f.changeType || 'modified',
    }))
  } catch { }

  const totalAdd = files?.reduce((s, f) => s + f.additions, 0) || 0
  const totalDel = files?.reduce((s, f) => s + f.deletions, 0) || 0
  const diffSummary = `+${totalAdd} -${totalDel} across ${files?.length || 0} file(s)`

  return { files, diffSummary }
}

async function detectRepos(): Promise<string[]> {
  // Try to get repos from gh
  const { stdout } = await runGH('repo list --json nameWithOwner --limit 10')
  try {
    const repos = JSON.parse(stdout)
    return repos.map((r: any) => r.nameWithOwner)
  } catch { }

  // Fallback: check git remotes in common project dirs
  try {
    const { stdout: remotes } = await execAsync(
      'find ~/Projects -name ".git" -maxdepth 3 -exec git -C {} remote get-url origin \\; 2>/dev/null | head -10',
      { timeout: 5000 }
    )
    return remotes.split('\n')
      .filter(r => r.includes('github.com'))
      .map(r => r.replace(/.*github\.com[:/]/, '').replace(/\.git$/, '').trim())
      .filter(Boolean)
      .slice(0, 10)
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const url = new URL(request.url)
  const repo = url.searchParams.get('repo')
  const prNumber = url.searchParams.get('pr')
  const action = url.searchParams.get('action')

  // Fetch diff for a specific PR
  if (repo && prNumber && action === 'diff') {
    const diff = await fetchDiff(repo, parseInt(prNumber))
    return NextResponse.json(diff)
  }

  // List repos
  if (action === 'repos') {
    const repos = await detectRepos()
    return NextResponse.json({ repos })
  }

  // Fetch PRs for a specific repo
  if (repo) {
    const prs = await fetchPRsForRepo(repo)
    return NextResponse.json({ prs, repo })
  }

  // Fetch PRs across all repos
  const repos = await detectRepos()
  const allPRs: PRItem[] = []
  
  for (const r of repos.slice(0, 5)) {
    const prs = await fetchPRsForRepo(r)
    allPRs.push(...prs)
  }

  return NextResponse.json({
    prs: allPRs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    repos,
    total: allPRs.length,
  })
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json()
    const { repo, prNumber, action, body: prBody } = body

    if (!repo || !prNumber || !action) {
      return NextResponse.json({ error: 'Missing repo, prNumber, or action' }, { status: 400 })
    }

    if (action === 'approve') {
      const { stdout, stderr } = await runGH(
        `pr review ${prNumber} --repo ${repo} --approve${prBody ? ` --body "${prBody}"` : ''}`
      )
      return NextResponse.json({ ok: true, stdout, stderr })
    }

    if (action === 'request-changes') {
      if (!prBody) return NextResponse.json({ error: 'Body required for request-changes' }, { status: 400 })
      const { stdout, stderr } = await runGH(
        `pr review ${prNumber} --repo ${repo} --request-changes --body "${prBody}"`
      )
      return NextResponse.json({ ok: true, stdout, stderr })
    }

    if (action === 'comment') {
      const { stdout, stderr } = await runGH(
        `pr review ${prNumber} --repo ${repo} --comment --body "${prBody || 'Reviewed'}"`
      )
      return NextResponse.json({ ok: true, stdout, stderr })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
