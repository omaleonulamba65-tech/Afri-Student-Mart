export type UserRole = 'buyer' | 'seller' | 'owner';

export type AccountBadge = 'student' | 'trader' | 'service_provider';

export type ItemCondition = 'New' | 'Fairly Used' | 'Neatly Used' | 'Old but Working';

export type ItemFilterMode = 'all' | 'students' | 'traders' | 'my_school' | 'my_market' | 'within_2km';

export const ITEM_CONDITIONS: ItemCondition[] = [
  'New',
  'Neatly Used',
  'Fairly Used',
  'Old but Working',
];

export const ITEM_CATEGORIES = [
  'Food',
  'Clothes',
  'Shoes',
  'Bags',
  'Textbooks',
  'Phone Accessories',
  'Beauty Products',
  'Phones',
  'Books',
  'Electronics',
  'Foodstuff',
  'Fashion',
  'Hostel Items',
  'Laptops & Computers',
  'Services',
  'Others',
] as const;

export const HOME_QUICK_CATEGORIES = [
  { id: 'All', label: 'All Items' },
  { id: 'Food', label: 'Food' },
  { id: 'Clothes', label: 'Clothes' },
  { id: 'Shoes', label: 'Shoes' },
  { id: 'Bags', label: 'Bags' },
  { id: 'Textbooks', label: 'Textbooks' },
  { id: 'Phone Accessories', label: 'Phone Accessories' },
  { id: 'Beauty Products', label: 'Beauty Products' },
  { id: '__SERVICES__', label: 'Services Near You' },
] as const;

export const STANDARD_DELIVERY_FEE_NGN = 1000;
export const SAME_CITY_DELIVERY_FEE_NGN = 500;

