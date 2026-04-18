import { type NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import {
  buildRequestOrigin,
  isValidClassroomId,
  listClassrooms,
  persistClassroom,
  readClassroom,
  type ClassroomVisibility,
} from '@/lib/server/classroom-storage';
import { requireUser, requireRole, requireOwnership } from '@/lib/server/auth-helpers';
import { canAccessClassroom, buildPublishedCourseClassroomSet } from '@/lib/server/classroom-access';

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, 'teacher', 'admin');
  if (authResult instanceof NextResponse) return authResult;
  const currentUser = authResult;

  const body = await request.json().catch(() => null);
  if (!body?.stage || !body?.scenes) {
    return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'stage and scenes are required');
  }

  const id: string = body.stage?.id ?? randomUUID();
  if (!isValidClassroomId(id)) {
    return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Invalid classroom ID format');
  }

  const existing = await readClassroom(id);
  if (existing) {
    const ownershipError = requireOwnership(currentUser, existing.ownerId);
    if (ownershipError) return ownershipError;
  }

  const baseUrl = buildRequestOrigin(request);
  const visibility: ClassroomVisibility = existing?.visibility ?? 'private';
  const result = await persistClassroom(
    {
      id,
      stage: body.stage,
      scenes: body.scenes,
      outlines: body.outlines,
      ownerId: existing ? existing.ownerId : currentUser.id,
      visibility,
    },
    baseUrl,
  );

  return apiSuccess({ id: result.id, url: result.url }, 201);
}

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) return authResult;
  const currentUser = authResult;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // Single classroom lookup
  if (id) {
    if (!isValidClassroomId(id)) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Invalid classroom ID');
    }
    const classroom = await readClassroom(id);
    if (!classroom) {
      return apiError(API_ERROR_CODES.INTERNAL_ERROR, 404, 'Classroom not found');
    }
    const accessible = await canAccessClassroom(classroom, currentUser);
    if (!accessible) {
      return apiError(API_ERROR_CODES.INTERNAL_ERROR, 403, 'Forbidden');
    }
    return apiSuccess({ classroom });
  }

  // List: admins see everything; others see only accessible classrooms
  const list = await listClassrooms();
  if (currentUser.role === 'admin') {
    return apiSuccess({ classrooms: list });
  }

  const publishedBoundIds = await buildPublishedCourseClassroomSet();
  const visible = [];
  for (const item of list) {
    const full = await readClassroom(item.id);
    if (!full) continue;
    if (await canAccessClassroom(full, currentUser, { publishedBoundIds })) {
      visible.push(item);
    }
  }
  return apiSuccess({ classrooms: visible });
}
