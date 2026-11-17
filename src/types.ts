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
  'Shoes',
  'Clothes',
  'Phones',
  'Food',
  'Books',
  'Electronics',
  'Foodstuff',
  'Fashion',
  'Hostel Items',
  'Phones & Accessories',
  'Laptops & Computers',
  'Books & Handouts',
  'Beauty & Skincare',
  'Services',
  'Others',
] as const;

export const HOME_QUICK_CATEGORIES = [
  { id: 'All', label: 'All Items' },
  { id: 'Shoes', label: 'Shoes' },
  { id: 'Clothes', label: 'Clothes' },
  { id: 'Phones', label: 'Phones' },
  { id: 'Food', label: 'Food' },
  { id: 'Books', label: 'Books' },
  { id: 'Electronics', label: 'Electronics' },
  { id: 'Foodstuff', label: 'Foodstuff' },
  { id: 'Fashion', label: 'Fashion' },
  { id: '__SERVICES__', label: 'Services Near You' },
] as const;

export const STANDARD_DELIVERY_FEE_NGN = 1000;
export const SAME_CITY_DELIVERY_FEE_NGN = 500;

export const SERVICE_CATEGORIES = [
  'Hair & Beauty',
  'Plumbing',
  'Tutoring',
  'Photography',
  'Cleaning',
  'Tailoring',
  'Graphic Design',
  'Car Wash',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export interface PublicUser {
  id: string;
  full_name: string;
  phone_number?: string; // Private: only returned to self or Owner
  country_code?: string;
  country?: string;
  language?: string;
  role: UserRole;
  badges: AccountBadge[]; // Up to 2 badges e.g. ['student', 'service_provider']
  institution: string;
  level?: string;
  school_id_photo?: string;
  shop_name?: string;
  market?: string;
  shop_doc_photo?: string;
  service_category?: string;
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
  title: string;
  category: ItemCategory | string;
  price: number;
  condition: ItemCondition;
  description: string;
  photos: string[];
  thumbnails?: string[];
  video_url?: string;
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
  country?: string;
  country_code?: string;
  distance_km?: number;
  is_featured: boolean;
  report_count: number;
  status: 'active' | 'removed';
  created_at: string;
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
  profile_pic: string;
  category: string;
  title: string;
  description: string;
  price_from: number;
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
  product_price: number;
  delivery_fee: number;
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
}

export interface OwnerDashboardData {
  stats: {
    total_users: number;
    total_buyers: number;
    total_sellers: number;
    total_items: number;
    total_messages: number;
    total_institutions: number;
    open_reports: number;
  };
  finance?: OwnerFinanceSummary;
  orders?: Array<
    EscrowOrder & {
      buyer_phone: string;
      seller_phone: string;
    }
  >;
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
