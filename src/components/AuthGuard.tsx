'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { restoreSession } from '@/lib/auth';
import { User } from '@/lib/types';

type AuthGuardProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
};

function hasAllowedRole(user: User | null, allowedRoles?: string[]) {
  if (!user) return false;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(user.role);
}

export default function AuthGuard({
  children,
  allowedRoles,
  redirectTo = '/dashboard',
}: AuthGuardProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const session = await restoreSession();

        if (!isMounted) return;

        if (!session || !session.user) {
          router.replace('/login');
          return;
        }

        if (!hasAllowedRole(session.user, allowedRoles)) {
          router.replace(redirectTo);
          return;
        }

        setUser(session.user);
        setReady(true);
      } catch {
        if (!isMounted) return;
        router.replace('/login');
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router, allowedRoles, redirectTo]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-3xl border border-border bg-surface px-6 py-5 shadow-premium">
          <p className="text-sm uppercase tracking-[0.25em] text-accent">
            AZ Dienstleistungen
          </p>
          <p className="mt-3 text-slate-300">Sitzung wird geprüft…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}