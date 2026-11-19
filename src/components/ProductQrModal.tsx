import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  QrCode,
  Share2,
  X,
} from 'lucide-react';
import { getCountryConfig, getCountryDisplayName } from '../data/languages';
import { useI18n } from '../lib/i18nContext';
import { BASE_SITE_URL } from '../lib/seo';
import type { MarketplaceItem } from '../types';

export function buildProductUrl(productId: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : BASE_SITE_URL;
  return `${origin}/product/${encodeURIComponent(productId)}`;
}

interface ProductQrModalProps {
  item: MarketplaceItem | null;
  onClose: () => void;
  onViewProduct?: (item: MarketplaceItem) => void;
}

export const ProductQrModal: React.FC<ProductQrModalProps> = ({
  item,
  onClose,
  onViewProduct,
}) => {
  const { formatMoney } = useI18n();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const productUrl = item ? buildProductUrl(item.id) : '';

  useEffect(() => {
    if (!item || !productUrl) {
      setQrDataUrl('');
      setQrError('');
      return;
    }

    let cancelled = false;
    setQrError('');
    setCopied(false);

    QRCode.toDataURL(productUrl, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrError('Could not generate QR code for this product.');
      });

    return () => {
      cancelled = true;
    };
  }, [item?.id, productUrl]);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const itemCountryCfg = getCountryConfig(item.country || 'Nigeria');
  const thumb = item.thumbnails?.[0] || item.photos?.[0];
  const safeSlug =
    item.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'product';
  const downloadFileName = `afri-student-mart-${safeSlug}-qr.png`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback: nothing needed, user can select from readout
    }
  };

  const shareText = `Scan or open "${item.title}" (${formatMoney(
    item.price,
    item.country
  )}) on Afri Student Mart:`;
  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${productUrl}`)}`;

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: productUrl,
        });
        return;
      } catch {
        // User cancelled native share -> fall back to copying link
      }
    }
    await handleCopyLink();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-qr-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-green-800 text-white">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-yellow-300" />
            <h2 id="product-qr-modal-title" className="text-base font-extrabold">
              Product QR Code
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR code modal"
            className="min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center text-green-100 hover:bg-green-700 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Product Summary */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {thumb ? (
              <img
                src={thumb}
                alt={item.title}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-green-100 text-green-800 flex items-center justify-center shrink-0">
                <QrCode className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-slate-900 line-clamp-2 leading-snug">
                {item.title}
              </div>
              <div className="text-base font-extrabold text-green-800 tabular-nums mt-0.5">
                {formatMoney(item.price, item.country)}
              </div>
              <div className="text-[11px] font-semibold text-slate-600 truncate">
                {itemCountryCfg.flag} {getCountryDisplayName(itemCountryCfg.country)} ·{' '}
                {item.seller_shop_name || item.seller_name}
              </div>
            </div>
          </div>

          {/* QR Graphic */}
          <div className="rounded-2xl border-2 border-green-700 bg-white p-4 text-center space-y-2.5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-green-800">
              Afri Student Mart · Instant Mobile Scan
            </div>

            <div className="flex items-center justify-center min-h-[224px]">
              {qrError ? (
                <div className="text-xs font-semibold text-red-700 px-3">{qrError}</div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${item.title}`}
                  className="w-56 h-56 mx-auto rounded-lg border border-slate-100"
                />
              ) : (
                <div className="w-56 h-56 mx-auto rounded-xl bg-slate-100 animate-pulse flex items-center justify-center text-xs font-semibold text-slate-500">
                  Generating QR...
                </div>
              )}
            </div>

            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              Point your phone camera at this QR code to open the product detail page immediately.
            </p>
          </div>

          {/* Direct URL + Copy */}
          <div className="space-y-1.5">
            <label
              htmlFor="product-qr-direct-link"
              className="block text-[11px] font-bold uppercase tracking-wide text-slate-500"
            >
              Direct Product Link
            </label>
            <div className="flex items-center gap-2">
              <input
                id="product-qr-direct-link"
                type="text"
                readOnly
                value={productUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-h-[42px] rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-mono text-slate-700 focus:outline-none focus:border-green-700"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`min-h-[42px] px-3.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shrink-0 border transition-colors ${
                  copied
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-slate-800 border-slate-300 hover:border-green-700 hover:bg-green-50'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={downloadFileName}
                className="min-h-[46px] rounded-xl bg-green-700 text-white font-extrabold text-sm px-4 flex items-center justify-center gap-2 hover:bg-green-800"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Download QR</span>
              </a>
            )}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
              <button
                type="button"
                onClick={handleShare}
                className="min-h-[46px] rounded-xl border-2 border-green-700 bg-green-50 text-green-900 font-extrabold text-sm px-4 flex items-center justify-center gap-2 hover:bg-green-100"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>Share Link</span>
              </button>
            ) : (
              <a
                href={waShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[46px] rounded-xl bg-[#25D366] text-white font-extrabold text-sm px-4 flex items-center justify-center gap-2 hover:opacity-95"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>Share WhatsApp</span>
              </a>
            )}
          </div>

          {onViewProduct && (
            <button
              type="button"
              onClick={() => onViewProduct(item)}
              className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Product Details</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
