'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import {
  closePriceInquiry,
  getPriceInquiryById,
  selectDriverForPriceInquiry,
  unselectDriverForPriceInquiry,
  withdrawDriverFromPriceInquiry,
} from '@/lib/api';
import { getStoredToken } from '@/lib/auth';
import {
  DriverAvailability,
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
      return 'border-amber-500/25 bg-amber-500/10 text-amber-200';
    case 'closed':
      return 'border-slate-500/25 bg-slate-500/10 text-slate-200';
    case 'expired':
      return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
    default:
      return 'border-slate-500/25 bg-slate-500/10 text-slate-200';
  }
}

function getDriverEntryStatusLabel(status?: PriceInquiryDriverEntry['status']) {
  switch (status) {
    case 'pending':
      return 'Ausstehend';
    case 'viewed':
      return 'Gesehen';
    case 'answered':
      return 'Beantwortet';
    case 'declined':
      return 'Abgelehnt';
    case 'expired':
      return 'Abgelaufen';
    case 'withdrawn':
      return 'Zurückgezogen';
    default:
      return 'Unbekannt';
  }
}

function getDriverEntryStatusClass(status?: PriceInquiryDriverEntry['status']) {
  switch (status) {
    case 'pending':
      return 'border-slate-500/25 bg-slate-500/10 text-slate-200';
    case 'viewed':
      return 'border-violet-500/25 bg-violet-500/10 text-violet-200';
    case 'answered':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
    case 'declined':
      return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
    case 'expired':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-200';
    case 'withdrawn':
      return 'border-orange-500/25 bg-orange-500/10 text-orange-200';
    default:
      return 'border-slate-500/25 bg-slate-500/10 text-slate-200';
  }
}

function getAvailabilityLabel(value?: DriverAvailability) {
  switch (value) {
    case 'available':
      return 'Verfügbar';
    case 'limited':
      return 'Eingeschränkt';
    case 'unavailable':
      return 'Nicht verfügbar';
    default:
      return '—';
  }
}

function resolveDriver(entry: PriceInquiryDriverEntry) {
  if (!entry.driverId) return null;
  if (typeof entry.driverId === 'string') return { _id: entry.driverId };
  return entry.driverId;
}

function getRequestObject(item: PriceInquiryItem | null): RequestItem | null {
  if (!item?.requestId || typeof item.requestId === 'string') return null;
  return item.requestId as RequestItem;
}

function normalizeCustomerTypeFromRequest(
  request: RequestItem | null
): 'private' | 'business' | 'unknown' {
  if (!request) return 'unknown';

  const extended = request as RequestItem & {
    customerType?: string;
    userType?: string;
    accountType?: string;
    businessCustomer?: boolean;
    isBusinessCustomer?: boolean;
    userId?: {
      customerType?: string;
      userType?: string;
      accountType?: string;
      businessCustomer?: boolean;
      isBusinessCustomer?: boolean;
    };
  };

  const directType =
    extended.customerType ||
    extended.userType ||
    extended.accountType ||
    extended.userId?.customerType ||
    extended.userId?.userType ||
    extended.userId?.accountType ||
    '';

  const normalized = String(directType).toLowerCase().trim();

  if (
    normalized === 'business' ||
    normalized === 'gewerbe' ||
    normalized === 'commercial' ||
    normalized === 'company' ||
    normalized === 'firma'
  ) {
    return 'business';
  }

  if (
    normalized === 'private' ||
    normalized === 'privat' ||
    normalized === 'personal'
  ) {
    return 'private';
  }

  if (
    extended.businessCustomer === true ||
    extended.isBusinessCustomer === true ||
    extended.userId?.businessCustomer === true ||
    extended.userId?.isBusinessCustomer === true
  ) {
    return 'business';
  }

  return 'unknown';
}

function getCustomerTypeLabel(request: RequestItem | null) {
  const type = normalizeCustomerTypeFromRequest(request);

  if (type === 'business') return 'Gewerbekunde';
  if (type === 'private') return 'Privatkunde';
  return 'Kundentyp offen';
}

function getCustomerTypeClasses(request: RequestItem | null) {
  const type = normalizeCustomerTypeFromRequest(request);

  if (type === 'business') {
    return 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200';
  }

  if (type === 'private') {
    return 'border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200';
  }

  return 'border-border bg-white/5 text-slate-300';
}

