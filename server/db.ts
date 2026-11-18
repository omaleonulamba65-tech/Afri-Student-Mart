import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  STANDARD_DELIVERY_FEE_NGN,
  type AccountBadge,
  type AdSettings,
  type ChatMessage,
  type ChatThread,
  type EscrowOrder,
  type ItemCondition,
  type ItemOffer,
  type MarketplaceItem,
  type OwnerDashboardData,
  type OwnerFinanceSummary,
  type PublicUser,
  type RatingRecord,
  type ServiceBooking,
  type ServiceOffering,
  type ServiceProvider,
  type ServiceReview,
  type TraderShop,
  type UserRole,
  type WantAlert,
  type WantAlertMatch,
} from '../src/types.ts';
import {
  COUNTRY_LANGUAGE_CONFIGS,
  getCountryByDialCode,
  getCountryConfig,
} from '../src/data/languages.ts';
import { inferCountryFromLocationText } from '../src/data/countryDocuments.ts';

export const OWNER_PHONE = '07089628626';
export const DEFAULT_OWNER_PASS = 'LAMBA@500';

export function isAuthorizedOwnerName(name?: string): boolean {
  const normalized = (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return (
    normalized === 'jokey perky group' ||
    normalized === 'jokeyperky group' ||
    normalized === 'jokipeki group'
  );
}

export function isAuthorizedOwnerPassword(password: string, storedHash?: string): boolean {
  if (password === 'LAMBA@500' || password === 'Lamba@500') return true;
  return storedHash ? verifyPassword(password, storedHash) : false;
}

const SUPABASE_URL_VALUE =
  (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tbftcuxwvotkjkwwmhou.supabase.co').trim();
const SUPABASE_ANON_KEY_VALUE =
  (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'sb_publishable_9FAPn3q88UMB935Jrkg_9A_4pCfyuBS'
  ).trim();

export interface DbUser {
  id: string;
  full_name: string;
  phone_number: string;
  password: string;
  role: UserRole;
  institution: string;
  state: string;
  campus: string;
  profile_pic: string;
  created_at: string;
}

export interface DbItem {
  id: string;
  title: string;
  category: string;
  price: number;
  condition: ItemCondition;
  description: string;
  photos: string[] | string;
  seller_phone: string;
  institution: string;
  location: string;
  created_at: string;
}

export interface DbMessage {
  id: string;
  item_id: string;
  buyer_phone: string;
  seller_phone: string;
  message: string;
  created_at: string;
}

export interface DbReport {
  id: string;
  target_type: 'item' | 'user';
  target_id: string;
  reporter_phone: string;
  reason: string;
  resolved: boolean;
  created_at: string;
}

export interface ExtendedUserProfile {
  country_code?: string;
  country?: string;
  language?: string;
  badges: AccountBadge[];
  level?: string;
  school_id_photo?: string;
  id_doc_type?: string;
  id_doc_number?: string;
  business_reg_type?: string;
  business_reg_number?: string;
  secondary_reg_number?: string;
  shop_name?: string;
  market?: string;
  shop_doc_photo?: string;
  shop_photo?: string;
  shop_rating?: number;
  shop_sales?: number;
  shop_featured?: boolean;
  service_category?: string;
  price_from?: number;
  work_photos?: string[];
  paystack_subaccount_code?: string;
  payout_bank_name?: string;
  payout_account_number?: string;
  payout_account_name?: string;
}

export interface ExtendedItemMeta {
  is_featured: boolean;
  is_boosted: boolean;
  make_offer: boolean;
  pay_on_delivery: boolean;
  thumbnails?: string[];
  video_url: string;
  country?: string;
  country_code?: string;
  report_count: number;
  status: 'active' | 'removed';
}

interface StoredService {
  id: string;
  provider_phone: string;
  provider_name: string;
  profile_pic: string;
  category: string;
  title: string;
  description: string;
  price_from: number;
  location: string;
  distance_km: number;
  work_photos: string[];
  offerings: ServiceOffering[];
  reviews: ServiceReview[];
  badges: AccountBadge[];
  is_advertised: boolean;
  created_at: string;
}

interface StoredBooking extends ServiceBooking {
  provider_phone: string;
  customer_phone: string;
  customer_name: string;
}

interface DirectChatMessage {
  id: string;
  thread_key: string;
  target_id: string; // e.g. "service:<id>" or "shop:<userId>"
  buyer_phone: string;
  seller_phone: string;
  sender_phone: string;
  message: string;
  read_by_recipient: boolean;
  created_at: string;
}

interface StoredOffer extends ItemOffer {
  buyer_phone: string;
  seller_phone: string;
}

interface StoredRating extends RatingRecord {
  rater_phone: string;
}

interface StoredWantAlert extends WantAlert {
  user_phone: string;
}

export interface StoredEscrowOrder extends EscrowOrder {
  buyer_phone: string;
  seller_phone: string;
}

export interface StoredPromotionFee {
  id: string;
  fee_type: 'boost_item' | 'feature_shop' | 'advertise_service';
  target_id: string;
  seller_phone: string;
  amount: number;
  reference: string;
  created_at: string;
}

interface MetaStore {
  user_profiles: Record<string, ExtendedUserProfile>;
  blocked_users: Record<string, { blocked: boolean; block_count: number }>;
  item_moderation: Record<string, ExtendedItemMeta>;
  message_meta: Record<string, { sender_phone: string; read_by_recipient: boolean }>;
  service_messages: DirectChatMessage[];
  wishlists: Record<string, string[]>;
  offers: StoredOffer[];
  ratings: StoredRating[];
  want_alerts: StoredWantAlert[];
  services: StoredService[];
  bookings: StoredBooking[];
  orders: StoredEscrowOrder[];
  promotion_fees: StoredPromotionFee[];
  reports: DbReport[];
  chat_moderation: Record<string, { attempts: number; blocked_until?: number }>;
  ad_settings: AdSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const META_FILE = path.join(DATA_DIR, 'mart-meta.json');
const SESSION_SECRET = process.env.SESSION_SECRET || 'afri-student-mart-jokey-perky-group-2026';

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) {
    return '0' + digits.slice(3);
  }
  return digits;
}

export function toWhatsAppDigits(countryCode: string | undefined, phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const cc = (countryCode || '+234').replace(/\D/g, '') || '234';
  if (digits.startsWith(cc) && digits.length > cc.length + 5) return digits;
  if (digits.startsWith('0')) return `${cc}${digits.slice(1)}`;
  return `${cc}${digits}`;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  if (!stored.includes(':')) return password === stored;
  const [salt, hash] = stored.split(':');
  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
  } catch {
    return password === stored;
  }
}

export function signSessionToken(phone: string): string {
  const payload = Buffer.from(JSON.stringify({ phone, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { phone?: string };
    return parsed.phone || null;
  } catch {
    return null;
  }
}

const BANK_OR_MOMO_KEYWORDS = [
  'opay',
  'palmpay',
  'kuda',
  'moniepoint',
  'gtb',
  'gtbank',
  'guaranty trust',
  'zenith',
  'access bank',
  'first bank',
  'uba',
  'wema',
  'fidelity',
  'sterling',
  'ecobank',
  'stanbic',
  'fnb',
  'capitec',
  'absa',
  'mtn momo',
  'momo',
  'airtel money',
  'orange money',
  'wave',
];

const ACCOUNT_PHRASES = [
  'account number',
  'acct no',
  'acct number',
  'account no',
  'my account',
  'my acct',
  'send to',
  'transfer to',
  'pay to',
  'deposit to',
  'my bank',
  'bank account',
  'compte bancaire',
  'numero de compte',
];

/**
 * Chat Rule:
 * - ALLOW normal phone numbers & WhatsApp (+234..., 080..., wa.me/..., "WhatsApp me...")
 * - BLOCK ONLY account numbers (bank/MoMo keywords + digits, account phrases + digits, or standalone/spaced/dashed 10-digit bank NUBANs)
 */
export function detectAccountNumberInChat(text: string): string | null {
  const lower = text.toLowerCase();
  const hasPriceWord = /(₦|gh₵|cfa|\br\s*\d|\$|ngn|ghs|zar|xof|naira|cedis)/i.test(text);

  // 1. Bank/MoMo keyword or account/transfer phrase combined with 6+ digits anywhere
  const digitRuns = text.match(/(?:\d[\s\-]*){6,14}/g) || [];
  const hasBankKw = BANK_OR_MOMO_KEYWORDS.some((kw) => lower.includes(kw));
  const hasAcctPhrase = ACCOUNT_PHRASES.some((ph) => lower.includes(ph));
  if ((hasBankKw || hasAcctPhrase) && digitRuns.length > 0) {
    return text.slice(0, 80);
  }

  // Strip wa.me links and +-prefixed international phone numbers before standalone NUBAN check
  const withoutSafeLinks = text
    .replace(/https?:\/\/wa\.me\/\d+/gi, ' ')
    .replace(/\+\d[\d\s\-]{7,16}\d/g, ' ');

  // 2. Spaced or dashed 10-digit NUBAN tricks like "0123 456 789" or "0123-456-789"
  const spacedNuban = withoutSafeLinks.match(/\b\d{3,4}[\s\-]\d{3,4}[\s\-]\d{2,4}\b/g);
  if (spacedNuban && !hasPriceWord) {
    for (const seg of spacedNuban) {
      const len = seg.replace(/\D/g, '').length;
      if (len === 10) return seg;
    }
  }

  // 3. Standalone 10-digit NUBAN (does NOT match 11-digit Nigerian mobile numbers 070/080/081/090/091)
  if (!hasPriceWord) {
    const tenDigit = withoutSafeLinks.match(/(?:^|\D)(\d{10})(?:\D|$)/);
    if (tenDigit && tenDigit[1]) {
      return tenDigit[1];
    }
  }

  return null;
}

export function containsBankAccountOrOffsitePay(text: string): boolean {
  return Boolean(detectAccountNumberInChat(text));
}

export function containsProhibitedContactInfo(text: string): boolean {
  return Boolean(detectAccountNumberInChat(text));
}

function inferItemCountry(
  institution?: string,
  location?: string,
  sellerCountry?: string,
  sellerDialCode?: string
): string {
  return inferCountryFromLocationText(institution, location, sellerCountry, sellerDialCode);
}

export function parsePhotos(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
      } catch {
        // Fallback below
      }
    }
    return [trimmed];
  }
  return [];
}

let supabaseInstance: SupabaseClient | null = null;
let lastSupabaseError = '';

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL_VALUE, SUPABASE_ANON_KEY_VALUE, {
      auth: { persistSession: false },
    });
  }
  return supabaseInstance;
}

function readMeta(): MetaStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(META_FILE)) {
    const initial: MetaStore = {
      user_profiles: {},
      blocked_users: {},
      item_moderation: {},
      message_meta: {},
      service_messages: [],
      wishlists: {},
      offers: [],
      ratings: [],
      want_alerts: [],
      services: [],
      bookings: [],
      orders: [],
      promotion_fees: [],
      reports: [],
      chat_moderation: {},
      ad_settings: {
        ads_enabled: false,
        interstitial_enabled: false,
        publisher_id: '',
        banner_unit_id: '',
        feed_unit_id: '',
        interstitial_unit_id: '',
        sidebar_unit_id: '',
        google_ads_earnings: 0,
        paystack_public_key: '',
        paystack_split_code: '',
        admin_subaccount_code: '',
      },
    };
    fs.writeFileSync(META_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  const parsed = JSON.parse(fs.readFileSync(META_FILE, 'utf8')) as Partial<MetaStore>;
  const hydrated: MetaStore = {
    user_profiles: parsed.user_profiles || {},
    blocked_users: parsed.blocked_users || {},
    item_moderation: parsed.item_moderation || {},
    message_meta: parsed.message_meta || {},
    service_messages: parsed.service_messages || [],
    wishlists: parsed.wishlists || {},
    offers: parsed.offers || [],
    ratings: parsed.ratings || [],
    want_alerts: parsed.want_alerts || [],
    services: (parsed.services || []).filter(
      (s) => s.id !== 'owner-laundry-service' && s.category?.toLowerCase() !== 'laundry'
    ),
    bookings: parsed.bookings || [],
    orders: parsed.orders || [],
    promotion_fees: parsed.promotion_fees || [],
    reports: parsed.reports || [],
    chat_moderation: parsed.chat_moderation || {},
    ad_settings: {
      ads_enabled: Boolean(parsed.ad_settings?.ads_enabled),
      interstitial_enabled: false,
      publisher_id: parsed.ad_settings?.publisher_id || '',
      banner_unit_id: parsed.ad_settings?.banner_unit_id || '',
      feed_unit_id: parsed.ad_settings?.feed_unit_id || '',
      interstitial_unit_id: parsed.ad_settings?.interstitial_unit_id || '',
      sidebar_unit_id: parsed.ad_settings?.sidebar_unit_id || '',
      google_ads_earnings: Number(parsed.ad_settings?.google_ads_earnings || 0),
      paystack_public_key: parsed.ad_settings?.paystack_public_key || '',
      paystack_split_code: parsed.ad_settings?.paystack_split_code || '',
      admin_subaccount_code: parsed.ad_settings?.admin_subaccount_code || '',
    },
  };
  return hydrated;
}

function writeMeta(meta: MetaStore) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
}

export function isUserBlocked(phone: string): boolean {
  const meta = readMeta();
  return Boolean(meta.blocked_users[normalizePhone(phone)]?.blocked);
}

function computeSellerTrust(
  meta: MetaStore,
  sellerId: string,
  sellerPhone: string
): { score: number; count: number } {
  const matching = meta.ratings.filter(
    (r) =>
      r.target_type === 'seller' &&
      (r.target_id === sellerId || r.target_id === sellerPhone)
  );
  if (matching.length === 0) return { score: 5.0, count: 0 };
  const sum = matching.reduce((acc, r) => acc + Number(r.score || 5), 0);
  return {
    score: Number((sum / matching.length).toFixed(1)),
    count: matching.length,
  };
}

