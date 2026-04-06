import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import { PROJECT_ROOT, writeJsonFileAtomic } from './classroom-storage';
import type { User, SafeUser, UserRole, UserStatus } from '@/lib/types/user';

const USERS_DIR = path.join(PROJECT_ROOT, 'data', 'users');
const BCRYPT_ROUNDS = 12;

// In-memory cache: admin ID seeded on first ensureAdminExists() call
let _seedAdminId: string | null = null;

async function ensureUsersDir(): Promise<void> {
  await fs.mkdir(USERS_DIR, { recursive: true });
}

function userFilePath(id: string): string {
  return path.join(USERS_DIR, `${id}.json`);
}

export function toSafeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...safe } = user;
  return safe;
}

export async function createUser(data: {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
}): Promise<User> {
  await ensureUsersDir();

  const existing = await readUserByUsername(data.username);
  if (existing) throw new Error('USERNAME_TAKEN');

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();
  const user: User = {
    id: `user_${nanoid(10)}`,
    username: data.username,
    passwordHash,
    displayName: data.displayName,
    role: data.role,
    status: data.status,
    createdAt: now,
    updatedAt: now,
  };

  await writeJsonFileAtomic(userFilePath(user.id), user);
  return user;
}

export async function readUser(id: string): Promise<User | null> {
  try {
    const raw = await fs.readFile(userFilePath(id), 'utf-8');
    return JSON.parse(raw) as User;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export async function readUserByUsername(username: string): Promise<User | null> {
  await ensureUsersDir();
  let entries: string[];
  try {
    entries = await fs.readdir(USERS_DIR);
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(USERS_DIR, entry), 'utf-8');
      const user = JSON.parse(raw) as User;
      if (user.username === username) return user;
    } catch {
      // skip corrupt files
    }
  }
  return null;
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<User, 'role' | 'status' | 'displayName'>>,
): Promise<User> {
  const user = await readUser(id);
  if (!user) throw new Error('USER_NOT_FOUND');
  const updated: User = { ...user, ...updates, updatedAt: new Date().toISOString() };
  await writeJsonFileAtomic(userFilePath(id), updated);
  return updated;
}

export async function deleteUser(id: string): Promise<void> {
  try {
    await fs.unlink(userFilePath(id));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

export async function listUsers(): Promise<SafeUser[]> {
  await ensureUsersDir();
  let entries: string[];
  try {
    entries = await fs.readdir(USERS_DIR);
  } catch {
    return [];
  }

  const users: SafeUser[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(USERS_DIR, entry), 'utf-8');
      const user = JSON.parse(raw) as User;
      users.push(toSafeUser(user));
    } catch {
      // skip corrupt files
    }
  }
  return users.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

/**
 * Lazily create a bootstrap admin account on first call.
 * Returns the admin's user ID (cached in memory for migration use).
 */
export async function ensureAdminExists(): Promise<string> {
  if (_seedAdminId) return _seedAdminId;

  await ensureUsersDir();
  const entries = await fs.readdir(USERS_DIR).catch(() => [] as string[]);

  if (entries.length > 0) {
    // Users already exist — find the admin
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(path.join(USERS_DIR, entry), 'utf-8');
        const user = JSON.parse(raw) as User;
        if (user.role === 'admin') {
          _seedAdminId = user.id;
          return _seedAdminId;
        }
      } catch {
        // skip
      }
    }
  }

  // No users or no admin — create from env
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error(
      'No admin user found and ADMIN_USERNAME/ADMIN_PASSWORD env vars not set. ' +
      'Set them in .env.local to bootstrap the first admin account.',
    );
  }

  const admin = await createUser({
    username,
    password,
    displayName: username,
    role: 'admin',
    status: 'active',
  });
  _seedAdminId = admin.id;
  return _seedAdminId;
}
