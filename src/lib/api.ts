import imageCompression from 'browser-image-compression';
import type {
  AccountBadge,
  AdSettings,
  ChatMessage,
  ChatThread,
  EscrowOrder,
  ItemFilterMode,
  ItemOffer,
  LiveVideo,
  MarketplaceItem,
  NotificationType,
  OwnerActiveSeller,
  OwnerDashboardData,
  OwnerPopularProduct,
  OwnerSalesPoint,
  OwnerStealthMessage,
  OwnerStealthThread,
  PublicUser,
  RatingRecord,
  ReportRecord,
  ServiceBooking,
  ServiceProvider,
  TraderShop,
  UserNotification,
  WantAlert,
} from '../types';
import { inferCountryFromLocationText } from '../data/countryDocuments';
import { getCountryConfig } from '../data/languages';
import { PAYSTACK_PUBLIC_KEY_PLACEHOLDER, PAYSTACK_SPLIT_CODE_PLACEHOLDER } from './paystack';
import { supabase } from './supabaseClient';

export const OWNER_ALLOWED_EMAIL = 'omaleonulamba65@gmail.com';

export function isVerifiedOwnerUser(user: PublicUser | null | undefined): boolean {
  if (!user || user.role !== 'owner') return false;
  return (user.email || '').trim().toLowerCase() === OWNER_ALLOWED_EMAIL;
}

const LOW_DATA_KEY = 'afri_student_mart_low_data_mode';
const itemDetailCache = new Map<string, MarketplaceItem>();
let activeAccessToken: string | null = null;

supabase.auth.onAuthStateChange((_event, session) => {
  activeAccessToken = session?.access_token || null;
});

export function getStoredToken(): string | null {
  return activeAccessToken;
}

export function setStoredToken(token: string | null) {
  activeAccessToken = token || null;
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
    // Ignore storage errors
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

export async function compressDualImage(
  file: File
): Promise<{ full: string; thumbnail: string }> {
  const [full, thumbnail] = await Promise.all([
    compressImageFile(file, 800, 200 * 1024),
    compressImageFile(file, 200, 30 * 1024),
  ]);
  return { full, thumbnail };
}

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

    if (
      file.size <= maxBytes &&
      meta.duration <= maxSeconds + 0.5 &&
      Math.max(meta.width, meta.height) <= 1280
    ) {
      return await blobToDataUrl(file);
    }

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(val: string | null | undefined): val is string {
  return Boolean(val && UUID_REGEX.test(val.trim()));
}

function isMissingTableError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

function isMissingColumnError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === 'PGRST204' ||
    err.code === '42703' ||
    msg.includes('could not find the') ||
    (msg.includes('column') && msg.includes('schema cache'))
  );
}

function parseJsonArray(raw: unknown): string[] {
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

function normalizePhoneDigits(countryCode: string | undefined, rawPhone: string): string {
  const clean = (rawPhone || '').trim();
  if (!clean) return '';
  const digits = clean.replace(/\D/g, '');
  if (!digits) return '';
  const ccDigits = (countryCode || '+234').replace(/\D/g, '') || '234';
  if (digits.startsWith(ccDigits) && digits.length >= ccDigits.length + 7) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `${ccDigits}${digits.slice(1)}`;
  }
  if (digits.length <= 10) {
    return `${ccDigits}${digits}`;
  }
  return digits;
}

function phoneLookupCandidates(rawPhone: string): string[] {
  const clean = rawPhone.trim();
  const digits = clean.replace(/\D/g, '');
  const set = new Set<string>();
  if (clean) set.add(clean);
  if (digits) {
    set.add(digits);
    set.add(`+${digits}`);
    for (const cc of ['234', '233', '27', '221', '225']) {
      if (digits.startsWith('0')) {
        const local = digits.slice(1);
        set.add(`${cc}${local}`);
        set.add(`+${cc}${local}`);
      } else if (digits.startsWith(cc)) {
        const local = digits.slice(cc.length);
        set.add(`0${local}`);
        set.add(local);
        set.add(`+${cc}${local}`);
      } else if (digits.length <= 10) {
        set.add(`${cc}${digits}`);
        set.add(`+${cc}${digits}`);
        set.add(`0${digits}`);
      }
    }
  }
  return Array.from(set);
}

