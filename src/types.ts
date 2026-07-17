export type TenantStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRING' | 'OVERDUE' | 'SUSPENDED';
export type SubscriptionPackageName = string;
export type SubscriptionPackageStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
export type CurrencyCode = 'USD' | 'VND';

export interface SubscriptionCapability {
  key: string;
  label: string;
  enabled: boolean;
}

export interface SubscriptionLimits {
  appointmentsPerMonth: number | null;
  storageGb: number | null;
  messagesPerMonth: number | null;
  adminUsers: number | null;
  apiCallsPerMonth: number | null;
  customDomains: number | null;
  dataRetentionDays: number | null;
}

export interface SubscriptionPriceHistoryEntry {
  id: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: CurrencyCode;
  effectiveFrom: string;
  note: string;
}

export interface SubscriptionRetirementRequest {
  requestedAt: string;
  replacementPackageId: string;
  replacementPackageName: SubscriptionPackageName;
  affectedTenantIds: string[];
  mode: 'AT_TENANT_EXPIRY';
}

export interface Branch {
  id: string;
  code?: string;
  name: string;
  address: string;
  model?: 'FULL_SERVICE' | 'NAIL_STUDIO' | 'EXPRESS_KIOSK';
  isPrimary?: boolean;
  managerName?: string;
  phone?: string;
  email?: string;
  province?: string;
  timezone?: string;
  openingHours?: string;
  openingDate?: string;
  stationCount?: number;
  staffCapacity?: number;
  taxCode?: string;
  services?: string[];
  monthlyRevenue?: number;
  capacityPercent?: number;
  staffUsed: number;
  staffLimit: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PLANNING';
  staffCount?: number;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  adminEmail: string;
  packageName: SubscriptionPackageName;
  status: TenantStatus;
  monthlyRevenue: number;
  createdAt: string;
  address: string;
  phone: string;
  contactEmail?: string;
  logoUrl?: string;
  country?: string;
  timezone?: string;
  lastSync?: string;
  staffCount: number;
  adminName: string;
  lastLogin: string;
  // Extended configuration and detailed properties
  allowOnlineBooking?: boolean;
  currency?: CurrencyCode;
  defaultLanguage?: 'Vietnamese' | 'English';
  internalNotes?: string;
  paymentGatewayConfigured?: boolean;
  
  // Custom billing and package attributes
  daysRemaining?: number;
  paymentStatus?: 'PAID' | 'WARNING' | 'OVERDUE' | 'SUSPENDED' | 'UNPAID' | 'PENDING';
  plan?: SubscriptionPackageName;
  subscriptionPlan?: SubscriptionPackageName;
  billingCycle?: 'monthly' | 'yearly';
  effectiveDate?: 'immediate' | 'next_cycle';
  planStartDate?: string;
  trialEndDate?: string;
  subscriptionPackageId?: string;
  subscriptionPackageVersion?: number;
  subscriptionPrice?: number;
  subscriptionCurrency?: CurrencyCode;
  subscriptionStartedAt?: string;
  subscriptionRenewsAt?: string;
  customActivities?: { date: string; user: string; type: string; description: string }[];
  customInvoices?: { id: string; period: string; amount: number; status: string; dueDate: string; type?: string; packageName?: string; duration?: string; createdAt?: string; paymentMethod?: string; transactionCode?: string; notes?: string }[];
  branches?: Branch[];
  tenantAdminId?: string;
  adminCreationMode?: 'existing' | 'new';
  isNewAdminCreated?: boolean;
  adminUsername?: string;
  adminTempPassword?: string;
  adminSendActivationEmail?: boolean;
  adminEmailVerified?: boolean;
  adminPhoneVerified?: boolean;
  adminPhone?: string;
  adminAvatarUrl?: string;
  adminCountry?: string;
  adminTimezone?: string;
  adminAddress?: string;
}

export type TenantAdminRole = 'Owner' | 'Manager' | 'Staff';
export type TenantAdminStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export interface TenantAdminAccount {
  id: string;
  adminCode?: string;
  name: string;
  email: string;
  username?: string;
  tenantName: string;
  tenantCount: number;
  tenantIds: string[];
  role: TenantAdminRole;
  status: TenantAdminStatus;
  lastActive: string;
  phone: string;
  avatarUrl?: string;
  country?: string;
  timezone?: string;
  address?: string;
  note?: string;
  tempPassword?: string;
  sendActivationEmail?: boolean;
  createdAt?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  source: 'TENANT' | 'INVITED';
}

