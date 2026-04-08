'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { SafeUser } from '@/lib/types/user';

export default function AdminPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchUsers() {
    const res = await fetch('/api/admin/users');
    if (res.status === 401 || res.status === 403) {
      router.replace('/');
      return;
    }
    const json = await res.json();
    if (json.success) setUsers(json.users);
    else setError(json.error ?? 'Failed to load users');
    setLoading(false);
  }

  useEffect(() => {
    void fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpdateUser(id: string, updates: Partial<Pick<SafeUser, 'role' | 'status'>>) {
    await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    fetchUsers();
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('Delete this user?')) return;
    await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
    fetchUsers();
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">{t('auth.users')}</h1>
      {users.length === 0 ? (
        <p className="text-muted-foreground">{t('auth.noUsersFound')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Username</th>
                <th className="py-2 pr-4">Display Name</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-2 pr-4 font-mono">{u.username}</td>
                  <td className="py-2 pr-4">{u.displayName}</td>
                  <td className="py-2 pr-4">
                    <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">{u.role}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      u.status === 'active' ? 'bg-green-100 text-green-700' :
                      u.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{u.status}</span>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 flex gap-2 flex-wrap">
                    {u.status === 'pending_review' && (
                      <button
                        onClick={() => handleUpdateUser(u.id, { role: 'teacher', status: 'active' })}
                        className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        {t('auth.approveTeacher')}
                      </button>
                    )}
                    {u.status === 'pending_review' && (
                      <button
                        onClick={() => handleUpdateUser(u.id, { role: 'student', status: 'active' })}
                        className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        {t('auth.rejectTeacher')}
                      </button>
                    )}
                    {u.status === 'active' && u.role !== 'admin' && (
                      <button
                        onClick={() => handleUpdateUser(u.id, { status: 'disabled' })}
                        className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        {t('auth.disableUser')}
                      </button>
                    )}
                    {u.status === 'disabled' && (
                      <button
                        onClick={() => handleUpdateUser(u.id, { status: 'active' })}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        {t('auth.enableUser')}
                      </button>
                    )}
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        {t('auth.deleteUser')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
