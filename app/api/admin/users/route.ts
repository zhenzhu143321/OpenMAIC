import { type NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/auth-helpers';
import { listUsers, updateUser, deleteUser, readUser, toSafeUser } from '@/lib/server/user-storage';
import { listCourses, readCourse, persistCourse } from '@/lib/server/course-storage';

export async function GET(req: NextRequest) {
  const authResult = await requireRole(req, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  const users = await listUsers();
  return NextResponse.json({ success: true, users });
}

export async function PUT(req: NextRequest) {
  const authResult = await requireRole(req, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  const body = await req.json().catch(() => null);
  if (!body?.id) {
    return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
  }

  const { id, role, status } = body as { id: string; role?: string; status?: string };
  const validRoles = ['admin', 'teacher', 'student'];
  const validStatuses = ['active', 'pending_review', 'disabled'];

  const updates: Record<string, string> = {};
  if (role && validRoles.includes(role)) updates.role = role;
  if (status && validStatuses.includes(status)) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const updated = await updateUser(id, updates as Parameters<typeof updateUser>[1]);
    return NextResponse.json({ success: true, user: toSafeUser(updated) });
  } catch (err) {
    if ((err as Error).message === 'USER_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireRole(req, 'admin');
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const transferTo = searchParams.get('transferTo');

  if (!id) {
    return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
  }

  // Transfer courses if requested
  if (transferTo) {
    const targetUser = await readUser(transferTo);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Transfer target user not found' }, { status: 404 });
    }
    const allCourses = await listCourses();
    for (const listItem of allCourses) {
      const course = await readCourse(listItem.id);
      if (course && course.ownerId === id) {
        await persistCourse({ ...course, ownerId: transferTo });
      }
    }
  }

  await deleteUser(id);
  return NextResponse.json({ success: true });
}
