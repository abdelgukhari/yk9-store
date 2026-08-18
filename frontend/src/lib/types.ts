export type Category = {
  id: number;
  name_ar: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  children: Category[];
};

export type Brand = {
  id: number;
  name: string;
  slug: string;
};

export type ProductVariant = {
  id: number;
  color: string;
  color_hex: string;
  sku: string;
  price: string;
  compare_at_price: string | null;
  discount_percent: number;
  stock: number;
  is_active: boolean;
};

export type Product = {
  id: number;
  name_ar: string;
  name_en: string;
  slug: string;
  brand: Brand;
  category: number;
  image_url: string | null;
  min_price: string;
  discount_percent: number;
  rating_avg: number | null;
  reviews_count: number;
  is_featured: boolean;
  is_best_seller: boolean;
  battery_life_hours: string;
  noise_cancellation: boolean;
  variant_id: number | null;
  in_stock: boolean;
  description?: string;
  charging_type?: string;
  bluetooth_version?: string;
  water_resistance?: string;
  warranty_months?: number;
  box_contents?: string;
  specifications?: { key: string; value: string }[];
  variants?: ProductVariant[];
  images?: { url: string; alt: string }[];
  related?: Product[];
};

export type CartItem = {
  id: number;
  variant: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  color: string;
  color_hex: string;
  sku: string;
  price: string;
  compare_at_price: string | null;
  line_total: string;
  quantity: number;
  stock: number;
  image_url: string | null;
};

export type Cart = {
  id: number;
  items: CartItem[];
  subtotal: number;
  item_count: number;
  coupon: string | null;
};

export type Totals = {
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  governorate: string;
  estimated_delivery_days: number;
  coupon_code: string;
};

export type GovernorateRate = {
  id: number;
  governorate: number;
  governorate_name: string;
  price: string;
  free_shipping_threshold: string | null;
  estimated_delivery_days: number;
  cities: { id: number; name_ar: string }[];
};

export type User = {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  is_staff?: boolean;
  is_email_verified?: boolean;
  is_active?: boolean;
  date_joined?: string;
};

export type Address = {
  id: number;
  full_name: string;
  phone: string;
  whatsapp: string;
  governorate: number;
  governorate_name: string;
  city: number | null;
  city_name: string;
  area: string;
  detail: string;
  landmark: string;
  notes: string;
  is_default: boolean;
};

export type OrderItem = {
  product_name: string;
  sku: string;
  variant: string;
  color: string;
  unit_price: string;
  discount: string;
  quantity: number;
  total: string;
};

export type OrderStatusHistoryEntry = {
  new_status: string;
  reason: string;
  created_at: string;
};

export type VodafoneProof = {
  id: number;
  sender_number: string;
  reference: string;
  image_url: string;
  note: string;
  submitted_at: string;
};

export type Order = {
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string | null;
  payment_rejection_reason: string;
  proofs: VodafoneProof[];
  subtotal: string;
  discount: string;
  shipping_fee: string;
  total: string;
  governorate_name: string;
  city_name: string;
  address_detail: string;
  estimated_delivery_days: number;
  created_at: string;
  items: OrderItem[];
  status_history: OrderStatusHistoryEntry[];
};

export type ChatMessageType = {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources: (
    | { title: string; document_id: number }
    | {
        type: "product";
        product_id: number;
        slug: string;
        title: string;
        price: string;
      }
  )[];
  created_at: string;
};
