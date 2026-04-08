'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { SafeUser } from '@/lib/types/user';

interface UserMenuProps {
  /** Pre-fetched user — pass this to avoid a duplicate /api/auth/me fetch. */
  user?: SafeUser | null;
}

export function UserMenu({ user: userProp }: UserMenuProps = {}) {
  const { t } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(userProp ?? null);

  useEffect(() => {
    if (userProp !== undefined) {
      setUser(userProp);
      return;
    }
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.success) setUser(d.user); })
      .catch(() => {});
  }, [userProp]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      {user.role === 'admin' && (
        <button
          onClick={() => router.push('/admin')}
          className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
        >
          {t('auth.adminPanel')}
        </button>
      )}
      <span className="text-sm text-muted-foreground hidden sm:inline">{user.displayName}</span>
      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
        {t('auth.roleBadge' + user.role.charAt(0).toUpperCase() + user.role.slice(1))}
      </span>
      {user.status === 'pending_review' && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
          {t('auth.statusPendingReview')}
        </span>
      )}
      <button
        onClick={handleLogout}
        className="text-xs px-2 py-1 rounded border hover:bg-muted"
      >
        {t('auth.logout')}
      </button>
    </div>
  );
}
