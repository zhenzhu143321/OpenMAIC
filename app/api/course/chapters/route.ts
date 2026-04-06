import { type NextRequest, NextResponse } from 'next/server';
import { addChapter, updateChapter, removeChapter, reorderChapters, readCourse } from '@/lib/server/course-storage';
import { requireRole, requireOwnership } from '@/lib/server/auth-helpers';
import type { ChapterUpdates } from '@/lib/types/course';

export async function POST(req: NextRequest) {
  const authResult = await requireRole(req, 'teacher', 'admin');
  if (authResult instanceof NextResponse) return authResult;
  const currentUser = authResult;

  const { courseId, title, description } = await req.json();
  if (!courseId || !title) {
    return NextResponse.json({ success: false, error: 'courseId and title required' }, { status: 400 });
  }

  const course = await readCourse(courseId);
  if (!course) return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
  const ownershipError = requireOwnership(currentUser, course.ownerId);
  if (ownershipError) return ownershipError;

  const chapter = await addChapter(courseId, { title, description });
  return NextResponse.json({ success: true, chapter });
}

export async function PUT(req: NextRequest) {
  const authResult = await requireRole(req, 'teacher', 'admin');
  if (authResult instanceof NextResponse) return authResult;
  const currentUser = authResult;

  const body = await req.json();
  const { courseId, chapterIds, chapterId, ...updates } = body;
  if (!courseId) {
    return NextResponse.json({ success: false, error: 'courseId required' }, { status: 400 });
  }

  const course = await readCourse(courseId);
  if (!course) return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
  const ownershipError = requireOwnership(currentUser, course.ownerId);
  if (ownershipError) return ownershipError;

  if (Array.isArray(chapterIds)) {
    await reorderChapters(courseId, chapterIds);
  } else {
    if (!chapterId) return NextResponse.json({ success: false, error: 'chapterId required' }, { status: 400 });
    await updateChapter(courseId, chapterId, updates as ChapterUpdates);
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireRole(req, 'teacher', 'admin');
  if (authResult instanceof NextResponse) return authResult;
  const currentUser = authResult;

  const { courseId, chapterId } = await req.json();
  if (!courseId || !chapterId) {
    return NextResponse.json({ success: false, error: 'courseId and chapterId required' }, { status: 400 });
  }

  const course = await readCourse(courseId);
  if (!course) return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
  const ownershipError = requireOwnership(currentUser, course.ownerId);
  if (ownershipError) return ownershipError;

  await removeChapter(courseId, chapterId);
  return NextResponse.json({ success: true });
}
