'use client';

import Link from 'next/link';
import { RequestItem } from '@/lib/types';

type Props = {
  requests: RequestItem[];
  onDelete?: (id: string) => void;
};

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

function normalizeSignal(signal?: string) {
  const normalized = String(signal || '')
    .trim()
    .toLowerCase();

  if (normalized === 'urgent') return 'urgent';
  if (normalized === 'discreet') return 'discreet';
  if (normalized === 'later') return 'later';

  return normalized;
}

function getSignalLabel(signal?: string) {
  switch (normalizeSignal(signal)) {
    case 'urgent':
      return 'Dringend';
    case 'discreet':
      return 'Diskret';
    case 'later':
      return 'Später';
    default:
      return signal || '—';
  }
}

function getSignalClasses(signal?: string) {
  switch (normalizeSignal(signal)) {
    case 'urgent':
      return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
    case 'discreet':
      return 'border-sky-500/25 bg-sky-500/10 text-sky-200';
    case 'later':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-200';
    default:
      return 'border-border bg-white/5 text-slate-200';
  }
}

function getStatusClasses(status?: string) {
  switch (status) {
    case 'received':
      return 'border-violet-500/25 bg-violet-500/10 text-violet-200';
    case 'accepted':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
    case 'inProgress':
      return 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200';
    case 'waitingForClient':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-200';
    case 'done':
      return 'border-green-500/25 bg-green-500/10 text-green-200';
    case 'canceled':
      return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
    case 'rejected':
      return 'border-red-500/25 bg-red-500/10 text-red-200';
    default:
      return 'border-border bg-white/5 text-slate-200';
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
    normalized === 'gewerbekunde' ||
    normalized === 'commercial' ||
    normalized === 'company' ||
    normalized === 'firma'
  ) {
    return 'business';
  }

  if (
    normalized === 'private' ||
    normalized === 'privat' ||
    normalized === 'privatkunde' ||
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

function getCustomerTypeLabel(request: RequestItem) {
  const type = normalizeCustomerType(request);

  if (type === 'business') return 'Gewerbekunde';
  if (type === 'private') return 'Privatkunde';
  return 'Kundentyp offen';
}

function getCustomerTypeClasses(request: RequestItem) {
  const type = normalizeCustomerType(request);

  if (type === 'business') {
    return 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200';
  }

  if (type === 'private') {
    return 'border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200';
  }

  return 'border-border bg-white/5 text-slate-300';
}

function formatDate(value?: string) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatEuro(amount?: number | null) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getCustomerEnteredPrice(request: RequestItem) {
  return request.clientBudgetAmount ?? request.budgetAmount ?? null;
}

function getSupportRevenue(request: RequestItem) {
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
    return Math.max(
      Math.round((customerPrice - entrepreneurPrice) * 100) / 100,
      0
    );
  }

  return null;
}

function getEntrepreneurPrice(request: RequestItem) {
  const extended = request as RequestItem & {
    entrepreneurPrice?: number | null;
    agreedDriverPrice?: number | null;
    driverPrice?: number | null;
    selectedDriverPrice?: number | null;
    contractorPrice?: number | null;
  };

  return (
    extended.entrepreneurPrice ??
    extended.agreedDriverPrice ??
    extended.driverPrice ??
    extended.selectedDriverPrice ??
    extended.contractorPrice ??
    null
  );
}

function getPricingState(request: RequestItem) {
  const customerPrice = getCustomerEnteredPrice(request);
  const supportRevenue = getSupportRevenue(request);
  const entrepreneurPrice = getEntrepreneurPrice(request);

  return {
    customerPrice,
    supportRevenue,
    entrepreneurPrice,
    hasCustomerPrice: customerPrice != null,
    hasSupportRevenue: supportRevenue != null,
    hasEntrepreneurPrice: entrepreneurPrice != null,
    hasAllThree:
      customerPrice != null &&
      supportRevenue != null &&
      entrepreneurPrice != null,
  };
}

function getDisplayedCustomerPrice(request: RequestItem) {
  const customerType = normalizeCustomerType(request);
  const customerPrice = getCustomerEnteredPrice(request);

  if (customerType === 'business') {
    return {
      label: 'Kundenpreis',
      value: formatEuro(customerPrice),
      hint: 'Vom Kunden angegeben · Gewerbekunde',
    };
  }

  if (customerType === 'private') {
    return {
      label: 'Kundenpreis',
      value: formatEuro(customerPrice),
      hint: 'Vom Kunden angegeben · Privatkunde',
    };
  }

  return {
    label: 'Kundenpreis',
    value: formatEuro(customerPrice),
    hint: 'Vom Kunden angegeben',
  };
}

function getDisplayedRevenue(request: RequestItem) {
  const customerType = normalizeCustomerType(request);
  const revenue = getSupportRevenue(request);

  if (customerType === 'business') {
    return {
      label: 'Erlöse',
      value: formatEuro(revenue),
      hint: 'Interner Betrag · Gewerbekunde',
    };
  }

  if (customerType === 'private') {
    return {
      label: 'Erlöse',
      value: formatEuro(revenue),
      hint: 'Interner Betrag · Privatkunde',
    };
  }

  return {
    label: 'Erlöse',
    value: formatEuro(revenue),
    hint: 'Interner Betrag',
  };
}

function getDisplayedEntrepreneurPrice(request: RequestItem) {
  const customerType = normalizeCustomerType(request);
  const entrepreneurPrice = getEntrepreneurPrice(request);

  if (customerType === 'business') {
    return {
      label: 'Unternehmerpreis',
      value: formatEuro(entrepreneurPrice),
      hint: 'Fahrer / Unternehmer · Gewerbekunde',
    };
  }

  if (customerType === 'private') {
    return {
      label: 'Unternehmerpreis',
      value: formatEuro(entrepreneurPrice),
      hint: 'Fahrer / Unternehmer · Privatkunde',
    };
  }

  return {
    label: 'Unternehmerpreis',
    value: formatEuro(entrepreneurPrice),
    hint: 'Fahrer / Unternehmer',
  };
}

type PriceCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: 'default' | 'amber' | 'emerald' | 'cyan';
};

