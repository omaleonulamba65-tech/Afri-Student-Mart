import React from 'react';
import { Minus, Plus, ShieldCheck, ShoppingBag, ShoppingCart, Trash2, X } from 'lucide-react';
import { getCountryConfig } from '../data/languages';
import { useI18n } from '../lib/i18nContext';
import type { CartItem, MarketplaceItem } from '../types';

interface CartDrawerProps {
  open: boolean;
  cartItems: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onViewItem: (item: MarketplaceItem) => void;
  onCheckoutAll: () => void;
  onCheckoutSingle: (item: MarketplaceItem) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  cartItems,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onViewItem,
  onCheckoutAll,
  onCheckoutSingle,
}) => {
  const { country, formatMoney } = useI18n();

  if (!open) return null;

  const totalUnits = cartItems.reduce((sum, entry) => sum + entry.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, entry) => sum + Number(entry.item.price || 0) * entry.quantity,
    0
  );
  const primaryCountry =
    cartItems[0]?.item.country || (country === 'All' ? 'Nigeria' : country);
  const countryCfg = getCountryConfig(primaryCountry);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex flex-col w-full max-w-md h-full bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-green-800 text-white px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-yellow-300" />
            <div>
              <h2 className="text-base font-extrabold">
                My Cart ({totalUnits})
              </h2>
              <p className="text-xs text-green-100">
                Paystack Escrow Protected · {countryCfg.country}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="min-h-[34px] px-2.5 rounded-lg bg-green-700 text-xs font-bold text-green-50 hover:bg-green-600"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-green-700 flex items-center justify-center"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-50 text-green-700 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Your Cart is Empty</h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xs">
                Tap <strong>+ Cart</strong> on any listing in your country feed to save items here and check out together via Paystack Escrow.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[46px] px-6 rounded-xl bg-green-700 text-white font-extrabold text-sm hover:bg-green-800"
              >
                Browse Listings
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-start gap-2 text-xs text-green-950 font-semibold">
                <ShieldCheck className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span>
                  Every cart item is protected by Paystack Escrow until you confirm delivery in Profile &gt; My Orders.
                </span>
              </div>

              {cartItems.map(({ item, quantity }) => {
                const thumb = item.thumbnails?.[0] || item.photos?.[0] || '';
                const lineTotal = Number(item.price || 0) * quantity;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2.5"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onViewItem(item);
                        }}
                        className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0"
                      >
                        {thumb ? (
                          <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onViewItem(item);
                          }}
                          className="text-left text-sm font-extrabold text-slate-900 line-clamp-2 hover:text-green-800"
                        >
                          {item.title}
                        </button>
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {item.seller_shop_name || item.seller_name} · {item.location}
                        </div>
                        <div className="text-sm font-extrabold text-green-800 tabular-nums mt-1">
                          {formatMoney(lineTotal, item.country)}
                          {quantity > 1 && (
                            <span className="text-[11px] font-semibold text-slate-500 ml-1">
                              ({formatMoney(item.price, item.country)} each)
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label={`Remove ${item.title}`}
                        className="min-h-[36px] min-w-[36px] rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          aria-label="Decrease quantity"
                          className="w-8 h-8 rounded-lg bg-white text-slate-800 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-extrabold tabular-nums">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          aria-label="Increase quantity"
                          className="w-8 h-8 rounded-lg bg-white text-slate-800 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onCheckoutSingle(item)}
                        className="min-h-[36px] px-3 rounded-xl border border-green-700 text-green-800 text-xs font-extrabold hover:bg-green-50"
                      >
                        Buy This Item Only
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3 pb-safe">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-700">
                Cart Subtotal ({totalUnits} item{totalUnits === 1 ? '' : 's'})
              </span>
              <span className="text-xl font-extrabold text-green-800 tabular-nums">
                {formatMoney(subtotal, primaryCountry)}
              </span>
            </div>
            <button
              type="button"
              onClick={onCheckoutAll}
              className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-extrabold text-base hover:bg-green-800 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Checkout All via Paystack</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
