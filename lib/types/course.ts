export interface Course {
  id: string;
  name: string;
  college: string;
  major: string;
  description: string;
  teacherName: string;
  classroomIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type CourseListItem = Omit<Course, 'classroomIds' | 'updatedAt'> & {
  classroomCount: number;
};
