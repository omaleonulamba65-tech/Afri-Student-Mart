import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Globe2,
  MapPin,
  Search,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { MARKET_GROUPS, MarketLocationGroup, MarketRegion } from '../data/markets';
import {
  COUNTRY_LANGUAGE_CONFIGS,
  getCountryConfig,
  getCountryDisplayName,
} from '../data/languages';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18nContext';
import type { MarketplaceItem, TraderShop } from '../types';
import { ItemCard } from './ItemCard';

interface MarketsViewProps {
  wishlistIds: string[];
  lowDataMode: boolean;
  onToggleWishlist: (item: MarketplaceItem) => void;
  onViewDetails: (item: MarketplaceItem) => void;
  onBuyNow: (item: MarketplaceItem) => void;
  onAddToCart?: (item: MarketplaceItem) => void;
  onChat: (item: MarketplaceItem) => void;
  onReport: (item: MarketplaceItem) => void;
  onShowQr?: (item: MarketplaceItem) => void;
  onPostItem: () => void;
  onOpenShops: () => void;
}

export const MarketsView: React.FC<MarketsViewProps> = ({
  wishlistIds,
  lowDataMode,
  onToggleWishlist,
  onViewDetails,
  onBuyNow,
  onAddToCart,
  onChat,
  onReport,
  onShowQr,
  onPostItem,
  onOpenShops,
}) => {
  const { country, setCountryOnly, t } = useI18n();
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<'All' | MarketRegion>('All');
  const [stateFilter, setStateFilter] = useState<string>('All');
  const [countryFilter, setCountryFilter] = useState<string>(country);

  useEffect(() => {
    setCountryFilter(country);
    setStateFilter('All');
    setRegionFilter('All');
  }, [country]);

  const [selectedMarket, setSelectedMarket] = useState<{
    name: string;
    stateOrCity: string;
    country: string;
  } | null>(null);

  const [marketItems, setMarketItems] = useState<MarketplaceItem[]>([]);
  const [marketShops, setMarketShops] = useState<TraderShop[]>([]);
  const [loadingMarket, setLoadingMarket] = useState(false);

  const matchesCountry = (groupCountry: string, filterCountry: string) => {
    if (!filterCountry || filterCountry === 'All') return true;
    const gc = groupCountry.toLowerCase();
    const fc = filterCountry.toLowerCase();
    return gc === fc || gc.includes(fc) || fc.includes(gc);
  };

  const availableStates = useMemo(() => {
    const groups = MARKET_GROUPS.filter((g) => {
      if (countryFilter !== 'All' && !matchesCountry(g.country, countryFilter)) return false;
      if (regionFilter !== 'All' && g.region !== regionFilter) return false;
      return true;
    });
    return groups.map((g) => g.stateOrCity);
  }, [countryFilter, regionFilter]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out: MarketLocationGroup[] = [];
    for (const g of MARKET_GROUPS) {
      if (countryFilter !== 'All' && !matchesCountry(g.country, countryFilter)) continue;
      if (regionFilter !== 'All' && g.region !== regionFilter) continue;
      if (stateFilter !== 'All' && g.stateOrCity !== stateFilter) continue;

      if (!q) {
        out.push(g);
        continue;
      }

      const stateMatches =
        g.stateOrCity.toLowerCase().includes(q) || g.country.toLowerCase().includes(q);
      const matchingMarkets = stateMatches
        ? g.markets
        : g.markets.filter((m) => m.toLowerCase().includes(q));

      if (matchingMarkets.length > 0) {
        out.push({
          ...g,
          markets: matchingMarkets,
        });
      }
    }
    return out;
  }, [search, countryFilter, regionFilter, stateFilter]);

  const totalShownMarkets = useMemo(
    () => filteredGroups.reduce((acc, g) => acc + g.markets.length, 0),
    [filteredGroups]
  );

  useEffect(() => {
    if (!selectedMarket) return;
    let cancelled = false;
    setLoadingMarket(true);
    const mLower = selectedMarket.name.toLowerCase();
    const core = mLower.replace(/\s+market$/i, '').trim();

    Promise.all([
      api.getItems({ market: selectedMarket.name, country: selectedMarket.country, lite: true }),
      api.getShops().catch(() => ({ shops: [] as TraderShop[] })),
    ])
      .then(([itemsRes, shopsRes]) => {
        if (cancelled) return;
        setMarketItems(itemsRes.items);
        setMarketShops(
          shopsRes.shops.filter((s) => {
            const m = (s.market || '').toLowerCase();
            return m.includes(mLower) || (core.length >= 4 && m.includes(core));
          })
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMarketItems([]);
          setMarketShops([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMarket(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMarket]);

  // === SELECTED MARKET PRODUCTS VIEW ===
  if (selectedMarket) {
    return (
      <div className="space-y-5 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSelectedMarket(null)}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-extrabold text-slate-800 inline-flex items-center gap-1.5 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Markets</span>
          </button>

          <button
            type="button"
            onClick={onPostItem}
            className="min-h-[44px] px-4 rounded-xl bg-green-700 text-white text-xs sm:text-sm font-extrabold hover:bg-green-800"
          >
            Sell in This Market
          </button>
        </div>

        <section className="rounded-3xl bg-gradient-to-br from-green-800 to-green-900 text-white p-5 sm:p-7 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 text-green-950 px-2.5 py-1 text-xs font-extrabold">
            <span className="text-lg leading-none" aria-hidden="true">
              {getCountryConfig(selectedMarket.country).flag}
            </span>
            <span>
              {selectedMarket.stateOrCity} · {getCountryDisplayName(selectedMarket.country)}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">{selectedMarket.name}</h1>
          <p className="text-sm text-green-100">
            Showing verified sellers &amp; products available in {selectedMarket.name}. All purchases are protected by Paystack Escrow.
          </p>
        </section>

        {/* Verified Trader Shops in this market */}
        {marketShops.length > 0 && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                Trader Shops in {selectedMarket.name} ({marketShops.length})
              </h2>
              <button
                type="button"
                onClick={onOpenShops}
                className="text-xs font-extrabold text-green-800 hover:underline"
              >
                Open Trader Stores
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {marketShops.map((shop) => (
                <button
                  key={shop.id}
                  type="button"
                  onClick={onOpenShops}
                  className="rounded-2xl border border-green-200 bg-green-50/50 p-3.5 text-left flex items-center gap-3 hover:border-green-700"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-green-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {shop.shop_photo ? (
                      <img
                        src={shop.shop_photo}
                        alt={shop.shop_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="w-6 h-6 text-green-700" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold text-slate-900 truncate">
                      {shop.shop_name}
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      {shop.owner_name} · {shop.products_count} product
                      {shop.products_count === 1 ? '' : 's'}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-green-700 shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Products from Sellers in This Market */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-lg font-extrabold text-slate-900">
              Products in {selectedMarket.name}
            </h2>
            <span className="text-xs font-bold text-slate-500 tabular-nums">
              {marketItems.length} item{marketItems.length === 1 ? '' : 's'}
            </span>
          </div>

          {loadingMarket ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-64 rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : marketItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-50 text-green-700 flex items-center justify-center">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                No products listed in {selectedMarket.name} yet
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Are you a seller or trader at {selectedMarket.name}? Post your products for free so students &amp; buyers in {selectedMarket.stateOrCity} can buy safely with Paystack!
              </p>
              <button
                type="button"
                onClick={onPostItem}
                className="min-h-[46px] px-6 rounded-xl bg-green-700 text-white font-extrabold text-sm hover:bg-green-800"
              >
                Post Product in {selectedMarket.name}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  wishlisted={wishlistIds.includes(item.id)}
                  lowDataMode={lowDataMode}
                  onToggleWishlist={onToggleWishlist}
                  onViewDetails={onViewDetails}
                  onBuyNow={onBuyNow}
                  onAddToCart={onAddToCart}
                  onChat={onChat}
                  onReport={onReport}
                  onShowQr={onShowQr}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // === MARKETS DIRECTORY BY STATE / COUNTRY ===
  return (
    <div className="space-y-5 pb-8">
      {/* Header & Search */}
      <section className="rounded-3xl bg-gradient-to-br from-green-800 via-green-700 to-green-900 text-white p-5 sm:p-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-300 inline-flex items-center gap-1.5">
              {countryFilter === 'All' ? (
                <>
                  <span className="text-base leading-none" aria-hidden="true">🌍</span>
                  <span>{t('all_countries')}</span>
                </>
              ) : (
                <>
                  <span className="text-lg leading-none" aria-hidden="true">
                    {getCountryConfig(countryFilter).flag}
                  </span>
                  <span>{getCountryDisplayName(countryFilter)}</span>
                </>
              )}{' '}
              · West &amp; South Africa
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-0.5">{t('markets_directory')}</h1>
            <p className="text-sm text-green-50 mt-1">{t('markets_sub')}</p>
          </div>
          <span className="rounded-xl bg-yellow-400 text-green-950 px-3.5 py-2 text-xs font-extrabold tabular-nums">
            {totalShownMarkets} Markets
          </span>
        </div>

        {/* Search Markets by Market Name, State, or Country */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            (document.activeElement as HTMLElement | null)?.blur?.();
          }}
          className="relative"
        >
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            enterKeyHint="search"
            aria-label={t('search_markets_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_markets_placeholder')}
            className="w-full min-h-[50px] rounded-2xl bg-white text-slate-900 pl-12 pr-4 text-base font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </form>
      </section>

      {/* Country + Region Tabs + State Filter */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(['All', 'Nigeria', 'West Africa', 'South Africa'] as const).map((reg) => (
            <button
              key={reg}
              type="button"
              onClick={() => {
                setRegionFilter(reg);
                if (reg === 'Nigeria' || reg === 'South Africa') {
                  setCountryFilter(reg);
                  setCountryOnly(reg);
                } else {
                  setCountryFilter('All');
                }
                setStateFilter('All');
              }}
              className={`min-h-[40px] px-4 rounded-xl text-xs sm:text-sm font-extrabold border inline-flex items-center gap-1.5 ${
                regionFilter === reg && (countryFilter === 'All' || countryFilter === reg)
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-slate-800 border-slate-300 hover:border-green-700'
              }`}
            >
              {reg === 'Nigeria' ? (
                <span className="text-lg leading-none" aria-hidden="true">🇳🇬</span>
              ) : reg === 'South Africa' ? (
                <span className="text-lg leading-none" aria-hidden="true">🇿🇦</span>
              ) : (
                <Globe2 className="w-4 h-4" />
              )}
              <span>{reg === 'All' ? t('all_countries') : reg}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              {t('country_label')}
            </label>
            <select
              value={countryFilter}
              onChange={(e) => {
                const next = e.target.value;
                setCountryFilter(next);
                setCountryOnly(next);
                setRegionFilter('All');
                setStateFilter('All');
              }}
              className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 focus:border-green-700 focus:outline-none"
            >
              <option value="All">🌍 {t('all_countries')}</option>
              {COUNTRY_LANGUAGE_CONFIGS.map((c) => (
                <option key={c.country} value={c.country}>
                  {c.flag} {getCountryDisplayName(c.country)} ({c.dialCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Filter by State / City
            </label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-green-700 focus:outline-none"
            >
              <option value="All">All States &amp; Cities ({availableStates.length})</option>
              {availableStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Grouped Markets by State / Country */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-2">
          <MapPin className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-base font-extrabold text-slate-900">No matching market found</p>
          <p className="text-sm text-slate-500">
            Try clearing your search or switching to {t('all_countries')}.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCountryFilter('All');
              setRegionFilter('All');
              setStateFilter('All');
            }}
            className="min-h-[42px] px-4 rounded-xl bg-green-700 text-white text-xs font-extrabold"
          >
            {t('all_countries')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <section
              key={group.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0 text-xl leading-none" aria-hidden="true">
                    {getCountryConfig(group.country).flag}
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                      {group.stateOrCity}
                      {group.stateOrCity.toLowerCase() !== group.country.toLowerCase()
                        ? ` (${getCountryDisplayName(group.country)})`
                        : ''}
                    </h2>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      {group.region} · {group.markets.length} market
                      {group.markets.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {group.markets.map((marketName) => (
                  <button
                    key={`${group.id}-${marketName}`}
                    type="button"
                    onClick={() =>
                      setSelectedMarket({
                        name: marketName,
                        stateOrCity: group.stateOrCity,
                        country: group.country,
                      })
                    }
                    className="min-h-[52px] rounded-xl border border-green-200 bg-green-50/40 px-3.5 py-2.5 text-left flex items-center justify-between gap-2 hover:border-green-700 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Store className="w-4 h-4 text-green-700 shrink-0" />
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {marketName}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-green-700 shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
