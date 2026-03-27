import { type NextRequest, NextResponse } from 'next/server';
import { addChapter, updateChapter, removeChapter, reorderChapters } from '@/lib/server/course-storage';

export async function POST(req: NextRequest) {
  try {
    const { courseId, title, description } = await req.json();
    if (!courseId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const chapter = await addChapter(courseId, { title, description });
    return NextResponse.json({ success: true, chapter });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { courseId } = body;
    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }
    // Reorder: { courseId, chapterIds: string[] }
    if (Array.isArray(body.chapterIds)) {
      await reorderChapters(courseId, body.chapterIds);
      return NextResponse.json({ success: true });
    }
    // Update single chapter: { courseId, chapterId, ...updates }
    const { chapterId, title, description, classroomId } = body;
    if (!chapterId) {
      return NextResponse.json({ error: 'Missing chapterId' }, { status: 400 });
    }
    const updates: Parameters<typeof updateChapter>[2] = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (classroomId !== undefined) updates.classroomId = classroomId;
    await updateChapter(courseId, chapterId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { courseId, chapterId } = await req.json();
    if (!courseId || !chapterId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    await removeChapter(courseId, chapterId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
