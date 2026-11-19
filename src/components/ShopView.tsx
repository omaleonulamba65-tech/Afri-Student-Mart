import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Rocket,
  Sparkles,
  Star,
  Store,
} from 'lucide-react';
import { getCountryConfig, getCountryDisplayName } from '../data/languages';
import { ALL_MARKET_NAMES, MARKET_GROUPS } from '../data/markets';
import { api, compressImageFile } from '../lib/api';
import { useI18n } from '../lib/i18nContext';
import type { AdSettings, MarketplaceItem, PublicUser, TraderShop } from '../types';
import { VerifiedBadge } from './BadgePill';
import { PaystackFeeModal, PaystackFeeRequest } from './PaystackFeeModal';

function resolveShopCountry(shop: TraderShop) {
  const fromProd = shop.products?.[0]?.country;
  if (fromProd) return getCountryConfig(fromProd);
  const marketLower = (shop.market || '').toLowerCase();
  const group = MARKET_GROUPS.find((g) =>
    g.markets.some((m) => marketLower.includes(m.toLowerCase())) ||
    marketLower.includes(g.country.toLowerCase()) ||
    marketLower.includes(g.stateOrCity.toLowerCase())
  );
  return getCountryConfig(group?.country || 'Nigeria');
}

interface ShopViewProps {
  user: PublicUser | null;
  adSettings?: Partial<AdSettings> | null;
  onRequireAuth: () => void;
  onViewItem: (item: MarketplaceItem) => void;
  onContactShop: (shop: TraderShop) => void;
  onUserUpdated: (user: PublicUser) => void;
  onNotice: (msg: string) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  user,
  adSettings,
  onRequireAuth,
  onViewItem,
  onContactShop,
  onUserUpdated,
  onNotice,
}) => {
  const { formatMoney } = useI18n();
  const [shops, setShops] = useState<TraderShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  const [shopName, setShopName] = useState(user?.shop_name || '');
  const [market, setMarket] = useState(user?.market || user?.campus || '');
  const [shopPhoto, setShopPhoto] = useState('');
  const [savingShop, setSavingShop] = useState(false);
  const [featuring, setFeaturing] = useState(false);
  const [boostingId, setBoostingId] = useState<string | null>(null);
  const [feeRequest, setFeeRequest] = useState<PaystackFeeRequest | null>(null);
  const [errMsg, setErrMsg] = useState('');

  const loadShops = async () => {
    setLoading(true);
    try {
      const res = await api.getShops();
      setShops(res.shops);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (user) {
      setShopName(user.shop_name || `${user.full_name}'s Shop`);
      setMarket(user.market || user.campus);
    }
  }, [user?.id, user?.shop_name, user?.market]);

  const myShop = user ? shops.find((s) => s.owner_id === user.id) : undefined;
  const selectedShop = selectedShopId ? shops.find((s) => s.id === selectedShopId) : undefined;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onNotice('Compressing image...');
    try {
      const compressed = await compressImageFile(file, 800, 200 * 1024);
      setShopPhoto(compressed);
      onNotice('Shop photo compressed (<=200KB).');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Failed to compress photo.');
    }
    e.target.value = '';
  };

  const handleSaveMyShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setErrMsg('');
    setSavingShop(true);
    try {
      await api.updateMyShop({
        shop_name: shopName,
        market,
        shop_photo: shopPhoto || undefined,
      });
      const meRes = await api.getMe();
      onUserUpdated(meRes.user);
      await loadShops();
      onNotice('Your Trader Shop has been updated!');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Could not save shop.');
    } finally {
      setSavingShop(false);
    }
  };

  const handleBoostItem = (prod: MarketplaceItem) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setFeeRequest({
      feeType: 'boost_item',
      targetId: prod.id,
      title: `Boost Item: ${prod.title}`,
      amountNaira: 500,
      description: 'Pay ₦500 seller promotion fee via Paystack Inline JS to rank at the top.',
    });
  };

  const handleFeatureShop = () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setFeeRequest({
      feeType: 'feature_shop',
      targetId: myShop?.id || 'me',
      title: `Featured Trader Shop: ${myShop?.shop_name || shopName || user.full_name}`,
      amountNaira: 1000,
      description: 'Pay ₦1,000 via Paystack Inline JS to pin your Trader Shop as Featured.',
    });
  };

  const handlePaystackFeeComplete = async (reference: string) => {
    if (!feeRequest) return;
    if (feeRequest.feeType === 'boost_item') {
      setBoostingId(feeRequest.targetId);
      try {
        await api.boostItem(feeRequest.targetId, reference);
        await loadShops();
        setFeeRequest(null);
        onNotice('Item Boosted (₦500 via Paystack)! Now appearing at the top of search feeds.');
      } finally {
        setBoostingId(null);
      }
    } else if (feeRequest.feeType === 'feature_shop') {
      setFeaturing(true);
      try {
        await api.featureMyShop(reference);
        await loadShops();
        setFeeRequest(null);
        onNotice('Your shop is now a Featured Shop (paid via Paystack)!');
      } finally {
        setFeaturing(false);
      }
    }
  };

  const buildShopWhatsAppUrl = (shop: TraderShop) => {
    const digits = (shop.whatsapp_phone || '').replace(/[^\d]/g, '');
    const msg = `Hello ${shop.shop_name}! I saw your Verified Trader Shop on Afri Student Mart (${shop.market}).`;
    return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}` : '';
  };

  // Dedicated Trader Shop Page View (shop photo, all products, WhatsApp button)
  if (selectedShop) {
    const waUrl = buildShopWhatsAppUrl(selectedShop);
    const isOwnShop = Boolean(user && user.id === selectedShop.owner_id);
    const shopCountryCfg = resolveShopCountry(selectedShop);
    return (
      <div className="space-y-5 pb-8">
        <button
          type="button"
          onClick={() => setSelectedShopId(null)}
          className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white text-sm font-extrabold text-slate-800 inline-flex items-center gap-1.5 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Trader Shops</span>
        </button>

        {/* Full Shop Hero Banner */}
        <section className="rounded-3xl border border-orange-200 bg-white overflow-hidden shadow-sm">
          <div className="relative h-44 sm:h-56 bg-gradient-to-r from-orange-500 to-green-700">
            {selectedShop.shop_photo ? (
              <img
                src={selectedShop.shop_photo}
                alt={selectedShop.shop_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/80">
                <Store className="w-16 h-16" />
              </div>
            )}
            {selectedShop.is_featured && (
              <span className="absolute top-3 right-3 rounded-lg bg-orange-500 text-white px-3 py-1 text-xs font-extrabold shadow-sm">
                Featured Trader Shop
              </span>
            )}
          </div>

          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900">
                    {selectedShop.shop_name}
                  </h1>
                  <VerifiedBadge badge="trader" size="sm" />
                </div>
                <p className="text-sm text-slate-600 flex flex-wrap items-center gap-1.5">
                  <span>
                    Owner: <strong className="text-slate-900">{selectedShop.owner_name}</strong> ·
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                    <span className="text-xl leading-none" aria-hidden="true">
                      {shopCountryCfg.flag}
                    </span>
                    <span>
                      {getCountryDisplayName(shopCountryCfg.country)} · {selectedShop.market}
                    </span>
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-extrabold">
                <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-amber-700">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  {selectedShop.rating.toFixed(1)}
                  {selectedShop.reviews_count ? ` (${selectedShop.reviews_count})` : ''}
                </span>
                <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-slate-700 tabular-nums">
                  {selectedShop.products_count} products
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[48px] rounded-xl bg-[#25D366] text-white font-extrabold text-sm px-4 flex items-center justify-center gap-2 hover:opacity-95"
                >
                  <Phone className="w-4 h-4" />
                  <span>Chat Shop on WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => onContactShop(selectedShop)}
                className="min-h-[48px] rounded-xl bg-green-700 text-white font-extrabold text-sm px-4 flex items-center justify-center gap-2 hover:bg-green-800"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Message Inside App</span>
              </button>
            </div>
          </div>
        </section>

        {/* All Products in this Trader Shop */}
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-slate-900">
            All Shop Products ({selectedShop.products.length})
          </h2>
          {selectedShop.products.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No products posted in this shop yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {selectedShop.products.map((prod) => (
                <div
                  key={prod.id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => onViewItem(prod)}
                    className="text-left flex-1 flex flex-col"
                  >
                    <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                      {(prod.thumbnails?.[0] || prod.photos[0]) && (
                        <img
                          src={prod.thumbnails?.[0] || prod.photos[0]}
                          alt={prod.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-3 space-y-1 flex-1">
                      <div className="text-xs font-semibold text-slate-500">{prod.condition}</div>
                      <div className="text-sm font-bold text-slate-900 line-clamp-2">{prod.title}</div>
                      <div className="text-base font-extrabold text-green-800 tabular-nums">
                        {formatMoney(prod.price, prod.country)}
                      </div>
                    </div>
                  </button>
                  {isOwnShop && !prod.is_boosted && (
                    <div className="px-3 pb-3">
                      <button
                        type="button"
                        onClick={() => handleBoostItem(prod)}
                        disabled={boostingId === prod.id}
                        className="w-full min-h-[36px] rounded-xl bg-orange-500 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1"
                      >
                        <Rocket className="w-3.5 h-3.5" />
                        <span>{boostingId === prod.id ? '...' : 'Boost ₦500'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <PaystackFeeModal
          request={feeRequest}
          user={user}
          adSettings={adSettings}
          onClose={() => setFeeRequest(null)}
          onSuccess={handlePaystackFeeComplete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-r from-orange-500 via-orange-600 to-green-700 text-white p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-200">
              Verified Traders &amp; Campus Stores
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-0.5">My Shop &amp; Trader Stores</h1>
            <p className="text-sm text-orange-50 mt-1">
              Every Verified Trader gets a full Shop Page with shop photo, all products, and WhatsApp button.
            </p>
          </div>
          {!user && (
            <button
              type="button"
              onClick={onRequireAuth}
              className="min-h-[46px] px-5 rounded-xl bg-white text-orange-600 font-extrabold text-sm hover:bg-orange-50"
            >
              Open Your Shop Free
            </button>
          )}
        </div>
      </section>

      {errMsg && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-800">
          {errMsg}
        </div>
      )}

      {/* My Shop Management Section */}
      {user && (
        <section className="rounded-2xl border-2 border-orange-500 bg-white p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6 text-orange-500" />
              <h2 className="text-lg font-extrabold text-slate-900">
                {myShop ? 'My Trader Shop' : 'Set Up Your Trader Shop'}
              </h2>
              <VerifiedBadge badge="trader" size="sm" />
            </div>
            {myShop && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedShopId(myShop.id)}
                  className="min-h-[42px] px-4 rounded-xl bg-slate-900 text-white text-xs font-extrabold inline-flex items-center gap-1.5 hover:bg-slate-800"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View My Shop Page</span>
                </button>
                <button
                  type="button"
                  onClick={handleFeatureShop}
                  disabled={featuring || myShop.is_featured}
                  className={`min-h-[42px] px-4 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 ${
                    myShop.is_featured
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{myShop.is_featured ? 'Featured Shop Active' : 'Make Featured Shop'}</span>
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveMyShop} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Shop Name</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Chinedu Gadgets"
                className="w-full min-h-[46px] rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Market / Campus</label>
              <input
                type="text"
                required
                list="afri-markets-list-shop"
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                placeholder="e.g. Wuse Market, Computer Village Ikeja"
                className="w-full min-h-[46px] rounded-xl border border-slate-300 px-3 text-sm"
              />
              <datalist id="afri-markets-list-shop">
                {ALL_MARKET_NAMES.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div className="flex gap-2">
              <label className="min-h-[46px] px-3 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-100">
                <Camera className="w-4 h-4" />
                <span>{shopPhoto ? 'Photo Ready' : 'Shop Photo'}</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              <button
                type="submit"
                disabled={savingShop}
                className="flex-1 min-h-[46px] rounded-xl bg-green-700 text-white font-extrabold text-sm hover:bg-green-800"
              >
                {savingShop ? 'Saving...' : 'Save Shop'}
              </button>
            </div>
          </form>

          {myShop && myShop.products.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-xs font-extrabold uppercase text-slate-600">
                Your Shop Products ({myShop.products.length}) — Boost to Top for ₦500
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {myShop.products.map((prod) => (
                  <div
                    key={prod.id}
                    className="rounded-xl border border-slate-200 p-3 flex items-center gap-3 bg-slate-50"
                  >
                    {(prod.thumbnails?.[0] || prod.photos[0]) && (
                      <img
                        src={prod.thumbnails?.[0] || prod.photos[0]}
                        alt={prod.title}
                        loading="lazy"
                        decoding="async"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => onViewItem(prod)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="text-sm font-bold text-slate-900 truncate">{prod.title}</div>
                      <div className="text-xs font-extrabold text-green-800 tabular-nums">
                        {formatMoney(prod.price, prod.country)}
                      </div>
                    </button>
                    {prod.is_boosted ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2.5 py-1.5 text-[11px] font-extrabold text-orange-700 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Boosted
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBoostItem(prod)}
                        disabled={boostingId === prod.id}
                        className="min-h-[38px] px-3 rounded-lg bg-orange-500 text-white text-xs font-extrabold inline-flex items-center gap-1 hover:bg-orange-600 shrink-0"
                      >
                        <Rocket className="w-3.5 h-3.5" />
                        <span>{boostingId === prod.id ? '...' : 'Boost ₦500'}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* All Verified Trader Shops Directory */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Verified Trader Shops</h2>
          <span className="text-xs font-bold text-slate-500 tabular-nums">
            {shops.length} shop{shops.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-52 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : shops.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-2">
            <Store className="w-9 h-9 mx-auto text-orange-400" />
            <p className="text-base font-bold text-slate-900">No Trader Shops opened yet</p>
            <p className="text-sm text-slate-500">
              Sign up as a Trader or save your shop details above to appear here!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shops.map((shop) => (
              <article
                key={shop.id}
                className={`rounded-2xl border bg-white p-4 space-y-4 shadow-xs ${
                  shop.is_featured ? 'border-orange-500 ring-1 ring-orange-200' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 overflow-hidden flex items-center justify-center shrink-0">
                    {shop.shop_photo ? (
                      <img
                        src={shop.shop_photo}
                        alt={shop.shop_name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="w-7 h-7 text-orange-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-extrabold text-slate-900 truncate">
                        {shop.shop_name}
                      </h3>
                      {shop.is_featured && (
                        <span className="rounded bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shrink-0">
                          Featured Shop
                        </span>
                      )}
                    </div>
                    <VerifiedBadge badge="trader" size="xs" />
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-0.5">
                      <span className="inline-flex items-center gap-0.5 font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        {shop.rating.toFixed(1)}
                      </span>
                      <span className="tabular-nums font-semibold">{shop.sales_count} sales</span>
                      <span className="inline-flex items-center gap-1.5 truncate font-semibold text-slate-800">
                        <span className="text-lg leading-none shrink-0" aria-hidden="true">
                          {resolveShopCountry(shop).flag}
                        </span>
                        <span className="truncate">
                          {getCountryDisplayName(resolveShopCountry(shop).country)} · {shop.market}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shop Products List */}
                {shop.products.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {shop.products.slice(0, 3).map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => onViewItem(prod)}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-1.5 text-left hover:border-green-700"
                      >
                        <div className="aspect-square rounded-lg bg-white overflow-hidden">
                          {(prod.thumbnails?.[0] || prod.photos[0]) && (
                            <img
                              src={prod.thumbnails?.[0] || prod.photos[0]}
                              alt={prod.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-900 truncate">
                          {prod.title}
                        </div>
                        <div className="text-[11px] font-extrabold text-green-800 tabular-nums">
                          {formatMoney(prod.price, prod.country)}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    No products uploaded to this shop yet.
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedShopId(shop.id)}
                    className="min-h-[40px] px-3 rounded-xl border border-slate-300 bg-slate-50 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                  >
                    Visit Shop ({shop.products_count})
                  </button>
                  <div className="flex items-center gap-1.5">
                    {buildShopWhatsAppUrl(shop) && (
                      <a
                        href={buildShopWhatsAppUrl(shop)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] px-3 rounded-xl bg-[#25D366] text-white text-xs font-extrabold inline-flex items-center gap-1 hover:opacity-95"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onContactShop(shop)}
                      className="min-h-[40px] px-3 rounded-xl bg-green-700 text-white text-xs font-extrabold inline-flex items-center gap-1 hover:bg-green-800"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <PaystackFeeModal
        request={feeRequest}
        user={user}
        adSettings={adSettings}
        onClose={() => setFeeRequest(null)}
        onSuccess={handlePaystackFeeComplete}
      />
    </div>
  );
};
