import { promises as fs } from 'fs';
import path from 'path';
import { CLASSROOMS_DIR } from './classroom-storage';

const VALID_FILE_ID = /^[a-zA-Z0-9_-]+$/;
const KNOWN_EXTENSIONS = ['.mp3', '.wav', '.png', '.mp4', '.jpg', '.webp', '.webm'];

export function getMediaDir(classroomId: string): string {
  return path.join(CLASSROOMS_DIR, classroomId, 'media');
}

export async function mediaExists(
  classroomId: string,
  fileId: string,
): Promise<{ exists: boolean; fullName?: string }> {
  if (!VALID_FILE_ID.test(fileId)) return { exists: false };

  const dir = getMediaDir(classroomId);
  for (const ext of KNOWN_EXTENSIONS) {
    const filePath = path.join(dir, `${fileId}${ext}`);
    try {
      await fs.access(filePath);
      return { exists: true, fullName: `${fileId}${ext}` };
    } catch {
      // try next extension
    }
  }
  return { exists: false };
}

export async function saveMedia(
  classroomId: string,
  fileId: string,
  buffer: Buffer,
  ext: string,
): Promise<string> {
  if (!VALID_FILE_ID.test(fileId)) {
    throw new Error('Invalid fileId: only [a-zA-Z0-9_-] allowed');
  }

  const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
  const dir = getMediaDir(classroomId);
  await fs.mkdir(dir, { recursive: true });

  const fileName = `${fileId}${normalizedExt}`;
  const filePath = path.join(dir, fileName);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  await fs.writeFile(tmpPath, buffer);
  await fs.rename(tmpPath, filePath);

  return fileName;
}

export async function getMediaPath(
  classroomId: string,
  fileId: string,
): Promise<string | null> {
  if (!VALID_FILE_ID.test(fileId)) return null;

  const dir = getMediaDir(classroomId);
  for (const ext of KNOWN_EXTENSIONS) {
    const filePath = path.join(dir, `${fileId}${ext}`);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // try next
    }
  }
  return null;
}

export async function listMedia(classroomId: string): Promise<string[]> {
  const dir = getMediaDir(classroomId);
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => !f.endsWith('.tmp'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}
