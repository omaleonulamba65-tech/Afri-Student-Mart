import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  ChevronLeft,
  ChevronRight,
  Download,
  Flag,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  PackageCheck,
  Share2,
  ShieldAlert,
  ShoppingCart,
  Star,
  Tag,
  User,
  Video,
  X,
} from 'lucide-react';
import {
  getCountryByDialCode,
  getCountryConfig,
  getCountryDisplayName,
} from '../data/languages';
import {
  api,
  buildWhatsAppShareUrl,
  compressAndValidateVideo,
  formatTimeAgo,
  getStoredToken,
} from '../lib/api';
import { useI18n } from '../lib/i18nContext';
import type { MarketplaceItem, RatingRecord } from '../types';
import { BadgeRow } from './BadgePill';

interface ItemDetailModalProps {
  item: MarketplaceItem | null;
  wishlisted?: boolean;
  lowDataMode?: boolean;
  onToggleWishlist?: (item: MarketplaceItem) => void;
  onClose: () => void;
  onBuyNow: (item: MarketplaceItem) => void;
  onAddToCart?: (item: MarketplaceItem) => void;
  onChat: (item: MarketplaceItem, prefillMessage?: string) => void;
  onReportItem: (item: MarketplaceItem) => void;
  onBlockSeller: (item: MarketplaceItem) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  wishlisted = false,
  lowDataMode = false,
  onToggleWishlist,
  onClose,
  onBuyNow,
  onAddToCart,
  onChat,
  onReportItem,
  onBlockSeller,
}) => {
  const { formatMoney, t } = useI18n();
  const [fullItem, setFullItem] = useState<MarketplaceItem | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [revealInLowData, setRevealInLowData] = useState(false);

  const [photoIdx, setPhotoIdx] = useState(0);
  const [actionSheet, setActionSheet] = useState<'offer' | null>(null);
  const [offerAmount, setOfferAmount] = useState('');

  // Seller Trust Score + 5-sec Video Reviews (only unlocked for verified buyers of this specific item)
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [reviewVideoUrl, setReviewVideoUrl] = useState('');
  const [compressingReviewVid, setCompressingReviewVid] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSaved, setRatingSaved] = useState(false);
  const [sellerReviews, setSellerReviews] = useState<RatingRecord[]>([]);
  const [trustAvg, setTrustAvg] = useState<number>(item?.seller_rating || 5.0);
  const [trustCount, setTrustCount] = useState<number>(item?.seller_reviews_count || 0);
  const [hasConfirmedOrder, setHasConfirmedOrder] = useState(false);
  const [loadingTrust, setLoadingTrust] = useState(false);

  useEffect(() => {
    setPhotoIdx(0);
    setActionSheet(null);
    setFullItem(null);
    setRevealInLowData(false);
    setRatingSaved(false);
    setRatingComment('');
    setReviewVideoUrl('');
    setReviewError('');
    setHasConfirmedOrder(false);

    if (!item) return;

    setTrustAvg(item.seller_rating || 5.0);
    setTrustCount(item.seller_reviews_count || 0);

    let cancelled = false;
    setLoadingTrust(true);
    api
      .getRatings('seller', item.seller_id, item.id)
      .then(async (res) => {
        if (cancelled) return;
        setSellerReviews(Array.isArray(res.ratings) ? res.ratings : []);
        setTrustCount(res.count || 0);
        setTrustAvg(res.count > 0 ? res.average : item.seller_rating || 5.0);
        let eligible = Boolean(res.has_confirmed_order);
        if (!eligible && getStoredToken()) {
          try {
            const ordRes = await api.getOrders();
            eligible = (ordRes.buyer_orders || []).some(
              (o) => o.item_id === item.id && o.order_status === 'delivered_confirmed'
            );
          } catch {
            // Keep backend flag
          }
        }
        if (!cancelled) {
          setHasConfirmedOrder(eligible);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingTrust(false);
      });

    if (lowDataMode) return () => { cancelled = true; };

    setLoadingFull(true);
    api
      .getItemDetail(item.id)
      .then((loaded) => {
        if (!cancelled) setFullItem(loaded);
      })
      .catch(() => {
        // Keep lite item fallback if offline
      })
      .finally(() => {
        if (!cancelled) setLoadingFull(false);
      });

    return () => {
      cancelled = true;
    };
  }, [item?.id, lowDataMode]);

  if (!item) return null;

  const activeItem = fullItem || item;
  const itemCountryCfg = activeItem.country
    ? getCountryConfig(activeItem.country)
    : getCountryByDialCode(activeItem.country_code);
  const loadHeavyMedia = () => {
    setRevealInLowData(true);
    setLoadingFull(true);
    api
      .getItemDetail(item.id)
      .then((loaded) => setFullItem(loaded))
      .catch(() => {})
      .finally(() => setLoadingFull(false));
  };

  const photos =
    lowDataMode && !revealInLowData
      ? activeItem.thumbnails?.length
        ? activeItem.thumbnails
        : activeItem.photos.slice(0, 1)
      : activeItem.photos?.length
      ? activeItem.photos
      : activeItem.thumbnails || [];

  const currentPhoto = photos[photoIdx] || photos[0];
  const joinedLabel = new Date(
    activeItem.seller_joined_at || activeItem.created_at
  ).toLocaleDateString('en-NG', {
    month: 'short',
    year: 'numeric',
  });

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(offerAmount);
    if (!num || num <= 0) return;
    setActionSheet(null);
    // Persist offer in offers table if signed in (non-blocking)
    api.createOffer({ item_id: activeItem.id, offered_price: num }).catch(() => {});
    onChat(
      activeItem,
      `Hello! I want to make an offer of ${formatMoney(num, activeItem.country)} for "${
        activeItem.title
      }" (listed at ${formatMoney(activeItem.price, activeItem.country)}). Is this price okay for you?`
    );
  };

  const handleReviewVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReviewError('');
    setCompressingReviewVid(true);
    try {
      const compressed = await compressAndValidateVideo(file, 5);
      setReviewVideoUrl(compressed);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Video review must be 5 seconds or less.');
    } finally {
      setCompressingReviewVid(false);
    }
    e.target.value = '';
  };

  const handleRateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasConfirmedOrder) {
      setReviewError(
        'Only buyers with a confirmed completed Paystack order for this item can submit a review.'
      );
      return;
    }
    setReviewError('');
    setRatingSubmitting(true);
    try {
      const res = await api.submitProductReview({
        seller_id: activeItem.seller_id,
        item_id: activeItem.id,
        score: ratingScore,
        comment: ratingComment,
        video_url: reviewVideoUrl || undefined,
      });
      setRatingSaved(true);
      setRatingComment('');
      setReviewVideoUrl('');
      setSellerReviews((prev) => [res.rating, ...prev]);
      const nextCount = trustCount + 1;
      const nextAvg = Number(((trustAvg * trustCount + ratingScore) / nextCount).toFixed(1));
      setTrustCount(nextCount);
      setTrustAvg(nextAvg);
    } catch (err) {
      setReviewError(
        err instanceof Error
          ? err.message
          : 'You must have a confirmed completed order for this item to submit a review.'
      );
      setRatingSaved(false);
    } finally {
      setRatingSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white sm:bg-black/60 sm:items-center sm:justify-center sm:p-4">
      <div className="flex flex-col w-full h-full sm:h-auto sm:max-h-[94vh] sm:max-w-3xl bg-white sm:rounded-2xl sm:shadow-xl overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-2 flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-green-800"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <span className="text-sm font-bold text-slate-900 truncate max-w-[45%]">
            {activeItem.category}
          </span>
          <div className="flex items-center gap-1">
            {onToggleWishlist && (
              <button
                type="button"
                onClick={() => onToggleWishlist(activeItem)}
                aria-label="Toggle wishlist"
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl ${
                  wishlisted ? 'text-red-500 bg-red-50' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Heart className={`w-5 h-5 ${wishlisted ? 'fill-red-500' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {lowDataMode && !revealInLowData && (
            <div className="rounded-xl border border-yellow-300 bg-yellow-50 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">
                Low Data Mode ON — showing small thumbnail only.
              </span>
              <button
                type="button"
                onClick={loadHeavyMedia}
                className="min-h-[36px] px-3 rounded-lg bg-green-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Load Full Photos &amp; Video</span>
              </button>
            </div>
          )}

          {loadingFull && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-green-700" />
              <span>Loading full 800px photos &amp; live video...</span>
            </div>
          )}

          {/* Live Video (only when not blocked by Low Data Mode, never autoPlay) */}
          {activeItem.video_url && (!lowDataMode || revealInLowData) && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black">
              <video
                src={activeItem.video_url}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-64 object-contain"
              />
            </div>
          )}

          {/* Photo Gallery */}
          <div className="relative aspect-[4/3] w-full rounded-2xl bg-slate-100 overflow-hidden">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt={activeItem.title}
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                No photo
              </div>
            )}

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setPhotoIdx((photoIdx - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-full bg-black/55 text-white flex items-center justify-center"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoIdx((photoIdx + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-full bg-black/55 text-white flex items-center justify-center"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                  {photoIdx + 1} / {photos.length}
                </div>
              </>
            )}
          </div>

          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhotoIdx(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 ${
                    i === photoIdx ? 'border-green-700' : 'border-transparent opacity-70'
                  }`}
                >
                  <img
                    src={activeItem.thumbnails?.[i] || p}
                    alt={`${activeItem.title} photo ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Price, Title & Badges */}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="text-green-800">{activeItem.condition}</span>
              <span aria-hidden="true">·</span>
              <span>{activeItem.category}</span>
              <span aria-hidden="true">·</span>
              <span>Posted {formatTimeAgo(activeItem.created_at)}</span>
            </div>
            <h2 className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
              {activeItem.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="text-3xl font-extrabold text-green-800 tabular-nums">
                {formatMoney(activeItem.price, activeItem.country)}
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-green-50 border border-green-300 px-2.5 py-1 text-xs font-bold text-green-900">
                <PackageCheck className="w-3.5 h-3.5" />
                Escrow Protected (Paystack)
              </span>
              {activeItem.make_offer && (
                <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 border border-orange-200 px-2.5 py-1 text-xs font-bold text-orange-800">
                  <Tag className="w-3.5 h-3.5" />
                  Negotiable
                </span>
              )}
            </div>
          </div>

          {/* Primary Action Buttons: Buy Now (Paystack), Add to Cart, Make Offer, Share WhatsApp, Report Scam */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <button
              type="button"
              onClick={() => onBuyNow(activeItem)}
              className="min-h-[48px] rounded-xl bg-green-700 text-white font-extrabold text-sm px-3 flex items-center justify-center gap-1.5 hover:bg-green-800"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>{t('buy_now')}</span>
            </button>
            {onAddToCart && (
              <button
                type="button"
                onClick={() => onAddToCart(activeItem)}
                className="min-h-[48px] rounded-xl border border-green-700 bg-green-50 text-green-900 font-extrabold text-sm px-3 flex items-center justify-center gap-1.5 hover:bg-green-100"
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span>Add to Cart</span>
              </button>
            )}
            {activeItem.make_offer !== false && (
              <button
                type="button"
                onClick={() => {
                  setOfferAmount(String(Math.round(activeItem.price * 0.9)));
                  setActionSheet('offer');
                }}
                className="min-h-[48px] rounded-xl bg-orange-500 text-white font-bold text-sm px-3 flex items-center justify-center gap-1.5 hover:bg-orange-600"
              >
                <Tag className="w-4 h-4 shrink-0" />
                <span>Make Offer</span>
              </button>
            )}
            <a
              href={buildWhatsAppShareUrl(activeItem)}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] rounded-xl bg-[#25D366] text-white font-bold text-sm px-3 flex items-center justify-center gap-1.5 hover:opacity-95"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>Share WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={() => onReportItem(activeItem)}
              className="min-h-[48px] rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold text-sm px-3 flex items-center justify-center gap-1.5 hover:bg-red-100"
            >
              <Flag className="w-4 h-4 shrink-0" />
              <span>Report Scam</span>
            </button>
          </div>

          {/* Inline Action Sheet for Make Offer */}
          {actionSheet === 'offer' && (
            <div className="rounded-2xl border-2 border-green-700 bg-green-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900">
                  Make an Offer (Haggle)
                </h3>
                <button
                  type="button"
                  onClick={() => setActionSheet(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSubmitOffer} className="space-y-3">
                <p className="text-xs text-slate-700">
                  Listed price is <strong>{formatMoney(activeItem.price, activeItem.country)}</strong>. Enter your offer:
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={100}
                    required
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    className="flex-1 min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 text-base font-bold tabular-nums"
                  />
                  <button
                    type="submit"
                    className="min-h-[46px] px-4 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600"
                  >
                    Send Offer
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Product Details */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
            <h3 className="text-sm font-bold text-slate-900">Product Details</h3>
            <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-line">
              {activeItem.description}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
              <div>
                <span className="font-bold text-slate-800">Condition:</span> {activeItem.condition}
              </div>
              <div>
                <span className="font-bold text-slate-800">Location:</span>{' '}
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-lg leading-none" aria-hidden="true">
                    {itemCountryCfg.flag}
                  </span>
                  <span>
                    {getCountryDisplayName(itemCountryCfg.country)} · {activeItem.location}
                  </span>
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-800">Payment:</span> Paystack Escrow Only
              </div>
              <div>
                <span className="font-bold text-slate-800">Delivery:</span> 24-48 hrs
              </div>
            </div>
          </div>

          {/* Seller Verification Card + Trust Score + 5-sec Video Reviews */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-green-100 overflow-hidden flex items-center justify-center shrink-0">
                {activeItem.seller_profile_pic ? (
                  <img
                    src={activeItem.seller_profile_pic}
                    alt={activeItem.seller_name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-green-800" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-base font-bold text-slate-900 truncate flex items-center gap-1.5 flex-wrap">
                    <span className="truncate">
                      {activeItem.seller_shop_name
                        ? `${activeItem.seller_name} · ${activeItem.seller_shop_name}`
                        : activeItem.seller_name}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-extrabold text-amber-700 shrink-0 tabular-nums"
                      title="Live Seller Average Star Rating"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      {loadingTrust ? '...' : trustAvg.toFixed(1)}{' '}
                      <span className="text-slate-600 font-semibold">
                        ({trustCount} {trustCount === 1 ? 'review' : 'reviews'})
                      </span>
                    </span>
                  </div>
                </div>
                <BadgeRow badges={activeItem.seller_badges} size="sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div>
                <span className="font-bold text-slate-800">School / Market:</span>{' '}
                {activeItem.seller_shop_name
                  ? `${activeItem.seller_shop_name} — ${activeItem.seller_market || activeItem.institution}`
                  : activeItem.institution}
              </div>
              <div>
                <span className="font-bold text-slate-800">Joined:</span> {joinedLabel}
              </div>
              <div>
                <span className="font-bold text-slate-800">Products:</span>{' '}
                <span className="tabular-nums font-semibold">{activeItem.seller_items_count} active</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
              <span className="text-lg leading-none shrink-0" aria-hidden="true">
                {itemCountryCfg.flag}
              </span>
              <span>
                {getCountryDisplayName(itemCountryCfg.country)} · Pickup Area: {activeItem.location}
              </span>
            </div>

            {/* Trust Score Rating + 5-sec Video Review after Verified Completed Order */}
            <form onSubmit={handleRateSeller} className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Trust Score &amp; 5-sec Video Review (Verified Buyers Only)
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={!hasConfirmedOrder}
                      onClick={() => setRatingScore(n)}
                      aria-label={`Rate ${n} stars`}
                      className="p-0.5 disabled:opacity-50"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          n <= ratingScore ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {!hasConfirmedOrder && !ratingSaved && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] font-semibold text-amber-900">
                  Buy this item via Paystack and confirm delivery in <strong>Profile &gt; My Orders</strong> to unlock <strong>Submit Review</strong>.
                </div>
              )}

              {reviewError && (
                <div className="text-xs font-semibold text-red-700">{reviewError}</div>
              )}

              {ratingSaved ? (
                <div className="text-xs font-bold text-green-700">
                  Thanks! Your verified buyer rating &amp; review has been saved.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <input
                      type="text"
                      disabled={!hasConfirmedOrder}
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder={
                        hasConfirmedOrder
                          ? 'Write review after delivery...'
                          : 'Verified buyers with completed order only'
                      }
                      className="flex-1 min-w-[160px] min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-xs disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    <label
                      className={`min-h-[38px] px-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1 shrink-0 ${
                        hasConfirmedOrder ? 'cursor-pointer hover:bg-slate-100' : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5 text-green-700" />
                      <span>
                        {compressingReviewVid
                          ? 'Compressing...'
                          : reviewVideoUrl
                          ? '5s Video Ready'
                          : '+5s Video'}
                      </span>
                      <input
                        type="file"
                        accept="video/*"
                        disabled={!hasConfirmedOrder}
                        onChange={handleReviewVideoUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={!hasConfirmedOrder || ratingSubmitting || compressingReviewVid}
                      className="min-h-[38px] px-3.5 rounded-lg bg-green-700 text-white text-xs font-extrabold hover:bg-green-800 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed shrink-0"
                    >
                      {ratingSubmitting ? 'Saving...' : 'Submit Review'}
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* Buyer Reviews & 5-sec Video Reviews */}
            {sellerReviews.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="text-xs font-extrabold text-slate-700">
                  Buyer Reviews ({sellerReviews.length})
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {sellerReviews.slice(0, 4).map((rev) => (
                    <div key={rev.id} className="rounded-lg bg-slate-50 p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{rev.rater_name}</span>
                        <span className="inline-flex items-center gap-0.5 font-bold text-amber-600">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          {rev.score}
                        </span>
                      </div>
                      {rev.comment && <p className="text-slate-700">{rev.comment}</p>}
                      {rev.video_url && (!lowDataMode || revealInLowData) && (
                        <video
                          src={rev.video_url}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full max-h-36 rounded-lg bg-black"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Safety notice */}
          <div className="rounded-xl bg-green-50 border border-green-300 p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-green-800 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-green-950 leading-relaxed space-y-1">
              <div>
                <strong>Escrow Protection:</strong> Your money is safe. We hold payment until you receive your product.
              </div>
              <div>
                <strong>Payment Rule:</strong> Chat for questions only. Pay only on Afri Mart via Paystack to stay safe. Never send cash or direct bank transfers.
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => onBlockSeller(activeItem)}
              className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 inline-flex items-center gap-2"
            >
              <Ban className="w-4 h-4" />
              <span>Block Seller</span>
            </button>
          </div>
        </div>

        {/* Sticky Bottom Action Bar: Buy Now (Paystack) + Chat Seller for questions only */}
        <div className="border-t border-slate-200 bg-white p-4 pb-safe space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onBuyNow(activeItem)}
              className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-extrabold text-base flex items-center justify-center gap-2 hover:bg-green-800"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Buy Now (Paystack)</span>
            </button>
            <button
              type="button"
              onClick={() => onChat(activeItem)}
              className="w-full min-h-[52px] rounded-xl border-2 border-green-700 bg-white text-green-800 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-green-50"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Chat Seller (Questions Only)</span>
            </button>
          </div>
          <p className="text-center text-xs font-bold text-green-900">
            Chat for questions only. Pay on this site to stay safe.
          </p>
        </div>
      </div>
    </div>
  );
};
