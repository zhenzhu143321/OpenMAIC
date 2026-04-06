import { type NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { readUserByUsername, verifyPassword, ensureAdminExists, toSafeUser } from '@/lib/server/user-storage';
import { getSession } from '@/lib/server/auth-session';
import type { User } from '@/lib/types/user';

// Pre-computed at module load to ensure full bcrypt work factor runs on user-not-found (timing attack mitigation)
const DUMMY_HASH: string = bcrypt.hashSync('__placeholder__', 12);

export async function POST(req: NextRequest) {
  // Bootstrap admin on first login attempt
  try {
    await ensureAdminExists();
  } catch (err) {
    console.error('[auth/login] ensureAdminExists failed:', err);
    // Non-fatal — continue if admin already exists
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { username, password } = body as { username?: string; password?: string };
  if (!username || !password) {
    return NextResponse.json({ success: false, error: 'username and password are required' }, { status: 400 });
  }

  const user = await readUserByUsername(username);
  if (!user) {
    // Constant-time: run bcrypt even on miss to prevent timing attacks
    await verifyPassword(
      { passwordHash: DUMMY_HASH } as User,
      password,
    );
    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  }

  if (user.status === 'disabled') {
    return NextResponse.json({ success: false, error: 'Account disabled' }, { status: 403 });
  }

  const valid = await verifyPassword(user, password);
  if (!valid) {
    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  }

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  return NextResponse.json({ success: true, user: toSafeUser(user) });
}
