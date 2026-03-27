import { NextRequest, NextResponse } from 'next/server';
import { addClassroomToCourse, removeClassroomFromCourse, reorderClassrooms } from '@/lib/server/course-storage';

export async function POST(req: NextRequest) {
  try {
    const { courseId, classroomId } = await req.json();
    if (!courseId || !classroomId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    await addClassroomToCourse(courseId, classroomId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { courseId, classroomId } = await req.json();
    if (!courseId || !classroomId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    await removeClassroomFromCourse(courseId, classroomId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { courseId, newOrder } = await req.json();
    if (!courseId || !newOrder) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    await reorderClassrooms(courseId, newOrder);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
