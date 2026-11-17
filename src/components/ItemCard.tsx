import React, { useState } from 'react';
import { Flag, Heart, MapPin, MessageCircle, Rocket, ShoppingBag, Star, Video } from 'lucide-react';
import {
  getCountryByDialCode,
  getCountryConfig,
  getCountryDisplayName,
} from '../data/languages';
import { formatTimeAgo } from '../lib/api';
import { useI18n } from '../lib/i18nContext';
import type { MarketplaceItem } from '../types';
import { BadgeRow } from './BadgePill';

interface ItemCardProps {
  item: MarketplaceItem;
  wishlisted?: boolean;
  lowDataMode?: boolean;
  onToggleWishlist?: (item: MarketplaceItem) => void;
  onViewDetails: (item: MarketplaceItem) => void;
  onBuyNow?: (item: MarketplaceItem) => void;
  onChat: (item: MarketplaceItem) => void;
  onReport: (item: MarketplaceItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  wishlisted = false,
  lowDataMode = false,
  onToggleWishlist,
  onViewDetails,
  onBuyNow,
  onChat,
  onReport,
}) => {
  const { formatMoney, t } = useI18n();
  const [imgError, setImgError] = useState(false);
  // Use 200px / <=30KB thumbnail for fast list rendering; full 800px loads only on click
  const photo = item.thumbnails?.[0] || item.photos?.[0];
  const itemCountryCfg = item.country
    ? getCountryConfig(item.country)
    : getCountryByDialCode(item.country_code);

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Photo area */}
      <div
        className={`relative w-full bg-slate-100 overflow-hidden ${
          lowDataMode ? 'h-28' : 'aspect-[4/3]'
        }`}
      >
        <button
          type="button"
          onClick={() => onViewDetails(item)}
          className="w-full h-full text-left focus:outline-none block"
        >
          {photo && !imgError ? (
            <img
              src={photo}
              alt={item.title}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-green-50 text-green-700 p-4 text-center">
              <ShoppingBag className="w-8 h-8 mb-1.5 opacity-60" />
              <span className="text-xs font-semibold line-clamp-2">{item.title}</span>
            </div>
          )}
        </button>

        {/* Left Top Status Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1 pointer-events-none">
          {item.is_boosted && (
            <span className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white">
              <Rocket className="w-3 h-3" />
              Boosted
            </span>
          )}
          {item.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
              <Star className="w-3 h-3 fill-white" />
              Hot Deal
            </span>
          )}
          {item.video_url && (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white">
              <Video className="w-3 h-3" />
              Video
            </span>
          )}
          {lowDataMode && (
            <span className="rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-bold text-yellow-300">
              Low Data
            </span>
          )}
        </div>

        {/* Wishlist Heart */}
        {onToggleWishlist && (
          <button
            type="button"
            onClick={() => onToggleWishlist(item)}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            className={`absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center ${
              wishlisted
                ? 'bg-red-500 text-white'
                : 'bg-white/95 text-slate-700 hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${wishlisted ? 'fill-white' : ''}`} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
          <span className="text-green-800 font-semibold truncate">
            {item.condition} · {formatTimeAgo(item.created_at)}
          </span>
          <span className="text-[10px] font-bold text-green-700 shrink-0">ESCROW</span>
        </div>

        <button
          type="button"
          onClick={() => onViewDetails(item)}
          className="mt-1 text-left focus:outline-none"
        >
          <h3 className="text-[15px] sm:text-base font-bold text-slate-900 line-clamp-2 leading-snug hover:text-green-800">
            {item.title}
          </h3>
        </button>

        <div className="mt-1.5 text-xl font-extrabold text-green-800 tabular-nums">
          {formatMoney(item.price, item.country)}
        </div>

        {/* Seller + Verified Badge + Trust Score */}
        <div className="mt-2 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-800 truncate">{item.seller_name}</span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-amber-600 shrink-0 tabular-nums">
              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
              {(item.seller_rating || 5.0).toFixed(1)}
              {typeof item.seller_reviews_count === 'number' && item.seller_reviews_count > 0 && (
                <span className="text-slate-400 font-semibold">({item.seller_reviews_count})</span>
              )}
            </span>
          </div>
          <BadgeRow badges={item.seller_badges} size="xs" />
          <div className="truncate text-blue-800 font-semibold">
            {item.seller_shop_name
              ? `${item.seller_shop_name} (${item.seller_market || item.institution})`
              : item.institution}
          </div>
          <div className="flex items-center justify-between gap-2 text-slate-500 truncate">
            <span className="inline-flex items-center gap-1.5 truncate">
              <span
                className="text-lg leading-none shrink-0"
                title={getCountryDisplayName(itemCountryCfg.country)}
                aria-label={getCountryDisplayName(itemCountryCfg.country)}
              >
                {itemCountryCfg.flag}
              </span>
              <span className="truncate font-semibold text-slate-700">
                {getCountryDisplayName(itemCountryCfg.country)} · {item.location}
              </span>
            </span>
            {typeof item.distance_km === 'number' && item.distance_km <= 2.0 && (
              <span className="rounded bg-green-50 border border-green-200 px-1.5 py-0.5 text-[10px] font-bold text-green-800 shrink-0 tabular-nums">
                {item.distance_km.toFixed(1)}km
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto pt-3 flex items-center gap-1.5">
          {onBuyNow && (
            <button
              type="button"
              onClick={() => onBuyNow(item)}
              className="flex-1 min-h-[44px] rounded-xl bg-green-700 text-white font-bold text-xs sm:text-sm px-2.5 flex items-center justify-center gap-1 hover:bg-green-800 whitespace-nowrap"
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span>{t('buy_now')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onChat(item)}
            title="Chat for questions only. Pay on this site to stay safe."
            className={`${
              onBuyNow ? 'px-3' : 'flex-1 px-3'
            } min-h-[44px] rounded-xl border border-green-700 bg-white text-green-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-1 hover:bg-green-50 whitespace-nowrap`}
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{t('chat')}</span>
          </button>
          <button
            type="button"
            onClick={() => onReport(item)}
            title="1-click Report Scam"
            aria-label={`Report scam on ${item.title}`}
            className="min-h-[44px] min-w-[44px] rounded-xl border border-red-200 bg-red-50/60 text-red-600 hover:bg-red-100 flex items-center justify-center shrink-0"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
};
