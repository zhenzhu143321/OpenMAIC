import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { unsealData } from 'iron-session';
import type { SafeUser, UserRole } from '@/lib/types/user';
import { readUser, toSafeUser } from './user-storage';

const SESSION_PASSWORD =
  process.env.AUTH_SECRET ?? 'fallback-dev-secret-change-in-production-32ch';
const COOKIE_NAME = 'openmaic_session';

/**
 * Resolves the current user from the encrypted session cookie,
 * then reads the user file for up-to-date role/status.
 * Returns null if not logged in.
 */
export async function getCurrentUser(req: NextRequest): Promise<SafeUser | null> {
  const sealed = req.cookies.get(COOKIE_NAME)?.value;
  if (!sealed) return null;

  let session: { userId?: string };
  try {
    session = await unsealData<{ userId?: string }>(sealed, { password: SESSION_PASSWORD });
  } catch {
    return null;
  }

  if (!session.userId) return null;

  const user = await readUser(session.userId);
  if (!user) return null;

  return toSafeUser(user);
}

/**
 * Requires the caller to be authenticated.
 * Returns SafeUser on success.
 * Returns a 401 NextResponse if not logged in.
 * Returns a 403 NextResponse if the account is disabled.
 */
export async function requireUser(
  req: NextRequest,
): Promise<SafeUser | NextResponse> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (user.status === 'disabled') {
    return NextResponse.json({ success: false, error: 'Account disabled' }, { status: 403 });
  }
  return user;
}

/**
 * Returns the effective role, treating pending_review teachers as students.
 */
function effectiveRole(user: SafeUser): UserRole {
  if (user.status === 'pending_review') return 'student';
  return user.role;
}

/**
 * Requires the caller to have one of the specified roles (after status adjustment).
 * Returns SafeUser on success. Returns a NextResponse on failure.
 */
export async function requireRole(
  req: NextRequest,
  ...roles: UserRole[]
): Promise<SafeUser | NextResponse> {
  const result = await requireUser(req);
  if (result instanceof NextResponse) return result;

  const role = effectiveRole(result);
  if (!roles.includes(role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  return result;
}

/**
 * Checks that the current user owns the resource (or is admin).
 * Returns a 403 NextResponse if the check fails; undefined on success.
 */
export function requireOwnership(user: SafeUser, resourceOwnerId: string): NextResponse | undefined {
  if (effectiveRole(user) === 'admin') return undefined; // admin bypasses
  if (user.id !== resourceOwnerId) {
    return NextResponse.json({ success: false, error: 'Forbidden: not resource owner' }, { status: 403 });
  }
  return undefined;
}
