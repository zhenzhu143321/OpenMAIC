import { promises as fs } from 'fs';
import path from 'path';
import type { Course, CourseListItem } from '@/lib/types/course';
import { PROJECT_ROOT, writeJsonFileAtomic } from './classroom-storage';
import { withCourseLock } from './course-lock';

const COURSES_DIR = path.join(PROJECT_ROOT, 'data', 'courses');

async function ensureCoursesDir() {
  await fs.mkdir(COURSES_DIR, { recursive: true });
}

export async function persistCourse(course: Course): Promise<void> {
  await ensureCoursesDir();
  const filePath = path.join(COURSES_DIR, `${course.id}.json`);
  await writeJsonFileAtomic(filePath, course);
}

export async function readCourse(id: string): Promise<Course | null> {
  const filePath = path.join(COURSES_DIR, `${id}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Course;
  } catch {
    return null;
  }
}

export async function listCourses(): Promise<CourseListItem[]> {
  await ensureCoursesDir();
  try {
    const files = await fs.readdir(COURSES_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const courses = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const content = await fs.readFile(path.join(COURSES_DIR, file), 'utf-8');
          const course = JSON.parse(content) as Course;
          return {
            id: course.id,
            name: course.name,
            college: course.college,
            major: course.major,
            description: course.description,
            teacherName: course.teacherName,
            classroomCount: course.classroomIds.length,
            createdAt: course.createdAt,
          };
        } catch {
          return null;
        }
      })
    );

    return courses
      .filter((c): c is CourseListItem => c !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export async function deleteCourse(id: string): Promise<void> {
  const filePath = path.join(COURSES_DIR, `${id}.json`);
  await fs.unlink(filePath);
}

export async function addClassroomToCourse(courseId: string, classroomId: string): Promise<void> {
  await withCourseLock(courseId, async () => {
    const course = await readCourse(courseId);
    if (!course) throw new Error('Course not found');
    if (!course.classroomIds.includes(classroomId)) {
      course.classroomIds.push(classroomId);
      course.updatedAt = new Date().toISOString();
      await persistCourse(course);
    }
  });
}

export async function removeClassroomFromCourse(courseId: string, classroomId: string): Promise<void> {
  await withCourseLock(courseId, async () => {
    const course = await readCourse(courseId);
    if (!course) throw new Error('Course not found');
    course.classroomIds = course.classroomIds.filter(id => id !== classroomId);
    course.updatedAt = new Date().toISOString();
    await persistCourse(course);
  });
}

export async function reorderClassrooms(courseId: string, newOrder: string[]): Promise<void> {
  await withCourseLock(courseId, async () => {
    const course = await readCourse(courseId);
    if (!course) throw new Error('Course not found');
    course.classroomIds = newOrder;
    course.updatedAt = new Date().toISOString();
    await persistCourse(course);
  });
}

