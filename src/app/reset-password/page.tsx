'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { resetPassword } from '@/lib/api';

export default function DriverResetPasswordPage() {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setIsMounted(true);

    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const nextToken = params.get('token') || '';
    setToken(nextToken);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setError('Kein Reset-Token gefunden.');
      return;
    }

    if (!password.trim()) {
      setError('Bitte neues Passwort eingeben.');
      return;
    }

    if (password.trim().length < 6) {
      setError('Das neue Passwort muss mindestens 6 Zeichen haben.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await resetPassword(token, password.trim());

      setSuccess(response?.message || 'Passwort erfolgreich zurückgesetzt.');
      setPassword('');
      setConfirmPassword('');

      window.setTimeout(() => {
        router.replace('/login');
      }, 1800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Passwort konnte nicht zurückgesetzt werden.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-xl rounded-[2rem] border border-border bg-surface p-8 text-center shadow-premium">
          <p className="text-sm uppercase tracking-[0.25em] text-accent">
            AZ Dienstleistungen
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white">
            Reset-Link wird geladen
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Bitte einen Moment warten…
          </p>
        </div>
      </main>
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
                Fahrer-/Unternehmer-Passwort zurücksetzen
              </p>

              <p className="mt-3 text-center text-sm leading-6 text-slate-400">
                Sicheres webbasiertes Zurücksetzen des Passworts für Fahrer- und Unternehmerzugänge.
              </p>
            </div>
          </div>
        </div>

        <div className="relative px-10 pb-10">
          <p className="max-w-md text-sm leading-6 text-slate-500">
            Zugriff nur mit gültigem Reset-Link aus der zugesendeten E-Mail.
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
                Fahrer-/Unternehmer-Passwort zurücksetzen
              </p>
            </div>
          </div>

          <div className="mt-2 lg:mt-0">
            <p className="text-sm uppercase tracking-[0.25em] text-accent">
              Driver Reset
            </p>

            <h1 className="mt-3 text-3xl font-semibold text-white">
              Neues Passwort setzen
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted">
              Vergib ein neues Passwort für deinen Fahrer- oder Unternehmerzugang. Danach kannst du
              dich wieder normal anmelden.
            </p>
          </div>

          {!token ? (
            <div className="mt-8 rounded-2xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
              Kein gültiger Reset-Link gefunden. Bitte fordere einen neuen Passwort-Reset an.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm text-muted">
                Neues Passwort
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Neues Passwort eingeben"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-muted">
                Passwort wiederholen
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort wiederholen"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-accent"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
                {success}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full rounded-2xl bg-accent px-5 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Passwort wird gespeichert…' : 'Neues Passwort speichern'}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-accent transition hover:opacity-80"
            >
              Zum Login
            </Link>

            <Link
              href="/forgot-password"
              className="text-sm font-medium text-muted transition hover:text-white"
            >
              Neuen Reset-Link anfordern
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Hinweis
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Dieses Zurücksetzen läuft jetzt direkt im Web. Nach dem Speichern des neuen Passworts
              kannst du dich wieder normal im Fahrer-/Unternehmer-Portal anmelden.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
