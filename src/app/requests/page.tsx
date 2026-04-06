'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import RequestTable from '@/components/RequestTable';
import { deleteRequest, getRequests } from '@/lib/api';
import { getStoredToken, getStoredUser } from '@/lib/auth';
import { RequestItem } from '@/lib/types';

function getStatusLabel(status: string) {
  switch (status) {
    case 'received':
      return 'Neu eingegangen';
    case 'accepted':
      return 'Akzeptiert';
    case 'inProgress':
      return 'In Bearbeitung';
    case 'waitingForClient':
      return 'Warten auf Kunde';
    case 'done':
      return 'Erledigt';
    case 'canceled':
      return 'Storniert';
    case 'rejected':
      return 'Abgelehnt';
    default:
      return status;
  }
}

function normalizeCustomerType(
  request: RequestItem
): 'private' | 'business' | 'unknown' {
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

function getCustomerEnteredPrice(request: RequestItem): number | null {
  return request.clientBudgetAmount ?? request.budgetAmount ?? null;
}

function getEntrepreneurPrice(request: RequestItem): number | null {
  const extended = request as RequestItem & {
    entrepreneurPrice?: number | null;
  };

  if (typeof extended.entrepreneurPrice === 'number') {
    return extended.entrepreneurPrice;
  }

  if (typeof request.agreedDriverPrice === 'number') {
    return request.agreedDriverPrice;
  }

  return null;
}

function getSupportPrice(request: RequestItem): number | null {
  const extended = request as RequestItem & {
    supportPriceAmount?: number | null;
    adminRevenue?: number | null;
  };

  if (typeof extended.supportPriceAmount === 'number') {
    return extended.supportPriceAmount;
  }

  if (typeof extended.adminRevenue === 'number') {
    return extended.adminRevenue;
  }

  const customerPrice = getCustomerEnteredPrice(request);
  const entrepreneurPrice = getEntrepreneurPrice(request);

  if (
    typeof customerPrice === 'number' &&
    typeof entrepreneurPrice === 'number'
  ) {
    return Math.max(customerPrice - entrepreneurPrice, 0);
  }

  return null;
}

function getPricingState(request: RequestItem) {
  const customerPrice = getCustomerEnteredPrice(request);
  const supportPrice = getSupportPrice(request);
  const entrepreneurPrice = getEntrepreneurPrice(request);

  return {
    customerPrice,
    supportPrice,
    entrepreneurPrice,
    hasCustomerPrice: customerPrice != null,
    hasSupportPrice: supportPrice != null,
    hasEntrepreneurPrice: entrepreneurPrice != null,
    hasAllThree:
      customerPrice != null &&
      supportPrice != null &&
      entrepreneurPrice != null,
  };
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

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');
  const [signal, setSignal] = useState('all');
  const [customerType, setCustomerType] = useState('all');
  const [priceState, setPriceState] = useState('all');
  const [search, setSearch] = useState('');
  const [currentRole, setCurrentRole] = useState('');

  useEffect(() => {
    const user = getStoredUser();
    setCurrentRole(user?.role || '');

    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    getRequests(token)
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Aufträge konnten nicht geladen werden.'
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      'Möchtest du diesen Auftrag wirklich löschen?'
    );
    if (!confirmed) return;

    const token = getStoredToken();
    if (!token) {
      setError('Nicht angemeldet.');
      return;
    }

    try {
      setError('');
      await deleteRequest(token, id);
      setRequests((current) => current.filter((item) => item._id !== id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Auftrag konnte nicht gelöscht werden.'
      );
    }
  };

  const filtered = useMemo(() => {
    return requests.filter((request) => {
      const resolvedCustomerType = normalizeCustomerType(request);
      const pricing = getPricingState(request);

      const statusOk = status === 'all' || request.status === status;
      const signalOk = signal === 'all' || request.signal === signal;
      const customerTypeOk =
        customerType === 'all' || resolvedCustomerType === customerType;

      const priceStateOk =
        priceState === 'all' ||
        (priceState === 'full' && pricing.hasAllThree) ||
        (priceState === 'customerOnly' &&
          pricing.hasCustomerPrice &&
          !pricing.hasSupportPrice &&
          !pricing.hasEntrepreneurPrice) ||
        (priceState === 'missingSupport' &&
          pricing.hasCustomerPrice &&
          !pricing.hasSupportPrice) ||
        (priceState === 'missingEntrepreneur' &&
          pricing.hasCustomerPrice &&
          !pricing.hasEntrepreneurPrice) ||
        (priceState === 'withoutCustomer' && !pricing.hasCustomerPrice);

      const haystack = `
        ${request.referenceNumber || ''}
        ${request.title || ''}
        ${request.description || ''}
        ${request.userId?.fullName || ''}
        ${request.userId?.name || ''}
        ${request.userId?.email || ''}
        ${request.assignedDriverId?.fullName || ''}
        ${request.assignedDriverId?.name || ''}
        ${resolvedCustomerType === 'private' ? 'privat privatkunde' : ''}
        ${
          resolvedCustomerType === 'business'
            ? 'gewerbe gewerbekunde firma firmenkunde business'
            : ''
        }
        ${
          pricing.hasCustomerPrice
            ? 'kundenpreis budget vom kunde angegebene preis'
            : 'kein kundenpreis'
        }
        ${
          pricing.hasSupportPrice
            ? 'preis support preis admin preis mein betrag marge'
            : 'kein support preis'
        }
        ${
          pricing.hasEntrepreneurPrice
            ? 'unternehmerpreis fahrerpreis entrepreneur preis'
            : 'kein unternehmerpreis'
        }
      `
        .toLowerCase()
        .trim();

      const searchOk = haystack.includes(search.toLowerCase().trim());

      return statusOk && signalOk && customerTypeOk && priceStateOk && searchOk;
    });
  }, [requests, status, signal, customerType, priceState, search]);

  const withAssignedDriver = filtered.filter(
    (item) => item.assignedDriverId?._id
  ).length;

  const withPriceInquiry = filtered.filter((item) =>
    Boolean(item.priceInquiryId)
  ).length;

  const assignedViaInquiry = filtered.filter(
    (item) => item.driverAssignedViaInquiry
  ).length;

  const privateCustomers = filtered.filter(
    (item) => normalizeCustomerType(item) === 'private'
  ).length;

  const businessCustomers = filtered.filter(
    (item) => normalizeCustomerType(item) === 'business'
  ).length;

  const withCustomerPrice = filtered.filter(
    (item) => getPricingState(item).hasCustomerPrice
  ).length;

  const withSupportPrice = filtered.filter(
    (item) => getPricingState(item).hasSupportPrice
  ).length;

  const withEntrepreneurPrice = filtered.filter(
    (item) => getPricingState(item).hasEntrepreneurPrice
  ).length;

  const withAllThreePrices = filtered.filter(
    (item) => getPricingState(item).hasAllThree
  ).length;

  return (
    <AuthGuard allowedRoles={['admin', 'support']}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <main className="flex-1 p-5 xl:p-8 2xl:px-10">
          <div className="mx-auto w-full max-w-[1840px]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-accent">
                  Requests
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-white">
                  Aufträge
                </h1>
                <p className="mt-2 max-w-3xl text-muted">
                  Aufträge filtern, intern steuern und Preislogik sowie
                  Preisabfragen in einer ruhigen Premium-Übersicht verwalten.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm transition hover:bg-white/5"
                >
                  Zum Dashboard
                </Link>

                <Link
                  href="/price-inquiries"
                  className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-black transition hover:opacity-90"
                >
                  Preisabfragen
                </Link>
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
                Preislogik:{' '}
                <span className="font-semibold text-white">Kundenpreis</span> =
                vom Kunden angegebener Preis,{' '}
                <span className="font-semibold text-white">Preis</span> = dein
                Betrag / deine Marge,{' '}
                <span className="font-semibold text-white">
                  Unternehmerpreis
                </span>{' '}
                = Fahrer / Unternehmer.
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-border bg-surface p-5 shadow-premium xl:p-6">
              <div className="grid gap-4 2xl:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suche nach Referenz, Kunde, Fahrer oder Anfrage"
                  className="rounded-2xl border border-border bg-background px-4 py-3"
                />

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-2xl border border-border bg-background px-4 py-3"
                >
                  <option value="all">Alle Status</option>
                  <option value="received">{getStatusLabel('received')}</option>
                  <option value="accepted">{getStatusLabel('accepted')}</option>
                  <option value="inProgress">{getStatusLabel('inProgress')}</option>
                  <option value="waitingForClient">
                    {getStatusLabel('waitingForClient')}
                  </option>
                  <option value="done">{getStatusLabel('done')}</option>
                  <option value="canceled">{getStatusLabel('canceled')}</option>
                  <option value="rejected">{getStatusLabel('rejected')}</option>
                </select>

                <select
                  value={signal}
                  onChange={(e) => setSignal(e.target.value)}
                  className="rounded-2xl border border-border bg-background px-4 py-3"
                >
                  <option value="all">Alle Signale</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Discreet">Discreet</option>
                  <option value="Later">Later</option>
                </select>

                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="rounded-2xl border border-border bg-background px-4 py-3"
                >
                  <option value="all">Alle Kundentypen</option>
                  <option value="private">Nur Privatkunden</option>
                  <option value="business">Nur Gewerbekunden</option>
                </select>

                <select
                  value={priceState}
                  onChange={(e) => setPriceState(e.target.value)}
                  className="rounded-2xl border border-border bg-background px-4 py-3"
                >
                  <option value="all">Alle Preisstände</option>
                  <option value="full">Alle 3 Preise vorhanden</option>
                  <option value="customerOnly">Nur Kundenpreis</option>
                  <option value="missingSupport">Preis fehlt</option>
                  <option value="missingEntrepreneur">
                    Unternehmerpreis fehlt
                  </option>
                  <option value="withoutCustomer">Ohne Kundenpreis</option>
                </select>
              </div>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {loading ? (
              <p className="mt-6 text-muted">Aufträge werden geladen…</p>
            ) : null}

            {!loading ? (
              <>
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
                  <SummaryCard
                    label="Gefilterte Aufträge"
                    value={filtered.length}
                  />
                  <SummaryCard
                    label="Privatkunden"
                    value={privateCustomers}
                  />
                  <SummaryCard
                    label="Gewerbekunden"
                    value={businessCustomers}
                  />
                  <SummaryCard
                    label="Mit Kundenpreis"
                    value={withCustomerPrice}
                  />
                  <SummaryCard
                    label="Mit Preis"
                    value={withSupportPrice}
                    emphasis="success"
                  />
                  <SummaryCard
                    label="Mit Unternehmerpreis"
                    value={withEntrepreneurPrice}
                    emphasis="gold"
                  />
                  <SummaryCard
                    label="Alle 3 Preise"
                    value={withAllThreePrices}
                  />
                  <SummaryCard
                    label="Mit Preisabfrage"
                    value={withPriceInquiry}
                    hint={`Via Preisabfrage zugewiesen: ${assignedViaInquiry}`}
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <SummaryCard
                    label="Mit Fahrerzuweisung"
                    value={withAssignedDriver}
                  />
                  <SummaryCard
                    label="Preisübersicht"
                    value="Klar getrennt"
                    hint="Kundenpreis = Kunde · Preis = dein Betrag · Unternehmerpreis = Fahrer / Unternehmer"
                  />
                </div>

                <section className="mt-8 rounded-3xl border border-border bg-surface p-3 shadow-premium xl:p-4">
                  <RequestTable
                    requests={Array.isArray(filtered) ? filtered : []}
                    onDelete={handleDelete}
                  />
                </section>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
