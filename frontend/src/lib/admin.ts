import { api } from "./api";

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type DashboardStats = {
  orders_today: number;
  orders_total: number;
  revenue_total: string;
  revenue_today: string;
  awaiting_confirmation: number;
  payment_verification_pending: number;
  processing: number;
  cancelled: number;
  low_stock_count: number;
  customers_count: number;
};

export type AdminDashboard = {
  stats: DashboardStats;
  recent_orders: AdminOrder[];
  low_stock: {
    variant_id: number;
    sku: string;
    product_name: string;
    available: number;
    threshold: number;
  }[];
  top_products: { product_name: string; quantity: number; revenue: string }[];
};

export type AdminStatusHistoryEntry = {
  id: number;
  prev_status: string;
  new_status: string;
  reason: string;
  changed_by_email: string | null;
  created_at: string;
};

export type AdminOrder = {
  id: number;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string | null;
  full_name: string;
  phone: string;
  customer_email: string | null;
  total: string;
  item_count: number;
  created_at: string;
  subtotal?: string;
  discount?: string;
  shipping_fee?: string;
  coupon_code?: string | null;
  whatsapp?: string;
  governorate_name?: string;
  city_name?: string;
  area?: string;
  address_detail?: string;
  landmark?: string;
  notes?: string;
  estimated_delivery_days?: number;
  is_demo?: boolean;
  items?: AdminOrderItem[];
  payment?: {
    id: number;
    method: string;
    status: string;
    amount: string;
    verified_by_email: string | null;
    verified_at: string | null;
    rejection_reason: string;
    created_at: string;
  } | null;
  proofs?: AdminProof[];
  status_history?: AdminStatusHistoryEntry[];
};

export type AdminOrderItem = {
  id: number;
  product_name: string;
  sku: string;
  variant: string;
  color: string;
  unit_price: string;
  discount: string;
  quantity: number;
  total: string;
};

export type AdminProof = {
  id: number;
  sender_number: string;
  reference: string;
  image_url: string | null;
  note: string;
  submitted_at: string;
};

export type AdminOrderDetail = {
  order: AdminOrder;
  allowed_statuses: string[];
};

export type AdminProduct = {
  id: number;
  name_ar: string;
  name_en: string;
  slug: string;
  brand_name: string;
  category_name: string;
  status: string;
  is_featured: boolean;
  is_best_seller: boolean;
  min_price: string;
  total_stock: number;
  created_at: string;
  updated_at: string;
};

export type AdminVariant = {
  id: number;
  color: string;
  color_hex: string;
  sku: string;
  price: string;
  compare_at_price: string | null;
  is_active: boolean;
  stock: number;
  reserved_quantity: number;
};

export type AdminProductImage = {
  id: number;
  product: number;
  image_url: string | null;
  alt: string;
  sort_order: number;
};

export type AdminProductDetail = {
  id: number;
  name_ar: string;
  name_en: string;
  model: string;
  slug: string;
  brand: number;
  brand_name: string;
  category: number;
  category_name: string;
  description: string;
  status: string;
  is_featured: boolean;
  is_best_seller: boolean;
  battery_life_hours: string;
  charging_type: string;
  bluetooth_version: string;
  water_resistance: string;
  noise_cancellation: boolean;
  warranty_months: number;
  box_contents: string;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
  variants: AdminVariant[];
  images: AdminProductImage[];
  specifications: { key: string; value: string }[];
};

export type AdminCoupon = {
  id: number;
  code: string;
  type: "fixed" | "percent";
  value: string;
  min_subtotal: string;
  max_discount: string | null;
  usage_limit: number;
  used_count: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
};

export type AdminReview = {
  id: number;
  product: number;
  product_name: string;
  user_email: string | null;
  guest_name: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
};

export type AdminCustomer = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_staff: boolean;
  is_active: boolean;
  is_email_verified: boolean;
  date_joined: string;
  last_login: string | null;
  orders_count: number;
  total_spent: string;
};

export type AdminAgent = {
  id: number;
  name: string;
  description: string;
  role: string;
  system_instructions: string;
  provider: number | null;
  provider_name: string | null;
  model: number | null;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminProvider = {
  id: number;
  name: string;
  kind: string;
  kind_label: string;
  base_url: string;
  model: string;
  is_active: boolean;
  is_online: boolean;
  last_checked_at: string | null;
};

export type AdminCategory = {
  id: number;
  name_ar: string;
  name_en: string;
  slug: string;
  parent: number | null;
  is_active: boolean;
  sort_order: number;
};

export type AdminBrand = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};

export type AdminOrderStatuses = {
  statuses: string[];
  payment_statuses: string[];
};

export function formatEGP(v: string | number): string {
  const n = typeof v === "number" ? v : parseFloat(v);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  });
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-EG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  Pending: "معلق",
  AwaitingConfirmation: "بانتظار التأكيد",
  PaymentVerificationPending: "بانتظار مراجعة الدفع",
  PaymentRejected: "الدفع مرفوض",
  Confirmed: "مؤكد",
  Processing: "قيد التجهيز",
  Shipped: "تم الشحن",
  Delivered: "تم التسليم",
  Cancelled: "ملغي",
  Returned: "مرتجع",
  Refunded: "مسترجع المبلغ",
};

export const STATUS_STYLE: Record<string, string> = {
  Pending: "bg-bg-raised text-muted ring-line",
  AwaitingConfirmation: "bg-warning/10 text-warning ring-warning/30",
  PaymentVerificationPending: "bg-electric/10 text-electric-light ring-electric/30",
  PaymentRejected: "bg-danger/10 text-danger ring-danger/30",
  Confirmed: "bg-gold/10 text-gold ring-gold/30",
  Processing: "bg-electric/10 text-electric-light ring-electric/30",
  Shipped: "bg-electric/10 text-electric-light ring-electric/30",
  Delivered: "bg-success/10 text-success ring-success/30",
  Cancelled: "bg-danger/10 text-danger ring-danger/30",
  Returned: "bg-warning/10 text-warning ring-warning/30",
  Refunded: "bg-success/10 text-success ring-success/30",
};

export function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function statusStyle(status: string): string {
  return STATUS_STYLE[status] ?? "bg-bg-raised text-muted ring-line";
}

export async function fetchPage<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<Paginated<T>> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const sep = path.includes("?") ? "&" : "?";
  return api<Paginated<T>>(`${path}${sep}${qs.toString()}`, { auth: true });
}
