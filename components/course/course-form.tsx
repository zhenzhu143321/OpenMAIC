'use client';

import { useId, useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { CourseFormData } from '@/lib/types/course';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
      <div className="space-y-1.5">
        <Label htmlFor={nameId}>{t('course.name')}</Label>
        <Input
          id={nameId}
          name="name"
          type="text"
          autoComplete="off"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={collegeId}>{t('course.college')}</Label>
        <Input
          id={collegeId}
          name="college"
          type="text"
          autoComplete="organization"
          value={formData.college}
          onChange={(e) => setFormData({ ...formData, college: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={majorId}>{t('course.major')}</Label>
        <Input
          id={majorId}
          name="major"
          type="text"
          autoComplete="off"
          value={formData.major}
          onChange={(e) => setFormData({ ...formData, major: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={descriptionId}>{t('course.description')}</Label>
        <Textarea
          id={descriptionId}
          name="description"
          autoComplete="off"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={teacherNameId}>{t('course.teacherName')}</Label>
        <Input
          id={teacherNameId}
          name="teacherName"
          type="text"
          autoComplete="name"
          value={formData.teacherName}
          onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
          required
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit">{t('common.confirm')}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </form>
  );
}
