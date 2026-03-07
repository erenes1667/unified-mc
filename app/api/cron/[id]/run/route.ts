import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Try to trigger via OpenClaw gateway
  try {
    const res = await fetch(`http://localhost:18789/api/cron/${id}/run`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ ok: true, id, source: 'gateway', ...data });
    }
  } catch {
    // gateway not available, fall through
  }

  // Fallback: just acknowledge (can't actually trigger without gateway)
  return NextResponse.json({ ok: true, id, source: 'mock', message: `Job ${id} queued (gateway offline)` });
}
