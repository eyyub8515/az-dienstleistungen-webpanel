'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { performLogin, getStoredToken, getStoredUser } from '@/lib/auth';

function isAllowedPanelRole(role?: string) {
  return ['admin', 'support'].includes(role || '');
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    const user = getStoredUser();

    if (token && user && isAllowedPanelRole(user.role)) {
      router.replace('/dashboard');
      return;
    }

    setCheckingSession(false);
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Bitte E-Mail und Passwort eingeben.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await performLogin(email.trim(), password);

      if (!isAllowedPanelRole(result?.user?.role)) {
        setError(
          'Dieser Zugang ist nicht für das Support Panel freigeschaltet.'
        );
        return;
      }

      router.replace('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Anmeldung konnte nicht durchgeführt werden.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
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

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden overflow-hidden border-r border-border bg-black lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,215,0,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_30%)]" />

        <div className="relative px-10 py-10">
          <p className="text-xs uppercase tracking-[0.35em] text-accent">
            AZ Dienstleistungen
          </p>
        </div>

        <div className="relative flex flex-1 items-center justify-center px-10">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            <div className="rounded-[2rem] border border-white/10 bg-black px-8 py-10">
              <div className="flex items-center justify-center">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-4xl font-semibold text-accent">
                  AZ
                </div>
              </div>

              <p className="mt-8 text-center text-lg font-semibold text-white">
                Support Panel
              </p>

              <p className="mt-3 text-center text-sm leading-6 text-slate-400">
                Internes Steuerzentrum für diskrete Premium-Anfragen,
                Fahrerkoordination, Mitarbeiterverwaltung und Preisabfragen.
              </p>
            </div>
          </div>
        </div>

        <div className="relative px-10 pb-10">
          <p className="max-w-md text-sm leading-6 text-slate-500">
            Zugriff nur für autorisierte Admin- und Support-Konten.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-xl rounded-[2rem] border border-border bg-surface p-6 shadow-premium sm:p-8">
          <div className="lg:hidden">
            <p className="text-xs uppercase tracking-[0.35em] text-accent">
              AZ Dienstleistungen
            </p>

            <div className="mt-6 rounded-[2rem] border border-white/10 bg-black p-6">
              <div className="flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-3xl font-semibold text-accent">
                  AZ
                </div>
              </div>

              <p className="mt-5 text-center text-lg font-semibold text-white">
                Support Panel
              </p>
            </div>
          </div>

          <div className="mt-2 lg:mt-0">
            <p className="text-sm uppercase tracking-[0.25em] text-accent">
              Zugang
            </p>

            <h1 className="mt-3 text-3xl font-semibold text-white">
              Anmelden
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted">
              Melde dich mit deinem internen Konto an, um Aufträge, Fahrer,
              Mitarbeiter und Preisabfragen zu verwalten.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm text-muted">E-Mail</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@az-dienstleistungen.com"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-accent"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm text-muted">Passwort</label>

                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-accent transition hover:opacity-80"
                >
                  Passwort vergessen?
                </Link>
              </div>

              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort eingeben"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-accent"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-accent px-5 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Anmeldung läuft…' : 'Jetzt anmelden'}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Hinweis
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Dieses Panel ist ausschließlich für interne Benutzer mit
              freigeschalteter Rolle vorgesehen. Admins haben Vollzugriff.
              Support darf ausschließlich Fahrer verwalten.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}