function getCustomerEnteredPrice(request: RequestItem | null) {
  if (!request) return null;
  return request.clientBudgetAmount ?? request.budgetAmount ?? null;
}

function getFinalEntrepreneurPrice(
  request: RequestItem | null,
  inquiry: PriceInquiryItem | null
) {
  return (
    inquiry?.selectedPrice ??
    request?.agreedDriverPrice ??
    request?.entrepreneurPrice ??
    null
  );
}

function getSuggestedEntrepreneurPrice(
  request: RequestItem | null,
  inquiry: PriceInquiryItem | null
) {
  return (
    inquiry?.proposedDriverPrice ??
    inquiry?.autoCalculatedDriverPrice ??
    request?.agreedDriverPrice ??
    request?.entrepreneurPrice ??
    null
  );
}

function getAdminRevenue(
  customerPrice: number | null,
  entrepreneurPrice: number | null
) {
  if (customerPrice == null || entrepreneurPrice == null) return null;
  return Math.max(customerPrice - entrepreneurPrice, 0);
}

function getAnsweredEntries(item: PriceInquiryItem | null) {
  if (!item?.driverInquiries?.length) return [];

  return item.driverInquiries.filter(
    (entry) =>
      entry.status === 'answered' && typeof entry.responsePrice === 'number'
  );
}

function getLatestAnsweredEntry(item: PriceInquiryItem | null) {
  const answered = getAnsweredEntries(item);
  if (!answered.length) return null;

  return [...answered].sort((a, b) => {
    const aTime = new Date(a.respondedAt || a.viewedAt || 0).getTime();
    const bTime = new Date(b.respondedAt || b.viewedAt || 0).getTime();
    return bTime - aTime;
  })[0];
}

function getLowestAnswer(item: PriceInquiryItem | null) {
  const prices = getAnsweredEntries(item)
    .map((entry) => entry.responsePrice)
    .filter(
      (value): value is number =>
        typeof value === 'number' && !Number.isNaN(value)
    );

  if (!prices.length) return null;
  return Math.min(...prices);
}

function getHighestAnswer(item: PriceInquiryItem | null) {
  const prices = getAnsweredEntries(item)
    .map((entry) => entry.responsePrice)
    .filter(
      (value): value is number =>
        typeof value === 'number' && !Number.isNaN(value)
    );

  if (!prices.length) return null;
  return Math.max(...prices);
}

function getEventTypeLabel(type?: string) {
  const normalized = String(type || '').trim().toLowerCase();

  switch (normalized) {
    case 'created':
    case 'price_inquiry_created':
    case 'inquiry_created':
      return 'Preisabfrage erstellt';
    case 'driverselected':
    case 'driver_selected':
    case 'selected_driver':
      return 'Fahrer ausgewählt';
    case 'driverunselected':
    case 'driver_unselected':
    case 'unselected_driver':
      return 'Fahrerauswahl zurückgezogen';
    case 'driverwithdrawn':
    case 'driver_withdrawn':
    case 'withdraw_driver':
      return 'Fahreranfrage zurückgezogen';
    case 'driveranswered':
    case 'driver_answered':
    case 'driver_response':
      return 'Fahrerantwort eingegangen';
    case 'driverdeclined':
    case 'driver_declined':
      return 'Fahrer hat abgelehnt';
    case 'closed':
    case 'inquiry_closed':
      return 'Preisabfrage geschlossen';
    case 'expired':
    case 'inquiry_expired':
      return 'Preisabfrage abgelaufen';
    case 'updated':
    case 'inquiry_updated':
      return 'Preisabfrage aktualisiert';
    default:
      return type || 'Ereignis';
  }
}

function getGermanEventMessage(message?: string) {
  const value = String(message || '').trim();
  if (!value) return 'Keine Beschreibung vorhanden.';

  return value
    .replace(/price inquiry/gi, 'Preisabfrage')
    .replace(/driver answered/gi, 'Fahrer hat geantwortet')
    .replace(/driver selected/gi, 'Fahrer wurde ausgewählt')
    .replace(/selected driver/gi, 'ausgewählter Fahrer')
    .replace(/driver unselected/gi, 'Fahrerauswahl wurde zurückgezogen')
    .replace(/driver withdrawn/gi, 'Fahreranfrage wurde zurückgezogen')
    .replace(/withdrawn/gi, 'zurückgezogen')
    .replace(/closed/gi, 'geschlossen')
    .replace(/expired/gi, 'abgelaufen')
    .replace(/answered/gi, 'beantwortet')
    .replace(/declined/gi, 'abgelehnt')
    .replace(/created/gi, 'erstellt')
    .replace(/updated/gi, 'aktualisiert');
}