export const SERVICE_CATEGORIES = [
  'Laundry & Cleaning',
  'Hair & Makeup',
  'Phone Repair',
  'Tutoring',
  'Delivery',
  'Photography',
  'Graphic Design',
  'Plumbing',
  'Electrical Work',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export interface PublicUser {
  id: string;
  name?: string;
  full_name: string;
  email?: string;
  phone?: string;
  phone_number?: string; // Private: only returned to self or Owner
  country_code?: string;
  country?: string;
  state_city?: string;
  language_of_preference?: string;
  language?: string;
  user_type?: 'Buyer' | 'Student' | 'Trader' | 'Service Provider';
  role: UserRole;
  badges: AccountBadge[]; // Up to 2 badges e.g. ['student', 'service_provider']
  institution: string;
  student_id?: string;
  level?: string;
  school_id_photo?: string;
  id_doc_type?: string;
  id_doc_number?: string;
  business_reg_type?: string;
  business_reg_number?: string;
  secondary_reg_number?: string;
  shop_name?: string;
  trader_products?: string;
  market?: string;
  shop_doc_photo?: string;
  service_category?: string;
  service_details?: string;
  price_from?: number;
  work_photos?: string[];
  state: string;
  campus: string;
  profile_pic: string;
  trust_score?: number;
  reviews_count?: number;
  blocked: boolean;
  block_count: number;
  paystack_subaccount_code?: string;
  payout_bank_name?: string;
  payout_account_name?: string;
  payout_account_last4?: string;
  created_at: string;
}

export interface MarketplaceItem {
  id: string;
  shop_id?: string;
  title: string;
  category: ItemCategory | string;
  price: number;
  condition: ItemCondition;
  description: string;
  image_url?: string;
  photos: string[];
  thumbnails?: string[];
  video_url?: string;
  is_available?: boolean;
  make_offer?: boolean;
  pay_on_delivery?: boolean;
  is_boosted?: boolean;
  seller_id: string;
  seller_name: string;
  seller_profile_pic: string;
  seller_institution: string;
  seller_badges: AccountBadge[];
  seller_shop_name?: string;
  seller_market?: string;
  seller_level?: string;
  seller_rating?: number;
  seller_reviews_count?: number;
  seller_subaccount_code?: string;
  seller_joined_at: string;
  seller_items_count: number;
  institution: string;
  location: string;
  state?: string;
  country?: string;
  country_code?: string;
  distance_km?: number;
  is_featured: boolean;
  report_count: number;
  status: 'active' | 'pending' | 'rejected' | 'removed';
  created_at: string;
}

export interface CartItem {
  item: MarketplaceItem;
  quantity: number;
}

export interface ItemOffer {
  id: string;
  item_id: string;
  item_title?: string;
  item_price?: number;
  buyer_id?: string;
  buyer_name: string;
  seller_id?: string;
  seller_name?: string;
  is_seller?: boolean;
  offered_price: number;
  counter_price?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  created_at: string;
}

export interface RatingRecord {
  id: string;
  target_type: 'seller' | 'service' | 'shop';
  target_id: string;
  item_id?: string;
  rater_name: string;
  score: number;
  comment: string;
  video_url?: string;
  created_at: string;
}

export interface WantAlertMatch {
  item_id: string;
  item_title: string;
  item_price: number;
  seller_name: string;
  institution: string;
  matched_at: string;
}

export interface WantAlert {
  id: string;
  keyword: string;
  max_price: number;
  institution?: string;
  matches: WantAlertMatch[];
  created_at: string;
}

export interface ServiceOffering {
  name: string;
  price: number;
  duration: string;
}

export interface ServiceReview {
  id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ServiceProvider {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_phone?: string;
  profile_pic: string;
  category: string;
  title: string;
  description: string;
  price_from: number;
  country?: string;
  state_city?: string;
  location: string;
  distance_km: number;
  rating: number;
  reviews_count: number;
  work_photos: string[];
  offerings: ServiceOffering[];
  reviews: ServiceReview[];
  badges: AccountBadge[];
  is_advertised: boolean;
  created_at: string;
}

export interface ServiceBooking {
  id: string;
  service_id: string;
  service_title: string;
  provider_name: string;
  provider_phone?: string;
  scheduled_day: string;
  location: string;
  notes: string;
  price: number;
  status: string;
  reminder_date?: string;
  created_at: string;
}

export interface TraderShop {
  id: string;
  owner_id: string;
  owner_name: string;
  shop_name: string;
  description?: string;
  country?: string;
  state_city?: string;
  market: string;
  shop_photo: string;
  whatsapp_phone?: string;
  rating: number;
  reviews_count?: number;
  sales_count: number;
  is_featured: boolean;
  products_count: number;
  products: MarketplaceItem[];
}

export interface LiveVideo {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_phone?: string;
  shop_id?: string;
  shop_name?: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  country: string;
  is_live: boolean;
  viewers_count: number;
  created_at: string;
  ended_at?: string;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  payer_id: string;
  amount: number;
  payment_method: 'Bank Transfer' | 'Card' | 'Mobile Money' | string;
  status: 'pending' | 'successful' | 'failed' | string;
  paystack_reference?: string;
  created_at: string;
}

export interface ChatThread {
  thread_key: string;
  item_id: string;
  item_title: string;
  item_price: number;
  item_photo: string;
  item_institution: string;
  partner_id: string;
  partner_name: string;
  partner_institution: string;
  partner_profile_pic: string;
  is_seller: boolean;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  item_id: string;
  sender_is_me: boolean;
  sender_name: string;
  message: string;
  read_by_recipient: boolean;
  created_at: string;
}

export interface AdSettings {
  ads_enabled: boolean;
  interstitial_enabled: boolean;
  publisher_id: string;
  banner_unit_id: string;
  feed_unit_id: string;
  interstitial_unit_id: string;
  sidebar_unit_id?: string;
  google_ads_earnings?: number;
  paystack_public_key?: string;
  paystack_split_code?: string;
  admin_subaccount_code?: string;
  commission_percent?: number;
  site_name?: string;
  announcement?: string;
  announcement_enabled?: boolean;
}

export interface ReportRecord {
  id: string;
  target_type: 'item' | 'user';
  target_id: string;
  target_label: string;
  reporter_phone: string;
  reason: string;
  resolved: boolean;
  created_at: string;
}

export type EscrowOrderStatus =
  | 'paid_escrow'
  | 'shipped'
  | 'delivered_confirmed'
  | 'refund_requested'
  | 'refund_approved'
  | 'cancelled';

export interface EscrowOrder {
  id: string;
  reference: string;
  item_id: string;
  item_title: string;
  item_photo: string;
  item_location: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  seller_id: string;
  seller_name: string;
  quantity?: number;
  product_price: number;
  delivery_fee: number;
  total_price?: number;
  total_amount: number;
  admin_commission: number;
  admin_total_kept: number;
  seller_payout: number;
  delivery_address: string;
  country?: string;
  currency_symbol?: string;
  paystack_split_code?: string;
  seller_subaccount_code?: string;
  fee_bearer?: 'all-proportional' | 'subaccount';
  status?: 'pending' | 'confirmed' | 'delivered';
  payment_method?: 'Bank Transfer' | 'Card' | 'Mobile Money' | string;
  payment_status?: 'pending' | 'successful' | 'failed' | string;
  order_status: EscrowOrderStatus;
  refund_reason?: string;
  refund_photo?: string;
  refund_video?: string;
  refund_type?: 'full_with_delivery' | 'product_only';
  refund_amount?: number;
  created_at: string;
  shipped_at?: string;
  confirmed_at?: string;
  refund_requested_at?: string;
  refund_resolved_at?: string;
}

export interface OwnerFinanceSummary {
  total_orders: number;
  total_sales: number;
  my_10_percent_earnings: number;
  google_ads_earnings: number;
  promotion_fees_total: number;
  escrow_held_amount: number;
  released_orders_count: number;
  total_admin_commission: number;
  total_delivery_fees: number;
  total_admin_kept: number;
  total_seller_payouts: number;
  pending_refunds_count: number;
  total_money_in?: number;
  total_money_out?: number;
  money_to_pay_sellers?: number;
  money_paid_to_sellers?: number;
  pending_payments_count?: number;
  pending_payments_amount?: number;
  successful_payments_count?: number;
  successful_payments_amount?: number;
  failed_payments_count?: number;
  failed_payments_amount?: number;
  commission_percent?: number;
}

export interface OwnerSalesPoint {
  label: string;
  sales: number;
  orders: number;
  commission: number;
}

export interface OwnerPopularProduct {
  id: string;
  title: string;
  price: number;
  seller_name: string;
  institution: string;
  orders_count: number;
  messages_count: number;
  revenue: number;
  photo: string;
}

export interface OwnerActiveSeller {
  id: string;
  name: string;
  phone: string;
  email: string;
  shop_name?: string;
  listings_count: number;
  orders_count: number;
  revenue: number;
}

export interface OwnerStealthMessage {
  id: string;
  sender_name: string;
  sender_phone: string;
  sender_role_label: 'Buyer' | 'Seller' | 'Member';
  message: string;
  created_at: string;
}

export interface OwnerStealthThread {
  thread_key: string;
  listing_id: string;
  item_title: string;
  item_price: number;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  seller_name: string;
  seller_phone: string;
  seller_email: string;
  last_message_at: string;
  message_count: number;
  messages: OwnerStealthMessage[];
}

export interface OwnerDashboardData {
  stats: {
    total_users: number;
    total_buyers: number;
    total_sellers: number;
    total_items: number;
    total_all_items?: number;
    total_messages: number;
    total_institutions: number;
    open_reports: number;
    orders_today?: number;
    orders_week?: number;
    orders_month?: number;
  };
  finance?: OwnerFinanceSummary;
  orders?: Array<
    EscrowOrder & {
      buyer_phone: string;
      seller_phone: string;
    }
  >;
  sales_series_daily?: OwnerSalesPoint[];
  sales_series_weekly?: OwnerSalesPoint[];
  popular_products?: OwnerPopularProduct[];
  active_sellers?: OwnerActiveSeller[];
  buyer_purchases?: Record<string, string[]>;
  seller_listings?: Record<string, string[]>;
  chat_threads?: OwnerStealthThread[];
  institutions: Array<{ name: string; users: number; items: number }>;
  users: Array<PublicUser & { phone_number: string }>;
  items: Array<MarketplaceItem & { seller_phone: string }>;
  reports: ReportRecord[];
  ad_settings: AdSettings;
  storage_mode: 'supabase' | 'local';
}

export type PolicyPageId =
  | 'refund'
  | 'delivery'
  | 'seller_policy'
  | 'escrow'
  | 'terms'
  | 'privacy'
  | 'community'
  | 'safety'
  | 'prohibited'
  | 'cookies'
  | 'contact'
  | 'report';

export type NotificationType =
  | 'new_message'
  | 'want_alert_match'
  | 'order_placed'
  | 'order_shipped'
  | 'order_confirmed'
  | 'refund_update'
  | 'offer_received'
  | 'offer_update'
  | 'booking_received'
  | 'info';

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
  synthetic?: boolean;
}
