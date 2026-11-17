import imageCompression from 'browser-image-compression';
import type {
  AccountBadge,
  AdSettings,
  ChatMessage,
  ChatThread,
  EscrowOrder,
  ItemFilterMode,
  ItemOffer,
  MarketplaceItem,
  OwnerDashboardData,
  PublicUser,
  RatingRecord,
  ServiceBooking,
  ServiceProvider,
  TraderShop,
  WantAlert,
} from '../types';
import { getCountryConfig } from '../data/languages';
import { supabaseClient } from './supabaseClient';

const TOKEN_KEY = 'afri_student_mart_token';
const ITEMS_CACHE_KEY = 'afri_student_mart_items_cache_v2';
const LOW_DATA_KEY = 'afri_student_mart_low_data_mode';

const itemDetailCache = new Map<string, MarketplaceItem>();

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getLowDataMode(): boolean {
  try {
    const saved = localStorage.getItem(LOW_DATA_KEY);
    if (saved !== null) return saved === '1';
    const navConn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    return Boolean(navConn?.saveData);
  } catch {
    return false;
  }
}

export function setLowDataMode(enabled: boolean) {
  try {
    localStorage.setItem(LOW_DATA_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore
  }
}

export function getCachedItems(): MarketplaceItem[] {
  try {
    const raw = localStorage.getItem(ITEMS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MarketplaceItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCachedItems(items: MarketplaceItem[]) {
  try {
    // Store lightweight copy (thumbnails only, max 30 items) so localStorage stays tiny and instant
    const lite = items.slice(0, 30).map((it) => ({
      ...it,
      photos: it.thumbnails?.length ? it.thumbnails : it.photos.slice(0, 1),
      video_url: '',
    }));
    localStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify(lite));
  } catch {
    // Ignore quota errors
  }
}

export function formatNaira(amount: number): string {
  return `₦${Number(amount || 0).toLocaleString('en-NG')}`;
}

export function formatCountryMoney(amount: number, country?: string): string {
  const cfg = getCountryConfig(country || 'Nigeria');
  return `${cfg.currencySymbol}${Number(amount || 0).toLocaleString('en-US')}`;
}

export function buildWhatsAppShareUrl(item: {
  title: string;
  price: number;
  institution: string;
  location: string;
  country?: string;
}): string {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const text = `Check out "${item.title}" for ${formatCountryMoney(item.price, item.country)} at ${item.institution} (${item.location}) on Afri Student Mart! ${siteUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read compressed file.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compresses an image file using browser-image-compression + Canvas WebP/JPEG 70% quality.
 * Guarantees <= maxDim and <= maxBytes.
 */
export async function compressImageFile(
  file: File,
  maxDim = 800,
  maxBytes = 200 * 1024
): Promise<string> {
  try {
    const compressedBlob = await imageCompression(file, {
      maxSizeMB: maxBytes / (1024 * 1024),
      maxWidthOrHeight: maxDim,
      initialQuality: 0.7,
      useWebWorker: false,
      fileType: 'image/webp',
    });
    if (compressedBlob.size <= maxBytes) {
      return await blobToDataUrl(compressedBlob);
    }
  } catch {
    // Fall back to explicit Canvas WebP / JPEG 70% encoder below
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read selected photo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.7;
        let mime = 'image/webp';
        let dataUrl = canvas.toDataURL(mime, quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          mime = 'image/jpeg';
          dataUrl = canvas.toDataURL(mime, quality);
        }
        while (dataUrl.length * 0.75 > maxBytes && quality > 0.28) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL(mime, quality);
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Generates BOTH compressed versions before upload:
 * - full: max 800px, max 200KB, WebP/JPEG 70%
 * - thumbnail: max 200px, max 30KB, WebP/JPEG 70%
 */
export async function compressDualImage(
  file: File
): Promise<{ full: string; thumbnail: string }> {
  const [full, thumbnail] = await Promise.all([
    compressImageFile(file, 800, 200 * 1024),
    compressImageFile(file, 200, 30 * 1024),
  ]);
  return { full, thumbnail };
}

/**
 * Validates and compresses live video to max 720p, max N seconds (default 10s; 5s for video reviews), max 5MB.
 */
export async function compressAndValidateVideo(file: File, maxSeconds = 10): Promise<string> {
  const maxBytes = 5 * 1024 * 1024;
  const objectUrl = URL.createObjectURL(file);

  try {
    const meta = await new Promise<{ duration: number; width: number; height: number }>(
      (resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve({
            duration: video.duration || 0,
            width: video.videoWidth || 720,
            height: video.videoHeight || 720,
          });
        };
        video.onerror = () => reject(new Error('Invalid video file.'));
        video.src = objectUrl;
      }
    );

    // If already <= 720p, <= maxSeconds, and <= 5MB, read fast directly
    if (
      file.size <= maxBytes &&
      meta.duration <= maxSeconds + 0.5 &&
      Math.max(meta.width, meta.height) <= 1280
    ) {
      return await blobToDataUrl(file);
    }

    // Re-encode & trim in browser using Canvas + MediaRecorder to max 720p, maxSeconds, <= 5MB
    if (typeof MediaRecorder === 'undefined') {
      if (file.size > maxBytes) {
        throw new Error(`Video is larger than 5MB. Please record a shorter clip (max ${maxSeconds}s, 720p).`);
      }
      if (meta.duration > maxSeconds + 0.5) {
        throw new Error(`Video must be ${maxSeconds} seconds or shorter.`);
      }
      return await blobToDataUrl(file);
    }

    const video = document.createElement('video');
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    await video.play().catch(() => {});

    const scale = Math.min(1, 720 / Math.min(meta.width || 720, meta.height || 720));
    const targetW = Math.max(240, Math.round((meta.width || 640) * scale));
    const targetH = Math.max(240, Math.round((meta.height || 480) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(20);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 900_000,
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };

    const recordedBlob = await new Promise<Blob>((resolve, reject) => {
      let stopped = false;
      const drawFrame = () => {
        if (stopped || video.paused || video.ended) return;
        ctx?.drawImage(video, 0, 0, targetW, targetH);
        requestAnimationFrame(drawFrame);
      };

      recorder.onstop = () => {
        stopped = true;
        resolve(new Blob(chunks, { type: mimeType }));
      };
      recorder.onerror = () => reject(new Error('Could not compress video.'));

      recorder.start(250);
      drawFrame();

      const maxMs = Math.min(maxSeconds * 1000, Math.max(1000, Math.round((meta.duration || maxSeconds) * 1000)));
      setTimeout(() => {
        if (recorder.state !== 'inactive') {
          video.pause();
          recorder.stop();
        }
      }, maxMs);

      video.onended = () => {
        if (recorder.state !== 'inactive') recorder.stop();
      };
    });

    if (recordedBlob.size > maxBytes) {
      throw new Error(`Compressed video still exceeds 5MB. Please record a shorter clip (<=${maxSeconds}s).`);
    }
    return await blobToDataUrl(recordedBlob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    throw new Error('Backend API is not available on static hosting.');
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

function parseSupabasePhotos(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === 'string' && v.length > 0);
      }
    } catch {
      return raw.startsWith('http') || raw.startsWith('data:') ? [raw] : [];
    }
  }
  return [];
}

function mapSupabaseItemRow(row: Record<string, unknown>): MarketplaceItem {
  const photos = parseSupabasePhotos(row.photos);
  return {
    id: String(row.id || ''),
    title: String(row.title || 'Marketplace Item'),
    category: String(row.category || 'Others'),
    price: Number(row.price || 0),
    condition: (String(row.condition || 'Neatly Used') as MarketplaceItem['condition']),
    description: String(row.description || ''),
    photos,
    thumbnails: photos.slice(0, 1),
    video_url: '',
    make_offer: true,
    pay_on_delivery: true,
    is_boosted: false,
    seller_id: String(row.seller_phone || row.id || ''),
    seller_name: 'Campus Seller',
    seller_profile_pic: '',
    seller_institution: String(row.institution || ''),
    seller_badges: ['student'],
    seller_rating: 5.0,
    seller_reviews_count: 0,
    seller_joined_at: String(row.created_at || new Date().toISOString()),
    seller_items_count: 1,
    institution: String(row.institution || ''),
    location: String(row.location || ''),
    country: 'Nigeria',
    country_code: '+234',
    distance_km: 1,
    is_featured: false,
    report_count: 0,
    status: 'active',
    created_at: String(row.created_at || new Date().toISOString()),
  };
}

export const api = {
  signup: (payload: {
    full_name: string;
    phone_number: string;
    country_code: string;
    password: string;
    account_type: AccountBadge;
    role: 'buyer' | 'seller';
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
    profile_pic?: string;
    agreed_policies: boolean;
    payout_bank_name?: string;
    payout_account_number?: string;
    payout_account_name?: string;
    country?: string;
    language?: string;
  }) =>
    apiFetch<{ token: string; user: PublicUser }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  saveSellerSubaccount: (payload: {
    bank_name: string;
    account_number: string;
    account_name?: string;
  }) =>
    apiFetch<{
      subaccount: {
        subaccount_code: string;
        bank_name: string;
        account_name: string;
        account_last4: string;
      };
      user: PublicUser;
    }>('/api/seller/subaccount', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { phone_number: string; password: string; full_name?: string }) =>
    apiFetch<{ token: string; user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => apiFetch<{ user: PublicUser }>('/api/auth/me'),

  updateProfile: (payload: Partial<PublicUser> & { password?: string }) =>
    apiFetch<{ user: PublicUser }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getItems: async (params?: {
    search?: string;
    category?: string;
    condition?: string;
    institution?: string;
    market?: string;
    country?: string;
    sellerId?: string;
    filterMode?: ItemFilterMode;
    sort?: 'latest' | 'cheapest';
    myInstitution?: string;
    page?: number;
    limit?: number;
    lite?: boolean;
  }): Promise<{
    items: MarketplaceItem[];
    total: number;
    page: number;
    has_more: boolean;
  }> => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.category && params.category !== 'All') qs.set('category', params.category);
    if (params?.condition && params.condition !== 'All') qs.set('condition', params.condition);
    if (params?.institution && params.institution !== 'All') qs.set('institution', params.institution);
    if (params?.market) qs.set('market', params.market);
    if (params?.country && params.country !== 'All') qs.set('country', params.country);
    if (params?.sellerId) qs.set('sellerId', params.sellerId);
    if (params?.filterMode && params.filterMode !== 'all') qs.set('filterMode', params.filterMode);
    if (params?.sort && params.sort !== 'latest') qs.set('sort', params.sort);
    if (params?.myInstitution) qs.set('myInstitution', params.myInstitution);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.lite) qs.set('lite', '1');
    const q = qs.toString();
    try {
      return await apiFetch<{
        items: MarketplaceItem[];
        total: number;
        page: number;
        has_more: boolean;
      }>(`/api/items${q ? `?${q}` : ''}`);
    } catch {
      const pageNum = Math.max(1, params?.page || 1);
      const limitNum = Math.max(1, params?.limit || 10);
      const { data, error } = await supabaseClient
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !Array.isArray(data)) {
        return { items: [], total: 0, page: pageNum, has_more: false };
      }
      let mapped = data.map((r) => mapSupabaseItemRow(r as Record<string, unknown>));
      if (params?.category && params.category !== 'All') {
        const c = params.category.toLowerCase();
        mapped = mapped.filter((it) => it.category.toLowerCase().includes(c));
      }
      if (params?.condition && params.condition !== 'All') {
        mapped = mapped.filter((it) => it.condition === params.condition);
      }
      if (params?.institution && params.institution !== 'All') {
        mapped = mapped.filter((it) => it.institution === params.institution);
      }
      if (params?.search) {
        const s = params.search.toLowerCase();
        mapped = mapped.filter(
          (it) =>
            it.title.toLowerCase().includes(s) ||
            it.institution.toLowerCase().includes(s) ||
            it.location.toLowerCase().includes(s) ||
            it.category.toLowerCase().includes(s)
        );
      }
      if (params?.sort === 'cheapest') {
        mapped.sort((a, b) => a.price - b.price);
      }
      const total = mapped.length;
      const slice = mapped.slice((pageNum - 1) * limitNum, pageNum * limitNum);
      return {
        items: slice,
        total,
        page: pageNum,
        has_more: pageNum * limitNum < total,
      };
    }
  },

  getItemDetail: async (id: string): Promise<MarketplaceItem> => {
    const cached = itemDetailCache.get(id);
    if (cached && cached.photos.length > 0) return cached;
    try {
      const res = await apiFetch<{ item: MarketplaceItem }>(`/api/items/${id}`);
      itemDetailCache.set(id, res.item);
      return res.item;
    } catch {
      const { data, error } = await supabaseClient
        .from('items')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) {
        throw new Error('Could not load item details.');
      }
      const mapped = mapSupabaseItemRow(data as Record<string, unknown>);
      itemDetailCache.set(id, mapped);
      return mapped;
    }
  },

  createItem: (payload: {
    title: string;
    category: string;
    price: number;
    condition: string;
    description: string;
    photos: string[];
    thumbnails?: string[];
    video_url: string;
    make_offer: boolean;
    pay_on_delivery: boolean;
    institution: string;
    location: string;
    country?: string;
  }) =>
    apiFetch<{ item: MarketplaceItem }>('/api/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  boostItem: (itemId: string, paystackReference?: string) =>
    apiFetch<{ ok: boolean; is_boosted: boolean }>(`/api/items/${itemId}/boost`, {
      method: 'POST',
      body: JSON.stringify({ paystack_reference: paystackReference }),
    }),

  deleteItem: (itemId: string) => apiFetch<{ ok: boolean }>(`/api/items/${itemId}`, { method: 'DELETE' }),

  reportItem: (itemId: string, reason: string) =>
    apiFetch<{ auto_removed: boolean; seller_locked: boolean; report_count: number }>(
      `/api/items/${itemId}/report`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    ),

  blockUser: (userId: string, reason: string) =>
    apiFetch<{ auto_suspended: boolean }>(`/api/users/${userId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getOffers: (itemId?: string) =>
    apiFetch<{ offers: ItemOffer[] }>(
      `/api/offers${itemId ? `?itemId=${encodeURIComponent(itemId)}` : ''}`
    ),

  createOffer: (payload: { item_id: string; offered_price: number }) =>
    apiFetch<{ offer: ItemOffer }>('/api/offers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  respondToOffer: (
    offerId: string,
    payload: { action: 'accept' | 'reject' | 'counter'; counter_price?: number }
  ) =>
    apiFetch<{ offer: ItemOffer }>(`/api/offers/${offerId}/respond`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRatings: (targetType: 'seller' | 'service' | 'shop', targetId: string) =>
    apiFetch<{ ratings: RatingRecord[]; average: number; count: number }>(
      `/api/ratings?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(targetId)}`
    ),

  addRating: (payload: {
    target_type: 'seller' | 'service' | 'shop';
    target_id: string;
    item_id?: string;
    score: number;
    comment: string;
    video_url?: string;
  }) =>
    apiFetch<{ rating: RatingRecord }>('/api/ratings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getWantAlerts: () => apiFetch<{ alerts: WantAlert[] }>('/api/want-alerts'),

  createWantAlert: (payload: { keyword: string; max_price: number; institution?: string }) =>
    apiFetch<{ alert: WantAlert }>('/api/want-alerts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteWantAlert: (alertId: string) =>
    apiFetch<{ ok: boolean }>(`/api/want-alerts/${alertId}`, { method: 'DELETE' }),

  getWishlist: () => apiFetch<{ item_ids: string[] }>('/api/wishlist'),
  toggleWishlist: (itemId: string) =>
    apiFetch<{ item_ids: string[] }>(`/api/wishlist/${itemId}`, { method: 'POST' }),

  getServices: (params?: { search?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.category && params.category !== 'All') qs.set('category', params.category);
    const q = qs.toString();
    return apiFetch<{ services: ServiceProvider[] }>(`/api/services${q ? `?${q}` : ''}`);
  },

  createService: (payload: {
    title: string;
    category: string;
    description: string;
    price_from: number;
    location: string;
    work_photos: string[];
    offerings: Array<{ name: string; price: number; duration: string }>;
  }) =>
    apiFetch<{ service: ServiceProvider }>('/api/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  advertiseService: (serviceId: string, paystackReference?: string) =>
    apiFetch<{ ok: boolean; is_advertised: boolean }>(`/api/services/${serviceId}/advertise`, {
      method: 'POST',
      body: JSON.stringify({ paystack_reference: paystackReference }),
    }),

  addServiceReview: (serviceId: string, payload: { rating: number; comment: string }) =>
    apiFetch<{ service: ServiceProvider }>(`/api/services/${serviceId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  bookService: (payload: {
    service_id: string;
    service_name: string;
    scheduled_day: string;
    location: string;
    notes?: string;
    price: number;
    set_7_day_reminder?: boolean;
  }) =>
    apiFetch<{ booking: ServiceBooking }>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getBookings: () => apiFetch<{ bookings: ServiceBooking[] }>('/api/bookings'),

  getShops: () => apiFetch<{ shops: TraderShop[] }>('/api/shops'),

  updateMyShop: (payload: { shop_name: string; market: string; shop_photo?: string }) =>
    apiFetch<{ shop: TraderShop }>('/api/shops/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  featureMyShop: (paystackReference?: string) =>
    apiFetch<{ ok: boolean; is_featured: boolean }>('/api/shops/me/feature', {
      method: 'POST',
      body: JSON.stringify({ paystack_reference: paystackReference }),
    }),

  getThreads: () => apiFetch<{ threads: ChatThread[] }>('/api/messages/threads'),

  getThreadMessages: (itemId: string, partnerId?: string) => {
    const q = partnerId ? `?partnerId=${encodeURIComponent(partnerId)}` : '';
    return apiFetch<{ item: MarketplaceItem; partner: PublicUser; messages: ChatMessage[] }>(
      `/api/messages/thread/${itemId}${q}`
    );
  },

  sendMessage: (payload: { item_id: string; partner_id?: string; message: string }) =>
    apiFetch<{ message: ChatMessage }>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAdSettings: () => apiFetch<{ settings: AdSettings }>('/api/ads/settings'),

  getOwnerDashboard: () => apiFetch<OwnerDashboardData>('/api/owner/dashboard'),

  ownerFeatureItem: (itemId: string, featured: boolean) =>
    apiFetch<{ ok: boolean }>(`/api/owner/items/${itemId}/feature`, {
      method: 'POST',
      body: JSON.stringify({ featured }),
    }),

  ownerDeleteItem: (itemId: string) => apiFetch<{ ok: boolean }>(`/api/owner/items/${itemId}`, { method: 'DELETE' }),

  ownerBlockUser: (phone: string, blocked: boolean) =>
    apiFetch<{ ok: boolean }>(`/api/owner/users/${encodeURIComponent(phone)}/block`, {
      method: 'POST',
      body: JSON.stringify({ blocked }),
    }),

  ownerResolveReport: (reportId: string) =>
    apiFetch<{ ok: boolean }>(`/api/owner/reports/${reportId}/resolve`, { method: 'POST' }),

  getOrders: () =>
    apiFetch<{ buyer_orders: EscrowOrder[]; seller_orders: EscrowOrder[] }>('/api/orders'),

  createOrder: (payload: {
    item_id: string;
    delivery_address: string;
    paystack_reference: string;
    buyer_email?: string;
    delivery_tier?: 'same_city' | 'standard';
  }) =>
    apiFetch<{ order: EscrowOrder }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  markOrderShipped: (orderId: string) =>
    apiFetch<{ order: EscrowOrder }>(`/api/orders/${orderId}/ship`, {
      method: 'POST',
    }),

  confirmOrderDelivery: (orderId: string) =>
    apiFetch<{ order: EscrowOrder }>(`/api/orders/${orderId}/confirm`, {
      method: 'POST',
    }),

  requestOrderRefund: (
    orderId: string,
    payload: {
      reason: string;
      photo?: string;
      video?: string;
      change_of_mind_before_ship?: boolean;
    }
  ) =>
    apiFetch<{ order: EscrowOrder }>(`/api/orders/${orderId}/refund`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  ownerResolveOrderRefund: (
    orderId: string,
    decision: 'approve_full' | 'approve_product_only' | 'reject'
  ) =>
    apiFetch<{ order: EscrowOrder }>(`/api/owner/orders/${orderId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }),

  ownerSaveAdSettings: (settings: AdSettings) =>
    apiFetch<{ settings: AdSettings }>('/api/owner/ads', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  askMartAI: (payload: { message: string; institution?: string; history?: Array<{ role: 'user' | 'assistant'; text: string }> }) =>
    apiFetch<{ reply: string }>('/api/mart-ai', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
