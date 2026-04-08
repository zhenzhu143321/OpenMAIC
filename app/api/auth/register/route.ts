import { type NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/server/user-storage';
import type { UserRole, UserStatus } from '@/lib/types/user';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { username, password, displayName, role } = body as {
    username?: string;
    password?: string;
    displayName?: string;
    role?: string;
  };

  if (!username || !password || !displayName) {
    return NextResponse.json(
      { success: false, error: 'username, password, and displayName are required' },
      { status: 400 },
    );
  }
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { success: false, error: 'username must be 3-32 characters: letters, numbers, underscore' },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
  }
  if (displayName.length < 1 || displayName.length > 64) {
    return NextResponse.json({ success: false, error: 'displayName must be 1-64 characters' }, { status: 400 });
  }

  const resolvedRole: UserRole = role === 'teacher' ? 'teacher' : 'student';
  // Teachers start as pending_review; students are immediately active
  const status: UserStatus = resolvedRole === 'teacher' ? 'pending_review' : 'active';

  try {
    const user = await createUser({ username, password, displayName, role: resolvedRole, status });
    const { passwordHash: _, ...safe } = user;
    return NextResponse.json({ success: true, user: safe }, { status: 201 });
  } catch (err) {
    if ((err as Error).message === 'USERNAME_TAKEN') {
      return NextResponse.json({ success: false, error: 'Username already taken' }, { status: 409 });
    }
    console.error('[auth/register]', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
