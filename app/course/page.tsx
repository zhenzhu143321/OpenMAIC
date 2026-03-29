'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useCourseStore } from '@/lib/store/course';
import { CourseForm } from '@/components/course/course-form';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Plus, BookOpen, User, Trash2 } from 'lucide-react';

export default function CoursePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { courses, fetchCourses, createCourse, deleteCourse } = useCourseStore();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreate = async (data: Parameters<typeof createCourse>[0]) => {
    await createCourse(data);
    setShowForm(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    await deleteCourse(deletingId);
    setDeletingId(null);
  };

  return (
    <div className="relative min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex justify-between items-center mb-8"
        >
          <h1 className="text-2xl font-bold text-foreground">{t('course.myCourses')}</h1>
          <Button onClick={() => setShowForm(true)}>
            <Plus />
            {t('course.create')}
          </Button>
        </motion.div>

        {/* Empty state */}
        {courses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-5">
              <BookOpen className="size-9 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">{t('course.emptyStateTitle')}</p>
            <p className="text-muted-foreground text-sm mb-6">{t('course.emptyStateDesc')}</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus />
              {t('course.create')}
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35, ease: 'easeOut' }}
              >
                <Card
                  className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-border/40 hover:shadow-lg hover:shadow-violet-500/[0.06] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                  onClick={() => router.push(`/course/${course.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-base leading-snug line-clamp-2">
                      {course.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {course.college}
                      </Badge>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {course.major}
                      </Badge>
                    </div>
                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="size-3.5" />
                      <span>{course.teacherName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <BookOpen className="size-3.5" />
                      <span>{course.chapterCount} {t('course.chapter')}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border/30 pt-3">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(course.id);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create course dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('course.create')}</DialogTitle>
          </DialogHeader>
          <CourseForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('course.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('course.confirmDelete')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('course.cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
              {t('course.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
