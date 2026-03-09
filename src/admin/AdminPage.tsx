import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAdminSession } from './useAdminSession';

export function AdminPage(props: { title: string; children: ReactNode }) {
  const router = useRouter();
  const admin = useAdminSession();

  useEffect(() => {
    if (admin.loading) return;
    if (!admin.authorized) {
      void router.replace('/login');
    }
  }, [admin.loading, admin.authorized, router]);

  if (admin.loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-cyan-400" />
      </div>
    );
  }

  if (!admin.authorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <p className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <AdminLayout title={props.title} currentPath={router.pathname} userLabel={admin.userLabel} onSignOut={admin.signOut}>
      {props.children}
    </AdminLayout>
  );
}
