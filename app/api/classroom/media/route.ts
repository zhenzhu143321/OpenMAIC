import { type NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { isValidClassroomId } from '@/lib/server/classroom-storage';
import { listMedia, saveMedia, getMediaPath, mediaExists } from '@/lib/server/media-storage';

const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !isValidClassroomId(id)) {
    return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Invalid or missing classroom id');
  }

  const listAll = request.nextUrl.searchParams.get('list');
  if (listAll === 'true') {
    const files = await listMedia(id);
    return apiSuccess({ files });
  }

  const file = request.nextUrl.searchParams.get('file');
  if (!file) {
    return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing file parameter');
  }

  // file can be either a bare fileId or fileId.ext
  const dotIdx = file.lastIndexOf('.');
  const fileId = dotIdx > 0 ? file.slice(0, dotIdx) : file;

  const filePath = await getMediaPath(id, fileId);
  if (!filePath) {
    return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'Media file not found');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';

  const stat = await fs.stat(filePath);
  const fileBuffer = await fs.readFile(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classroomId, fileId, ext, base64 } = body;

    if (!classroomId || !fileId || !ext || !base64) {
      return apiError(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD,
        400,
        'Missing required fields: classroomId, fileId, ext, base64',
      );
    }

    if (!isValidClassroomId(classroomId)) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Invalid classroom id');
    }

    // Idempotent: if already exists, return 200 directly
    const existing = await mediaExists(classroomId, fileId);
    if (existing.exists) {
      return apiSuccess({ fileName: existing.fullName, cached: true });
    }

    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_UPLOAD_SIZE) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'File too large (max 50MB)');
    }

    const fileName = await saveMedia(classroomId, fileId, buffer, ext);
    return apiSuccess({ fileName, cached: false }, 201);
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to save media',
      error instanceof Error ? error.message : String(error),
    );
  }
}
