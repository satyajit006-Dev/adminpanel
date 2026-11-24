import type {
  ApparelCategory,
  ApparelOrder,
  ApparelProduct,
  BusinessSettings,
  CashCollectionRecord,
  OrderActivityLog,
  OrderStatusHistoryItem,
  PaymentEvent,
  PaymentMethodConfig,
  RefundRecord,
  ShippingZone,
  StaffMember,
  Transaction,
  UserAccount,
} from '../types/apparel';

export const INITIAL_ACCOUNTS: UserAccount[] = [];

export const INITIAL_ORDERS: ApparelOrder[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_REFUNDS: RefundRecord[] = [];

export const INITIAL_PAYMENT_EVENTS: PaymentEvent[] = [];

export const INITIAL_STATUS_HISTORY: OrderStatusHistoryItem[] = [];

export const INITIAL_ACTIVITY_LOGS: OrderActivityLog[] = [];

export const INITIAL_CASH_COLLECTIONS: CashCollectionRecord[] = [];

export const INITIAL_PAYMENT_METHODS: PaymentMethodConfig[] = [
  { id: 'pm-1', name: 'UPI', enabled: true, provider: 'UPI Gateway', settlementWindow: 'Instant / T+1' },
  { id: 'pm-2', name: 'Card', enabled: true, provider: 'Card Gateway / POS', settlementWindow: 'T+2 Business Days' },
  { id: 'pm-3', name: 'Cash', enabled: true, provider: 'Cash Drawer / COD', settlementWindow: 'End-of-Day Close' },
  { id: 'pm-4', name: 'Net Banking', enabled: true, provider: 'Bank Transfer / Net Banking', settlementWindow: 'T+2 Business Days' },
];

export const INITIAL_CATEGORIES: ApparelCategory[] = [
  { id: 'cat-1', name: 'Outerwear', description: 'Coats, jackets & seasonal layers', sortOrder: 1, enabled: true },
  { id: 'cat-2', name: 'Knitwear', description: 'Sweaters, cardigans & knit tops', sortOrder: 2, enabled: true },
  { id: 'cat-3', name: 'Bottoms & Denim', description: 'Trousers, denim & tailored bottoms', sortOrder: 3, enabled: true },
  { id: 'cat-4', name: 'Tops & Essentials', description: 'Shirts, tees & everyday staples', sortOrder: 4, enabled: true },
  { id: 'cat-5', name: 'Footwear & Accessories', description: 'Shoes, bags & small accessories', sortOrder: 5, enabled: true },
];

export const INITIAL_PRODUCTS: ApparelProduct[] = [];

export const INITIAL_DELIVERY_ZONES: ShippingZone[] = [];

export const INITIAL_STAFF: StaffMember[] = [];

export const INITIAL_SETTINGS: BusinessSettings = {
  brandName: 'Apparel Admin',
  adminName: 'Store Admin',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  openingHours: '',
  gstRatePct: 12,
};
