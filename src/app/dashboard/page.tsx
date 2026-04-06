'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import RequestTable from '@/components/RequestTable';
import { deleteRequest, getPriceInquiries, getStats } from '@/lib/api';
import { getStoredToken, getStoredUser } from '@/lib/auth';
import {
  PriceInquiryItem,
  RequestItem,
  StatsOverview,
} from '@/lib/types';

const defaultStats: StatsOverview = {
  total: 0,
  received: 0,
  accepted: 0,
  inProgress: 0,
  done: 0,
  urgent: 0,
};

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInquiryStatusLabel(status: PriceInquiryItem['status']) {
  switch (status) {
    case 'open':
      return 'Offen';
    case 'assigned':
      return 'Fahrer ausgewählt';
    case 'closed':
      return 'Geschlossen';
    case 'expired':
      return 'Abgelaufen';
    default:
      return status;
  }
}

function getInquiryStatusClass(status: PriceInquiryItem['status']) {
  switch (status) {
    case 'open':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
    case 'assigned':
      return 'border-accent/25 bg-accent/10 text-accent';
    case 'closed':
      return 'border-slate-500/25 bg-slate-500/10 text-slate-200';
    case 'expired':
      return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
    default:
      return 'border-slate-500/25 bg-slate-500/10 text-slate-200';
  }
}

type SummaryCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  emphasis?: 'default' | 'gold' | 'success';
};

