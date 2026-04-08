import { type NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth-helpers';

export async function GET(req: NextRequest) {
  const result = await requireUser(req);
  if (result instanceof NextResponse) return result;
  return NextResponse.json({ success: true, user: result });
}
