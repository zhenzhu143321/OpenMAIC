'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/lib/hooks/use-i18n';
import { cn } from '@/lib/utils';

interface PublishedClassroom {
  id: string;
  name: string;
  sceneCount: number;
}

interface ClassroomPickerDialogProps {
  /** Chapter IDs already bound in the course — exclude from picker */
  usedClassroomIds: Set<string>;
  onSelect: (classroomId: string) => Promise<void>;
  onClose: () => void;
}

export function ClassroomPickerDialog({ usedClassroomIds, onSelect, onClose }: ClassroomPickerDialogProps) {
  const { t } = useI18n();
  const [classrooms, setClassrooms] = useState<PublishedClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/classroom')
      .then((r) => r.json())
      .then(({ classrooms }: { classrooms: Array<{ id: string; name?: string; sceneCount: number }> }) => {
        const items: PublishedClassroom[] = classrooms
          .filter((c) => !usedClassroomIds.has(c.id))
          .map((c) => ({
            id: c.id,
            name: c.name || c.id,
            sceneCount: c.sceneCount ?? 0,
          }));
        setClassrooms(items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [usedClassroomIds]);

  const handleSelect = async (id: string) => {
    setSubmitting(true);
    try {
      await onSelect(id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('course.selectClassroom')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('course.noAvailableClassrooms')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] -mx-1 px-1">
          {loading ? (
            <div className="space-y-2 py-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : classrooms.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              {t('course.noAvailableClassrooms')}
            </p>
          ) : (
            <div className="space-y-1.5 py-1">
              {classrooms.map((c, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  disabled={submitting}
                  onClick={() => handleSelect(c.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg border border-border/40',
                    'hover:border-primary/40 hover:bg-primary/5 transition-all duration-150',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <div className="font-medium text-sm text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {c.sceneCount} {t('course.scenes')}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
