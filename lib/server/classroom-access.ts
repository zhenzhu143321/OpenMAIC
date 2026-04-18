import type { SafeUser } from '@/lib/types/user';
import type { PersistedClassroomData } from './classroom-storage';

export type AccessCtx = { publishedBoundIds?: Set<string> };

/**
 * Builds a set of classroomIds that are bound to at least one published course.
 * Call once per request and pass via AccessCtx to avoid N+1 reads.
 */
export async function buildPublishedCourseClassroomSet(): Promise<Set<string>> {
  const { listCourses, readCourse } = await import('./course-storage');
  const courses = await listCourses();
  const ids = new Set<string>();
  for (const meta of courses) {
    if (meta.status !== 'published') continue;
    const course = await readCourse(meta.id);
    course?.chapters?.forEach((ch) => ch.classroomId && ids.add(ch.classroomId));
  }
  return ids;
}

/**
 * Returns true if the user may read the classroom.
 *
 * Rules:
 * - admin: always yes
 * - owner: always yes
 * - standalone-published: anyone logged in
 * - course-bound: only if in a published course
 * - private (or missing): deny
 *
 * Pass `ctx.publishedBoundIds` when checking multiple classrooms in one request
 * to avoid re-reading all courses each time.
 */
export async function canAccessClassroom(
  classroom: PersistedClassroomData,
  user: SafeUser,
  ctx: AccessCtx = {},
): Promise<boolean> {
  if (user.role === 'admin') return true;
  if (classroom.ownerId === user.id) return true;
  if (classroom.visibility === 'standalone-published') return true;
  if (classroom.visibility === 'course-bound') {
    const set = ctx.publishedBoundIds ?? (await buildPublishedCourseClassroomSet());
    return set.has(classroom.id);
  }
  return false;
}
