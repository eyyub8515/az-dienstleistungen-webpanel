'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import StatusUpdateForm from '@/components/StatusUpdateForm';
import { SignalBadge, StatusBadge } from '@/components/RequestBadge';
import {
  assignDriverToRequest,
  createPriceInquiry,
  deleteRequest,
  getAvailableDrivers,
  getPriceInquiries,
  getRequestById,
  getRequestMessages,
  sendRequestMessage,
  unassignDriverFromRequest,
  updateRequest,
} from '@/lib/api';
import { getStoredToken } from '@/lib/auth';
import {
  Driver,
  DriverAvailability,
  PriceInquiryDriverEntry,
  PriceInquiryItem,
  RequestItem,
  RequestMessage,
  RequestMessageRecipient,
} from '@/lib/types';

function formatDate(value?: string | null) {
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

function formatMoney(amount?: number | null) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatInputMoney(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  return String(value);
}

function parseMoneyInput(value: string): number | null | typeof Number.NaN {
  const normalized = value.replace(',', '.').trim();

  if (!normalized) return null;

  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed < 0) return Number.NaN;

  return Math.round(parsed * 100) / 100;
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

function getPricingData(request: RequestItem) {
  const extended = request as RequestItem & {
    clientBudgetAmount?: number | null;
    budgetAmount?: number | null;
    budget?: number | null;
    agreedDriverPrice?: number | null;
    finalPriceNet?: number | null;
    finalPriceGross?: number | null;
    approvedPriceNet?: number | null;
    approvedPriceGross?: number | null;
    priceNet?: number | null;
    priceGross?: number | null;
    netPrice?: number | null;
    grossPrice?: number | null;
    customerPriceNet?: number | null;
    customerPriceGross?: number | null;
    approvedPrice?: number | null;
    finalPrice?: number | null;
    price?: number | null;
    supportPriceAmount?: number | null;
    adminRevenue?: number | null;
    entrepreneurPrice?: number | null;
  };

  const customerPrice =
    extended.clientBudgetAmount ??
    extended.budgetAmount ??
    extended.budget ??
    null;

  const supportPrice =
    extended.supportPriceAmount ?? extended.adminRevenue ?? null;

  const entrepreneurPrice =
    extended.entrepreneurPrice ?? extended.agreedDriverPrice ?? null;

  const approvedNet =
    extended.finalPriceNet ??
    extended.approvedPriceNet ??
    extended.priceNet ??
    extended.netPrice ??
    extended.customerPriceNet ??
    null;

  const approvedGross =
    extended.finalPriceGross ??
    extended.approvedPriceGross ??
    extended.priceGross ??
    extended.grossPrice ??
    extended.customerPriceGross ??
    null;

  const genericApproved =
    extended.approvedPrice ?? extended.finalPrice ?? extended.price ?? null;

  const calculatedSupportPrice =
    supportPrice != null
      ? supportPrice
      : typeof customerPrice === 'number' &&
          typeof entrepreneurPrice === 'number'
        ? Math.max(
            Math.round((customerPrice - entrepreneurPrice) * 100) / 100,
            0
          )
        : null;

  return {
    customerPrice,
    supportPrice: calculatedSupportPrice,
    entrepreneurPrice,
    approvedNet,
    approvedGross,
    genericApproved,
  };
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

function resolveDriverFromInquiry(entry: PriceInquiryDriverEntry) {
  if (!entry.driverId) return null;
  if (typeof entry.driverId === 'string') return { _id: entry.driverId };
  return entry.driverId;
}

function resolveInquiryRequestId(item: PriceInquiryItem) {
  if (!item.requestId) return '';
  if (typeof item.requestId === 'string') return item.requestId;
  return item.requestId._id || '';
}

function resolvePriceInquiryId(value: unknown) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as { _id?: string })._id || '');
  }
  return '';
}

function getRecipientLabel(recipient: RequestMessageRecipient) {
  switch (recipient) {
    case 'customer':
      return 'Kunde';
    case 'driver':
      return 'Fahrer';
    case 'both':
      return 'Kunde + Fahrer';
    default:
      return recipient;
  }
}

function getMessageDirectionLabel(message: RequestMessage) {
  if (message.senderRole === 'support' || message.senderRole === 'admin') {
    return 'Support';
  }

  if (message.senderRole === 'driver') {
    return 'Fahrer';
  }

  if (message.senderRole === 'user') {
    return 'Kunde';
  }

  return 'System';
}

function getMessageTargetLabel(message: RequestMessage) {
  return message.targetType === 'driver' ? 'Fahrer' : 'Kunde';
}

function getMessageRecipientTone(recipient: RequestMessageRecipient) {
  switch (recipient) {
    case 'customer':
      return 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200';
    case 'driver':
      return 'border-accent/25 bg-accent/10 text-accent';
    case 'both':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
    default:
      return 'border-border bg-white/5 text-slate-300';
  }
}

function getMessageTargetTone(targetType: RequestMessage['targetType']) {
  if (targetType === 'driver') {
    return 'border-accent/25 bg-accent/10 text-accent';
  }

  return 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200';
}

function getMessageSenderTone(role?: string) {
  if (role === 'support' || role === 'admin') {
    return 'border-accent/25 bg-accent/10 text-accent';
  }

  if (role === 'driver') {
    return 'border-violet-500/25 bg-violet-500/10 text-violet-200';
  }

  if (role === 'user') {
    return 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200';
  }

  return 'border-border bg-white/5 text-slate-300';
}