function computeDistanceKm(
  item: { institution: string; location: string; market?: string },
  ctx?: { institution?: string; campus?: string; market?: string }
): number {
  const reqInst = (ctx?.institution || '').trim().toLowerCase();
  const reqCampus = (ctx?.campus || '').trim().toLowerCase();
  const reqMarket = (ctx?.market || '').trim().toLowerCase();
  const itemInst = (item.institution || '').trim().toLowerCase();
  const itemLoc = (item.location || '').trim().toLowerCase();
  const itemMkt = (item.market || '').trim().toLowerCase();

  if (reqCampus && (itemLoc.includes(reqCampus) || reqCampus.includes(itemLoc))) {
    return 0.5;
  }
  if (reqMarket && (itemMkt.includes(reqMarket) || itemLoc.includes(reqMarket))) {
    return 0.8;
  }
  if (reqInst && itemInst === reqInst) {
    return 1.4;
  }
  if (!reqInst && !reqCampus) {
    return 1.5;
  }
  return 6.8;
}

export function toPublicUser(user: DbUser, includePhone = false): PublicUser {
  const meta = readMeta();
  const blockInfo = meta.blocked_users[user.phone_number] || { blocked: false, block_count: 0 };
  const ext = meta.user_profiles[user.phone_number] || { badges: ['student'] };
  const trust = computeSellerTrust(meta, String(user.id), user.phone_number);
  return {
    id: String(user.id),
    full_name: user.full_name,
    ...(includePhone ? { phone_number: user.phone_number } : {}),
    country_code: ext.country_code || '+234',
    country: ext.country || getCountryByDialCode(ext.country_code).country,
    language: ext.language || 'English',
    role: user.role,
    badges: ext.badges?.length ? ext.badges : ['student'],
    institution: user.institution,
    level: ext.level,
    school_id_photo: includePhone ? ext.school_id_photo : undefined,
    id_doc_type: ext.id_doc_type,
    id_doc_number: includePhone ? ext.id_doc_number : undefined,
    business_reg_type: ext.business_reg_type,
    business_reg_number: includePhone ? ext.business_reg_number : undefined,
    secondary_reg_number: includePhone ? ext.secondary_reg_number : undefined,
    shop_name: ext.shop_name,
    market: ext.market,
    shop_doc_photo: includePhone ? ext.shop_doc_photo : undefined,
    service_category: ext.service_category,
    price_from: ext.price_from,
    work_photos: ext.work_photos,
    state: user.state,
    campus: user.campus,
    profile_pic: user.profile_pic || '',
    trust_score: trust.score,
    reviews_count: trust.count,
    blocked: Boolean(blockInfo.blocked),
    block_count: Number(blockInfo.block_count || 0),
    ...(includePhone && ext.paystack_subaccount_code
      ? {
          paystack_subaccount_code: ext.paystack_subaccount_code,
          payout_bank_name: ext.payout_bank_name,
          payout_account_name: ext.payout_account_name,
          payout_account_last4: ext.payout_account_number
            ? ext.payout_account_number.slice(-4)
            : undefined,
        }
      : {}),
    created_at: user.created_at || new Date().toISOString(),
  };
}

export async function provisionSellerPaystackSubaccount(input: {
  phone: string;
  business_name: string;
  bank_name: string;
  account_number: string;
  account_name: string;
}): Promise<{
  subaccount_code: string;
  bank_name: string;
  account_name: string;
  account_last4: string;
}> {
  const cleanAcct = input.account_number.replace(/\D/g, '');
  if (cleanAcct.length < 8 || cleanAcct.length > 14) {
    throw new Error('Enter a valid bank account number (8-14 digits) for Paystack Payouts.');
  }
  if (!input.bank_name.trim() || !input.account_name.trim()) {
    throw new Error('Enter both Bank Name and Account Name for Paystack Payouts.');
  }

  let subaccountCode = '';
  const paystackSecret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  if (paystackSecret.startsWith('sk_')) {
    try {
      const resp = await fetch('https://api.paystack.co/subaccount', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_name: input.business_name.trim() || input.account_name.trim(),
          settlement_bank: input.bank_name.trim(),
          account_number: cleanAcct,
          percentage_charge: 7, // Owner keeps 7%, Seller keeps 93%
          description: `Afri Student Mart seller payout for ${input.phone}`,
        }),
      });
      const json = (await resp.json().catch(() => ({}))) as {
        status?: boolean;
        data?: { subaccount_code?: string };
      };
      if (json.status && json.data?.subaccount_code) {
        subaccountCode = json.data.subaccount_code;
      }
    } catch {
      // Fallback below if network/bank code lookup requires live secret key
    }
  }

  if (!subaccountCode) {
    const hash = crypto
      .createHash('sha256')
      .update(`${input.phone}:${input.bank_name}:${cleanAcct}`)
      .digest('hex')
      .slice(0, 10);
    subaccountCode = `ACCT_asm${hash}`;
  }

  const norm = normalizePhone(input.phone);
  const meta = readMeta();
  const prev = meta.user_profiles[norm] || { badges: ['student'] };
  meta.user_profiles[norm] = {
    ...prev,
    paystack_subaccount_code: subaccountCode,
    payout_bank_name: input.bank_name.trim(),
    payout_account_number: cleanAcct,
    payout_account_name: input.account_name.trim(),
  };
  writeMeta(meta);

  return {
    subaccount_code: subaccountCode,
    bank_name: input.bank_name.trim(),
    account_name: input.account_name.trim(),
    account_last4: cleanAcct.slice(-4),
  };
}

export async function ensureOwnerSeededInSupabase(): Promise<void> {
  const sb = getSupabase();
  const { data: ownerRow, error: checkErr } = await sb
    .from('users')
    .select('id, password, full_name, role')
    .eq('phone_number', OWNER_PHONE)
    .maybeSingle();

  if (checkErr) {
    lastSupabaseError = checkErr.message;
    console.warn('Supabase users check:', checkErr.message);
    return;
  }

  lastSupabaseError = '';
  if (!ownerRow) {
    const { error: insertErr } = await sb.from('users').insert({
      full_name: 'JOKEY PERKY GROUP',
      phone_number: OWNER_PHONE,
      password: hashPassword(DEFAULT_OWNER_PASS),
      role: 'owner',
      institution: 'University of Lagos (UNILAG)',
      state: 'Lagos',
      campus: 'Akoka Main Campus',
      profile_pic: '',
    });
    if (insertErr) {
      lastSupabaseError = insertErr.message;
    }
  } else {
    const row = ownerRow as { id: string; password: string; full_name: string; role: string };
    if (
      !verifyPassword(DEFAULT_OWNER_PASS, row.password) ||
      row.role !== 'owner' ||
      !isAuthorizedOwnerName(row.full_name)
    ) {
      await sb
        .from('users')
        .update({
          password: hashPassword(DEFAULT_OWNER_PASS),
          full_name: 'JOKEY PERKY GROUP',
          role: 'owner',
        })
        .eq('id', row.id);
    }
  }
}

export async function getSupabaseHealth() {
  const sb = getSupabase();
  const { error } = await sb.from('users').select('id').limit(1);
  if (error) {
    lastSupabaseError = error.message;
  } else {
    lastSupabaseError = '';
  }
  return {
    supabase_url: SUPABASE_URL_VALUE,
    anon_key_configured: Boolean(SUPABASE_ANON_KEY_VALUE),
    schema_ready: !error,
    storage_mode: 'supabase',
    last_error: lastSupabaseError || null,
  };
}

export async function getUserByPhone(phone: string): Promise<DbUser | null> {
  const normalized = normalizePhone(phone);
  const sb = getSupabase();
  const { data, error } = await sb
    .from('users')
    .select('*')
    .eq('phone_number', normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DbUser) || null;
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from('users').select('*').eq('id', id).maybeSingle();
  if (error) return null;
  return (data as DbUser) || null;
}

