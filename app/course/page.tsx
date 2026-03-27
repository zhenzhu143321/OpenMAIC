'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useCourseStore } from '@/lib/store/course';
import { CourseForm } from '@/components/course/course-form';

export default function CoursePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { courses, fetchCourses, createCourse, deleteCourse } = useCourseStore();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreate = async (data: Parameters<typeof createCourse>[0]) => {
    await createCourse(data);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('course.confirmDelete'))) {
      await deleteCourse(id);
    }
  };

  if (showForm) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl mb-4">{t('course.create')}</h1>
        <CourseForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl">{t('course.myCourses')}</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-500 text-white rounded">
          {t('course.create')}
        </button>
      </div>
      {courses.length === 0 ? (
        <p className="text-gray-500">{t('course.noCourses')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="border rounded p-4 hover:shadow-lg transition-shadow cursor-pointer">
              <div onClick={() => router.push(`/course/${course.id}`)}>
                <h2 className="text-xl mb-2">{course.name}</h2>
                <p className="text-sm text-gray-600">{course.college} - {course.major}</p>
                <p className="text-sm text-gray-500 mt-2">{course.description}</p>
                <p className="text-sm mt-2">{t('course.teacherName')}: {course.teacherName}</p>
                <p className="text-sm text-gray-500">{t('course.chapterCount')}: {course.chapterCount}</p>
              </div>
              <button onClick={() => handleDelete(course.id)} className="mt-2 text-red-500 text-sm">
                {t('course.delete')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
