'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredToken, getStoredUser } from '@/lib/auth';

function isAllowedPanelRole(role?: string) {
  return ['admin', 'support'].includes(role || '');
}

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    const user = getStoredUser();

    if (token && user && isAllowedPanelRole(user.role)) {
      router.replace('/dashboard');
      return;
    }

    router.replace('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="rounded-3xl border border-border bg-surface px-6 py-5 shadow-premium">
        <p className="text-sm uppercase tracking-[0.25em] text-accent">
          AZ Dienstleistungen
        </p>
        <p className="mt-3 text-slate-300">Support Panel wird vorbereitet…</p>
      </div>
    </div>
  );
}