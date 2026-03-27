'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useCourseStore } from '@/lib/store/course';
import { CourseForm } from '@/components/course/course-form';

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { t } = useI18n();
  const router = useRouter();
  const { currentCourse, fetchCourse, updateCourse, removeClassroom } = useCourseStore();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchCourse(params.id);
  }, [params.id, fetchCourse]);

  if (!currentCourse) return <div className="p-8">{t('common.loading')}</div>;

  const handleUpdate = async (data: Parameters<typeof updateCourse>[1]) => {
    await updateCourse(params.id, data);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl mb-4">{t('course.edit')}</h1>
        <CourseForm initialData={currentCourse} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl">{currentCourse.name}</h1>
        <button onClick={() => setEditing(true)} className="px-4 py-2 border rounded">
          {t('course.edit')}
        </button>
      </div>
      <div className="mb-6 space-y-2">
        <p><strong>{t('course.college')}:</strong> {currentCourse.college}</p>
        <p><strong>{t('course.major')}:</strong> {currentCourse.major}</p>
        <p><strong>{t('course.teacherName')}:</strong> {currentCourse.teacherName}</p>
        <p><strong>{t('course.description')}:</strong> {currentCourse.description}</p>
      </div>
      <h2 className="text-xl mb-4">{t('course.classroomCount')}: {currentCourse.classroomIds.length}</h2>
      {currentCourse.classroomIds.length === 0 ? (
        <p className="text-gray-500">{t('course.noClassrooms')}</p>
      ) : (
        <div className="space-y-2">
          {currentCourse.classroomIds.map((id) => (
            <div key={id} className="border rounded p-4 flex justify-between items-center">
              <span className="cursor-pointer" onClick={() => router.push(`/stage/${id}`)}>{id}</span>
              <button onClick={() => removeClassroom(params.id, id)} className="text-red-500 text-sm">
                {t('course.removeClassroom')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
