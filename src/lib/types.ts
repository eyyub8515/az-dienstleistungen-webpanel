export type UserRole = 'user' | 'admin' | 'support' | 'driver';

export type CustomerType = 'private' | 'business';

export type RequestStatus =
  | 'received'
  | 'accepted'
  | 'inProgress'
  | 'done'
  | 'canceled'
  | 'rejected'
  | 'waitingForClient';

export type RequestSignal = 'Urgent' | 'Discreet' | 'Later';

export type DriverStatus =
  | 'unassigned'
  | 'assigned'
  | 'accepted'
  | 'inProgress'
  | 'done'
  | 'onTheWay'
  | 'pickedUp'
  | 'delivered'
  | 'declined';

export type DriverAvailability = 'available' | 'limited' | 'unavailable';

export type PriceInquiryStatus = 'open' | 'assigned' | 'closed' | 'expired';

export type PriceInquiryDriverStatus =
  | 'pending'
  | 'viewed'
  | 'answered'
  | 'declined'
  | 'expired'
  | 'withdrawn';

export type RequestMessageRecipient = 'customer' | 'driver' | 'both';

export type DriverAttachment = {
  name: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt?: string | null;
};

export type TimelineEntry = {
  status: RequestStatus;
  note: string;
  changedAt: string;
  changedByName: string;
};

export type User = {
  _id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email: string;
  phone?: string;
  role: UserRole;
  customerType?: CustomerType;
  expoPushToken?: string;
  isActive?: boolean;
  passwordSetupRequired?: boolean;
  invitedAt?: string | null;
  passwordSetAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type DriverEmergencyContact = {
  name?: string;
  phone?: string;
  relation?: string;
};

export type DriverVehicleProfile = {
  make?: string;
  model?: string;
  color?: string;
  year?: string;
  plateNumber?: string;
  vin?: string;
  image?: DriverAttachment | null;
  documents?: DriverAttachment[];
};

export type DriverProfile = {
  active?: boolean;
  internalCode?: string;
  dateOfBirth?: string;
  nationality?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  driverPhoto?: DriverAttachment | null;
  licenseCopy?: DriverAttachment | null;
  additionalDocuments?: DriverAttachment[];
  emergencyContact?: DriverEmergencyContact;
  vehicle?: DriverVehicleProfile;
};

export type Driver = {
  _id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email: string;
  phone?: string;
  role: 'driver';
  customerType?: CustomerType;
  expoPushToken?: string;
  isActive?: boolean;
  passwordSetupRequired?: boolean;
  invitedAt?: string | null;
  passwordSetAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  driverProfile?: DriverProfile;
};

export type DriverPayload = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email: string;
  phone: string;
  isActive?: boolean;
  driverProfile?: DriverProfile;
};

export type PasswordActionResponse = {
  success?: boolean;
  message?: string;
  resetToken?: string;
  resetUrl?: string;
  setupToken?: string;
  setupUrl?: string;
};

export type DriverMutationResponse = {
  message?: string;
  user?: Driver;
  driver?: Driver;
  setupToken?: string;
  setupUrl?: string;
  resetToken?: string;
  resetUrl?: string;
};

export type StaffPayload = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email: string;
  phone?: string;
  role: 'admin' | 'support';
  isActive?: boolean;
};

export type RequestActor = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  customerType?: CustomerType;
};

export type RequestMessageNotificationState = {
  pushSent?: boolean;
  pushSentAt?: string | null;
  pushError?: string;
  mailSent?: boolean;
  mailSentAt?: string | null;
  mailError?: string;
};

export type RequestMessage = {
  _id: string;
  requestId?: string;
  senderId?: RequestActor | null;
  senderRole?: UserRole | 'system';
  senderName?: string;
  recipientId?: RequestActor | null;
  recipientRole?: UserRole;
  recipientName?: string;
  targetType: 'customer' | 'driver';
  subject?: string;
  text: string;
  internalNote?: string;
  channel?: 'portal' | 'system';
  notification?: RequestMessageNotificationState;
  createdAt: string;
  updatedAt: string;
};

export type SendRequestMessagePayload = {
  recipient: RequestMessageRecipient;
  subject?: string;
  text: string;
  internalNote?: string;
};

export type SendRequestMessageResponse = {
  message?: string;
  records?: RequestMessage[];
  record?: RequestMessage;
};