export interface SubscriptionPackage {
  id: string;
  name: SubscriptionPackageName;
  description?: string;
  price: number;
  yearlyPrice?: number;
  yearlyDiscountPercent?: number;
  setupFee?: number;
  trialDays?: number;
  currency?: CurrencyCode;
  billingCycle: 'monthly' | 'yearly';
  activeTenants: number;
  status?: SubscriptionPackageStatus;
  isPopular?: boolean;
  features: string[];
  capabilities?: SubscriptionCapability[];
  limits?: SubscriptionLimits;
  maxStaff: number;
  maxSalons: number;
  color: string;
  version?: number;
  priceHistory?: SubscriptionPriceHistoryEntry[];
  retirementRequest?: SubscriptionRetirementRequest;
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemAlert {
  id: string;
  title: string;
  description: string;
  type: 'error' | 'warning' | 'info';
  createdAt: string;
  isRead: boolean;
  targetTenantId?: string;
}

export interface Invoice {
  id: string;
  invoiceCode?: string;
  tenantId: string;
  tenantName: string;
  type?: 'RENEWAL' | 'PLAN_CHANGE' | 'MONTHLY_SUBSCRIPTION' | 'MANUAL_ADJUSTMENT';
  planName?: string;
  packageId?: string;
  packageVersion?: number;
  billingCycle?: 'monthly' | 'yearly';
  servicePeriod?: string;
  dueDate: string;
  amount: number;
  currency?: CurrencyCode;
  status: 'PAID' | 'OVERDUE' | 'PENDING' | 'CANCELLED';
  paymentMethod?: string;
  transactionCode?: string;
  note?: string;
  createdAt: string;
  paidAt?: string;
  billingPeriod: string; // for backward compatibility
  updatedAt?: string;
  issuedBy?: string;
  billingEmail?: string;
  billingCompany?: string;
  billingAddress?: string;
  taxCode?: string;
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  processingFee?: number;
  netReceived?: number;
  paymentGateway?: 'MOMO' | 'VNPAY' | 'STRIPE' | 'BANK_TRANSFER' | 'MANUAL';
  reconciliationStatus?: 'MATCHED' | 'PENDING' | 'MISMATCHED' | 'NOT_REQUIRED';
  reconciledAt?: string;
  reconciledBy?: string;
  collectionStage?: 'NONE' | 'REMINDER_1' | 'REMINDER_2' | 'FINAL_NOTICE' | 'SUSPENSION_REVIEW';
  reminderCount?: number;
  lastReminderAt?: string;
  gracePeriodEnd?: string;
  refundStatus?: 'NONE' | 'PARTIAL' | 'FULL';
  refundedAmount?: number;
  refundedAt?: string;
  refundReason?: string;
  lineItems?: InvoiceLineItem[];
  paymentAttempts?: InvoicePaymentAttempt[];
  activities?: InvoiceActivity[];
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
}

export interface InvoicePaymentAttempt {
  id: string;
  attemptedAt: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  gateway: 'MOMO' | 'VNPAY' | 'STRIPE' | 'BANK_TRANSFER' | 'MANUAL';
  amount: number;
  transactionCode?: string;
  failureReason?: string;
}

export interface InvoiceActivity {
  id: string;
  action: string;
  description: string;
  actor: string;
  createdAt: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  eventCode: string;
  event: string;
  description: string;
  user: string;
  actorRole: 'SUPERADMIN' | 'TENANT_ADMIN' | 'SYSTEM' | 'SUPPORT';
  ip: string;
  severity: 'high' | 'medium' | 'low';
  status: 'success' | 'failed' | 'blocked';
  category: 'AUTH' | 'TENANT' | 'USER' | 'BILLING' | 'PACKAGE' | 'SECURITY' | 'SYSTEM' | 'DATA' | 'SUPPORT';
  resource: string;
  resourceId?: string;
  location?: string;
  device?: string;
  sessionId?: string;
  requestId?: string;
  method?: string;
  changes?: Array<{
    field: string;
    before: string;
    after: string;
  }>;
  metadata?: Record<string, string | number | boolean>;
}

export interface AdminSession {
  id: string;
  user: string;
  role: 'SUPERADMIN' | 'SUPPORT';
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  createdAt: string;
  lastActive: string;
  expiresAt: string;
  isCurrent: boolean;
  trusted: boolean;
  suspicious: boolean;
  mfaVerified: boolean;
  status: 'active' | 'revoked';
}

export interface BackupSnapshot {
  id: string;
  filename: string;
  size: string;
  sizeBytes: number;
  createdAt: string;
  completedAt?: string;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  type: 'AUTO' | 'MANUAL' | 'PRE_RESTORE';
  scope: 'FULL' | 'DATABASE' | 'CONFIGURATION';
  storageProvider: 'GOOGLE_CLOUD_STORAGE' | 'AWS_S3';
  bucket: string;
  region: string;
  replicaRegion?: string;
  encryption: 'AES-256-GCM';
  kmsKeyId: string;
  checksum: string;
  integrityStatus: 'VERIFIED' | 'PENDING' | 'FAILED';
  verifiedAt?: string;
  durationSeconds?: number;
  initiatedBy: string;
  retentionClass: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MANUAL';
  expiresAt: string;
  immutableUntil?: string;
  note?: string;
  failureReason?: string;
  components: BackupComponent[];
}

export interface BackupComponent {
  key: 'DATABASE' | 'OBJECT_STORAGE' | 'SYSTEM_SETTINGS' | 'AUDIT_LOGS';
  label: string;
  status: 'INCLUDED' | 'SKIPPED' | 'FAILED';
  records?: number;
  size: string;
}

export interface BackupPolicy {
  enabled: boolean;
  frequency: 'EVERY_6_HOURS' | 'DAILY' | 'WEEKLY';
  time: string;
  weekday: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  timezone: string;
  dailyRetention: number;
  weeklyRetention: number;
  monthlyRetention: number;
  immutableDays: number;
  primaryRegion: string;
  replicaRegion: string;
  crossRegionReplication: boolean;
  encryptionEnabled: boolean;
  kmsKeyId: string;
  compression: 'GZIP' | 'ZSTD';
  automaticVerification: boolean;
  includeObjectStorage: boolean;
  includeAuditLogs: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface RestoreJob {
  id: string;
  snapshotId: string;
  snapshotFilename: string;
  target: 'DR_SANDBOX' | 'PRODUCTION';
  status: 'QUEUED' | 'VALIDATING' | 'RESTORING' | 'VERIFYING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  requestedBy: string;
  progress: number;
  maintenanceMode: boolean;
  preRestoreSnapshot: boolean;
  validationPassed: boolean;
  note: string;
  failureReason?: string;
}

export interface Ticket {
  id: string;
  tenantId: string;
  tenantName: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  plan: SubscriptionPackageName;
  subject: string;
  category: string;
  channel: 'EMAIL' | 'CHAT' | 'PHONE' | 'SYSTEM';
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_CUSTOMER' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  firstResponseDueAt: string;
  resolutionDueAt: string;
  firstRespondedAt?: string;
  resolvedAt?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  team: 'L1_SUPPORT' | 'TECHNICAL' | 'BILLING' | 'SECURITY';
  tags: string[];
  description: string;
  messages: TicketMessage[];
  history: TicketHistoryEntry[];
  satisfaction?: 1 | 2 | 3 | 4 | 5;
  relatedResource?: {
    type: 'TENANT' | 'INVOICE' | 'SUBSCRIPTION' | 'INCIDENT';
    id: string;
    label: string;
  };
}

export interface TicketMessage {
  id: string;
  authorName: string;
  authorEmail: string;
  authorRole: 'SUPERADMIN' | 'SUPPORT' | 'TENANT_ADMIN' | 'SYSTEM';
  type: 'PUBLIC_REPLY' | 'INTERNAL_NOTE' | 'SYSTEM_EVENT';
  body: string;
  createdAt: string;
  attachments?: Array<{
    id: string;
    name: string;
    size: string;
  }>;
}

export interface TicketHistoryEntry {
  id: string;
  action: string;
  detail: string;
  actor: string;
  createdAt: string;
}
