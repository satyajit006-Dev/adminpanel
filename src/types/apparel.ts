export type ApparelRoute =
  | 'dashboard'
  | 'live_orders'
  | 'all_orders'
  | 'completed_orders'
  | 'cancelled_orders'
  | 'transactions'
  | 'refunds'
  | 'financial_reports'
  | 'products'
  | 'website_upload'
  | 'categories'
  | 'inventory'
  | 'accounts'
  | 'delivery'
  | 'staff'
  | 'session_history'
  | 'settings';

export type ThemePreset = 'indigo' | 'pine' | 'burgundy' | 'slate';

export type OrderStatus =
  | 'new_order'
  | 'confirmed'
  | 'packing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type OrderType = 'Store Pickup' | 'Delivery';

export type PaymentMethodType = 'UPI' | 'Cash' | 'Card' | 'Net Banking';

export type OrderPaymentState = 'Paid' | 'Unpaid' | 'Partially Refunded' | 'Refunded';

export type TransactionStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface OrderItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  variant: string; // e.g., "Charcoal · Size M"
  quantity: number;
  unitPrice: number;
}

export interface ApparelOrder {
  id: string;
  orderNumber: string;
  accountId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress?: string;
  orderType: OrderType;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingFee: number;
  totalAmount: number;
  paymentStatus: OrderPaymentState;
  paymentMethod: PaymentMethodType;
  orderStatus: OrderStatus;
  staffNotes: string;
  customerInstructions?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  completedAt?: string;
}

export interface Transaction {
  id: string;
  orderId: string;
  orderNumber: string;
  accountId: string;
  customerName: string;
  paymentMethod: PaymentMethodType;
  amount: number;
  refundedAmount: number;
  currency: string;
  status: TransactionStatus;
  gatewayReference?: string;
  gatewayProvider: string;
  verifiedByWebhook: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RefundRecord {
  id: string;
  transactionId: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  reason: string;
  status: 'processed' | 'pending';
  processedBy: string;
  createdAt: string;
}

export interface PaymentEvent {
  id: string;
  transactionId: string;
  orderId: string;
  eventType:
    | 'payment.authorized'
    | 'payment.captured'
    | 'payment.failed'
    | 'webhook.verified'
    | 'refund.processed'
    | 'cash.collected';
  gateway: string;
  payloadSummary: string;
  verified: boolean;
  timestamp: string;
}

export interface OrderStatusHistoryItem {
  id: string;
  orderId: string;
  previousStatus: OrderStatus | 'none';
  newStatus: OrderStatus;
  changedBy: string;
  note?: string;
  timestamp: string;
}

export interface OrderActivityLog {
  id: string;
  orderId: string;
  actor: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface PaymentMethodConfig {
  id: string;
  name: PaymentMethodType;
  enabled: boolean;
  provider: string;
  settlementWindow: string;
}

export interface CashCollectionRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  transactionId: string;
  collectedBy: string;
  amount: number;
  registerShift: string;
  collectedAt: string;
}

export interface ApparelProduct {
  id: string;
  sku: string;
  name: string;
  slug?: string;
  categoryId: string;
  categoryName: string;
  price: number;
  compareAtPrice?: number;
  fabric: string;
  careInstructions?: string;
  sizesAvailable: string;
  colors?: string[];
  stockQuantity: number;
  lowStockThreshold: number;
  isAvailable: boolean;
  isBestseller: boolean;
  description?: string;
  images?: string[];
  tags?: string[];
  publishedToWebsite?: boolean;
  websiteSyncStatus?: 'synced' | 'local_only' | 'failed';
  lastSyncedAt?: string;
  syncError?: string;
}

export type AdminRoleLabel = 'Owner' | 'Co-Founder';

export interface AdminSessionHistoryEntry {
  id: string;
  username: string;
  role: AdminRoleLabel;
  eventType: 'login' | 'logout';
  deviceInfo?: string;
  occurredAt: string;
}

export interface BackendWebsiteConfig {
  checked: boolean;
  serverConfigured: boolean;
  supabaseConfigured: boolean;
  tableName: string;
  storageBucketConfigured: boolean;
  targetOrigin: string | null;
  webhookOrigin: string | null;
  webhookConfigured: boolean;
  authConfigured: boolean;
  authRequired: boolean;
  authClaimed: boolean;
  ownerClaimed?: boolean;
  cofounderClaimed?: boolean;
  usingEnvPasscode: boolean;
  usingEnvUsername?: boolean;
  usingEnvOwnerPasscode?: boolean;
  usingEnvCofounderPasscode?: boolean;
  usingEnvOwnerUsername?: boolean;
  usingEnvCofounderUsername?: boolean;
  configError?: string;
}

export interface ApparelCategory {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  enabled: boolean;
}

export interface ShippingZone {
  id: string;
  name: string;
  pincodes: string;
  fee: number;
  minOrder: number;
  etaWindow: string;
  active: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Owner' | 'Merchandiser' | 'Fulfillment Lead' | 'Support Agent';
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

export interface BusinessSettings {
  brandName: string;
  adminName?: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  openingHours: string;
  gstRatePct: number;
}

export interface LiveNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  title: string;
  subtitle: string;
  timestamp: string;
  read: boolean;
}

// Re-export User Account models for integrated User Accounts directory
export type AccountSegment = 'Customer' | 'Wholesale' | 'Staff';
export type AccountStatus = 'Active' | 'Pending' | 'Suspended';
export type LoyaltyTier =
  | 'Atelier VIP'
  | 'Gold'
  | 'Silver'
  | 'Standard'
  | 'Wholesale Partner'
  | 'Internal Staff';
export type UserRole =
  | 'Shopper'
  | 'VIP Member'
  | 'Boutique Buyer'
  | 'Retail Partner'
  | 'Admin'
  | 'Merchandiser'
  | 'Fulfillment Lead'
  | 'Support Agent';
export type FitPreference = 'Tailored' | 'Regular' | 'Relaxed' | 'Oversized';

export interface SizeProfile {
  tops: string;
  bottoms: string;
  footwear: string;
  fitPreference: FitPreference;
  notes?: string;
}

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  segment: AccountSegment;
  role: UserRole;
  tier: LoyaltyTier;
  status: AccountStatus;
  city: string;
  country: string;
  companyName?: string;
  totalOrders: number;
  lifetimeSpend: number;
  returnRate: number;
  lastActive: string;
  joinedDate: string;
  sizeProfile: SizeProfile;
}
