import {
  AuthResponse,
  Driver,
  DriverAttachment,
  DriverMutationResponse,
  DriverPayload,
  PasswordActionResponse,
  PriceInquiryDriverEntry,
  PriceInquiryItem,
  RequestItem,
  RequestMessage,
  RequestMessageRecipient,
  RequestStatus,
  SendRequestMessagePayload,
  SendRequestMessageResponse,
  StaffPayload,
  StatsOverview,
  User,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type RawRequestActor = {
  _id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: User['role'];
  customerType?: 'private' | 'business' | string;
  userType?: 'private' | 'business' | string;
  accountType?: 'private' | 'business' | string;
  businessCustomer?: boolean;
  isBusinessCustomer?: boolean;
};

type RawStatusHistoryEntry = {
  status: RequestStatus;
  note?: string;
  changedAt?: string;
  changedBy?: {
    fullName?: string;
    name?: string;
  } | null;
};

type RawRequestMessage = {
  _id: string;
  requestId?: string;
  senderId?: RawRequestActor | null;
  senderRole?: User['role'] | 'system';
  senderName?: string;
  recipientId?: RawRequestActor | null;
  recipientRole?: User['role'];
  recipientName?: string;
  targetType: 'customer' | 'driver';
  subject?: string;
  text: string;
  internalNote?: string;
  channel?: 'portal' | 'system';
  notification?: {
    pushSent?: boolean;
    pushSentAt?: string | null;
    pushError?: string;
    mailSent?: boolean;
    mailSentAt?: string | null;
    mailError?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

type RawRequest = {
  _id: string;
  referenceNumber?: string;
  title?: string;
  description?: string;
  category?: string;
  signal?: RequestItem['signal'];
  status?: RequestItem['status'];
  pickupLocation?: string;
  pickupAddress?: string;
  destination?: string;
  dropoffAddress?: string;
  scheduledAt?: string | null;
  notes?: string;
  attachments?: DriverAttachment[];
  attachmentsCount?: number;
  createdAt?: string;
  updatedAt?: string;

  customerType?: 'private' | 'business' | string;
  userType?: 'private' | 'business' | string;
  accountType?: 'private' | 'business' | string;
  businessCustomer?: boolean;
  isBusinessCustomer?: boolean;

  userId?: RawRequestActor;
  assignedDriverId?: RequestItem['assignedDriverId'] | unknown;
  assignedDriverAt?: string | null;
  assignedDriverBy?: RequestItem['assignedDriverBy'] | unknown;
  driverStatus?: string;
  driverStatusUpdatedAt?: string | null;
  driverNote?: string;

  clientBudgetAmount?: number | null;
  clientBudgetCurrency?: string;
  budgetAmount?: number | null;
  budgetCurrency?: string;

  customerPriceNet?: number | null;
  customerPriceGross?: number | null;
  customerPriceCurrency?: string;

  finalPriceNet?: number | null;
  finalPriceGross?: number | null;
  finalPriceCurrency?: string;

  approvedPriceNet?: number | null;
  approvedPriceGross?: number | null;

  priceNet?: number | null;
  priceGross?: number | null;
  priceCurrency?: string;

  netPrice?: number | null;
  grossPrice?: number | null;

  offeredPriceNet?: number | null;
  offeredPriceGross?: number | null;

  calculatedNetPrice?: number | null;
  calculatedGrossPrice?: number | null;

  currency?: string;

  clientEditApproved?: boolean;
  clientEditApprovedAt?: string | null;
  clientEditApprovedBy?: RequestItem['clientEditApprovedBy'] | unknown;
  priceInquiryId?: unknown;
  agreedDriverPrice?: number | null;
  supportPriceAmount?: number | null;
  agreedPriceCurrency?: string;
  driverAssignedViaInquiry?: boolean;
  statusHistory?: RawStatusHistoryEntry[];
};

type RawPriceInquiryDriverEntry = {
  driverId?:
    | string
    | {
        _id: string;
        fullName?: string;
        name?: string;
        email?: string;
        phone?: string;
        role?: string;
        customerType?: 'private' | 'business' | string;
      }
    | null;
  status?:
    | 'pending'
    | 'viewed'
    | 'answered'
    | 'declined'
    | 'expired'
    | 'withdrawn';
  viewedAt?: string | null;
  notification?: {
    pushSent?: boolean;
    pushSentAt?: string | null;
    pushError?: string;
    mailSent?: boolean;
    mailSentAt?: string | null;
    mailError?: string;
  };
  responsePrice?: number | null;
  responseCurrency?: string;
  responseAvailability?: 'available' | 'limited' | 'unavailable';
  responseComment?: string;
  respondedAt?: string | null;
  declinedAt?: string | null;
  withdrawnAt?: string | null;
};

type RawPriceInquiry = {
  _id: string;
  referenceNumber?: string;
  requestId?: RawRequest | string | null;
  createdBy?:
    | string
    | {
        _id: string;
        fullName?: string;
        name?: string;
        email?: string;
        role?: string;
        customerType?: 'private' | 'business' | string;
      };
  title?: string;
  description?: string;
  adminNote?: string;
  status?: 'open' | 'assigned' | 'closed' | 'expired';
  expiresAt?: string | null;
  closedAt?: string | null;
  closedBy?: unknown;
  selectedDriverId?: unknown;
  selectedDriverAt?: string | null;
  selectedDriverBy?: unknown;
  selectedPrice?: number | null;
  selectedCurrency?: string;
  proposedDriverPrice?: number | null;
  proposedDriverCurrency?: string;
  autoCalculatedDriverPrice?: number | null;
  driverInquiries?: RawPriceInquiryDriverEntry[];
  eventLog?: Array<{
    type?: string;
    message?: string;
    actorId?: unknown;
    driverId?: unknown;
    createdAt?: string;
  }>;
  stats?: {
    totalDrivers?: number;
    answeredCount?: number;
    declinedCount?: number;
    pendingCount?: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

type ApiErrorPayload = {
  message?: string;
  error?: string;
};

type ApiRequestError = Error & {
  status?: number;
  data?: ApiErrorPayload | Record<string, unknown>;
};

type RequestMutationPayload = Partial<{
  title: string;
  description: string;
  category: string;
  signal: RequestItem['signal'];
  pickupLocation: string;
  destination: string;
  scheduledAt: string | null;
  notes: string;
  attachments: DriverAttachment[];
  budgetAmount: number | string;
  budgetCurrency: 'EUR';
  clientBudgetAmount: number | string;
  clientBudgetCurrency: 'EUR';
  customerPriceNet: number | string | null;
  customerPriceGross: number | string | null;
  customerPriceCurrency: 'EUR';
  supportPriceAmount: number | string | null;
  supportPriceCurrency: 'EUR';
  agreedDriverPrice: number | string | null;
  agreedPriceCurrency: 'EUR';
}>;

const defaultStats: StatsOverview = {
  total: 0,
  received: 0,
  accepted: 0,
  inProgress: 0,
  done: 0,
  urgent: 0,
};

const DRIVER_ROUTE_CANDIDATES = ['/drivers', '/auth/drivers'];

const forceEur = (): 'EUR' => 'EUR';

function toUserRole(
  role?: string
): 'user' | 'admin' | 'support' | 'driver' | undefined {
  if (
    role === 'user' ||
    role === 'admin' ||
    role === 'support' ||
    role === 'driver'
  ) {
    return role;
  }

  return undefined;
}

function safeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof Error;
}

function shouldTryNextDriverRoute(error: unknown): boolean {
  if (!isApiRequestError(error)) return false;

  const status = error.status;
  const message = String(error.message || '').toLowerCase();

  return (
    status === 404 ||
    message.includes('route nicht gefunden') ||
    message.includes('not found')
  );
}

function mapActor(actor?: RawRequestActor | null) {
  if (!actor) return null;

  return {
    _id: actor._id,
    fullName: actor.fullName,
    name: actor.name,
    email: actor.email,
    phone: actor.phone,
    role: toUserRole(actor.role),
    customerType: actor.customerType === 'business' ? 'business' : 'private',
  };
}

function mapRequestMessage(item: RawRequestMessage): RequestMessage {
  return {
    _id: item._id,
    requestId: item.requestId,
    senderId: mapActor(item.senderId),
    senderRole: item.senderRole,
    senderName: item.senderName,
    recipientId: mapActor(item.recipientId),
    recipientRole: item.recipientRole,
    recipientName: item.recipientName,
    targetType: item.targetType,
    subject: item.subject || '',
    text: item.text || '',
    internalNote: item.internalNote || '',
    channel: item.channel || 'portal',
    notification: item.notification
      ? {
          pushSent: Boolean(item.notification.pushSent),
          pushSentAt: item.notification.pushSentAt || null,
          pushError: item.notification.pushError || '',
          mailSent: Boolean(item.notification.mailSent),
          mailSentAt: item.notification.mailSentAt || null,
          mailError: item.notification.mailError || '',
        }
      : undefined,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

function mapPriceInquiryDriverId(
  driverId: RawPriceInquiryDriverEntry['driverId']
): PriceInquiryDriverEntry['driverId'] {
  if (!driverId) {
    return null;
  }

  if (typeof driverId === 'string') {
    return driverId;
  }

  return {
    _id: driverId._id,
    fullName: driverId.fullName,
    name: driverId.name,
    email: driverId.email,
    phone: driverId.phone,
    role: toUserRole(driverId.role),
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      (data as ApiErrorPayload)?.message ||
        (data as ApiErrorPayload)?.error ||
        'API request failed'
    ) as ApiRequestError;
    error.status = response.status;
    error.data = data as ApiErrorPayload;
    throw error;
  }

  return data as T;
}

async function requestDriverRoute<T>(
  suffix: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  let lastError: unknown = null;

  for (let index = 0; index < DRIVER_ROUTE_CANDIDATES.length; index += 1) {
    const basePath = DRIVER_ROUTE_CANDIDATES[index];

    try {
      return await request<T>(`${basePath}${suffix}`, options, token);
    } catch (error) {
      lastError = error;

      const hasMoreCandidates = index < DRIVER_ROUTE_CANDIDATES.length - 1;

      if (!hasMoreCandidates || !shouldTryNextDriverRoute(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Fahrer-Route konnte nicht geladen werden.');
}

function normalizeRequestPayload(
  payload: RequestMutationPayload
): RequestMutationPayload {
  return {
    ...payload,
    budgetCurrency: 'EUR',
    clientBudgetCurrency: 'EUR',
    customerPriceCurrency: 'EUR',
    supportPriceCurrency: 'EUR',
    agreedPriceCurrency: 'EUR',
  };
}

function mapRequest(item: RawRequest): RequestItem {
  const safeStatusHistory = Array.isArray(item.statusHistory)
    ? item.statusHistory
    : [];
  const safeAttachments = Array.isArray(item.attachments)
    ? item.attachments
    : [];

  const customerEnteredPrice = safeNumber(item.clientBudgetAmount);
  const entrepreneurPrice = safeNumber(item.agreedDriverPrice);

  return {
    _id: item._id,
    referenceNumber: item.referenceNumber,
    title: item.title || '',
    description: item.description || '',
    category: item.category,
    signal: item.signal || 'Later',
    status: item.status || 'received',
    pickupLocation: item.pickupLocation,
    pickupAddress: item.pickupAddress,
    destination: item.destination,
    dropoffAddress: item.dropoffAddress,
    scheduledAt: item.scheduledAt || null,
    notes: item.notes,
    attachments: safeAttachments,
    attachmentsCount: item.attachmentsCount,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),

    userId: item.userId
      ? {
          ...item.userId,
          customerType:
            item.userId.customerType === 'business' ? 'business' : 'private',
        }
      : undefined,

    customerType: item.customerType === 'business' ? 'business' : 'private',
    userType: item.userType,
    accountType: item.accountType,
    businessCustomer: item.businessCustomer,
    isBusinessCustomer: item.isBusinessCustomer,

    clientEditApproved: item.clientEditApproved,
    clientEditApprovedAt: item.clientEditApprovedAt || null,
    clientEditApprovedBy: item.clientEditApprovedBy as
      | RequestItem['clientEditApprovedBy']
      | undefined,
    assignedDriverId: item.assignedDriverId as
      | RequestItem['assignedDriverId']
      | undefined,
    assignedDriverAt: item.assignedDriverAt || null,
    assignedDriverBy: item.assignedDriverBy as
      | RequestItem['assignedDriverBy']
      | undefined,
    driverStatus: item.driverStatus,
    driverStatusUpdatedAt: item.driverStatusUpdatedAt || null,
    driverNote: item.driverNote,
    priceInquiryId: item.priceInquiryId,
    driverAssignedViaInquiry: item.driverAssignedViaInquiry,

    clientBudgetAmount: customerEnteredPrice,
    budgetAmount: safeNumber(item.budgetAmount),

    customerPriceNet: safeNumber(item.customerPriceNet),
    customerPriceGross: safeNumber(item.customerPriceGross),
    customerPriceCurrency: forceEur(),

    agreedDriverPrice: entrepreneurPrice,
    finalPriceNet: safeNumber(item.finalPriceNet),
    finalPriceGross: safeNumber(item.finalPriceGross),
    finalPriceCurrency: forceEur(),

    approvedPriceNet: safeNumber(item.approvedPriceNet),
    approvedPriceGross: safeNumber(item.approvedPriceGross),

    priceNet: safeNumber(item.priceNet),
    priceGross: safeNumber(item.priceGross),
    priceCurrency: forceEur(),

    netPrice: safeNumber(item.netPrice),
    grossPrice: safeNumber(item.grossPrice),

    offeredPriceNet: safeNumber(item.offeredPriceNet),
    offeredPriceGross: safeNumber(item.offeredPriceGross),

    calculatedNetPrice: safeNumber(item.calculatedNetPrice),
    calculatedGrossPrice: safeNumber(item.calculatedGrossPrice),

    currency: forceEur(),
    agreedPriceCurrency: forceEur(),

    entrepreneurPrice,
    adminRevenue:
      customerEnteredPrice != null && entrepreneurPrice != null
        ? Math.max(customerEnteredPrice - entrepreneurPrice, 0)
        : safeNumber(item.supportPriceAmount),

    supportPriceAmount: safeNumber(item.supportPriceAmount),

    statusHistory: safeStatusHistory.map((entry) => ({
      status: entry.status,
      note: entry.note,
      changedAt: entry.changedAt,
      changedBy: entry.changedBy
        ? {
            fullName: entry.changedBy.fullName,
            name: entry.changedBy.name,
          }
        : null,
    })),

    timeline: safeStatusHistory.map((entry) => ({
      status: entry.status,
      note: entry.note || '',
      changedAt: entry.changedAt || new Date().toISOString(),
      changedByName:
        entry.changedBy?.fullName || entry.changedBy?.name || 'System',
    })),
  };
}

function mapDriverInquiryEntry(
  entry: RawPriceInquiryDriverEntry
): PriceInquiryDriverEntry {
  return {
    driverId: mapPriceInquiryDriverId(entry.driverId),
    status: entry.status || 'pending',
    viewedAt: entry.viewedAt || null,
    notification: entry.notification
      ? {
          pushSent: Boolean(entry.notification.pushSent),
          pushSentAt: entry.notification.pushSentAt || null,
          pushError: entry.notification.pushError || '',
          mailSent: Boolean(entry.notification.mailSent),
          mailSentAt: entry.notification.mailSentAt || null,
          mailError: entry.notification.mailError || '',
        }
      : undefined,
    responsePrice:
      typeof entry.responsePrice === 'number' ? entry.responsePrice : null,
    responseCurrency: forceEur(),
    responseAvailability: entry.responseAvailability,
    responseComment: entry.responseComment || '',
    respondedAt: entry.respondedAt || null,
    declinedAt: entry.declinedAt || null,
    withdrawnAt: entry.withdrawnAt || null,
  };
}

function mapPriceInquiry(item: RawPriceInquiry): PriceInquiryItem {
  return {
    _id: item._id,
    referenceNumber: item.referenceNumber || '',
    requestId:
      item.requestId && typeof item.requestId === 'object'
        ? mapRequest(item.requestId)
        : item.requestId || null,
    createdBy: item.createdBy || null,
    title: item.title || '',
    description: item.description || '',
    adminNote: item.adminNote || '',
    status: item.status || 'open',
    expiresAt: item.expiresAt || null,
    closedAt: item.closedAt || null,
    closedBy: item.closedBy,
    selectedDriverId: item.selectedDriverId,
    selectedDriverAt: item.selectedDriverAt || null,
    selectedDriverBy: item.selectedDriverBy,
    selectedPrice:
      typeof item.selectedPrice === 'number' ? item.selectedPrice : null,
    selectedCurrency: forceEur(),
    proposedDriverPrice: safeNumber(item.proposedDriverPrice),
    proposedDriverCurrency: forceEur(),
    autoCalculatedDriverPrice: safeNumber(item.autoCalculatedDriverPrice),
    driverInquiries: Array.isArray(item.driverInquiries)
      ? item.driverInquiries.map(mapDriverInquiryEntry)
      : [],
    eventLog: Array.isArray(item.eventLog)
      ? item.eventLog.map((entry) => ({
          type: entry.type || '',
          message: entry.message || '',
          actorId: entry.actorId,
          driverId: entry.driverId,
          createdAt: entry.createdAt || new Date().toISOString(),
        }))
      : [],
    stats: {
      totalDrivers: Number(
        item.stats?.totalDrivers ?? item.driverInquiries?.length ?? 0
      ),
      answeredCount: Number(item.stats?.answeredCount ?? 0),
      declinedCount: Number(item.stats?.declinedCount ?? 0),
      pendingCount: Number(item.stats?.pendingCount ?? 0),
    },
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const data = await request<
    | AuthResponse
    | {
        token: string;
        user: User;
      }
    | (User & { token: string })
  >('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if ('user' in data && data.user && 'token' in data) {
    return {
      token: data.token,
      user: data.user,
    };
  }

  if ('token' in data && 'email' in data) {
    const {
      token,
      _id,
      fullName,
      name,
      phone,
      email: resolvedEmail,
      role,
      customerType,
      expoPushToken,
      isActive,
      passwordSetupRequired,
      invitedAt,
      passwordSetAt,
      createdAt,
      updatedAt,
    } = data as User & { token: string };

    return {
      token,
      user: {
        _id,
        fullName,
        name,
        email: resolvedEmail,
        phone,
        role,
        customerType,
        expoPushToken,
        isActive,
        passwordSetupRequired,
        invitedAt,
        passwordSetAt,
        createdAt,
        updatedAt,
      },
    };
  }

  throw new Error('Ungültige Login-Antwort vom Server.');
}

export async function forgotPassword(email: string): Promise<{
  success?: boolean;
  message?: string;
}> {
  return request<{ success?: boolean; message?: string }>(
    '/auth/forgot-password',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    }
  );
}

export async function resetPassword(
  token: string,
  password: string
): Promise<{
  success?: boolean;
  message?: string;
}> {
  return request<{ success?: boolean; message?: string }>(
    '/auth/reset-password',
    {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }
  );
}

export async function getMe(token: string): Promise<User> {
  const data = await request<{ success?: boolean; user?: User }>(
    '/auth/me',
    { method: 'GET' },
    token
  );

  if (!data.user) {
    throw new Error('Benutzerdaten konnten nicht geladen werden.');
  }

  return data.user;
}

export async function getStats(
  token: string
): Promise<{ stats: StatsOverview; latestRequests: RequestItem[] }> {
  const data = await request<{
    success?: boolean;
    stats?: Partial<StatsOverview> & {
      waitingForClient?: number;
      canceled?: number;
      rejected?: number;
    };
    latestRequests?: RawRequest[];
    requests?: RawRequest[];
  }>('/requests/stats/overview', { method: 'GET' }, token);

  const safeStats: StatsOverview = {
    total: Number(data?.stats?.total ?? 0),
    received: Number(data?.stats?.received ?? 0),
    accepted: Number(data?.stats?.accepted ?? 0),
    inProgress: Number(data?.stats?.inProgress ?? 0),
    done: Number(data?.stats?.done ?? 0),
    urgent: Number(data?.stats?.urgent ?? 0),
  };

  const rawLatestRequests = Array.isArray(data?.latestRequests)
    ? data.latestRequests
    : Array.isArray(data?.requests)
      ? data.requests
      : [];

  return {
    stats: { ...defaultStats, ...safeStats },
    latestRequests: rawLatestRequests.map(mapRequest),
  };
}

export async function getRequests(
  token: string,
  query?: Record<string, string>
): Promise<RequestItem[]> {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';

  const data = await request<{ success?: boolean; requests?: RawRequest[] }>(
    `/requests${qs}`,
    { method: 'GET' },
    token
  );

  const safeRequests = Array.isArray(data?.requests) ? data.requests : [];
  return safeRequests.map(mapRequest);
}

export async function getRequestById(
  token: string,
  id: string
): Promise<RequestItem> {
  const data = await request<{ success?: boolean; request?: RawRequest }>(
    `/requests/${id}`,
    { method: 'GET' },
    token
  );

  if (!data.request) {
    throw new Error('Anfrage konnte nicht geladen werden.');
  }

  return mapRequest(data.request);
}

export async function getRequestMessages(
  token: string,
  id: string
): Promise<RequestMessage[]> {
  const data = await request<{
    success?: boolean;
    messages?: RawRequestMessage[];
    items?: RawRequestMessage[];
  }>(`/requests/${id}/messages`, { method: 'GET' }, token);

  const resolved = Array.isArray(data.messages)
    ? data.messages
    : Array.isArray(data.items)
      ? data.items
      : [];

  return resolved.map(mapRequestMessage);
}

export async function sendRequestMessage(
  token: string,
  id: string,
  payload: SendRequestMessagePayload
): Promise<SendRequestMessageResponse> {
  const targetTypes: Array<'customer' | 'driver'> =
    payload.recipient === 'both'
      ? ['customer', 'driver']
      : [payload.recipient as Exclude<RequestMessageRecipient, 'both'>];

  const records: RequestMessage[] = [];

  for (const targetType of targetTypes) {
    const data = await request<{
      success?: boolean;
      item?: RawRequestMessage;
      message?: RawRequestMessage;
      record?: RawRequestMessage;
    }>(
      `/requests/${id}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          targetType,
          subject: payload.subject,
          text: payload.text,
          internalNote: payload.internalNote,
        }),
      },
      token
    );

    const resolved = data.item || data.message || data.record;

    if (!resolved) {
      throw new Error('Nachricht konnte nicht gesendet werden.');
    }

    records.push(mapRequestMessage(resolved));
  }

  return {
    message:
      payload.recipient === 'both'
        ? 'Nachrichten an Kunde und Fahrer wurden gesendet.'
        : 'Nachricht wurde gesendet.',
    records,
    record: records[0],
  };
}

export async function createRequest(
  token: string,
  payload: RequestMutationPayload
): Promise<RequestItem> {
  const normalizedPayload = normalizeRequestPayload(payload);

  const data = await request<{ success?: boolean; request?: RawRequest }>(
    '/requests',
    {
      method: 'POST',
      body: JSON.stringify(normalizedPayload),
    },
    token
  );

  if (!data.request) {
    throw new Error('Anfrage konnte nicht erstellt werden.');
  }

  return mapRequest(data.request);
}

export async function updateRequest(
  token: string,
  id: string,
  payload: RequestMutationPayload
): Promise<RequestItem> {
  const normalizedPayload = normalizeRequestPayload(payload);

  const data = await request<{ success?: boolean; request?: RawRequest }>(
    `/requests/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(normalizedPayload),
    },
    token
  );

  if (!data.request) {
    throw new Error('Anfrage konnte nicht aktualisiert werden.');
  }

  return mapRequest(data.request);
}

export async function updateRequestStatus(
  token: string,
  id: string,
  status: RequestStatus,
  note?: string
): Promise<RequestItem> {
  const data = await request<{ success?: boolean; request?: RawRequest }>(
    `/requests/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    },
    token
  );

  if (!data.request) {
    throw new Error('Status konnte nicht aktualisiert werden.');
  }

  return mapRequest(data.request);
}

export async function updateClientEditApproval(
  token: string,
  id: string,
  approved: boolean,
  note?: string
): Promise<RequestItem> {
  const data = await request<{ request?: RawRequest }>(
    `/requests/${id}/client-edit-approval`,
    {
      method: 'PATCH',
      body: JSON.stringify({ approved, note }),
    },
    token
  );

  if (!data.request) {
    throw new Error('Kundenbearbeitung konnte nicht aktualisiert werden.');
  }

  return mapRequest(data.request);
}

export async function assignDriverToRequest(
  token: string,
  id: string,
  driverId: string,
  note?: string,
  supportPriceAmount?: number,
  agreedDriverPrice?: number
): Promise<RequestItem> {
  const data = await request<{ request?: RawRequest }>(
    `/requests/${id}/assign-driver`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        driverId,
        note,
        supportPriceAmount,
        agreedDriverPrice,
      }),
    },
    token
  );

  if (!data.request) {
    throw new Error('Fahrer konnte nicht zugewiesen werden.');
  }

  return mapRequest(data.request);
}

export async function unassignDriverFromRequest(
  token: string,
  id: string,
  note?: string
): Promise<RequestItem> {
  const data = await request<{ request?: RawRequest }>(
    `/requests/${id}/unassign-driver`,
    {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    },
    token
  );

  if (!data.request) {
    throw new Error('Fahrer-Zuweisung konnte nicht entfernt werden.');
  }

  return mapRequest(data.request);
}

export async function deleteRequest(token: string, id: string): Promise<void> {
  await request<{ success?: boolean; message?: string }>(
    `/requests/${id}`,
    {
      method: 'DELETE',
    },
    token
  );
}

export async function uploadFiles(
  token: string,
  files: File[]
): Promise<DriverAttachment[]> {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  const data = await request<{
    success?: boolean;
    attachments?: DriverAttachment[];
  }>(
    '/uploads',
    {
      method: 'POST',
      body: formData,
    },
    token
  );

  return Array.isArray(data.attachments) ? data.attachments : [];
}

export async function getDrivers(token: string): Promise<Driver[]> {
  const data = await requestDriverRoute<{ users?: Driver[]; drivers?: Driver[] }>(
    '',
    { method: 'GET' },
    token
  );

  if (Array.isArray(data.drivers)) return data.drivers;
  if (Array.isArray(data.users)) return data.users;
  return [];
}

export async function getAvailableDrivers(token: string): Promise<Driver[]> {
  const data = await request<{ drivers?: Driver[] }>(
    '/requests/drivers/available',
    { method: 'GET' },
    token
  );

  return Array.isArray(data.drivers) ? data.drivers : [];
}

export async function getDriverById(token: string, id: string): Promise<Driver> {
  const data = await requestDriverRoute<{ user?: Driver; driver?: Driver }>(
    `/${id}`,
    { method: 'GET' },
    token
  );

  const resolved = data.user || data.driver;

  if (!resolved) {
    throw new Error('Fahrer konnte nicht geladen werden.');
  }

  return resolved;
}

export async function createDriver(
  token: string,
  payload: DriverPayload
): Promise<DriverMutationResponse> {
  return requestDriverRoute<DriverMutationResponse>(
    '',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token
  );
}

export async function updateDriver(
  token: string,
  id: string,
  payload: DriverPayload
): Promise<DriverMutationResponse> {
  return requestDriverRoute<DriverMutationResponse>(
    `/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token
  );
}

export async function deleteDriver(token: string, id: string): Promise<void> {
  await requestDriverRoute<{ success?: boolean; message?: string }>(
    `/${id}`,
    {
      method: 'DELETE',
    },
    token
  );
}

export async function resendDriverSetup(
  token: string,
  id: string
): Promise<PasswordActionResponse> {
  return requestDriverRoute<PasswordActionResponse>(
    `/${id}/resend-setup`,
    {
      method: 'POST',
    },
    token
  );
}

export async function sendDriverPasswordReset(
  token: string,
  id: string
): Promise<PasswordActionResponse> {
  return requestDriverRoute<PasswordActionResponse>(
    `/${id}/send-password-reset`,
    {
      method: 'POST',
    },
    token
  );
}

export async function getStaff(
  token: string,
  query?: Record<string, string>
): Promise<User[]> {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';

  const data = await request<{
    users?: User[];
    staff?: User[];
  }>(`/auth/staff${qs}`, { method: 'GET' }, token);

  if (Array.isArray(data.staff)) return data.staff;
  if (Array.isArray(data.users)) return data.users;
  return [];
}

export async function getStaffById(token: string, id: string): Promise<User> {
  const data = await request<{ user?: User; staff?: User }>(
    `/auth/staff/${id}`,
    { method: 'GET' },
    token
  );

  const resolved = data.user || data.staff;

  if (!resolved) {
    throw new Error('Mitarbeiter konnte nicht geladen werden.');
  }

  return resolved;
}

export async function createStaff(
  token: string,
  payload: StaffPayload
): Promise<User> {
  const data = await request<{ user?: User; staff?: User }>(
    '/auth/staff',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token
  );

  const resolved = data.user || data.staff;

  if (!resolved) {
    throw new Error('Mitarbeiter konnte nicht erstellt werden.');
  }

  return resolved;
}

export async function updateStaff(
  token: string,
  id: string,
  payload: StaffPayload
): Promise<User> {
  const data = await request<{ user?: User; staff?: User }>(
    `/auth/staff/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token
  );

  const resolved = data.user || data.staff;

  if (!resolved) {
    throw new Error('Mitarbeiter konnte nicht aktualisiert werden.');
  }

  return resolved;
}

export async function deleteStaff(token: string, id: string): Promise<void> {
  await request<{ success?: boolean; message?: string }>(
    `/auth/staff/${id}`,
    {
      method: 'DELETE',
    },
    token
  );
}

export async function resendStaffSetup(
  token: string,
  id: string
): Promise<PasswordActionResponse> {
  return request<PasswordActionResponse>(
    `/auth/staff/${id}/resend-setup`,
    {
      method: 'POST',
    },
    token
  );
}

export async function sendStaffPasswordReset(
  token: string,
  id: string
): Promise<PasswordActionResponse> {
  return request<PasswordActionResponse>(
    `/auth/staff/${id}/send-password-reset`,
    {
      method: 'POST',
    },
    token
  );
}

export async function getPriceInquiries(
  token: string,
  query?: Record<string, string>
): Promise<PriceInquiryItem[]> {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';

  const data = await request<{
    priceInquiries?: RawPriceInquiry[];
    inquiries?: RawPriceInquiry[];
  }>(`/price-inquiries${qs}`, { method: 'GET' }, token);

  const safeItems = Array.isArray(data.priceInquiries)
    ? data.priceInquiries
    : Array.isArray(data.inquiries)
      ? data.inquiries
      : [];

  return safeItems.map(mapPriceInquiry);
}

export async function getPriceInquiryById(
  token: string,
  id: string
): Promise<PriceInquiryItem> {
  const data = await request<{
    priceInquiry?: RawPriceInquiry;
    inquiry?: RawPriceInquiry;
  }>(`/price-inquiries/${id}`, { method: 'GET' }, token);

  const resolved = data.priceInquiry || data.inquiry;

  if (!resolved) {
    throw new Error('Preisabfrage konnte nicht geladen werden.');
  }

  return mapPriceInquiry(resolved);
}

export async function createPriceInquiry(
  token: string,
  payload: {
    requestId: string;
    title: string;
    description?: string;
    adminNote?: string;
    driverIds: string[];
    expiresAt?: string | null;
    proposedDriverPrice?: number | null;
    autoCalculatedDriverPrice?: number | null;
    selectAllDrivers?: boolean;
  }
): Promise<PriceInquiryItem> {
  const data = await request<{
    priceInquiry?: RawPriceInquiry;
    inquiry?: RawPriceInquiry;
  }>(
    '/price-inquiries',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token
  );

  const resolved = data.priceInquiry || data.inquiry;

  if (!resolved) {
    throw new Error('Preisabfrage konnte nicht erstellt werden.');
  }

  return mapPriceInquiry(resolved);
}

export async function closePriceInquiry(
  token: string,
  id: string
): Promise<PriceInquiryItem> {
  const data = await request<{
    priceInquiry?: RawPriceInquiry;
    inquiry?: RawPriceInquiry;
  }>(
    `/price-inquiries/${id}/close`,
    {
      method: 'PATCH',
    },
    token
  );

  const resolved = data.priceInquiry || data.inquiry;

  if (!resolved) {
    throw new Error('Preisabfrage konnte nicht geschlossen werden.');
  }

  return mapPriceInquiry(resolved);
}

export async function selectDriverForPriceInquiry(
  token: string,
  id: string,
  driverId: string
): Promise<PriceInquiryItem> {
  const data = await request<{
    priceInquiry?: RawPriceInquiry;
    inquiry?: RawPriceInquiry;
  }>(
    `/price-inquiries/${id}/select-driver`,
    {
      method: 'PATCH',
      body: JSON.stringify({ driverId }),
    },
    token
  );

  const resolved = data.priceInquiry || data.inquiry;

  if (!resolved) {
    throw new Error('Fahrer konnte nicht ausgewählt werden.');
  }

  return mapPriceInquiry(resolved);
}

export async function unselectDriverForPriceInquiry(
  token: string,
  id: string,
  note?: string
): Promise<PriceInquiryItem> {
  const data = await request<{
    priceInquiry?: RawPriceInquiry;
    inquiry?: RawPriceInquiry;
  }>(
    `/price-inquiries/${id}/unselect-driver`,
    {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    },
    token
  );

  const resolved = data.priceInquiry || data.inquiry;

  if (!resolved) {
    throw new Error('Ausgewählter Fahrer konnte nicht zurückgezogen werden.');
  }

  return mapPriceInquiry(resolved);
}

export async function withdrawDriverFromPriceInquiry(
  token: string,
  id: string,
  driverId: string,
  note?: string
): Promise<PriceInquiryItem> {
  const data = await request<{
    priceInquiry?: RawPriceInquiry;
    inquiry?: RawPriceInquiry;
  }>(
    `/price-inquiries/${id}/withdraw-driver`,
    {
      method: 'PATCH',
      body: JSON.stringify({ driverId, note }),
    },
    token
  );

  const resolved = data.priceInquiry || data.inquiry;

  if (!resolved) {
    throw new Error('Fahrer-Anfrage konnte nicht zurückgezogen werden.');
  }

  return mapPriceInquiry(resolved);
}
