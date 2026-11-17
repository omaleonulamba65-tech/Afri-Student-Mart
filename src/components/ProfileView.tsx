import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Camera,
  Check,
  CheckCircle2,
  Heart,
  LogOut,
  PackageCheck,
  Rocket,
  Share2,
  Shield,
  ShoppingBag,
  Star,
  Store,
  Tag,
  Trash2,
  Truck,
  User,
  X,
} from 'lucide-react';
import { Globe } from 'lucide-react';
import { NIGERIAN_INSTITUTIONS } from '../data/institutions';
import { COUNTRY_LANGUAGE_CONFIGS, getCountryConfig } from '../data/languages';
import { EXACT_SAFETY_MESSAGES } from '../data/policies';
import { api, buildWhatsAppShareUrl, compressImageFile } from '../lib/api';
import { useI18n } from '../lib/i18nContext';
import { AFRICAN_PAYOUT_BANKS } from '../lib/paystack';
import {
  AccountBadge,
  AdSettings,
  EscrowOrder,
  ItemOffer,
  MarketplaceItem,
  PublicUser,
  SERVICE_CATEGORIES,
  ServiceBooking,
  WantAlert,
} from '../types';
import { BadgeRow } from './BadgePill';
import { PaystackFeeModal, PaystackFeeRequest } from './PaystackFeeModal';

const OWNER_PHONE = '07089628626';