type SummaryStatCardProps = {
  label: string;
  value: string;
  hint?: string;
  emphasis?: 'none' | 'gold' | 'success';
};

function SummaryStatCard({
  label,
  value,
  hint,
  emphasis = 'none',
}: SummaryStatCardProps) {
  const classes =
    emphasis === 'gold'
      ? 'border-accent/20 bg-accent/5'
      : emphasis === 'success'
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : 'border-border bg-background';

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold leading-7 text-white">{value}</p>
      {hint ? (
        <p className="mt-2 text-xs leading-5 text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

type DriverInfoRowProps = {
  label: string;
  value: string;
};

function DriverInfoRow({ label, value }: DriverInfoRowProps) {
  return (
    <div className="rounded-xl border border-border bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-100">
        {value}
      </p>
    </div>
  );
}

export default function PriceInquiryDetailPage() {
  const params = useParams<{ id: string }>();

  const [item, setItem] = useState<PriceInquiryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectingDriverId, setSelectingDriverId] = useState('');
  const [withdrawingDriverId, setWithdrawingDriverId] = useState('');
  const [unselecting, setUnselecting] = useState(false);
  const [closing, setClosing] = useState(false);

  const loadItem = useCallback(async () => {
    const token = getStoredToken();

    if (!token || !params?.id) {
      setItem(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await getPriceInquiryById(token, params.id);
      setItem(data);
    } catch (err) {
      setItem(null);
      setError(
        err instanceof Error
          ? err.message
          : 'Preisabfrage konnte nicht geladen werden.'
      );
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const requestObject = useMemo(() => getRequestObject(item), [item]);

  const customerTypeLabel = useMemo(() => {
    return getCustomerTypeLabel(requestObject);
  }, [requestObject]);

  const selectedDriverId = useMemo(() => {
    if (!item?.selectedDriverId) return '';

    if (typeof item.selectedDriverId === 'string') return item.selectedDriverId;

    if (
      typeof item.selectedDriverId === 'object' &&
      item.selectedDriverId !== null &&
      '_id' in item.selectedDriverId
    ) {
      return String(item.selectedDriverId._id || '');
    }

    return '';
  }, [item]);

  const customerEnteredPrice = useMemo(() => {
    return getCustomerEnteredPrice(requestObject);
  }, [requestObject]);

  const finalEntrepreneurPrice = useMemo(() => {
    return getFinalEntrepreneurPrice(requestObject, item);
  }, [requestObject, item]);

  const suggestedEntrepreneurPrice = useMemo(() => {
    return getSuggestedEntrepreneurPrice(requestObject, item);
  }, [requestObject, item]);

  const finalAdminRevenue = useMemo(() => {
    return getAdminRevenue(customerEnteredPrice, finalEntrepreneurPrice);
  }, [customerEnteredPrice, finalEntrepreneurPrice]);

  const latestAnsweredEntry = useMemo(() => {
    return getLatestAnsweredEntry(item);
  }, [item]);

  const latestAnsweredPrice = latestAnsweredEntry?.responsePrice ?? null;

  const lowestAnsweredPrice = useMemo(() => getLowestAnswer(item), [item]);
  const highestAnsweredPrice = useMemo(() => getHighestAnswer(item), [item]);

  const handleSelectDriver = async (driverId: string) => {
    const token = getStoredToken();

    if (!token || !item?._id || !driverId) {
      setError('Fahrer konnte nicht ausgewählt werden.');
      return;
    }

    const confirmed = window.confirm(
      'Möchtest du diesen Fahrer für die Preisabfrage auswählen?'
    );
    if (!confirmed) return;

    try {
      setSelectingDriverId(driverId);
      setError('');
      setSuccess('');

      await selectDriverForPriceInquiry(token, item._id, driverId);
      setSuccess('Fahrer wurde erfolgreich ausgewählt.');
      await loadItem();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Fahrer konnte nicht ausgewählt werden.'
      );
    } finally {
      setSelectingDriverId('');
    }
  };

  const handleUnselectDriver = async () => {
    const token = getStoredToken();

    if (!token || !item?._id) {
      setError('Ausgewählter Fahrer konnte nicht zurückgezogen werden.');
      return;
    }

    const note = window.prompt(
      'Optionale Notiz zum Zurückziehen des ausgewählten Fahrers:',
      ''
    );

    if (note === null) return;

    const confirmed = window.confirm(
      'Möchtest du den aktuell ausgewählten Fahrer wirklich zurückziehen?'
    );
    if (!confirmed) return;

    try {
      setUnselecting(true);
      setError('');
      setSuccess('');

      await unselectDriverForPriceInquiry(token, item._id, note);
      setSuccess('Ausgewählter Fahrer wurde erfolgreich zurückgezogen.');
      await loadItem();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ausgewählter Fahrer konnte nicht zurückgezogen werden.'
      );
    } finally {
      setUnselecting(false);
    }
  };

  const handleWithdrawDriver = async (driverId: string) => {
    const token = getStoredToken();

    if (!token || !item?._id || !driverId) {
      setError('Fahrer-Anfrage konnte nicht zurückgezogen werden.');
      return;
    }

    const note = window.prompt(
      'Optionale Notiz zum Zurückziehen dieser Fahrer-Anfrage:',
      ''
    );

    if (note === null) return;

    const confirmed = window.confirm(
      'Möchtest du die Anfrage an diesen Fahrer wirklich zurückziehen?'
    );
    if (!confirmed) return;

    try {
      setWithdrawingDriverId(driverId);
      setError('');
      setSuccess('');

      await withdrawDriverFromPriceInquiry(token, item._id, driverId, note);
      setSuccess('Fahrer-Anfrage wurde erfolgreich zurückgezogen.');
      await loadItem();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Fahrer-Anfrage konnte nicht zurückgezogen werden.'
      );
    } finally {
      setWithdrawingDriverId('');
    }
  };

  const handleCloseInquiry = async () => {
    const token = getStoredToken();

    if (!token || !item?._id) {
      setError('Preisabfrage konnte nicht geschlossen werden.');
      return;
    }

    const confirmed = window.confirm(
      'Möchtest du diese Preisabfrage wirklich schließen?'
    );
    if (!confirmed) return;

    try {
      setClosing(true);
      setError('');
      setSuccess('');

      await closePriceInquiry(token, item._id);
      setSuccess('Preisabfrage wurde erfolgreich geschlossen.');
      await loadItem();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Preisabfrage konnte nicht geschlossen werden.'
      );
    } finally {
      setClosing(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <main className="flex-1 p-5 xl:p-8 2xl:px-10">
          <div className="mx-auto w-full max-w-[1840px]">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm uppercase tracking-[0.25em] text-accent">
                  Preisanfragen
                </p>
                <h1 className="mt-3 text-3xl font-semibold">
                  Preisabfrage-Details
                </h1>
                <p className="mt-2 max-w-4xl text-muted">
                  Fahrerantworten prüfen, Unternehmerpreis bewerten und die
                  finale Auswahl klar und ruhig verwalten.
                </p>
              </div>

              <Link
                href="/price-inquiries"
                className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm transition hover:bg-white/5"
              >
                Zurück zur Übersicht
              </Link>
            </div>

            {loading ? (
              <p className="text-muted">Details werden geladen…</p>
            ) : null}

            {error ? (
              <div className="mb-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {success}
              </div>
            ) : null}

            {!loading && item ? (
              <div className="grid gap-8 2xl:grid-cols-[minmax(0,1.7fr)_360px]">
                <section className="min-w-0 space-y-8">
                  <div className="rounded-3xl border border-border bg-surface p-6 shadow-premium xl:p-7">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getInquiryStatusClass(
                          item.status
                        )}`}
                      >
                        {getInquiryStatusLabel(item.status)}
                      </span>

                      {item.referenceNumber ? (
                        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
                          {item.referenceNumber}
                        </span>
                      ) : null}

                      <span className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
                        Nur Euro (€)
                      </span>
                    </div>

                    <h2 className="mt-5 text-3xl font-semibold text-white">
                      {item.title || 'Preisabfrage'}
                    </h2>

                    <p className="mt-4 max-w-5xl text-base leading-7 text-slate-200">
                      {item.description || 'Keine Beschreibung vorhanden.'}
                    </p>

                    <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="rounded-2xl border border-border bg-background p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">
                          Verknüpfter Auftrag
                        </p>

                        <p className="mt-3 text-lg font-medium text-white">
                          {typeof item.requestId === 'string'
                            ? item.requestId
                            : item.requestId?.title || 'Ohne Titel'}
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <DriverInfoRow
                            label="Referenz"
                            value={
                              typeof item.requestId === 'string'
                                ? '—'
                                : item.requestId?.referenceNumber || '—'
                            }
                          />
                          <DriverInfoRow
                            label="Status"
                            value={
                              typeof item.requestId === 'string'
                                ? '—'
                                : item.requestId?.status || '—'
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-background p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">
                          Kunde
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getCustomerTypeClasses(
                              requestObject
                            )}`}
                          >
                            {customerTypeLabel}
                          </span>
                        </div>

                        <p className="mt-4 text-lg font-medium text-white">
                          {requestObject?.userId?.fullName ||
                            requestObject?.userId?.name ||
                            'Unbekannt'}
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <DriverInfoRow
                            label="E-Mail"
                            value={requestObject?.userId?.email || '—'}
                          />
                          <DriverInfoRow
                            label="Telefon"
                            value={requestObject?.userId?.phone || '—'}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <SummaryStatCard
                        label="Kundenpreis"
                        value={formatMoney(customerEnteredPrice)}
                        hint="Vom Kunden angegeben"
                      />
                      <SummaryStatCard
                        label="Vorgabe"
                        value={formatMoney(suggestedEntrepreneurPrice)}
                        hint="Interne Preisrichtung"
                      />
                      <SummaryStatCard
                        label="Letzte Fahrerantwort"
                        value={formatMoney(latestAnsweredPrice)}
                        hint="Neueste Rückmeldung"
                      />
                      <SummaryStatCard
                        label="Finaler Unternehmerpreis"
                        value={formatMoney(finalEntrepreneurPrice)}
                        hint="Aktuell ausgewählt"
                        emphasis="gold"
                      />
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <SummaryStatCard
                        label="Finale Erlöse"
                        value={formatMoney(finalAdminRevenue)}
                        hint="Kundenpreis minus Unternehmerpreis"
                        emphasis="success"
                      />
                      <SummaryStatCard
                        label="Antwortspanne"
                        value={
                          lowestAnsweredPrice != null &&
                          highestAnsweredPrice != null
                            ? `${formatMoney(lowestAnsweredPrice)} – ${formatMoney(
                                highestAnsweredPrice
                              )}`
                            : '—'
                        }
                        hint="Niedrigste bis höchste Fahrerantwort"
                      />
                      <SummaryStatCard
                        label="Fahrer gesamt"
                        value={String(item.stats?.totalDrivers ?? 0)}
                        hint={`Geantwortet: ${
                          item.stats?.answeredCount ?? 0
                        } · Ausstehend: ${item.stats?.pendingCount ?? 0}`}
                      />
                    </div>

                    <div className="mt-8 rounded-2xl border border-border bg-background p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">
                        Admin-Notiz
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-200">
                        {item.adminNote || 'Keine Admin-Notiz vorhanden.'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border bg-surface p-6 shadow-premium xl:p-7">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-accent">
                          Fahrerbereich
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">
                          Fahrerantworten
                        </h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                          Jede Antwort ist als ruhige Premium-Karte aufgebaut.
                          Fokus liegt auf Unternehmerpreis, Erlösen und klaren
                          Aktionen.
                        </p>
                      </div>

                      {selectedDriverId ? (
                        <button
                          type="button"
                          onClick={handleUnselectDriver}
                          disabled={
                            unselecting ||
                            item.status === 'closed' ||
                            item.status === 'expired'
                          }
                          className="w-full rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                        >
                          {unselecting
                            ? 'Auswahl wird zurückgezogen…'
                            : 'Ausgewählten Fahrer zurückziehen'}
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-6 space-y-4">
                      {item.driverInquiries?.length ? (
                        item.driverInquiries.map((entry, index) => {
                          const driver = resolveDriver(entry);
                          const driverId = driver?._id || '';
                          const isSelected = selectedDriverId === driverId;
                          const isWithdrawn = entry.status === 'withdrawn';

                          const canSelect =
                            entry.status === 'answered' &&
                            item.status !== 'closed' &&
                            item.status !== 'expired' &&
                            !isWithdrawn;

                          const canWithdraw =
                            !!driverId &&
                            !isWithdrawn &&
                            item.status !== 'closed' &&
                            item.status !== 'expired';

                          const driverPrice =
                            typeof entry.responsePrice === 'number'
                              ? entry.responsePrice
                              : null;

                          const driverRevenue = getAdminRevenue(
                            customerEnteredPrice,
                            driverPrice
                          );

                          const withdrawnAt = (
                            entry as PriceInquiryDriverEntry & {
                              withdrawnAt?: string | null;
                            }
                          ).withdrawnAt;

                          return (
                            <div
                              key={`${driverId || 'driver'}-${index}`}
                              className={`rounded-3xl border p-5 xl:p-6 ${
                                isSelected
                                  ? 'border-accent/25 bg-accent/[0.045]'
                                  : isWithdrawn
                                    ? 'border-orange-500/20 bg-orange-500/[0.045]'
                                    : 'border-border bg-background'
                              }`}
                            >
                              <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                      <h4 className="text-2xl font-semibold text-white">
                                        {driver?.fullName ||
                                          driver?.name ||
                                          'Fahrer'}
                                      </h4>

                                      <span
                                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getDriverEntryStatusClass(
                                          entry.status
                                        )}`}
                                      >
                                        {getDriverEntryStatusLabel(entry.status)}
                                      </span>

                                      {isSelected ? (
                                        <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                                          Ausgewählt
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                      <DriverInfoRow
                                        label="E-Mail"
                                        value={driver?.email || 'Keine E-Mail'}
                                      />
                                      <DriverInfoRow
                                        label="Telefon"
                                        value={
                                          driver?.phone ||
                                          'Keine Telefonnummer'
                                        }
                                      />
                                    </div>
                                  </div>

                                  <div className="grid gap-3 sm:grid-cols-2 xl:w-[320px] xl:grid-cols-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectDriver(driverId)}
                                      disabled={
                                        !driverId ||
                                        !canSelect ||
                                        selectingDriverId === driverId ||
                                        isSelected
                                      }
                                      className="w-full rounded-2xl bg-accent px-5 py-4 text-base font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {selectingDriverId === driverId
                                        ? 'Wird ausgewählt…'
                                        : isSelected
                                          ? 'Ausgewählter Fahrer'
                                          : entry.status !== 'answered'
                                            ? 'Erst nach Antwort wählbar'
                                            : 'Diesen Fahrer wählen'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleWithdrawDriver(driverId)
                                      }
                                      disabled={
                                        !canWithdraw ||
                                        withdrawingDriverId === driverId
                                      }
                                      className="w-full rounded-2xl border border-rose-500/25 bg-rose-500/10 px-5 py-4 text-base font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {withdrawingDriverId === driverId
                                        ? 'Wird zurückgezogen…'
                                        : isWithdrawn
                                          ? 'Bereits zurückgezogen'
                                          : 'Anfrage an Fahrer zurückziehen'}
                                    </button>
                                  </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                  <SummaryStatCard
                                    label="Vorgabe"
                                    value={formatMoney(
                                      suggestedEntrepreneurPrice
                                    )}
                                    hint="Interne Preisrichtung"
                                  />
                                  <SummaryStatCard
                                    label="Fahrerpreis"
                                    value={formatMoney(driverPrice)}
                                    hint="Preis aus der Antwort"
                                  />
                                  <SummaryStatCard
                                    label="Erlöse"
                                    value={formatMoney(driverRevenue)}
                                    hint="Kundenpreis minus Fahrerpreis"
                                    emphasis="success"
                                  />
                                  <SummaryStatCard
                                    label="Antwortzeit"
                                    value={formatDate(entry.respondedAt)}
                                    hint="Zeitpunkt der Rückmeldung"
                                  />
                                </div>

                                <div className="grid gap-3 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)_minmax(0,0.85fr)]">
                                  <DriverInfoRow
                                    label="Verfügbarkeit"
                                    value={getAvailabilityLabel(
                                      entry.responseAvailability
                                    )}
                                  />

                                  <div className="rounded-2xl border border-border bg-surface p-4">
                                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                                      Kommentar des Fahrers
                                    </p>
                                    <p className="mt-3 text-sm leading-7 text-slate-200">
                                      {entry.responseComment ||
                                        'Kein Kommentar vom Fahrer vorhanden.'}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl border border-border bg-surface p-4">
                                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                                      Zurückgezogen am
                                    </p>
                                    <p className="mt-3 text-sm leading-7 text-slate-200">
                                      {formatDate(withdrawnAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-2xl border border-border bg-background p-5 text-sm text-muted">
                          Noch keine Fahrerantworten vorhanden.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border bg-surface p-6 shadow-premium xl:p-7">
                    <div className="flex flex-col gap-2">
                      <p className="text-sm uppercase tracking-[0.24em] text-accent">
                        Verlauf
                      </p>
                      <h3 className="text-2xl font-semibold text-white">
                        Ereignisprotokoll
                      </h3>
                      <p className="text-sm leading-6 text-muted">
                        Alle relevanten Schritte dieser Preisabfrage in klarer
                        deutscher Darstellung.
                      </p>
                    </div>

                    <div className="mt-6 space-y-3">
                      {item.eventLog?.length ? (
                        item.eventLog.map((entry, index) => (
                          <div
                            key={`${entry.createdAt}-${index}`}
                            className="rounded-2xl border border-border bg-background p-5"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0">
                                <p className="text-base font-semibold text-white">
                                  {getEventTypeLabel(entry.type)}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-300">
                                  {getGermanEventMessage(entry.message)}
                                </p>
                              </div>

                              <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted">
                                {formatDate(entry.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-border bg-background p-5 text-sm text-muted">
                          Noch keine Ereignisse vorhanden.
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <aside className="space-y-8">
                  <div className="rounded-3xl border border-border bg-surface p-6 shadow-premium">
                    <h3 className="text-lg font-semibold text-white">
                      Metadaten
                    </h3>

                    <div className="mt-5 grid gap-3">
                      <DriverInfoRow
                        label="Erstellt"
                        value={formatDate(item.createdAt)}
                      />
                      <DriverInfoRow
                        label="Aktualisiert"
                        value={formatDate(item.updatedAt)}
                      />
                      <DriverInfoRow
                        label="Ablauf"
                        value={formatDate(item.expiresAt)}
                      />
                      <DriverInfoRow
                        label="Ausgewählt am"
                        value={formatDate(item.selectedDriverAt)}
                      />
                      <DriverInfoRow
                        label="Geschlossen am"
                        value={formatDate(item.closedAt)}
                      />
                    </div>

                    <div className="mt-5 rounded-2xl border border-border bg-background p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                        Preisabfrage-ID
                      </p>
                      <p className="mt-3 break-all text-sm leading-6 text-slate-200">
                        {item._id}
                      </p>

                      {item.referenceNumber ? (
                        <>
                          <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-muted">
                            Referenz
                          </p>
                          <p className="mt-2 break-all text-sm leading-6 text-slate-200">
                            {item.referenceNumber}
                          </p>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-5 grid gap-3">
                      <SummaryStatCard
                        label="Kundenpreis"
                        value={formatMoney(customerEnteredPrice)}
                      />
                      <SummaryStatCard
                        label="Vorgabe"
                        value={formatMoney(suggestedEntrepreneurPrice)}
                      />
                      <SummaryStatCard
                        label="Finaler Unternehmerpreis"
                        value={formatMoney(finalEntrepreneurPrice)}
                        emphasis="gold"
                      />
                      <SummaryStatCard
                        label="Finale Erlöse"
                        value={formatMoney(finalAdminRevenue)}
                        emphasis="success"
                      />
                    </div>

                    {requestObject?._id ? (
                      <Link
                        href={`/requests/${requestObject._id}`}
                        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-white/5"
                      >
                        Verknüpften Auftrag öffnen
                      </Link>
                    ) : null}
                  </div>

                  <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 shadow-premium">
                    <h3 className="text-lg font-semibold text-rose-200">
                      Preisabfrage schließen
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-rose-200/80">
                      Diese Aktion beendet die Preisabfrage und verhindert
                      weitere Bearbeitung.
                    </p>

                    <button
                      type="button"
                      onClick={handleCloseInquiry}
                      disabled={
                        closing ||
                        item.status === 'closed' ||
                        item.status === 'expired' ||
                        item.status === 'assigned'
                      }
                      className="mt-5 w-full rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-60"
                    >
                      {closing
                        ? 'Preisabfrage wird geschlossen…'
                        : 'Preisabfrage schließen'}
                    </button>
                  </div>
                </aside>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