type SummaryCardProps = {
  label: string;
  value: string;
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
        : 'border-border bg-background';

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      {hint ? (
        <p className="mt-2 text-xs leading-6 text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
};

function InfoCard({ label, value }: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-100">
        {value}
      </p>
    </div>
  );
}

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [request, setRequest] = useState<RequestItem | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [requestInquiries, setRequestInquiries] = useState<PriceInquiryItem[]>(
    []
  );
  const [requestMessages, setRequestMessages] = useState<RequestMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageRecipient, setMessageRecipient] =
    useState<RequestMessageRecipient>('customer');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageInternalNote, setMessageInternalNote] = useState('');

  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [inquiryTitle, setInquiryTitle] = useState('');
  const [inquiryDescription, setInquiryDescription] = useState('');
  const [inquiryAdminNote, setInquiryAdminNote] = useState('');
  const [inquiryExpiresAt, setInquiryExpiresAt] = useState('');
  const [proposedDriverPriceInput, setProposedDriverPriceInput] = useState('');

  const [manualDriverId, setManualDriverId] = useState('');
  const [manualAssignNote, setManualAssignNote] = useState('');
  const [manualSupportPriceInput, setManualSupportPriceInput] = useState('');
  const [manualEntrepreneurPriceInput, setManualEntrepreneurPriceInput] =
    useState('');

  const [customerPriceInput, setCustomerPriceInput] = useState('');
  const [supportPriceInput, setSupportPriceInput] = useState('');
  const [entrepreneurPriceInput, setEntrepreneurPriceInput] = useState('');
  const [savingPrices, setSavingPrices] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [creatingInquiry, setCreatingInquiry] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [unassigningDriver, setUnassigningDriver] = useState(false);

  const didInitializeRequestFormRef = useRef(false);
  const didInitializePricingRef = useRef(false);
  const didInitializeInquiryPriceRef = useRef(false);

  const loadMessages = useCallback(async () => {
    const token = getStoredToken();

    if (!token || !params?.id) {
      return;
    }

    try {
      setMessagesLoading(true);
      const messages = await getRequestMessages(token, params.id);
      setRequestMessages(Array.isArray(messages) ? messages : []);
    } catch (err) {
      console.error('REQUEST_MESSAGES_LOAD_ERROR', err);
    } finally {
      setMessagesLoading(false);
    }
  }, [params?.id]);

  const loadRequest = useCallback(async () => {
    const token = getStoredToken();

    if (!token || !params?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const [requestData, driversData, inquiriesData] = await Promise.all([
        getRequestById(token, params.id),
        getAvailableDrivers(token),
        getPriceInquiries(token),
      ]);

      const safeInquiries = Array.isArray(inquiriesData)
        ? inquiriesData.filter(
            (item) => resolveInquiryRequestId(item) === params.id
          )
        : [];

      setRequest(requestData);
      setAvailableDrivers(Array.isArray(driversData) ? driversData : []);
      setRequestInquiries(safeInquiries);

      if (!didInitializeRequestFormRef.current) {
        setInquiryTitle(
          requestData.title
            ? `${requestData.title} · Preisabfrage`
            : 'Preisabfrage'
        );

        if (requestData.assignedDriverId?._id) {
          setManualDriverId(requestData.assignedDriverId._id);
        }

        setMessageSubject(
          requestData.title
            ? `Nachricht zu Auftrag: ${requestData.title}`
            : 'Nachricht zu Ihrem Auftrag'
        );

        didInitializeRequestFormRef.current = true;
      }

      const requestPricing = getPricingData(requestData);

      if (!didInitializePricingRef.current) {
        setCustomerPriceInput(formatInputMoney(requestPricing.customerPrice));
        setSupportPriceInput(formatInputMoney(requestPricing.supportPrice));
        setEntrepreneurPriceInput(
          formatInputMoney(requestPricing.entrepreneurPrice)
        );
        setManualSupportPriceInput(formatInputMoney(requestPricing.supportPrice));
        setManualEntrepreneurPriceInput(
          formatInputMoney(requestPricing.entrepreneurPrice)
        );
        didInitializePricingRef.current = true;
      }

      if (!didInitializeInquiryPriceRef.current) {
        const autoValue =
          typeof requestPricing.customerPrice === 'number'
            ? Math.round(requestPricing.customerPrice * 0.8 * 100) / 100
            : null;
        setProposedDriverPriceInput(formatInputMoney(autoValue));
        didInitializeInquiryPriceRef.current = true;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Auftragsdetails konnten nicht geladen werden.'
      );
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    loadRequest();
    loadMessages();
  }, [loadMessages, loadRequest]);

  const activeInquiry = useMemo(() => {
    return (
      requestInquiries.find(
        (item) => item.status === 'open' || item.status === 'assigned'
      ) || null
    );
  }, [requestInquiries]);

  const linkedInquiry = useMemo(() => {
    const linkedId = resolvePriceInquiryId(request?.priceInquiryId);
    if (!linkedId) return activeInquiry;
    return (
      requestInquiries.find((item) => item._id === linkedId) || activeInquiry
    );
  }, [activeInquiry, request?.priceInquiryId, requestInquiries]);

  const sortedInquiries = useMemo(() => {
    return [...requestInquiries].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [requestInquiries]);

  const sortedMessages = useMemo(() => {
    return [...requestMessages].sort((a, b) => {
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });
  }, [requestMessages]);

  const manualDriverOptions = useMemo(() => {
    const currentAssigned = request?.assignedDriverId;
    const merged = [...availableDrivers];

    if (
      currentAssigned?._id &&
      !merged.some((driver) => driver._id === currentAssigned._id)
    ) {
      merged.unshift({
        _id: currentAssigned._id,
        fullName: currentAssigned.fullName,
        name: currentAssigned.name,
        email: currentAssigned.email || '',
        phone: currentAssigned.phone,
        role: 'driver',
      });
    }

    return merged;
  }, [availableDrivers, request?.assignedDriverId]);

  const withdrawnCount = useMemo(() => {
    if (!activeInquiry?.driverInquiries?.length) return 0;
    return activeInquiry.driverInquiries.filter(
      (entry) => entry.status === 'withdrawn'
    ).length;
  }, [activeInquiry]);

  const customerTypeLabel = useMemo(() => {
    return request ? getCustomerTypeLabel(request) : 'Kundentyp offen';
  }, [request]);

  const pricing = useMemo(() => {
    return request
      ? getPricingData(request)
      : {
          customerPrice: null,
          supportPrice: null,
          entrepreneurPrice: null,
          approvedNet: null,
          approvedGross: null,
          genericApproved: null,
        };
  }, [request]);

  const autoCalculatedDriverPrice = useMemo(() => {
    const parsedCustomerPrice = parseMoneyInput(customerPriceInput);

    if (
      typeof parsedCustomerPrice === 'number' &&
      !Number.isNaN(parsedCustomerPrice)
    ) {
      return Math.round(parsedCustomerPrice * 0.8 * 100) / 100;
    }

    if (typeof pricing.customerPrice === 'number') {
      return Math.round(pricing.customerPrice * 0.8 * 100) / 100;
    }

    return null;
  }, [customerPriceInput, pricing.customerPrice]);

  const selectedDriverCount = selectedDriverIds.length;
  const allAvailableDriverIds = useMemo(
    () => availableDrivers.map((driver) => driver._id),
    [availableDrivers]
  );
  const allDriversSelected =
    availableDrivers.length > 0 &&
    allAvailableDriverIds.every((id) => selectedDriverIds.includes(id));

  const customerDisplayName = useMemo(() => {
    if (!request) return 'Unbekannt';

    return (
      request.userId?.fullName ||
      request.userId?.name ||
      [request.userId?.firstName, request.userId?.lastName]
        .filter(Boolean)
        .join(' ') ||
      'Unbekannt'
    );
  }, [request]);

  const canMessageDriver = Boolean(request?.assignedDriverId?._id);
  const canMessageCustomer = Boolean(
    request?.userId?._id || request?.userId?.email
  );
  const canMessageBoth = canMessageCustomer && canMessageDriver;

  useEffect(() => {
    if (messageRecipient === 'both' && !canMessageBoth) {
      if (canMessageCustomer) {
        setMessageRecipient('customer');
      } else if (canMessageDriver) {
        setMessageRecipient('driver');
      }
    }

    if (
      messageRecipient === 'driver' &&
      !canMessageDriver &&
      canMessageCustomer
    ) {
      setMessageRecipient('customer');
    }

    if (
      messageRecipient === 'customer' &&
      !canMessageCustomer &&
      canMessageDriver
    ) {
      setMessageRecipient('driver');
    }
  }, [canMessageBoth, canMessageCustomer, canMessageDriver, messageRecipient]);

  const handleDelete = async () => {
    if (!request?._id) return;

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
      setIsDeleting(true);
      setError('');
      setSuccess('');
      await deleteRequest(token, request._id);
      router.push('/requests');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Auftrag konnte nicht gelöscht werden.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssignDriver = async () => {
    const token = getStoredToken();

    if (!token || !request?._id || !manualDriverId) {
      setError('Bitte zuerst einen Fahrer auswählen.');
      return;
    }

    const parsedSupportPrice = parseMoneyInput(manualSupportPriceInput);
    const parsedEntrepreneurPrice = parseMoneyInput(
      manualEntrepreneurPriceInput
    );

    if (Number.isNaN(parsedSupportPrice)) {
      setError('Preis ist ungültig.');
      return;
    }

    if (Number.isNaN(parsedEntrepreneurPrice)) {
      setError('Unternehmerpreis ist ungültig.');
      return;
    }

    try {
      setAssigningDriver(true);
      setError('');
      setSuccess('');

      await assignDriverToRequest(
        token,
        request._id,
        manualDriverId,
        manualAssignNote || undefined,
        parsedSupportPrice ?? undefined,
        parsedEntrepreneurPrice ?? undefined
      );
      setManualAssignNote('');
      setSuccess('Fahrer wurde dem Auftrag erfolgreich zugewiesen.');
      await Promise.all([loadRequest(), loadMessages()]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Fahrer konnte nicht zugewiesen werden.'
      );
    } finally {
      setAssigningDriver(false);
    }
  };

  const handleUnassignDriver = async () => {
    const token = getStoredToken();

    if (!token || !request?._id) {
      setError('Fahrer-Zuweisung konnte nicht entfernt werden.');
      return;
    }

    const confirmed = window.confirm(
      request.driverAssignedViaInquiry
        ? 'Möchtest du die aktuelle Fahrerzuweisung aus der Preisabfrage wirklich zurückziehen?'
        : 'Möchtest du die Fahrer-Zuweisung wirklich entfernen?'
    );
    if (!confirmed) return;

    try {
      setUnassigningDriver(true);
      setError('');
      setSuccess('');

      await unassignDriverFromRequest(
        token,
        request._id,
        manualAssignNote || undefined
      );
      setManualAssignNote('');
      setSuccess(
        request.driverAssignedViaInquiry
          ? 'Fahrerzuweisung aus der Preisabfrage wurde entfernt.'
          : 'Fahrer-Zuweisung wurde entfernt.'
      );
      await Promise.all([loadRequest(), loadMessages()]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Fahrer-Zuweisung konnte nicht entfernt werden.'
      );
    } finally {
      setUnassigningDriver(false);
    }
  };

  const handleSavePricing = async () => {
    const token = getStoredToken();

    if (!token || !request?._id) {
      setError('Preise konnten nicht gespeichert werden.');
      return;
    }

    const parsedCustomerPrice = parseMoneyInput(customerPriceInput);
    const parsedSupportPrice = parseMoneyInput(supportPriceInput);
    const parsedEntrepreneurPrice = parseMoneyInput(entrepreneurPriceInput);

    if (
      Number.isNaN(parsedCustomerPrice) ||
      parsedCustomerPrice === null ||
      parsedCustomerPrice <= 0
    ) {
      setError('Kundenpreis muss größer als 0 sein.');
      return;
    }

    if (Number.isNaN(parsedSupportPrice)) {
      setError('Preis ist ungültig.');
      return;
    }

    if (Number.isNaN(parsedEntrepreneurPrice)) {
      setError('Unternehmerpreis ist ungültig.');
      return;
    }

    try {
      setSavingPrices(true);
      setError('');
      setSuccess('');

      await updateRequest(token, request._id, {
        clientBudgetAmount: parsedCustomerPrice,
        supportPriceAmount: parsedSupportPrice,
        agreedDriverPrice: parsedEntrepreneurPrice,
      });

      setSuccess(
        'Kundenpreis, Preis und Unternehmerpreis wurden erfolgreich gespeichert.'
      );
      await loadRequest();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Preise konnten nicht gespeichert werden.'
      );
    } finally {
      setSavingPrices(false);
    }
  };

  const handleToggleDriverSelection = (driverId: string) => {
    setSelectedDriverIds((prev) =>
      prev.includes(driverId)
        ? prev.filter((id) => id !== driverId)
        : [...prev, driverId]
    );
  };

  const handleToggleAllDrivers = () => {
    if (allDriversSelected) {
      setSelectedDriverIds([]);
      return;
    }

    setSelectedDriverIds(allAvailableDriverIds);
  };

  const handleUseAuto80Percent = () => {
    setProposedDriverPriceInput(formatInputMoney(autoCalculatedDriverPrice));
  };

  const handleCreateInquiry = async () => {
    const token = getStoredToken();

    if (!token || !request?._id) {
      setError('Preisabfrage konnte nicht erstellt werden.');
      return;
    }

    if (selectedDriverIds.length === 0) {
      setError('Bitte mindestens einen Fahrer für die Preisabfrage auswählen.');
      return;
    }

    if (!inquiryTitle.trim()) {
      setError('Bitte einen Titel für die Preisabfrage eingeben.');
      return;
    }

    const parsedProposedDriverPrice = parseMoneyInput(proposedDriverPriceInput);

    if (Number.isNaN(parsedProposedDriverPrice)) {
      setError('Unternehmerpreis-Vorgabe ist ungültig.');
      return;
    }

    try {
      setCreatingInquiry(true);
      setError('');
      setSuccess('');

      await createPriceInquiry(token, {
        requestId: request._id,
        title: inquiryTitle.trim(),
        description: inquiryDescription.trim() || undefined,
        adminNote: inquiryAdminNote.trim() || undefined,
        driverIds: selectedDriverIds,
        expiresAt: inquiryExpiresAt
          ? new Date(inquiryExpiresAt).toISOString()
          : null,
        proposedDriverPrice: parsedProposedDriverPrice,
        autoCalculatedDriverPrice,
        selectAllDrivers:
          selectedDriverIds.length > 0 &&
          selectedDriverIds.length === availableDrivers.length,
      });

      setInquiryDescription('');
      setInquiryAdminNote('');
      setInquiryExpiresAt('');
      setSelectedDriverIds([]);

      setSuccess(
        'Preisabfrage wurde erfolgreich erstellt und an die Fahrer versendet.'
      );
      await Promise.all([loadRequest(), loadMessages()]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Preisabfrage konnte nicht erstellt werden.'
      );
    } finally {
      setCreatingInquiry(false);
    }
  };

  const handleSendMessage = async () => {
    const token = getStoredToken();

    if (!token || !request?._id) {
      setError('Nachricht konnte nicht versendet werden.');
      return;
    }

    if (!messageSubject.trim()) {
      setError('Bitte einen Betreff eingeben.');
      return;
    }

    if (!messageText.trim()) {
      setError('Bitte einen Nachrichtentext eingeben.');
      return;
    }

    if (messageRecipient === 'customer' && !canMessageCustomer) {
      setError('Für diesen Auftrag ist kein Kunde als Empfänger verfügbar.');
      return;
    }

    if (messageRecipient === 'driver' && !canMessageDriver) {
      setError('Für diesen Auftrag ist aktuell kein Fahrer zugewiesen.');
      return;
    }

    if (messageRecipient === 'both' && !canMessageBoth) {
      setError(
        'Für Kunde + Fahrer müssen sowohl Kundendaten als auch ein zugewiesener Fahrer vorhanden sein.'
      );
      return;
    }

    try {
      setSendingMessage(true);
      setError('');
      setSuccess('');

      const response = await sendRequestMessage(token, request._id, {
        recipient: messageRecipient,
        subject: messageSubject.trim(),
        text: messageText.trim(),
        internalNote: messageInternalNote.trim() || undefined,
      });

      setMessageText('');
      setMessageInternalNote('');
      setSuccess(
        response.message ||
          (messageRecipient === 'both'
            ? 'Nachrichten wurden erfolgreich an Kunde und Fahrer gesendet.'
            : 'Nachricht wurde erfolgreich gesendet.')
      );
      await loadMessages();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nachricht konnte nicht versendet werden.'
      );
    } finally {
      setSendingMessage(false);
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
                  Operations
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-white">
                  Request-Detailbereich
                </h1>
                <p className="mt-2 max-w-4xl text-muted">
                  Anfrage prüfen, Preise steuern, Fahrer verwalten,
                  Preisabfragen und direkte Kommunikation in einem sauberen
                  Gesamtbild bearbeiten.
                </p>
              </div>

              <Link
                href="/requests"
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

            {!loading && request ? (
              <div className="grid gap-8 2xl:grid-cols-[minmax(0,1.65fr)_380px]">
                <section className="min-w-0 space-y-8">
                  <div className="rounded-3xl border border-border bg-surface p-6 shadow-premium xl:p-7">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={request.status} />
                      <SignalBadge signal={request.signal} />

                      {request.referenceNumber ? (
                        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
                          {request.referenceNumber}
                        </span>
                      ) : null}

                      {request.driverAssignedViaInquiry ? (
                        <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                          Fahrer via Preisabfrage
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-5 text-3xl font-semibold text-white">
                      {request.title || 'Neue Anfrage'}
                    </h2>

                    <p className="mt-4 max-w-5xl text-base leading-7 text-slate-200">
                      {request.description || 'Keine Beschreibung vorhanden.'}
                    </p>

                    <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="rounded-2xl border border-border bg-background p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">
                          Kunde
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getCustomerTypeClasses(
                              request
                            )}`}
                          >
                            {customerTypeLabel}
                          </span>
                        </div>

                        <p className="mt-4 text-lg font-medium text-white">
                          {customerDisplayName}
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <InfoCard
                            label="E-Mail"
                            value={request.userId?.email || '—'}
                          />
                          <InfoCard
                            label="Telefon"
                            value={request.userId?.phone || '—'}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-background p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">
                          Einsatzdaten
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <InfoCard
                            label="Kategorie"
                            value={request.category || '—'}
                          />
                          <InfoCard
                            label="Termin"
                            value={
                              request.scheduledAt
                                ? formatDate(request.scheduledAt)
                                : '—'
                            }
                          />
                          <InfoCard
                            label="Abholung"
                            value={
                              request.pickupLocation ||
                              request.pickupAddress ||
                              '—'
                            }
                          />
                          <InfoCard
                            label="Ziel"
                            value={
                              request.destination || request.dropoffAddress || '—'
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <SummaryCard
                        label="Kundenpreis"
                        value={formatMoney(pricing.customerPrice)}
                        hint="Vom Kunden angegeben"
                      />
                      <SummaryCard
                        label="Preis"
                        value={formatMoney(pricing.supportPrice)}
                        hint="Dein Betrag / Erlöse"
                        emphasis="success"
                      />
                      <SummaryCard
                        label="Unternehmerpreis"
                        value={formatMoney(pricing.entrepreneurPrice)}
                        hint="Fahrer / Unternehmer"
                        emphasis="gold"
                      />
                      <SummaryCard
                        label="Kundentyp"
                        value={customerTypeLabel}
                        hint="Preislogik nach Kundentyp"
                      />
                    </div>

                    <div className="mt-8 rounded-2xl border border-border bg-background p-5">
                      <div className="flex flex-col gap-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">
                          Preisverwaltung
                        </p>
                        <p className="text-sm leading-6 text-muted">
                          Kundenpreis = vom Kunden angegebener Preis · Preis =
                          Erlöse · Unternehmerpreis = Betrag für Fahrer oder
                          Unternehmer. Im gesamten System ist ausschließlich
                          Euro (€) erlaubt.
                        </p>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm text-muted">
                            Kundenpreis (€)
                          </label>
                          <input
                            value={customerPriceInput}
                            onChange={(e) =>
                              setCustomerPriceInput(e.target.value)
                            }
                            placeholder="z. B. 2500"
                            className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-muted">
                            Preis / Erlöse (€)
                          </label>
                          <input
                            value={supportPriceInput}
                            onChange={(e) => setSupportPriceInput(e.target.value)}
                            placeholder="z. B. 500"
                            className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-muted">
                            Unternehmerpreis (€)
                          </label>
                          <input
                            value={entrepreneurPriceInput}
                            onChange={(e) =>
                              setEntrepreneurPriceInput(e.target.value)
                            }
                            placeholder="z. B. 2000"
                            className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSavePricing}
                        disabled={savingPrices}
                        className="mt-6 rounded-2xl bg-accent px-5 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-60"
                      >
                        {savingPrices
                          ? 'Werte werden gespeichert…'
                          : 'Kundenpreis, Preis und Unternehmerpreis speichern'}
                      </button>
                    </div>

                    <div className="mt-8 rounded-2xl border border-border bg-background p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">
                        Zusätzliche Hinweise
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-200">
                        {request.notes || 'Keine zusätzlichen Hinweise vorhanden.'}
                      </p>
                    </div>

                    <div className="mt-8 rounded-2xl border border-border bg-background p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">
                          Anhänge
                        </p>
                        <p className="text-xs text-muted">
                          {request.attachments?.length || 0} Datei(en)
                        </p>
                      </div>

                      <div className="mt-4 space-y-3">
                        {request.attachments?.length ? (
                          request.attachments.map((attachment, index) => (
                            <a
                              key={`${attachment.url}-${index}`}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-3 transition hover:border-accent/50 hover:bg-white/[0.03]"
                            >
                              <div>
                                <p className="font-medium text-slate-100">
                                  {attachment.name || 'Anhang'}
                                </p>
                                <p className="mt-1 text-xs text-muted">
                                  {attachment.mimeType || 'Datei'}
                                  {attachment.size
                                    ? ` · ${Math.round(
                                        attachment.size / 1024
                                      )} KB`
                                    : ''}
                                </p>
                              </div>
                              <span className="text-sm font-medium text-accent">
                                Öffnen
                              </span>
                            </a>
                          ))
                        ) : (
                          <p className="text-sm text-muted">
                            Keine Anhänge vorhanden.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border bg-surface p-6 shadow-premium xl:p-7">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-accent">
                          Preisabfrage-System
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">
                          Preisabfragen für diesen Auftrag
                        </h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                          Mehrere Fahrer gleichzeitig anfragen, Antworten prüfen
                          und verknüpfte Preisabfragen sauber nachverfolgen.
                        </p>
                      </div>

                      <Link
                        href="/price-inquiries"
                        className="rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-white/5"
                      >
                        Alle Preisabfragen
                      </Link>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <SummaryCard
                        label="Preisabfragen gesamt"
                        value={String(requestInquiries.length)}
                      />
                      <SummaryCard
                        label="Aktive Preisabfrage"
                        value={activeInquiry ? '1' : '0'}
                        emphasis="gold"
                      />
                      <SummaryCard
                        label="Geantwortet"
                        value={String(activeInquiry?.stats?.answeredCount ?? 0)}
                      />
                      <SummaryCard
                        label="Ausstehend"
                        value={String(activeInquiry?.stats?.pendingCount ?? 0)}
                      />
                      <SummaryCard
                        label="Zurückgezogen"
                        value={String(withdrawnCount)}
                      />
                    </div>

                    {activeInquiry ? (
                      <div className="mt-6 rounded-3xl border border-border bg-background p-5 xl:p-6">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-medium ${getInquiryStatusClass(
                                  activeInquiry.status
                                )}`}
                              >
                                {getInquiryStatusLabel(activeInquiry.status)}
                              </span>

                              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
                                {activeInquiry.referenceNumber || 'Preisabfrage'}
                              </span>
                            </div>

                            <h4 className="mt-4 text-xl font-semibold text-white">
                              {activeInquiry.title}
                            </h4>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {activeInquiry.description ||
                                'Keine Beschreibung vorhanden.'}
                            </p>
                          </div>

                          <Link
                            href={`/price-inquiries/${activeInquiry._id}`}
                            className="rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-white/5"
                          >
                            Preisabfrage öffnen
                          </Link>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                          <SummaryCard
                            label="Ablauf"
                            value={formatDate(activeInquiry.expiresAt)}
                          />
                          <SummaryCard
                            label="Kundenpreis"
                            value={formatMoney(pricing.customerPrice)}
                          />
                          <SummaryCard
                            label="Preis / Erlöse"
                            value={formatMoney(pricing.supportPrice)}
                            emphasis="success"
                          />
                          <SummaryCard
                            label="Unternehmerpreis"
                            value={
                              typeof activeInquiry.selectedPrice === 'number'
                                ? formatMoney(activeInquiry.selectedPrice)
                                : formatMoney(
                                    activeInquiry.proposedDriverPrice ??
                                      activeInquiry.autoCalculatedDriverPrice
                                  )
                            }
                            emphasis="gold"
                          />
                          <SummaryCard
                            label="Auto 80%"
                            value={formatMoney(
                              activeInquiry.autoCalculatedDriverPrice
                            )}
                          />
                        </div>

                        <div className="mt-6 space-y-3">
                          {activeInquiry.driverInquiries?.length ? (
                            activeInquiry.driverInquiries.map((entry, index) => {
                              const driver = resolveDriverFromInquiry(entry);
                              const withdrawnAt = (
                                entry as PriceInquiryDriverEntry & {
                                  withdrawnAt?: string | null;
                                }
                              ).withdrawnAt;

                              return (
                                <div
                                  key={`${driver?._id || 'driver'}-${index}`}
                                  className="rounded-2xl border border-border bg-surface p-4"
                                >
                                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-3">
                                        <p className="text-lg font-semibold text-white">
                                          {driver?.fullName ||
                                            driver?.name ||
                                            'Fahrer'}
                                        </p>

                                        <span
                                          className={`rounded-full border px-3 py-1 text-xs font-medium ${getDriverEntryStatusClass(
                                            entry.status
                                          )}`}
                                        >
                                          {getDriverEntryStatusLabel(
                                            entry.status
                                          )}
                                        </span>
                                      </div>

                                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <InfoCard
                                          label="Unternehmerpreis"
                                          value={
                                            typeof entry.responsePrice === 'number'
                                              ? formatMoney(entry.responsePrice)
                                              : '—'
                                          }
                                        />
                                        <InfoCard
                                          label="Verfügbarkeit"
                                          value={getAvailabilityLabel(
                                            entry.responseAvailability
                                          )}
                                        />
                                        <InfoCard
                                          label="Kommentar"
                                          value={
                                            entry.responseComment ||
                                            'Kein Kommentar'
                                          }
                                        />
                                        <InfoCard
                                          label="Zurückgezogen"
                                          value={formatDate(withdrawnAt)}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted">
                              Noch keine Fahrer in dieser Preisabfrage.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-2xl border border-dashed border-border bg-background p-5">
                        <p className="text-sm text-muted">
                          Aktuell gibt es keine offene Preisabfrage für diesen
                          Auftrag.
                        </p>
                      </div>
                    )}

                    <div className="mt-8 rounded-2xl border border-border bg-background p-5">
                      <h4 className="text-lg font-semibold text-white">
                        Neue Preisabfrage starten
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Mehrere Fahrer gleichzeitig auswählen, Unternehmerpreis
                        automatisch mit 80% vom Kundenpreis vorbelegen und vor
                        dem Senden anpassen.
                      </p>

                      <div className="mt-5 grid gap-4">
                        <input
                          value={inquiryTitle}
                          onChange={(e) => setInquiryTitle(e.target.value)}
                          placeholder="Titel der Preisabfrage"
                          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
                        />

                        <textarea
                          value={inquiryDescription}
                          onChange={(e) => setInquiryDescription(e.target.value)}
                          placeholder="Beschreibung für Fahrer"
                          rows={4}
                          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
                        />

                        <textarea
                          value={inquiryAdminNote}
                          onChange={(e) => setInquiryAdminNote(e.target.value)}
                          placeholder="Interne Admin-Notiz"
                          rows={3}
                          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
                        />

                        <div className="grid gap-4 md:grid-cols-3">
                          <SummaryCard
                            label="Kundenpreis"
                            value={formatMoney(pricing.customerPrice)}
                          />
                          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                              Auto Unternehmerpreis 80%
                            </p>
                            <p className="mt-3 text-xl font-semibold text-white">
                              {formatMoney(autoCalculatedDriverPrice)}
                            </p>
                            <button
                              type="button"
                              onClick={handleUseAuto80Percent}
                              className="mt-4 rounded-xl border border-accent/25 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/10"
                            >
                              80% übernehmen
                            </button>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-muted">
                              Unternehmerpreis-Vorgabe (€)
                            </label>
                            <input
                              value={proposedDriverPriceInput}
                              onChange={(e) =>
                                setProposedDriverPriceInput(e.target.value)
                              }
                              placeholder="z. B. 2000"
                              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
                            />
                            <p className="mt-2 text-xs leading-6 text-muted">
                              Automatisch mit 80% vom Kundenpreis vorbelegt und
                              frei anpassbar.
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-muted">
                            Ablaufzeit optional
                          </label>
                          <input
                            type="datetime-local"
                            value={inquiryExpiresAt}
                            onChange={(e) => setInquiryExpiresAt(e.target.value)}
                            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none"
                          />
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-medium text-white">
                            Fahrer auswählen
                          </p>

                          <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
                            <input
                              type="checkbox"
                              checked={allDriversSelected}
                              onChange={handleToggleAllDrivers}
                            />
                            <span>Alle Fahrer auswählen / abwählen</span>
                          </label>
                        </div>

                        <p className="mt-3 text-xs text-muted">
                          Ausgewählt: {selectedDriverCount} von{' '}
                          {availableDrivers.length}
                        </p>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {availableDrivers.length === 0 ? (
                            <p className="text-sm text-muted">
                              Keine verfügbaren Fahrer gefunden.
                            </p>
                          ) : (
                            availableDrivers.map((driver) => {
                              const checked = selectedDriverIds.includes(
                                driver._id
                              );

                              return (
                                <label
                                  key={driver._id}
                                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition ${
                                    checked
                                      ? 'border-accent/30 bg-accent/10'
                                      : 'border-border bg-surface hover:bg-white/5'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      handleToggleDriverSelection(driver._id)
                                    }
                                    className="mt-1"
                                  />

                                  <div>
                                    <p className="font-medium text-white">
                                      {driver.fullName ||
                                        driver.name ||
                                        'Fahrer'}
                                    </p>
                                    <p className="mt-1 text-xs text-muted">
                                      {driver.email || '—'}
                                    </p>
                                    <p className="mt-1 text-xs text-muted">
                                      {driver.phone || '—'}
                                    </p>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateInquiry}
                        disabled={creatingInquiry}
                        className="mt-6 rounded-2xl bg-accent px-5 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-60"
                      >
                        {creatingInquiry
                          ? 'Preisabfrage wird erstellt…'
                          : 'Preisabfrage an Fahrer senden'}
                      </button>
                    </div>

                    {sortedInquiries.length > 0 ? (
                      <div className="mt-8">
                        <h4 className="text-lg font-semibold text-white">
                          Bisherige Preisabfragen
                        </h4>

                        <div className="mt-4 space-y-3">
                          {sortedInquiries.map((item) => {
                            const itemWithdrawnCount = item.driverInquiries.filter(
                              (entry) => entry.status === 'withdrawn'
                            ).length;

                            return (
                              <div
                                key={item._id}
                                className="rounded-2xl border border-border bg-background p-4"
                              >
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <span
                                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getInquiryStatusClass(
                                          item.status
                                        )}`}
                                      >
                                        {getInquiryStatusLabel(item.status)}
                                      </span>

                                      <span className="text-xs text-muted">
                                        {item.referenceNumber || item._id}
                                      </span>

                                      {resolvePriceInquiryId(
                                        request.priceInquiryId
                                      ) === item._id ? (
                                        <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                                          Verknüpft
                                        </span>
                                      ) : null}
                                    </div>

                                    <p className="mt-3 font-medium text-white">
                                      {item.title || 'Preisabfrage'}
                                    </p>
                                    <p className="mt-1 text-sm text-muted">
                                      Fahrer: {item.stats?.totalDrivers ?? 0} ·
                                      Antworten: {item.stats?.answeredCount ?? 0}{' '}
                                      · Zurückgezogen: {itemWithdrawnCount} ·
                                      Erstellt: {formatDate(item.createdAt)}
                                    </p>
                                    <p className="mt-1 text-sm text-muted">
                                      Unternehmerpreis-Vorgabe:{' '}
                                      {formatMoney(
                                        item.proposedDriverPrice ??
                                          item.autoCalculatedDriverPrice
                                      )}
                                    </p>
                                  </div>

                                  <Link
                                    href={`/price-inquiries/${item._id}`}
                                    className="rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-white/5"
                                  >
                                    Öffnen
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-3xl border border-border bg-surface p-6 shadow-premium xl:p-7">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-accent">
                          Kommunikation
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">
                          Nachrichten an Kunde und Fahrer
                        </h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                          Aus dem Support-Panel direkt Nachrichten schreiben.
                          Das Backend speichert den Verlauf pro Auftrag und löst
                          beim Senden Push sowie E-Mail nach vorhandener
                          Konfiguration aus.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-border bg-background p-5">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm text-muted">
                            Empfänger
                          </label>
                          <select
                            value={messageRecipient}
                            onChange={(e) =>
                              setMessageRecipient(
                                e.target.value as RequestMessageRecipient
                              )
                            }
                            className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
                          >
                            <option value="customer" disabled={!canMessageCustomer}>
                              Kunde
                            </option>
                            <option value="driver" disabled={!canMessageDriver}>
                              Fahrer
                            </option>
                            <option value="both" disabled={!canMessageBoth}>
                              Kunde + Fahrer
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-muted">
                            Betreff
                          </label>
                          <input
                            value={messageSubject}
                            onChange={(e) => setMessageSubject(e.target.value)}
                            placeholder="Betreff eingeben"
                            className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm text-muted">
                          Nachricht
                        </label>
                        <textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          rows={6}
                          placeholder="Nachricht an Kunde oder Fahrer schreiben…"
                          className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
                        />
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm text-muted">
                          Interne Notiz optional
                        </label>
                        <textarea
                          value={messageInternalNote}
                          onChange={(e) => setMessageInternalNote(e.target.value)}
                          rows={3}
                          placeholder="Optional nur intern speichern"
                          className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
                        />
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <SummaryCard
                          label="Kunde"
                          value={request.userId?.email || customerDisplayName || '—'}
                          hint={
                            canMessageCustomer
                              ? 'Versand möglich'
                              : 'Kein Empfänger'
                          }
                        />
                        <SummaryCard
                          label="Fahrer"
                          value={
                            request.assignedDriverId?.email ||
                            request.assignedDriverId?.fullName ||
                            request.assignedDriverId?.name ||
                            '—'
                          }
                          hint={
                            canMessageDriver
                              ? 'Versand möglich'
                              : 'Nicht zugewiesen'
                          }
                        />
                        <SummaryCard
                          label="Ziel"
                          value={getRecipientLabel(messageRecipient)}
                          hint="Bei Kunde + Fahrer werden zwei Nachrichten gespeichert"
                          emphasis="gold"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={
                          sendingMessage ||
                          !messageSubject.trim() ||
                          !messageText.trim()
                        }
                        className="mt-6 rounded-2xl bg-accent px-5 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-60"
                      >
                        {sendingMessage
                          ? 'Nachricht wird gesendet…'
                          : 'Nachricht senden'}
                      </button>
                    </div>

                    <div className="mt-8">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-lg font-semibold text-white">
                          Nachrichtenverlauf
                        </h4>
                        <button
                          type="button"
                          onClick={loadMessages}
                          disabled={messagesLoading}
                          className="rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-white/5 disabled:opacity-60"
                        >
                          {messagesLoading ? 'Lädt…' : 'Aktualisieren'}
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {sortedMessages.length ? (
                          sortedMessages.map((message) => (
                            <div
                              key={message._id}
                              className="rounded-2xl border border-border bg-background p-4"
                            >
                              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getMessageSenderTone(
                                        message.senderRole
                                      )}`}
                                    >
                                      {getMessageDirectionLabel(message)}
                                    </span>

                                    <span
                                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getMessageTargetTone(
                                        message.targetType
                                      )}`}
                                    >
                                      {getMessageTargetLabel(message)}
                                    </span>

                                    <span
                                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getMessageRecipientTone(
                                        message.targetType === 'driver'
                                          ? 'driver'
                                          : 'customer'
                                      )}`}
                                    >
                                      {message.channel === 'system'
                                        ? 'Systemnachricht'
                                        : 'Portalnachricht'}
                                    </span>
                                  </div>

                                  <p className="mt-4 text-base font-semibold text-white">
                                    {message.subject || 'Ohne Betreff'}
                                  </p>

                                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                                    {message.text || '—'}
                                  </p>

                                  {message.internalNote ? (
                                    <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3">
                                      <p className="text-xs uppercase tracking-[0.18em] text-muted">
                                        Interne Notiz
                                      </p>
                                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                                        {message.internalNote}
                                      </p>
                                    </div>
                                  ) : null}

                                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
                                    <span>
                                      Erstellt: {formatDate(message.createdAt)}
                                    </span>
                                    <span>
                                      Von:{' '}
                                      {message.senderName ||
                                        getMessageDirectionLabel(message)}
                                    </span>
                                    {message.recipientName ? (
                                      <span>An: {message.recipientName}</span>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="grid min-w-[260px] gap-2">
                                  <div className="rounded-2xl border border-border bg-surface px-3 py-2 text-xs">
                                    <span className="text-muted">Push:</span>{' '}
                                    <span className="text-slate-100">
                                      {message.notification?.pushSent
                                        ? `gesendet${
                                            message.notification.pushSentAt
                                              ? ` · ${formatDate(
                                                  message.notification.pushSentAt
                                                )}`
                                              : ''
                                          }`
                                        : message.notification?.pushError ||
                                          'nicht gesendet'}
                                    </span>
                                  </div>

                                  <div className="rounded-2xl border border-border bg-surface px-3 py-2 text-xs">
                                    <span className="text-muted">E-Mail:</span>{' '}
                                    <span className="text-slate-100">
                                      {message.notification?.mailSent
                                        ? `gesendet${
                                            message.notification.mailSentAt
                                              ? ` · ${formatDate(
                                                  message.notification.mailSentAt
                                                )}`
                                              : ''
                                          }`
                                        : message.notification?.mailError ||
                                          'nicht gesendet'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border bg-background p-5">
                            <p className="text-sm text-muted">
                              Für diesen Auftrag gibt es noch keine gespeicherten
                              Nachrichten.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border bg-surface p-6 shadow-premium xl:p-7">
                    <p className="text-sm uppercase tracking-[0.24em] text-accent">
                      Verlauf
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">
                      Timeline
                    </h3>

                    <div className="mt-6 space-y-4">
                      {request.timeline?.length ? (
                        request.timeline.map((item, index) => (
                          <div
                            key={`${item.changedAt}-${index}`}
                            className="rounded-2xl border border-border bg-background p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <StatusBadge status={item.status} />
                              <span className="text-xs text-muted">
                                {formatDate(item.changedAt)}
                              </span>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-slate-200">
                              {item.note || 'Keine Notiz hinterlegt.'}
                            </p>

                            <p className="mt-2 text-xs text-muted">
                              Bearbeitet von: {item.changedByName || 'System'}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted">
                          Noch keine Timeline-Einträge vorhanden.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <aside className="space-y-8">
                  <StatusUpdateForm
                    requestId={request._id}
                    currentStatus={request.status}
                    onUpdated={loadRequest}
                  />

                  <div className="rounded-3xl border border-border bg-surface p-6 shadow-premium">
                    <h3 className="text-lg font-semibold text-white">
                      Direkte Fahrer-Zuweisung
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      Fahrer kann direkt manuell zugewiesen oder wieder entfernt
                      werden.
                    </p>

                    <div className="mt-5 space-y-4">
                      <div>
                        <label className="mb-2 block text-sm text-muted">
                          Fahrer
                        </label>
                        <select
                          value={manualDriverId}
                          onChange={(e) => setManualDriverId(e.target.value)}
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3"
                        >
                          <option value="">Fahrer auswählen</option>
                          {manualDriverOptions.map((driver) => (
                            <option key={driver._id} value={driver._id}>
                              {driver.fullName || driver.name || 'Fahrer'}
                              {driver.email ? ` · ${driver.email}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm text-muted">
                            Preis / Erlöse (€)
                          </label>
                          <input
                            value={manualSupportPriceInput}
                            onChange={(e) =>
                              setManualSupportPriceInput(e.target.value)
                            }
                            placeholder="z. B. 500"
                            className="w-full rounded-2xl border border-border bg-background px-4 py-3"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-muted">
                            Unternehmerpreis (€)
                          </label>
                          <input
                            value={manualEntrepreneurPriceInput}
                            onChange={(e) =>
                              setManualEntrepreneurPriceInput(e.target.value)
                            }
                            placeholder="z. B. 2000"
                            className="w-full rounded-2xl border border-border bg-background px-4 py-3"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-muted">
                          Interne Notiz
                        </label>
                        <textarea
                          value={manualAssignNote}
                          onChange={(e) => setManualAssignNote(e.target.value)}
                          rows={4}
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3"
                          placeholder="Optionaler Hinweis zur Fahrerzuweisung"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAssignDriver}
                        disabled={assigningDriver || !manualDriverId}
                        className="w-full rounded-2xl bg-accent px-5 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-60"
                      >
                        {assigningDriver
                          ? 'Fahrer wird zugewiesen…'
                          : 'Fahrer direkt zuweisen'}
                      </button>

                      <button
                        type="button"
                        onClick={handleUnassignDriver}
                        disabled={
                          unassigningDriver || !request.assignedDriverId?._id
                        }
                        className="w-full rounded-2xl border border-border px-5 py-3 transition hover:bg-white/5 disabled:opacity-60"
                      >
                        {unassigningDriver
                          ? 'Zuweisung wird entfernt…'
                          : request.driverAssignedViaInquiry
                            ? 'Fahrerzuweisung zurückziehen'
                            : 'Fahrer-Zuweisung entfernen'}
                      </button>

                      {request.driverAssignedViaInquiry && linkedInquiry?._id ? (
                        <Link
                          href={`/price-inquiries/${linkedInquiry._id}`}
                          className="block w-full rounded-2xl border border-accent/25 bg-accent/10 px-5 py-3 text-center text-sm font-semibold text-accent transition hover:bg-accent/15"
                        >
                          Verknüpfte Preisabfrage öffnen
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border bg-surface p-6 shadow-premium">
                    <h3 className="text-lg font-semibold text-white">
                      Aktueller Fahrerstatus
                    </h3>

                    <div className="mt-5 grid gap-3">
                      <InfoCard
                        label="Zugewiesener Fahrer"
                        value={
                          request.assignedDriverId?.fullName ||
                          request.assignedDriverId?.name ||
                          [
                            request.assignedDriverId?.firstName,
                            request.assignedDriverId?.lastName,
                          ]
                            .filter(Boolean)
                            .join(' ') ||
                          '—'
                        }
                      />
                      <InfoCard
                        label="Fahrerstatus"
                        value={request.driverStatus || '—'}
                      />
                      <InfoCard
                        label="Zugewiesen am"
                        value={formatDate(request.assignedDriverAt)}
                      />
                      <InfoCard
                        label="Unternehmerpreis"
                        value={formatMoney(pricing.entrepreneurPrice)}
                      />
                      <InfoCard
                        label="Preis / Erlöse"
                        value={formatMoney(pricing.supportPrice)}
                      />
                      <InfoCard
                        label="Zuweisungsquelle"
                        value={
                          request.driverAssignedViaInquiry
                            ? 'Preisabfrage'
                            : request.assignedDriverId?._id
                              ? 'Direkte Zuweisung'
                              : 'Keine aktive Zuweisung'
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border bg-surface p-6 shadow-premium">
                    <h3 className="text-lg font-semibold text-white">
                      Metadaten
                    </h3>

                    <div className="mt-5 grid gap-3">
                      <InfoCard
                        label="Erstellt"
                        value={formatDate(request.createdAt)}
                      />
                      <InfoCard
                        label="Aktualisiert"
                        value={formatDate(request.updatedAt)}
                      />
                      <InfoCard label="Request ID" value={request._id} />
                      {request.referenceNumber ? (
                        <InfoCard
                          label="Referenz"
                          value={request.referenceNumber}
                        />
                      ) : null}
                      {request.priceInquiryId ? (
                        <InfoCard
                          label="Verknüpfte Preisabfrage-ID"
                          value={
                            resolvePriceInquiryId(request.priceInquiryId) ||
                            String(request.priceInquiryId)
                          }
                        />
                      ) : null}
                    </div>

                    {linkedInquiry?._id ? (
                      <Link
                        href={`/price-inquiries/${linkedInquiry._id}`}
                        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-white/5"
                      >
                        Verknüpfte Preisabfrage öffnen
                      </Link>
                    ) : null}
                  </div>

                  <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 shadow-premium">
                    <h3 className="text-lg font-semibold text-rose-200">
                      Auftrag löschen
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-rose-200/80">
                      Diese Aktion archiviert den Auftrag intern und blendet ihn
                      aus den Apps aus.
                    </p>

                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="mt-5 w-full rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-60"
                    >
                      {isDeleting
                        ? 'Auftrag wird gelöscht…'
                        : 'Auftrag archivieren / löschen'}
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
