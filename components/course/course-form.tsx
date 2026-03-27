'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { CourseFormData } from '@/lib/types/course';

interface CourseFormProps {
  initialData?: Partial<CourseFormData>;
  onSubmit: (data: CourseFormData) => void;
  onCancel: () => void;
}

export function CourseForm({ initialData, onSubmit, onCancel }: CourseFormProps) {
  const { t } = useI18n();
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
        <label className="block text-sm mb-1">{t('course.name')}</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          required
        />
      </div>
      <div>
        <label className="block text-sm mb-1">{t('course.college')}</label>
        <input
          type="text"
          value={formData.college}
          onChange={(e) => setFormData({ ...formData, college: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          required
        />
      </div>
      <div>
        <label className="block text-sm mb-1">{t('course.major')}</label>
        <input
          type="text"
          value={formData.major}
          onChange={(e) => setFormData({ ...formData, major: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          required
        />
      </div>
      <div>
        <label className="block text-sm mb-1">{t('course.description')}</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          rows={3}
          required
        />
      </div>
      <div>
        <label className="block text-sm mb-1">{t('course.teacherName')}</label>
        <input
          type="text"
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
