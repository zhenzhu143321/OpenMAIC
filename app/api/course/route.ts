import { NextRequest, NextResponse } from 'next/server';
import { listCourses, readCourse, persistCourse, deleteCourse } from '@/lib/server/course-storage';
import { classroomExists } from '@/lib/server/classroom-storage';
import { requireUser, requireRole, requireOwnership } from '@/lib/server/auth-helpers';
import type { Course } from '@/lib/types/course';

export async function GET(req: NextRequest) {
  const authResult = await requireUser(req);
  if (authResult instanceof NextResponse) return authResult;
  const currentUser = authResult;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const statusFilter = searchParams.get('status');

  if (id) {
    const course = await readCourse(id);
    if (!course) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const isOwner = course.ownerId === currentUser.id;
    const isAdmin = currentUser.role === 'admin';
    const isPublished = course.status === 'published';
    if (!isAdmin && !isOwner && !isPublished) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: true, course });
  }

  const allCourses = await listCourses();

  if (statusFilter === 'published') {
    return NextResponse.json({ success: true, courses: allCourses.filter((c) => c.status === 'published') });
  }

  if (currentUser.role === 'admin') {
    return NextResponse.json({ success: true, courses: allCourses });
  }

  if (currentUser.role === 'teacher' && currentUser.status === 'active') {
    return NextResponse.json({ success: true, courses: allCourses.filter((c) => c.ownerId === currentUser.id) });
  }

  // Students and pending_review teachers see only published courses
  return NextResponse.json({ success: true, courses: allCourses.filter((c) => c.status === 'published') });
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole(req, 'teacher', 'admin');
  if (authResult instanceof NextResponse) return authResult;
  const currentUser = authResult;

  const body = (await req.json()) as Partial<Course>;
  if (!body.id || !body.name) {
    return NextResponse.json({ success: false, error: 'id and name are required' }, { status: 400 });
  }

  const existing = await readCourse(body.id);
  if (existing) {
    const ownershipError = requireOwnership(currentUser, existing.ownerId);
    if (ownershipError) return ownershipError;
  }

  if (body.status === 'published') {
    if (!body.chapters?.length) {
      return NextResponse.json({ success: false, error: 'At least one chapter is required to publish' }, { status: 400 });
    }
    const boundChapters = body.chapters.filter((ch) => ch.classroomId);
    if (!boundChapters.length) {
      return NextResponse.json({ success: false, error: 'At least one chapter must have a bound classroom' }, { status: 400 });
    }
    for (const ch of boundChapters) {
      if (ch.classroomId && !(await classroomExists(ch.classroomId))) {
        return NextResponse.json(
          { success: false, error: `Classroom ${ch.classroomId} not found on server` },
          { status: 400 },
        );
      }
    }
  }

  const now = new Date().toISOString();
  const course: Course = {
    id: body.id,
    name: body.name,
    college: body.college ?? '',
    major: body.major ?? '',
    description: body.description ?? '',
    teacherName: body.teacherName ?? '',
    ownerId: existing ? existing.ownerId : currentUser.id,
    chapters: body.chapters ?? [],
    status: body.status ?? 'draft',
    ...(body.publishedAt ? { publishedAt: body.publishedAt } : {}),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await persistCourse(course);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireRole(req, 'teacher', 'admin');
  if (authResult instanceof NextResponse) return authResult;
  const currentUser = authResult;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
  }

  const course = await readCourse(id);
  if (!course) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const ownershipError = requireOwnership(currentUser, course.ownerId);
  if (ownershipError) return ownershipError;

  await deleteCourse(id);
  return NextResponse.json({ success: true });
}