function SummaryCard({
  label,
  value,
  hint,
  emphasis = 'default',
}: SummaryCardProps) {
  const classes =
    emphasis === 'gold'
      ? 'border-accent/20 bg-accent/5'
      : emphasis === 'success'
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : 'border-border bg-surface';

  return (
    <div className={`rounded-3xl border p-5 shadow-premium ${classes}`}>
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {hint ? (
        <p className="mt-2 text-sm leading-6 text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

type InquiryCardProps = {
  inquiry: PriceInquiryItem;
};

function InquiryCard({ inquiry }: InquiryCardProps) {
  return (
    <article className="rounded-3xl border border-border bg-surface p-5 shadow-premium xl:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${getInquiryStatusClass(
                inquiry.status
              )}`}
            >
              {getInquiryStatusLabel(inquiry.status)}
            </span>

            {inquiry.referenceNumber ? (
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
                {inquiry.referenceNumber}
              </span>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-semibold text-white">
            {inquiry.title || 'Preisabfrage'}
          </h3>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
            {inquiry.description || 'Keine Beschreibung vorhanden.'}
          </p>
        </div>

        <div className="xl:w-[220px]">
          <Link
            href={`/price-inquiries/${inquiry._id}`}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-white/5"
          >
            Preisabfrage öffnen
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Ablauf
          </p>
          <p className="mt-3 text-sm font-semibold text-white">
            {formatDate(inquiry.expiresAt)}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Erstellt: {formatDate(inquiry.createdAt)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Fahrer gesamt
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            {inquiry.stats?.totalDrivers ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Geantwortet
          </p>
          <p className="mt-3 text-lg font-semibold text-emerald-200">
            {inquiry.stats?.answeredCount ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Ausstehend
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            {inquiry.stats?.pendingCount ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Abgelehnt
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            {inquiry.stats?.declinedCount ?? 0}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsOverview>(defaultStats);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [openPriceInquiries, setOpenPriceInquiries] = useState<
    PriceInquiryItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [currentRole, setCurrentRole] = useState('');

  const loadDashboard = async () => {
    const token = getStoredToken();

    if (!token) {
      setLoading(false);
      setStats(defaultStats);
      setRequests([]);
      setOpenPriceInquiries([]);
      return;
    }

    try {
      setError('');

      const [statsData, priceInquiryData] = await Promise.all([
        getStats(token),
        getPriceInquiries(token, { status: 'open' }),
      ]);

      const safeStats: StatsOverview = {
        total: Number(statsData?.stats?.total ?? 0),
        received: Number(statsData?.stats?.received ?? 0),
        accepted: Number(statsData?.stats?.accepted ?? 0),
        inProgress: Number(statsData?.stats?.inProgress ?? 0),
        done: Number(statsData?.stats?.done ?? 0),
        urgent: Number(statsData?.stats?.urgent ?? 0),
      };

      const safeRequests: RequestItem[] = Array.isArray(statsData?.latestRequests)
        ? statsData.latestRequests
        : [];

      const safePriceInquiries: PriceInquiryItem[] = Array.isArray(priceInquiryData)
        ? priceInquiryData
        : [];

      setStats(safeStats);
      setRequests(safeRequests);
      setOpenPriceInquiries(safePriceInquiries);
    } catch (err) {
      setStats(defaultStats);
      setRequests([]);
      setOpenPriceInquiries([]);
      setError(
        err instanceof Error
          ? err.message
          : 'Dashboard konnte nicht geladen werden.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getStoredUser();
    setCurrentRole(user?.role || '');
    loadDashboard();
  }, []);

  const handleDelete = async (id: string) => {
    const token = getStoredToken();

    if (!token) {
      setError('Nicht eingeloggt.');
      return;
    }

    const confirmed = window.confirm(
      'Möchtest du diesen Auftrag wirklich löschen?'
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError('');

      await deleteRequest(token, id);

      setRequests((prev) => prev.filter((item) => item._id !== id));

      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Auftrag konnte nicht gelöscht werden.'
      );
    } finally {
      setDeletingId('');
    }
  };

  const openInquiryCount = openPriceInquiries.length;
  const answeredInquiryCount = openPriceInquiries.reduce(
    (sum, inquiry) => sum + Number(inquiry.stats?.answeredCount ?? 0),
    0
  );
  const pendingInquiryCount = openPriceInquiries.reduce(
    (sum, inquiry) => sum + Number(inquiry.stats?.pendingCount ?? 0),
    0
  );

  const isAdmin = currentRole === 'admin';

  const latestRequestsCount = useMemo(() => requests.length, [requests]);

  return (
    <AuthGuard allowedRoles={['admin', 'support']}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <main className="flex-1 p-5 xl:p-8 2xl:px-10">
          <div className="mx-auto w-full max-w-[1840px]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-accent">
                  Dashboard
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-white">
                  Dashboard
                </h1>
                <p className="mt-2 max-w-3xl text-muted">
                  Schneller Überblick über neue, aktive und kritische Aufträge,
                  offene Preisabfragen und den aktuellen Support-Betrieb.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/requests"
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm transition hover:bg-white/5"
                >
                  Aufträge öffnen
                </Link>

                <Link
                  href="/price-inquiries"
                  className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-black transition hover:opacity-90"
                >
                  Preisabfragen öffnen
                </Link>

                {isAdmin ? (
                  <Link
                    href="/staff"
                    className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm transition hover:bg-white/5"
                  >
                    Mitarbeiter öffnen
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-slate-300">
              Angemeldete Rolle:{' '}
              <span className="font-semibold text-white">
                {currentRole || 'unbekannt'}
              </span>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {loading ? (
              <p className="mt-6 text-muted">Dashboard wird geladen…</p>
            ) : null}

            {deletingId ? (
              <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
                Auftrag wird gelöscht…
              </div>
            ) : null}

            {!loading ? (
              <>
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                  <SummaryCard label="Gesamt Aufträge" value={stats.total} />
                  <SummaryCard label="Neu eingegangen" value={stats.received} />
                  <SummaryCard
                    label="Akzeptiert"
                    value={stats.accepted}
                    emphasis="gold"
                  />
                  <SummaryCard
                    label="In Bearbeitung"
                    value={stats.inProgress}
                  />
                  <SummaryCard
                    label="Erledigt"
                    value={stats.done}
                    emphasis="success"
                  />
                  <SummaryCard label="Urgent" value={stats.urgent} />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryCard
                    label="Offene Preisabfragen"
                    value={openInquiryCount}
                    emphasis="gold"
                  />
                  <SummaryCard
                    label="Fahrerantworten"
                    value={answeredInquiryCount}
                    emphasis="success"
                  />
                  <SummaryCard
                    label="Ausstehende Fahrer"
                    value={pendingInquiryCount}
                  />
                </div>

                <section className="mt-10">
                  <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-accent">
                        Preisabfragen
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        Offene Preisabfragen
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Laufende Fahrerabfragen mit aktuellem Antwortstatus im
                        Support Panel.
                      </p>
                    </div>

                    <Link
                      href="/price-inquiries"
                      className="rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-white/5"
                    >
                      Alle anzeigen
                    </Link>
                  </div>

                  {openPriceInquiries.length === 0 ? (
                    <div className="rounded-3xl border border-border bg-surface p-10 text-center shadow-premium">
                      <p className="text-lg font-semibold text-white">
                        Keine offenen Preisabfragen vorhanden
                      </p>
                      <p className="mt-2 text-sm text-muted">
                        Aktuell liegen keine laufenden Fahrerabfragen vor.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {openPriceInquiries
                        .slice(0, 6)
                        .map((inquiry) => (
                          <InquiryCard key={inquiry._id} inquiry={inquiry} />
                        ))}
                    </div>
                  )}
                </section>

                <section className="mt-10">
                  <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-accent">
                        Requests
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        Neueste Aufträge
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Kürzlich eingegangene oder aktualisierte Anfragen.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-slate-300">
                      Sichtbar: <span className="font-semibold text-white">{latestRequestsCount}</span>
                    </div>
                  </div>

                  <section className="rounded-3xl border border-border bg-surface p-3 shadow-premium xl:p-4">
                    <RequestTable
                      requests={Array.isArray(requests) ? requests : []}
                      onDelete={handleDelete}
                    />
                  </section>
                </section>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
