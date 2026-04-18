import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SafeUser } from '@/lib/types/user';
import type { PersistedClassroomData } from '@/lib/server/classroom-storage';

// Mock course-storage so canAccessClassroom never touches the filesystem
vi.mock('@/lib/server/course-storage', () => ({
  listCourses: vi.fn(),
  readCourse: vi.fn(),
}));

import { canAccessClassroom, buildPublishedCourseClassroomSet } from '@/lib/server/classroom-access';
import { listCourses, readCourse } from '@/lib/server/course-storage';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<SafeUser>): SafeUser {
  return {
    id: 'user_default',
    username: 'test',
    displayName: 'Test',
    role: 'student',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeClassroom(
  overrides: Partial<PersistedClassroomData>,
): PersistedClassroomData {
  return {
    id: 'cls_default',
    ownerId: 'user_other',
    visibility: 'private',
    stage: {} as never,
    scenes: [],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// Pre-built sets for reuse
const PUBLISHED_SET_WITH_CLS = new Set(['cls_bound']);
const EMPTY_SET = new Set<string>();

beforeEach(() => {
  vi.mocked(listCourses).mockResolvedValue([]);
  vi.mocked(readCourse).mockResolvedValue(null);
});

// ─── permission matrix ───────────────────────────────────────────────────────

describe('canAccessClassroom', () => {
  // ── admin ────────────────────────────────────────────────────────────────
  it('admin sees private classroom owned by someone else', async () => {
    const user = makeUser({ role: 'admin' });
    const cls = makeClassroom({ visibility: 'private' });
    expect(await canAccessClassroom(cls, user, { publishedBoundIds: EMPTY_SET })).toBe(true);
  });

  it('admin sees course-bound classroom not in any published course', async () => {
    const user = makeUser({ role: 'admin' });
    const cls = makeClassroom({ id: 'cls_x', visibility: 'course-bound' });
    expect(await canAccessClassroom(cls, user, { publishedBoundIds: EMPTY_SET })).toBe(true);
  });

  // ── owner ────────────────────────────────────────────────────────────────
  it('teacher (active) sees own private classroom', async () => {
    const user = makeUser({ id: 'user_owner', role: 'teacher', status: 'active' });
    const cls = makeClassroom({ ownerId: 'user_owner', visibility: 'private' });
    expect(await canAccessClassroom(cls, user, { publishedBoundIds: EMPTY_SET })).toBe(true);
  });

  // ── non-owner teacher ────────────────────────────────────────────────────
  it('teacher (active) cannot see private classroom owned by someone else', async () => {
    const user = makeUser({ role: 'teacher', status: 'active' });
    const cls = makeClassroom({ visibility: 'private' });
    expect(await canAccessClassroom(cls, user, { publishedBoundIds: EMPTY_SET })).toBe(false);
  });

  it('teacher (active) sees standalone-published classroom', async () => {
    const user = makeUser({ role: 'teacher', status: 'active' });
    const cls = makeClassroom({ visibility: 'standalone-published' });
    expect(await canAccessClassroom(cls, user, { publishedBoundIds: EMPTY_SET })).toBe(true);
  });

  it('teacher (active) sees course-bound classroom in a published course', async () => {
    const user = makeUser({ role: 'teacher', status: 'active' });
    const cls = makeClassroom({ id: 'cls_bound', visibility: 'course-bound' });
    expect(await canAccessClassroom(cls, user, { publishedBoundIds: PUBLISHED_SET_WITH_CLS })).toBe(true);
  });

  it('teacher (active) cannot see course-bound classroom NOT in any published course', async () => {
    const user = makeUser({ role: 'teacher', status: 'active' });
    const cls = makeClassroom({ id: 'cls_unbound', visibility: 'course-bound' });
    expect(await canAccessClassroom(cls, user, { publishedBoundIds: EMPTY_SET })).toBe(false);
  });

  // ── pending_review teacher (treated as student) ──────────────────────────
  it('pending_review teacher cannot see private classroom they do not own', async () => {
    const user = makeUser({ role: 'teacher', status: 'pending_review' });
    const cls = makeClassroom({ visibility: 'private' });
    expect(await canAccessClassroom(cls, user, { publishedBoundIds: EMPTY_SET })).toBe(false);
  });

  // ── student ──────────────────────────────────────────────────────────────
  it('student cannot see private classroom', async () => {
    const user = makeUser({ role: 'student' });
    const cls = makeClassroom({ visibility: 'private' });
    expect(await canAccessClassroom(cls, user, { publishedBoundIds: EMPTY_SET })).toBe(false);
  });

  it('student sees standalone-published classroom', async () => {
    const user = makeUser({ role: 'student' });
    const cls = makeClassroom({ visibility: 'standalone-published' });
    expect(await canAccessClassroom(cls, user, { publishedBoundIds: EMPTY_SET })).toBe(true);
  });

  it('student sees course-bound classroom in a published course', async () => {
    const user = makeUser({ role: 'student' });
    const cls = makeClassroom({ id: 'cls_bound', visibility: 'course-bound' });
    expect(await canAccessClassroom(cls, user, { publishedBoundIds: PUBLISHED_SET_WITH_CLS })).toBe(true);
  });

  it('student cannot see course-bound classroom NOT in any published course', async () => {
    const user = makeUser({ role: 'student' });
    const cls = makeClassroom({ id: 'cls_unbound', visibility: 'course-bound' });
    expect(await canAccessClassroom(cls, user, { publishedBoundIds: EMPTY_SET })).toBe(false);
  });
});

// ─── buildPublishedCourseClassroomSet ────────────────────────────────────────

describe('buildPublishedCourseClassroomSet', () => {
  it('returns empty set when no courses', async () => {
    vi.mocked(listCourses).mockResolvedValue([]);
    const set = await buildPublishedCourseClassroomSet();
    expect(set.size).toBe(0);
  });

  it('excludes draft courses', async () => {
    vi.mocked(listCourses).mockResolvedValue([
      { id: 'c1', status: 'draft' } as never,
    ]);
    vi.mocked(readCourse).mockResolvedValue({
      id: 'c1',
      chapters: [{ classroomId: 'cls_draft' }],
    } as never);
    const set = await buildPublishedCourseClassroomSet();
    expect(set.has('cls_draft')).toBe(false);
  });

  it('includes classrooms from published courses', async () => {
    vi.mocked(listCourses).mockResolvedValue([
      { id: 'c1', status: 'published' } as never,
    ]);
    vi.mocked(readCourse).mockResolvedValue({
      id: 'c1',
      chapters: [{ classroomId: 'cls_a' }, { classroomId: 'cls_b' }],
    } as never);
    const set = await buildPublishedCourseClassroomSet();
    expect(set.has('cls_a')).toBe(true);
    expect(set.has('cls_b')).toBe(true);
  });
});
