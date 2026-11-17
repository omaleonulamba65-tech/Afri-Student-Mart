import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing,
  BookOpen,
  CheckCircle2,
  Cpu,
  FileText,
  Flame,
  Footprints,
  Globe2,
  Search,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  Store,
  Timer,
  Utensils,
  Wifi,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react';
import { AdSlot } from './components/AdSlot';
import { BottomNav, NavTab } from './components/BottomNav';
import { ItemCard } from './components/ItemCard';
import { LanguagePickerModal } from './components/LanguagePickerModal';
import { BrandLogo } from './components/Logo';
import heroCampusMarketImg from './assets/images/hero_campus_market_1794758659851.jpg';
import { getInstitutionsByCountry } from './data/institutions';
import { COUNTRY_LANGUAGE_CONFIGS } from './data/languages';
import {
  api,
  getCachedItems,
  getLowDataMode,
  getStoredToken,
  setCachedItems,
  setLowDataMode as persistLowDataMode,
  setStoredToken,
} from './lib/api';
import { useI18n } from './lib/i18nContext';
import {
  AdSettings,
  HOME_QUICK_CATEGORIES,
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  ItemFilterMode,
  MarketplaceItem,
  PolicyPageId,
  PublicUser,
  ServiceProvider,
  TraderShop,
  WantAlertMatch,
} from './types';

// Code-split secondary views & modals so Home loads in <2 seconds even on 3G Android phones
const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const CheckoutModal = lazy(() =>
  import('./components/CheckoutModal').then((m) => ({ default: m.CheckoutModal }))
);
const ItemDetailModal = lazy(() =>
  import('./components/ItemDetailModal').then((m) => ({ default: m.ItemDetailModal }))
);
const MartAIWidget = lazy(() =>
  import('./components/MartAIWidget').then((m) => ({ default: m.MartAIWidget }))
);
const MarketsView = lazy(() =>
  import('./components/MarketsView').then((m) => ({ default: m.MarketsView }))
);
const MessagesView = lazy(() =>
  import('./components/MessagesView').then((m) => ({ default: m.MessagesView }))
);
const OwnerDashboardView = lazy(() =>
  import('./components/OwnerDashboardView').then((m) => ({ default: m.OwnerDashboardView }))
);
const PolicyModal = lazy(() =>
  import('./components/PolicyModal').then((m) => ({ default: m.PolicyModal }))
);
const ProfileView = lazy(() =>
  import('./components/ProfileView').then((m) => ({ default: m.ProfileView }))
);
const SellItemView = lazy(() =>
  import('./components/SellItemView').then((m) => ({ default: m.SellItemView }))
);
const ServiceProfileModal = lazy(() =>
  import('./components/ServiceProfileModal').then((m) => ({ default: m.ServiceProfileModal }))
);
const ServicesView = lazy(() =>
  import('./components/ServicesView').then((m) => ({ default: m.ServicesView }))
);
const ShopView = lazy(() =>
  import('./components/ShopView').then((m) => ({ default: m.ShopView }))
);

const QUICK_CAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Shoes: Footprints,
  Clothes: Shirt,
  Phones: Smartphone,
  Food: Utensils,
  Books: BookOpen,
  Electronics: Cpu,
  Foodstuff: Utensils,
  Fashion: Sparkles,
  'Hostel Items': Sofa,
  'Phones & Accessories': Smartphone,
  'Fashion / Clothes / Shoes': Shirt,
  'Food & Groceries': Utensils,
  'Hostel Items / Furniture': Sofa,
  __SERVICES__: Wrench,
};

function matchesSmartCategory(itemCategory: string, selectedCategory: string): boolean {
  if (selectedCategory === 'All') return true;
  if (itemCategory === selectedCategory) return true;
  const cat = itemCategory.toLowerCase();
  if (selectedCategory === 'Shoes') return cat.includes('shoe') || cat.includes('fashion');
  if (selectedCategory === 'Clothes') return cat.includes('cloth') || cat.includes('fashion');
  if (selectedCategory === 'Fashion')
    return cat.includes('fashion') || cat.includes('shoe') || cat.includes('cloth');
  if (selectedCategory === 'Phones') return cat.includes('phone') || cat.includes('electronic');
  if (selectedCategory === 'Electronics')
    return cat.includes('electronic') || cat.includes('phone') || cat.includes('laptop');
  if (selectedCategory === 'Food') return cat.includes('food');
  if (selectedCategory === 'Foodstuff') return cat.includes('food');
  if (selectedCategory === 'Books') return cat.includes('book');
  if (selectedCategory === 'Hostel Items') return cat.includes('hostel');
  return false;
}

function getSecondsUntilNoon(): number {
  const now = new Date();
  const noon = new Date(now);
  noon.setHours(12, 0, 0, 0);
  if (now.getTime() >= noon.getTime()) {
    noon.setDate(noon.getDate() + 1);
  }
  return Math.max(0, Math.floor((noon.getTime() - now.getTime()) / 1000));
}