interface ProfileViewProps {
  user: PublicUser | null;
  allItems: MarketplaceItem[];
  wishlistIds: string[];
  adSettings?: Partial<AdSettings> | null;
  onRequireAuth: () => void;
  onUserUpdated: (user: PublicUser) => void;
  onLogout: () => void;
  onOpenOwnerDashboard: () => void;
  onViewItem: (item: MarketplaceItem) => void;
  onNotice: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  allItems,
  wishlistIds,
  adSettings,
  onRequireAuth,
  onUserUpdated,
  onLogout,
  onOpenOwnerDashboard,
  onViewItem,
  onNotice,
}) => {
  const { country, language, countryConfig, setCountryAndLanguage, formatMoney, t } = useI18n();
  const [settingsCountry, setSettingsCountry] = useState(
    user?.country || (country === 'All' ? 'Nigeria' : country)
  );
  const [settingsLanguage, setSettingsLanguage] = useState(
    user?.language || language || 'English'
  );
  const [savingLang, setSavingLang] = useState(false);

  const [role, setRole] = useState<'buyer' | 'seller'>(
    user?.role === 'seller' ? 'seller' : 'buyer'
  );
  const [institution, setInstitution] = useState(user?.institution || '');
  const [campus, setCampus] = useState(user?.campus || '');
  const [badges, setBadges] = useState<AccountBadge[]>(user?.badges || ['student']);
  const [shopName, setShopName] = useState(user?.shop_name || '');
  const [market, setMarket] = useState(user?.market || '');
  const [serviceCategory, setServiceCategory] = useState(
    user?.service_category || SERVICE_CATEGORIES[0]
  );
  const [priceFrom, setPriceFrom] = useState(String(user?.price_from || 2000));

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [error, setError] = useState('');
  const [myItems, setMyItems] = useState<MarketplaceItem[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [offers, setOffers] = useState<ItemOffer[]>([]);
  const [counterDraft, setCounterDraft] = useState<Record<string, string>>({});
  const [wantAlerts, setWantAlerts] = useState<WantAlert[]>([]);
  const [alertKeyword, setAlertKeyword] = useState('');
  const [alertPrice, setAlertPrice] = useState('');
  const [alertSaving, setAlertSaving] = useState(false);
  const [boostingId, setBoostingId] = useState<string | null>(null);
  const [feeRequest, setFeeRequest] = useState<PaystackFeeRequest | null>(null);

  // Seller Paystack Subaccount Bank Setup
  const [payoutBank, setPayoutBank] = useState<string>(
    user?.payout_bank_name || AFRICAN_PAYOUT_BANKS[0]
  );
  const [payoutAccNo, setPayoutAccNo] = useState('');
  const [payoutAccName, setPayoutAccName] = useState(
    user?.payout_account_name || user?.full_name || ''
  );
  const [savingSubaccount, setSavingSubaccount] = useState(false);
  const [showSubaccountForm, setShowSubaccountForm] = useState(false);

  // Paystack Escrow Orders (Buyer + Seller)
  const [buyerOrders, setBuyerOrders] = useState<EscrowOrder[]>([]);
  const [sellerOrders, setSellerOrders] = useState<EscrowOrder[]>([]);
  const [orderBusyId, setOrderBusyId] = useState<string | null>(null);
  const [refundOpenId, setRefundOpenId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundPhoto, setRefundPhoto] = useState('');
  const [refundChangeMind, setRefundChangeMind] = useState(false);
  const [compressingRefundPhoto, setCompressingRefundPhoto] = useState(false);

  const loadOrders = () => {
    api
      .getOrders()
      .then((res) => {
        setBuyerOrders(res.buyer_orders);
        setSellerOrders(res.seller_orders);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (user) {
      setRole(user.role === 'seller' ? 'seller' : 'buyer');
      setInstitution(user.institution);
      setCampus(user.campus);
      setBadges(user.badges?.length ? user.badges : ['student']);
      setShopName(user.shop_name || '');
      setMarket(user.market || '');
      setServiceCategory(user.service_category || SERVICE_CATEGORIES[0]);
      setPriceFrom(String(user.price_from || 2000));

      loadOrders();
      api
        .getItems({ sellerId: user.id })
        .then((res) => setMyItems(res.items))
        .catch(() => {});
      api
        .getBookings()
        .then((res) => setBookings(res.bookings))
        .catch(() => {});
      api
        .getOffers()
        .then((res) => setOffers(res.offers))
        .catch(() => {});
      api
        .getWantAlerts()
        .then((res) => setWantAlerts(res.alerts))
        .catch(() => {});
    }
  }, [user?.id, user?.role, user?.institution, user?.campus]);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-4 my-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 text-green-800 flex items-center justify-center">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Your Account</h2>
        <p className="text-sm text-slate-600">
          Login or sign up with your phone number to manage your Student, Trader, or Service Provider badges, wishlist, and listings.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-bold text-base hover:bg-green-800"
        >
          Login / Create Account
        </button>
      </div>
    );
  }

  const isOwner = user.role === 'owner' || user.phone_number === OWNER_PHONE;
  const savedWishlistItems = allItems.filter((i) => wishlistIds.includes(i.id));
  const activeSettingsCountryCfg = getCountryConfig(settingsCountry);

  const handleLanguageSwitch = async (nextCountry: string, nextLang: string) => {
    setSettingsCountry(nextCountry);
    setSettingsLanguage(nextLang);
    setCountryAndLanguage(nextCountry, nextLang, true);
    setSavingLang(true);
    try {
      const res = await api.updateProfile({ country: nextCountry, language: nextLang });
      onUserUpdated(res.user);
      setSavedMsg(`Language updated: ${nextCountry} · ${nextLang}`);
    } catch {
      // Local language already switched cleanly
    } finally {
      setSavingLang(false);
    }
  };

  const toggleBadge = (b: AccountBadge) => {
    setError('');
    if (badges.includes(b)) {
      if (badges.length === 1) {
        setError('You must keep at least 1 active badge.');
        return;
      }
      setBadges(badges.filter((x) => x !== b));
    } else {
      if (badges.length >= 2) {
        setError('Maximum 2 badges per user (e.g. Student + Service Provider).');
        return;
      }
      setBadges([...badges, b]);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSavedMsg('');
    try {
      const res = await api.updateProfile({
        ...(isOwner ? {} : { role }),
        institution,
        campus,
        badges,
        ...(badges.includes('trader') ? { shop_name: shopName, market } : {}),
        ...(badges.includes('service_provider')
          ? { service_category: serviceCategory, price_from: Number(priceFrom || 2000) }
          : {}),
      });
      onUserUpdated(res.user);
      setSavedMsg('Profile, badges & settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSavedMsg('Compressing image...');
    try {
      const compressed = await compressImageFile(file, 800, 200 * 1024);
      const res = await api.updateProfile({ profile_pic: compressed });
      onUserUpdated(res.user);
      setSavedMsg('Profile photo updated (<=200KB).');
    } catch (err) {
      setSavedMsg('');
      setError(err instanceof Error ? err.message : 'Could not upload photo.');
    }
  };

  const handleDeleteMyItem = async (id: string) => {
    try {
      await api.deleteItem(id);
      setMyItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete item.');
    }
  };

  const handleBoostMyItem = (item: MarketplaceItem) => {
    setFeeRequest({
      feeType: 'boost_item',
      targetId: item.id,
      title: `Boost Item: ${item.title}`,
      amountNaira: 500,
      description: 'Pay ₦500 promotion fee via Paystack Inline JS to pin your listing to the top.',
    });
  };

  const handleSaveSubaccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSavingSubaccount(true);
    try {
      const res = await api.saveSellerSubaccount({
        bank_name: payoutBank,
        account_number: payoutAccNo,
        account_name: payoutAccName || user.full_name,
      });
      onUserUpdated(res.user);
      setPayoutAccNo('');
      setShowSubaccountForm(false);
      onNotice(`Paystack Subaccount (${res.subaccount.subaccount_code}) saved! You will receive 93% after Paystack fee.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save Paystack Subaccount.');
    } finally {
      setSavingSubaccount(false);
    }
  };

  const handleOfferResponse = async (
    offer: ItemOffer,
    action: 'accept' | 'reject' | 'counter'
  ) => {
    setError('');
    try {
      const counterVal = counterDraft[offer.id]
        ? Number(counterDraft[offer.id])
        : Math.round(((offer.item_price || offer.offered_price) + offer.offered_price) / 2);
      const res = await api.respondToOffer(offer.id, {
        action,
        ...(action === 'counter' ? { counter_price: counterVal } : {}),
      });
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? res.offer : o)));
      onNotice(`Offer ${res.offer.status}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update offer.');
    }
  };

  const handleCreateWantAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertKeyword.trim() || !Number(alertPrice)) return;
    setAlertSaving(true);
    setError('');
    try {
      const res = await api.createWantAlert({
        keyword: alertKeyword.trim(),
        max_price: Number(alertPrice),
        institution: user?.institution,
      });
      setWantAlerts((prev) => [res.alert, ...prev]);
      setAlertKeyword('');
      setAlertPrice('');
      onNotice(
        res.alert.matches.length > 0
          ? `Price Alert saved! ${res.alert.matches.length} matching item(s) already found.`
          : 'Price Alert saved! We will notify you immediately when a seller posts it.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save alert.');
    } finally {
      setAlertSaving(false);
    }
  };

  const handleDeleteWantAlert = async (id: string) => {
    try {
      await api.deleteWantAlert(id);
      setWantAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // Ignore
    }
  };

  const handleConfirmReceived = async (orderId: string) => {
    setError('');
    setOrderBusyId(orderId);
    try {
      const res = await api.confirmOrderDelivery(orderId);
      setBuyerOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      onNotice('Delivery confirmed! 93% payout released to seller.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm delivery.');
    } finally {
      setOrderBusyId(null);
    }
  };

  const handleMarkShipped = async (orderId: string) => {
    setError('');
    setOrderBusyId(orderId);
    try {
      const res = await api.markOrderShipped(orderId);
      setSellerOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      onNotice('Order marked as Shipped for campus/city delivery!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark shipped.');
    } finally {
      setOrderBusyId(null);
    }
  };

  const handleRefundPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setCompressingRefundPhoto(true);
    try {
      const compressed = await compressImageFile(file, 800, 200 * 1024);
      setRefundPhoto(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process refund photo.');
    } finally {
      setCompressingRefundPhoto(false);
    }
    e.target.value = '';
  };

  const handleSubmitRefund = async (e: React.FormEvent, orderId: string) => {
    e.preventDefault();
    setError('');
    setOrderBusyId(orderId);
    try {
      const res = await api.requestOrderRefund(orderId, {
        reason: refundReason,
        photo: refundPhoto || undefined,
        change_of_mind_before_ship: refundChangeMind,
      });
      setBuyerOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      setRefundOpenId(null);
      setRefundReason('');
      setRefundPhoto('');
      setRefundChangeMind(false);
      onNotice(
        refundChangeMind
          ? 'Order cancelled before shipping. Product price refund will be credited via Paystack (3-5 working days).'
          : 'Refund request submitted! Our team will review within 24 hours.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit refund request.');
    } finally {
      setOrderBusyId(null);
    }
  };

  const sellerReleasedEarnings = sellerOrders
    .filter((o) => o.order_status === 'delivered_confirmed')
    .reduce((acc, o) => acc + Number(o.seller_payout || 0), 0);
  const sellerEscrowPending = sellerOrders
    .filter((o) => o.order_status === 'paid_escrow' || o.order_status === 'shipped')
    .reduce((acc, o) => acc + Number(o.seller_payout || 0), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      {/* Private Owner Access Card — Only visible to 07089628626 */}
      {isOwner && (
        <div className="rounded-2xl bg-green-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Shield className="w-7 h-7 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-extrabold">Owner Admin Control</h2>
              <p className="text-sm text-green-100">
                Manage users, items, 7% commission &amp; escrow orders, refunds, reports, and Google AdSense.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenOwnerDashboard}
            className="min-h-[48px] px-5 rounded-xl bg-yellow-400 text-green-950 font-extrabold text-sm hover:bg-yellow-300 shrink-0"
          >
            Open Owner Dashboard
          </button>
        </div>
      )}

      {/* MY ORDERS (Escrow Held, Confirm Delivery, Request Refund + Upload Photo) */}
      <div className="rounded-2xl border border-green-300 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-green-700" />
            <h3 className="text-lg font-extrabold text-slate-900">
              My Orders ({buyerOrders.length})
            </h3>
          </div>
          <span className="text-[11px] font-bold text-green-800">Paystack Escrow Safe</span>
        </div>

        <p className="text-xs text-slate-600">{EXACT_SAFETY_MESSAGES.escrowProtection}</p>

        {buyerOrders.length === 0 ? (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600">
            No Paystack orders yet. Tap <strong>Buy Now</strong> on any product to pay safely on this site.
          </div>
        ) : (
          <div className="space-y-3">
            {buyerOrders.map((ord) => {
              const canConfirm =
                ord.order_status === 'paid_escrow' || ord.order_status === 'shipped';
              const canRefund =
                ord.order_status === 'paid_escrow' || ord.order_status === 'shipped';
              const isConfirmed = ord.order_status === 'delivered_confirmed';
              const busy = orderBusyId === ord.id;

              return (
                <div
                  key={ord.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {ord.item_photo && (
                        <img
                          src={ord.item_photo}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-slate-900 truncate">
                          {ord.item_title}
                        </div>
                        <div className="text-slate-600">
                          Seller: {ord.seller_name} · Ref: <span className="font-mono">{ord.reference}</span>
                        </div>
                        <div className="font-extrabold text-green-800 tabular-nums mt-0.5">
                          Total Paid: {formatMoney(ord.total_amount, ord.country)} (Item{' '}
                          {formatMoney(ord.product_price, ord.country)} + Delivery{' '}
                          {formatMoney(ord.delivery_fee, ord.country)})
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded-md px-2 py-1 text-[10px] font-extrabold uppercase shrink-0 ${
                        ord.order_status === 'delivered_confirmed'
                          ? 'bg-green-700 text-white'
                          : ord.order_status === 'shipped'
                          ? 'bg-blue-600 text-white'
                          : ord.order_status === 'refund_requested'
                          ? 'bg-orange-500 text-white'
                          : ord.order_status === 'refund_approved' || ord.order_status === 'cancelled'
                          ? 'bg-slate-700 text-white'
                          : 'bg-green-100 text-green-900'
                      }`}
                    >
                      {ord.order_status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-slate-600">
                    Delivery To: <strong className="text-slate-800">{ord.delivery_address}</strong>
                  </div>

                  {isConfirmed && (
                    <div className="rounded-lg bg-green-100 border border-green-300 px-3 py-2 text-[11px] font-semibold text-green-950">
                      Delivery confirmed! No refund after you press &ldquo;I Have Received My Order&rdquo;. Seller payout released.
                    </div>
                  )}

                  {ord.order_status === 'refund_requested' && (
                    <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-[11px] text-orange-950">
                      <strong>Refund Requested:</strong> {ord.refund_reason}. Approved refunds are paid back within 3-5 working days through Paystack.
                    </div>
                  )}

                  {(ord.order_status === 'refund_approved' || ord.order_status === 'cancelled') && (
                    <div className="rounded-lg bg-slate-100 border border-slate-300 px-3 py-2 text-[11px] text-slate-800">
                      <strong>Refund Approved ({formatMoney(ord.refund_amount || ord.product_price, ord.country)}):</strong> Paid back to your bank/card within 3-5 working days through Paystack.
                    </div>
                  )}

                  {canConfirm && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleConfirmReceived(ord.id)}
                        className="flex-1 min-h-[42px] px-3 rounded-xl bg-green-700 text-white font-extrabold text-xs hover:bg-green-800 disabled:opacity-60"
                      >
                        {busy ? 'Confirming...' : 'I Have Received My Order'}
                      </button>
                      {canRefund && (
                        <button
                          type="button"
                          onClick={() => {
                            setRefundOpenId(refundOpenId === ord.id ? null : ord.id);
                            setRefundChangeMind(false);
                          }}
                          className="min-h-[42px] px-3 rounded-xl border border-red-300 bg-white text-red-700 font-bold text-xs hover:bg-red-50"
                        >
                          Request Refund
                        </button>
                      )}
                    </div>
                  )}

                  {/* Inline Refund Form: My Orders > Request Refund > Upload Photo > Explain problem */}
                  {refundOpenId === ord.id && (
                    <form
                      onSubmit={(e) => handleSubmitRefund(e, ord.id)}
                      className="rounded-xl border border-red-200 bg-white p-3 space-y-2.5 mt-2"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-red-800">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Request Refund (Upload Photo + Explain Problem)</span>
                      </div>

                      {ord.order_status === 'paid_escrow' && (
                        <label className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 cursor-pointer text-[11px] text-slate-800">
                          <input
                            type="checkbox"
                            checked={refundChangeMind}
                            onChange={(e) => setRefundChangeMind(e.target.checked)}
                            className="mt-0.5 accent-green-700"
                          />
                          <span>
                            <strong>Change of Mind (Before Seller Ships):</strong> Cancel now for full product price refund ({formatMoney(ord.product_price, ord.country)}). Delivery fee ({formatMoney(ord.delivery_fee, ord.country)}) is NOT refundable.
                          </span>
                        </label>
                      )}

                      {!refundChangeMind && (
                        <div className="space-y-2">
                          <label className="min-h-[40px] px-3 rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-100">
                            <Camera className="w-4 h-4 text-green-700" />
                            <span>
                              {compressingRefundPhoto
                                ? 'Compressing photo...'
                                : refundPhoto
                                ? 'Photo Uploaded ✓'
                                : 'Upload Proof Photo *'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleRefundPhotoUpload}
                              className="hidden"
                            />
                          </label>
                          {refundPhoto && (
                            <img
                              src={refundPhoto}
                              alt="Refund proof"
                              className="w-20 h-20 rounded-lg object-cover border border-slate-200"
                            />
                          )}
                        </div>
                      )}

                      <textarea
                        rows={2}
                        required={!refundChangeMind}
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder={
                          refundChangeMind
                            ? 'Optional reason for cancelling before shipment...'
                            : 'Explain problem (wrong/damaged item within 24h, or seller did not deliver within 48h)...'
                        }
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                      />

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setRefundOpenId(null)}
                          className="min-h-[36px] px-3 rounded-lg border border-slate-300 text-xs font-bold text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={busy || compressingRefundPhoto}
                          className="min-h-[36px] px-4 rounded-lg bg-red-600 text-white text-xs font-extrabold hover:bg-red-700 disabled:opacity-60"
                        >
                          {busy ? 'Submitting...' : 'Submit Refund Request'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SELLER ORDERS & PAYOUTS (Seller gets 90% after buyer confirms delivery) */}
      {sellerOrders.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-green-700" />
              <h3 className="text-lg font-extrabold text-slate-900">
                Seller Orders &amp; Payouts ({sellerOrders.length})
              </h3>
            </div>
            <span className="text-xs font-extrabold text-green-800 tabular-nums">
              Released (93%): {formatMoney(sellerReleasedEarnings)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-xl bg-green-50 border border-green-200 p-3">
              <div className="text-slate-600 font-semibold">Released Earnings (93%)</div>
              <div className="text-lg font-extrabold text-green-800 tabular-nums">
                {formatMoney(sellerReleasedEarnings)}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-slate-600 font-semibold">Held in Escrow (Pending Delivery)</div>
              <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                {formatMoney(sellerEscrowPending)}
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {sellerOrders.map((ord) => (
              <div
                key={ord.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-slate-900 truncate">{ord.item_title}</span>
                  <span className="rounded bg-white border border-slate-200 px-2 py-0.5 font-bold uppercase text-[10px]">
                    {ord.order_status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-slate-600">
                  Buyer: <strong>{ord.buyer_name}</strong> · Deliver to: {ord.delivery_address}
                </div>
                <div className="font-bold text-green-800 tabular-nums">
                  Your 93% Split Payout: {formatMoney(ord.seller_payout, ord.country)}{' '}
                  <span className="text-slate-500 font-normal">
                    (You will receive 93% after Paystack fee · 7% Owner Split)
                  </span>
                </div>
                {ord.order_status === 'paid_escrow' && (
                  <button
                    type="button"
                    disabled={orderBusyId === ord.id}
                    onClick={() => handleMarkShipped(ord.id)}
                    className="min-h-[38px] px-4 rounded-lg bg-green-700 text-white font-extrabold text-xs hover:bg-green-800 disabled:opacity-60"
                  >
                    {orderBusyId === ord.id ? 'Updating...' : 'Mark as Shipped (Delivery)'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seller Paystack Payout Subaccount */}
      <div className="rounded-2xl border border-green-300 bg-white p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Paystack Subaccount Payouts
            </h3>
            <p className="text-xs font-semibold text-green-800">
              {EXACT_SAFETY_MESSAGES.sellerFeeNote} (7% Owner / 93% Seller Split automatically)
            </p>
          </div>
          {user.paystack_subaccount_code && (
            <button
              type="button"
              onClick={() => setShowSubaccountForm(!showSubaccountForm)}
              className="min-h-[36px] px-3 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              {showSubaccountForm ? 'Cancel' : 'Update Bank'}
            </button>
          )}
        </div>

        {user.paystack_subaccount_code && !showSubaccountForm ? (
          <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 text-xs space-y-1">
            <div className="font-extrabold text-green-900">
              Active Subaccount: <span className="font-mono">{user.paystack_subaccount_code}</span>
            </div>
            <div className="text-slate-700">
              {user.payout_bank_name || 'Bank Linked'} · Account ending in{' '}
              <strong>****{user.payout_account_last4 || '0000'}</strong> ({user.payout_account_name || user.full_name})
            </div>
            <div className="text-[11px] text-slate-600">
              Your bank account is NEVER shown to buyers on Checkout.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveSubaccount} className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-3">
            <div className="text-xs font-bold text-slate-900">
              Enter your Bank Account for Paystack Payouts
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={payoutBank}
                onChange={(e) => setPayoutBank(e.target.value)}
                className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
              >
                {AFRICAN_PAYOUT_BANKS.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="numeric"
                required
                minLength={8}
                maxLength={12}
                value={payoutAccNo}
                onChange={(e) => setPayoutAccNo(e.target.value.replace(/\D/g, ''))}
                placeholder="Account Number"
                className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-mono font-bold"
              />
              <input
                type="text"
                value={payoutAccName}
                onChange={(e) => setPayoutAccName(e.target.value)}
                placeholder="Account Name"
                className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={savingSubaccount}
              className="min-h-[42px] px-4 rounded-xl bg-green-700 text-white text-xs font-extrabold hover:bg-green-800 disabled:opacity-60"
            >
              {savingSubaccount ? 'Creating Paystack Subaccount...' : 'Save Paystack Payout Bank'}
            </button>
          </form>
        )}
      </div>

      {/* Profile Summary & Dual-Badge Manager */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
        <div className="flex items-center gap-4">
          <div className="relative w-18 h-18 rounded-full bg-green-100 border-2 border-green-700 overflow-hidden flex items-center justify-center shrink-0">
            {user.profile_pic ? (
              <img src={user.profile_pic} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-green-800" />
            )}
            <label
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center cursor-pointer border border-white shadow-sm"
              title="Change photo"
            >
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 truncate">{user.full_name}</h2>
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-extrabold text-amber-700 tabular-nums">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                Trust {(user.trust_score || 5.0).toFixed(1)} ({user.reviews_count || 0})
              </span>
            </div>
            <BadgeRow badges={user.badges} size="sm" />
            <p className="text-xs font-semibold text-green-800 truncate">{user.institution}</p>
            <p className="text-xs text-slate-500">
              Private Phone ID:{' '}
              <span className="font-mono font-semibold">
                {user.country_code || '+234'} {user.phone_number}
              </span>
            </p>
          </div>
        </div>

        {savedMsg && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-sm font-semibold text-green-800 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{savedMsg}</span>
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          {/* Up to 2 Badges Selector */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-slate-900">
                Your Verified Badges (Pick up to 2)
              </label>
              <span className="text-xs font-bold text-slate-500">{badges.length}/2 active</span>
            </div>
            <p className="text-xs text-slate-600">
              One user can hold 2 badges (e.g. Student + Service Provider).
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['student', 'Student', 'bg-blue-600'],
                  ['trader', 'Trader', 'bg-orange-500'],
                  ['service_provider', 'Service', 'bg-green-700'],
                ] as Array<[AccountBadge, string, string]>
              ).map(([b, label, activeBg]) => {
                const selected = badges.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBadge(b)}
                    className={`min-h-[44px] rounded-xl text-xs font-extrabold transition-colors border ${
                      selected
                        ? `${activeBg} text-white border-transparent`
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {selected ? `✓ ${label}` : `+ ${label}`}
                  </button>
                );
              })}
            </div>

            {badges.includes('trader') && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Shop Name"
                  className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                />
                <input
                  type="text"
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  placeholder="Market"
                  className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                />
              </div>
            )}

            {badges.includes('service_provider') && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold"
                >
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={100}
                  value={priceFrom}
                  onChange={(e) => setPriceFrom(e.target.value)}
                  placeholder="Price From ₦"
                  className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold tabular-nums"
                />
              </div>
            )}
          </div>

          {!isOwner && (
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Account Role (Switch anytime)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('buyer')}
                  className={`min-h-[48px] rounded-xl border-2 px-3 flex items-center justify-center gap-2 font-bold text-sm ${
                    role === 'buyer'
                      ? 'border-green-700 bg-green-50 text-green-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Buyer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  className={`min-h-[48px] rounded-xl border-2 px-3 flex items-center justify-center gap-2 font-bold text-sm ${
                    role === 'seller'
                      ? 'border-green-700 bg-green-50 text-green-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>Seller</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">Institution / Area</label>
            <select
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3 text-sm bg-white focus:border-green-700 focus:outline-none"
            >
              {!NIGERIAN_INSTITUTIONS.some((i) => i.name === institution) && institution && (
                <option value={institution}>{institution}</option>
              )}
              {NIGERIAN_INSTITUTIONS.map((inst) => (
                <option key={inst.name} value={inst.name}>
                  {inst.name}{inst.country ? ` — ${inst.country}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              Campus / Hostel / Location
            </label>
            <input
              type="text"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-base focus:border-green-700 focus:outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 min-h-[48px] rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Settings & Badges'}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="min-h-[48px] px-5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </form>
      </div>

      {/* Language & Country Settings (All languages per country shown visibly) */}
      <div className="rounded-2xl border border-green-300 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-700" />
            <h3 className="text-lg font-extrabold text-slate-900">
              {t('language_settings')}
            </h3>
          </div>
          <span className="text-xs font-extrabold text-green-800">
            {countryConfig.flag} {settingsCountry} · {settingsLanguage}
            {savingLang ? ' ...' : ''}
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {t('country_label')}
          </label>
          <select
            value={settingsCountry}
            onChange={(e) => {
              const cfg = getCountryConfig(e.target.value);
              const nextLang = cfg.languages[0] || 'English';
              handleLanguageSwitch(cfg.country, nextLang);
            }}
            className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 focus:border-green-700 focus:outline-none"
          >
            {COUNTRY_LANGUAGE_CONFIGS.map((cfg) => (
              <option key={cfg.country} value={cfg.country}>
                {cfg.flag} {cfg.country} ({cfg.currencySymbol})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-700 mb-1.5">
            {t('language_label')} ({activeSettingsCountryCfg.languages.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeSettingsCountryCfg.languages.map((lang) => {
              const active = settingsLanguage === lang && country === settingsCountry;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLanguageSwitch(settingsCountry, lang)}
                  className={`min-h-[36px] px-3 rounded-lg border text-xs font-bold transition-colors ${
                    active
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-slate-50 text-slate-800 border-slate-300 hover:border-green-700'
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Saved Wishlist + 1-Click Share to WhatsApp */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          <h3 className="text-lg font-extrabold text-slate-900">
            Saved Wishlist ({savedWishlistItems.length})
          </h3>
        </div>
        {savedWishlistItems.length === 0 ? (
          <p className="text-sm text-slate-500">Tap the heart icon on any item to save it here.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {savedWishlistItems.map((it) => (
              <div
                key={it.id}
                className="rounded-xl border border-slate-200 p-2.5 flex items-center gap-2.5 hover:border-green-700"
              >
                <button
                  type="button"
                  onClick={() => onViewItem(it)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                >
                  {(it.thumbnails?.[0] || it.photos?.[0]) && (
                    <img
                      src={it.thumbnails?.[0] || it.photos?.[0]}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 truncate">{it.title}</div>
                    <div className="text-xs font-extrabold text-green-800 tabular-nums">
                      {formatMoney(it.price, it.country)}
                    </div>
                  </div>
                </button>
                <a
                  href={buildWhatsAppShareUrl(it)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Share to WhatsApp"
                  className="min-h-[38px] px-2.5 rounded-lg bg-[#25D366] text-white text-xs font-extrabold inline-flex items-center gap-1 shrink-0 hover:opacity-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price Drop Alerts / "I Want This" */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-extrabold text-slate-900">
            Price Drop Alerts (&ldquo;I Want This&rdquo;)
          </h3>
        </div>
        <form onSubmit={handleCreateWantAlert} className="flex flex-wrap gap-2">
          <input
            type="text"
            required
            value={alertKeyword}
            onChange={(e) => setAlertKeyword(e.target.value)}
            placeholder="e.g. iPhone 11"
            className="flex-1 min-w-[140px] min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm"
          />
          <input
            type="number"
            min={500}
            required
            value={alertPrice}
            onChange={(e) => setAlertPrice(e.target.value)}
            placeholder={`Max ${countryConfig.currencySymbol} (e.g. 150000)`}
            className="w-40 min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm font-bold tabular-nums"
          />
          <button
            type="submit"
            disabled={alertSaving}
            className="min-h-[42px] px-4 rounded-xl bg-blue-600 text-white text-xs font-extrabold hover:bg-blue-700"
          >
            {alertSaving ? '...' : 'Set Alert'}
          </button>
        </form>
        {wantAlerts.length > 0 && (
          <div className="space-y-2 pt-1">
            {wantAlerts.map((al) => (
              <div
                key={al.id}
                className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-900">
                    I want &ldquo;{al.keyword}&rdquo; for &le; {formatMoney(al.max_price)}
                  </div>
                  {al.matches.length > 0 ? (
                    <div className="text-green-800 font-semibold mt-0.5">
                      {al.matches.length} match found: {al.matches[0].item_title} ({formatMoney(al.matches[0].item_price)})
                    </div>
                  ) : (
                    <div className="text-slate-500 mt-0.5">Watching new listings...</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteWantAlert(al.id)}
                  className="min-h-[34px] min-w-[34px] rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0"
                  aria-label="Delete alert"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Make Offer / Haggle Center */}
      {offers.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-extrabold text-slate-900">
              Make Offer / Haggle ({offers.length})
            </h3>
          </div>
          <div className="space-y-2.5">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-slate-900">
                      {offer.item_title || 'Marketplace Item'}
                    </span>{' '}
                    <span className="text-slate-600">
                      ({offer.is_seller ? `From ${offer.buyer_name}` : `Seller: ${offer.seller_name || 'Seller'}`})
                    </span>
                  </div>
                  <span className="rounded-md bg-orange-100 px-2 py-0.5 font-extrabold uppercase text-orange-800">
                    {offer.status}
                  </span>
                </div>
                <div className="font-bold text-green-800 tabular-nums">
                  Offer: {formatMoney(offer.offered_price)}
                  {offer.counter_price ? ` · Counter: ${formatMoney(offer.counter_price)}` : ''}
                </div>
                {offer.is_seller && offer.status === 'pending' && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOfferResponse(offer, 'accept')}
                      className="min-h-[34px] px-3 rounded-lg bg-green-700 text-white font-extrabold inline-flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOfferResponse(offer, 'reject')}
                      className="min-h-[34px] px-3 rounded-lg bg-red-600 text-white font-extrabold inline-flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <input
                      type="number"
                      min={100}
                      value={counterDraft[offer.id] ?? String(offer.offered_price)}
                      onChange={(e) =>
                        setCounterDraft((p) => ({ ...p, [offer.id]: e.target.value }))
                      }
                      className="w-24 min-h-[34px] rounded-lg border border-slate-300 bg-white px-2 font-bold tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => handleOfferResponse(offer, 'counter')}
                      className="min-h-[34px] px-2.5 rounded-lg bg-orange-500 text-white font-extrabold"
                    >
                      Counter {countryConfig.currencySymbol}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Bookings */}
      {bookings.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h3 className="text-lg font-extrabold text-slate-900">
            My Service Bookings
          </h3>
          {bookings.map((bk) => (
            <div
              key={bk.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div>
                <div className="font-bold text-slate-900">{bk.service_title}</div>
                <div className="text-slate-600">
                  {bk.provider_name} · {bk.scheduled_day} · {bk.location}
                </div>
              </div>
              <span className="font-extrabold text-green-800 tabular-nums">
                {formatMoney(bk.price)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* My Listings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="text-lg font-extrabold text-slate-900">My Posted Items ({myItems.length})</h3>
        {myItems.length === 0 ? (
          <p className="text-sm text-slate-500">You have not posted any items yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {myItems.map((it) => (
              <div key={it.id} className="py-3 flex items-center gap-3">
                {it.photos?.[0] && (
                  <img
                    src={it.photos[0]}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                )}
                <button
                  type="button"
                  onClick={() => onViewItem(it)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="text-sm font-bold text-slate-900 truncate">{it.title}</div>
                  <div className="text-sm font-extrabold text-green-800 tabular-nums">
                    {formatMoney(it.price, it.country)}
                  </div>
                  <div className="text-xs text-slate-500">{it.condition}</div>
                </button>
                {it.is_boosted ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2.5 py-1.5 text-[11px] font-bold text-orange-700 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Boosted
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBoostMyItem(it)}
                    disabled={boostingId === it.id}
                    className="min-h-[40px] px-3 rounded-xl bg-orange-500 text-white text-xs font-extrabold inline-flex items-center gap-1 hover:bg-orange-600 shrink-0"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>{boostingId === it.id ? '...' : 'Boost ₦500'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteMyItem(it.id)}
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-red-200 text-red-700 hover:bg-red-50 flex items-center justify-center shrink-0"
                  aria-label="Delete listing"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaystackFeeModal
        request={feeRequest}
        user={user}
        adSettings={adSettings}
        onClose={() => setFeeRequest(null)}
        onSuccess={async (reference) => {
          if (!feeRequest) return;
          setBoostingId(feeRequest.targetId);
          try {
            await api.boostItem(feeRequest.targetId, reference);
            setMyItems((prev) =>
              prev.map((it) => (it.id === feeRequest.targetId ? { ...it, is_boosted: true } : it))
            );
            setFeeRequest(null);
            onNotice('Item Boosted (₦500 via Paystack)! Now pinned near top of marketplace.');
          } finally {
            setBoostingId(null);
          }
        }}
      />
    </div>
  );
};
