import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || 'emperor';
  const safe = id.replace(/[^a-z-]/g, '');
  const filePath = path.join(process.cwd(), 'config', 'roles', `${safe}.json`);
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }
}
