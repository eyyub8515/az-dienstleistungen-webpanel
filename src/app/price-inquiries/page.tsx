'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import { getPriceInquiries } from '@/lib/api';
import { getStoredToken, getStoredUser } from '@/lib/auth';
import {
  PriceInquiryDriverEntry,
  PriceInquiryItem,
  RequestItem,
} from '@/lib/types';

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

function formatMoney(amount?: number | null) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStatusLabel(status: PriceInquiryItem['status']) {
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

function getStatusClass(status: PriceInquiryItem['status']) {
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

function getRequestObject(item: PriceInquiryItem): RequestItem | null {
  if (!item.requestId || typeof item.requestId === 'string') return null;
  return item.requestId as RequestItem;
}

function getCustomerEnteredPrice(item: PriceInquiryItem): number | null {
  const request = getRequestObject(item);
  return request?.clientBudgetAmount ?? request?.budgetAmount ?? null;
}

function getDriverAnswers(item: PriceInquiryItem): PriceInquiryDriverEntry[] {
  return (
    Array.isArray(item.driverInquiries) ? item.driverInquiries : []
  ).filter(
    (entry) =>
      entry.status === 'answered' && typeof entry.responsePrice === 'number'
  );
}

function getLatestAnsweredDriverPrice(item: PriceInquiryItem): number | null {
  const answers = getDriverAnswers(item);

  if (!answers.length) return null;

  const sorted = [...answers].sort((a, b) => {
    const aTime = new Date(a.respondedAt || a.viewedAt || 0).getTime();
    const bTime = new Date(b.respondedAt || b.viewedAt || 0).getTime();
    return bTime - aTime;
  });

  const latest = sorted[0];
  return typeof latest.responsePrice === 'number' ? latest.responsePrice : null;
}

function getLowestAnsweredDriverPrice(item: PriceInquiryItem): number | null {
  const prices = getDriverAnswers(item)
    .map((entry) => entry.responsePrice)
    .filter(
      (value): value is number =>
        typeof value === 'number' && !Number.isNaN(value)
    );

  if (!prices.length) return null;
  return Math.min(...prices);
}

function getHighestAnsweredDriverPrice(item: PriceInquiryItem): number | null {
  const prices = getDriverAnswers(item)
    .map((entry) => entry.responsePrice)
    .filter(
      (value): value is number =>
        typeof value === 'number' && !Number.isNaN(value)
    );

  if (!prices.length) return null;
  return Math.max(...prices);
}

function getChosenEntrepreneurPrice(item: PriceInquiryItem): number | null {
  const request = getRequestObject(item);

  return (
    item.selectedPrice ??
    request?.agreedDriverPrice ??
    request?.entrepreneurPrice ??
    null
  );
}

function getSuggestedEntrepreneurPrice(item: PriceInquiryItem): number | null {
  return item.proposedDriverPrice ?? item.autoCalculatedDriverPrice ?? null;
}

function getDisplayedEntrepreneurPrice(item: PriceInquiryItem): number | null {
  return (
    getChosenEntrepreneurPrice(item) ??
    getLatestAnsweredDriverPrice(item) ??
    getSuggestedEntrepreneurPrice(item) ??
    null
  );
}

function getAdminRevenue(item: PriceInquiryItem): number | null {
  const customerPrice = getCustomerEnteredPrice(item);
  const entrepreneurPrice = getDisplayedEntrepreneurPrice(item);

  if (customerPrice == null || entrepreneurPrice == null) return null;
  return Math.max(customerPrice - entrepreneurPrice, 0);
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
  item: PriceInquiryItem;
};

function InquiryCard({ item }: InquiryCardProps) {
  const requestRef =
    typeof item.requestId === 'string'
      ? item.requestId
      : item.requestId?.referenceNumber || '—';

  const requestTitle =
    typeof item.requestId === 'string' ? '' : item.requestId?.title || '';

  const customerPrice = getCustomerEnteredPrice(item);
  const latestAnsweredPrice = getLatestAnsweredDriverPrice(item);
  const lowestAnsweredPrice = getLowestAnsweredDriverPrice(item);
  const highestAnsweredPrice = getHighestAnsweredDriverPrice(item);
  const chosenEntrepreneurPrice = getChosenEntrepreneurPrice(item);
  const suggestedEntrepreneurPrice = getSuggestedEntrepreneurPrice(item);
  const displayedEntrepreneurPrice = getDisplayedEntrepreneurPrice(item);
  const adminRevenue = getAdminRevenue(item);

  return (
    <article className="rounded-3xl border border-border bg-surface p-5 shadow-premium xl:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                item.status
              )}`}
            >
              {getStatusLabel(item.status)}
            </span>

            {item.referenceNumber ? (
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
                {item.referenceNumber}
              </span>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-semibold text-white">
            {item.title || 'Preisabfrage'}
          </h3>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
            {item.description || 'Keine Beschreibung vorhanden.'}
          </p>
        </div>

        <div className="xl:w-[220px]">
          <Link
            href={`/price-inquiries/${item._id}`}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-white/5"
          >
            Öffnen
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Auftrag
          </p>
          <p className="mt-3 text-sm font-semibold text-white">
            {requestRef || '—'}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {requestTitle || 'Kein Auftragstitel vorhanden.'}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Fahrerübersicht
          </p>
          <p className="mt-3 text-sm font-semibold text-white">
            {item.stats?.totalDrivers ?? 0} Fahrer
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Geantwortet: {item.stats?.answeredCount ?? 0} · Ausstehend:{' '}
            {item.stats?.pendingCount ?? 0} · Abgelehnt:{' '}
            {item.stats?.declinedCount ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Ablauf
          </p>
          <p className="mt-3 text-sm font-semibold text-white">
            {formatDate(item.expiresAt)}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Erstellt: {formatDate(item.createdAt)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Antwortspanne
          </p>
          <p className="mt-3 text-sm font-semibold text-white">
            {lowestAnsweredPrice != null && highestAnsweredPrice != null
              ? `${formatMoney(lowestAnsweredPrice)} – ${formatMoney(
                  highestAnsweredPrice
                )}`
              : '—'}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Letzte Antwort: {formatMoney(latestAnsweredPrice)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Kundenpreis
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            {formatMoney(customerPrice)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Vorgabe
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            {formatMoney(suggestedEntrepreneurPrice)}
          </p>
        </div>

        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Unternehmerpreis
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            {formatMoney(displayedEntrepreneurPrice)}
          </p>

          {chosenEntrepreneurPrice != null ? (
            <p className="mt-2 text-xs leading-5 text-accent">
              Final ausgewählt: {formatMoney(chosenEntrepreneurPrice)}
            </p>
          ) : latestAnsweredPrice != null ? (
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Aktuell aus letzter Fahrerantwort
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Erlöse
          </p>
          <p className="mt-3 text-lg font-semibold text-emerald-200">
            {formatMoney(adminRevenue)}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Kundenpreis minus Unternehmerpreis
          </p>
        </div>
      </div>
    </article>
  );
}

export default function PriceInquiriesPage() {
  const [items, setItems] = useState<PriceInquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [currentRole, setCurrentRole] = useState('');

  useEffect(() => {
    const user = getStoredUser();
    setCurrentRole(user?.role || '');

    const load = async () => {
      const token = getStoredToken();

      if (!token) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        setError('');
        const data = await getPriceInquiries(token);
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        setItems([]);
        setError(
          err instanceof Error
            ? err.message
            : 'Preisabfragen konnten nicht geladen werden.'
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const statusOk = status === 'all' || item.status === status;

      const requestRef =
        typeof item.requestId === 'string'
          ? item.requestId
          : item.requestId?.referenceNumber || '';

      const requestTitle =
        typeof item.requestId === 'string' ? '' : item.requestId?.title || '';

      const driverAnswerText = (
        Array.isArray(item.driverInquiries) ? item.driverInquiries : []
      )
        .map((entry) => {
          const driverLabel =
            typeof entry.driverId === 'object' && entry.driverId
              ? `${entry.driverId.fullName || ''} ${entry.driverId.name || ''} ${entry.driverId.email || ''}`
              : '';
          const priceLabel =
            typeof entry.responsePrice === 'number'
              ? String(entry.responsePrice)
              : '';
          const commentLabel = entry.responseComment || '';
          return `${driverLabel} ${priceLabel} ${commentLabel}`;
        })
        .join(' ');

      const haystack = `
        ${item.referenceNumber || ''}
        ${item.title || ''}
        ${item.description || ''}
        ${item.adminNote || ''}
        ${requestRef}
        ${requestTitle}
        ${driverAnswerText}
      `
        .toLowerCase()
        .trim();

      const searchOk = haystack.includes(search.toLowerCase());

      return statusOk && searchOk;
    });
  }, [items, status, search]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const open = filtered.filter((item) => item.status === 'open').length;
    const assigned = filtered.filter((item) => item.status === 'assigned').length;
    const closed = filtered.filter((item) => item.status === 'closed').length;
    const expired = filtered.filter((item) => item.status === 'expired').length;
    const answered = filtered.reduce(
      (sum, item) => sum + Number(item.stats?.answeredCount ?? 0),
      0
    );

    return { total, open, assigned, closed, expired, answered };
  }, [filtered]);

  return (
    <AuthGuard allowedRoles={['admin', 'support']}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <main className="flex-1 p-5 xl:p-8 2xl:px-10">
          <div className="mx-auto w-full max-w-[1840px]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-accent">
                  Preisanfragen
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-white">
                  Preisabfragen
                </h1>
                <p className="mt-2 max-w-3xl text-muted">
                  Laufende Fahrerabfragen überwachen, Antworten vergleichen und
                  finale Unternehmerpreise schnell bewerten.
                </p>
              </div>

              <div className="grid gap-3 lg:min-w-[520px] lg:grid-cols-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suche nach Referenz, Titel, Fahrer oder Preis"
                  className="rounded-2xl border border-border bg-surface px-4 py-3"
                />

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-2xl border border-border bg-surface px-4 py-3"
                >
                  <option value="all">Alle Status</option>
                  <option value="open">Offen</option>
                  <option value="assigned">Fahrer ausgewählt</option>
                  <option value="closed">Geschlossen</option>
                  <option value="expired">Abgelaufen</option>
                </select>
              </div>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-slate-300">
                Angemeldete Rolle:{' '}
                <span className="font-semibold text-white">
                  {currentRole || 'unbekannt'}
                </span>
              </div>

              <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-slate-200">
                Im gesamten Preisabfrage-System wird ausschließlich{' '}
                <span className="font-semibold text-white">Euro (€)</span>{' '}
                verwendet.
              </div>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {loading ? (
              <p className="mt-6 text-muted">Preisabfragen werden geladen…</p>
            ) : null}

            {!loading ? (
              <>
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                  <SummaryCard label="Gesamt" value={stats.total} />
                  <SummaryCard label="Offen" value={stats.open} />
                  <SummaryCard
                    label="Ausgewählt"
                    value={stats.assigned}
                    emphasis="gold"
                  />
                  <SummaryCard label="Geschlossen" value={stats.closed} />
                  <SummaryCard label="Abgelaufen" value={stats.expired} />
                  <SummaryCard
                    label="Antworten"
                    value={stats.answered}
                    emphasis="success"
                  />
                </div>

                <section className="mt-10 space-y-4">
                  {filtered.length === 0 ? (
                    <div className="rounded-3xl border border-border bg-surface p-10 text-center shadow-premium">
                      <p className="text-lg font-semibold text-white">
                        Keine Preisabfragen gefunden
                      </p>
                      <p className="mt-2 text-sm text-muted">
                        Passe Suche oder Statusfilter an, um Ergebnisse zu sehen.
                      </p>
                    </div>
                  ) : (
                    filtered.map((item) => (
                      <InquiryCard key={item._id} item={item} />
                    ))
                  )}
                </section>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
