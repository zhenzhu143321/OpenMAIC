import { create } from 'zustand';
import type { Course, CourseListItem } from '@/lib/types/course';
import { nanoid } from 'nanoid';

interface CourseState {
  courses: CourseListItem[];
  currentCourse: Course | null;
  isLoading: boolean;
  fetchCourses: () => Promise<void>;
  fetchCourse: (id: string) => Promise<void>;
  createCourse: (data: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'classroomIds'>) => Promise<string>;
  updateCourse: (id: string, data: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addClassroom: (courseId: string, classroomId: string) => Promise<void>;
  removeClassroom: (courseId: string, classroomId: string) => Promise<void>;
  reorderClassrooms: (courseId: string, newOrder: string[]) => Promise<void>;
}

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: [],
  currentCourse: null,
  isLoading: false,

  fetchCourses: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/course');
      if (!res.ok) throw new Error('Failed to fetch courses');
      const courses = await res.json();
      set({ courses, isLoading: false });
    } catch (error) {
      console.error('fetchCourses failed:', error);
      set({ isLoading: false });
    }
  },

  fetchCourse: async (id: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/course?id=${id}`);
      if (!res.ok) throw new Error('Failed to fetch course');
      const course = await res.json();
      set({ currentCourse: course, isLoading: false });
    } catch (error) {
      console.error('fetchCourse failed:', error);
      set({ isLoading: false });
    }
  },

  createCourse: async (data) => {
    const id = `course_${nanoid(10)}`;
    const course: Course = {
      ...data,
      classroomIds: [],
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await fetch('/api/course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course),
    });
    await get().fetchCourses();
    return id;
  },

  updateCourse: async (id, data) => {
    const course = get().currentCourse;
    if (!course) return;
    const updated = { ...course, ...data, updatedAt: new Date().toISOString() };
    set({ currentCourse: updated });
    set((state) => ({
      courses: state.courses.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
    await fetch('/api/course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  },

  deleteCourse: async (id) => {
    await fetch(`/api/course?id=${id}`, { method: 'DELETE' });
    await get().fetchCourses();
  },

  addClassroom: async (courseId, classroomId) => {
    await fetch('/api/course/classrooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, classroomId }),
    });
    await get().fetchCourse(courseId);
  },

  removeClassroom: async (courseId, classroomId) => {
    await fetch('/api/course/classrooms', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, classroomId }),
    });
    await get().fetchCourse(courseId);
  },

  reorderClassrooms: async (courseId, newOrder) => {
    await fetch('/api/course/classrooms', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, newOrder }),
    });
    await get().fetchCourse(courseId);
  },
}));
