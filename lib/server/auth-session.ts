import { getIronSession, type IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { SessionData } from '@/lib/types/user';

const SESSION_OPTIONS = {
  password: process.env.AUTH_SECRET ?? 'fallback-dev-secret-change-in-production-32ch',
  cookieName: 'openmaic_session',
  cookieOptions: {
    secure: process.env.AUTH_COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.AUTH_COOKIE_SECURE !== 'false'),
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}
