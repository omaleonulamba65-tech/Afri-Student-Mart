import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Lock,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { EXACT_SAFETY_MESSAGES } from '../data/policies';
import { getCountryConfig } from '../data/languages';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18nContext';
import { launchPaystackInline, resolvePaystackConfig } from '../lib/paystack';
import {
  AdSettings,
  CartItem,
  EscrowOrder,
  MarketplaceItem,
  PolicyPageId,
  PublicUser,
} from '../types';
import { RefundPolicyBox } from './RefundPolicyBox';

interface CheckoutModalProps {
  item: MarketplaceItem | null;
  cartItems?: CartItem[];
  user: PublicUser | null;
  adSettings?: Partial<AdSettings> | null;
  agreedPrice?: number;
  onClose: () => void;
  onRequireAuth: () => void;
  onOpenPolicy: (id: PolicyPageId) => void;
  onOrderSuccess: (order: EscrowOrder) => void;
  onCartCheckoutSuccess?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  item,
  cartItems,
  user,
  adSettings,
  agreedPrice,
  onClose,
  onRequireAuth,
  onOpenPolicy,
  onOrderSuccess,
  onCartCheckoutSuccess,
}) => {
  const { country: activeCountry, formatMoney, t } = useI18n();
  const [singleQuantity, setSingleQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'Bank Transfer' | 'Mobile Money'>('Card');
  const [deliveryTier, setDeliveryTier] = useState<'same_city' | 'standard'>('same_city');
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.campus || user?.institution || 'Campus / Main Gate'
  );
  const [buyerEmail, setBuyerEmail] = useState(
    user?.email ||
      (user?.phone_number ? `student.${user.phone_number}@afristudentmart.ng` : 'student@afristudentmart.ng')
  );
  const [processing, setProcessing] = useState(false);
  const [testSheetOpen, setTestSheetOpen] = useState(false);
  const [testChannel, setTestChannel] = useState<'card' | 'transfer' | 'ussd'>('card');
  const [pendingRef, setPendingRef] = useState('');
  const [error, setError] = useState('');
  const [completedOrder, setCompletedOrder] = useState<EscrowOrder | null>(null);
  const [completedCartCount, setCompletedCartCount] = useState(0);

  const effectiveEntries: CartItem[] =
    cartItems && cartItems.length > 0
      ? cartItems
      : item
      ? [{ item, quantity: singleQuantity }]
      : [];

  if (effectiveEntries.length === 0) return null;

  const isCartCheckout = Boolean(cartItems && cartItems.length > 0);
  const primaryItem = effectiveEntries[0].item;
  const itemCountry = primaryItem.country || (activeCountry === 'All' ? 'Nigeria' : activeCountry);
  const countryCfg = getCountryConfig(itemCountry);
  const cfg = resolvePaystackConfig(adSettings);
  const productPrice = isCartCheckout
    ? effectiveEntries.reduce((sum, entry) => sum + Number(entry.item.price || 0) * entry.quantity, 0)
    : Number(agreedPrice || primaryItem.price) * singleQuantity;
  const deliveryFee =
    deliveryTier === 'same_city' ? countryCfg.deliveryFeeSameCity : countryCfg.deliveryFeeStandard;
  const totalAmount = productPrice + deliveryFee;
  const amountKobo = Math.round(totalAmount * 100);
  const rawCommission = Number(adSettings?.commission_percent);
  const commissionPercent =
    Number.isFinite(rawCommission) && rawCommission >= 0 && rawCommission <= 30
      ? rawCommission
      : 10;
  const sellerPercent = Math.max(0, 100 - commissionPercent);
  const adminCommissionPreview = Math.round(productPrice * (commissionPercent / 100));
  const sellerPayoutPreview = productPrice - adminCommissionPreview;
  const adminTotalKeptPreview = adminCommissionPreview + deliveryFee;
  const thumb = primaryItem.thumbnails?.[0] || primaryItem.photos?.[0] || '';

  const finalizeOrder = async (reference: string) => {
    setProcessing(true);
    setError('');
    try {
      let lastOrder: EscrowOrder | null = null;
      let createdCount = 0;
      for (let i = 0; i < effectiveEntries.length; i++) {
        const entry = effectiveEntries[i];
        const qty = Math.max(1, entry.quantity);
        const itemRef = effectiveEntries.length === 1 ? reference : `${reference}_${i + 1}`;
        const res = await api.createOrder({
          item_id: entry.item.id,
          quantity: qty,
          delivery_address: deliveryAddress.trim() || entry.item.location,
          paystack_reference: itemRef,
          buyer_email: buyerEmail.trim(),
          delivery_tier: deliveryTier,
          payment_method: paymentMethod,
        });
        lastOrder = res.order;
        createdCount += qty;
      }
      if (lastOrder) {
        setCompletedOrder(lastOrder);
        setCompletedCartCount(createdCount);
        setTestSheetOpen(false);
        onOrderSuccess(lastOrder);
        if (isCartCheckout) {
          onCartCheckoutSuccess?.();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your order.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayNow = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      onRequireAuth();
      return;
    }
    if (!deliveryAddress.trim()) {
      setError('Enter your campus, hostel, or delivery spot.');
      return;
    }

    const ref = `ASM_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;
    setPendingRef(ref);

    if (paymentMethod !== 'Card') {
      void finalizeOrder(ref);
      return;
    }

    // Use Paystack Inline JS with automatic Split Code / Seller Subaccount
    const launched = launchPaystackInline({
      settings: adSettings,
      email: buyerEmail.trim() || user.email || `student.${user.phone_number}@afristudentmart.ng`,
      amountNaira: totalAmount,
      currency: countryCfg.currencyCode,
      reference: ref,
      sellerSubaccountCode: isCartCheckout ? undefined : primaryItem.seller_subaccount_code,
      metadata: {
        custom_fields: [
          {
            display_name: 'Items',
            variable_name: 'item_title',
            value: isCartCheckout
              ? `${effectiveEntries.length} Cart Items (${primaryItem.title})`
              : `${singleQuantity}x ${primaryItem.title}`,
          },
          { display_name: 'Delivery Address', variable_name: 'delivery_address', value: deliveryAddress },
          { display_name: `Product Price (${countryCfg.currencyCode})`, variable_name: 'product_price', value: productPrice },
          { display_name: `Delivery Fee (${countryCfg.currencyCode})`, variable_name: 'delivery_fee', value: deliveryFee },
        ],
      },
      onSuccess: (paidRef) => {
        void finalizeOrder(paidRef);
      },
      onClose: () => {
        setError('Paystack payment window closed. Click Pay Now to try again.');
      },
    });

    if (!launched) {
      // Built-in Paystack Inline Test Mode sheet when placeholder pk_test is used
      setTestSheetOpen(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white sm:bg-black/60 sm:items-center sm:justify-center sm:p-4">
      <div className="flex flex-col w-full h-full sm:h-auto sm:max-h-[94vh] sm:max-w-2xl bg-white sm:rounded-2xl sm:shadow-2xl overflow-hidden">
        {/* Clean Checkout Header — ZERO Ads on Checkout Page */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 bg-green-800 text-white">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-green-700"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold truncate">{t('safe_checkout')}</h2>
            <p className="text-xs text-green-100 truncate">
              100% Ad-Free Checkout · Paystack Inline Split ({countryCfg.country})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-green-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {completedOrder ? (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
              <CheckCircle2 className="w-11 h-11" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl sm:text-2xl font-extrabold text-green-900">
                {EXACT_SAFETY_MESSAGES.paymentSuccess}
              </h3>
              <p className="text-sm text-slate-600">{t('escrow_safe_msg')}</p>
            </div>

            <div className="w-full max-w-md rounded-2xl border border-green-200 bg-green-50/70 p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Order Reference</span>
                <span className="font-mono font-bold text-slate-900">{completedOrder.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Items Ordered</span>
                <span className="font-bold text-slate-900 truncate max-w-[60%]">
                  {completedCartCount > 1
                    ? `${completedCartCount} Escrow Orders Created`
                    : completedOrder.item_title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Paid via Paystack</span>
                <span className="font-extrabold text-green-800 tabular-nums">
                  {formatMoney(totalAmount, completedOrder.country || itemCountry)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">
                  Split ({commissionPercent}% + Delivery Fee / {sellerPercent}%)
                </span>
                <span className="font-bold text-green-900 tabular-nums">
                  Admin {formatMoney(adminTotalKeptPreview, completedOrder.country || itemCountry)} · Seller{' '}
                  {formatMoney(sellerPayoutPreview, completedOrder.country || itemCountry)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Delivery Window</span>
                <span className="font-semibold text-slate-900">24–48 hrs</span>
              </div>
            </div>

            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
              Go to <strong>Profile &gt; My Orders</strong> after receiving your item to confirm delivery or request a refund if needed.
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full max-w-md min-h-[52px] rounded-xl bg-green-700 text-white font-extrabold text-base hover:bg-green-800"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handlePayNow} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Paystack-Only Warning */}
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-amber-950 font-bold leading-snug">
                {EXACT_SAFETY_MESSAGES.outsidePaymentWarning}
              </div>
            </div>

            {/* Escrow Protection Banner */}
            <div className="rounded-xl border border-green-300 bg-green-50 p-3.5 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-800 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-green-950 font-semibold leading-snug">
                {t('escrow_safe_msg')}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm font-bold text-red-800">
                {error}
              </div>
            )}

            {/* Item Summary (Single or Cart) */}
            {isCartCheckout ? (
              <div className="rounded-2xl border border-slate-200 p-3.5 space-y-2.5 bg-white">
                <div className="text-xs font-extrabold uppercase text-green-800">
                  Cart Checkout ({effectiveEntries.reduce((s, e) => s + e.quantity, 0)} items)
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {effectiveEntries.map(({ item: entryItem, quantity }) => {
                    const entryThumb = entryItem.thumbnails?.[0] || entryItem.photos?.[0] || '';
                    return (
                      <div key={entryItem.id} className="flex items-center gap-3 text-xs">
                        <div className="w-11 h-11 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                          {entryThumb ? (
                            <img src={entryThumb} alt={entryItem.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 truncate">{entryItem.title}</div>
                          <div className="text-slate-500 truncate">
                            Qty: {quantity} · {entryItem.seller_name}
                          </div>
                        </div>
                        <div className="font-extrabold text-green-800 tabular-nums shrink-0">
                          {formatMoney(entryItem.price * quantity, entryItem.country || itemCountry)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 p-3.5 flex items-center gap-3.5 bg-white">
                <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  {thumb ? (
                    <img src={thumb} alt={primaryItem.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                    {primaryItem.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Seller: <strong className="text-slate-800">{primaryItem.seller_name}</strong> ·{' '}
                    {primaryItem.location}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-green-800 tabular-nums">
                      {formatMoney(productPrice, itemCountry)}
                    </p>
                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs font-extrabold">
                      <button
                        type="button"
                        onClick={() => setSingleQuantity((q) => Math.max(1, q - 1))}
                        aria-label="Decrease quantity"
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="px-1.5 tabular-nums text-slate-900">Qty {singleQuantity}</span>
                      <button
                        type="button"
                        onClick={() => setSingleQuantity((q) => q + 1)}
                        aria-label="Increase quantity"
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-900">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Card', 'Bank Transfer', 'Mobile Money'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`min-h-[42px] rounded-xl border px-2 text-xs font-extrabold transition-colors ${
                      paymentMethod === m
                        ? 'border-green-700 bg-green-700 text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-green-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Details + Same-City vs Standard Tier */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                  {t('delivery_fee')} ({countryCfg.country})
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryTier('same_city')}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                      deliveryTier === 'same_city'
                        ? 'border-green-700 bg-green-700 text-white'
                        : 'border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    <div>Same-City / Campus</div>
                    <div className="tabular-nums opacity-90">
                      {formatMoney(countryCfg.deliveryFeeSameCity, itemCountry)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryTier('standard')}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                      deliveryTier === 'standard'
                        ? 'border-green-700 bg-green-700 text-white'
                        : 'border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    <div>Standard Inter-Area</div>
                    <div className="tabular-nums opacity-90">
                      {formatMoney(countryCfg.deliveryFeeStandard, itemCountry)}
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1">
                  Campus / Hostel / Delivery Location *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-green-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="e.g. Main Gate / Hostel Block B"
                    className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-medium focus:border-green-700 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-600 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-green-700 shrink-0" />
                  <span>{EXACT_SAFETY_MESSAGES.deliveryPolicy}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1">
                  Receipt Email (for Paystack Receipt)
                </label>
                <input
                  type="email"
                  required
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="yourname@email.com"
                  className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm focus:border-green-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Price Breakdown — Strictly NO Bank Account Numbers Shown */}
            <div className="rounded-2xl border-2 border-green-700 bg-white p-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-slate-700">
                <span>{t('product_price')}</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatMoney(productPrice, itemCountry)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>{t('delivery_fee')}</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatMoney(deliveryFee, itemCountry)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between">
                <span className="text-base font-extrabold text-slate-900">{t('total_to_pay')}</span>
                <span className="text-2xl font-extrabold text-green-800 tabular-nums">
                  {formatMoney(totalAmount, itemCountry)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 pt-1">
                Owner keeps {commissionPercent}% + Delivery Fee ({formatMoney(adminTotalKeptPreview, itemCountry)}) · Seller gets {sellerPercent}% ({formatMoney(sellerPayoutPreview, itemCountry)}) when you confirm delivery.
              </p>
            </div>

            {/* Small Refund Box on Checkout Page */}
            <RefundPolicyBox
              compact
              onViewFullPolicy={() => onOpenPolicy('refund')}
            />

            {/* Paystack Test Mode Simulator Sheet (when placeholder pk_test / split code is active) */}
            {testSheetOpen && (
              <div className="rounded-2xl border-2 border-green-800 bg-green-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-green-800" />
                    <span className="text-sm font-extrabold text-green-950">
                      Paystack Inline Split Test Mode · {formatMoney(totalAmount, itemCountry)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestSheetOpen(false)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['card', 'Test Card'],
                      ['transfer', 'Paystack Transfer'],
                      ['ussd', 'Test USSD'],
                    ] as const
                  ).map(([ch, label]) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setTestChannel(ch)}
                      className={`min-h-[38px] rounded-xl text-xs font-bold border ${
                        testChannel === ch
                          ? 'bg-green-800 text-white border-green-800'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="rounded-xl bg-white border border-green-200 p-3 text-xs text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Reference</span>
                    <span className="font-mono font-bold">{pendingRef}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paystack Amount ({countryCfg.currencyCode} × 100)</span>
                    <span className="font-mono font-bold tabular-nums">{amountKobo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paystack Public Key</span>
                    <span className="font-mono text-[11px] truncate max-w-[58%]">{cfg.publicKey}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Split (Owner {commissionPercent}%+Del / Seller {sellerPercent}%)
                    </span>
                    <span className="font-bold text-green-800 tabular-nums">
                      Owner {formatMoney(adminTotalKeptPreview, itemCountry)} / Seller{' '}
                      {formatMoney(sellerPayoutPreview, itemCountry)}
                    </span>
                  </div>
                  <div className="text-[11px] text-green-800 font-semibold pt-1">
                    {testChannel === 'card'
                      ? 'Test Card: 4084 0841 4084 0841 · 12/28 · CVV 408 (Auto-approved via Split)'
                      : testChannel === 'transfer'
                      ? 'Paystack instant checkout channel (7% + Delivery Fee Owner / 93% Seller)'
                      : 'Paystack USSD *737* Test authorization'}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={processing}
                  onClick={() => finalizeOrder(pendingRef)}
                  className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-extrabold text-sm hover:bg-green-800 disabled:opacity-60"
                >
                  {processing
                    ? 'Confirming Paystack Split...'
                    : `${t('pay_now')} (${formatMoney(totalAmount, itemCountry)})`}
                </button>
              </div>
            )}

            {/* Big Green Pay Now Button */}
            {!testSheetOpen && (
              <div className="pt-1 space-y-2 pb-safe">
                <button
                  type="submit"
                  disabled={processing}
                  className="w-full min-h-[58px] rounded-xl bg-green-700 text-white font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 hover:bg-green-800 shadow-sm disabled:opacity-60"
                >
                  <Lock className="w-5 h-5" />
                  <span>
                    {processing
                      ? 'Processing...'
                      : paymentMethod === 'Card'
                      ? `${t('pay_now')} — ${formatMoney(totalAmount, itemCountry)}`
                      : `Place Order (${paymentMethod}) — ${formatMoney(totalAmount, itemCountry)}`}
                  </span>
                </button>
                <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => onOpenPolicy('refund')}
                    className="hover:text-green-800 underline"
                  >
                    Refund Policy
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => onOpenPolicy('delivery')}
                    className="hover:text-green-800 underline"
                  >
                    Delivery Policy
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => onOpenPolicy('terms')}
                    className="hover:text-green-800 underline"
                  >
                    Terms
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