export type RequestItem = {
  _id: string;
  referenceNumber?: string;
  title: string;
  description: string;
  category?: string;
  signal: RequestSignal;
  status: RequestStatus;
  pickupLocation?: string;
  pickupAddress?: string;
  destination?: string;
  dropoffAddress?: string;
  scheduledAt?: string | null;
  notes?: string;
  attachments: DriverAttachment[];
  attachmentsCount?: number;
  createdAt: string;
  updatedAt: string;
  userId?: RequestActor;
  customerType?: CustomerType;
  userType?: CustomerType | string;
  accountType?: CustomerType | string;
  businessCustomer?: boolean;
  isBusinessCustomer?: boolean;
  clientEditApproved?: boolean;
  clientEditApprovedAt?: string | null;
  clientEditApprovedBy?: RequestActor | null;
  assignedDriverId?: RequestActor | null;
  assignedDriverAt?: string | null;
  assignedDriverBy?: RequestActor | null;
  driverStatus?: DriverStatus | string;
  driverStatusUpdatedAt?: string | null;
  driverNote?: string;
  priceInquiryId?: unknown;
  driverAssignedViaInquiry?: boolean;

  clientBudgetAmount?: number | null;
  budgetAmount?: number | null;

  customerPriceNet?: number | null;
  customerPriceGross?: number | null;
  customerPriceCurrency?: 'EUR';

  agreedDriverPrice?: number | null;
  finalPriceNet?: number | null;
  finalPriceGross?: number | null;
  finalPriceCurrency?: 'EUR';
  approvedPriceNet?: number | null;
  approvedPriceGross?: number | null;
  priceNet?: number | null;
  priceGross?: number | null;
  priceCurrency?: 'EUR';
  netPrice?: number | null;
  grossPrice?: number | null;

  offeredPriceNet?: number | null;
  offeredPriceGross?: number | null;
  calculatedNetPrice?: number | null;
  calculatedGrossPrice?: number | null;
  currency?: 'EUR';
  agreedPriceCurrency?: 'EUR';

  entrepreneurPrice?: number | null;
  adminRevenue?: number | null;
  supportPriceAmount?: number | null;

  statusHistory?: Array<{
    status: RequestStatus;
    note?: string;
    changedAt?: string;
    changedBy?: RequestActor | null;
  }>;
  timeline: TimelineEntry[];
};

export type PriceInquiryDriverResolved = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
};

export type PriceInquiryDriverEntry = {
  driverId?: string | PriceInquiryDriverResolved | null;
  status: PriceInquiryDriverStatus;
  viewedAt?: string | null;
  notification?: RequestMessageNotificationState;
  responsePrice?: number | null;
  responseCurrency?: 'EUR';
  responseAvailability?: DriverAvailability;
  responseComment?: string;
  respondedAt?: string | null;
  declinedAt?: string | null;
  withdrawnAt?: string | null;
};

export type PriceInquiryEventLogEntry = {
  type: string;
  message: string;
  actorId?: unknown;
  driverId?: unknown;
  createdAt: string;
};

export type PriceInquiryRequestRef = {
  _id?: string;
  referenceNumber?: string;
  title?: string;
  description?: string;
  status?: RequestStatus;
  signal?: RequestSignal;
  customerType?: CustomerType;
  clientBudgetAmount?: number | null;
  budgetAmount?: number | null;
  finalPriceNet?: number | null;
  finalPriceGross?: number | null;
  approvedPriceNet?: number | null;
  approvedPriceGross?: number | null;
  priceNet?: number | null;
  priceGross?: number | null;
  netPrice?: number | null;
  grossPrice?: number | null;
  agreedDriverPrice?: number | null;
  entrepreneurPrice?: number | null;
  adminRevenue?: number | null;
  supportPriceAmount?: number | null;
};

export type PriceInquiryCreatedBy = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: UserRole;
};

export type PriceInquiryItem = {
  _id: string;
  referenceNumber: string;
  requestId: string | PriceInquiryRequestRef | null;
  createdBy: unknown | PriceInquiryCreatedBy;
  title: string;
  description: string;
  adminNote: string;
  status: PriceInquiryStatus;
  expiresAt: string | null;
  closedAt: string | null;
  closedBy?: unknown;
  selectedDriverId?: unknown;
  selectedDriverAt: string | null;
  selectedDriverBy?: unknown;
  selectedPrice: number | null;
  selectedCurrency?: 'EUR';
  proposedDriverPrice?: number | null;
  proposedDriverCurrency?: 'EUR';
  autoCalculatedDriverPrice?: number | null;
  driverInquiries: PriceInquiryDriverEntry[];
  eventLog: PriceInquiryEventLogEntry[];
  stats: {
    totalDrivers: number;
    answeredCount: number;
    declinedCount: number;
    pendingCount: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type StatsOverview = {
  total: number;
  received: number;
  accepted: number;
  inProgress: number;
  done: number;
  urgent: number;
};
