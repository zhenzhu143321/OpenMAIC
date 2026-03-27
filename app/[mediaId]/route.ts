import { type NextRequest, NextResponse } from 'next/server';
import { getMediaPath } from '@/lib/server/media-storage';
import { promises as fs } from 'fs';
import path from 'path';

const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;

  if (!mediaId.startsWith('gen_img_') && !mediaId.startsWith('tts_')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const classroomId = request.nextUrl.searchParams.get('classroomId');
  if (!classroomId) {
    return NextResponse.json({ error: 'Missing classroomId' }, { status: 400 });
  }

  const filePath = await getMediaPath(classroomId, mediaId);
  if (!filePath) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';
  const buffer = await fs.readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