function containsProhibitedBankAccount(text: string): { matched: boolean; snippet: string } {
  const raw = (text || '').trim();
  if (!raw) return { matched: false, snippet: '' };
  const lower = raw.toLowerCase();
  const nubanMatches = raw.match(/\b\d{10}\b/g) || [];
  const phoneStart = /^(070|080|081|090|091|024|054|055|059|060|071|072|073|074|076|078|079|082|083|084)/;
  const suspiciousNuban = nubanMatches.find((num) => !phoneStart.test(num));
  if (suspiciousNuban) {
    return { matched: true, snippet: suspiciousNuban };
  }
  const hasBankKeyword =
    /(account\s*(no|number)|acct\s*(no|number)|send\s*to\s*(opay|palmpay|kuda|moniepoint|gtb|zenith|access|uba|first\s*bank))/i.test(
      lower
    ) && /\b\d{8,12}\b/.test(raw);
  if (hasBankKeyword) {
    const numMatch = raw.match(/\b\d{8,12}\b/);
    return { matched: true, snippet: numMatch?.[0] || raw.slice(0, 40) };
  }
  return { matched: false, snippet: '' };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+);/);
  const mime = mimeMatch?.[1] || 'image/webp';
  const bin = atob(base64 || '');
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function uploadProductImage(fileOrDataUrl: File | Blob | string, folder = 'products'): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData?.session?.user?.id || 'guest';

  let dataUrl = '';
  let uploadBlob: Blob;
  let ext = 'webp';

  if (typeof fileOrDataUrl === 'string') {
    if (!fileOrDataUrl.startsWith('data:')) return fileOrDataUrl;
    dataUrl = fileOrDataUrl;
    uploadBlob = dataUrlToBlob(dataUrl);
    if (uploadBlob.type.includes('jpeg') || uploadBlob.type.includes('jpg')) ext = 'jpg';
    else if (uploadBlob.type.includes('png')) ext = 'png';
  } else {
    const fileObj = fileOrDataUrl instanceof File
      ? fileOrDataUrl
      : new File([fileOrDataUrl], `img_${Date.now()}.webp`, { type: fileOrDataUrl.type || 'image/webp' });
    dataUrl = await compressImageFile(fileObj, 800, 200 * 1024);
    uploadBlob = dataUrlToBlob(dataUrl);
    if (uploadBlob.type.includes('jpeg') || uploadBlob.type.includes('jpg')) ext = 'jpg';
    else if (uploadBlob.type.includes('png')) ext = 'png';
  }

  const filePath = `${folder}/${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  try {
    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, uploadBlob, {
        contentType: uploadBlob.type || 'image/webp',
        upsert: true,
      });
    if (!error) {
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
      if (urlData?.publicUrl) return urlData.publicUrl;
    }
  } catch {
    // Fallback below if storage bucket is not yet created
  }
  return dataUrl;
}

function mapDbRowToPublicUser(
  row: Record<string, unknown>,
  authUser?: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; created_at?: string }
): PublicUser {
  const meta = (authUser?.user_metadata || {}) as Record<string, unknown>;
  const country = String(row.country || meta.country || 'Nigeria');
  const cfg = getCountryConfig(country);
  const rawRole = String(row.role || meta.role || 'buyer').toLowerCase();
  const role: PublicUser['role'] =
    rawRole === 'owner' ? 'owner' : rawRole === 'seller' ? 'seller' : 'buyer';

  const rawUserType = String(row.user_type || meta.user_type || '');
  const accountType: AccountBadge =
    row.account_type === 'trader' ||
    meta.account_type === 'trader' ||
    rawUserType === 'Trader'
      ? 'trader'
      : row.account_type === 'service_provider' ||
        meta.account_type === 'service_provider' ||
        rawUserType === 'Service Provider'
      ? 'service_provider'
      : 'student';

  const userTypeLabel: PublicUser['user_type'] =
    accountType === 'trader'
      ? 'Trader'
      : accountType === 'service_provider'
      ? 'Service Provider'
      : 'Student';

  const badgesFromRow = parseJsonArray(row.badges) as AccountBadge[];
  const badgesFromMeta = Array.isArray(meta.badges) ? (meta.badges as AccountBadge[]) : [];
  const badges: AccountBadge[] =
    badgesFromRow.length > 0
      ? badgesFromRow
      : badgesFromMeta.length > 0
      ? badgesFromMeta
      : [accountType];

  const ownerBusinessName =
    role === 'owner'
      ? String(row.business_name || row.shop_name || meta.business_name || 'JOKIPEKI GROUP')
      : typeof row.shop_name === 'string'
      ? row.shop_name
      : typeof meta.shop_name === 'string'
      ? meta.shop_name
      : undefined;

  const payoutAccNum = String(row.payout_account_number || meta.payout_account_number || '');
  const resolvedName = String(
    row.name || row.full_name || meta.name || meta.full_name || authUser?.email?.split('@')[0] || 'Mart Member'
  );
  const resolvedPhone = String(row.phone || row.phone_number || meta.phone_number || '');
  const resolvedLang = String(
    row.language_of_preference || row.language || meta.language || cfg.languages[0] || 'English'
  );
  const resolvedState = String(row.state_city || row.state || meta.state || '');

  return {
    id: String(row.id || authUser?.id || ''),
    name: resolvedName,
    full_name: resolvedName,
    email:
      (typeof row.email === 'string' && row.email) ||
      authUser?.email ||
      (typeof meta.email === 'string' ? meta.email : undefined),
    phone: resolvedPhone,
    phone_number: resolvedPhone,
    country_code: String(row.country_code || meta.country_code || cfg.dialCode),
    country,
    state_city: resolvedState,
    language_of_preference: resolvedLang,
    language: resolvedLang,
    user_type: userTypeLabel,
    role,
    badges,
    institution: String(row.institution || meta.institution || ''),
    level: (typeof row.level === 'string' && row.level) || (typeof meta.level === 'string' ? meta.level : undefined),
    school_id_photo: typeof meta.school_id_photo === 'string' ? meta.school_id_photo : undefined,
    id_doc_type:
      (typeof row.id_doc_type === 'string' && row.id_doc_type) ||
      (typeof meta.id_doc_type === 'string' ? meta.id_doc_type : undefined),
    id_doc_number:
      (typeof row.id_doc_number === 'string' && row.id_doc_number) ||
      (typeof meta.id_doc_number === 'string' ? meta.id_doc_number : undefined),
    business_reg_type:
      (typeof row.business_reg_type === 'string' && row.business_reg_type) ||
      (typeof meta.business_reg_type === 'string' ? meta.business_reg_type : undefined),
    business_reg_number:
      (typeof row.business_reg_number === 'string' && row.business_reg_number) ||
      (typeof meta.business_reg_number === 'string' ? meta.business_reg_number : undefined),
    secondary_reg_number:
      (typeof row.secondary_reg_number === 'string' && row.secondary_reg_number) ||
      (typeof meta.secondary_reg_number === 'string' ? meta.secondary_reg_number : undefined),
    shop_name: ownerBusinessName,
    market:
      (typeof row.market === 'string' && row.market) ||
      (typeof meta.market === 'string' ? meta.market : undefined),
    shop_doc_photo: typeof meta.shop_doc_photo === 'string' ? meta.shop_doc_photo : undefined,
    service_category:
      (typeof row.service_category === 'string' && row.service_category) ||
      (typeof meta.service_category === 'string' ? meta.service_category : undefined),
    price_from:
      typeof row.price_from === 'number'
        ? row.price_from
        : typeof meta.price_from === 'number'
        ? meta.price_from
        : undefined,
    work_photos: Array.isArray(meta.work_photos) ? (meta.work_photos as string[]) : undefined,
    state: resolvedState,
    campus: String(row.campus || meta.campus || ''),
    profile_pic: String(row.profile_pic || meta.profile_pic || ''),
    trust_score: Number(row.trust_score || 5.0),
    reviews_count: Number(row.reviews_count || 0),
    blocked: Boolean(row.blocked),
    block_count: Number(row.block_count || 0),
    paystack_subaccount_code:
      (typeof row.paystack_subaccount_code === 'string' && row.paystack_subaccount_code) ||
      (typeof meta.paystack_subaccount_code === 'string' ? meta.paystack_subaccount_code : undefined),
    payout_bank_name:
      (typeof row.payout_bank_name === 'string' && row.payout_bank_name) ||
      (typeof meta.payout_bank_name === 'string' ? meta.payout_bank_name : undefined),
    payout_account_name:
      (typeof row.payout_account_name === 'string' && row.payout_account_name) ||
      (typeof meta.payout_account_name === 'string' ? meta.payout_account_name : undefined),
    payout_account_last4: payoutAccNum.length >= 4 ? payoutAccNum.slice(-4) : undefined,
    created_at: String(row.created_at || authUser?.created_at || new Date().toISOString()),
  };
}

async function fetchProfilesIndex(): Promise<{
  byId: Map<string, PublicUser>;
  byPhone: Map<string, PublicUser>;
  all: PublicUser[];
  mode: 'users' | 'profiles';
}> {
  const byId = new Map<string, PublicUser>();
  const byPhone = new Map<string, PublicUser>();
  const all: PublicUser[] = [];

  const [usrRes, profRes] = await Promise.all([
    supabase.from('users').select('*'),
    supabase.from('profiles').select('*'),
  ]);

  const rows: Record<string, unknown>[] = [];
  const seenIds = new Set<string>();
  const mode: 'users' | 'profiles' = !usrRes.error ? 'users' : 'profiles';

  if (!usrRes.error && Array.isArray(usrRes.data)) {
    for (const r of usrRes.data as Record<string, unknown>[]) {
      const id = String(r.id || '');
      if (id) seenIds.add(id);
      rows.push(r);
    }
  }
  if (!profRes.error && Array.isArray(profRes.data)) {
    for (const r of profRes.data as Record<string, unknown>[]) {
      const id = String(r.id || '');
      if (id && seenIds.has(id)) continue;
      if (id) seenIds.add(id);
      rows.push(r);
    }
  }

  for (const r of rows) {
    const pub = mapDbRowToPublicUser(r);
    all.push(pub);
    if (pub.id) byId.set(pub.id, pub);
    if (pub.phone_number) {
      for (const cand of phoneLookupCandidates(pub.phone_number)) {
        byPhone.set(cand, pub);
      }
    }
  }
  return { byId, byPhone, all, mode };
}

async function fetchOwnerRecordForUser(params: {
  id?: string;
  email?: string | null;
  phone?: string;
}): Promise<Record<string, unknown> | null> {
  try {
    if (params.id) {
      const byId = await supabase.from('owners').select('*').eq('id', params.id).maybeSingle();
      if (!byId.error && byId.data) return byId.data as Record<string, unknown>;
    }
    if (params.email) {
      const cleanEmail = params.email.trim().toLowerCase();
      const byEmail = await supabase.from('owners').select('*').ilike('email', cleanEmail).maybeSingle();
      if (!byEmail.error && byEmail.data) return byEmail.data as Record<string, unknown>;
    }
    if (params.phone) {
      const candidates = phoneLookupCandidates(params.phone);
      const byPhone = await supabase.from('owners').select('*').in('phone', candidates).limit(1);
      if (!byPhone.error && Array.isArray(byPhone.data) && byPhone.data[0]) {
        return byPhone.data[0] as Record<string, unknown>;
      }
    }
  } catch {
    // owners table optional
  }
  return null;
}

async function syncUserProfileRow(
  authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; created_at?: string }
): Promise<Record<string, unknown> | null> {
  const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
  const phone = String(meta.phone_number || meta.phone || '').trim();
  const ownerRow = await fetchOwnerRecordForUser({
    id: authUser.id,
    email: authUser.email,
    phone,
  });
  const isOwnerMetaOrTable =
    meta.role === 'owner' || String(ownerRow?.role || '').toLowerCase() === 'owner';

  const applyOwnerOverlay = (base: Record<string, unknown>): Record<string, unknown> => {
    if (!isOwnerMetaOrTable && String(base.role || '').toLowerCase() !== 'owner') {
      return base;
    }
    return {
      ...base,
      role: 'owner',
      name: String(ownerRow?.owner_name || base.name || base.full_name || meta.full_name || 'Mart Owner'),
      full_name: String(ownerRow?.owner_name || base.full_name || base.name || meta.full_name || 'Mart Owner'),
      business_name: String(ownerRow?.business_name || base.business_name || meta.business_name || 'JOKIPEKI GROUP'),
      phone_number: String(base.phone_number || base.phone || ownerRow?.phone || phone || ''),
      email: String(base.email || ownerRow?.email || authUser.email || ''),
    };
  };

  const roleVal = isOwnerMetaOrTable
    ? 'owner'
    : meta.account_type === 'trader' || meta.account_type === 'service_provider' || meta.role === 'seller'
    ? 'seller'
    : 'buyer';
  const userType =
    meta.account_type === 'trader'
      ? 'Trader'
      : meta.account_type === 'service_provider'
      ? 'Service Provider'
      : 'Student';
  const fullNameVal = String(
    ownerRow?.owner_name || meta.name || meta.full_name || authUser.email?.split('@')[0] || 'Mart Member'
  );
  const stateCityVal = String(meta.state_city || meta.state || '');
  const langPrefVal = String(meta.language_of_preference || meta.language || 'English');
  const safePhone = phone || (typeof ownerRow?.phone === 'string' ? ownerRow.phone : '') || '';

  // 1) Primary table: `public.users`
  const existingUser = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!existingUser.error && existingUser.data) {
    return applyOwnerOverlay(existingUser.data as Record<string, unknown>);
  }

  if (!existingUser.error) {
    const fullUsersPayload = {
      id: authUser.id,
      name: fullNameVal,
      full_name: fullNameVal,
      business_name:
        roleVal === 'owner'
          ? String(ownerRow?.business_name || meta.business_name || 'JOKIPEKI GROUP')
          : String(meta.shop_name || ''),
      email: authUser.email || (typeof meta.email === 'string' ? meta.email : null),
      phone: safePhone,
      phone_number: safePhone,
      country_code: String(meta.country_code || '+234'),
      country: String(meta.country || 'Nigeria'),
      state_city: stateCityVal,
      state: stateCityVal,
      language_of_preference: langPrefVal,
      language: langPrefVal,
      user_type: userType,
      account_type: String(meta.account_type || 'student'),
      role: roleVal,
      badges: Array.isArray(meta.badges) ? meta.badges : [String(meta.account_type || 'student')],
      institution: String(meta.institution || ''),
      campus: String(meta.campus || ''),
      level: String(meta.level || ''),
      shop_name: String(meta.shop_name || ''),
      market: String(meta.market || ''),
      service_category: String(meta.service_category || ''),
      price_from: Number(meta.price_from || 0),
      id_doc_type: String(meta.id_doc_type || ''),
      id_doc_number: String(meta.id_doc_number || ''),
      business_reg_type: String(meta.business_reg_type || ''),
      business_reg_number: String(meta.business_reg_number || ''),
      secondary_reg_number: String(meta.secondary_reg_number || ''),
      payout_bank_name: String(meta.payout_bank_name || ''),
      payout_account_number: String(meta.payout_account_number || ''),
      payout_account_name: String(meta.payout_account_name || ''),
      profile_pic: String(meta.profile_pic || ''),
      password: '[supabase_auth]',
    };

    let ins = await supabase.from('users').upsert(fullUsersPayload, { onConflict: 'id' }).select('*').maybeSingle();
    if (ins.error && isMissingColumnError(ins.error)) {
      const legacyUsersPayload = {
        id: authUser.id,
        full_name: fullNameVal,
        email: authUser.email || null,
        phone_number: safePhone || `auth_${authUser.id.slice(0, 12)}`,
        password: '[supabase_auth]',
        role: roleVal,
        country: String(meta.country || 'Nigeria'),
        institution: String(meta.institution || 'Main Campus'),
        state: stateCityVal,
        campus: String(meta.campus || 'Main Campus'),
        profile_pic: String(meta.profile_pic || ''),
      };
      ins = await supabase.from('users').upsert(legacyUsersPayload, { onConflict: 'id' }).select('*').maybeSingle();
    }
    if (!ins.error && ins.data) {
      return applyOwnerOverlay(ins.data as Record<string, unknown>);
    }
  }

  // 2) Secondary sync to `profiles` if needed
  try {
    const existingProfile = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    if (!existingProfile.error && existingProfile.data) {
      return applyOwnerOverlay(existingProfile.data as Record<string, unknown>);
    }
  } catch {
    // Ignore optional profiles table
  }

  return applyOwnerOverlay({ id: authUser.id });
}

async function getAuthenticatedUser(): Promise<PublicUser> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;
  let authUser = session?.user;
  if (!authUser) {
    const { data: userData } = await supabase.auth.getUser();
    authUser = userData?.user || undefined;
  }
  if (!authUser) {
    throw new Error('Please sign in first.');
  }
  if (session?.access_token) {
    activeAccessToken = session.access_token;
  }
  const dbRow = await syncUserProfileRow(authUser);
  const pub = mapDbRowToPublicUser(dbRow || {}, authUser);
  if (pub.blocked) {
    await supabase.auth.signOut().catch(() => {});
    setStoredToken(null);
    throw new Error('Account suspended due to policy reports.');
  }
  return pub;
}

const SYNTHETIC_READ_KEY = 'afri_mart_read_notifs';

function getReadSyntheticNotifIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SYNTHETIC_READ_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadSyntheticNotifIds(ids: Set<string>) {
  try {
    sessionStorage.setItem(SYNTHETIC_READ_KEY, JSON.stringify(Array.from(ids).slice(-100)));
  } catch {
    // Ignore storage issues
  }
}

async function createNotificationRecord(payload: {
  user_id?: string | null;
  user_email?: string | null;
  title: string;
  body: string;
  type: NotificationType;
}): Promise<void> {
  const targetId = (payload.user_id || '').trim();
  if (!targetId || !isUuid(targetId)) return;
  try {
    const res = await supabase.from('notifications').insert({
      user_id: targetId,
      user_email: payload.user_email || '',
      title: payload.title,
      body: payload.body,
      message: `${payload.title}: ${payload.body}`,
      type: payload.type,
      read: false,
      is_read: false,
    });
    if (res.error && isMissingColumnError(res.error)) {
      await supabase.from('notifications').insert({
        user_email: payload.user_email || targetId,
        message: `${payload.title}: ${payload.body}`,
        is_read: false,
      });
    }
  } catch {
    // Optional if table differs
  }
}

function mapSupabaseItemRow(
  row: Record<string, unknown>,
  profilesById?: Map<string, PublicUser>,
  profilesByPhone?: Map<string, PublicUser>,
  ratingsBySeller?: Map<string, { sum: number; count: number }>,
  itemCountBySeller?: Map<string, number>
): MarketplaceItem {
  const parsedPhotos = parseJsonArray(row.photos);
  const singleImageUrl = typeof row.image_url === 'string' && row.image_url.trim() ? row.image_url.trim() : '';
  const photos = parsedPhotos.length > 0 ? parsedPhotos : singleImageUrl ? [singleImageUrl] : [];
  const thumbs = parseJsonArray(row.thumbnails);
  const inst = String(row.institution || '');
  const loc = String(row.location || '');
  const inferredCountry = inferCountryFromLocationText(
    inst,
    loc,
    typeof row.country === 'string' ? row.country : undefined
  );
  const cfg = getCountryConfig(inferredCountry);

  const rawSellerId = typeof row.seller_id === 'string' ? row.seller_id : '';
  const sellerPhone = String(row.seller_phone || '');
  const sellerProfile =
    (rawSellerId && profilesById?.get(rawSellerId)) ||
    (sellerPhone && profilesByPhone?.get(sellerPhone)) ||
    undefined;

  const effectiveSellerId = sellerProfile?.id || rawSellerId || sellerPhone || String(row.id || '');
  const ratingStats =
    ratingsBySeller?.get(effectiveSellerId) ||
    (rawSellerId ? ratingsBySeller?.get(rawSellerId) : undefined) ||
    (sellerPhone ? ratingsBySeller?.get(sellerPhone) : undefined);

  const avgRating =
    ratingStats && ratingStats.count > 0
      ? Number((ratingStats.sum / ratingStats.count).toFixed(1))
      : sellerProfile?.trust_score || 5.0;
  const reviewsCount = ratingStats?.count || sellerProfile?.reviews_count || 0;
  const isAvailable = row.is_available === undefined ? true : Boolean(row.is_available);

  return {
    id: String(row.id || ''),
    shop_id: typeof row.shop_id === 'string' && row.shop_id ? row.shop_id : undefined,
    title: String(row.title || row.name || 'Marketplace Item'),
    category: String(row.category || 'Others'),
    price: Number(row.price || 0),
    condition: String(row.condition || 'Neatly Used') as MarketplaceItem['condition'],
    description: String(row.description || ''),
    image_url: singleImageUrl || photos[0] || '',
    photos,
    thumbnails: thumbs.length > 0 ? thumbs : photos.slice(0, 1),
    video_url: typeof row.video_url === 'string' ? row.video_url : '',
    is_available: isAvailable,
    make_offer: row.make_offer === undefined ? true : Boolean(row.make_offer),
    pay_on_delivery: row.pay_on_delivery === undefined ? true : Boolean(row.pay_on_delivery),
    is_boosted: Boolean(row.is_boosted),
    seller_id: effectiveSellerId,
    seller_name: String(row.seller_name || sellerProfile?.full_name || 'Campus Seller'),
    seller_profile_pic: sellerProfile?.profile_pic || '',
    seller_institution: sellerProfile?.institution || inst,
    seller_badges: sellerProfile?.badges?.length ? sellerProfile.badges : ['student'],
    seller_shop_name: sellerProfile?.shop_name,
    seller_market: sellerProfile?.market,
    seller_level: sellerProfile?.level,
    seller_rating: avgRating,
    seller_reviews_count: reviewsCount,
    seller_subaccount_code: sellerProfile?.paystack_subaccount_code,
    seller_joined_at: sellerProfile?.created_at || String(row.created_at || new Date().toISOString()),
    seller_items_count: itemCountBySeller?.get(effectiveSellerId) || 1,
    institution: inst,
    location: loc,
    state: typeof row.state === 'string' ? row.state : sellerProfile?.state,
    country: cfg.country,
    country_code: typeof row.country_code === 'string' ? row.country_code : cfg.dialCode,
    distance_km: 1,
    is_featured: Boolean(row.is_featured),
    report_count: Number(row.report_count || 0),
    status:
      row.status === 'removed' || row.status === 'rejected' || row.status === 'pending'
        ? row.status
        : isAvailable
        ? 'active'
        : 'removed',
    created_at: String(row.created_at || new Date().toISOString()),
  };
}

async function fetchSellerRatingsSummary(): Promise<Map<string, { sum: number; count: number }>> {
  const map = new Map<string, { sum: number; count: number }>();
  const { data, error } = await supabase
    .from('reviews')
    .select('target_id, rating, stars');
  if (!error && Array.isArray(data)) {
    for (const r of data as Array<{ target_id?: string; rating?: number; stars?: number }>) {
      if (!r.target_id) continue;
      const val = Number(r.rating ?? r.stars ?? 0);
      if (!val) continue;
      const prev = map.get(r.target_id) || { sum: 0, count: 0 };
      prev.sum += val;
      prev.count += 1;
      map.set(r.target_id, prev);
    }
  }
  return map;
}

function makeFallbackSyntheticItem(itemId: string, partner?: PublicUser | null): MarketplaceItem {
  return {
    id: itemId,
    title: itemId.startsWith('shop:')
      ? partner?.shop_name || 'Verified Trader Shop'
      : itemId.startsWith('service:')
      ? partner?.service_category || 'Campus Service'
      : 'Marketplace Discussion',
    category: 'Others',
    price: partner?.price_from || 0,
    condition: 'Neatly Used',
    description: '',
    photos: partner?.profile_pic ? [partner.profile_pic] : [],
    thumbnails: [],
    seller_id: partner?.id || '',
    seller_name: partner?.full_name || 'Campus Member',
    seller_profile_pic: partner?.profile_pic || '',
    seller_institution: partner?.institution || 'Campus',
    seller_badges: partner?.badges || ['student'],
    seller_joined_at: partner?.created_at || new Date().toISOString(),
    seller_items_count: 1,
    institution: partner?.institution || 'Campus',
    location: partner?.campus || 'Main Campus',
    country: partner?.country || 'Nigeria',
    is_featured: false,
    report_count: 0,
    status: 'active',
    created_at: new Date().toISOString(),
  };
}

export const api = {
  signup: async (payload: {
    full_name: string;
    email?: string;
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
    id_doc_type?: string;
    id_doc_number?: string;
    business_reg_type?: string;
    business_reg_number?: string;
    secondary_reg_number?: string;
  }): Promise<{ token: string; user: PublicUser; needsEmailConfirmation?: boolean }> => {
    const normalizedPhone = normalizePhoneDigits(payload.country_code, payload.phone_number);
    const email = (payload.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid Email Address for Supabase Auth.');
    }
    const derivedRole: 'buyer' | 'seller' =
      payload.account_type === 'trader' || payload.account_type === 'service_provider'
        ? 'seller'
        : payload.role;

    const userMeta = {
      full_name: payload.full_name.trim(),
      email,
      phone_number: normalizedPhone || payload.phone_number.trim(),
      country_code: payload.country_code,
      country: payload.country || 'Nigeria',
      language: payload.language || 'English',
      account_type: payload.account_type,
      role: derivedRole,
      badges: [payload.account_type],
      institution: payload.institution,
      level: payload.level,
      id_doc_type: payload.id_doc_type,
      id_doc_number: payload.id_doc_number,
      business_reg_type: payload.business_reg_type,
      business_reg_number: payload.business_reg_number,
      secondary_reg_number: payload.secondary_reg_number,
      shop_name: payload.shop_name,
      market: payload.market,
      service_category: payload.service_category,
      price_from: payload.price_from,
      state: payload.state,
      campus: payload.campus,
      payout_bank_name: payload.payout_bank_name,
      payout_account_number: payload.payout_account_number,
      payout_account_name: payload.payout_account_name,
      agreed_policies: payload.agreed_policies,
    };

    const { data, error } = await supabase.auth.signUp({
      email,
      password: payload.password,
      options: { data: userMeta },
    });

    if (error) {
      throw new Error(error.message);
    }
    if (!data.user) {
      throw new Error('Could not create user account in Supabase.');
    }

    const dbRow = await syncUserProfileRow(data.user);
    const publicUser = mapDbRowToPublicUser(dbRow || {}, data.user);
    if (data.session?.access_token) {
      setStoredToken(data.session.access_token);
    }

    return {
      token: data.session?.access_token || '',
      user: publicUser,
      needsEmailConfirmation: !data.session,
    };
  },

  login: async (payload: {
    phone_number: string;
    email?: string;
    password: string;
    full_name?: string;
  }): Promise<{ token: string; user: PublicUser }> => {
    const identifier = (payload.email || payload.phone_number || '').trim();
    if (!identifier || !payload.password) {
      throw new Error('Invalid login');
    }

    let resolvedEmail = identifier.includes('@') ? identifier.toLowerCase() : '';
    if (!resolvedEmail) {
      const candidates = phoneLookupCandidates(identifier);
      const { data: userMatches } = await supabase
        .from('users')
        .select('email, phone_number, phone, role')
        .or(`phone_number.in.(${candidates.join(',')}),phone.in.(${candidates.join(',')})`)
        .limit(1);

      const userHit = Array.isArray(userMatches) ? (userMatches[0] as { email?: string } | undefined) : undefined;
      if (userHit?.email) {
        resolvedEmail = userHit.email.trim().toLowerCase();
      } else {
        const { data: profMatches } = await supabase
          .from('profiles')
          .select('email, phone_number, role')
          .in('phone_number', candidates)
          .limit(1);

        const hit = Array.isArray(profMatches) ? (profMatches[0] as { email?: string } | undefined) : undefined;
        if (hit?.email) {
          resolvedEmail = hit.email.trim().toLowerCase();
        } else {
          const { data: ownerMatches } = await supabase
            .from('owners')
            .select('email, phone, role')
            .in('phone', candidates)
            .limit(1);
          const ownerHit = Array.isArray(ownerMatches) ? (ownerMatches[0] as { email?: string } | undefined) : undefined;
          if (ownerHit?.email) {
            resolvedEmail = ownerHit.email.trim().toLowerCase();
          }
        }
      }
    }

    if (!resolvedEmail) {
      throw new Error('Invalid login');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password: payload.password,
    });

    if (error || !data.user || !data.session) {
      if (error?.message?.toLowerCase().includes('email not confirmed')) {
        throw new Error('Invalid login — please confirm your email inbox link first.');
      }
      throw new Error('Invalid login');
    }

    const dbRow = await syncUserProfileRow(data.user);
    const publicUser = mapDbRowToPublicUser(dbRow || {}, data.user);

    if (publicUser.blocked) {
      await supabase.auth.signOut().catch(() => {});
      throw new Error('Invalid login — account suspended.');
    }

    // Optional Name check when provided for Owner Login
    if (publicUser.role === 'owner' && payload.full_name && payload.full_name.trim()) {
      const entered = payload.full_name.trim().toLowerCase().replace(/\s+/g, ' ');
      const allowedNames = [
        publicUser.full_name,
        publicUser.shop_name || '',
        String(dbRow?.business_name || ''),
      ]
        .map((n) => n.trim().toLowerCase().replace(/\s+/g, ' '))
        .filter(Boolean);
      if (allowedNames.length > 0 && !allowedNames.includes(entered)) {
        await supabase.auth.signOut().catch(() => {});
        throw new Error('Invalid login');
      }
    }

    setStoredToken(data.session.access_token);
    return {
      token: data.session.access_token,
      user: publicUser,
    };
  },

  logout: async () => {
    setStoredToken(null);
    await supabase.auth.signOut().catch(() => {});
  },

  ownerLogin: async (payload: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: PublicUser }> => {
    const cleanEmail = (payload.email || '').trim().toLowerCase();
    if (cleanEmail !== OWNER_ALLOWED_EMAIL || !payload.password) {
      throw new Error('Access Denied');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: payload.password,
    });
    if (error || !data.user || !data.session) {
      throw new Error('Access Denied');
    }
    const dbRow = await syncUserProfileRow(data.user);
    const publicUser = mapDbRowToPublicUser(dbRow || {}, data.user);
    if (!isVerifiedOwnerUser(publicUser)) {
      await supabase.auth.signOut().catch(() => {});
      setStoredToken(null);
      throw new Error('Access Denied');
    }
    setStoredToken(data.session.access_token);
    return {
      token: data.session.access_token,
      user: publicUser,
    };
  },

  getMe: async (): Promise<{ user: PublicUser }> => {
    const user = await getAuthenticatedUser();
    return { user };
  },

  updateProfile: async (payload: Partial<PublicUser> & { password?: string }): Promise<{ user: PublicUser }> => {
    const current = await getAuthenticatedUser();
    const { password, ...metaUpdates } = payload;

    const { data, error } = await supabase.auth.updateUser({
      ...(password ? { password } : {}),
      data: metaUpdates,
    });
    if (error || !data.user) {
      throw new Error(error?.message || 'Could not update profile.');
    }

    const profileUpdates: Record<string, unknown> = {};
    if (payload.full_name !== undefined) {
      profileUpdates.full_name = payload.full_name;
      profileUpdates.name = payload.full_name;
    }
    if (payload.institution !== undefined) profileUpdates.institution = payload.institution;
    if (payload.state !== undefined) {
      profileUpdates.state = payload.state;
      profileUpdates.state_city = payload.state;
    }
    if (payload.state_city !== undefined) {
      profileUpdates.state_city = payload.state_city;
      profileUpdates.state = payload.state_city;
    }
    if (payload.campus !== undefined) profileUpdates.campus = payload.campus;
    if (payload.country !== undefined) profileUpdates.country = payload.country;
    if (payload.language !== undefined) {
      profileUpdates.language = payload.language;
      profileUpdates.language_of_preference = payload.language;
    }
    if (payload.profile_pic !== undefined) profileUpdates.profile_pic = payload.profile_pic;
    if (payload.badges !== undefined) profileUpdates.badges = payload.badges;
    if (payload.shop_name !== undefined) profileUpdates.shop_name = payload.shop_name;
    if (payload.market !== undefined) profileUpdates.market = payload.market;
    if (payload.service_category !== undefined) profileUpdates.service_category = payload.service_category;
    if (payload.price_from !== undefined) profileUpdates.price_from = payload.price_from;
    if (payload.role && current.role !== 'owner' && payload.role !== 'owner') {
      profileUpdates.role = payload.role;
    }

    if (Object.keys(profileUpdates).length > 0) {
      const usrUp = await supabase.from('users').update(profileUpdates).eq('id', data.user.id);
      if (usrUp.error && isMissingColumnError(usrUp.error)) {
        await supabase
          .from('users')
          .update({
            ...(payload.full_name ? { full_name: payload.full_name } : {}),
            ...(payload.institution ? { institution: payload.institution } : {}),
            ...(payload.state ? { state: payload.state } : {}),
            ...(payload.campus ? { campus: payload.campus } : {}),
            ...(payload.profile_pic !== undefined ? { profile_pic: payload.profile_pic } : {}),
          })
          .eq('id', data.user.id);
      }
    }

    const dbRow = await syncUserProfileRow(data.user);
    return { user: mapDbRowToPublicUser(dbRow || {}, data.user) };
  },

  saveSellerSubaccount: async (payload: {
    bank_name: string;
    account_number: string;
    account_name?: string;
  }) => {
    const me = await getAuthenticatedUser();
    const cleanAcc = payload.account_number.replace(/\D/g, '');
    if (cleanAcc.length < 6) {
      throw new Error('Enter a valid bank account number.');
    }
    const subaccountCode = `ACCT_ASM_${me.id.slice(0, 8).toUpperCase()}`;
    const last4 = cleanAcc.slice(-4);

    const { data, error } = await supabase.auth.updateUser({
      data: {
        paystack_subaccount_code: subaccountCode,
        payout_bank_name: payload.bank_name,
        payout_account_number: cleanAcc,
        payout_account_name: payload.account_name || me.full_name,
      },
    });
    if (error || !data.user) {
      throw new Error(error?.message || 'Could not save Paystack subaccount.');
    }

    await supabase
      .from('users')
      .update({
        payout_bank_name: payload.bank_name,
        payout_account_number: cleanAcc,
        payout_account_name: payload.account_name || me.full_name,
      })
      .eq('id', me.id)
      .then(() => {});

    const dbRow = await syncUserProfileRow(data.user);
    const updatedUser = mapDbRowToPublicUser(dbRow || {}, data.user);
    return {
      subaccount: {
        subaccount_code: subaccountCode,
        bank_name: payload.bank_name,
        account_name: payload.account_name || me.full_name,
        account_last4: last4,
      },
      user: updatedUser,
    };
  },

  getItems: async (params?: {
    search?: string;
    category?: string;
    condition?: string;
    institution?: string;
    market?: string;
    state?: string;
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
    const pageNum = Math.max(1, params?.page || 1);
    const limitNum = Math.max(1, params?.limit || 10);

    const [itemsRes, profilesIdx, ratingsMap] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      fetchProfilesIndex(),
      fetchSellerRatingsSummary(),
    ]);

    if (itemsRes.error || !Array.isArray(itemsRes.data)) {
      return { items: [], total: 0, page: pageNum, has_more: false };
    }

    const rawRows = itemsRes.data as Array<Record<string, unknown>>;
    const countBySeller = new Map<string, number>();
    for (const r of rawRows) {
      if (r.status === 'removed' || r.is_available === false) continue;
      const sid = String(r.seller_id || r.seller_phone || '');
      if (sid) countBySeller.set(sid, (countBySeller.get(sid) || 0) + 1);
    }

    let mapped = rawRows
      .map((r) =>
        mapSupabaseItemRow(r, profilesIdx.byId, profilesIdx.byPhone, ratingsMap, countBySeller)
      )
      .filter((it) => it.status !== 'removed' && it.is_available !== false);

    if (params?.sellerId) {
      mapped = mapped.filter(
        (it) => it.seller_id === params.sellerId
      );
    }
    if (params?.country && params.country !== 'All') {
      const tc = params.country.trim().toLowerCase();
      mapped = mapped.filter((it) => (it.country || '').toLowerCase() === tc);
    }
    if (params?.state && params.state !== 'All') {
      const ts = params.state.trim().toLowerCase();
      mapped = mapped.filter(
        (it) =>
          (it.state || '').toLowerCase().includes(ts) ||
          it.location.toLowerCase().includes(ts) ||
          it.institution.toLowerCase().includes(ts)
      );
    }
    if (params?.market) {
      const mLower = params.market.trim().toLowerCase();
      const core = mLower.replace(/\s+market$/i, '').trim();
      mapped = mapped.filter(
        (it) =>
          it.location.toLowerCase().includes(mLower) ||
          it.institution.toLowerCase().includes(mLower) ||
          (it.seller_market || '').toLowerCase().includes(mLower) ||
          (core.length >= 4 &&
            (it.location.toLowerCase().includes(core) ||
              (it.seller_market || '').toLowerCase().includes(core)))
      );
    }
    if (params?.category && params.category !== 'All') {
      const c = params.category.toLowerCase();
      mapped = mapped.filter((it) => it.category.toLowerCase().includes(c));
    }
    if (params?.condition && params.condition !== 'All') {
      mapped = mapped.filter((it) => it.condition === params.condition);
    }
    if (params?.institution && params.institution !== 'All') {
      const instLower = params.institution.toLowerCase();
      mapped = mapped.filter(
        (it) =>
          it.institution === params.institution ||
          it.location.toLowerCase().includes(instLower) ||
          (it.seller_market || '').toLowerCase().includes(instLower)
      );
    }
    if (params?.filterMode && params.filterMode !== 'all') {
      if (params.filterMode === 'students') {
        mapped = mapped.filter((it) => it.seller_badges.includes('student'));
      } else if (params.filterMode === 'traders') {
        mapped = mapped.filter((it) => it.seller_badges.includes('trader'));
      } else if (params.filterMode === 'my_school' && params.myInstitution) {
        mapped = mapped.filter((it) => it.institution === params.myInstitution);
      } else if (params.filterMode === 'my_market') {
        mapped = mapped.filter((it) => Boolean(it.seller_market) || it.location.toLowerCase().includes('market'));
      }
    }
    if (params?.search) {
      const s = params.search.toLowerCase();
      mapped = mapped.filter(
        (it) =>
          it.title.toLowerCase().includes(s) ||
          it.institution.toLowerCase().includes(s) ||
          it.location.toLowerCase().includes(s) ||
          it.category.toLowerCase().includes(s) ||
          it.seller_name.toLowerCase().includes(s)
      );
    }
    if (params?.sort === 'cheapest') {
      mapped.sort((a, b) => a.price - b.price);
    } else {
      mapped.sort((a, b) => {
        const scoreA = (a.is_featured ? 2 : 0) + (a.is_boosted ? 1 : 0);
        const scoreB = (b.is_featured ? 2 : 0) + (b.is_boosted ? 1 : 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    const total = mapped.length;
    const slice = mapped.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    return {
      items: slice,
      total,
      page: pageNum,
      has_more: pageNum * limitNum < total,
    };
  },

  getItemDetail: async (id: string): Promise<MarketplaceItem> => {
    const [itemRes, profilesIdx, ratingsMap] = await Promise.all([
      supabase.from('products').select('*').eq('id', id).maybeSingle(),
      fetchProfilesIndex(),
      fetchSellerRatingsSummary(),
    ]);
    if (itemRes.error || !itemRes.data) {
      const cached = itemDetailCache.get(id);
      if (cached) return cached;
      throw new Error('Could not load product details.');
    }
    const mapped = mapSupabaseItemRow(
      itemRes.data as Record<string, unknown>,
      profilesIdx.byId,
      profilesIdx.byPhone,
      ratingsMap
    );
    itemDetailCache.set(id, mapped);
    return mapped;
  },

  uploadProductImage: async (file: File | Blob | string): Promise<string> => {
    return uploadProductImage(file, 'products');
  },

  createItem: async (payload: {
    shop_id?: string;
    title: string;
    category: string;
    price: number;
    condition: string;
    description: string;
    photos: string[];
    thumbnails?: string[];
    video_url?: string;
    make_offer: boolean;
    pay_on_delivery: boolean;
    institution: string;
    location: string;
    country?: string;
  }): Promise<{ item: MarketplaceItem }> => {
    const me = await getAuthenticatedUser();
    const acctCheck = containsProhibitedBankAccount(`${payload.title} ${payload.description}`);
    if (acctCheck.matched) {
      await supabase.from('account_block_logs').insert({
        log_type: 'Account Number Blocked',
        user_phone: me.phone_number || '',
        user_name: me.full_name,
        snippet: acctCheck.snippet,
      });
      throw new Error('Bank account numbers are not allowed in listings. All payments use Paystack Escrow.');
    }

    const uploadedPhotos = await Promise.all(
      (payload.photos || []).map((p) => (p.startsWith('data:') ? uploadProductImage(p, 'products') : Promise.resolve(p)))
    );

    const fullInsert = {
      shop_id: payload.shop_id || '',
      title: payload.title.trim(),
      name: payload.title.trim(),
      category: payload.category,
      price: Number(payload.price),
      condition: payload.condition,
      description: payload.description.trim(),
      image_url: uploadedPhotos[0] || '',
      photos: uploadedPhotos,
      thumbnails: payload.thumbnails || uploadedPhotos.slice(0, 1),
      video_url: payload.video_url || '',
      seller_id: me.id,
      seller_phone: me.phone_number || me.id,
      seller_name: me.full_name,
      seller_email: me.email || '',
      institution: payload.institution || me.institution,
      location: payload.location || me.campus,
      state: me.state || '',
      country: payload.country || me.country || 'Nigeria',
      country_code: me.country_code || '+234',
      is_available: true,
      make_offer: payload.make_offer,
      pay_on_delivery: payload.pay_on_delivery,
      status: 'active',
    };

    let res = await supabase.from('products').insert(fullInsert).select('*').single();

    if (res.error && isMissingColumnError(res.error)) {
      const legacyInsert = {
        name: fullInsert.title,
        title: fullInsert.title,
        category: fullInsert.category,
        price: fullInsert.price,
        description: fullInsert.description,
        image_url: fullInsert.image_url,
        seller_email: fullInsert.seller_email,
        country: fullInsert.country,
        is_available: true,
      };
      res = await supabase.from('products').insert(legacyInsert).select('*').single();
    }

    if (res.error || !res.data) {
      throw new Error(res.error?.message || 'Could not publish product.');
    }

    const mapped = mapSupabaseItemRow(res.data as Record<string, unknown>);
    mapped.seller_id = me.id;
    mapped.seller_name = me.full_name;
    mapped.seller_badges = me.badges;
    mapped.video_url = payload.video_url || '';
    if (uploadedPhotos.length > 0) mapped.photos = uploadedPhotos;
    mapped.thumbnails = payload.thumbnails || uploadedPhotos.slice(0, 1);

    try {
      const { data: alerts } = await supabase.from('want_alerts').select('*');
      if (Array.isArray(alerts)) {
        const lowerTitle = mapped.title.toLowerCase();
        for (const a of alerts as Array<{ user_id?: string; keyword?: string; max_price?: number }>) {
          if (
            a.user_id &&
            a.user_id !== me.id &&
            a.keyword &&
            lowerTitle.includes(a.keyword.toLowerCase()) &&
            Number(a.max_price || 0) >= mapped.price
          ) {
            await supabase.from('notifications').insert({
              user_id: a.user_id,
              title: 'Price Alert Match',
              body: `"${mapped.title}" posted for ${formatCountryMoney(mapped.price, mapped.country)}`,
              type: 'want_alert_match',
            });
          }
        }
      }
    } catch {
      // Optional table
    }

    return { item: mapped };
  },

  boostItem: async (itemId: string, _paystackReference?: string) => {
    const { error } = await supabase.from('products').update({ is_boosted: true }).eq('id', itemId);
    if (error && !isMissingColumnError(error)) {
      throw new Error(error.message);
    }
    return { ok: true, is_boosted: true };
  },

  deleteItem: async (itemId: string) => {
    const { error } = await supabase.from('products').delete().eq('id', itemId);
    if (error) {
      throw new Error(error.message);
    }
    return { ok: true };
  },

  reportItem: async (itemId: string, reason: string) => {
    const me = await getAuthenticatedUser();
    const { data: itemRow } = await supabase.from('products').select('*').eq('id', itemId).maybeSingle();
    const nextCount = Number((itemRow as Record<string, unknown> | null)?.report_count || 0) + 1;
    const autoRemoved = nextCount >= 3;

    await supabase.from('reports').insert({
      target_type: 'item',
      target_id: itemId,
      reporter_id: me.id,
      reporter_phone: me.phone_number || '',
      reason,
      resolved: false,
    });

    await supabase
      .from('products')
      .update({
        report_count: nextCount,
        ...(autoRemoved ? { status: 'removed', is_available: false } : {}),
      })
      .eq('id', itemId)
      .then(() => {});

    return { auto_removed: autoRemoved, seller_locked: autoRemoved, report_count: nextCount };
  },

  blockUser: async (userId: string, reason: string) => {
    const me = await getAuthenticatedUser();
    await supabase.from('reports').insert({
      target_type: 'user',
      target_id: userId,
      reporter_id: me.id,
      reporter_phone: me.phone_number || '',
      reason,
      resolved: false,
    });

    let autoSuspended = false;
    const { data: targetUsr } = await supabase
      .from('users')
      .select('id, block_count')
      .eq('id', userId)
      .maybeSingle();

    if (targetUsr) {
      const nextBlocks = Number((targetUsr as { block_count?: number }).block_count || 0) + 1;
      autoSuspended = nextBlocks >= 3;
      await supabase
        .from('users')
        .update({ block_count: nextBlocks, ...(autoSuspended ? { blocked: true } : {}) })
        .eq('id', userId);
    }

    return { auto_suspended: autoSuspended };
  },

  getOffers: async (itemId?: string): Promise<{ offers: ItemOffer[] }> => {
    const me = await getAuthenticatedUser().catch(() => null);
    if (!me) return { offers: [] };

    let q = supabase.from('offers').select('*').order('created_at', { ascending: false });
    if (itemId) q = q.eq('item_id', itemId);
    const { data, error } = await q;
    if (error || !Array.isArray(data)) return { offers: [] };

    const offers: ItemOffer[] = (data as Array<Record<string, unknown>>)
      .filter(
        (r) =>
          r.buyer_id === me.id ||
          r.seller_id === me.id ||
          (me.phone_number &&
            (r.buyer_phone === me.phone_number || r.seller_phone === me.phone_number))
      )
      .map((r) => ({
        id: String(r.id),
        item_id: String(r.item_id),
        item_title: typeof r.item_title === 'string' ? r.item_title : undefined,
        item_price: r.item_price !== undefined ? Number(r.item_price) : undefined,
        buyer_id: typeof r.buyer_id === 'string' ? r.buyer_id : undefined,
        buyer_name: String(r.buyer_name || 'Buyer'),
        seller_id: typeof r.seller_id === 'string' ? r.seller_id : undefined,
        seller_name: undefined,
        is_seller: r.seller_id === me.id || (Boolean(me.phone_number) && r.seller_phone === me.phone_number),
        offered_price: Number(r.offered_price || 0),
        counter_price: r.counter_price ? Number(r.counter_price) : undefined,
        status: (String(r.status || 'pending') as ItemOffer['status']),
        created_at: String(r.created_at || new Date().toISOString()),
      }));
    return { offers };
  },

  createOffer: async (payload: { item_id: string; offered_price: number }): Promise<{ offer: ItemOffer }> => {
    const me = await getAuthenticatedUser();
    const { data: itemRow } = await supabase.from('products').select('*').eq('id', payload.item_id).maybeSingle();
    const row = (itemRow || {}) as Record<string, unknown>;

    const { data, error } = await supabase
      .from('offers')
      .insert({
        item_id: payload.item_id,
        item_title: String(row.title || row.name || 'Marketplace Item'),
        item_price: Number(row.price || payload.offered_price),
        buyer_id: me.id,
        buyer_name: me.full_name,
        buyer_phone: me.phone_number || '',
        seller_id: isUuid(String(row.seller_id || '')) ? String(row.seller_id) : null,
        seller_phone: String(row.seller_phone || ''),
        offered_price: Number(payload.offered_price),
        status: 'pending',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Could not submit offer.');
    }
    const r = data as Record<string, unknown>;
    const sellerUid = isUuid(String(row.seller_id || '')) ? String(row.seller_id) : '';
    if (sellerUid && sellerUid !== me.id) {
      await createNotificationRecord({
        user_id: sellerUid,
        title: `New Offer on ${String(row.title || row.name || 'your item')}`,
        body: `${me.full_name} offered ${formatCountryMoney(Number(payload.offered_price), String(row.country || me.country || 'Nigeria'))}`,
        type: 'offer_received',
      });
    }
    return {
      offer: {
        id: String(r.id),
        item_id: String(r.item_id),
        item_title: String(r.item_title || ''),
        item_price: Number(r.item_price || 0),
        buyer_id: String(r.buyer_id || me.id),
        buyer_name: me.full_name,
        seller_id: typeof r.seller_id === 'string' ? r.seller_id : undefined,
        is_seller: false,
        offered_price: Number(r.offered_price || payload.offered_price),
        status: 'pending',
        created_at: String(r.created_at || new Date().toISOString()),
      },
    };
  },

  respondToOffer: async (
    offerId: string,
    payload: { action: 'accept' | 'reject' | 'counter'; counter_price?: number }
  ): Promise<{ offer: ItemOffer }> => {
    const statusMap = {
      accept: 'accepted',
      reject: 'rejected',
      counter: 'countered',
    } as const;

    const { data, error } = await supabase
      .from('offers')
      .update({
        status: statusMap[payload.action],
        ...(payload.counter_price !== undefined ? { counter_price: payload.counter_price } : {}),
      })
      .eq('id', offerId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Could not update offer.');
    }
    const r = data as Record<string, unknown>;
    if (typeof r.buyer_id === 'string' && isUuid(r.buyer_id)) {
      const nextStatusLabel = statusMap[payload.action];
      await createNotificationRecord({
        user_id: r.buyer_id,
        title: `Offer ${nextStatusLabel}: ${String(r.item_title || 'Marketplace Item')}`,
        body:
          payload.action === 'counter' && payload.counter_price
            ? `Seller sent a counter-offer of ${formatCountryMoney(payload.counter_price)}`
            : `Seller ${nextStatusLabel} your offer of ${formatCountryMoney(Number(r.offered_price || 0))}`,
        type: 'offer_update',
      });
    }
    return {
      offer: {
        id: String(r.id),
        item_id: String(r.item_id),
        item_title: typeof r.item_title === 'string' ? r.item_title : undefined,
        item_price: r.item_price !== undefined ? Number(r.item_price) : undefined,
        buyer_id: typeof r.buyer_id === 'string' ? r.buyer_id : undefined,
        buyer_name: String(r.buyer_name || 'Buyer'),
        seller_id: typeof r.seller_id === 'string' ? r.seller_id : undefined,
        offered_price: Number(r.offered_price || 0),
        counter_price: r.counter_price ? Number(r.counter_price) : undefined,
        status: statusMap[payload.action],
        created_at: String(r.created_at || new Date().toISOString()),
      },
    };
  },

  getRatings: async (
    targetType: 'seller' | 'service' | 'shop',
    targetId: string,
    itemId?: string
  ): Promise<{
    ratings: RatingRecord[];
    average: number;
    count: number;
    has_confirmed_order?: boolean;
  }> => {
    const me = await getAuthenticatedUser().catch(() => null);
    let revQuery = supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (itemId) {
      revQuery = revQuery.or(`product_id.eq.${itemId},target_id.eq.${targetId}`);
    } else {
      revQuery = revQuery.eq('target_id', targetId);
    }

    const { data, error } = await revQuery;

    const list: RatingRecord[] =
      !error && Array.isArray(data)
        ? (data as Array<Record<string, unknown>>).map((r) => ({
            id: String(r.id),
            target_type: (String(r.target_type || targetType) as RatingRecord['target_type']),
            target_id: String(r.target_id || targetId),
            item_id: typeof r.product_id === 'string' && r.product_id ? r.product_id : typeof r.item_id === 'string' ? r.item_id : itemId,
            rater_name: String(r.reviewer_name || r.rater_name || 'Buyer'),
            score: Number(r.rating ?? r.stars ?? r.score ?? 5),
            comment: String(r.comment || ''),
            video_url: typeof r.video_url === 'string' ? r.video_url : undefined,
            created_at: String(r.created_at || new Date().toISOString()),
          }))
        : [];

    const count = list.length;
    const average =
      count > 0 ? Number((list.reduce((s, r) => s + r.score, 0) / count).toFixed(1)) : 5.0;

    let hasConfirmedOrder = false;
    if (me && itemId) {
      const { data: ordData } = await supabase
        .from('orders')
        .select('id, status, order_status, item_id, product_id')
        .eq('buyer_id', me.id);
      if (Array.isArray(ordData)) {
        hasConfirmedOrder = (ordData as Array<Record<string, unknown>>).some(
          (o) =>
            (String(o.product_id || '') === itemId || String(o.item_id || '') === itemId) &&
            (o.status === 'delivered' || o.order_status === 'delivered_confirmed')
        );
      }
    }

    return {
      ratings: list,
      average,
      count,
      has_confirmed_order: hasConfirmedOrder,
    };
  },

  addRating: async (payload: {
    target_type: 'seller' | 'service' | 'shop';
    target_id: string;
    item_id?: string;
    score: number;
    comment: string;
    video_url?: string;
  }): Promise<{ rating: RatingRecord }> => {
    const me = await getAuthenticatedUser();
    if (payload.item_id) {
      const { data: ordData } = await supabase
        .from('orders')
        .select('id, status, order_status, item_id, product_id')
        .eq('buyer_id', me.id);
      const deliveredMatch = Array.isArray(ordData)
        ? (ordData as Array<Record<string, unknown>>).some(
            (o) =>
              (String(o.product_id || '') === payload.item_id || String(o.item_id || '') === payload.item_id) &&
              (o.status === 'delivered' || o.order_status === 'delivered_confirmed')
          )
        : false;
      if (!deliveredMatch) {
        throw new Error('Only buyers with a delivered order can submit a review.');
      }
    }

    const reviewInsert = {
      reviewer_id: me.id,
      reviewer_name: me.full_name,
      rater_phone: me.phone_number || '',
      product_id: payload.item_id || payload.target_id,
      target_type: payload.target_type,
      target_id: payload.target_id,
      rating: payload.score,
      stars: payload.score,
      comment: payload.comment.trim(),
      video_url: payload.video_url || '',
    };

    let res = await supabase.from('reviews').insert(reviewInsert).select('*').single();
    if (res.error && isMissingColumnError(res.error)) {
      res = await supabase
        .from('reviews')
        .insert({
          product_id: payload.item_id || payload.target_id,
          reviewer_id: me.id,
          rating: payload.score,
          stars: payload.score,
          comment: payload.comment.trim(),
        })
        .select('*')
        .single();
    }

    if (res.error || !res.data) {
      throw new Error(res.error?.message || 'Could not save review.');
    }
    const r = res.data as Record<string, unknown>;
    return {
      rating: {
        id: String(r.id),
        target_type: payload.target_type,
        target_id: payload.target_id,
        item_id: payload.item_id,
        rater_name: me.full_name,
        score: Number(r.rating ?? r.stars ?? payload.score),
        comment: String(r.comment || ''),
        video_url: typeof r.video_url === 'string' ? r.video_url : undefined,
        created_at: String(r.created_at || new Date().toISOString()),
      },
    };
  },

  submitProductReview: async (payload: {
    seller_id: string;
    item_id: string;
    score: number;
    comment: string;
    video_url?: string;
  }) =>
    api.addRating({
      target_type: 'seller',
      target_id: payload.seller_id,
      item_id: payload.item_id,
      score: payload.score,
      comment: payload.comment,
      video_url: payload.video_url,
    }),

  getWantAlerts: async (): Promise<{ alerts: WantAlert[] }> => {
    const me = await getAuthenticatedUser().catch(() => null);
    if (!me) return { alerts: [] };

    const [alertsRes, itemsRes] = await Promise.all([
      supabase
        .from('want_alerts')
        .select('*')
        .eq('user_id', me.id)
        .order('created_at', { ascending: false }),
      supabase.from('products').select('id, title, name, price, institution, seller_phone, created_at'),
    ]);

    if (alertsRes.error || !Array.isArray(alertsRes.data)) return { alerts: [] };
    const allItems = Array.isArray(itemsRes.data)
      ? (itemsRes.data as Array<Record<string, unknown>>)
      : [];

    const alerts: WantAlert[] = (alertsRes.data as Array<Record<string, unknown>>).map((a) => {
      const kw = String(a.keyword || '').toLowerCase();
      const maxP = Number(a.max_price || 0);
      const matches = allItems
        .filter(
          (it) =>
            String(it.title || it.name || '').toLowerCase().includes(kw) && Number(it.price || 0) <= maxP
        )
        .map((it) => ({
          item_id: String(it.id),
          item_title: String(it.title || it.name || 'Item'),
          item_price: Number(it.price || 0),
          seller_name: 'Seller',
          institution: String(it.institution || ''),
          matched_at: String(it.created_at || new Date().toISOString()),
        }));

      return {
        id: String(a.id),
        keyword: String(a.keyword || ''),
        max_price: maxP,
        institution: typeof a.institution === 'string' ? a.institution : undefined,
        matches,
        created_at: String(a.created_at || new Date().toISOString()),
      };
    });

    return { alerts };
  },

  createWantAlert: async (payload: {
    keyword: string;
    max_price: number;
    institution?: string;
  }): Promise<{ alert: WantAlert }> => {
    const me = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('want_alerts')
      .insert({
        user_id: me.id,
        user_phone: me.phone_number || '',
        keyword: payload.keyword.trim(),
        max_price: Number(payload.max_price),
        institution: payload.institution || me.institution || '',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Could not save alert.');
    }

    const { data: items } = await supabase.from('products').select('*');
    const kw = payload.keyword.trim().toLowerCase();
    const matches = Array.isArray(items)
      ? (items as Array<Record<string, unknown>>)
          .filter(
            (it) =>
              String(it.title || it.name || '').toLowerCase().includes(kw) &&
              Number(it.price || 0) <= Number(payload.max_price)
          )
          .map((it) => ({
            item_id: String(it.id),
            item_title: String(it.title || it.name || 'Item'),
            item_price: Number(it.price || 0),
            seller_name: String(it.seller_name || 'Seller'),
            institution: String(it.institution || ''),
            matched_at: String(it.created_at || new Date().toISOString()),
          }))
      : [];

    const r = data as Record<string, unknown>;
    if (matches.length > 0) {
      await createNotificationRecord({
        user_id: me.id,
        title: `Price Alert Match (${payload.keyword.trim()})`,
        body: `${matches.length} listing(s) found under ${formatCountryMoney(Number(payload.max_price), me.country)}: "${matches[0].item_title}"`,
        type: 'want_alert_match',
      });
    }
    return {
      alert: {
        id: String(r.id),
        keyword: String(r.keyword),
        max_price: Number(r.max_price),
        institution: typeof r.institution === 'string' ? r.institution : undefined,
        matches,
        created_at: String(r.created_at || new Date().toISOString()),
      },
    };
  },

  deleteWantAlert: async (alertId: string) => {
    await supabase.from('want_alerts').delete().eq('id', alertId);
    return { ok: true };
  },

  getWishlist: async (): Promise<{ item_ids: string[] }> => {
    const me = await getAuthenticatedUser().catch(() => null);
    if (!me) return { item_ids: [] };
    const { data, error } = await supabase.from('wishlist').select('item_id').eq('user_id', me.id);
    if (error || !Array.isArray(data)) return { item_ids: [] };
    return {
      item_ids: (data as Array<{ item_id: string }>).map((r) => String(r.item_id)),
    };
  },

  toggleWishlist: async (itemId: string): Promise<{ item_ids: string[] }> => {
    const me = await getAuthenticatedUser();
    const { data: existing } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', me.id)
      .eq('item_id', itemId)
      .maybeSingle();

    if (existing) {
      await supabase.from('wishlist').delete().eq('id', (existing as { id: string }).id);
    } else {
      await supabase.from('wishlist').insert({
        user_id: me.id,
        user_phone: me.phone_number || '',
        item_id: itemId,
      });
    }
    return api.getWishlist();
  },

  getServices: async (params?: { search?: string; category?: string; country?: string }): Promise<{ services: ServiceProvider[] }> => {
    const [{ data, error }, profilesIdx] = await Promise.all([
      supabase
        .from('services')
        .select('*')
        .order('is_advertised', { ascending: false })
        .order('created_at', { ascending: false }),
      fetchProfilesIndex(),
    ]);

    if (error || !Array.isArray(data)) return { services: [] };
    let mapped: ServiceProvider[] = (data as Array<Record<string, unknown>>).map((s) => {
      const pid = String(s.provider_id || '');
      const prof = pid ? profilesIdx.byId.get(pid) : undefined;
      const inferredCountry = String(s.country || prof?.country || 'Nigeria');
      const stateCity = String(s.state_city || s.location || prof?.state_city || prof?.campus || '');
      return {
        id: String(s.id),
        provider_id: pid,
        provider_name: String(s.provider_name || prof?.full_name || 'Campus Provider'),
        provider_phone: String(s.provider_phone || prof?.phone_number || ''),
        profile_pic: String(s.profile_pic || prof?.profile_pic || ''),
        category: String(s.category || 'Services'),
        title: String(s.title || ''),
        description: String(s.description || ''),
        price_from: Number(s.price ?? s.price_from ?? 0),
        country: inferredCountry,
        state_city: stateCity,
        location: stateCity,
        distance_km: 1,
        rating: Number(s.rating || 5.0),
        reviews_count: Number(s.reviews_count || 0),
        work_photos: parseJsonArray(s.work_photos),
        offerings: Array.isArray(s.offerings)
          ? (s.offerings as ServiceProvider['offerings'])
          : [],
        reviews: Array.isArray(s.reviews) ? (s.reviews as ServiceProvider['reviews']) : [],
        badges: ['service_provider'],
        is_advertised: Boolean(s.is_advertised),
        created_at: String(s.created_at || new Date().toISOString()),
      };
    });

    if (params?.country && params.country !== 'All') {
      const tc = params.country.trim().toLowerCase();
      mapped = mapped.filter((s) => (s.country || 'Nigeria').toLowerCase() === tc);
    }
    if (params?.category && params.category !== 'All') {
      mapped = mapped.filter((s) => s.category === params.category);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      mapped = mapped.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.provider_name.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q)
      );
    }
    return { services: mapped };
  },

  createService: async (payload: {
    title: string;
    category: string;
    description: string;
    price_from: number;
    country?: string;
    state_city?: string;
    location: string;
    work_photos: string[];
    offerings: Array<{ name: string; price: number; duration: string }>;
  }): Promise<{ service: ServiceProvider }> => {
    const me = await getAuthenticatedUser();
    const countryVal = payload.country || me.country || 'Nigeria';
    const stateCityVal = payload.state_city || payload.location || me.state_city || me.campus || '';
    const { data, error } = await supabase
      .from('services')
      .insert({
        provider_id: me.id,
        provider_phone: me.phone_number || '',
        provider_name: me.full_name,
        profile_pic: me.profile_pic || '',
        category: payload.category,
        title: payload.title.trim(),
        description: payload.description.trim(),
        price: Number(payload.price_from || 0),
        price_from: Number(payload.price_from || 0),
        country: countryVal,
        state_city: stateCityVal,
        location: stateCityVal,
        work_photos: payload.work_photos,
        offerings: payload.offerings,
        reviews: [],
        rating: 5.0,
        reviews_count: 0,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Could not publish service.');
    }
    const s = data as Record<string, unknown>;
    return {
      service: {
        id: String(s.id),
        provider_id: me.id,
        provider_name: me.full_name,
        provider_phone: me.phone_number || '',
        profile_pic: me.profile_pic || '',
        category: payload.category,
        title: payload.title.trim(),
        description: payload.description.trim(),
        price_from: Number(payload.price_from || 0),
        country: countryVal,
        state_city: stateCityVal,
        location: stateCityVal,
        distance_km: 1,
        rating: 5.0,
        reviews_count: 0,
        work_photos: payload.work_photos,
        offerings: payload.offerings,
        reviews: [],
        badges: ['service_provider'],
        is_advertised: false,
        created_at: String(s.created_at || new Date().toISOString()),
      },
    };
  },

  advertiseService: async (serviceId: string, _paystackReference?: string) => {
    const { error } = await supabase
      .from('services')
      .update({ is_advertised: true })
      .eq('id', serviceId);
    if (error) throw new Error(error.message);
    return { ok: true, is_advertised: true };
  },

  addServiceReview: async (
    serviceId: string,
    payload: { rating: number; comment: string }
  ): Promise<{ service: ServiceProvider }> => {
    const me = await getAuthenticatedUser();
    const { data: svcRow, error: fetchErr } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();
    if (fetchErr || !svcRow) throw new Error('Service not found.');

    const row = svcRow as Record<string, unknown>;
    const existingReviews = Array.isArray(row.reviews)
      ? (row.reviews as ServiceProvider['reviews'])
      : [];
    const newRev = {
      id: `rev_${Date.now()}`,
      author_name: me.full_name,
      rating: payload.rating,
      comment: payload.comment.trim(),
      created_at: new Date().toISOString(),
    };
    const nextReviews = [newRev, ...existingReviews];
    const nextAvg = Number(
      (nextReviews.reduce((s, r) => s + Number(r.rating || 5), 0) / nextReviews.length).toFixed(1)
    );

    const { error: updErr } = await supabase
      .from('services')
      .update({
        reviews: nextReviews,
        rating: nextAvg,
        reviews_count: nextReviews.length,
      })
      .eq('id', serviceId);
    if (updErr) throw new Error(updErr.message);

    return {
      service: {
        id: String(row.id),
        provider_id: String(row.provider_id || ''),
        provider_name: String(row.provider_name || 'Provider'),
        provider_phone: String(row.provider_phone || ''),
        profile_pic: String(row.profile_pic || ''),
        category: String(row.category || ''),
        title: String(row.title || ''),
        description: String(row.description || ''),
        price_from: Number(row.price ?? row.price_from ?? 0),
        country: String(row.country || 'Nigeria'),
        state_city: String(row.state_city || row.location || ''),
        location: String(row.location || ''),
        distance_km: 1,
        rating: nextAvg,
        reviews_count: nextReviews.length,
        work_photos: parseJsonArray(row.work_photos),
        offerings: Array.isArray(row.offerings)
          ? (row.offerings as ServiceProvider['offerings'])
          : [],
        reviews: nextReviews,
        badges: ['service_provider'],
        is_advertised: Boolean(row.is_advertised),
        created_at: String(row.created_at || new Date().toISOString()),
      },
    };
  },

  bookService: async (payload: {
    service_id: string;
    service_name: string;
    scheduled_day: string;
    location: string;
    notes?: string;
    price: number;
    set_7_day_reminder?: boolean;
  }): Promise<{ booking: ServiceBooking }> => {
    const me = await getAuthenticatedUser();
    const { data: svc } = await supabase
      .from('services')
      .select('provider_id, provider_name, provider_phone, country')
      .eq('id', payload.service_id)
      .maybeSingle();

    const reminderDate = payload.set_7_day_reminder
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const svcRow = svc as { provider_id?: string; provider_name?: string; provider_phone?: string; country?: string } | null;
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        service_id: payload.service_id,
        provider_id: svcRow?.provider_id || null,
        provider_phone: svcRow?.provider_phone || '',
        customer_id: me.id,
        customer_phone: me.phone_number || '',
        customer_name: me.full_name,
        service_name: payload.service_name,
        scheduled_day: payload.scheduled_day,
        location: payload.location,
        notes: payload.notes || '',
        price: Number(payload.price || 0),
        status: 'confirmed',
        reminder_date: reminderDate,
      })
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Booking failed.');

    // Also record a corresponding service order in public.orders
    await supabase
      .from('orders')
      .insert({
        reference: `SVC_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        product_id: payload.service_id,
        item_id: payload.service_id,
        item_title: `Service: ${payload.service_name}`,
        item_location: payload.location,
        buyer_id: me.id,
        buyer_name: me.full_name,
        buyer_phone: me.phone_number || '',
        buyer_email: me.email || '',
        seller_id: isUuid(svcRow?.provider_id) ? svcRow?.provider_id : null,
        seller_name: svcRow?.provider_name || 'Service Provider',
        seller_phone: svcRow?.provider_phone || '',
        quantity: 1,
        product_price: Number(payload.price || 0),
        total_price: Number(payload.price || 0),
        total_amount: Number(payload.price || 0),
        total: Number(payload.price || 0),
        delivery_address: payload.location,
        country: svcRow?.country || me.country || 'Nigeria',
        status: 'pending',
        order_status: 'paid_escrow',
      })
      .then(() => {});

    const providerUid = svcRow?.provider_id || '';
    if (providerUid && providerUid !== me.id) {
      await createNotificationRecord({
        user_id: providerUid,
        title: `New Service Booking: ${payload.service_name}`,
        body: `${me.full_name} booked for ${payload.scheduled_day} at ${payload.location}`,
        type: 'booking_received',
      });
    }
    const b = data as Record<string, unknown>;
    return {
      booking: {
        id: String(b.id),
        service_id: payload.service_id,
        service_title: payload.service_name,
        provider_name: String(svcRow?.provider_name || 'Provider'),
        provider_phone: String(svcRow?.provider_phone || ''),
        scheduled_day: payload.scheduled_day,
        location: payload.location,
        notes: payload.notes || '',
        price: Number(payload.price || 0),
        status: 'confirmed',
        reminder_date: reminderDate || undefined,
        created_at: String(b.created_at || new Date().toISOString()),
      },
    };
  },

  getBookings: async (): Promise<{ bookings: ServiceBooking[] }> => {
    const me = await getAuthenticatedUser().catch(() => null);
    if (!me) return { bookings: [] };
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !Array.isArray(data)) return { bookings: [] };

    const bookings: ServiceBooking[] = (data as Array<Record<string, unknown>>)
      .filter((b) => b.customer_id === me.id || b.provider_id === me.id)
      .map((b) => ({
        id: String(b.id),
        service_id: String(b.service_id || ''),
        service_title: String(b.service_name || 'Service Booking'),
        provider_name: String(b.customer_name || 'Provider'),
        provider_phone: String(b.provider_phone || ''),
        scheduled_day: String(b.scheduled_day || ''),
        location: String(b.location || ''),
        notes: String(b.notes || ''),
        price: Number(b.price || 0),
        status: String(b.status || 'confirmed'),
        reminder_date: typeof b.reminder_date === 'string' ? b.reminder_date : undefined,
        created_at: String(b.created_at || new Date().toISOString()),
      }));
    return { bookings };
  },

  getShops: async (params?: { country?: string }): Promise<{ shops: TraderShop[] }> => {
    const [shopsRes, itemsRes] = await Promise.all([
      supabase
        .from('shops')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false }),
      api.getItems({ limit: 300 }),
    ]);

    if (shopsRes.error || !Array.isArray(shopsRes.data)) return { shops: [] };
    const allItems = itemsRes.items;

    let shops: TraderShop[] = (shopsRes.data as Array<Record<string, unknown>>).map((s) => {
      const shopId = String(s.id);
      const ownerId = String(s.owner_id || '');
      const ownerPhone = String(s.owner_phone || '');
      const shopProducts = allItems.filter(
        (it) =>
          it.shop_id === shopId ||
          (ownerId && it.seller_id === ownerId) ||
          (ownerPhone && it.seller_id === ownerPhone)
      );
      return {
        id: shopId,
        owner_id: ownerId,
        owner_name: String(s.owner_name || 'Trader'),
        shop_name: String(s.shop_name || 'Campus Shop'),
        description: String(s.description || ''),
        country: String(s.country || 'Nigeria'),
        state_city: String(s.state_city || s.market || ''),
        market: String(s.market || s.state_city || ''),
        shop_photo: String(s.shop_photo || ''),
        whatsapp_phone: ownerPhone || undefined,
        rating: Number(s.rating || 5.0),
        sales_count: Number(s.sales_count || 0),
        is_featured: Boolean(s.is_featured),
        products_count: shopProducts.length,
        products: shopProducts,
      };
    });

    if (params?.country && params.country !== 'All') {
      const tc = params.country.trim().toLowerCase();
      shops = shops.filter((sh) => (sh.country || 'Nigeria').toLowerCase() === tc);
    }

    return { shops };
  },

  getMyShop: async (): Promise<{ shop: TraderShop | null }> => {
    const me = await getAuthenticatedUser().catch(() => null);
    if (!me) return { shop: null };
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', me.id)
      .maybeSingle();
    if (error || !data) return { shop: null };
    const s = data as Record<string, unknown>;
    const shopId = String(s.id);
    const { items } = await api.getItems({ sellerId: me.id, limit: 100 });
    return {
      shop: {
        id: shopId,
        owner_id: me.id,
        owner_name: String(s.owner_name || me.full_name),
        shop_name: String(s.shop_name || 'My Shop'),
        description: String(s.description || ''),
        country: String(s.country || me.country || 'Nigeria'),
        state_city: String(s.state_city || s.market || me.state_city || ''),
        market: String(s.market || s.state_city || ''),
        shop_photo: String(s.shop_photo || ''),
        whatsapp_phone: String(s.owner_phone || me.phone_number || ''),
        rating: Number(s.rating || 5.0),
        sales_count: Number(s.sales_count || 0),
        is_featured: Boolean(s.is_featured),
        products_count: items.length,
        products: items,
      },
    };
  },

  updateMyShop: async (payload: {
    shop_name: string;
    description?: string;
    country?: string;
    state_city?: string;
    market: string;
    shop_photo?: string;
  }): Promise<{ shop: TraderShop }> => {
    const me = await getAuthenticatedUser();
    const { data: existing } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', me.id)
      .maybeSingle();

    const uploadedShopPhoto =
      payload.shop_photo && payload.shop_photo.startsWith('data:')
        ? await uploadProductImage(payload.shop_photo, 'shops')
        : payload.shop_photo;

    const shopPayload = {
      owner_id: me.id,
      owner_name: me.full_name,
      owner_phone: me.phone_number || `shop_${me.id.slice(0, 8)}`,
      shop_name: payload.shop_name.trim(),
      description: (payload.description || '').trim(),
      country: payload.country || me.country || 'Nigeria',
      state_city: (payload.state_city || payload.market || me.state_city || '').trim(),
      market: payload.market.trim() || (payload.state_city || '').trim(),
      ...(uploadedShopPhoto ? { shop_photo: uploadedShopPhoto } : {}),
    };

    const res = existing
      ? await supabase.from('shops').update(shopPayload).eq('id', (existing as { id: string }).id).select('*').single()
      : await supabase.from('shops').insert(shopPayload).select('*').single();

    if (res.error || !res.data) throw new Error(res.error?.message || 'Could not save shop.');

    await api.updateProfile({
      shop_name: payload.shop_name.trim(),
      market: payload.market.trim(),
    }).catch(() => {});

    const s = res.data as Record<string, unknown>;
    return {
      shop: {
        id: String(s.id),
        owner_id: me.id,
        owner_name: me.full_name,
        shop_name: String(s.shop_name),
        description: String(s.description || ''),
        country: String(s.country || me.country || 'Nigeria'),
        state_city: String(s.state_city || s.market || ''),
        market: String(s.market || ''),
        shop_photo: String(s.shop_photo || ''),
        whatsapp_phone: me.phone_number,
        rating: Number(s.rating || 5.0),
        sales_count: Number(s.sales_count || 0),
        is_featured: Boolean(s.is_featured),
        products_count: 0,
        products: [],
      },
    };
  },

  deleteMyShop: async (shopId: string): Promise<{ ok: boolean }> => {
    const me = await getAuthenticatedUser();
    const { error } = await supabase
      .from('shops')
      .delete()
      .eq('id', shopId)
      .eq('owner_id', me.id);
    if (error) throw new Error(error.message);
    await api.updateProfile({ shop_name: '' }).catch(() => {});
    return { ok: true };
  },

  featureMyShop: async (_paystackReference?: string) => {
    const me = await getAuthenticatedUser();
    const { error } = await supabase
      .from('shops')
      .update({ is_featured: true })
      .eq('owner_id', me.id);
    if (error) throw new Error(error.message);
    return { ok: true, is_featured: true };
  },

  getLiveVideos: async (params?: { country?: string }): Promise<{ videos: LiveVideo[] }> => {
    const { data, error } = await supabase
      .from('live_videos')
      .select('*')
      .eq('is_live', true)
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) return { videos: [] };
    let videos: LiveVideo[] = (data as Array<Record<string, unknown>>).map((v) => ({
      id: String(v.id),
      seller_id: String(v.seller_id || ''),
      seller_name: String(v.seller_name || 'Seller'),
      seller_phone: typeof v.seller_phone === 'string' ? v.seller_phone : undefined,
      shop_id: typeof v.shop_id === 'string' ? v.shop_id : undefined,
      shop_name: typeof v.shop_name === 'string' ? v.shop_name : undefined,
      title: String(v.title || 'Live Product Showcase'),
      description: typeof v.description === 'string' ? v.description : '',
      video_url: String(v.video_url || ''),
      thumbnail_url: typeof v.thumbnail_url === 'string' ? v.thumbnail_url : undefined,
      country: String(v.country || 'Nigeria'),
      is_live: Boolean(v.is_live),
      viewers_count: Number(v.viewers_count || 0),
      created_at: String(v.created_at || new Date().toISOString()),
      ended_at: typeof v.ended_at === 'string' ? v.ended_at : undefined,
    }));

    if (params?.country && params.country !== 'All') {
      const tc = params.country.trim().toLowerCase();
      videos = videos.filter((v) => v.country.toLowerCase() === tc);
    }
    return { videos };
  },

  getMyLiveVideos: async (): Promise<{ videos: LiveVideo[] }> => {
    const me = await getAuthenticatedUser().catch(() => null);
    if (!me) return { videos: [] };
    const { data, error } = await supabase
      .from('live_videos')
      .select('*')
      .eq('seller_id', me.id)
      .order('created_at', { ascending: false });
    if (error || !Array.isArray(data)) return { videos: [] };
    return {
      videos: (data as Array<Record<string, unknown>>).map((v) => ({
        id: String(v.id),
        seller_id: String(v.seller_id || me.id),
        seller_name: String(v.seller_name || me.full_name),
        seller_phone: typeof v.seller_phone === 'string' ? v.seller_phone : me.phone_number,
        shop_id: typeof v.shop_id === 'string' ? v.shop_id : undefined,
        shop_name: typeof v.shop_name === 'string' ? v.shop_name : undefined,
        title: String(v.title || 'Live Product Showcase'),
        description: typeof v.description === 'string' ? v.description : '',
        video_url: String(v.video_url || ''),
        thumbnail_url: typeof v.thumbnail_url === 'string' ? v.thumbnail_url : undefined,
        country: String(v.country || me.country || 'Nigeria'),
        is_live: Boolean(v.is_live),
        viewers_count: Number(v.viewers_count || 0),
        created_at: String(v.created_at || new Date().toISOString()),
        ended_at: typeof v.ended_at === 'string' ? v.ended_at : undefined,
      })),
    };
  },

  startLiveVideo: async (payload: {
    shop_id?: string;
    shop_name?: string;
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url?: string;
    country?: string;
  }): Promise<{ video: LiveVideo }> => {
    const me = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('live_videos')
      .insert({
        seller_id: me.id,
        seller_name: me.full_name,
        seller_phone: me.phone_number || '',
        shop_id: payload.shop_id || '',
        shop_name: payload.shop_name || me.shop_name || '',
        title: payload.title.trim(),
        description: (payload.description || '').trim(),
        video_url: payload.video_url.trim(),
        thumbnail_url: payload.thumbnail_url || '',
        country: payload.country || me.country || 'Nigeria',
        is_live: true,
        viewers_count: 1,
      })
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Could not start Live Video.');
    const v = data as Record<string, unknown>;
    return {
      video: {
        id: String(v.id),
        seller_id: me.id,
        seller_name: me.full_name,
        seller_phone: me.phone_number,
        shop_id: String(v.shop_id || ''),
        shop_name: String(v.shop_name || ''),
        title: String(v.title || payload.title),
        description: String(v.description || ''),
        video_url: String(v.video_url || payload.video_url),
        thumbnail_url: String(v.thumbnail_url || ''),
        country: String(v.country || me.country || 'Nigeria'),
        is_live: true,
        viewers_count: Number(v.viewers_count || 1),
        created_at: String(v.created_at || new Date().toISOString()),
      },
    };
  },

  endLiveVideo: async (liveId: string): Promise<{ ok: boolean }> => {
    const me = await getAuthenticatedUser();
    const { error } = await supabase
      .from('live_videos')
      .update({ is_live: false, ended_at: new Date().toISOString() })
      .eq('id', liveId)
      .eq('seller_id', me.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  getThreads: async (): Promise<{ threads: ChatThread[] }> => {
    const me = await getAuthenticatedUser().catch(() => null);
    if (!me) return { threads: [] };

    const [msgsRes, profilesIdx, itemsRes] = await Promise.all([
      supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(500),
      fetchProfilesIndex(),
      supabase.from('products').select('*'),
    ]);

    if (msgsRes.error || !Array.isArray(msgsRes.data)) return { threads: [] };

    const itemById = new Map<string, MarketplaceItem>();
    if (Array.isArray(itemsRes.data)) {
      for (const r of itemsRes.data as Array<Record<string, unknown>>) {
        const mapped = mapSupabaseItemRow(r, profilesIdx.byId, profilesIdx.byPhone);
        itemById.set(mapped.id, mapped);
      }
    }

    const threadMap = new Map<string, ChatThread>();
    for (const raw of msgsRes.data as Array<Record<string, unknown>>) {
      const senderId = String(raw.sender_id || '');
      const receiverId = String(raw.receiver_id || '');
      const buyerPhone = String(raw.buyer_phone || '');
      const sellerPhone = String(raw.seller_phone || '');
      const senderPhone = String(raw.sender_phone || '');
      const listingId = String(raw.listing_id || raw.item_id || '');

      const myPhone = me.phone_number || '';
      const involvesMe =
        senderId === me.id ||
        receiverId === me.id ||
        (myPhone && (buyerPhone === myPhone || sellerPhone === myPhone || senderPhone === myPhone));

      if (!involvesMe || !listingId) continue;

      const sentByMe =
        senderId ? senderId === me.id : Boolean(myPhone && (senderPhone === myPhone || buyerPhone === myPhone));
      const partnerId =
        (sentByMe ? receiverId : senderId) ||
        (myPhone === buyerPhone ? sellerPhone : buyerPhone) ||
        'partner';

      const partnerProf =
        profilesIdx.byId.get(partnerId) ||
        profilesIdx.byPhone.get(partnerId) ||
        profilesIdx.byPhone.get(myPhone === buyerPhone ? sellerPhone : buyerPhone);

      const item = itemById.get(listingId) || makeFallbackSyntheticItem(listingId, partnerProf);
      const threadKey = `${listingId}::${partnerProf?.id || partnerId}`;
      const isUnread = !sentByMe && raw.read_by_recipient === false;

      const existing = threadMap.get(threadKey);
      if (!existing) {
        threadMap.set(threadKey, {
          thread_key: threadKey,
          item_id: listingId,
          item_title: item.title,
          item_price: item.price,
          item_photo: item.thumbnails?.[0] || item.photos?.[0] || '',
          item_institution: item.institution,
          partner_id: partnerProf?.id || partnerId,
          partner_name: partnerProf?.full_name || item.seller_name || 'Campus Member',
          partner_institution: partnerProf?.institution || item.institution,
          partner_profile_pic: partnerProf?.profile_pic || '',
          is_seller: item.seller_id === me.id,
          last_message: String(raw.message || ''),
          last_message_at: String(raw.created_at || new Date().toISOString()),
          unread_count: isUnread ? 1 : 0,
        });
      } else if (isUnread) {
        existing.unread_count += 1;
      }
    }

    return { threads: Array.from(threadMap.values()) };
  },

  getThreadMessages: async (
    itemId: string,
    partnerId?: string
  ): Promise<{ item: MarketplaceItem; partner: PublicUser; messages: ChatMessage[] }> => {
    const me = await getAuthenticatedUser();
    const profilesIdx = await fetchProfilesIndex();

    let resolvedItem: MarketplaceItem | null = null;
    if (isUuid(itemId)) {
      const { data: itemRow } = await supabase.from('products').select('*').eq('id', itemId).maybeSingle();
      if (itemRow) {
        resolvedItem = mapSupabaseItemRow(
          itemRow as Record<string, unknown>,
          profilesIdx.byId,
          profilesIdx.byPhone
        );
      }
    }

    let resolvedPartner: PublicUser | undefined =
      (partnerId && (profilesIdx.byId.get(partnerId) || profilesIdx.byPhone.get(partnerId))) ||
      undefined;

    if (!resolvedPartner && itemId.startsWith('shop:')) {
      const oid = itemId.slice('shop:'.length);
      resolvedPartner = profilesIdx.byId.get(oid) || profilesIdx.byPhone.get(oid);
    } else if (!resolvedPartner && itemId.startsWith('service:')) {
      const sid = itemId.slice('service:'.length);
      const { data: svc } = await supabase.from('services').select('provider_id').eq('id', sid).maybeSingle();
      const pid = (svc as { provider_id?: string } | null)?.provider_id;
      if (pid) resolvedPartner = profilesIdx.byId.get(pid);
    } else if (!resolvedPartner && resolvedItem) {
      resolvedPartner =
        profilesIdx.byId.get(resolvedItem.seller_id) || profilesIdx.byPhone.get(resolvedItem.seller_id);
    }

    const fallbackPartner: PublicUser = resolvedPartner || {
      id: partnerId || resolvedItem?.seller_id || 'partner',
      full_name: resolvedItem?.seller_name || 'Campus Member',
      role: 'seller',
      badges: resolvedItem?.seller_badges || ['student'],
      institution: resolvedItem?.institution || 'Campus',
      state: resolvedItem?.state || '',
      campus: resolvedItem?.location || 'Main Campus',
      profile_pic: resolvedItem?.seller_profile_pic || '',
      blocked: false,
      block_count: 0,
      created_at: new Date().toISOString(),
    };

    const item = resolvedItem || makeFallbackSyntheticItem(itemId, fallbackPartner);

    const { data: msgsData } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    const myPhone = me.phone_number || '';
    const filteredRows = Array.isArray(msgsData)
      ? (msgsData as Array<Record<string, unknown>>).filter((r) => {
          const rowListing = String(r.listing_id || r.item_id || '');
          if (rowListing !== itemId) return false;
          const sid = String(r.sender_id || '');
          const rid = String(r.receiver_id || '');
          const bp = String(r.buyer_phone || '');
          const sp = String(r.seller_phone || '');
          const sdp = String(r.sender_phone || '');
          const involvesMe =
            sid === me.id ||
            rid === me.id ||
            (myPhone && (bp === myPhone || sp === myPhone || sdp === myPhone));
          if (!involvesMe) return false;
          if (partnerId && sid && rid) {
            return sid === partnerId || rid === partnerId;
          }
          return true;
        })
      : [];

    // Mark unread received messages as read (non-blocking)
    const unreadIds = filteredRows
      .filter((r) => r.receiver_id === me.id && r.read_by_recipient === false)
      .map((r) => String(r.id));
    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ read_by_recipient: true })
        .in('id', unreadIds)
        .then(() => {});
    }

    const messages: ChatMessage[] = filteredRows.map((r) => {
      const sid = String(r.sender_id || '');
      const sdp = String(r.sender_phone || '');
      const bp = String(r.buyer_phone || '');
      const senderIsMe =
        sid ? sid === me.id : Boolean(myPhone && (sdp === myPhone || bp === myPhone));
      return {
        id: String(r.id),
        item_id: itemId,
        sender_is_me: senderIsMe,
        sender_name: senderIsMe ? me.full_name : fallbackPartner.full_name,
        message: String(r.message || ''),
        read_by_recipient: Boolean(r.read_by_recipient),
        created_at: String(r.created_at || new Date().toISOString()),
      };
    });

    return { item, partner: fallbackPartner, messages };
  },

  sendMessage: async (payload: {
    item_id: string;
    partner_id?: string;
    message: string;
  }): Promise<{ message: ChatMessage }> => {
    const me = await getAuthenticatedUser();
    const text = (payload.message || '').trim();
    if (!text) {
      throw new Error('Message cannot be empty.');
    }

    const acctCheck = containsProhibitedBankAccount(text);
    if (acctCheck.matched) {
      await supabase.from('account_block_logs').insert({
        log_type: 'Account Number Blocked',
        user_phone: me.phone_number || '',
        user_name: me.full_name,
        item_id: payload.item_id,
        snippet: acctCheck.snippet,
      });
      await supabase.from('reports').insert({
        target_type: 'user',
        target_id: me.id,
        reporter_id: me.id,
        reporter_phone: me.phone_number || '',
        reason: `Account Number Blocked: ${acctCheck.snippet}`,
        resolved: false,
      });
      throw new Error(
        'Bank account numbers are blocked in chat for your safety. Pay only through Paystack Escrow on Afri Student Mart.'
      );
    }

    const profilesIdx = await fetchProfilesIndex();
    let receiverId: string | null = isUuid(payload.partner_id) ? payload.partner_id : null;
    let sellerPhone = '';

    if (payload.item_id.startsWith('shop:')) {
      const oid = payload.item_id.slice('shop:'.length);
      if (isUuid(oid)) receiverId = receiverId || oid;
    } else if (payload.item_id.startsWith('service:')) {
      const sid = payload.item_id.slice('service:'.length);
      const { data: svc } = await supabase
        .from('services')
        .select('provider_id, provider_phone')
        .eq('id', sid)
        .maybeSingle();
      const srow = svc as { provider_id?: string; provider_phone?: string } | null;
      if (isUuid(srow?.provider_id)) receiverId = receiverId || srow!.provider_id!;
      sellerPhone = srow?.provider_phone || '';
    } else if (isUuid(payload.item_id)) {
      const { data: itemRow } = await supabase
        .from('products')
        .select('seller_id, seller_phone')
        .eq('id', payload.item_id)
        .maybeSingle();
      const irow = itemRow as { seller_id?: string; seller_phone?: string } | null;
      sellerPhone = irow?.seller_phone || '';
      if (!receiverId && isUuid(irow?.seller_id)) {
        receiverId = irow!.seller_id!;
      } else if (!receiverId && sellerPhone) {
        const p = profilesIdx.byPhone.get(sellerPhone);
        if (p && isUuid(p.id)) receiverId = p.id;
      }
    }

    const receiverProfile = receiverId ? profilesIdx.byId.get(receiverId) : undefined;
    const buyerPhone = me.phone_number || me.id;
    const resolvedSellerPhone = receiverProfile?.phone_number || sellerPhone || receiverId || 'seller';

    const modernRow = {
      sender_id: me.id,
      receiver_id: receiverId,
      listing_id: payload.item_id,
      ...(isUuid(payload.item_id) ? { item_id: payload.item_id } : {}),
      buyer_phone: buyerPhone,
      seller_phone: resolvedSellerPhone,
      sender_phone: buyerPhone,
      message: text,
      read_by_recipient: false,
    };

    let ins = await supabase.from('messages').insert(modernRow).select('*').single();

    if (ins.error && isMissingColumnError(ins.error)) {
      // Compatibility fallback if live `messages` table still uses legacy columns before migration
      const legacyRow = {
        ...(isUuid(payload.item_id) ? { item_id: payload.item_id } : {}),
        buyer_phone: buyerPhone,
        seller_phone: resolvedSellerPhone,
        message: text,
      };
      ins = await supabase.from('messages').insert(legacyRow).select('*').single();
    }

    if (ins.error || !ins.data) {
      throw new Error(ins.error?.message || 'Could not send message.');
    }

    if (receiverId && receiverId !== me.id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          title: `New message from ${me.full_name}`,
          body: text.slice(0, 100),
          type: 'new_message',
        })
        .then(() => {});
    }

    const r = ins.data as Record<string, unknown>;
    return {
      message: {
        id: String(r.id),
        item_id: payload.item_id,
        sender_is_me: true,
        sender_name: me.full_name,
        message: String(r.message || text),
        read_by_recipient: false,
        created_at: String(r.created_at || new Date().toISOString()),
      },
    };
  },

  getAdSettings: async (): Promise<{ settings: AdSettings }> => {
    const defaults: AdSettings = {
      ads_enabled: false,
      interstitial_enabled: false,
      publisher_id: '',
      banner_unit_id: '',
      feed_unit_id: '',
      interstitial_unit_id: '',
      sidebar_unit_id: '',
      google_ads_earnings: 0,
      paystack_public_key: PAYSTACK_PUBLIC_KEY_PLACEHOLDER,
      paystack_split_code: PAYSTACK_SPLIT_CODE_PLACEHOLDER,
      admin_subaccount_code: '',
      commission_percent: 10,
      site_name: 'Afri Student Mart',
      announcement: '',
      announcement_enabled: false,
    };
    const { data, error } = await supabase
      .from('ad_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
    if (error || !data) return { settings: defaults };
    const r = data as Record<string, unknown>;
    return {
      settings: {
        ads_enabled: Boolean(r.ads_enabled),
        interstitial_enabled: false,
        publisher_id: String(r.publisher_id || ''),
        banner_unit_id: String(r.banner_unit_id || ''),
        feed_unit_id: String(r.feed_unit_id || ''),
        interstitial_unit_id: String(r.interstitial_unit_id || ''),
        sidebar_unit_id: String(r.sidebar_unit_id || r.banner_unit_id || ''),
        google_ads_earnings: Number(r.google_ads_earnings || 0),
        paystack_public_key: String(r.paystack_public_key || PAYSTACK_PUBLIC_KEY_PLACEHOLDER),
        paystack_split_code: String(r.paystack_split_code || PAYSTACK_SPLIT_CODE_PLACEHOLDER),
        admin_subaccount_code: String(r.admin_subaccount_code || ''),
        commission_percent:
          typeof r.commission_percent === 'number' || typeof r.commission_percent === 'string'
            ? Number(r.commission_percent)
            : 10,
        site_name: typeof r.site_name === 'string' && r.site_name.trim() ? r.site_name : 'Afri Student Mart',
        announcement: typeof r.announcement === 'string' ? r.announcement : '',
        announcement_enabled: Boolean(r.announcement_enabled),
      },
    };
  },

  getOwnerDashboard: async (): Promise<OwnerDashboardData> => {
    const me = await getAuthenticatedUser();
    if (!isVerifiedOwnerUser(me)) {
      throw new Error('Access Denied');
    }

    const [profilesIdx, itemsRes, ordersRes, reportsRes, msgsRes, adRes] = await Promise.all([
      fetchProfilesIndex(),
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(1500),
      api.getAdSettings(),
    ]);

    const commissionPercent = Number(adRes.settings.commission_percent ?? 10);

    const users = profilesIdx.all.map((u) => ({
      ...u,
      phone_number: u.phone_number || '',
    }));

    const rawItems = Array.isArray(itemsRes.data)
      ? (itemsRes.data as Array<Record<string, unknown>>)
      : [];
    const items = rawItems.map((r) => ({
      ...mapSupabaseItemRow(r, profilesIdx.byId, profilesIdx.byPhone),
      seller_phone: String(r.seller_phone || ''),
    }));

    const orders = Array.isArray(ordersRes.data)
      ? (ordersRes.data as Array<Record<string, unknown>>).map((o) => ({
          id: String(o.id),
          reference: String(o.reference || ''),
          item_id: String(o.item_id || ''),
          item_title: String(o.item_title || ''),
          item_photo: String(o.item_photo || ''),
          item_location: String(o.item_location || ''),
          buyer_id: String(o.buyer_id || ''),
          buyer_name: String(o.buyer_name || ''),
          buyer_phone: String(o.buyer_phone || ''),
          buyer_email: String(o.buyer_email || ''),
          seller_id: String(o.seller_id || ''),
          seller_name: String(o.seller_name || ''),
          seller_phone: String(o.seller_phone || ''),
          product_price: Number(o.product_price || 0),
          delivery_fee: Number(o.delivery_fee || 0),
          total_amount: Number(o.total_amount || 0),
          admin_commission:
            Number(o.admin_commission || 0) ||
            Math.round(Number(o.product_price || 0) * (commissionPercent / 100)),
          admin_total_kept: Number(o.admin_total_kept || 0),
          seller_payout: Number(o.seller_payout || 0),
          delivery_address: String(o.delivery_address || ''),
          order_status: String(o.order_status || 'paid_escrow') as EscrowOrder['order_status'],
          refund_reason: typeof o.refund_reason === 'string' ? o.refund_reason : undefined,
          refund_photo: typeof o.refund_photo === 'string' ? o.refund_photo : undefined,
          created_at: String(o.created_at || new Date().toISOString()),
        }))
      : [];

    const reports: ReportRecord[] = Array.isArray(reportsRes.data)
      ? (reportsRes.data as Array<Record<string, unknown>>).map((r) => ({
          id: String(r.id),
          target_type: (String(r.target_type || 'item') as ReportRecord['target_type']),
          target_id: String(r.target_id || ''),
          target_label: String(r.target_id || ''),
          reporter_phone: String(r.reporter_phone || ''),
          reason: String(r.reason || ''),
          resolved: Boolean(r.resolved),
          created_at: String(r.created_at || new Date().toISOString()),
        }))
      : [];

    // Date windows for Today / This Week / This Month
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let ordersToday = 0;
    let ordersWeek = 0;
    let ordersMonth = 0;
    for (const o of orders) {
      const ts = new Date(o.created_at).getTime();
      if (!Number.isFinite(ts)) continue;
      if (ts >= startOfToday) ordersToday += 1;
      if (ts >= startOfWeek) ordersWeek += 1;
      if (ts >= startOfMonth) ordersMonth += 1;
    }

    // Daily sales series (last 14 days)
    const dailyMap = new Map<string, OwnerSalesPoint>();
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(startOfToday - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, {
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: 0,
        orders: 0,
        commission: 0,
      });
    }
    for (const o of orders) {
      const key = String(o.created_at || '').slice(0, 10);
      const slot = dailyMap.get(key);
      if (slot && o.order_status !== 'cancelled' && o.order_status !== 'refund_approved') {
        slot.sales += o.total_amount;
        slot.orders += 1;
        slot.commission += o.admin_commission;
      }
    }

    // Weekly sales series (last 8 weeks)
    const salesSeriesWeekly: OwnerSalesPoint[] = [];
    for (let w = 7; w >= 0; w -= 1) {
      const endTs = startOfToday + 24 * 60 * 60 * 1000 - w * 7 * 24 * 60 * 60 * 1000;
      const startTs = endTs - 7 * 24 * 60 * 60 * 1000;
      const startDate = new Date(startTs);
      const point: OwnerSalesPoint = {
        label: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: 0,
        orders: 0,
        commission: 0,
      };
      for (const o of orders) {
        if (o.order_status === 'cancelled' || o.order_status === 'refund_approved') continue;
        const ts = new Date(o.created_at).getTime();
        if (ts >= startTs && ts < endTs) {
          point.sales += o.total_amount;
          point.orders += 1;
          point.commission += o.admin_commission;
        }
      }
      salesSeriesWeekly.push(point);
    }

    // Institutions, buyers purchases, sellers listings
    const instStats = new Map<string, { name: string; users: number; items: number }>();
    for (const u of users) {
      if (!u.institution) continue;
      const cur = instStats.get(u.institution) || { name: u.institution, users: 0, items: 0 };
      cur.users += 1;
      instStats.set(u.institution, cur);
    }
    for (const it of items) {
      if (!it.institution || it.status !== 'active') continue;
      const cur = instStats.get(it.institution) || { name: it.institution, users: 0, items: 0 };
      cur.items += 1;
      instStats.set(it.institution, cur);
    }

    const buyerPurchases: Record<string, string[]> = {};
    for (const o of orders) {
      const keys = [o.buyer_id, o.buyer_phone, o.buyer_email].filter(Boolean);
      for (const k of keys) {
        if (!buyerPurchases[k]) buyerPurchases[k] = [];
        if (o.item_title && !buyerPurchases[k].includes(o.item_title)) {
          buyerPurchases[k].push(o.item_title);
        }
      }
    }

    const sellerListings: Record<string, string[]> = {};
    for (const it of items) {
      const keys = [it.seller_id, it.seller_phone].filter(Boolean);
      for (const k of keys) {
        if (!sellerListings[k]) sellerListings[k] = [];
        if (it.title && !sellerListings[k].includes(it.title)) {
          sellerListings[k].push(it.title);
        }
      }
    }

    // Stealth Read-Only Chat Transcripts (ZERO writes / ZERO read-receipt mutations)
    const rawMsgs = Array.isArray(msgsRes.data)
      ? (msgsRes.data as Array<Record<string, unknown>>)
      : [];
    const itemById = new Map(items.map((it) => [it.id, it]));
    const msgCountByItem = new Map<string, number>();
    const threadMap = new Map<string, OwnerStealthThread>();

    for (const r of rawMsgs) {
      const listingId = String(r.listing_id || r.item_id || 'general');
      msgCountByItem.set(listingId, (msgCountByItem.get(listingId) || 0) + 1);

      const senderId = String(r.sender_id || '');
      const receiverId = String(r.receiver_id || '');
      const buyerPhone = String(r.buyer_phone || '');
      const sellerPhone = String(r.seller_phone || '');
      const senderPhone = String(r.sender_phone || buyerPhone || '');

      const linkedItem = itemById.get(listingId);
      const resolvedSellerProf =
        (linkedItem?.seller_id && profilesIdx.byId.get(linkedItem.seller_id)) ||
        (sellerPhone && profilesIdx.byPhone.get(sellerPhone)) ||
        (receiverId && profilesIdx.byId.get(receiverId)) ||
        undefined;

      const resolvedBuyerProf =
        (buyerPhone && profilesIdx.byPhone.get(buyerPhone)) ||
        (senderId && senderId !== resolvedSellerProf?.id ? profilesIdx.byId.get(senderId) : undefined) ||
        (receiverId && receiverId !== resolvedSellerProf?.id ? profilesIdx.byId.get(receiverId) : undefined) ||
        undefined;

      const p1Key = resolvedBuyerProf?.id || buyerPhone || senderId || 'buyer';
      const p2Key = resolvedSellerProf?.id || sellerPhone || receiverId || linkedItem?.seller_id || 'seller';
      const sortedPair = [p1Key, p2Key].sort().join('::');
      const threadKey = `${listingId}::${sortedPair}`;

      const senderProf =
        (senderId ? profilesIdx.byId.get(senderId) : undefined) ||
        (senderPhone ? profilesIdx.byPhone.get(senderPhone) : undefined);
      const isSenderSeller =
        Boolean(resolvedSellerProf && senderProf?.id === resolvedSellerProf.id) ||
        Boolean(sellerPhone && senderPhone === sellerPhone);

      const msgEntry: OwnerStealthMessage = {
        id: String(r.id || `${threadKey}_${r.created_at}`),
        sender_name:
          senderProf?.full_name ||
          (isSenderSeller ? linkedItem?.seller_name : resolvedBuyerProf?.full_name) ||
          senderPhone ||
          'Member',
        sender_phone: senderProf?.phone_number || senderPhone || '',
        sender_role_label: isSenderSeller ? 'Seller' : buyerPhone || resolvedBuyerProf ? 'Buyer' : 'Member',
        message: String(r.message || ''),
        created_at: String(r.created_at || new Date().toISOString()),
      };

      const existing = threadMap.get(threadKey);
      if (!existing) {
        threadMap.set(threadKey, {
          thread_key: threadKey,
          listing_id: listingId,
          item_title: linkedItem?.title || (listingId.startsWith('shop:') ? 'Trader Shop Inquiry' : listingId.startsWith('service:') ? 'Service Inquiry' : 'Marketplace Chat'),
          item_price: linkedItem?.price || 0,
          buyer_name: resolvedBuyerProf?.full_name || buyerPhone || 'Buyer',
          buyer_phone: resolvedBuyerProf?.phone_number || buyerPhone || '',
          buyer_email: resolvedBuyerProf?.email || '',
          seller_name: resolvedSellerProf?.full_name || linkedItem?.seller_name || sellerPhone || 'Seller',
          seller_phone: resolvedSellerProf?.phone_number || sellerPhone || linkedItem?.seller_phone || '',
          seller_email: resolvedSellerProf?.email || '',
          last_message_at: msgEntry.created_at,
          message_count: 1,
          messages: [msgEntry],
        });
      } else {
        existing.messages.push(msgEntry);
        existing.message_count += 1;
        existing.last_message_at = msgEntry.created_at;
      }
    }

    const chatThreads = Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    // Most Popular Products
    const orderStatsByItem = new Map<string, { count: number; revenue: number }>();
    for (const o of orders) {
      if (!o.item_id) continue;
      const cur = orderStatsByItem.get(o.item_id) || { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += o.total_amount;
      orderStatsByItem.set(o.item_id, cur);
    }
    const popularProducts: OwnerPopularProduct[] = items
      .map((it) => {
        const oStat = orderStatsByItem.get(it.id) || { count: 0, revenue: 0 };
        const mCount = msgCountByItem.get(it.id) || 0;
        return {
          id: it.id,
          title: it.title,
          price: it.price,
          seller_name: it.seller_name,
          institution: it.institution,
          orders_count: oStat.count,
          messages_count: mCount,
          revenue: oStat.revenue,
          photo: it.thumbnails?.[0] || it.photos?.[0] || '',
        };
      })
      .sort(
        (a, b) =>
          b.orders_count * 10 + b.messages_count - (a.orders_count * 10 + a.messages_count)
      )
      .slice(0, 8);

    // Most Active Sellers
    const sellerAgg = new Map<string, OwnerActiveSeller>();
    for (const u of users) {
      if (u.role === 'seller' || u.badges.includes('trader') || u.badges.includes('service_provider')) {
        sellerAgg.set(u.id, {
          id: u.id,
          name: u.full_name,
          phone: u.phone_number || '',
          email: u.email || '',
          shop_name: u.shop_name,
          listings_count: 0,
          orders_count: 0,
          revenue: 0,
        });
      }
    }
    for (const it of items) {
      const key = it.seller_id || it.seller_phone || it.seller_name;
      const existing = sellerAgg.get(key) || {
        id: key,
        name: it.seller_name,
        phone: it.seller_phone || '',
        email: '',
        shop_name: it.seller_shop_name,
        listings_count: 0,
        orders_count: 0,
        revenue: 0,
      };
      existing.listings_count += 1;
      sellerAgg.set(key, existing);
    }
    for (const o of orders) {
      const key = o.seller_id || o.seller_phone || o.seller_name;
      const existing = sellerAgg.get(key) || {
        id: key,
        name: o.seller_name,
        phone: o.seller_phone || '',
        email: '',
        listings_count: 0,
        orders_count: 0,
        revenue: 0,
      };
      existing.orders_count += 1;
      existing.revenue += o.product_price;
      sellerAgg.set(key, existing);
    }
    const activeSellers = Array.from(sellerAgg.values())
      .sort(
        (a, b) =>
          b.orders_count * 5 + b.listings_count - (a.orders_count * 5 + a.listings_count)
      )
      .slice(0, 8);

    // Financial aggregations
    const pendingPayments = orders.filter(
      (o) => o.order_status === 'paid_escrow' || o.order_status === 'shipped'
    );
    const successfulPayments = orders.filter((o) => o.order_status === 'delivered_confirmed');
    const failedPayments = orders.filter(
      (o) =>
        o.order_status === 'refund_requested' ||
        o.order_status === 'refund_approved' ||
        o.order_status === 'cancelled'
    );

    const totalSales = orders
      .filter((o) => o.order_status !== 'cancelled' && o.order_status !== 'refund_approved')
      .reduce((s, o) => s + o.total_amount, 0);
    const totalAdminCommission = orders
      .filter((o) => o.order_status !== 'cancelled' && o.order_status !== 'refund_approved')
      .reduce((s, o) => s + o.admin_commission, 0);
    const totalDeliveryFees = orders.reduce((s, o) => s + o.delivery_fee, 0);
    const totalAdminKept = orders.reduce((s, o) => s + o.admin_total_kept, 0);
    const totalSellerPayouts = orders.reduce((s, o) => s + o.seller_payout, 0);
    const moneyToPaySellers = pendingPayments.reduce((s, o) => s + o.seller_payout, 0);
    const moneyPaidToSellers = successfulPayments.reduce((s, o) => s + o.seller_payout, 0);
    const refundedOut = orders
      .filter((o) => o.order_status === 'refund_approved' || o.order_status === 'cancelled')
      .reduce((s, o) => s + o.total_amount, 0);
    const totalMoneyOut = moneyPaidToSellers + refundedOut;
    const escrowHeld = pendingPayments.reduce((s, o) => s + o.total_amount, 0);

    return {
      stats: {
        total_users: users.length,
        total_buyers: users.filter((u) => u.role === 'buyer').length,
        total_sellers: users.filter((u) => u.role === 'seller').length,
        total_items: items.filter((i) => i.status === 'active').length,
        total_all_items: items.length,
        total_messages: rawMsgs.length,
        total_institutions: instStats.size,
        open_reports: reports.filter((r) => !r.resolved).length,
        orders_today: ordersToday,
        orders_week: ordersWeek,
        orders_month: ordersMonth,
      },
      finance: {
        total_orders: orders.length,
        total_sales: totalSales,
        my_10_percent_earnings: totalAdminCommission,
        google_ads_earnings: Number(adRes.settings.google_ads_earnings || 0),
        promotion_fees_total: 0,
        escrow_held_amount: escrowHeld,
        released_orders_count: successfulPayments.length,
        total_admin_commission: totalAdminCommission,
        total_delivery_fees: totalDeliveryFees,
        total_admin_kept: totalAdminKept,
        total_seller_payouts: totalSellerPayouts,
        pending_refunds_count: orders.filter((o) => o.order_status === 'refund_requested').length,
        total_money_in: totalSales,
        total_money_out: totalMoneyOut,
        money_to_pay_sellers: moneyToPaySellers,
        money_paid_to_sellers: moneyPaidToSellers,
        pending_payments_count: pendingPayments.length,
        pending_payments_amount: pendingPayments.reduce((s, o) => s + o.total_amount, 0),
        successful_payments_count: successfulPayments.length,
        successful_payments_amount: successfulPayments.reduce((s, o) => s + o.total_amount, 0),
        failed_payments_count: failedPayments.length,
        failed_payments_amount: failedPayments.reduce((s, o) => s + o.total_amount, 0),
        commission_percent: commissionPercent,
      },
      orders,
      sales_series_daily: Array.from(dailyMap.values()),
      sales_series_weekly: salesSeriesWeekly,
      popular_products: popularProducts,
      active_sellers: activeSellers,
      buyer_purchases: buyerPurchases,
      seller_listings: sellerListings,
      chat_threads: chatThreads,
      institutions: Array.from(instStats.values()),
      users,
      items,
      reports,
      ad_settings: adRes.settings,
      storage_mode: 'supabase',
    };
  },

  ownerFeatureItem: async (itemId: string, featured: boolean) => {
    const me = await getAuthenticatedUser();
    if (!isVerifiedOwnerUser(me)) throw new Error('Access Denied');
    const { error } = await supabase.from('products').update({ is_featured: featured }).eq('id', itemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  ownerApproveRejectItem: async (itemId: string, decision: 'approve' | 'reject') => {
    const me = await getAuthenticatedUser();
    if (!isVerifiedOwnerUser(me)) throw new Error('Access Denied');
    const nextStatus = decision === 'approve' ? 'active' : 'rejected';
    const { error } = await supabase
      .from('products')
      .update({ status: nextStatus, is_available: decision === 'approve' })
      .eq('id', itemId);
    if (error) throw new Error(error.message);
    return { ok: true, status: nextStatus };
  },

  ownerDeleteItem: async (itemId: string) => {
    const me = await getAuthenticatedUser();
    if (!isVerifiedOwnerUser(me)) throw new Error('Access Denied');
    const { error } = await supabase.from('products').delete().eq('id', itemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  ownerBlockUser: async (userIdOrPhone: string, blocked: boolean) => {
    const me = await getAuthenticatedUser();
    if (!isVerifiedOwnerUser(me)) throw new Error('Access Denied');
    if (isUuid(userIdOrPhone)) {
      await supabase.from('users').update({ blocked }).eq('id', userIdOrPhone);
      await supabase.from('profiles').update({ blocked }).eq('id', userIdOrPhone).then(() => {});
    } else {
      const candidates = phoneLookupCandidates(userIdOrPhone);
      await supabase.from('users').update({ blocked }).in('phone_number', candidates);
      await supabase.from('profiles').update({ blocked }).in('phone_number', candidates).then(() => {});
    }
    return { ok: true };
  },

  ownerResolveReport: async (reportId: string) => {
    const me = await getAuthenticatedUser();
    if (!isVerifiedOwnerUser(me)) throw new Error('Access Denied');
    const { error } = await supabase.from('reports').update({ resolved: true }).eq('id', reportId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  getOrders: async (): Promise<{ buyer_orders: EscrowOrder[]; seller_orders: EscrowOrder[] }> => {
    const me = await getAuthenticatedUser().catch(() => null);
    if (!me) return { buyer_orders: [], seller_orders: [] };

    const [{ data, error }, payRes] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('payments').select('*'),
    ]);
    if (error || !Array.isArray(data)) return { buyer_orders: [], seller_orders: [] };

    const paymentByOrderId = new Map<string, { status: string; payment_method: string }>();
    if (!payRes.error && Array.isArray(payRes.data)) {
      for (const p of payRes.data as Array<Record<string, unknown>>) {
        const oid = String(p.order_id || '');
        if (oid) {
          paymentByOrderId.set(oid, {
            status: String(p.status || 'pending'),
            payment_method: String(p.payment_method || 'Bank Transfer'),
          });
        }
      }
    }

    const mapOrder = (o: Record<string, unknown>): EscrowOrder => {
      const id = String(o.id);
      const payInfo = paymentByOrderId.get(id);
      const ordStatus = String(o.order_status || 'paid_escrow') as EscrowOrder['order_status'];
      const simpleStatus: EscrowOrder['status'] =
        o.status === 'delivered' || ordStatus === 'delivered_confirmed'
          ? 'delivered'
          : o.status === 'confirmed' || ordStatus === 'shipped'
          ? 'confirmed'
          : 'pending';
      return {
        id,
        reference: String(o.reference || ''),
        item_id: String(o.product_id || o.item_id || ''),
        item_title: String(o.item_title || 'Marketplace Product'),
        item_photo: String(o.item_photo || ''),
        item_location: String(o.item_location || ''),
        buyer_id: String(o.buyer_id || ''),
        buyer_name: String(o.buyer_name || ''),
        buyer_email: String(o.buyer_email || ''),
        seller_id: String(o.seller_id || ''),
        seller_name: String(o.seller_name || ''),
        quantity: Number(o.quantity || 1),
        product_price: Number(o.product_price || o.total_price || 0),
        delivery_fee: Number(o.delivery_fee || 0),
        total_price: Number(o.total_price || o.product_price || 0),
        total_amount: Number(o.total_amount || o.total_price || o.total || 0),
        admin_commission: Number(o.admin_commission || 0),
        admin_total_kept: Number(o.admin_total_kept || 0),
        seller_payout: Number(o.seller_payout || 0),
        delivery_address: String(o.delivery_address || ''),
        country: typeof o.country === 'string' ? o.country : undefined,
        status: simpleStatus,
        payment_method: payInfo?.payment_method || String(o.payment_method || 'Bank Transfer'),
        payment_status: payInfo?.status || (simpleStatus === 'delivered' ? 'successful' : 'pending'),
        order_status: ordStatus,
        refund_reason: typeof o.refund_reason === 'string' ? o.refund_reason : undefined,
        refund_photo: typeof o.refund_photo === 'string' ? o.refund_photo : undefined,
        created_at: String(o.created_at || new Date().toISOString()),
        shipped_at: typeof o.shipped_at === 'string' ? o.shipped_at : undefined,
        confirmed_at: typeof o.confirmed_at === 'string' ? o.confirmed_at : undefined,
      };
    };

    const mapped = (data as Array<Record<string, unknown>>).map(mapOrder);
    return {
      buyer_orders: mapped.filter((o) => o.buyer_id === me.id),
      seller_orders: mapped.filter(
        (o) =>
          o.seller_id === me.id ||
          (Boolean(me.phone_number) &&
            (data.find((d) => String((d as Record<string, unknown>).id) === o.id) as Record<string, unknown> | undefined)
              ?.seller_phone === me.phone_number)
      ),
    };
  },

  createOrder: async (payload: {
    item_id: string;
    quantity?: number;
    delivery_address: string;
    paystack_reference: string;
    buyer_email?: string;
    delivery_tier?: 'same_city' | 'standard';
    payment_method?: 'Bank Transfer' | 'Card' | 'Mobile Money';
  }): Promise<{ order: EscrowOrder }> => {
    const me = await getAuthenticatedUser();
    const [item, settingsRes] = await Promise.all([
      api.getItemDetail(payload.item_id),
      api.getAdSettings(),
    ]);
    const commissionPercent = Number(settingsRes.settings.commission_percent ?? 10);
    const cfg = getCountryConfig(item.country || me.country || 'Nigeria');
    const qty = Math.max(1, Number(payload.quantity || 1));
    const deliveryFee =
      payload.delivery_tier === 'standard' ? cfg.deliveryFeeStandard : cfg.deliveryFeeSameCity;
    const totalPrice = Number(item.price || 0) * qty;
    const totalAmount = totalPrice + deliveryFee;
    const adminCommission = Math.round(totalPrice * (commissionPercent / 100));
    const sellerPayout = totalPrice - adminCommission;
    const adminTotalKept = adminCommission + deliveryFee;
    const paymentMethod = payload.payment_method || 'Card';

    const orderInsert = {
      reference: payload.paystack_reference,
      product_id: item.id,
      item_id: item.id,
      item_title: item.title,
      item_photo: item.thumbnails?.[0] || item.photos?.[0] || '',
      item_location: item.location,
      buyer_id: me.id,
      buyer_name: me.full_name,
      buyer_phone: me.phone_number || '',
      buyer_email: payload.buyer_email || me.email || '',
      seller_id: isUuid(item.seller_id) ? item.seller_id : null,
      seller_name: item.seller_name,
      seller_phone: isUuid(item.seller_id) ? '' : item.seller_id,
      quantity: qty,
      product_price: totalPrice,
      total_price: totalPrice,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      total: totalAmount,
      admin_commission: adminCommission,
      admin_total_kept: adminTotalKept,
      seller_payout: sellerPayout,
      delivery_address: payload.delivery_address,
      country: item.country || me.country || 'Nigeria',
      payment_method: paymentMethod,
      status: 'pending',
      order_status: 'paid_escrow',
    };

    let res = await supabase.from('orders').insert(orderInsert).select('*').single();
    if (res.error && isMissingColumnError(res.error)) {
      res = await supabase
        .from('orders')
        .insert({
          reference: payload.paystack_reference,
          item_id: item.id,
          item_title: item.title,
          item_photo: item.thumbnails?.[0] || item.photos?.[0] || '',
          item_location: item.location,
          buyer_id: me.id,
          buyer_name: me.full_name,
          buyer_phone: me.phone_number || '',
          buyer_email: payload.buyer_email || me.email || '',
          seller_id: isUuid(item.seller_id) ? item.seller_id : null,
          seller_name: item.seller_name,
          product_price: totalPrice,
          delivery_fee: deliveryFee,
          total_amount: totalAmount,
          admin_commission: adminCommission,
          admin_total_kept: adminTotalKept,
          seller_payout: sellerPayout,
          delivery_address: payload.delivery_address,
          order_status: 'paid_escrow',
        })
        .select('*')
        .single();
    }

    if (res.error || !res.data) {
      throw new Error(res.error?.message || 'Could not record order in Supabase.');
    }

    const o = res.data as Record<string, unknown>;
    const orderId = String(o.id);

    // Record payment row in public.payments
    await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        payer_id: me.id,
        amount: totalPrice,
        payment_method: paymentMethod,
        status: 'pending',
        buyer_email: payload.buyer_email || me.email || '',
        buyer_name: me.full_name,
        seller_name: item.seller_name,
        product_name: item.title,
        commission: adminCommission,
        seller_amount: sellerPayout,
        paystack_reference: payload.paystack_reference,
      })
      .then(() => {});

    if (isUuid(item.seller_id) && item.seller_id !== me.id) {
      await createNotificationRecord({
        user_id: item.seller_id,
        title: `New Order: ${item.title}`,
        body: `${me.full_name} ordered ${qty}x (${formatCountryMoney(totalAmount, item.country)}). Deliver to ${payload.delivery_address}.`,
        type: 'order_placed',
      });
    }

    return {
      order: {
        id: orderId,
        reference: String(o.reference || payload.paystack_reference),
        item_id: item.id,
        item_title: item.title,
        item_photo: String(o.item_photo || ''),
        item_location: item.location,
        buyer_id: me.id,
        buyer_name: me.full_name,
        buyer_email: String(o.buyer_email || ''),
        seller_id: item.seller_id,
        seller_name: item.seller_name,
        quantity: qty,
        product_price: totalPrice,
        delivery_fee: deliveryFee,
        total_price: totalPrice,
        total_amount: totalAmount,
        admin_commission: adminCommission,
        admin_total_kept: adminTotalKept,
        seller_payout: sellerPayout,
        delivery_address: payload.delivery_address,
        country: item.country,
        currency_symbol: cfg.currencySymbol,
        status: 'pending',
        payment_method: paymentMethod,
        payment_status: 'pending',
        order_status: 'paid_escrow',
        created_at: String(o.created_at || new Date().toISOString()),
      },
    };
  },

  updateOrderStatus: async (
    orderId: string,
    nextStatus: 'pending' | 'confirmed' | 'delivered'
  ): Promise<{ ok: boolean }> => {
    const orderStatusMapped: EscrowOrder['order_status'] =
      nextStatus === 'delivered'
        ? 'delivered_confirmed'
        : nextStatus === 'confirmed'
        ? 'shipped'
        : 'paid_escrow';

    const updateFields: Record<string, unknown> = {
      status: nextStatus,
      order_status: orderStatusMapped,
      ...(nextStatus === 'confirmed' ? { shipped_at: new Date().toISOString() } : {}),
      ...(nextStatus === 'delivered' ? { confirmed_at: new Date().toISOString() } : {}),
    };

    let upd = await supabase.from('orders').update(updateFields).eq('id', orderId).select('*').single();
    if (upd.error && isMissingColumnError(upd.error)) {
      upd = await supabase.from('orders').update({ order_status: orderStatusMapped }).eq('id', orderId).select('*').single();
    }
    if (upd.error) throw new Error(upd.error.message);

    if (nextStatus === 'delivered') {
      await supabase.from('payments').update({ status: 'successful' }).eq('order_id', orderId).then(() => {});
    }

    const o = (upd.data || {}) as Record<string, unknown>;
    if (typeof o.buyer_id === 'string' && isUuid(o.buyer_id)) {
      await createNotificationRecord({
        user_id: o.buyer_id,
        title: `Order ${nextStatus}: ${String(o.item_title || 'Your item')}`,
        body: `Your order status is now ${nextStatus}.`,
        type: nextStatus === 'delivered' ? 'order_confirmed' : 'order_shipped',
      });
    }
    return { ok: true };
  },

  markOrderShipped: async (orderId: string): Promise<{ order: EscrowOrder }> => {
    let res = await supabase
      .from('orders')
      .update({ status: 'confirmed', order_status: 'shipped', shipped_at: new Date().toISOString() })
      .eq('id', orderId)
      .select('*')
      .single();
    if (res.error && isMissingColumnError(res.error)) {
      res = await supabase
        .from('orders')
        .update({ order_status: 'shipped', shipped_at: new Date().toISOString() })
        .eq('id', orderId)
        .select('*')
        .single();
    }
    const { data, error } = res;
    if (error || !data) throw new Error(error?.message || 'Failed to update order.');
    const o = data as Record<string, unknown>;
    if (typeof o.buyer_id === 'string' && isUuid(o.buyer_id)) {
      await createNotificationRecord({
        user_id: o.buyer_id,
        title: `Order Confirmed / Shipped: ${String(o.item_title || 'Your item')}`,
        body: `Seller confirmed & shipped order ${String(o.reference || '')}. Confirm receipt once delivered.`,
        type: 'order_shipped',
      });
    }
    return {
      order: {
        id: String(o.id),
        reference: String(o.reference || ''),
        item_id: String(o.product_id || o.item_id || ''),
        item_title: String(o.item_title || ''),
        item_photo: String(o.item_photo || ''),
        item_location: String(o.item_location || ''),
        buyer_id: String(o.buyer_id || ''),
        buyer_name: String(o.buyer_name || ''),
        buyer_email: String(o.buyer_email || ''),
        seller_id: String(o.seller_id || ''),
        seller_name: String(o.seller_name || ''),
        quantity: Number(o.quantity || 1),
        product_price: Number(o.product_price || 0),
        delivery_fee: Number(o.delivery_fee || 0),
        total_price: Number(o.total_price || o.product_price || 0),
        total_amount: Number(o.total_amount || 0),
        admin_commission: Number(o.admin_commission || 0),
        admin_total_kept: Number(o.admin_total_kept || 0),
        seller_payout: Number(o.seller_payout || 0),
        delivery_address: String(o.delivery_address || ''),
        status: 'confirmed',
        order_status: 'shipped',
        created_at: String(o.created_at || new Date().toISOString()),
        shipped_at: String(o.shipped_at || new Date().toISOString()),
      },
    };
  },

  confirmOrderDelivery: async (orderId: string): Promise<{ order: EscrowOrder }> => {
    let res = await supabase
      .from('orders')
      .update({ status: 'delivered', order_status: 'delivered_confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', orderId)
      .select('*')
      .single();
    if (res.error && isMissingColumnError(res.error)) {
      res = await supabase
        .from('orders')
        .update({ order_status: 'delivered_confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', orderId)
        .select('*')
        .single();
    }
    const { data, error } = res;
    if (error || !data) throw new Error(error?.message || 'Failed to confirm delivery.');

    await supabase.from('payments').update({ status: 'successful' }).eq('order_id', orderId).then(() => {});

    const o = data as Record<string, unknown>;
    if (typeof o.seller_id === 'string' && isUuid(o.seller_id)) {
      await createNotificationRecord({
        user_id: o.seller_id,
        title: `Delivery Confirmed: ${String(o.item_title || 'Order')}`,
        body: `Buyer confirmed delivery for order ${String(o.reference || '')}. Your payout has been released.`,
        type: 'order_confirmed',
      });
    }
    return {
      order: {
        id: String(o.id),
        reference: String(o.reference || ''),
        item_id: String(o.product_id || o.item_id || ''),
        item_title: String(o.item_title || ''),
        item_photo: String(o.item_photo || ''),
        item_location: String(o.item_location || ''),
        buyer_id: String(o.buyer_id || ''),
        buyer_name: String(o.buyer_name || ''),
        buyer_email: String(o.buyer_email || ''),
        seller_id: String(o.seller_id || ''),
        seller_name: String(o.seller_name || ''),
        quantity: Number(o.quantity || 1),
        product_price: Number(o.product_price || 0),
        delivery_fee: Number(o.delivery_fee || 0),
        total_price: Number(o.total_price || o.product_price || 0),
        total_amount: Number(o.total_amount || 0),
        admin_commission: Number(o.admin_commission || 0),
        admin_total_kept: Number(o.admin_total_kept || 0),
        seller_payout: Number(o.seller_payout || 0),
        delivery_address: String(o.delivery_address || ''),
        status: 'delivered',
        payment_status: 'successful',
        order_status: 'delivered_confirmed',
        created_at: String(o.created_at || new Date().toISOString()),
        confirmed_at: String(o.confirmed_at || new Date().toISOString()),
      },
    };
  },

  requestOrderRefund: async (
    orderId: string,
    payload: {
      reason: string;
      photo?: string;
      video?: string;
      change_of_mind_before_ship?: boolean;
    }
  ): Promise<{ order: EscrowOrder }> => {
    const status = payload.change_of_mind_before_ship ? 'cancelled' : 'refund_requested';
    const { data, error } = await supabase
      .from('orders')
      .update({
        order_status: status,
        refund_reason: payload.reason || 'Change of mind before shipment',
        refund_photo: payload.photo || '',
      })
      .eq('id', orderId)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to request refund.');
    const o = data as Record<string, unknown>;
    if (typeof o.seller_id === 'string' && isUuid(o.seller_id)) {
      await createNotificationRecord({
        user_id: o.seller_id,
        title: `Refund Requested: ${String(o.item_title || 'Order')}`,
        body: `Reason: ${String(o.refund_reason || 'Customer requested refund')}`,
        type: 'refund_update',
      });
    }
    return {
      order: {
        id: String(o.id),
        reference: String(o.reference || ''),
        item_id: String(o.item_id || ''),
        item_title: String(o.item_title || ''),
        item_photo: String(o.item_photo || ''),
        item_location: String(o.item_location || ''),
        buyer_id: String(o.buyer_id || ''),
        buyer_name: String(o.buyer_name || ''),
        buyer_email: String(o.buyer_email || ''),
        seller_id: String(o.seller_id || ''),
        seller_name: String(o.seller_name || ''),
        product_price: Number(o.product_price || 0),
        delivery_fee: Number(o.delivery_fee || 0),
        total_amount: Number(o.total_amount || 0),
        admin_commission: Number(o.admin_commission || 0),
        admin_total_kept: Number(o.admin_total_kept || 0),
        seller_payout: Number(o.seller_payout || 0),
        delivery_address: String(o.delivery_address || ''),
        order_status: status,
        refund_reason: String(o.refund_reason || ''),
        refund_photo: typeof o.refund_photo === 'string' ? o.refund_photo : undefined,
        created_at: String(o.created_at || new Date().toISOString()),
      },
    };
  },

  ownerResolveOrderRefund: async (
    orderId: string,
    decision: 'approve_full' | 'approve_product_only' | 'reject'
  ): Promise<{ order: EscrowOrder }> => {
    const me = await getAuthenticatedUser();
    if (!isVerifiedOwnerUser(me)) throw new Error('Access Denied');
    const nextStatus = decision === 'reject' ? 'paid_escrow' : 'refund_approved';
    const { data, error } = await supabase
      .from('orders')
      .update({ order_status: nextStatus })
      .eq('id', orderId)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to resolve refund.');
    const o = data as Record<string, unknown>;
    if (typeof o.buyer_id === 'string' && isUuid(o.buyer_id)) {
      await createNotificationRecord({
        user_id: o.buyer_id,
        title:
          decision === 'reject'
            ? `Refund Request Rejected: ${String(o.item_title || 'Order')}`
            : `Refund Approved: ${String(o.item_title || 'Order')}`,
        body:
          decision === 'reject'
            ? `Order ${String(o.reference || '')} remains active in escrow.`
            : `Refund for order ${String(o.reference || '')} has been approved via Paystack (3-5 working days).`,
        type: 'refund_update',
      });
    }
    return {
      order: {
        id: String(o.id),
        reference: String(o.reference || ''),
        item_id: String(o.item_id || ''),
        item_title: String(o.item_title || ''),
        item_photo: String(o.item_photo || ''),
        item_location: String(o.item_location || ''),
        buyer_id: String(o.buyer_id || ''),
        buyer_name: String(o.buyer_name || ''),
        buyer_email: String(o.buyer_email || ''),
        seller_id: String(o.seller_id || ''),
        seller_name: String(o.seller_name || ''),
        product_price: Number(o.product_price || 0),
        delivery_fee: Number(o.delivery_fee || 0),
        total_amount: Number(o.total_amount || 0),
        admin_commission: Number(o.admin_commission || 0),
        admin_total_kept: Number(o.admin_total_kept || 0),
        seller_payout: Number(o.seller_payout || 0),
        delivery_address: String(o.delivery_address || ''),
        order_status: nextStatus,
        created_at: String(o.created_at || new Date().toISOString()),
      },
    };
  },

  ownerSaveAdSettings: async (settings: AdSettings): Promise<{ settings: AdSettings }> => {
    const me = await getAuthenticatedUser();
    if (!isVerifiedOwnerUser(me)) throw new Error('Access Denied');
    const payload: AdSettings & { id: string } = {
      id: 'default',
      ads_enabled: Boolean(settings.ads_enabled),
      interstitial_enabled: false,
      publisher_id: settings.publisher_id || '',
      banner_unit_id: settings.sidebar_unit_id || settings.banner_unit_id || '',
      feed_unit_id: settings.feed_unit_id || '',
      interstitial_unit_id: '',
      sidebar_unit_id: settings.sidebar_unit_id || settings.banner_unit_id || '',
      google_ads_earnings: Number(settings.google_ads_earnings || 0),
      paystack_public_key: settings.paystack_public_key || PAYSTACK_PUBLIC_KEY_PLACEHOLDER,
      paystack_split_code: settings.paystack_split_code || PAYSTACK_SPLIT_CODE_PLACEHOLDER,
      admin_subaccount_code: settings.admin_subaccount_code || '',
      commission_percent: Math.max(0, Math.min(50, Number(settings.commission_percent ?? 10))),
      site_name: (settings.site_name || 'Afri Student Mart').trim() || 'Afri Student Mart',
      announcement: (settings.announcement || '').trim(),
      announcement_enabled: Boolean(settings.announcement_enabled),
    };
    const { error } = await supabase.from('ad_settings').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(error.message);
    return { settings: payload };
  },

  getNotifications: async (): Promise<{
    notifications: UserNotification[];
    unread_count: number;
  }> => {
    const me = await getAuthenticatedUser().catch(() => null);
    if (!me) return { notifications: [], unread_count: 0 };

    const seenIds = getReadSyntheticNotifIds();
    const list: UserNotification[] = [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(me.email ? `user_id.eq.${me.id},user_email.ilike.${me.email}` : `user_id.eq.${me.id}`)
      .order('created_at', { ascending: false })
      .limit(40);

    if (!error && Array.isArray(data)) {
      for (const r of data as Array<Record<string, unknown>>) {
        list.push({
          id: String(r.id),
          user_id: String(r.user_id || me.id),
          title: String(r.title || 'Update'),
          body: String(r.body || r.message || ''),
          type: String(r.type || 'info') as NotificationType,
          read: Boolean(r.read ?? r.is_read),
          created_at: String(r.created_at || new Date().toISOString()),
        });
      }
    }

    // Supplement with live unread messages & recent order/offer activity so notifications always work even before SQL migration
    if (list.length === 0) {
      const [msgRes, ordRes, offersRes] = await Promise.all([
        supabase
          .from('messages')
          .select('id, sender_id, receiver_id, sender_phone, message, read_by_recipient, created_at')
          .eq('receiver_id', me.id)
          .eq('read_by_recipient', false)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('orders')
          .select('id, item_title, order_status, buyer_id, seller_id, buyer_name, total_amount, created_at')
          .or(`buyer_id.eq.${me.id},seller_id.eq.${me.id}`)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('offers')
          .select('id, item_title, buyer_id, seller_id, buyer_name, offered_price, status, created_at')
          .or(`buyer_id.eq.${me.id},seller_id.eq.${me.id}`)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      if (!msgRes.error && Array.isArray(msgRes.data)) {
        for (const m of msgRes.data as Array<Record<string, unknown>>) {
          const synId = `syn_msg_${m.id}`;
          list.push({
            id: synId,
            user_id: me.id,
            title: 'New Unread Message',
            body: String(m.message || '').slice(0, 100),
            type: 'new_message',
            read: seenIds.has(synId),
            created_at: String(m.created_at || new Date().toISOString()),
            synthetic: true,
          });
        }
      }

      if (!ordRes.error && Array.isArray(ordRes.data)) {
        for (const o of ordRes.data as Array<Record<string, unknown>>) {
          const synId = `syn_ord_${o.id}_${o.order_status}`;
          const isBuyer = o.buyer_id === me.id;
          list.push({
            id: synId,
            user_id: me.id,
            title: isBuyer
              ? `Order ${String(o.order_status || '').replace(/_/g, ' ')}`
              : `Seller Order: ${String(o.item_title || 'Item')}`,
            body: isBuyer
              ? `${String(o.item_title || 'Order')} (${formatCountryMoney(Number(o.total_amount || 0), me.country)})`
              : `${String(o.buyer_name || 'Buyer')} ordered ${String(o.item_title || 'Item')}`,
            type:
              o.order_status === 'shipped'
                ? 'order_shipped'
                : o.order_status === 'delivered_confirmed'
                ? 'order_confirmed'
                : 'order_placed',
            read: seenIds.has(synId),
            created_at: String(o.created_at || new Date().toISOString()),
            synthetic: true,
          });
        }
      }

      if (!offersRes.error && Array.isArray(offersRes.data)) {
        for (const ofr of offersRes.data as Array<Record<string, unknown>>) {
          const synId = `syn_ofr_${ofr.id}_${ofr.status}`;
          const isSeller = ofr.seller_id === me.id;
          list.push({
            id: synId,
            user_id: me.id,
            title: isSeller
              ? `Offer on ${String(ofr.item_title || 'Item')}`
              : `Offer ${String(ofr.status || 'pending')}`,
            body: `${String(ofr.buyer_name || 'Buyer')} offered ${formatCountryMoney(Number(ofr.offered_price || 0), me.country)}`,
            type: isSeller ? 'offer_received' : 'offer_update',
            read: seenIds.has(synId),
            created_at: String(ofr.created_at || new Date().toISOString()),
            synthetic: true,
          });
        }
      }
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const unread_count = list.filter((n) => !n.read).length;
    return { notifications: list, unread_count };
  },

  markNotificationRead: async (notificationId: string): Promise<{ ok: boolean }> => {
    if (notificationId.startsWith('syn_')) {
      const ids = getReadSyntheticNotifIds();
      ids.add(notificationId);
      saveReadSyntheticNotifIds(ids);
      return { ok: true };
    }
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    if (error) {
      const ids = getReadSyntheticNotifIds();
      ids.add(notificationId);
      saveReadSyntheticNotifIds(ids);
    }
    return { ok: true };
  },

  markAllNotificationsRead: async (idsToMark?: string[]): Promise<{ ok: boolean }> => {
    const me = await getAuthenticatedUser().catch(() => null);
    if (!me) return { ok: true };
    if (Array.isArray(idsToMark) && idsToMark.length > 0) {
      const synSet = getReadSyntheticNotifIds();
      for (const id of idsToMark) {
        if (id.startsWith('syn_')) synSet.add(id);
      }
      saveReadSyntheticNotifIds(synSet);
    }
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', me.id)
      .eq('read', false)
      .then(() => {});
    return { ok: true };
  },

  askMartAI: async (payload: {
    message: string;
    institution?: string;
    history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  }): Promise<{ reply: string }> => {
    const q = payload.message.toLowerCase();
    const { items } = await api.getItems({
      institution: payload.institution,
      limit: 30,
    });

    if (q.includes('safe') || q.includes('scam') || q.includes('escrow') || q.includes('pay')) {
      return {
        reply:
          'Stay 100% safe on Afri Student Mart:\n1. Always pay through Paystack Escrow on this website — never send direct bank transfers or cash before inspecting.\n2. Meet sellers in busy campus daylight spots (library, Main Gate, hostel reception).\n3. Confirm your item in Profile > My Orders only after checking it thoroughly.',
      };
    }

    if (q.includes('description') || q.includes('describe') || q.includes('price')) {
      return {
        reply:
          'Listing tip: Mention exact specs, battery/zipper condition, any minor flaws honestly, and your campus pickup point. Keep price 15–30% below brand-new store value for Neatly Used items so students buy fast via Paystack Escrow!',
      };
    }

    const keywords = q.split(/\s+/).filter((w) => w.length >= 3);
    const matches = items
      .filter((it) =>
        keywords.some(
          (k) =>
            it.title.toLowerCase().includes(k) ||
            it.category.toLowerCase().includes(k) ||
            it.institution.toLowerCase().includes(k)
        )
      )
      .slice(0, 4);

    if (matches.length > 0) {
      const list = matches
        .map(
          (m) =>
            `• ${m.title} — ${formatCountryMoney(m.price, m.country)} (${m.institution}, ${m.location})`
        )
        .join('\n');
      return {
        reply: `Here are live Supabase listings matching your search:\n${list}\n\nTap any card on Home to chat or buy safely with Paystack Escrow.`,
      };
    }

    return {
      reply: `There are currently ${items.length} active listings${
        payload.institution ? ` around ${payload.institution}` : ''
      }. Try searching by item name (e.g. "HP", "shoes", "textbook") on Home or set an "I Want This" Price Drop Alert to get notified live!`,
    };
  },
};
