'use client';

import { useId, useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { CourseFormData } from '@/lib/types/course';

interface CourseFormProps {
  initialData?: Partial<CourseFormData>;
  onSubmit: (data: CourseFormData) => void;
  onCancel: () => void;
}

export function CourseForm({ initialData, onSubmit, onCancel }: CourseFormProps) {
  const { t } = useI18n();
  const nameId = useId();
  const collegeId = useId();
  const majorId = useId();
  const descriptionId = useId();
  const teacherNameId = useId();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    college: initialData?.college || '',
    major: initialData?.major || '',
    description: initialData?.description || '',
    teacherName: initialData?.teacherName || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor={nameId} className="block text-sm mb-1">
          {t('course.name')}
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          autoComplete="off"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          required
        />
      </div>
      <div>
        <label htmlFor={collegeId} className="block text-sm mb-1">
          {t('course.college')}
        </label>
        <input
          id={collegeId}
          name="college"
          type="text"
          autoComplete="organization"
          value={formData.college}
          onChange={(e) => setFormData({ ...formData, college: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          required
        />
      </div>
      <div>
        <label htmlFor={majorId} className="block text-sm mb-1">
          {t('course.major')}
        </label>
        <input
          id={majorId}
          name="major"
          type="text"
          autoComplete="off"
          value={formData.major}
          onChange={(e) => setFormData({ ...formData, major: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          required
        />
      </div>
      <div>
        <label htmlFor={descriptionId} className="block text-sm mb-1">
          {t('course.description')}
        </label>
        <textarea
          id={descriptionId}
          name="description"
          autoComplete="off"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          rows={3}
          required
        />
      </div>
      <div>
        <label htmlFor={teacherNameId} className="block text-sm mb-1">
          {t('course.teacherName')}
        </label>
        <input
          id={teacherNameId}
          name="teacherName"
          type="text"
          autoComplete="name"
          value={formData.teacherName}
          onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          required
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
          {t('common.confirm')}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
