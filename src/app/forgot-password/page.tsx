'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { forgotPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [devResetToken, setDevResetToken] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setError('Bitte E-Mail eingeben.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setDevResetUrl('');
      setDevResetToken('');

      const response = await forgotPassword(email.trim());

      setSuccess(
        response?.message ||
          'Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen vorbereitet.'
      );

      if (response && typeof response === 'object') {
        const maybeResponse = response as {
          resetUrl?: string;
          resetToken?: string;
        };

        if (maybeResponse.resetUrl) {
          setDevResetUrl(maybeResponse.resetUrl);
        }

        if (maybeResponse.resetToken) {
          setDevResetToken(maybeResponse.resetToken);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Passwort-Reset konnte nicht gestartet werden.'
      );
    } finally {
      setLoading(false);
    }
  };

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
                Passwort-Zurücksetzung für interne Admin-, Support- und
                Operator-Konten.
              </p>
            </div>
          </div>
        </div>

        <div className="relative px-10 pb-10">
          <p className="max-w-md text-sm leading-6 text-slate-500">
            Zugriff nur für autorisierte interne Benutzer von AZ
            Dienstleistungen.
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
              Passwort vergessen
            </p>

            <h1 className="mt-3 text-3xl font-semibold text-white">
              Passwort zurücksetzen
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted">
              Gib die E-Mail-Adresse deines internen Kontos ein. Wenn das Konto
              existiert, wird ein Link zum Zurücksetzen vorbereitet.
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

            {devResetUrl ? (
              <div className="rounded-2xl border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
                <p className="font-medium text-amber-300">
                  Entwicklungsmodus: Reset-Link
                </p>
                <a
                  href={devResetUrl}
                  className="mt-2 block break-all text-accent underline"
                >
                  {devResetUrl}
                </a>
              </div>
            ) : null}

            {devResetToken ? (
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-slate-300">
                <p className="font-medium text-white">Reset-Token</p>
                <p className="mt-2 break-all text-xs text-muted">
                  {devResetToken}
                </p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-accent px-5 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Anfrage läuft…' : 'Reset-Link anfordern'}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-accent transition hover:opacity-80"
            >
              Zurück zum Login
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Hinweis
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              In der Entwicklungsumgebung kann der Reset-Link direkt angezeigt
              werden. In Produktion sollte dieser Link per E-Mail versendet
              werden.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}