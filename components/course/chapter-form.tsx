'use client';

import { useId, useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ChapterFormProps {
  initialTitle?: string;
  initialDescription?: string;
  onSubmit: (title: string, description: string | null) => void;
  onCancel: () => void;
}

export function ChapterForm({ initialTitle = '', initialDescription = '', onSubmit, onCancel }: ChapterFormProps) {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), description.trim() || null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={titleId}>{t('course.chapterTitle')}</Label>
        <Input
          id={titleId}
          name="title"
          type="text"
          autoComplete="off"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={descriptionId}>{t('course.chapterDescription')}</Label>
        <Input
          id={descriptionId}
          name="description"
          type="text"
          autoComplete="off"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('course.chapterDescriptionOptional')}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm">{t('common.confirm')}</Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </form>
  );
}