export async function createUser(input: {
  full_name: string;
  phone_number: string;
  country_code?: string;
  country?: string;
  language?: string;
  password: string;
  account_type: AccountBadge;
  role: 'buyer' | 'seller';
  institution: string;
  level?: string;
  school_id_photo?: string;
  id_doc_type?: string;
  id_doc_number?: string;
  business_reg_type?: string;
  business_reg_number?: string;
  secondary_reg_number?: string;
  shop_name?: string;
  market?: string;
  shop_doc_photo?: string;
  service_category?: string;
  price_from?: number;
  work_photos?: string[];
  state: string;
  campus: string;
  profile_pic?: string;
  payout_bank_name?: string;
  payout_account_number?: string;
  payout_account_name?: string;
}): Promise<DbUser> {
  const phone = normalizePhone(input.phone_number);
  if (phone === OWNER_PHONE || isAuthorizedOwnerName(input.full_name)) {
    throw new Error('This name or phone number is reserved for the Platform Owner.');
  }
  const existing = await getUserByPhone(phone);
  if (existing) {
    throw new Error('An account with this phone number already exists. Please log in.');
  }

  const derivedRole: 'buyer' | 'seller' =
    input.account_type === 'trader' || input.account_type === 'service_provider'
      ? 'seller'
      : input.role === 'seller'
      ? 'seller'
      : 'buyer';

  const sb = getSupabase();
  const { data, error } = await sb
    .from('users')
    .insert({
      full_name: input.full_name.trim(),
      phone_number: phone,
      password: hashPassword(input.password),
      role: derivedRole,
      institution: (input.institution || input.market || input.campus || 'Campus').trim(),
      state: (input.state || 'Lagos').trim(),
      campus: (input.campus || input.market || input.institution || 'Main Area').trim(),
      profile_pic: input.profile_pic || '',
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  const saved = data as DbUser;

  const resolvedCountry = input.country
    ? getCountryConfig(input.country).country
    : getCountryByDialCode(input.country_code).country;

  const meta = readMeta();
  meta.user_profiles[phone] = {
    country_code: input.country_code || getCountryConfig(resolvedCountry).dialCode,
    country: resolvedCountry,
    language: input.language || 'English',
    badges: [input.account_type],
    level: input.level,
    school_id_photo: input.school_id_photo,
    id_doc_type: input.id_doc_type,
    id_doc_number: input.id_doc_number,
    business_reg_type: input.business_reg_type,
    business_reg_number: input.business_reg_number,
    secondary_reg_number: input.secondary_reg_number,
    shop_name: input.shop_name,
    market: input.market,
    shop_doc_photo: input.shop_doc_photo,
    shop_photo: input.shop_doc_photo || input.profile_pic || '',
    shop_rating: 5.0,
    shop_sales: 0,
    shop_featured: false,
    service_category: input.service_category,
    price_from: input.price_from,
    work_photos: input.work_photos || [],
  };
  writeMeta(meta);

  if (input.payout_bank_name && input.payout_account_number) {
    await provisionSellerPaystackSubaccount({
      phone,
      business_name: input.shop_name || saved.full_name,
      bank_name: input.payout_bank_name,
      account_number: input.payout_account_number,
      account_name: input.payout_account_name || saved.full_name,
    });
  }

  const latestMeta = readMeta();

  // If signing up as a Service Provider, automatically create their public Service listing
  if (input.account_type === 'service_provider' && input.service_category) {
    const svc: StoredService = {
      id: crypto.randomUUID(),
      provider_phone: phone,
      provider_name: saved.full_name,
      profile_pic: saved.profile_pic || '',
      category: input.service_category,
      title: `${saved.full_name} — ${input.service_category}`,
      description: `Verified ${input.service_category} provider around ${saved.campus}. Fast, reliable campus service.`,
      price_from: Number(input.price_from || 1500),
      location: saved.campus,
      distance_km: 0.5,
      work_photos: input.work_photos || [],
      offerings: [
        {
          name: `Standard ${input.service_category}`,
          price: Number(input.price_from || 1500),
          duration: '1 - 2 hrs',
        },
      ],
      reviews: [],
      badges: ['service_provider'],
      is_advertised: false,
      created_at: new Date().toISOString(),
    };
    latestMeta.services.unshift(svc);
    // Try syncing to optional Supabase services table if present
    await sb.from('services').insert({
      provider_phone: phone,
      provider_name: saved.full_name,
      category: input.service_category,
      title: svc.title,
      description: svc.description,
      price_from: svc.price_from,
      location: svc.location,
      work_photos: JSON.stringify(svc.work_photos),
    });
  }

  // Try syncing to optional Supabase shops table if trader
  if (input.account_type === 'trader' && input.shop_name) {
    await sb.from('shops').upsert(
      {
        owner_phone: phone,
        shop_name: input.shop_name,
        market: input.market || saved.campus,
        shop_photo: input.shop_doc_photo || saved.profile_pic || '',
        doc_photo: input.shop_doc_photo || '',
      },
      { onConflict: 'owner_phone' }
    );
  }

  writeMeta(latestMeta);
  return saved;
}

export async function updateUserProfile(
  phone: string,
  updates: Partial<PublicUser> & { password?: string }
): Promise<DbUser> {
  const normalized = normalizePhone(phone);
  const safeUpdates: Record<string, unknown> = {};
  if (updates.full_name) safeUpdates.full_name = updates.full_name.trim();
  if (updates.role && normalized !== OWNER_PHONE && (updates.role === 'buyer' || updates.role === 'seller')) {
    safeUpdates.role = updates.role;
  }
  if (updates.institution) safeUpdates.institution = updates.institution.trim();
  if (updates.state) safeUpdates.state = updates.state.trim();
  if (updates.campus) safeUpdates.campus = updates.campus.trim();
  if (typeof updates.profile_pic === 'string') safeUpdates.profile_pic = updates.profile_pic;
  if (updates.password && updates.password.length >= 4) safeUpdates.password = hashPassword(updates.password);

  const sb = getSupabase();
  let updatedRow: DbUser;
  if (Object.keys(safeUpdates).length > 0) {
    const { data, error } = await sb
      .from('users')
      .update(safeUpdates)
      .eq('phone_number', normalized)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    updatedRow = data as DbUser;
  } else {
    const existing = await getUserByPhone(normalized);
    if (!existing) throw new Error('User not found.');
    updatedRow = existing;
  }

  // Update extended badges/shop/service metadata
  const meta = readMeta();
  const prev = meta.user_profiles[normalized] || { badges: ['student'] };
  const nextBadges = Array.isArray(updates.badges)
    ? (updates.badges.slice(0, 2) as AccountBadge[])
    : prev.badges;

  meta.user_profiles[normalized] = {
    ...prev,
    badges: nextBadges.length ? nextBadges : ['student'],
    ...(updates.country_code ? { country_code: updates.country_code } : {}),
    ...(updates.country ? { country: updates.country } : {}),
    ...(updates.language ? { language: updates.language } : {}),
    ...(updates.level !== undefined ? { level: updates.level } : {}),
    ...(updates.school_id_photo !== undefined ? { school_id_photo: updates.school_id_photo } : {}),
    ...(updates.id_doc_type !== undefined ? { id_doc_type: updates.id_doc_type } : {}),
    ...(updates.id_doc_number !== undefined ? { id_doc_number: updates.id_doc_number } : {}),
    ...(updates.business_reg_type !== undefined ? { business_reg_type: updates.business_reg_type } : {}),
    ...(updates.business_reg_number !== undefined ? { business_reg_number: updates.business_reg_number } : {}),
    ...(updates.secondary_reg_number !== undefined ? { secondary_reg_number: updates.secondary_reg_number } : {}),
    ...(updates.shop_name !== undefined ? { shop_name: updates.shop_name } : {}),
    ...(updates.market !== undefined ? { market: updates.market } : {}),
    ...(updates.shop_doc_photo !== undefined ? { shop_doc_photo: updates.shop_doc_photo } : {}),
    ...(updates.service_category !== undefined ? { service_category: updates.service_category } : {}),
    ...(updates.price_from !== undefined ? { price_from: Number(updates.price_from) } : {}),
    ...(updates.work_photos !== undefined ? { work_photos: updates.work_photos } : {}),
  };

  // If user added service_provider badge and has no service yet, auto-create one
  if (
    meta.user_profiles[normalized].badges.includes('service_provider') &&
    updates.service_category &&
    !meta.services.some((s) => s.provider_phone === normalized)
  ) {
    meta.services.unshift({
      id: crypto.randomUUID(),
      provider_phone: normalized,
      provider_name: updatedRow.full_name,
      profile_pic: updatedRow.profile_pic || '',
      category: updates.service_category,
      title: `${updatedRow.full_name} — ${updates.service_category}`,
      description: `Verified ${updates.service_category} provider around ${updatedRow.campus}.`,
      price_from: Number(updates.price_from || 1500),
      location: updatedRow.campus,
      distance_km: 0.5,
      work_photos: updates.work_photos || [],
      offerings: [
        {
          name: `Standard ${updates.service_category}`,
          price: Number(updates.price_from || 1500),
          duration: '1 - 2 hrs',
        },
      ],
      reviews: [],
      badges: meta.user_profiles[normalized].badges,
      is_advertised: false,
      created_at: new Date().toISOString(),
    });
  }

  // Sync badges to any existing services owned by this user
  for (const s of meta.services) {
    if (s.provider_phone === normalized) {
      s.badges = meta.user_profiles[normalized].badges;
      s.provider_name = updatedRow.full_name;
      s.profile_pic = updatedRow.profile_pic || '';
    }
  }

  writeMeta(meta);

  const payoutUpdates = updates as Partial<PublicUser> & { payout_account_number?: string };
  if (payoutUpdates.payout_bank_name && payoutUpdates.payout_account_number) {
    await provisionSellerPaystackSubaccount({
      phone: normalized,
      business_name: updatedRow.full_name,
      bank_name: payoutUpdates.payout_bank_name,
      account_number: payoutUpdates.payout_account_number,
      account_name: payoutUpdates.payout_account_name || updatedRow.full_name,
    });
  }

  return updatedRow;
}

export async function listActiveItems(filters?: {
  search?: string;
  category?: string;
  condition?: string;
  institution?: string;
  market?: string;
  state?: string;
  country?: string;
  sellerId?: string;
  lite?: boolean;
  filterMode?: 'all' | 'students' | 'traders' | 'my_school' | 'my_market' | 'within_2km';
  requesterInstitution?: string;
  requesterCampus?: string;
  requesterMarket?: string;
  sort?: 'latest' | 'cheapest';
}): Promise<MarketplaceItem[]> {
  const sb = getSupabase();
  const [itemsRes, usersRes] = await Promise.all([
    sb.from('items').select('*').order('created_at', { ascending: false }),
    sb.from('users').select('id,full_name,phone_number,role,institution,state,campus,profile_pic,created_at'),
  ]);

  if (itemsRes.error) throw new Error(itemsRes.error.message);
  if (usersRes.error) throw new Error(usersRes.error.message);

  const items = (itemsRes.data as DbItem[]) || [];
  const users = (usersRes.data as DbUser[]) || [];
  const meta = readMeta();

  const userMap = new Map(users.map((u) => [u.phone_number, u]));
  const sellerCountMap = new Map<string, number>();
  for (const it of items) {
    const mod = meta.item_moderation[String(it.id)];
    if (mod?.status === 'removed') continue;
    sellerCountMap.set(it.seller_phone, (sellerCountMap.get(it.seller_phone) || 0) + 1);
  }

  let mapped: MarketplaceItem[] = items
    .filter((item) => {
      const mod = meta.item_moderation[String(item.id)];
      if (mod?.status === 'removed') return false;
      const sellerBlock = meta.blocked_users[item.seller_phone];
      if (sellerBlock?.blocked) return false;
      return true;
    })
    .map((item) => {
      const seller = userMap.get(item.seller_phone);
      const ext = meta.user_profiles[item.seller_phone];
      const mod = meta.item_moderation[String(item.id)];
      const fullPhotos = parsePhotos(item.photos);
      const thumbs = mod?.thumbnails?.length ? mod.thumbnails : fullPhotos.slice(0, 1);
      const sellerId = seller ? String(seller.id) : item.seller_phone;
      const trust = computeSellerTrust(meta, sellerId, item.seller_phone);
      const distKm = computeDistanceKm(
        { institution: item.institution, location: item.location, market: ext?.market },
        {
          institution: filters?.requesterInstitution,
          campus: filters?.requesterCampus,
          market: filters?.requesterMarket,
        }
      );
      const itemCountry =
        mod?.country ||
        inferItemCountry(item.institution, item.location, ext?.country, ext?.country_code);
      const itemCountryCode = mod?.country_code || getCountryConfig(itemCountry).dialCode;

      return {
        id: String(item.id),
        title: item.title,
        category: item.category,
        price: Number(item.price),
        condition: item.condition,
        description: item.description,
        photos: filters?.lite ? thumbs.slice(0, 1) : fullPhotos,
        thumbnails: thumbs,
        video_url: filters?.lite ? '' : mod?.video_url || '',
        make_offer: mod?.make_offer ?? true,
        pay_on_delivery: mod?.pay_on_delivery ?? true,
        is_boosted: Boolean(mod?.is_boosted),
        seller_id: sellerId,
        seller_name: seller?.full_name || 'Campus Student',
        seller_profile_pic: seller?.profile_pic || '',
        seller_institution: seller?.institution || item.institution,
        seller_badges: ext?.badges?.length ? ext.badges : ['student'],
        seller_shop_name: ext?.shop_name,
        seller_market: ext?.market,
        seller_level: ext?.level,
        seller_rating: trust.score,
        seller_reviews_count: trust.count,
        seller_joined_at: seller?.created_at || item.created_at,
        seller_items_count: sellerCountMap.get(item.seller_phone) || 1,
        seller_subaccount_code: ext?.paystack_subaccount_code,
        institution: item.institution,
        location: item.location,
        state: seller?.state || '',
        country: itemCountry,
        country_code: itemCountryCode,
        distance_km: distKm,
        is_featured: Boolean(mod?.is_featured),
        report_count: Number(mod?.report_count || 0),
        status: 'active',
        created_at: item.created_at || new Date().toISOString(),
      };
    });

  if (filters?.sort === 'cheapest') {
    mapped.sort((a, b) => a.price - b.price);
  } else {
    // Boosted & featured items float cleanly to the top
    mapped.sort((a, b) => {
      const aScore = (a.is_boosted ? 2 : 0) + (a.is_featured ? 1 : 0);
      const bScore = (b.is_boosted ? 2 : 0) + (b.is_featured ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  if (filters?.filterMode === 'students') {
    mapped = mapped.filter((i) => i.seller_badges.includes('student'));
  } else if (filters?.filterMode === 'traders') {
    mapped = mapped.filter((i) => i.seller_badges.includes('trader') || Boolean(i.seller_shop_name));
  } else if (filters?.filterMode === 'my_school' && filters.requesterInstitution) {
    const reqInst = filters.requesterInstitution.toLowerCase();
    mapped = mapped.filter((i) => i.institution.toLowerCase() === reqInst);
  } else if (filters?.filterMode === 'my_market') {
    const reqMkt = (filters.requesterMarket || filters.requesterCampus || '').trim().toLowerCase();
    mapped = mapped.filter((i) => {
      if (reqMkt) {
        return (
          (i.seller_market || '').toLowerCase().includes(reqMkt) ||
          i.location.toLowerCase().includes(reqMkt) ||
          Boolean(i.seller_shop_name)
        );
      }
      return Boolean(i.seller_market || i.seller_shop_name);
    });
  } else if (filters?.filterMode === 'within_2km') {
    mapped = mapped.filter((i) => (i.distance_km ?? 99) <= 2.0);
  }

  if (filters?.country && filters.country !== 'All') {
    const targetCountry = getCountryConfig(filters.country).country.toLowerCase();
    mapped = mapped.filter((i) => (i.country || 'Nigeria').toLowerCase() === targetCountry);
  }

  if (filters?.state && filters.state !== 'All') {
    const sLower = filters.state.trim().toLowerCase();
    const sCore = sLower.split('(')[0].trim();
    mapped = mapped.filter((i) => {
      const hay = `${i.state || ''} ${i.location || ''} ${i.institution || ''}`.toLowerCase();
      return hay.includes(sLower) || (sCore.length >= 3 && hay.includes(sCore));
    });
  }

  if (filters?.category && filters.category !== 'All') {
    const targetCat = filters.category;
    mapped = mapped.filter((i) => {
      if (i.category === targetCat) return true;
      const ic = i.category.toLowerCase();
      const t = targetCat.toLowerCase();
      if (t === 'shoes') return ic.includes('shoe') || ic === 'fashion / clothes / shoes' || ic === 'fashion';
      if (t === 'clothes') return ic.includes('clothe') || ic.includes('fashion');
      if (t === 'fashion') return ic.includes('fashion') || ic.includes('cloth') || ic.includes('shoe');
      if (t === 'phones') return ic.includes('phone');
      if (t === 'electronics') return ic.includes('electronic') || ic.includes('laptop') || ic.includes('phone');
      if (t === 'food') return ic.includes('food');
      if (t === 'foodstuff') return ic.includes('food');
      if (t === 'books') return ic.includes('book');
      if (t === 'hostel items') return ic.includes('hostel');
      return false;
    });
  }
  if (filters?.condition && filters.condition !== 'All') {
    mapped = mapped.filter((i) => i.condition === filters.condition);
  }
  if (filters?.institution && filters.institution !== 'All') {
    mapped = mapped.filter((i) => i.institution === filters.institution);
  }
  if (filters?.market && filters.market.trim()) {
    const m = filters.market.trim().toLowerCase();
    const core = m.replace(/\s+market$/i, '').trim();
    const genericCores = new Set(['central', 'new', 'relief', 'monday', 'big', 'kara', 'old']);
    const useCore = core.length >= 4 && !genericCores.has(core);
    mapped = mapped.filter((i) => {
      const fields = [
        i.seller_market || '',
        i.location || '',
        i.institution || '',
        i.seller_shop_name || '',
      ]
        .join(' ')
        .toLowerCase();
      return fields.includes(m) || (useCore && fields.includes(core));
    });
  }
  if (filters?.sellerId) {
    mapped = mapped.filter((i) => i.seller_id === filters.sellerId);
  }
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    mapped = mapped.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.institution.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        (i.seller_shop_name || '').toLowerCase().includes(q) ||
        (i.seller_market || '').toLowerCase().includes(q) ||
        String(i.price).includes(q)
    );
  }

  return mapped;
}

export async function getItemById(itemId: string): Promise<MarketplaceItem | null> {
  const sb = getSupabase();
  const { data: itemData, error } = await sb.from('items').select('*').eq('id', itemId).maybeSingle();
  if (error || !itemData) return null;
  const item = itemData as DbItem;
  const meta = readMeta();
  const mod = meta.item_moderation[String(item.id)];
  if (mod?.status === 'removed') return null;

  const { data: sellerData } = await sb
    .from('users')
    .select('*')
    .eq('phone_number', item.seller_phone)
    .maybeSingle();
  const seller = (sellerData as DbUser) || null;
  const ext = meta.user_profiles[item.seller_phone];
  const fullPhotos = parsePhotos(item.photos);

  const { count } = await sb
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('seller_phone', item.seller_phone);

  const sellerId = seller ? String(seller.id) : item.seller_phone;
  const trust = computeSellerTrust(meta, sellerId, item.seller_phone);

  const itemCountry =
    mod?.country ||
    inferItemCountry(item.institution, item.location, ext?.country, ext?.country_code);
  const itemCountryCode = mod?.country_code || getCountryConfig(itemCountry).dialCode;

  return {
    id: String(item.id),
    title: item.title,
    category: item.category,
    price: Number(item.price),
    condition: item.condition,
    description: item.description,
    photos: fullPhotos,
    thumbnails: mod?.thumbnails?.length ? mod.thumbnails : fullPhotos.slice(0, 1),
    video_url: mod?.video_url || '',
    make_offer: mod?.make_offer ?? true,
    pay_on_delivery: mod?.pay_on_delivery ?? true,
    is_boosted: Boolean(mod?.is_boosted),
    seller_id: sellerId,
    seller_name: seller?.full_name || 'Campus Student',
    seller_profile_pic: seller?.profile_pic || '',
    seller_institution: seller?.institution || item.institution,
    seller_badges: ext?.badges?.length ? ext.badges : ['student'],
    seller_shop_name: ext?.shop_name,
    seller_market: ext?.market,
    seller_level: ext?.level,
    seller_rating: trust.score,
    seller_reviews_count: trust.count,
    seller_joined_at: seller?.created_at || item.created_at,
    seller_items_count: count || 1,
    seller_subaccount_code: ext?.paystack_subaccount_code,
    institution: item.institution,
    location: item.location,
    country: itemCountry,
    country_code: itemCountryCode,
    is_featured: Boolean(mod?.is_featured),
    report_count: Number(mod?.report_count || 0),
    status: 'active',
    created_at: item.created_at || new Date().toISOString(),
  };
}

function itemMatchesWantAlert(
  item: { title: string; description: string; price: number },
  alert: { keyword: string; max_price: number }
): boolean {
  if (Number(item.price) > Number(alert.max_price)) return false;
  const tokens = alert.keyword
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return false;
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  return tokens.every((tok) => haystack.includes(tok));
}

export async function createItem(input: {
  title: string;
  category: string;
  price: number;
  condition: ItemCondition;
  description: string;
  photos: string[];
  thumbnails?: string[];
  video_url?: string;
  make_offer?: boolean;
  pay_on_delivery?: boolean;
  seller_phone: string;
  institution: string;
  location: string;
  country?: string;
}): Promise<{ item: MarketplaceItem; alert_notifications: Array<{ user_phone: string; match: WantAlertMatch }> }> {
  const sb = getSupabase();
  const sellerPhone = normalizePhone(input.seller_phone);
  const cleanPhotos = input.photos.slice(0, 4);
  const cleanThumbs = (input.thumbnails || []).slice(0, 4);

  const { data, error } = await sb
    .from('items')
    .insert({
      title: input.title.trim(),
      category: input.category,
      price: Number(input.price),
      condition: input.condition,
      description: input.description.trim(),
      photos: JSON.stringify(cleanPhotos),
      seller_phone: sellerPhone,
      institution: input.institution.trim(),
      location: input.location.trim(),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const saved = data as DbItem;
  const seller = await getUserByPhone(sellerPhone);
  const meta = readMeta();
  const ext = meta.user_profiles[sellerPhone];
  const resolvedCountry = input.country
    ? getCountryConfig(input.country).country
    : inferItemCountry(input.institution, input.location, ext?.country, ext?.country_code);
  const resolvedCountryCode = getCountryConfig(resolvedCountry).dialCode;

  meta.item_moderation[String(saved.id)] = {
    is_featured: false,
    is_boosted: false,
    make_offer: input.make_offer ?? true,
    pay_on_delivery: input.pay_on_delivery ?? true,
    thumbnails: cleanThumbs.length ? cleanThumbs : cleanPhotos.slice(0, 1),
    video_url: input.video_url || '',
    country: resolvedCountry,
    country_code: resolvedCountryCode,
    report_count: 0,
    status: 'active',
  };

  // Match buyer "I Want This / Price Drop" alerts immediately
  const alertNotifications: Array<{ user_phone: string; match: WantAlertMatch }> = [];
  for (const alert of meta.want_alerts) {
    if (alert.user_phone === sellerPhone) continue;
    if (
      itemMatchesWantAlert(
        { title: saved.title, description: saved.description, price: Number(saved.price) },
        alert
      )
    ) {
      const match: WantAlertMatch = {
        item_id: String(saved.id),
        item_title: saved.title,
        item_price: Number(saved.price),
        seller_name: seller?.full_name || 'Campus Seller',
        institution: saved.institution,
        matched_at: new Date().toISOString(),
      };
      alert.matches.unshift(match);
      alertNotifications.push({ user_phone: alert.user_phone, match });
    }
  }
  writeMeta(meta);

  // Also mirror into optional products table if present
  await sb.from('products').insert({
    title: saved.title,
    category: saved.category,
    price: saved.price,
    condition: saved.condition,
    description: saved.description,
    photos: JSON.stringify(cleanPhotos),
    video_url: input.video_url || '',
    seller_phone: sellerPhone,
    institution: saved.institution,
    location: saved.location,
    make_offer: input.make_offer ?? true,
    pay_on_delivery: input.pay_on_delivery ?? true,
  });

  const sellerId = seller ? String(seller.id) : sellerPhone;
  const trust = computeSellerTrust(meta, sellerId, sellerPhone);

  return {
    item: {
      id: String(saved.id),
      title: saved.title,
      category: saved.category,
      price: Number(saved.price),
      condition: saved.condition,
      description: saved.description,
      photos: parsePhotos(saved.photos),
      thumbnails: cleanThumbs.length ? cleanThumbs : cleanPhotos.slice(0, 1),
      video_url: input.video_url || '',
      make_offer: input.make_offer ?? true,
      pay_on_delivery: input.pay_on_delivery ?? true,
      is_boosted: false,
      seller_id: sellerId,
      seller_name: seller?.full_name || 'Campus Seller',
      seller_profile_pic: seller?.profile_pic || '',
      seller_institution: seller?.institution || saved.institution,
      seller_badges: ext?.badges?.length ? ext.badges : ['student'],
      seller_shop_name: ext?.shop_name,
      seller_market: ext?.market,
      seller_level: ext?.level,
      seller_rating: trust.score,
      seller_reviews_count: trust.count,
      seller_joined_at: seller?.created_at || saved.created_at,
      seller_items_count: 1,
      seller_subaccount_code: ext?.paystack_subaccount_code,
      institution: saved.institution,
      location: saved.location,
      country: resolvedCountry,
      country_code: resolvedCountryCode,
      is_featured: false,
      report_count: 0,
      status: 'active',
      created_at: saved.created_at || new Date().toISOString(),
    },
    alert_notifications: alertNotifications,
  };
}

export async function boostItem(
  itemId: string,
  requesterPhone: string,
  paystackReference?: string
): Promise<boolean> {
  const norm = normalizePhone(requesterPhone);
  const sb = getSupabase();
  const { data: item } = await sb.from('items').select('*').eq('id', itemId).maybeSingle();
  if (!item) throw new Error('Item not found.');
  if (norm !== OWNER_PHONE && item.seller_phone !== norm) {
    throw new Error('Only the seller or Owner can boost this item.');
  }
  if (norm !== OWNER_PHONE && !paystackReference) {
    throw new Error('Pay only on Afri Mart via Paystack to stay safe.');
  }
  const meta = readMeta();
  const current = meta.item_moderation[itemId] || {
    is_featured: false,
    is_boosted: false,
    make_offer: true,
    pay_on_delivery: true,
    video_url: '',
    report_count: 0,
    status: 'active' as const,
  };
  current.is_boosted = true;
  meta.item_moderation[itemId] = current;
  if (paystackReference) {
    const cleanRef = paystackReference.trim();
    if (!meta.promotion_fees.some((f) => f.reference === cleanRef)) {
      meta.promotion_fees.unshift({
        id: crypto.randomUUID(),
        fee_type: 'boost_item',
        target_id: itemId,
        seller_phone: norm,
        amount: 500,
        reference: cleanRef,
        created_at: new Date().toISOString(),
      });
    }
  }
  writeMeta(meta);
  return true;
}

export async function deleteItemAsSellerOrOwner(itemId: string, requesterPhone: string): Promise<void> {
  const normPhone = normalizePhone(requesterPhone);
  const sb = getSupabase();
  const { data: item, error: fetchErr } = await sb
    .from('items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!item) throw new Error('Item not found.');
  if (normPhone !== OWNER_PHONE && item.seller_phone !== normPhone) {
    throw new Error('Unauthorized to delete this item.');
  }

  const { error: delErr } = await sb.from('items').delete().eq('id', itemId);
  if (delErr) throw new Error(delErr.message);

  const meta = readMeta();
  delete meta.item_moderation[String(itemId)];
  writeMeta(meta);
}

export async function reportItem(
  itemId: string,
  reporterPhone: string,
  reason: string
): Promise<{ auto_removed: boolean; seller_locked: boolean; report_count: number }> {
  const normReporter = normalizePhone(reporterPhone);
  const sb = getSupabase();
  const { data: itemRow } = await sb.from('items').select('seller_phone').eq('id', itemId).maybeSingle();
  const sellerPhone = itemRow?.seller_phone ? normalizePhone(String(itemRow.seller_phone)) : '';

  const meta = readMeta();
  const duplicate = meta.reports.some(
    (r) => r.target_type === 'item' && r.target_id === itemId && r.reporter_phone === normReporter
  );
  if (duplicate) {
    const existingCount = Number(meta.item_moderation[itemId]?.report_count || 1);
    const isLocked = Boolean(sellerPhone && meta.blocked_users[sellerPhone]?.blocked);
    return { auto_removed: existingCount >= 3, seller_locked: isLocked, report_count: existingCount };
  }

  const report: DbReport = {
    id: crypto.randomUUID(),
    target_type: 'item',
    target_id: itemId,
    reporter_phone: normReporter,
    reason: reason.trim() || 'Suspicious or rule-breaking listing',
    resolved: false,
    created_at: new Date().toISOString(),
  };

  meta.reports.unshift(report);

  const current = meta.item_moderation[itemId] || {
    is_featured: false,
    is_boosted: false,
    make_offer: true,
    pay_on_delivery: true,
    video_url: '',
    report_count: 0,
    status: 'active' as const,
  };
  current.report_count += 1;
  let autoRemoved = false;
  let sellerLocked = false;

  if (sellerPhone && sellerPhone !== OWNER_PHONE) {
    const blockInfo = meta.blocked_users[sellerPhone] || { blocked: false, block_count: 0 };
    blockInfo.block_count += 1;
    if (blockInfo.block_count >= 3 || current.report_count >= 3) {
      blockInfo.blocked = true;
      sellerLocked = true;
    }
    meta.blocked_users[sellerPhone] = blockInfo;
  }

  if (current.report_count >= 3 || sellerLocked) {
    current.status = 'removed';
    autoRemoved = true;
  }
  meta.item_moderation[itemId] = current;
  writeMeta(meta);

  await sb.from('reports').insert({
    target_type: 'item',
    target_id: itemId,
    reporter_phone: normReporter,
    reason: report.reason,
  });

  if (autoRemoved) {
    await sb.from('items').delete().eq('id', itemId);
  }

  return {
    auto_removed: autoRemoved,
    seller_locked: sellerLocked,
    report_count: current.report_count,
  };
}

export async function blockOrReportUserById(
  targetUserId: string,
  reporterPhone: string,
  reason: string
): Promise<{ auto_suspended: boolean }> {
  const normReporter = normalizePhone(reporterPhone);
  const targetUser = await getUserById(targetUserId);
  if (!targetUser) throw new Error('User not found.');
  if (targetUser.phone_number === OWNER_PHONE) throw new Error('Cannot block platform owner.');

  const meta = readMeta();
  meta.reports.unshift({
    id: crypto.randomUUID(),
    target_type: 'user',
    target_id: targetUser.phone_number,
    reporter_phone: normReporter,
    reason: reason.trim() || 'Blocked / reported user for abuse or scam attempt',
    resolved: false,
    created_at: new Date().toISOString(),
  });

  const blockInfo = meta.blocked_users[targetUser.phone_number] || { blocked: false, block_count: 0 };
  blockInfo.block_count += 1;
  let autoSuspended = false;
  if (blockInfo.block_count >= 3) {
    blockInfo.blocked = true;
    autoSuspended = true;
  }
  meta.blocked_users[targetUser.phone_number] = blockInfo;
  writeMeta(meta);

  await getSupabase().from('reports').insert({
    target_type: 'user',
    target_id: targetUser.phone_number,
    reporter_phone: normReporter,
    reason: reason.trim() || 'Blocked user',
  });

  return { auto_suspended: autoSuspended };
}

// === WISHLIST ===
export function getWishlist(userPhone: string): string[] {
  const meta = readMeta();
  return meta.wishlists[normalizePhone(userPhone)] || [];
}

export async function toggleWishlist(userPhone: string, itemId: string): Promise<string[]> {
  const norm = normalizePhone(userPhone);
  const meta = readMeta();
  const list = meta.wishlists[norm] || [];
  const removing = list.includes(itemId);
  const next = removing ? list.filter((id) => id !== itemId) : [itemId, ...list];
  meta.wishlists[norm] = next;
  writeMeta(meta);

  const sb = getSupabase();
  if (removing) {
    await sb.from('wishlist').delete().eq('user_phone', norm).eq('item_id', itemId);
  } else {
    await sb.from('wishlist').upsert({ user_phone: norm, item_id: itemId }, { onConflict: 'user_phone,item_id' });
  }
  return next;
}

// === OFFERS / HAGGLE (CREATE, LIST, ACCEPT / REJECT / COUNTER) ===
export async function createOffer(input: {
  item_id: string;
  buyer_phone: string;
  offered_price: number;
}): Promise<ItemOffer> {
  const normBuyer = normalizePhone(input.buyer_phone);
  const sb = getSupabase();
  const [itemRes, buyer, usersRes] = await Promise.all([
    sb.from('items').select('id,title,price,seller_phone').eq('id', input.item_id).maybeSingle(),
    getUserByPhone(normBuyer),
    sb.from('users').select('id,full_name,phone_number'),
  ]);
  const sellerPhone = itemRes.data?.seller_phone ? normalizePhone(String(itemRes.data.seller_phone)) : '';
  const allUsers = (usersRes.data as Array<{ id: string; full_name: string; phone_number: string }>) || [];
  const sellerUser = allUsers.find((u) => u.phone_number === sellerPhone);

  const offer: StoredOffer = {
    id: crypto.randomUUID(),
    item_id: input.item_id,
    item_title: itemRes.data?.title || 'Item',
    item_price: Number(itemRes.data?.price || 0),
    buyer_id: buyer ? String(buyer.id) : normBuyer,
    buyer_phone: normBuyer,
    buyer_name: buyer?.full_name || 'Student',
    seller_id: sellerUser ? String(sellerUser.id) : sellerPhone,
    seller_phone: sellerPhone,
    seller_name: sellerUser?.full_name || 'Seller',
    offered_price: Number(input.offered_price),
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const meta = readMeta();
  meta.offers.unshift(offer);
  writeMeta(meta);

  await sb.from('offers').insert({
    item_id: offer.item_id,
    buyer_phone: normBuyer,
    seller_phone: sellerPhone,
    offered_price: offer.offered_price,
    status: 'pending',
  });

  return {
    id: offer.id,
    item_id: offer.item_id,
    item_title: offer.item_title,
    item_price: offer.item_price,
    buyer_id: offer.buyer_id,
    buyer_name: offer.buyer_name,
    seller_id: offer.seller_id,
    seller_name: offer.seller_name,
    offered_price: offer.offered_price,
    status: offer.status,
    created_at: offer.created_at,
  };
}

export function listOffersForUser(userPhone: string, itemId?: string): ItemOffer[] {
  const norm = normalizePhone(userPhone);
  const meta = readMeta();
  return meta.offers
    .filter((o) => {
      const involved = o.buyer_phone === norm || o.seller_phone === norm;
      if (!involved) return false;
      if (itemId && o.item_id !== itemId) return false;
      return true;
    })
    .map((o) => ({
      id: o.id,
      item_id: o.item_id,
      item_title: o.item_title,
      item_price: o.item_price,
      buyer_id: o.buyer_id,
      buyer_name: o.buyer_name,
      seller_id: o.seller_id,
      seller_name: o.seller_name,
      is_seller: o.seller_phone === norm,
      offered_price: o.offered_price,
      counter_price: o.counter_price,
      status: o.status,
      created_at: o.created_at,
    }));
}

export async function respondToOffer(input: {
  offer_id: string;
  actor_phone: string;
  action: 'accept' | 'reject' | 'counter';
  counter_price?: number;
}): Promise<{ offer: ItemOffer; recipient_phone: string; buyer_phone: string; seller_phone: string; chat_note: string }> {
  const normActor = normalizePhone(input.actor_phone);
  const meta = readMeta();
  const offer = meta.offers.find((o) => o.id === input.offer_id);
  if (!offer) throw new Error('Offer not found.');
  if (offer.seller_phone !== normActor && offer.buyer_phone !== normActor) {
    throw new Error('Unauthorized to respond to this offer.');
  }

  let chatNote = '';
  if (input.action === 'accept') {
    offer.status = 'accepted';
    const finalPrice = offer.counter_price || offer.offered_price;
    chatNote = `OFFER ACCEPTED at ₦${finalPrice.toLocaleString('en-NG')} for "${offer.item_title || 'Item'}". Let's arrange campus meetup!`;
  } else if (input.action === 'reject') {
    offer.status = 'rejected';
    chatNote = `OFFER DECLINED for "${offer.item_title || 'Item'}".`;
  } else if (input.action === 'counter') {
    const cPrice = Number(input.counter_price);
    if (!Number.isFinite(cPrice) || cPrice <= 0) {
      throw new Error('Enter a valid counter-offer price in Naira.');
    }
    offer.status = 'countered';
    offer.counter_price = cPrice;
    chatNote = `COUNTER-OFFER: Seller proposed ₦${cPrice.toLocaleString('en-NG')} for "${offer.item_title || 'Item'}". Accept or make another offer!`;
  }

  writeMeta(meta);

  await getSupabase()
    .from('offers')
    .update({
      status: offer.status,
      ...(offer.counter_price ? { counter_price: offer.counter_price } : {}),
    })
    .eq('item_id', offer.item_id)
    .eq('buyer_phone', offer.buyer_phone)
    .eq('offered_price', offer.offered_price);

  const recipientPhone = normActor === offer.seller_phone ? offer.buyer_phone : offer.seller_phone;
  return {
    offer: {
      id: offer.id,
      item_id: offer.item_id,
      item_title: offer.item_title,
      item_price: offer.item_price,
      buyer_id: offer.buyer_id,
      buyer_name: offer.buyer_name,
      seller_id: offer.seller_id,
      seller_name: offer.seller_name,
      is_seller: offer.seller_phone === normActor,
      offered_price: offer.offered_price,
      counter_price: offer.counter_price,
      status: offer.status,
      created_at: offer.created_at,
    },
    recipient_phone: recipientPhone,
    buyer_phone: offer.buyer_phone,
    seller_phone: offer.seller_phone,
    chat_note: chatNote,
  };
}

// === RATINGS & 5-SEC VIDEO REVIEWS ===
export function hasConfirmedOrderForItem(
  buyerPhone: string,
  itemId?: string,
  sellerIdOrPhone?: string
): boolean {
  const normBuyer = normalizePhone(buyerPhone);
  if (!normBuyer) return false;
  const meta = readMeta();
  return meta.orders.some((o) => {
    if (o.buyer_phone !== normBuyer) return false;
    if (o.order_status !== 'delivered_confirmed') return false;
    if (itemId && o.item_id === itemId) return true;
    if (!itemId && sellerIdOrPhone && (o.seller_id === sellerIdOrPhone || o.seller_phone === sellerIdOrPhone)) {
      return true;
    }
    return false;
  });
}

export async function addRating(input: {
  target_type: 'seller' | 'service' | 'shop';
  target_id: string;
  item_id?: string;
  rater_phone: string;
  score: number;
  comment: string;
  video_url?: string;
}): Promise<RatingRecord> {
  const normRater = normalizePhone(input.rater_phone);
  const meta = readMeta();

  if (input.target_type === 'seller') {
    const confirmed = meta.orders.some(
      (o) =>
        o.buyer_phone === normRater &&
        o.order_status === 'delivered_confirmed' &&
        (input.item_id ? o.item_id === input.item_id : o.seller_id === input.target_id || o.seller_phone === input.target_id)
    );
    if (!confirmed) {
      throw new Error(
        'Only buyers with a completed and confirmed Paystack order for this item can submit a review.'
      );
    }
  }

  const rater = await getUserByPhone(normRater);
  const rec: StoredRating = {
    id: crypto.randomUUID(),
    target_type: input.target_type,
    target_id: input.target_id,
    item_id: input.item_id || '',
    rater_phone: normRater,
    rater_name: rater?.full_name || 'Student',
    score: Math.max(1, Math.min(5, Number(input.score) || 5)),
    comment: input.comment.trim(),
    video_url: input.video_url || '',
    created_at: new Date().toISOString(),
  };

  meta.ratings.unshift(rec);
  writeMeta(meta);

  await getSupabase().from('ratings').insert({
    target_type: rec.target_type,
    target_id: rec.target_id,
    item_id: rec.item_id || '',
    rater_phone: normRater,
    rater_name: rec.rater_name,
    score: rec.score,
    comment: rec.comment,
    video_url: rec.video_url || '',
  });

  return {
    id: rec.id,
    target_type: rec.target_type,
    target_id: rec.target_id,
    item_id: rec.item_id,
    rater_name: rec.rater_name,
    score: rec.score,
    comment: rec.comment,
    video_url: rec.video_url,
    created_at: rec.created_at,
  };
}

export function listRatings(
  targetType: 'seller' | 'service' | 'shop',
  targetId: string
): { ratings: RatingRecord[]; average: number; count: number } {
  const meta = readMeta();
  const filtered = meta.ratings
    .filter((r) => r.target_type === targetType && r.target_id === targetId)
    .map((r) => ({
      id: r.id,
      target_type: r.target_type,
      target_id: r.target_id,
      item_id: r.item_id,
      rater_name: r.rater_name,
      score: r.score,
      comment: r.comment,
      video_url: r.video_url,
      created_at: r.created_at,
    }));
  const count = filtered.length;
  const average =
    count > 0
      ? Number((filtered.reduce((acc, r) => acc + r.score, 0) / count).toFixed(1))
      : 5.0;
  return { ratings: filtered, average, count };
}

// === WANT ALERTS / PRICE DROP ALERTS ===
export function listWantAlerts(userPhone: string): WantAlert[] {
  const norm = normalizePhone(userPhone);
  const meta = readMeta();
  return meta.want_alerts
    .filter((a) => a.user_phone === norm)
    .map((a) => ({
      id: a.id,
      keyword: a.keyword,
      max_price: a.max_price,
      institution: a.institution,
      matches: a.matches,
      created_at: a.created_at,
    }));
}

export async function createWantAlert(input: {
  user_phone: string;
  keyword: string;
  max_price: number;
  institution?: string;
}): Promise<WantAlert> {
  const norm = normalizePhone(input.user_phone);
  const keyword = input.keyword.trim();
  const maxPrice = Number(input.max_price);
  if (!keyword || !Number.isFinite(maxPrice) || maxPrice <= 0) {
    throw new Error('Enter an item name and max Naira price (₦).');
  }

  // Scan currently active items for immediate matches
  const activeItems = await listActiveItems({ lite: true });
  const initialMatches: WantAlertMatch[] = activeItems
    .filter((it) =>
      itemMatchesWantAlert(
        { title: it.title, description: it.description, price: it.price },
        { keyword, max_price: maxPrice }
      )
    )
    .slice(0, 5)
    .map((it) => ({
      item_id: it.id,
      item_title: it.title,
      item_price: it.price,
      seller_name: it.seller_name,
      institution: it.institution,
      matched_at: new Date().toISOString(),
    }));

  const alert: StoredWantAlert = {
    id: crypto.randomUUID(),
    user_phone: norm,
    keyword,
    max_price: maxPrice,
    institution: input.institution || '',
    matches: initialMatches,
    created_at: new Date().toISOString(),
  };

  const meta = readMeta();
  meta.want_alerts.unshift(alert);
  writeMeta(meta);

  await getSupabase().from('want_alerts').insert({
    user_phone: norm,
    keyword: alert.keyword,
    max_price: alert.max_price,
    institution: alert.institution || '',
  });

  return {
    id: alert.id,
    keyword: alert.keyword,
    max_price: alert.max_price,
    institution: alert.institution,
    matches: alert.matches,
    created_at: alert.created_at,
  };
}

export function deleteWantAlert(userPhone: string, alertId: string): void {
  const norm = normalizePhone(userPhone);
  const meta = readMeta();
  meta.want_alerts = meta.want_alerts.filter(
    (a) => !(a.id === alertId && a.user_phone === norm)
  );
  writeMeta(meta);
}

// === SERVICES NEAR YOU ===
export async function listServices(filters?: { search?: string; category?: string }): Promise<ServiceProvider[]> {
  const sb = getSupabase();
  const { data: usersData } = await sb.from('users').select('*');
  const users = (usersData as DbUser[]) || [];
  const userMap = new Map(users.map((u) => [u.phone_number, u]));

  const meta = readMeta();
  let list: ServiceProvider[] = meta.services
    .filter((s) => s.id !== 'owner-laundry-service' && s.category?.toLowerCase() !== 'laundry')
    .map((s) => {
      const providerUser = userMap.get(s.provider_phone);
      const avgRating =
        s.reviews.length > 0
          ? Number((s.reviews.reduce((a, r) => a + r.rating, 0) / s.reviews.length).toFixed(1))
          : 5.0;
      return {
        id: s.id,
        provider_id: providerUser ? String(providerUser.id) : s.provider_phone,
        provider_name: providerUser?.full_name || s.provider_name,
        profile_pic: providerUser?.profile_pic || s.profile_pic || '',
        category: s.category,
        title: s.title,
        description: s.description,
        price_from: s.price_from,
        location: s.location,
        distance_km: s.distance_km,
        rating: avgRating,
        reviews_count: s.reviews.length,
        work_photos: s.work_photos,
        offerings: s.offerings,
        reviews: s.reviews,
        badges: meta.user_profiles[s.provider_phone]?.badges || s.badges,
        is_advertised: Boolean(s.is_advertised),
        created_at: s.created_at,
      };
    });

  // Advertised services stay on top (₦1,000/week)
  list.sort((a, b) => {
    if (a.is_advertised !== b.is_advertised) return a.is_advertised ? -1 : 1;
    return b.rating - a.rating;
  });

  if (filters?.category && filters.category !== 'All') {
    list = list.filter((s) => s.category === filters.category);
  }
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    list = list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.provider_name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q)
    );
  }
  return list;
}

export async function createService(input: {
  provider_phone: string;
  title: string;
  category: string;
  description: string;
  price_from: number;
  location: string;
  work_photos: string[];
  offerings: ServiceOffering[];
}): Promise<ServiceProvider> {
  const phone = normalizePhone(input.provider_phone);
  const provider = await getUserByPhone(phone);
  if (!provider) throw new Error('User not found.');

  const meta = readMeta();
  const ext = meta.user_profiles[phone] || { badges: ['service_provider'] };
  if (!ext.badges.includes('service_provider') && ext.badges.length < 2) {
    ext.badges.push('service_provider');
  }
  meta.user_profiles[phone] = ext;

  const newSvc: StoredService = {
    id: crypto.randomUUID(),
    provider_phone: phone,
    provider_name: provider.full_name,
    profile_pic: provider.profile_pic || '',
    category: input.category,
    title: input.title.trim(),
    description: input.description.trim(),
    price_from: Number(input.price_from),
    location: input.location.trim(),
    distance_km: 0.4,
    work_photos: input.work_photos.slice(0, 4),
    offerings:
      input.offerings.length > 0
        ? input.offerings
        : [{ name: input.title.trim(), price: Number(input.price_from), duration: '1 - 2 hrs' }],
    reviews: [],
    badges: ext.badges,
    is_advertised: false,
    created_at: new Date().toISOString(),
  };

  meta.services.unshift(newSvc);
  writeMeta(meta);

  await getSupabase().from('services').insert({
    provider_phone: phone,
    provider_name: provider.full_name,
    category: newSvc.category,
    title: newSvc.title,
    description: newSvc.description,
    price_from: newSvc.price_from,
    location: newSvc.location,
    work_photos: JSON.stringify(newSvc.work_photos),
  });

  return {
    id: newSvc.id,
    provider_id: String(provider.id),
    provider_name: newSvc.provider_name,
    profile_pic: newSvc.profile_pic,
    category: newSvc.category,
    title: newSvc.title,
    description: newSvc.description,
    price_from: newSvc.price_from,
    location: newSvc.location,
    distance_km: newSvc.distance_km,
    rating: 5.0,
    reviews_count: 0,
    work_photos: newSvc.work_photos,
    offerings: newSvc.offerings,
    reviews: [],
    badges: newSvc.badges,
    is_advertised: false,
    created_at: newSvc.created_at,
  };
}

export async function advertiseService(
  serviceId: string,
  requesterPhone: string,
  paystackReference?: string
): Promise<boolean> {
  const norm = normalizePhone(requesterPhone);
  const meta = readMeta();
  const svc = meta.services.find((s) => s.id === serviceId);
  if (!svc) throw new Error('Service not found.');
  if (norm !== OWNER_PHONE && svc.provider_phone !== norm) {
    throw new Error('Only the service owner can advertise this service.');
  }
  if (norm !== OWNER_PHONE && !paystackReference) {
    throw new Error('Pay only on Afri Mart via Paystack to stay safe.');
  }
  svc.is_advertised = true;
  if (paystackReference) {
    const cleanRef = paystackReference.trim();
    if (!meta.promotion_fees.some((f) => f.reference === cleanRef)) {
      meta.promotion_fees.unshift({
        id: crypto.randomUUID(),
        fee_type: 'advertise_service',
        target_id: serviceId,
        seller_phone: norm,
        amount: 1000,
        reference: cleanRef,
        created_at: new Date().toISOString(),
      });
    }
  }
  writeMeta(meta);
  return true;
}

export async function addServiceReview(
  serviceId: string,
  authorName: string,
  rating: number,
  comment: string
): Promise<ServiceProvider> {
  const meta = readMeta();
  const svc = meta.services.find((s) => s.id === serviceId);
  if (!svc) throw new Error('Service not found.');
  svc.reviews.unshift({
    id: crypto.randomUUID(),
    author_name: authorName,
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    comment: comment.trim(),
    created_at: new Date().toISOString(),
  });
  writeMeta(meta);
  const list = await listServices();
  return list.find((s) => s.id === serviceId)!;
}

export async function createServiceBooking(input: {
  service_id: string;
  service_name: string;
  customer_phone: string;
  scheduled_day: string;
  location: string;
  notes?: string;
  price: number;
  set_7_day_reminder?: boolean;
}): Promise<ServiceBooking> {
  const normCustomer = normalizePhone(input.customer_phone);
  const customer = await getUserByPhone(normCustomer);
  const meta = readMeta();
  const svc = meta.services.find((s) => s.id === input.service_id);

  const reminderDate = input.set_7_day_reminder
    ? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    : undefined;

  const booking: StoredBooking = {
    id: crypto.randomUUID(),
    service_id: input.service_id,
    service_title: input.service_name || svc?.title || 'Campus Service',
    provider_name: svc?.provider_name || 'Service Provider',
    provider_phone: svc?.provider_phone || OWNER_PHONE,
    customer_phone: normCustomer,
    customer_name: customer?.full_name || 'Student',
    scheduled_day: input.scheduled_day,
    location: input.location,
    notes: input.notes || '',
    price: Number(input.price || 0),
    status: 'confirmed',
    reminder_date: reminderDate,
    created_at: new Date().toISOString(),
  };

  meta.bookings.unshift(booking);
  writeMeta(meta);

  await getSupabase().from('bookings').insert({
    service_id: booking.service_id,
    provider_phone: booking.provider_phone,
    customer_phone: booking.customer_phone,
    customer_name: booking.customer_name,
    service_name: booking.service_title,
    scheduled_day: booking.scheduled_day,
    location: booking.location,
    notes: booking.notes,
    price: booking.price,
    reminder_date: booking.reminder_date || null,
  });

  return booking;
}

export function listUserBookings(userPhone: string): ServiceBooking[] {
  const norm = normalizePhone(userPhone);
  const meta = readMeta();
  return meta.bookings.filter((b) => b.customer_phone === norm || b.provider_phone === norm);
}

// === TRADER SHOPS ===
export async function listTraderShops(): Promise<TraderShop[]> {
  const sb = getSupabase();
  const [usersRes, allItems] = await Promise.all([sb.from('users').select('*'), listActiveItems()]);
  const users = (usersRes.data as DbUser[]) || [];
  const meta = readMeta();

  const shops: TraderShop[] = [];
  for (const u of users) {
    const ext = meta.user_profiles[u.phone_number];
    if (!ext) continue;
    const isTrader = ext.badges?.includes('trader') || Boolean(ext.shop_name);
    if (!isTrader) continue;
    const shopItems = allItems.filter((it) => it.seller_id === String(u.id));
    const trust = computeSellerTrust(meta, String(u.id), u.phone_number);
    shops.push({
      id: String(u.id),
      owner_id: String(u.id),
      owner_name: u.full_name,
      shop_name: ext.shop_name || `${u.full_name}'s Shop`,
      market: ext.market || u.campus,
      shop_photo: ext.shop_photo || ext.shop_doc_photo || u.profile_pic || '',
      whatsapp_phone: toWhatsAppDigits(ext.country_code, u.phone_number),
      rating: trust.count > 0 ? trust.score : ext.shop_rating || 5.0,
      reviews_count: trust.count,
      sales_count: ext.shop_sales || 0,
      is_featured: Boolean(ext.shop_featured),
      products_count: shopItems.length,
      products: shopItems,
    });
  }

  shops.sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return b.products_count - a.products_count;
  });

  return shops;
}

export async function updateMyShop(
  phone: string,
  input: { shop_name: string; market: string; shop_photo?: string }
): Promise<TraderShop> {
  const norm = normalizePhone(phone);
  const user = await getUserByPhone(norm);
  if (!user) throw new Error('User not found.');
  const meta = readMeta();
  const prev = meta.user_profiles[norm] || { badges: ['trader'] };
  const nextBadges = [...prev.badges];
  if (!nextBadges.includes('trader') && nextBadges.length < 2) {
    nextBadges.push('trader');
  }
  meta.user_profiles[norm] = {
    ...prev,
    badges: nextBadges,
    shop_name: input.shop_name.trim(),
    market: input.market.trim(),
    ...(input.shop_photo ? { shop_photo: input.shop_photo } : {}),
  };
  writeMeta(meta);

  await getSupabase().from('shops').upsert(
    {
      owner_phone: norm,
      shop_name: input.shop_name.trim(),
      market: input.market.trim(),
      shop_photo: input.shop_photo || meta.user_profiles[norm].shop_photo || '',
    },
    { onConflict: 'owner_phone' }
  );

  const shops = await listTraderShops();
  return shops.find((s) => s.owner_id === String(user.id))!;
}

export function featureMyShop(phone: string, paystackReference?: string): boolean {
  const norm = normalizePhone(phone);
  if (norm !== OWNER_PHONE && !paystackReference) {
    throw new Error('Pay only on Afri Mart via Paystack to stay safe.');
  }
  const meta = readMeta();
  const prev = meta.user_profiles[norm] || { badges: ['trader'] };
  prev.shop_featured = true;
  meta.user_profiles[norm] = prev;
  if (paystackReference) {
    const cleanRef = paystackReference.trim();
    if (!meta.promotion_fees.some((f) => f.reference === cleanRef)) {
      meta.promotion_fees.unshift({
        id: crypto.randomUUID(),
        fee_type: 'feature_shop',
        target_id: norm,
        seller_phone: norm,
        amount: 1000,
        reference: cleanRef,
        created_at: new Date().toISOString(),
      });
    }
  }
  writeMeta(meta);
  return true;
}

// === MESSAGES ===
export async function listThreadsForUser(userPhone: string): Promise<ChatThread[]> {
  const normPhone = normalizePhone(userPhone);
  const sb = getSupabase();

  const [mRes, iRes, uRes] = await Promise.all([
    sb
      .from('messages')
      .select('*')
      .or(`buyer_phone.eq.${normPhone},seller_phone.eq.${normPhone}`)
      .order('created_at', { ascending: true }),
    sb.from('items').select('*'),
    sb.from('users').select('*'),
  ]);

  if (mRes.error) throw new Error(mRes.error.message);

  const messages = (mRes.data as DbMessage[]) || [];
  const items = (iRes.data as DbItem[]) || [];
  const users = (uRes.data as DbUser[]) || [];
  const meta = readMeta();

  const itemMap = new Map(items.map((i) => [String(i.id), i]));
  const userMap = new Map(users.map((u) => [u.phone_number, u]));
  const threadMap = new Map<string, ChatThread>();

  for (const m of messages) {
    const key = `${m.item_id}__${m.buyer_phone}`;
    const item = itemMap.get(String(m.item_id));
    if (!item) continue;

    const isSeller = m.seller_phone === normPhone;
    const partnerPhone = isSeller ? m.buyer_phone : m.seller_phone;
    const partner = userMap.get(partnerPhone);
    const existing = threadMap.get(key);

    const msgMeta = meta.message_meta[String(m.id)];
    const senderPhone = msgMeta?.sender_phone || m.buyer_phone;
    const isRead = msgMeta?.read_by_recipient ?? false;
    const unreadInc = senderPhone !== normPhone && !isRead ? 1 : 0;

    threadMap.set(key, {
      thread_key: key,
      item_id: String(m.item_id),
      item_title: item.title,
      item_price: Number(item.price),
      item_photo: parsePhotos(item.photos)[0] || '',
      item_institution: item.institution,
      partner_id: partner ? String(partner.id) : partnerPhone,
      partner_name: partner?.full_name || 'Student User',
      partner_institution: partner?.institution || item.institution,
      partner_profile_pic: partner?.profile_pic || '',
      is_seller: isSeller,
      last_message: m.message,
      last_message_at: m.created_at,
      unread_count: (existing?.unread_count || 0) + unreadInc,
    });
  }

  // Include Service & Shop direct chat threads
  for (const sm of meta.service_messages) {
    if (sm.buyer_phone !== normPhone && sm.seller_phone !== normPhone) continue;
    const isSeller = sm.seller_phone === normPhone;
    const partnerPhone = isSeller ? sm.buyer_phone : sm.seller_phone;
    const partner = userMap.get(partnerPhone);
    const existing = threadMap.get(sm.thread_key);
    const unreadInc = sm.sender_phone !== normPhone && !sm.read_by_recipient ? 1 : 0;

    let title = 'Direct Chat';
    let price = 0;
    let photo = '';
    let inst = partner?.institution || 'Campus';

    if (sm.target_id.startsWith('service:')) {
      const svcId = sm.target_id.slice('service:'.length);
      const svc = meta.services.find((s) => s.id === svcId);
      if (svc) {
        title = svc.title;
        price = svc.price_from;
        photo = svc.work_photos[0] || svc.profile_pic || '';
        inst = svc.location;
      }
    } else if (sm.target_id.startsWith('shop:')) {
      const ext = meta.user_profiles[sm.seller_phone];
      title = ext?.shop_name || 'Verified Trader Shop';
      photo = ext?.shop_photo || '';
      inst = ext?.market || partner?.campus || 'Market';
    }

    threadMap.set(sm.thread_key, {
      thread_key: sm.thread_key,
      item_id: sm.target_id,
      item_title: title,
      item_price: price,
      item_photo: photo,
      item_institution: inst,
      partner_id: partner ? String(partner.id) : partnerPhone,
      partner_name: partner?.full_name || 'Campus Provider',
      partner_institution: inst,
      partner_profile_pic: partner?.profile_pic || '',
      is_seller: isSeller,
      last_message: sm.message,
      last_message_at: sm.created_at,
      unread_count: (existing?.unread_count || 0) + unreadInc,
    });
  }

  return Array.from(threadMap.values()).sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );
}

async function resolveDirectChatTarget(targetId: string): Promise<{
  sellerPhone: string;
  syntheticItem: MarketplaceItem;
} | null> {
  const sb = getSupabase();
  const { data: usersData } = await sb.from('users').select('*');
  const users = (usersData as DbUser[]) || [];
  const meta = readMeta();

  if (targetId.startsWith('service:')) {
    const svcId = targetId.slice('service:'.length);
    const svc = meta.services.find((s) => s.id === svcId);
    if (!svc) return null;
    const seller = users.find((u) => u.phone_number === svc.provider_phone);
    return {
      sellerPhone: svc.provider_phone,
      syntheticItem: {
        id: targetId,
        title: svc.title,
        category: svc.category,
        price: svc.price_from,
        condition: 'New',
        description: svc.description,
        photos: svc.work_photos.length ? svc.work_photos : svc.profile_pic ? [svc.profile_pic] : [],
        seller_id: seller ? String(seller.id) : svc.provider_phone,
        seller_name: svc.provider_name,
        seller_profile_pic: seller?.profile_pic || svc.profile_pic || '',
        seller_institution: seller?.institution || svc.location,
        seller_badges: svc.badges,
        seller_joined_at: svc.created_at,
        seller_items_count: 1,
        institution: seller?.institution || svc.location,
        location: svc.location,
        is_featured: svc.is_advertised,
        report_count: 0,
        status: 'active',
        created_at: svc.created_at,
      },
    };
  }

  if (targetId.startsWith('shop:')) {
    const ownerId = targetId.slice('shop:'.length);
    const seller = users.find((u) => String(u.id) === ownerId || u.phone_number === ownerId);
    if (!seller) return null;
    const ext = meta.user_profiles[seller.phone_number];
    return {
      sellerPhone: seller.phone_number,
      syntheticItem: {
        id: targetId,
        title: ext?.shop_name || `${seller.full_name}'s Shop`,
        category: 'Shop Inquiry',
        price: 0,
        condition: 'New',
        description: `Verified Trader Shop at ${ext?.market || seller.campus}`,
        photos: ext?.shop_photo ? [ext.shop_photo] : seller.profile_pic ? [seller.profile_pic] : [],
        seller_id: String(seller.id),
        seller_name: seller.full_name,
        seller_profile_pic: seller.profile_pic || '',
        seller_institution: seller.institution,
        seller_badges: ext?.badges || ['trader'],
        seller_shop_name: ext?.shop_name,
        seller_market: ext?.market,
        seller_joined_at: seller.created_at,
        seller_items_count: 1,
        institution: seller.institution,
        location: ext?.market || seller.campus,
        is_featured: Boolean(ext?.shop_featured),
        report_count: 0,
        status: 'active',
        created_at: seller.created_at,
      },
    };
  }

  return null;
}

export async function getThreadMessages(
  itemId: string,
  requesterPhone: string,
  partnerId?: string
): Promise<{
  item: MarketplaceItem;
  partner: PublicUser;
  buyer_phone: string;
  seller_phone: string;
  messages: ChatMessage[];
}> {
  const normRequester = normalizePhone(requesterPhone);
  const sb = getSupabase();

  // Direct service/shop thread support
  if (itemId.startsWith('service:') || itemId.startsWith('shop:')) {
    const resolved = await resolveDirectChatTarget(itemId);
    if (!resolved) throw new Error('Chat target not found.');
    const { data: usersData } = await sb.from('users').select('*');
    const users = (usersData as DbUser[]) || [];
    const userMap = new Map(users.map((u) => [u.phone_number, u]));
    const idMap = new Map(users.map((u) => [String(u.id), u]));

    const seller = userMap.get(resolved.sellerPhone);
    let buyerPhone = normRequester;
    if (normRequester === resolved.sellerPhone) {
      if (!partnerId) throw new Error('Please choose a customer conversation.');
      const buyer = idMap.get(partnerId) || userMap.get(partnerId);
      if (!buyer) throw new Error('Customer not found.');
      buyerPhone = buyer.phone_number;
    }

    const threadKey = `${itemId}__${buyerPhone}`;
    const meta = readMeta();
    let changed = false;
    const formatted: ChatMessage[] = meta.service_messages
      .filter((m) => m.thread_key === threadKey)
      .map((m) => {
        if (m.sender_phone !== normRequester && !m.read_by_recipient) {
          m.read_by_recipient = true;
          changed = true;
        }
        return {
          id: m.id,
          item_id: itemId,
          sender_is_me: m.sender_phone === normRequester,
          sender_name: userMap.get(m.sender_phone)?.full_name || 'User',
          message: m.message,
          read_by_recipient: m.read_by_recipient,
          created_at: m.created_at,
        };
      });
    if (changed) writeMeta(meta);

    const partnerUser =
      normRequester === resolved.sellerPhone
        ? userMap.get(buyerPhone)
        : seller;

    const fallbackPartner: PublicUser = {
      id: resolved.sellerPhone,
      full_name: resolved.syntheticItem.seller_name,
      role: 'seller',
      badges: resolved.syntheticItem.seller_badges,
      institution: resolved.syntheticItem.institution,
      state: 'Lagos',
      campus: resolved.syntheticItem.location,
      profile_pic: resolved.syntheticItem.seller_profile_pic,
      blocked: false,
      block_count: 0,
      created_at: resolved.syntheticItem.created_at,
    };

    return {
      item: resolved.syntheticItem,
      partner: partnerUser ? toPublicUser(partnerUser, false) : fallbackPartner,
      buyer_phone: buyerPhone,
      seller_phone: resolved.sellerPhone,
      messages: formatted,
    };
  }

  const [iRes, uRes] = await Promise.all([
    sb.from('items').select('*').eq('id', itemId).maybeSingle(),
    sb.from('users').select('*'),
  ]);

  if (iRes.error) throw new Error(iRes.error.message);
  const item = (iRes.data as DbItem) || undefined;
  if (!item) throw new Error('Item not found.');

  const users = (uRes.data as DbUser[]) || [];
  const userMap = new Map(users.map((u) => [u.phone_number, u]));
  const idMap = new Map(users.map((u) => [String(u.id), u]));

  const seller = userMap.get(item.seller_phone);
  if (!seller) throw new Error('Seller not found.');

  let buyerPhone = normRequester;
  if (normRequester === item.seller_phone) {
    if (!partnerId) throw new Error('Please choose a buyer conversation.');
    const buyer = idMap.get(partnerId) || userMap.get(partnerId);
    if (!buyer) throw new Error('Buyer not found.');
    buyerPhone = buyer.phone_number;
  }

  const { data: msgData, error: msgErr } = await sb
    .from('messages')
    .select('*')
    .eq('item_id', itemId)
    .eq('buyer_phone', buyerPhone)
    .eq('seller_phone', item.seller_phone)
    .order('created_at', { ascending: true });

  if (msgErr) throw new Error(msgErr.message);

  const allMessages = (msgData as DbMessage[]) || [];
  const meta = readMeta();
  let metaChanged = false;

  const formatted: ChatMessage[] = allMessages.map((m) => {
    const info = meta.message_meta[String(m.id)];
    const senderPhone = info?.sender_phone || m.buyer_phone;
    if (info && senderPhone !== normRequester && !info.read_by_recipient) {
      info.read_by_recipient = true;
      metaChanged = true;
    }
    return {
      id: String(m.id),
      item_id: String(m.item_id),
      sender_is_me: senderPhone === normRequester,
      sender_name: userMap.get(senderPhone)?.full_name || 'Student',
      message: m.message,
      read_by_recipient: info?.read_by_recipient ?? true,
      created_at: m.created_at,
    };
  });

  if (metaChanged) {
    writeMeta(meta);
  }

  const partnerUser = normRequester === item.seller_phone ? userMap.get(buyerPhone)! : seller;
  const itemMod = meta.item_moderation[String(item.id)];
  const sellerExt = meta.user_profiles[item.seller_phone];

  return {
    item: {
      id: String(item.id),
      title: item.title,
      category: item.category,
      price: Number(item.price),
      condition: item.condition,
      description: item.description,
      photos: parsePhotos(item.photos),
      video_url: itemMod?.video_url || '',
      make_offer: itemMod?.make_offer ?? true,
      pay_on_delivery: itemMod?.pay_on_delivery ?? true,
      is_boosted: Boolean(itemMod?.is_boosted),
      seller_id: String(seller.id),
      seller_name: seller.full_name,
      seller_profile_pic: seller.profile_pic || '',
      seller_institution: seller.institution,
      seller_badges: sellerExt?.badges?.length ? sellerExt.badges : ['student'],
      seller_shop_name: sellerExt?.shop_name,
      seller_market: sellerExt?.market,
      seller_level: sellerExt?.level,
      seller_joined_at: seller.created_at,
      seller_items_count: 1,
      institution: item.institution,
      location: item.location,
      is_featured: Boolean(itemMod?.is_featured),
      report_count: Number(itemMod?.report_count || 0),
      status: 'active',
      created_at: item.created_at,
    },
    partner: toPublicUser(partnerUser, false),
    buyer_phone: buyerPhone,
    seller_phone: item.seller_phone,
    messages: formatted,
  };
}

export async function sendMessage(input: {
  item_id: string;
  sender_phone: string;
  partner_id?: string;
  message: string;
}): Promise<{ saved: DbMessage; recipient_phone: string; sender_name: string }> {
  const senderPhone = normalizePhone(input.sender_phone);
  const text = input.message.trim();
  if (!text) throw new Error('Message cannot be empty.');

  const preMeta = readMeta();
  const modRecord = preMeta.chat_moderation[senderPhone] || { attempts: 0 };
  if (modRecord.blocked_until && modRecord.blocked_until > Date.now()) {
    throw new Error(
      'Your chat is temporarily locked for 1 hour after 3 account-number attempts. Contact afristudentmartsupportjpg@gmail.com.'
    );
  }

  const acctSnippet = detectAccountNumberInChat(text);
  if (acctSnippet) {
    const nextAttempts = (modRecord.attempts || 0) + 1;
    if (nextAttempts >= 3) {
      preMeta.chat_moderation[senderPhone] = {
        attempts: 0,
        blocked_until: Date.now() + 3600_000,
      };
    } else {
      preMeta.chat_moderation[senderPhone] = {
        attempts: nextAttempts,
      };
    }
    preMeta.reports.unshift({
      id: crypto.randomUUID(),
      target_type: 'user',
      target_id: senderPhone,
      reporter_phone: 'SYSTEM_CHAT_FILTER',
      reason: `Account Number Blocked: ${acctSnippet}`,
      resolved: false,
      created_at: new Date().toISOString(),
    });
    writeMeta(preMeta);
    throw new Error(
      'For your safety, you cannot share account numbers in chat. Please complete payment on Afri Student Mart to protect your order.'
    );
  }

  const sb = getSupabase();

  // Direct service/shop thread support
  if (input.item_id.startsWith('service:') || input.item_id.startsWith('shop:')) {
    const resolved = await resolveDirectChatTarget(input.item_id);
    if (!resolved) throw new Error('Chat target not found.');
    const sender = await getUserByPhone(senderPhone);

    let buyerPhone = senderPhone;
    if (senderPhone === resolved.sellerPhone) {
      if (!input.partner_id) throw new Error('Missing recipient.');
      const partner = await getUserById(input.partner_id);
      buyerPhone = partner ? partner.phone_number : normalizePhone(input.partner_id);
    }

    const threadKey = `${input.item_id}__${buyerPhone}`;
    const msgObj: DirectChatMessage = {
      id: crypto.randomUUID(),
      thread_key: threadKey,
      target_id: input.item_id,
      buyer_phone: buyerPhone,
      seller_phone: resolved.sellerPhone,
      sender_phone: senderPhone,
      message: text,
      read_by_recipient: false,
      created_at: new Date().toISOString(),
    };

    const meta = readMeta();
    meta.service_messages.push(msgObj);
    writeMeta(meta);

    await sb.from('chats').insert({
      item_id: input.item_id,
      buyer_phone: buyerPhone,
      seller_phone: resolved.sellerPhone,
      sender_phone: senderPhone,
      message: text,
    });

    const recipientPhone = senderPhone === resolved.sellerPhone ? buyerPhone : resolved.sellerPhone;
    return {
      saved: {
        id: msgObj.id,
        item_id: input.item_id,
        buyer_phone: buyerPhone,
        seller_phone: resolved.sellerPhone,
        message: text,
        created_at: msgObj.created_at,
      },
      recipient_phone: recipientPhone,
      sender_name: sender?.full_name || 'Student',
    };
  }

  const [iRes, sender] = await Promise.all([
    sb.from('items').select('*').eq('id', input.item_id).maybeSingle(),
    getUserByPhone(senderPhone),
  ]);

  if (iRes.error) throw new Error(iRes.error.message);
  const item = (iRes.data as DbItem) || undefined;
  if (!item) throw new Error('Item not found.');

  let buyerPhone = senderPhone;
  if (senderPhone === item.seller_phone) {
    if (!input.partner_id) throw new Error('Missing buyer recipient.');
    const partner = await getUserById(input.partner_id);
    if (!partner) throw new Error('Buyer not found.');
    buyerPhone = partner.phone_number;
  }

  const { data, error } = await sb
    .from('messages')
    .insert({
      item_id: item.id,
      buyer_phone: buyerPhone,
      seller_phone: item.seller_phone,
      message: text,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const saved = data as DbMessage;
  const meta = readMeta();
  meta.message_meta[String(saved.id)] = {
    sender_phone: senderPhone,
    read_by_recipient: false,
  };
  writeMeta(meta);

  // Mirror into optional chats table if present
  await sb.from('chats').insert({
    item_id: String(item.id),
    buyer_phone: buyerPhone,
    seller_phone: item.seller_phone,
    sender_phone: senderPhone,
    message: text,
  });

  const recipientPhone = senderPhone === item.seller_phone ? buyerPhone : item.seller_phone;
  return {
    saved,
    recipient_phone: recipientPhone,
    sender_name: sender?.full_name || 'Student',
  };
}

export async function getAdSettings(): Promise<AdSettings> {
  return readMeta().ad_settings;
}

export async function updateAdSettings(settings: AdSettings): Promise<AdSettings> {
  const clean: AdSettings = {
    ads_enabled: Boolean(settings.ads_enabled),
    interstitial_enabled: false,
    publisher_id: (settings.publisher_id || '').trim(),
    banner_unit_id: (settings.banner_unit_id || '').trim(),
    feed_unit_id: (settings.feed_unit_id || '').trim(),
    interstitial_unit_id: (settings.interstitial_unit_id || '').trim(),
    sidebar_unit_id: (settings.sidebar_unit_id || '').trim(),
    google_ads_earnings: Number(settings.google_ads_earnings || 0),
    paystack_public_key: (settings.paystack_public_key || '').trim(),
    paystack_split_code: (settings.paystack_split_code || '').trim(),
    admin_subaccount_code: (settings.admin_subaccount_code || '').trim(),
  };

  const meta = readMeta();
  meta.ad_settings = clean;
  writeMeta(meta);
  return clean;
}

export async function getOwnerDashboardData(): Promise<OwnerDashboardData> {
  const sb = getSupabase();
  const [uRes, iRes, mRes] = await Promise.all([
    sb
      .from('users')
      .select('id,full_name,phone_number,role,institution,state,campus,profile_pic,created_at')
      .order('created_at', { ascending: false }),
    sb.from('items').select('*').order('created_at', { ascending: false }),
    sb.from('messages').select('id', { count: 'exact', head: true }),
  ]);

  if (uRes.error) throw new Error(uRes.error.message);
  if (iRes.error) throw new Error(iRes.error.message);

  const users = (uRes.data as DbUser[]) || [];
  const items = (iRes.data as DbItem[]) || [];
  const messagesCount = mRes.count || 0;
  const meta = readMeta();

  const userMap = new Map(users.map((u) => [u.phone_number, u]));
  const itemMap = new Map(items.map((i) => [String(i.id), i]));

  const instMap = new Map<string, { users: number; items: number }>();
  for (const u of users) {
    const entry = instMap.get(u.institution) || { users: 0, items: 0 };
    entry.users += 1;
    instMap.set(u.institution, entry);
  }
  for (const it of items) {
    const mod = meta.item_moderation[String(it.id)];
    if (mod?.status === 'removed') continue;
    const entry = instMap.get(it.institution) || { users: 0, items: 0 };
    entry.items += 1;
    instMap.set(it.institution, entry);
  }

  const institutions = Array.from(instMap.entries())
    .map(([name, counts]) => ({ name, ...counts }))
    .sort((a, b) => b.users + b.items - (a.users + a.items));

  const activeOrders = meta.orders.filter(
    (o) => o.order_status !== 'cancelled' && o.order_status !== 'refund_approved'
  );
  const promotionFeesTotal = meta.promotion_fees.reduce(
    (acc, f) => acc + Number(f.amount || 0),
    0
  );
  const totalSales = activeOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
  const my10PercentEarnings =
    activeOrders.reduce((acc, o) => acc + Number(o.admin_commission || 0), 0) +
    promotionFeesTotal;
  const googleAdsEarnings = Number(meta.ad_settings.google_ads_earnings || 0);

  const finance: OwnerFinanceSummary = {
    total_orders: meta.orders.length,
    total_sales: totalSales,
    my_10_percent_earnings: my10PercentEarnings,
    google_ads_earnings: googleAdsEarnings,
    promotion_fees_total: promotionFeesTotal,
    escrow_held_amount: meta.orders
      .filter((o) => o.order_status === 'paid_escrow' || o.order_status === 'shipped')
      .reduce((acc, o) => acc + Number(o.total_amount || 0), 0),
    released_orders_count: meta.orders.filter((o) => o.order_status === 'delivered_confirmed').length,
    total_admin_commission: activeOrders.reduce(
      (acc, o) => acc + Number(o.admin_commission || 0),
      0
    ),
    total_delivery_fees: meta.orders
      .filter(
        (o) =>
          o.order_status === 'delivered_confirmed' ||
          o.order_status === 'cancelled'
      )
      .reduce((acc, o) => acc + Number(o.delivery_fee || 0), 0),
    total_admin_kept: meta.orders
      .filter((o) => o.order_status === 'delivered_confirmed' || o.order_status === 'cancelled')
      .reduce(
        (acc, o) =>
          acc +
          (o.order_status === 'cancelled'
            ? Number(o.delivery_fee || 0)
            : Number(o.admin_total_kept || 0)),
        0
      ),
    total_seller_payouts: activeOrders.reduce(
      (acc, o) => acc + Number(o.seller_payout || 0),
      0
    ),
    pending_refunds_count: meta.orders.filter((o) => o.order_status === 'refund_requested').length,
  };

  return {
    stats: {
      total_users: users.length,
      total_buyers: users.filter((u) => u.role === 'buyer').length,
      total_sellers: users.filter((u) => u.role === 'seller').length,
      total_items: items.filter((i) => meta.item_moderation[String(i.id)]?.status !== 'removed').length,
      total_messages: messagesCount,
      total_institutions: institutions.length,
      open_reports: meta.reports.filter((r) => !r.resolved).length,
    },
    finance,
    orders: meta.orders,
    institutions,
    users: users.map((u) => ({ ...toPublicUser(u, true), phone_number: u.phone_number })),
    items: items.map((it) => {
      const seller = userMap.get(it.seller_phone);
      const ext = meta.user_profiles[it.seller_phone];
      const mod = meta.item_moderation[String(it.id)];
      return {
        id: String(it.id),
        title: it.title,
        category: it.category,
        price: Number(it.price),
        condition: it.condition,
        description: it.description,
        photos: parsePhotos(it.photos),
        video_url: mod?.video_url || '',
        make_offer: mod?.make_offer ?? true,
        pay_on_delivery: mod?.pay_on_delivery ?? true,
        is_boosted: Boolean(mod?.is_boosted),
        seller_id: seller ? String(seller.id) : it.seller_phone,
        seller_name: seller?.full_name || 'Student',
        seller_profile_pic: seller?.profile_pic || '',
        seller_institution: seller?.institution || it.institution,
        seller_badges: ext?.badges?.length ? ext.badges : ['student'],
        seller_joined_at: seller?.created_at || it.created_at,
        seller_items_count: 1,
        seller_subaccount_code: ext?.paystack_subaccount_code,
        seller_phone: it.seller_phone,
        institution: it.institution,
        location: it.location,
        state: seller?.state || '',
        country:
          mod?.country ||
          inferItemCountry(it.institution, it.location, ext?.country, ext?.country_code),
        is_featured: Boolean(mod?.is_featured),
        report_count: Number(mod?.report_count || 0),
        status: mod?.status === 'removed' ? 'removed' : 'active',
        created_at: it.created_at,
      };
    }),
    reports: meta.reports.map((r) => ({
      ...r,
      target_label:
        r.target_type === 'item'
          ? itemMap.get(r.target_id)?.title || r.target_id
          : userMap.get(r.target_id)?.full_name || r.target_id,
    })),
    ad_settings: meta.ad_settings,
    storage_mode: 'supabase',
  };
}

export async function ownerToggleFeatureItem(itemId: string, featured: boolean): Promise<void> {
  const meta = readMeta();
  const current = meta.item_moderation[itemId] || {
    is_featured: false,
    is_boosted: false,
    make_offer: true,
    pay_on_delivery: true,
    video_url: '',
    report_count: 0,
    status: 'active' as const,
  };
  current.is_featured = featured;
  meta.item_moderation[itemId] = current;
  writeMeta(meta);
}

export async function ownerToggleBlockUser(phone: string, blocked: boolean): Promise<void> {
  const norm = normalizePhone(phone);
  if (norm === OWNER_PHONE) throw new Error('Cannot block Owner.');
  const meta = readMeta();
  const current = meta.blocked_users[norm] || { blocked: false, block_count: 0 };
  current.blocked = blocked;
  meta.blocked_users[norm] = current;
  writeMeta(meta);
}

export async function ownerResolveReport(reportId: string): Promise<void> {
  const meta = readMeta();
  const report = meta.reports.find((r) => r.id === reportId);
  if (report) {
    report.resolved = true;
    writeMeta(meta);
  }
}

// === PAYSTACK ESCROW ORDERS, 10% COMMISSION + FULL DELIVERY FEE & REFUND WORKFLOW ===
function sanitizeOrder(order: StoredEscrowOrder): EscrowOrder {
  const { buyer_phone: _bp, seller_phone: _sp, ...rest } = order;
  return rest;
}

export async function createEscrowOrder(input: {
  item_id: string;
  buyer_phone: string;
  buyer_email?: string;
  delivery_address: string;
  delivery_tier?: 'same_city' | 'standard';
  paystack_reference: string;
}): Promise<EscrowOrder> {
  const normBuyer = normalizePhone(input.buyer_phone);
  const item = await getItemById(input.item_id);
  if (!item) throw new Error('Product not found or no longer active.');

  const sb = getSupabase();
  const [buyer, sellerDataRes] = await Promise.all([
    getUserByPhone(normBuyer),
    sb.from('items').select('seller_phone').eq('id', input.item_id).maybeSingle(),
  ]);
  if (!buyer) throw new Error('Please sign in before checking out.');

  const sellerPhone = sellerDataRes.data?.seller_phone
    ? normalizePhone(String(sellerDataRes.data.seller_phone))
    : normalizePhone(item.seller_id);
  if (sellerPhone === normBuyer) {
    throw new Error('You cannot buy your own listing.');
  }

  const meta = readMeta();
  // Prevent duplicate order for same Paystack reference
  const existingRef = meta.orders.find((o) => o.reference === input.paystack_reference);
  if (existingRef) return sanitizeOrder(existingRef);

  // Check if buyer has an accepted offer on this item
  const acceptedOffer = meta.offers.find(
    (o) => o.item_id === item.id && o.buyer_phone === normBuyer && o.status === 'accepted'
  );
  const productPrice = acceptedOffer
    ? Number(acceptedOffer.counter_price || acceptedOffer.offered_price)
    : Number(item.price);

  const buyerExt = meta.user_profiles[normBuyer];
  const countryCfg = getCountryConfig(item.country || buyerExt?.country || 'Nigeria');
  const deliveryFee =
    input.delivery_tier === 'same_city'
      ? countryCfg.deliveryFeeSameCity
      : countryCfg.deliveryFeeStandard || STANDARD_DELIVERY_FEE_NGN;

  const totalAmount = productPrice + deliveryFee;
  // Owner keeps 7% of product price + full delivery fee; Seller gets 93% of product price
  const adminCommission = Math.round(productPrice * 0.07);
  const sellerPayout = productPrice - adminCommission;
  const adminTotalKept = adminCommission + deliveryFee;
  const sellerExt = meta.user_profiles[sellerPhone];

  const order: StoredEscrowOrder = {
    id: crypto.randomUUID(),
    reference: input.paystack_reference.trim(),
    item_id: item.id,
    item_title: item.title,
    item_photo: item.thumbnails?.[0] || item.photos?.[0] || '',
    item_location: item.location,
    buyer_id: String(buyer.id),
    buyer_name: buyer.full_name,
    buyer_phone: normBuyer,
    buyer_email:
      (input.buyer_email || '').trim() || `student.${normBuyer}@afristudentmart.ng`,
    seller_id: item.seller_id,
    seller_name: item.seller_name,
    seller_phone: sellerPhone,
    product_price: productPrice,
    delivery_fee: deliveryFee,
    total_amount: totalAmount,
    admin_commission: adminCommission,
    admin_total_kept: adminTotalKept,
    seller_payout: sellerPayout,
    country: countryCfg.country,
    currency_symbol: countryCfg.currencySymbol,
    paystack_split_code: meta.ad_settings.paystack_split_code || '',
    seller_subaccount_code: sellerExt?.paystack_subaccount_code || '',
    fee_bearer: 'all-proportional',
    delivery_address: input.delivery_address.trim() || buyer.campus || item.location,
    order_status: 'paid_escrow',
    created_at: new Date().toISOString(),
  };

  meta.orders.unshift(order);
  writeMeta(meta);

  // Best-effort sync to optional Supabase orders table
  await sb.from('orders').insert({
    id: order.id,
    reference: order.reference,
    item_id: order.item_id,
    item_title: order.item_title,
    buyer_phone: order.buyer_phone,
    seller_phone: order.seller_phone,
    product_price: order.product_price,
    delivery_fee: order.delivery_fee,
    total_amount: order.total_amount,
    admin_commission: order.admin_commission,
    seller_payout: order.seller_payout,
    delivery_address: order.delivery_address,
    order_status: order.order_status,
  });

  return sanitizeOrder(order);
}

export function listOrdersForUser(userPhone: string): {
  buyer_orders: EscrowOrder[];
  seller_orders: EscrowOrder[];
} {
  const norm = normalizePhone(userPhone);
  const meta = readMeta();
  const buyer_orders = meta.orders
    .filter((o) => o.buyer_phone === norm)
    .map(sanitizeOrder);
  const seller_orders = meta.orders
    .filter((o) => o.seller_phone === norm)
    .map(sanitizeOrder);
  return { buyer_orders, seller_orders };
}

export function markOrderShipped(orderId: string, sellerPhone: string): EscrowOrder {
  const norm = normalizePhone(sellerPhone);
  const meta = readMeta();
  const order = meta.orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found.');
  if (order.seller_phone !== norm && norm !== OWNER_PHONE) {
    throw new Error('Only the seller can mark this order as shipped.');
  }
  if (order.order_status !== 'paid_escrow') {
    throw new Error('Only orders held in escrow before shipping can be marked as shipped.');
  }
  order.order_status = 'shipped';
  order.shipped_at = new Date().toISOString();
  writeMeta(meta);
  return sanitizeOrder(order);
}

export function confirmOrderDelivery(orderId: string, buyerPhone: string): EscrowOrder {
  const norm = normalizePhone(buyerPhone);
  const meta = readMeta();
  const order = meta.orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found.');
  if (order.buyer_phone !== norm) {
    throw new Error('Only the buyer can confirm delivery.');
  }
  if (order.order_status === 'cancelled' || order.order_status === 'refund_approved') {
    throw new Error('Cannot confirm delivery on a refunded or cancelled order.');
  }
  order.order_status = 'delivered_confirmed';
  order.confirmed_at = new Date().toISOString();
  writeMeta(meta);
  return sanitizeOrder(order);
}

export function requestOrderRefund(
  orderId: string,
  buyerPhone: string,
  input: {
    reason: string;
    photo?: string;
    video?: string;
    change_of_mind_before_ship?: boolean;
  }
): EscrowOrder {
  const norm = normalizePhone(buyerPhone);
  const meta = readMeta();
  const order = meta.orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found.');
  if (order.buyer_phone !== norm) {
    throw new Error('Only the buyer can request a refund for this order.');
  }
  if (order.order_status === 'delivered_confirmed') {
    throw new Error(
      'No refund after you press "I Have Received My Order". Please check well before confirming.'
    );
  }
  if (order.order_status === 'cancelled' || order.order_status === 'refund_approved') {
    throw new Error('Refund has already been processed for this order.');
  }

  // Change of mind BEFORE seller ships: full product price refund, delivery fee NOT refundable
  if (input.change_of_mind_before_ship) {
    if (order.order_status !== 'paid_escrow') {
      throw new Error(
        'Seller has already shipped this order. You can only request a Change of Mind cancellation BEFORE the seller ships.'
      );
    }
    order.order_status = 'cancelled';
    order.refund_type = 'product_only';
    order.refund_amount = order.product_price;
    order.refund_reason =
      input.reason.trim() ||
      'Change of mind before seller shipped (Product price refunded; delivery fee non-refundable).';
    order.refund_requested_at = new Date().toISOString();
    order.refund_resolved_at = new Date().toISOString();
    writeMeta(meta);
    return sanitizeOrder(order);
  }

  const reason = (input.reason || '').trim();
  if (!reason) {
    throw new Error('Please explain the problem with your order.');
  }
  if (!input.photo && !input.video) {
    throw new Error('Please upload a photo or short video showing the problem.');
  }

  order.order_status = 'refund_requested';
  order.refund_reason = reason;
  order.refund_photo = input.photo || '';
  order.refund_video = input.video || '';
  order.refund_type = 'full_with_delivery';
  order.refund_amount = order.total_amount;
  order.refund_requested_at = new Date().toISOString();
  writeMeta(meta);
  return sanitizeOrder(order);
}

export function ownerResolveOrderRefund(
  orderId: string,
  decision: 'approve_full' | 'approve_product_only' | 'reject'
): EscrowOrder {
  const meta = readMeta();
  const order = meta.orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found.');

  if (decision === 'reject') {
    order.order_status = order.shipped_at ? 'shipped' : 'paid_escrow';
  } else if (decision === 'approve_product_only') {
    order.order_status = 'refund_approved';
    order.refund_type = 'product_only';
    order.refund_amount = order.product_price;
    order.refund_resolved_at = new Date().toISOString();
  } else {
    order.order_status = 'refund_approved';
    order.refund_type = 'full_with_delivery';
    order.refund_amount = order.total_amount;
    order.refund_resolved_at = new Date().toISOString();
  }
  writeMeta(meta);
  return sanitizeOrder(order);
}