function PriceCard({
  label,
  value,
  hint,
  tone = 'default',
}: PriceCardProps) {
  const toneClasses =
    tone === 'amber'
      ? 'border-amber-500/20 bg-amber-500/5'
      : tone === 'emerald'
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : tone === 'cyan'
          ? 'border-cyan-500/20 bg-cyan-500/5'
          : 'border-border bg-background';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-white">{value}</div>
      <div className="mt-2 text-xs text-slate-400">{hint}</div>
    </div>
  );
}

function RequestCard({
  request,
  onDelete,
}: {
  request: RequestItem;
  onDelete?: (id: string) => void;
}) {
  const customerPrice = getDisplayedCustomerPrice(request);
  const revenue = getDisplayedRevenue(request);
  const entrepreneurPrice = getDisplayedEntrepreneurPrice(request);
  const pricingState = getPricingState(request);

  const customerName =
    request.userId?.fullName ||
    request.userId?.name ||
    [request.userId?.firstName, request.userId?.lastName]
      .filter(Boolean)
      .join(' ') ||
    'Unbekannter Kunde';

  const customerEmail = request.userId?.email || '—';

  const assignedDriver =
    request.assignedDriverId?.fullName ||
    request.assignedDriverId?.name ||
    [request.assignedDriverId?.firstName, request.assignedDriverId?.lastName]
      .filter(Boolean)
      .join(' ') ||
    'Nicht zugewiesen';

  return (
    <article className="rounded-3xl border border-border bg-surface p-5 shadow-premium xl:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${getSignalClasses(
                request.signal
              )}`}
            >
              {getSignalLabel(request.signal)}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                request.status
              )}`}
            >
              {getStatusLabel(request.status)}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${getCustomerTypeClasses(
                request
              )}`}
            >
              {getCustomerTypeLabel(request)}
            </span>

            {request.referenceNumber ? (
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
                {request.referenceNumber}
              </span>
            ) : null}

            {request.priceInquiryId ? (
              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                Preisabfrage verknüpft
              </span>
            ) : null}

            {request.driverAssignedViaInquiry ? (
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                Fahrer via Preisabfrage
              </span>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-semibold text-white">
            {request.title || 'Ohne Titel'}
          </h3>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
            {request.description || 'Keine Beschreibung vorhanden.'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:w-[260px] xl:grid-cols-1">
          <Link
            href={`/requests/${request._id}`}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-medium text-white transition hover:bg-white/5"
          >
            Öffnen
          </Link>

          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(request._id)}
              className="w-full rounded-2xl border border-rose-500/25 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/10"
            >
              Löschen
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Kunde
          </p>
          <p className="mt-3 text-sm font-semibold text-white">{customerName}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{customerEmail}</p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Fahrer
          </p>
          <p className="mt-3 text-sm font-semibold text-white">
            {assignedDriver}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Erstellt: {formatDate(request.createdAt)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Referenz
          </p>
          <p className="mt-3 text-sm font-semibold text-white">
            {request.referenceNumber || 'Ohne Referenz'}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Anfrage-ID: {request._id}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Preisstatus
          </p>
          <p className="mt-3 text-sm font-semibold text-white">
            {pricingState.hasAllThree
              ? 'Alle 3 Preisfelder vorhanden'
              : 'Preisfelder unvollständig'}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Kundenpreis, Erlöse und Unternehmerpreis getrennt sichtbar
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <PriceCard
          label={customerPrice.label}
          value={customerPrice.value}
          hint={customerPrice.hint}
          tone="amber"
        />
        <PriceCard
          label={revenue.label}
          value={revenue.value}
          hint={revenue.hint}
          tone="emerald"
        />
        <PriceCard
          label={entrepreneurPrice.label}
          value={entrepreneurPrice.value}
          hint={entrepreneurPrice.hint}
          tone="cyan"
        />
      </div>
    </article>
  );
}

export default function RequestTable({ requests, onDelete }: Props) {
  if (!requests.length) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8 text-center shadow-premium">
        <p className="text-lg font-semibold text-white">
          Keine Aufträge gefunden
        </p>
        <p className="mt-2 text-sm text-muted">
          Passe Filter oder Suche an, um Ergebnisse zu sehen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <RequestCard key={request._id} request={request} onDelete={onDelete} />
      ))}
    </div>
  );
}