function formatCountdown(totalSecs: number): string {
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

const TabFallback = () => (
  <div className="py-12 text-center text-sm font-semibold text-slate-500">Loading...</div>
);

export default function App() {
  const {
    country,
    language,
    countryConfig,
    hasChosenLanguage,
    setCountryAndLanguage,
    setCountryOnly,
    t,
    translateCategory,
    formatMoney,
  } = useI18n();

  const initialCache = useMemo(() => getCachedItems(), []);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [showOwnerDashboard, setShowOwnerDashboard] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);

  // Instant stale-while-revalidate feed + 10-per-page pagination
  const [items, setItems] = useState<MarketplaceItem[]>(initialCache);
  const [hotDealItems, setHotDealItems] = useState<MarketplaceItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(initialCache.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(initialCache.length > 0);
  const [page, setPage] = useState(1);
  const [totalItemsCount, setTotalItemsCount] = useState(initialCache.length);
  const [hasMore, setHasMore] = useState(false);

  // Low Data / Offline Mode toggle
  const [lowDataMode, setLowDataMode] = useState<boolean>(() => getLowDataMode());

  // Wishlist state
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  // Hot Deals Countdown Timer (resets daily 12pm noon)
  const [countdownSecs, setCountdownSecs] = useState<number>(getSecondsUntilNoon);

  // Filters + Near Me / School / Market pill mode
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCondition, setSelectedCondition] = useState<string>('All');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('All');
  const [filterMode, setFilterMode] = useState<ItemFilterMode>('all');

  const homeInstitutions = useMemo(() => getInstitutionsByCountry(country), [country]);

  // Reset selectedInstitution to 'All' if user switches to a country where that school doesn't belong
  useEffect(() => {
    if (
      selectedInstitution !== 'All' &&
      !homeInstitutions.some((i) => i.name === selectedInstitution)
    ) {
      setSelectedInstitution('All');
    }
  }, [country, homeInstitutions, selectedInstitution]);

  // Quick "I Want This / Price Drop Alert" inputs on Home
  const [wantKeyword, setWantKeyword] = useState('');
  const [wantMaxPrice, setWantMaxPrice] = useState('');
  const [savingWantAlert, setSavingWantAlert] = useState(false);

  // Modals & notifications
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [detailItem, setDetailItem] = useState<MarketplaceItem | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<MarketplaceItem | null>(null);
  const [activeServiceProfile, setActiveServiceProfile] = useState<ServiceProvider | null>(null);
  const [activePolicy, setActivePolicy] = useState<PolicyPageId | null>(null);
  const [activeChatTarget, setActiveChatTarget] = useState<{ itemId: string; partnerId?: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const [adSettings, setAdSettings] = useState<AdSettings>({
    ads_enabled: false,
    interstitial_enabled: false,
    publisher_id: '',
    banner_unit_id: '',
    feed_unit_id: '',
    interstitial_unit_id: '',
    sidebar_unit_id: '',
    google_ads_earnings: 0,
    paystack_public_key: '',
    paystack_split_code: '',
    admin_subaccount_code: '',
  });

  const [toast, setToast] = useState('');

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const toggleLowData = () => {
    setLowDataMode((prev) => {
      const next = !prev;
      persistLowDataMode(next);
      showToast(
        next
          ? 'Low Data Mode ON: small thumbnails only, ads & heavy media paused.'
          : 'Low Data Mode OFF: normal quality restored.'
      );
      return next;
    });
  };

  // Debounce search input (220ms) so typing never lags on low-end phones
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 220);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch paginated lite items (10 products per page with 200px thumbnails only)
  const fetchItemsPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else if (items.length === 0) {
        setLoadingItems(true);
      }
      try {
        const res = await api.getItems({
          page: targetPage,
          limit: 10,
          lite: true,
          country: country === 'All' ? undefined : country,
          search: debouncedSearch || undefined,
          category: selectedCategory,
          condition: selectedCondition,
          institution: selectedInstitution,
          filterMode,
          myInstitution:
            user?.institution || (selectedInstitution !== 'All' ? selectedInstitution : undefined),
        });
        const incomingItems = Array.isArray(res?.items) ? res.items : [];
        setPage(res?.page || targetPage);
        setTotalItemsCount(typeof res?.total === 'number' ? res.total : incomingItems.length);
        setHasMore(Boolean(res?.has_more));
        setItems((prev) => {
          const safePrev = Array.isArray(prev) ? prev : [];
          const next = append
            ? [
                ...safePrev,
                ...incomingItems.filter((it) => !safePrev.some((existing) => existing.id === it.id)),
              ]
            : incomingItems;
          if (
            !append &&
            !debouncedSearch &&
            selectedCategory === 'All' &&
            selectedCondition === 'All' &&
            selectedInstitution === 'All' &&
            filterMode === 'all' &&
            country === 'Nigeria'
          ) {
            setCachedItems(next);
          }
          return next;
        });
      } catch {
        // Offline / network error: keep cached items visible
      } finally {
        setLoadingItems(false);
        setLoadingMore(false);
        setProductsLoaded(true);
      }
    },
    [
      country,
      debouncedSearch,
      selectedCategory,
      selectedCondition,
      selectedInstitution,
      filterMode,
      user?.institution,
    ]
  );

  const fetchHotDeals = useCallback(() => {
    api
      .getItems({
        limit: 10,
        sort: 'cheapest',
        lite: true,
        country: country === 'All' ? undefined : country,
      })
      .then((res) => setHotDealItems(Array.isArray(res?.items) ? res.items : []))
      .catch(() => {});
  }, [country]);

  const refreshUnread = async () => {
    try {
      const res = await api.getThreads();
      const threads = Array.isArray(res?.threads) ? res.threads : [];
      const total = threads.reduce((acc, t) => acc + (t.unread_count || 0), 0);
      setUnreadCount(total);
    } catch {
      // Ignore
    }
  };

  const fetchWishlist = async () => {
    try {
      const res = await api.getWishlist();
      setWishlistIds(Array.isArray(res?.item_ids) ? res.item_ids : []);
    } catch {
      // Ignore
    }
  };

  // Boot: restore session, fetch wishlist, load Top 10 Cheap Hot Deals & defer ad settings
  useEffect(() => {
    fetchHotDeals();
    const token = getStoredToken();
    if (token) {
      api
        .getMe()
        .then((res) => {
          if (res?.user) {
            setUser(res.user);
            refreshUnread();
            fetchWishlist();
          } else {
            setStoredToken(null);
          }
        })
        .catch(() => {
          setStoredToken(null);
        });
    }
    const adTimer = setTimeout(() => {
      api
        .getAdSettings()
        .then((res) => {
          if (res?.settings) setAdSettings(res.settings);
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(adTimer);
  }, [fetchHotDeals]);

  // Re-fetch page 1 whenever filters/debounced search change
  useEffect(() => {
    fetchItemsPage(1, false);
  }, [fetchItemsPage]);

  // Live Hot Deals Countdown Timer (resets daily 12pm noon; refreshes deals when noon hits)
  useEffect(() => {
    const timer = setInterval(() => {
      const secs = getSecondsUntilNoon();
      setCountdownSecs(secs);
      if (secs <= 1) {
        fetchHotDeals();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchHotDeals]);

  // Real-time SSE notification stream for logged-in user (messages + Price Drop Alerts)
  useEffect(() => {
    const token = getStoredToken();
    if (!user || !token) return;
    const es = new EventSource(`/api/messages/stream?token=${encodeURIComponent(token)}`);
    es.addEventListener('new_message', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          sender_name: string;
          message: string;
        };
        showToast(`New message from ${data.sender_name}: "${data.message.slice(0, 45)}"`);
        refreshUnread();
      } catch {
        // Ignore parse errors
      }
    });
    es.addEventListener('want_alert_match', (ev) => {
      try {
        const match = JSON.parse((ev as MessageEvent).data) as WantAlertMatch;
        showToast(
          `PRICE ALERT MATCH! "${match.item_title}" just posted for ${formatMoney(match.item_price)}!`
        );
        fetchItemsPage(1, false);
        fetchHotDeals();
      } catch {
        // Ignore
      }
    });
    return () => {
      es.close();
    };
  }, [user?.id, fetchItemsPage, fetchHotDeals, formatMoney]);

  // Client-side instant filter over currently loaded/cached items (0ms responsiveness offline or typing)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!matchesSmartCategory(item.category, selectedCategory)) return false;
      if (selectedCondition !== 'All' && item.condition !== selectedCondition) return false;
      if (selectedInstitution !== 'All' && item.institution !== selectedInstitution) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.institution.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.seller_shop_name || '').toLowerCase().includes(q) ||
          String(item.price).includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [items, selectedCategory, selectedCondition, selectedInstitution, search]);

  const userHomeSchool =
    user?.institution || (selectedInstitution !== 'All' ? selectedInstitution : '');

  // Ordered feed: own institution first, then other schools
  const orderedFeed = useMemo(() => {
    if (!userHomeSchool) return filteredItems;
    const mine = filteredItems.filter((i) => i.institution === userHomeSchool);
    const others = filteredItems.filter((i) => i.institution !== userHomeSchool);
    return [...mine, ...others];
  }, [filteredItems, userHomeSchool]);

  // Infinite scroll: automatically load next 10 products when scrolling to bottom
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore || loadingMore || activeTab !== 'home') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore && hasMore) {
          fetchItemsPage(page + 1, true);
        }
      },
      { rootMargin: '250px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, page, activeTab, fetchItemsPage]);

  // Hot Deals: Top 10 cheap items (resets daily 12pm noon)
  const hotDeals = useMemo(() => {
    if (hotDealItems.length > 0) return hotDealItems.slice(0, 10);
    return [...items].sort((a, b) => a.price - b.price).slice(0, 10);
  }, [hotDealItems, items]);

  // Featured Products on Home
  const featuredProducts = useMemo(() => {
    const featured = items.filter((i) => i.is_featured || i.is_boosted);
    return (featured.length > 0 ? featured : items).slice(0, 6);
  }, [items]);

  const handleBuyNow = (item: MarketplaceItem) => {
    if (!user) {
      setAuthMode('login');
      setAuthModalOpen(true);
      showToast('Please login or create a free account to pay safely via Paystack.');
      return;
    }
    if (item.seller_id === user.id) {
      showToast('You cannot buy your own item.');
      return;
    }
    setDetailItem(null);
    setCheckoutItem(item);
  };

  const handleToggleWishlist = async (item: MarketplaceItem) => {
    if (!user) {
      setAuthMode('login');
      setAuthModalOpen(true);
      showToast('Sign in to save items to your Wishlist.');
      return;
    }
    try {
      const res = await api.toggleWishlist(item.id);
      setWishlistIds(res.item_ids);
      const saved = res.item_ids.includes(item.id);
      showToast(saved ? 'Saved to your Wishlist!' : 'Removed from Wishlist.');
    } catch {
      showToast('Could not update wishlist.');
    }
  };

  const handleOpenChat = async (item: MarketplaceItem, prefillMessage?: string) => {
    if (!user) {
      setAuthMode('login');
      setAuthModalOpen(true);
      showToast('Please login or create a free account to chat with the seller.');
      return;
    }
    if (item.seller_id === user.id) {
      setDetailItem(null);
      setActiveTab('chat');
      setActiveChatTarget(null);
      showToast('Viewing your incoming buyer messages.');
      return;
    }
    if (prefillMessage) {
      try {
        await api.sendMessage({ item_id: item.id, message: prefillMessage });
        showToast('Sent directly to seller chat!');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Could not send offer.');
      }
    }
    setDetailItem(null);
    setActiveChatTarget({ itemId: item.id });
    setActiveTab('chat');
  };

  const handleChatService = (service: ServiceProvider) => {
    if (!user) {
      setAuthMode('login');
      setAuthModalOpen(true);
      showToast('Login or join free to chat with this Service Provider.');
      return;
    }
    setActiveServiceProfile(null);
    setActiveChatTarget({ itemId: `service:${service.id}` });
    setActiveTab('chat');
  };

  const handleContactShop = (shop: TraderShop) => {
    if (!user) {
      setAuthMode('login');
      setAuthModalOpen(true);
      showToast('Login or join free to contact this Verified Trader.');
      return;
    }
    setActiveChatTarget({ itemId: `shop:${shop.owner_id}` });
    setActiveTab('chat');
  };

  // True 1-click Report Scam: if 3 reports, auto-removes item AND auto-locks seller account
  const handleTriggerReport = async (item: MarketplaceItem) => {
    if (!user) {
      setAuthMode('login');
      setAuthModalOpen(true);
      showToast('Please sign in to report a listing.');
      return;
    }
    try {
      const res = await api.reportItem(item.id, '1-click scam report');
      setDetailItem(null);
      if (res.seller_locked || res.auto_removed) {
        showToast(
          '3 reports reached: Item removed & seller account automatically locked!'
        );
        fetchItemsPage(1, false);
        fetchHotDeals();
      } else {
        showToast(
          `Scam reported (${res.report_count}/3). 3 reports auto-locks the seller account.`
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not submit scam report.');
    }
  };

  const handleQuickWantAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthMode('signup');
      setAuthModalOpen(true);
      showToast('Sign in free to set "I Want This" Price Drop Alerts.');
      return;
    }
    if (!wantKeyword.trim() || !Number(wantMaxPrice)) return;
    setSavingWantAlert(true);
    try {
      const res = await api.createWantAlert({
        keyword: wantKeyword.trim(),
        max_price: Number(wantMaxPrice),
        institution: user.institution,
      });
      setWantKeyword('');
      setWantMaxPrice('');
      showToast(
        res.alert.matches.length > 0
          ? `Found ${res.alert.matches.length} match right now (${formatMoney(res.alert.matches[0].item_price)})! Check Profile -> Alerts.`
          : 'Alert saved! We will notify you the instant a seller posts it.'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save price alert.');
    } finally {
      setSavingWantAlert(false);
    }
  };

  const handleBlockSeller = async (item: MarketplaceItem) => {
    if (!user) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }
    try {
      const res = await api.blockUser(item.seller_id, `Blocked seller from item: ${item.title}`);
      setDetailItem(null);
      showToast(
        res.auto_suspended
          ? 'Seller reached 3 blocks and was automatically suspended.'
          : 'Seller blocked & reported to Owner.'
      );
      fetchItemsPage(1, false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not block seller.');
    }
  };

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    setShowOwnerDashboard(false);
    setUnreadCount(0);
    setWishlistIds([]);
    setActiveChatTarget(null);
    setActiveTab('home');
    showToast('Signed out.');
  };

  const renderFeedGrid = (list: MarketplaceItem[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {list.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          wishlisted={wishlistIds.includes(item.id)}
          lowDataMode={lowDataMode}
          onToggleWishlist={handleToggleWishlist}
          onViewDetails={(it) => setDetailItem(it)}
          onBuyNow={handleBuyNow}
          onChat={(it) => handleOpenChat(it)}
          onReport={handleTriggerReport}
        />
      ))}
    </div>
  );

  const { visibleMySchool, visibleOtherSchool } = useMemo(() => {
    if (!userHomeSchool) {
      return { visibleMySchool: orderedFeed, visibleOtherSchool: [] as MarketplaceItem[] };
    }
    return {
      visibleMySchool: orderedFeed.filter((i) => i.institution === userHomeSchool),
      visibleOtherSchool: orderedFeed.filter((i) => i.institution !== userHomeSchool),
    };
  }, [orderedFeed, userHomeSchool]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Top Bar — Fast Solid Header + Low Data Mode Button */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-5">
          <button
            type="button"
            onClick={() => {
              setShowOwnerDashboard(false);
              setActiveTab('home');
            }}
            className="text-left shrink-0 focus:outline-none"
          >
            <BrandLogo size="sm" compact />
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-sm font-semibold text-slate-700">
            {(
              [
                ['home', t('nav_home')],
                ['markets', t('nav_markets')],
                ['post', t('nav_post')],
                ['chat', t('nav_chat')],
                ['services', t('nav_services')],
                ['shop', t('nav_shop')],
                ['profile', t('nav_profile')],
              ] as Array<[NavTab, string]>
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setShowOwnerDashboard(false);
                  setActiveTab(tab);
                }}
                className={`whitespace-nowrap shrink-0 hover:text-green-800 flex items-center gap-1.5 ${
                  !showOwnerDashboard && activeTab === tab
                    ? 'text-green-800 underline underline-offset-4 font-extrabold'
                    : ''
                }`}
              >
                <span>{label}</span>
                {tab === 'chat' && unreadCount > 0 && (
                  <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[11px] font-extrabold text-white tabular-nums leading-none">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Language Switcher + Markets (Mobile Shortcut) + Policies + Low Data Mode + Primary CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLangModalOpen(true)}
              title={t('language_settings')}
              className="min-h-[38px] px-2 sm:px-2.5 rounded-xl border border-green-700/30 bg-white text-green-900 text-xs font-extrabold inline-flex items-center gap-1 hover:bg-green-50 whitespace-nowrap"
            >
              <Globe2 className="w-3.5 h-3.5 text-green-700 shrink-0" />
              <span>{country === 'All' ? '🌍 All' : countryConfig.flag}</span>
              <span className="hidden sm:inline truncate max-w-[80px]">{language}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowOwnerDashboard(false);
                setActiveTab('markets');
              }}
              className={`md:hidden min-h-[38px] px-2.5 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1 whitespace-nowrap ${
                !showOwnerDashboard && activeTab === 'markets'
                  ? 'border-green-700 bg-green-700 text-white'
                  : 'border-green-700/30 bg-green-50 text-green-900'
              }`}
            >
              <Store className="w-3.5 h-3.5 shrink-0" />
              <span>{t('nav_markets')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePolicy('refund')}
              className="hidden sm:inline-flex min-h-[38px] px-3 rounded-xl border border-green-700/30 bg-green-50 text-green-900 text-xs font-extrabold items-center gap-1.5 hover:bg-green-100 whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-green-700 shrink-0" />
              <span>{t('nav_policies')}</span>
            </button>

            <button
              type="button"
              onClick={toggleLowData}
              aria-pressed={lowDataMode}
              title="Toggle Low Data Mode"
              className={`min-h-[38px] px-2.5 sm:px-3 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap ${
                lowDataMode
                  ? 'border-yellow-500 bg-yellow-100 text-green-950'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {lowDataMode ? (
                <WifiOff className="w-3.5 h-3.5 text-green-800 shrink-0" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className="hidden xs:inline sm:inline">
                {lowDataMode ? t('btn_low_data_on') : t('btn_low_data')}
              </span>
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => {
                  setShowOwnerDashboard(false);
                  setActiveTab('post');
                }}
                className="min-h-[38px] sm:min-h-[42px] px-3 sm:px-4 rounded-xl bg-green-700 text-white text-xs sm:text-sm font-bold hover:bg-green-800 whitespace-nowrap shrink-0"
              >
                {t('btn_post_free')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthModalOpen(true);
                }}
                className="min-h-[38px] sm:min-h-[42px] px-3 sm:px-4 rounded-xl bg-orange-500 text-white text-xs sm:text-sm font-extrabold hover:bg-orange-600 whitespace-nowrap shrink-0"
              >
                {t('btn_login_join')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Global Toast */}
      {toast && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md rounded-xl bg-green-900 text-white px-4 py-3 text-sm font-semibold shadow-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="truncate">{toast}</span>
          </div>
          <button type="button" onClick={() => setToast('')} className="shrink-0 text-green-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-3.5 sm:px-6 pt-4 pb-24 md:pb-12">
        {showOwnerDashboard ? (
          <Suspense fallback={<TabFallback />}>
            <OwnerDashboardView
              onBack={() => setShowOwnerDashboard(false)}
              onAdsUpdated={(s) => setAdSettings(s)}
            />
          </Suspense>
        ) : (
          <div className="lg:grid lg:grid-cols-12 lg:gap-6 items-start">
            <div className="lg:col-span-9 min-w-0">
              {/* === HOME TAB === */}
              {activeTab === 'home' && (
                <div className="space-y-4 sm:space-y-5">
                {/* Hero & Search Anchor — Clean Modern Green & White West & South Africa Student Marketplace */}
                <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-green-800 via-green-700 to-green-900 text-white">
                  <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                    <div className="lg:col-span-7 p-5 sm:p-8 flex flex-col justify-center space-y-3.5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-yellow-300">
                          {t('hero_tagline')} · Powered by JOKEY PERKY GROUP
                        </p>
                        <h1 className="mt-1 text-2xl sm:text-4xl font-extrabold leading-tight">
                          {t('hero_title')}
                        </h1>
                        <p className="mt-1 text-sm sm:text-base text-green-50 max-w-xl">
                          {t('hero_subtitle')}
                        </p>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder={t('search_placeholder')}
                          className="w-full min-h-[50px] rounded-2xl bg-white text-slate-900 pl-12 pr-4 text-base font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab('post')}
                          className="min-h-[46px] px-5 rounded-xl bg-yellow-400 text-green-950 font-extrabold text-sm hover:bg-yellow-300"
                        >
                          {t('sell_free')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('markets')}
                          className="min-h-[46px] px-4 rounded-xl bg-white text-green-900 font-extrabold text-sm hover:bg-green-50 inline-flex items-center gap-1.5"
                        >
                          <Store className="w-4 h-4 text-green-700" />
                          <span>{t('browse_markets')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePolicy('refund')}
                          className="min-h-[46px] px-4 rounded-xl bg-white/15 border border-white/30 text-white font-bold text-sm hover:bg-white/25 inline-flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>{t('refund_policy')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('services')}
                          className="min-h-[46px] px-4 rounded-xl bg-white/15 border border-white/30 text-white font-bold text-sm hover:bg-white/25"
                        >
                          {t('services_near_you')}
                        </button>
                      </div>
                    </div>

                    {!lowDataMode && (
                      <div className="hidden lg:block lg:col-span-5 relative min-h-[240px]">
                        <img
                          src={heroCampusMarketImg}
                          alt="African students buying and selling on campus"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-green-800/80 via-transparent to-transparent" />
                      </div>
                    )}
                  </div>
                </section>

                {/* Active Country Switcher Banner: "You are viewing: Nigeria [Change] [All Countries]" */}
                <section className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Globe2 className="w-4 h-4 text-green-700 shrink-0" />
                    <span>
                      {t('you_are_viewing')}:{' '}
                      <strong className="text-green-800">
                        {country === 'All'
                          ? `🌍 ${t('all_countries')}`
                          : `${countryConfig.flag} ${country}`}
                      </strong>
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      ({language})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      aria-label={t('country_label')}
                      value={country}
                      onChange={(e) => setCountryOnly(e.target.value)}
                      className="min-h-[34px] rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-800"
                    >
                      <option value="All">🌍 {t('all_countries')}</option>
                      {COUNTRY_LANGUAGE_CONFIGS.map((cfg) => (
                        <option key={cfg.country} value={cfg.country}>
                          {cfg.flag} {cfg.country}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setLangModalOpen(true)}
                      className="min-h-[34px] px-3 rounded-lg bg-green-50 border border-green-700/30 text-green-900 text-xs font-extrabold hover:bg-green-100"
                    >
                      {t('change_btn')}
                    </button>
                  </div>
                </section>

                {/* Escrow & Refund Protection Strip */}
                <section className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-green-950">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="w-5 h-5 text-green-700 shrink-0" />
                    <span>{t('escrow_banner')}</span>
                  </div>
                  <div className="flex items-center gap-3 font-extrabold text-green-800">
                    <button
                      type="button"
                      onClick={() => setActivePolicy('refund')}
                      className="hover:underline"
                    >
                      {t('refund_policy')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePolicy('delivery')}
                      className="hover:underline"
                    >
                      {t('delivery_policy')}
                    </button>
                  </div>
                </section>

                {/* Quick Categories Bar */}
                <section className="flex gap-2 overflow-x-auto pb-1">
                  {HOME_QUICK_CATEGORIES.map((qc) => {
                    const isServices = qc.id === '__SERVICES__';
                    const active = !isServices && selectedCategory === qc.id;
                    const Icon = QUICK_CAT_ICONS[qc.id];
                    return (
                      <button
                        key={qc.id}
                        type="button"
                        onClick={() => {
                          if (isServices) {
                            setActiveTab('services');
                          } else {
                            setSelectedCategory(qc.id);
                          }
                        }}
                        className={`min-h-[44px] px-3.5 rounded-xl border text-xs sm:text-sm font-extrabold whitespace-nowrap shrink-0 inline-flex items-center gap-2 ${
                          isServices
                            ? 'bg-green-900 text-white border-green-900 hover:bg-green-950'
                            : active
                            ? 'bg-green-700 text-white border-green-700'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-green-700'
                        }`}
                      >
                        {Icon && <Icon className="w-4 h-4 shrink-0" />}
                        <span>{translateCategory(qc.id)}</span>
                      </button>
                    );
                  })}
                </section>

                {/* Featured Products Strip */}
                {featuredProducts.length > 0 && (
                  <section className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base sm:text-lg font-extrabold text-green-950 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-green-700" />
                        <span>{t('featured_products')}</span>
                      </h2>
                      <span className="text-xs font-bold text-green-800">
                        {t('paystack_escrow_protected')}
                      </span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {featuredProducts.map((feat) => {
                        const thumb = feat.thumbnails?.[0] || feat.photos?.[0];
                        return (
                          <div
                            key={`feat-${feat.id}`}
                            className="w-44 sm:w-48 shrink-0 rounded-2xl border border-green-200 bg-white p-2.5 flex flex-col gap-2"
                          >
                            <button
                              type="button"
                              onClick={() => setDetailItem(feat)}
                              className="text-left focus:outline-none space-y-1.5"
                            >
                              <div className="aspect-[4/3] rounded-xl bg-slate-100 overflow-hidden">
                                {thumb && (
                                  <img
                                    src={thumb}
                                    alt={feat.title}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {feat.title}
                              </div>
                              <div className="text-sm font-extrabold text-green-800 tabular-nums">
                                {formatMoney(feat.price, feat.country)}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {feat.seller_name} · {feat.location}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBuyNow(feat)}
                              className="w-full min-h-[36px] rounded-xl bg-green-700 text-white text-xs font-extrabold hover:bg-green-800"
                            >
                              {t('buy_now')}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Quick "I Want This" / Price Drop Alert Bar */}
                <form
                  onSubmit={handleQuickWantAlert}
                  className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 flex flex-wrap items-center gap-2"
                >
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-900 shrink-0">
                    <BellRing className="w-4 h-4 text-blue-700" />
                    <span>{t('i_want_this')}:</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={wantKeyword}
                    onChange={(e) => setWantKeyword(e.target.value)}
                    placeholder="e.g. iPhone 11"
                    className="flex-1 min-w-[130px] min-h-[40px] rounded-xl border border-blue-200 bg-white px-3 text-sm"
                  />
                  <input
                    type="number"
                    min={500}
                    required
                    value={wantMaxPrice}
                    onChange={(e) => setWantMaxPrice(e.target.value)}
                    placeholder={`Max ${countryConfig.currencySymbol} (e.g. 150000)`}
                    className="w-40 min-h-[40px] rounded-xl border border-blue-200 bg-white px-3 text-sm font-bold tabular-nums"
                  />
                  <button
                    type="submit"
                    disabled={savingWantAlert}
                    className="min-h-[40px] px-4 rounded-xl bg-blue-600 text-white text-xs font-extrabold hover:bg-blue-700 whitespace-nowrap"
                  >
                    {savingWantAlert ? '...' : t('notify_me')}
                  </button>
                </form>

                {/* Today's Hot Deals — Top 10 Cheap Items, Resets Daily 12pm */}
                {hotDeals.length > 0 && (
                  <section className="rounded-2xl border-2 border-orange-400 bg-orange-50/40 p-3.5 sm:p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center">
                          <Flame className="w-5 h-5" />
                        </span>
                        <div>
                          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                            {t('hot_deals_title')}
                          </h2>
                          <p className="text-xs text-slate-600">
                            {t('hot_deals_sub')}
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-3 py-1.5 text-xs font-extrabold tabular-nums">
                        <Timer className="w-4 h-4 text-orange-400" />
                        <span>{t('resets_12pm')} · {formatCountdown(countdownSecs)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {hotDeals.map((deal) => {
                        const thumb = deal.thumbnails?.[0] || deal.photos?.[0];
                        return (
                          <button
                            key={deal.id}
                            type="button"
                            onClick={() => setDetailItem(deal)}
                            className="w-36 sm:w-40 shrink-0 rounded-xl border border-orange-200 bg-white p-2 text-left hover:border-orange-500"
                          >
                            <div
                              className={`rounded-lg bg-slate-100 overflow-hidden ${
                                lowDataMode ? 'h-16' : 'aspect-[4/3]'
                              }`}
                            >
                              {thumb && (
                                <img
                                  src={thumb}
                                  alt={deal.title}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="mt-1.5 text-xs font-bold text-slate-900 truncate">
                              {deal.title}
                            </div>
                            <div className="text-sm font-extrabold text-orange-600 tabular-nums">
                              {formatMoney(deal.price, deal.country)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Filter by Near Me / School / Market Pills */}
                <section className="flex gap-2 overflow-x-auto pb-1">
                  {(
                    [
                      ['all', t('filter_all')],
                      ['students', t('filter_students')],
                      ['traders', t('filter_traders')],
                      ['my_school', t('filter_my_school')],
                      ['my_market', t('filter_my_market')],
                      ['within_2km', t('filter_within_2km')],
                    ] as Array<[ItemFilterMode, string]>
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFilterMode(mode)}
                      className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-extrabold whitespace-nowrap shrink-0 ${
                        filterMode === mode
                          ? 'bg-green-700 text-white border-green-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-green-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </section>

                {/* Filter Controls */}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {t('label_category')}
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-green-700 focus:outline-none"
                    >
                      <option value="All">{t('cat_all')}</option>
                      {ITEM_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {translateCategory(cat)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {t('label_condition')}
                    </label>
                    <select
                      value={selectedCondition}
                      onChange={(e) => setSelectedCondition(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-green-700 focus:outline-none"
                    >
                      <option value="All">{t('any_condition')}</option>
                      {ITEM_CONDITIONS.map((cond) => (
                        <option key={cond} value={cond}>
                          {cond}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {t('label_institution')}
                    </label>
                    <select
                      value={selectedInstitution}
                      onChange={(e) => setSelectedInstitution(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-green-700 focus:outline-none"
                    >
                      <option value="All">{t('all_schools_markets')}</option>
                      {homeInstitutions.map((inst) => (
                        <option key={inst.name} value={inst.name}>
                          {inst.name}{inst.country ? ` — ${inst.country}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>

                {/* Marketplace Feed (10 products loaded first, next 10 on scroll) */}
                {loadingItems ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-72 rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                ) : orderedFeed.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3">
                    <p className="text-lg font-extrabold text-slate-900">{t('no_items_yet')}</p>
                    <p className="text-sm text-slate-600">
                      Be the first student or trader to post a real listing for free!
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('post')}
                        className="min-h-[44px] px-5 rounded-xl bg-green-700 text-white font-bold text-sm"
                      >
                        {t('sell_free')}
                      </button>
                      {(search ||
                        selectedCategory !== 'All' ||
                        selectedCondition !== 'All' ||
                        selectedInstitution !== 'All' ||
                        filterMode !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('');
                            setSelectedCategory('All');
                            setSelectedCondition('All');
                            setSelectedInstitution('All');
                            setFilterMode('all');
                          }}
                          className="min-h-[44px] px-5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm"
                        >
                          {t('reset_filters')}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {userHomeSchool ? (
                      <>
                        {visibleMySchool.length > 0 && (
                          <section className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <h2 className="text-lg sm:text-xl font-extrabold text-green-900">
                                In Your Area · {userHomeSchool}
                              </h2>
                              <span className="text-xs font-bold text-slate-500 tabular-nums">
                                {visibleMySchool.length} shown
                              </span>
                            </div>
                            <div className="space-y-4">{renderFeedGrid(visibleMySchool)}</div>
                          </section>
                        )}

                        {visibleOtherSchool.length > 0 && (
                          <section className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                                From Other Schools &amp; Markets
                              </h2>
                              <span className="text-xs font-bold text-slate-500 tabular-nums">
                                {visibleOtherSchool.length} shown
                              </span>
                            </div>
                            <div className="space-y-4">
                              {renderFeedGrid(visibleOtherSchool)}
                            </div>
                          </section>
                        )}
                      </>
                    ) : (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                            {t('latest_listings')}
                          </h2>
                          <span className="text-xs font-bold text-slate-500 tabular-nums">
                            {orderedFeed.length} of {Math.max(totalItemsCount, orderedFeed.length)}
                          </span>
                        </div>
                        <div className="space-y-4">{renderFeedGrid(orderedFeed)}</div>
                      </section>
                    )}

                    {/* Server Pagination Infinite Scroll Trigger (10 products at a time) */}
                    {hasMore && (
                      <div ref={loadMoreRef} className="pt-2 text-center">
                        <button
                          type="button"
                          disabled={loadingMore}
                          onClick={() => fetchItemsPage(page + 1, true)}
                          className="min-h-[48px] px-6 rounded-xl border-2 border-green-700 text-green-800 font-extrabold text-sm hover:bg-green-50 disabled:opacity-60"
                        >
                          {loadingMore
                            ? 'Loading next 10 products...'
                            : `Load 10 More Products (${Math.max(0, totalItemsCount - items.length)} remaining)`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* === MARKETS TAB === */}
            {activeTab === 'markets' && (
              <Suspense fallback={<TabFallback />}>
                <MarketsView
                  wishlistIds={wishlistIds}
                  lowDataMode={lowDataMode}
                  onToggleWishlist={handleToggleWishlist}
                  onViewDetails={(it) => setDetailItem(it)}
                  onBuyNow={handleBuyNow}
                  onChat={(it) => handleOpenChat(it)}
                  onReport={handleTriggerReport}
                  onPostItem={() => setActiveTab('post')}
                  onOpenShops={() => setActiveTab('shop')}
                />
              </Suspense>
            )}

            {/* === POST TAB === */}
            {activeTab === 'post' && (
              <Suspense fallback={<TabFallback />}>
                <SellItemView
                  user={user}
                  onRequireAuth={() => {
                    setAuthMode('signup');
                    setAuthModalOpen(true);
                  }}
                  onPublished={(newItem) => {
                    const liteNew: MarketplaceItem = {
                      ...newItem,
                      photos: newItem.thumbnails?.length ? newItem.thumbnails : newItem.photos.slice(0, 1),
                    };
                    setItems((prev) => {
                      const next = [liteNew, ...prev];
                      setCachedItems(next);
                      return next;
                    });
                    setTotalItemsCount((c) => c + 1);
                    setActiveTab('home');
                    showToast('Your item is now live in the marketplace!');
                  }}
                />
              </Suspense>
            )}

            {/* === CHAT TAB === */}
            {activeTab === 'chat' && (
              <Suspense fallback={<TabFallback />}>
                <MessagesView
                  user={user}
                  activeChatTarget={activeChatTarget}
                  onSelectThread={(target) => setActiveChatTarget(target)}
                  onRequireAuth={() => {
                    setAuthMode('login');
                    setAuthModalOpen(true);
                  }}
                  onUnreadCountChange={setUnreadCount}
                />
              </Suspense>
            )}

            {/* === SERVICES NEAR YOU TAB === */}
            {activeTab === 'services' && (
              <Suspense fallback={<TabFallback />}>
                <ServicesView
                  user={user}
                  onRequireAuth={() => {
                    setAuthMode('signup');
                    setAuthModalOpen(true);
                  }}
                  onOpenServiceProfile={(svc) => setActiveServiceProfile(svc)}
                  onChatService={handleChatService}
                  onNotice={showToast}
                />
              </Suspense>
            )}

            {/* === SHOP (TRADER) TAB === */}
            {activeTab === 'shop' && (
              <Suspense fallback={<TabFallback />}>
                <ShopView
                  user={user}
                  adSettings={adSettings}
                  onRequireAuth={() => {
                    setAuthMode('signup');
                    setAuthModalOpen(true);
                  }}
                  onViewItem={(it) => setDetailItem(it)}
                  onContactShop={handleContactShop}
                  onUserUpdated={(u) => setUser(u)}
                  onNotice={(msg) => {
                    showToast(msg);
                    fetchItemsPage(1, false);
                  }}
                />
              </Suspense>
            )}

            {/* === PROFILE TAB === */}
            {activeTab === 'profile' && (
              <Suspense fallback={<TabFallback />}>
                <ProfileView
                  user={user}
                  allItems={items}
                  wishlistIds={wishlistIds}
                  adSettings={adSettings}
                  onRequireAuth={() => {
                    setAuthMode('login');
                    setAuthModalOpen(true);
                  }}
                  onUserUpdated={(u) => setUser(u)}
                  onLogout={handleLogout}
                  onOpenOwnerDashboard={() => setShowOwnerDashboard(true)}
                  onViewItem={(it) => setDetailItem(it)}
                  onNotice={(msg) => {
                    showToast(msg);
                    fetchItemsPage(1, false);
                  }}
                />
              </Suspense>
            )}
            </div>

            {/* Google AdSense ONLY: Right Sidebar on Desktop, Bottom of Page on Mobile, ZERO Ads during Checkout */}
            <aside className="lg:col-span-3 mt-6 lg:mt-0 lg:sticky lg:top-20">
              {!checkoutItem && (
                <AdSlot
                  settings={adSettings}
                  ready={productsLoaded}
                  lowDataMode={lowDataMode}
                />
              )}
            </aside>
          </div>
        )}
      </main>

      {/* Footer on Every Page */}
      <footer className="border-t border-slate-200 bg-slate-50 pb-20 md:pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <BrandLogo size="sm" />
            <div className="text-xs sm:text-sm font-semibold text-slate-700">
              {t('support_line')}:{' '}
              <a
                href="mailto:afristudentmartsupportjpg@gmail.com"
                className="font-bold text-green-800 hover:underline"
              >
                afristudentmartsupportjpg@gmail.com
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs sm:text-sm font-medium text-slate-600">
            {(
              [
                ['refund', 'Refund Policy'],
                ['delivery', 'Delivery Policy'],
                ['seller_policy', 'Seller Policy'],
                ['escrow', 'Escrow Protection'],
                ['terms', 'Terms of Service'],
                ['privacy', 'Privacy Policy'],
                ['safety', 'Safety Tips'],
                ['prohibited', 'Prohibited Items'],
                ['report', 'Report & Block'],
                ['contact', 'Contact Us'],
              ] as Array<[PolicyPageId, string]>
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActivePolicy(id)}
                className="hover:text-green-800 hover:underline text-left font-semibold"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-xs font-bold text-green-900">
            {t('chat_footer_note')}
          </div>

          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span>Afri Student Mart - West &amp; South Africa Student Marketplace</span>
            <span className="font-bold text-green-900">Powered by JOKEY PERKY GROUP</span>
          </div>
        </div>
      </footer>

      {/* 6-Tab Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        unreadCount={unreadCount}
        onChangeTab={(tab) => {
          setShowOwnerDashboard(false);
          setActiveTab(tab);
        }}
      />

      {/* Floating Mart AI Assistant (lazy-loaded) */}
      <Suspense fallback={null}>
        <MartAIWidget
          institution={
            user?.institution || (selectedInstitution !== 'All' ? selectedInstitution : undefined)
          }
        />
      </Suspense>

      {/* Step 1: Mandatory Language & Country Picker BEFORE Signup / On First Visit */}
      <LanguagePickerModal
        open={!hasChosenLanguage || langModalOpen}
        canClose={hasChosenLanguage}
        user={user}
        onUserUpdated={(u) => setUser(u)}
        onClose={() => setLangModalOpen(false)}
      />

      {/* Modals (lazy-loaded on demand) */}
      {authModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            open={authModalOpen}
            initialMode={authMode}
            onClose={() => setAuthModalOpen(false)}
            onOpenPolicy={(id) => setActivePolicy(id)}
            onSuccess={(token, loggedInUser) => {
              setStoredToken(token);
              setUser(loggedInUser);
              setAuthModalOpen(false);
              if (loggedInUser.country && loggedInUser.language) {
                setCountryAndLanguage(loggedInUser.country, loggedInUser.language, true);
              }
              if (loggedInUser.role === 'owner') {
                setShowOwnerDashboard(true);
              }
              refreshUnread();
              fetchWishlist();
              showToast(`Welcome, ${loggedInUser.full_name}!`);
            }}
          />
        </Suspense>
      )}

      {detailItem && (
        <Suspense fallback={null}>
          <ItemDetailModal
            item={detailItem}
            wishlisted={wishlistIds.includes(detailItem.id)}
            lowDataMode={lowDataMode}
            onToggleWishlist={handleToggleWishlist}
            onClose={() => setDetailItem(null)}
            onBuyNow={handleBuyNow}
            onChat={handleOpenChat}
            onReportItem={handleTriggerReport}
            onBlockSeller={handleBlockSeller}
          />
        </Suspense>
      )}

      {checkoutItem && (
        <Suspense fallback={null}>
          <CheckoutModal
            item={checkoutItem}
            user={user}
            adSettings={adSettings}
            onClose={() => setCheckoutItem(null)}
            onRequireAuth={() => {
              setCheckoutItem(null);
              setAuthMode('login');
              setAuthModalOpen(true);
            }}
            onOpenPolicy={(id) => {
              setCheckoutItem(null);
              setActivePolicy(id);
            }}
            onOrderSuccess={() => {
              showToast('Payment Successful via Paystack. Admin and Seller have been paid via Split.');
            }}
          />
        </Suspense>
      )}

      {activeServiceProfile && (
        <Suspense fallback={null}>
          <ServiceProfileModal
            service={activeServiceProfile}
            user={user}
            adSettings={adSettings}
            onClose={() => setActiveServiceProfile(null)}
            onRequireAuth={() => {
              setActiveServiceProfile(null);
              setAuthMode('signup');
              setAuthModalOpen(true);
            }}
            onChatService={handleChatService}
            onUpdated={(updatedSvc) => setActiveServiceProfile(updatedSvc)}
            onNotice={showToast}
          />
        </Suspense>
      )}

      {activePolicy && (
        <Suspense fallback={null}>
          <PolicyModal
            policyId={activePolicy}
            onSelectPolicy={(id) => setActivePolicy(id)}
            onClose={() => setActivePolicy(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
