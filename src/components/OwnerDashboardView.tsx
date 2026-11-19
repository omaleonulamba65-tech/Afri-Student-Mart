import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Ban,
  BarChart3,
  Check,
  CheckCircle2,
  EyeOff,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Shield,
  ShoppingBag,
  Star,
  Trash2,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { api, formatNaira } from '../lib/api';
import { PAYSTACK_PUBLIC_KEY_PLACEHOLDER, PAYSTACK_SPLIT_CODE_PLACEHOLDER } from '../lib/paystack';
import type {
  AdSettings,
  OwnerDashboardData,
  OwnerSalesPoint,
  OwnerStealthThread,
} from '../types';

interface OwnerDashboardViewProps {
  ownerEmail: string;
  onBack: () => void;
  onLogout: () => void;
  onAdsUpdated: (settings: AdSettings) => void;
}

type SidebarSection =
  | 'overview'
  | 'money'
  | 'users'
  | 'orders'
  | 'products'
  | 'messages'
  | 'settings';

const NAV_ITEMS: Array<{
  id: SidebarSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'money', label: 'Money', icon: Wallet },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const SalesSvgChart: React.FC<{ points: OwnerSalesPoint[] }> = ({ points }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const maxSales = Math.max(1, ...points.map((p) => p.sales));
  const width = 760;
  const height = 220;
  const padLeft = 16;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 28;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const step = points.length > 0 ? chartW / points.length : chartW;
  const barWidth = Math.max(10, Math.min(34, step * 0.58));

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-56 overflow-visible select-none"
        role="img"
        aria-label="Sales chart"
      >
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padTop + chartH * (1 - frac);
          return (
            <line
              key={frac}
              x1={padLeft}
              x2={width - padRight}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          );
        })}
        <line
          x1={padLeft}
          x2={width - padRight}
          y1={padTop + chartH}
          y2={padTop + chartH}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        {points.map((pt, idx) => {
          const barH = pt.sales > 0 ? Math.max(4, (pt.sales / maxSales) * chartH) : 2;
          const x = padLeft + idx * step + (step - barWidth) / 2;
          const y = padTop + chartH - barH;
          const isHovered = hoverIdx === idx;
          return (
            <g
              key={`${pt.label}-${idx}`}
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={4}
                fill={pt.sales > 0 ? (isHovered ? '#166534' : '#15803d') : '#e2e8f0'}
              />
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-medium"
              >
                {points.length <= 10 || idx % 2 === 0 ? pt.label : ''}
              </text>
            </g>
          );
        })}
      </svg>
      {hoverIdx !== null && points[hoverIdx] && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-600 tabular-nums">
          <span>
            <strong className="text-slate-900">{points[hoverIdx].label}</strong>
          </span>
          <span>
            Gross Sales: <strong className="text-green-800">{formatNaira(points[hoverIdx].sales)}</strong>
            {' · '}
            Orders: <strong className="text-slate-900">{points[hoverIdx].orders}</strong>
            {' · '}
            Commission: <strong className="text-slate-900">{formatNaira(points[hoverIdx].commission)}</strong>
          </span>
        </div>
      )}
    </div>
  );
};

export const OwnerDashboardView: React.FC<OwnerDashboardViewProps> = ({
  ownerEmail,
  onBack,
  onLogout,
  onAdsUpdated,
}) => {
  const [section, setSection] = useState<SidebarSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  // Overview chart toggle
  const [chartGranularity, setChartGranularity] = useState<'daily' | 'weekly'>('daily');

  // Money tab filters
  const [moneyFilter, setMoneyFilter] = useState<'all' | 'pending' | 'successful' | 'failed'>('all');
  const [moneySearch, setMoneySearch] = useState('');

  // Users tab filters
  const [userFilter, setUserFilter] = useState<'buyers' | 'sellers' | 'all'>('buyers');
  const [userSearch, setUserSearch] = useState('');

  // Orders tab filters
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');

  // Products tab filters
  const [productFilter, setProductFilter] = useState<'all' | 'active' | 'pending' | 'rejected' | 'featured'>('all');
  const [productSearch, setProductSearch] = useState('');

  // Messages stealth tab
  const [chatSearch, setChatSearch] = useState('');
  const [selectedThreadKey, setSelectedThreadKey] = useState<string>('');

  // Settings form
  const [settingsForm, setSettingsForm] = useState<AdSettings>({
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
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getOwnerDashboard();
      setData(res);
      setSettingsForm({
        ...res.ad_settings,
        commission_percent: res.ad_settings.commission_percent ?? 10,
        site_name: res.ad_settings.site_name || 'Afri Student Mart',
        announcement: res.ad_settings.announcement || '',
        announcement_enabled: Boolean(res.ad_settings.announcement_enabled),
      });
      if (!selectedThreadKey && res.chat_threads && res.chat_threads.length > 0) {
        setSelectedThreadKey(res.chat_threads[0].thread_key);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Access Denied');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleToggleFeature = async (itemId: string, featured: boolean) => {
    setBusyActionId(itemId);
    try {
      await api.ownerFeatureItem(itemId, featured);
      showToast(featured ? 'Product marked as Featured.' : 'Product removed from Featured.');
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update product.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleApproveRejectProduct = async (itemId: string, decision: 'approve' | 'reject') => {
    setBusyActionId(itemId);
    try {
      await api.ownerApproveRejectItem(itemId, decision);
      showToast(decision === 'approve' ? 'Product approved and live.' : 'Product rejected.');
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update product status.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleDeleteProduct = async (itemId: string) => {
    setBusyActionId(itemId);
    try {
      await api.ownerDeleteItem(itemId);
      showToast('Product permanently deleted.');
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete product.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleToggleBlockUser = async (userIdOrPhone: string, blocked: boolean) => {
    setBusyActionId(userIdOrPhone);
    try {
      await api.ownerBlockUser(userIdOrPhone, blocked);
      showToast(blocked ? 'User blocked.' : 'User unblocked.');
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update user status.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleResolveOrderRefund = async (
    orderId: string,
    decision: 'approve_full' | 'approve_product_only' | 'reject'
  ) => {
    setBusyActionId(orderId);
    try {
      await api.ownerResolveOrderRefund(orderId, decision);
      showToast(
        decision === 'reject'
          ? 'Refund declined; order returned to active fulfillment.'
          : 'Refund approved.'
      );
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resolve refund.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setError('');
    try {
      const res = await api.ownerSaveAdSettings(settingsForm);
      onAdsUpdated(res.settings);
      showToast('Settings saved to Supabase.');
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const ordersList = data?.orders || [];

  const filteredPayments = useMemo(() => {
    const q = moneySearch.trim().toLowerCase();
    return ordersList.filter((o) => {
      const isPending = o.order_status === 'paid_escrow' || o.order_status === 'shipped';
      const isSuccess = o.order_status === 'delivered_confirmed';
      const isFailed =
        o.order_status === 'refund_requested' ||
        o.order_status === 'refund_approved' ||
        o.order_status === 'cancelled';

      if (moneyFilter === 'pending' && !isPending) return false;
      if (moneyFilter === 'successful' && !isSuccess) return false;
      if (moneyFilter === 'failed' && !isFailed) return false;

      if (!q) return true;
      return (
        o.reference.toLowerCase().includes(q) ||
        o.buyer_name.toLowerCase().includes(q) ||
        o.buyer_email.toLowerCase().includes(q) ||
        o.buyer_phone.toLowerCase().includes(q) ||
        o.item_title.toLowerCase().includes(q)
      );
    });
  }, [ordersList, moneyFilter, moneySearch]);

  const filteredUsers = useMemo(() => {
    const users = (data?.users || []).filter((u) => u.role !== 'owner');
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userFilter === 'buyers' && u.role !== 'buyer') return false;
      if (userFilter === 'sellers' && u.role !== 'seller') return false;
      if (!q) return true;
      return (
        u.full_name.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone_number || '').toLowerCase().includes(q) ||
        (u.institution || '').toLowerCase().includes(q) ||
        (u.shop_name || '').toLowerCase().includes(q)
      );
    });
  }, [data?.users, userFilter, userSearch]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return ordersList.filter((o) => {
      if (orderFilter !== 'all' && o.order_status !== orderFilter) return false;
      if (!q) return true;
      return (
        o.reference.toLowerCase().includes(q) ||
        o.item_title.toLowerCase().includes(q) ||
        o.buyer_name.toLowerCase().includes(q) ||
        o.seller_name.toLowerCase().includes(q)
      );
    });
  }, [ordersList, orderFilter, orderSearch]);

  const filteredProducts = useMemo(() => {
    const list = data?.items || [];
    const q = productSearch.trim().toLowerCase();
    return list.filter((it) => {
      if (productFilter === 'active' && it.status !== 'active') return false;
      if (productFilter === 'pending' && it.status !== 'pending') return false;
      if (productFilter === 'rejected' && it.status !== 'rejected' && it.status !== 'removed') return false;
      if (productFilter === 'featured' && !it.is_featured) return false;
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        it.seller_name.toLowerCase().includes(q) ||
        it.seller_phone.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q) ||
        it.institution.toLowerCase().includes(q)
      );
    });
  }, [data?.items, productFilter, productSearch]);

  const filteredThreads = useMemo(() => {
    const threads = data?.chat_threads || [];
    const q = chatSearch.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (th) =>
        th.buyer_name.toLowerCase().includes(q) ||
        th.buyer_phone.toLowerCase().includes(q) ||
        th.seller_name.toLowerCase().includes(q) ||
        th.seller_phone.toLowerCase().includes(q) ||
        th.item_title.toLowerCase().includes(q) ||
        th.messages.some((m) => m.message.toLowerCase().includes(q))
    );
  }, [data?.chat_threads, chatSearch]);

  const activeThread: OwnerStealthThread | null = useMemo(() => {
    if (filteredThreads.length === 0) return null;
    return (
      filteredThreads.find((t) => t.thread_key === selectedThreadKey) || filteredThreads[0]
    );
  }, [filteredThreads, selectedThreadKey]);

  const finance = data?.finance;
  const commissionPercent = finance?.commission_percent ?? settingsForm.commission_percent ?? 10;

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center space-y-2">
          <Shield className="w-7 h-7 text-green-700 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading Owner Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 text-center space-y-4">
          <AlertCircle className="w-7 h-7 text-red-600 mx-auto" />
          <p className="text-base font-bold text-slate-900">{error}</p>
          <button
            type="button"
            onClick={onBack}
            className="min-h-[42px] px-5 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 whitespace-nowrap"
          >
            Back to Storefront
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const activeSectionLabel = NAV_ITEMS.find((n) => n.id === section)?.label || 'Overview';

  const SidebarBody = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-green-700 text-white flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-slate-900 truncate">
              {settingsForm.site_name || 'Afri Student Mart'}
            </div>
            <div className="text-xs text-slate-500 truncate">Owner Console</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Owner dashboard sections">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSection(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full min-h-[42px] px-3.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-colors whitespace-nowrap ${
                active
                  ? 'bg-green-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-200 space-y-1.5">
        <button
          type="button"
          onClick={onBack}
          className="w-full min-h-[40px] px-3.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-50 whitespace-nowrap"
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          <span>View Public Storefront</span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="w-full min-h-[42px] px-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex items-center gap-2.5 hover:bg-red-100 whitespace-nowrap"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {SidebarBody}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full bg-white shadow-xl">{SidebarBody}</div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            className="flex-1 bg-black/40"
          />
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean 2-zone SaaS Top Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden min-h-[40px] min-w-[40px] rounded-lg border border-slate-200 flex items-center justify-center text-slate-700"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 whitespace-nowrap truncate">
                Owner Dashboard / {activeSectionLabel}
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {activeSectionLabel}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs text-slate-500 truncate max-w-[220px]">
              {ownerEmail}
            </span>
            <button
              type="button"
              onClick={fetchDashboard}
              disabled={loading}
              className="min-h-[40px] px-4 rounded-lg bg-green-700 text-white text-xs sm:text-sm font-semibold hover:bg-green-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {toast && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
                <span>{toast}</span>
              </div>
              <button type="button" onClick={() => setToast('')} aria-label="Dismiss notice">
                <X className="w-4 h-4 text-green-700" />
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                <span>{error}</span>
              </div>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
                <X className="w-4 h-4 text-red-700" />
              </button>
            </div>
          )}

          {/* ==================== a) OVERVIEW / ANALYTICS ==================== */}
          {section === 'overview' && (
            <div className="space-y-6">
              {/* Top 4 KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Total Users</div>
                  <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                    {data.stats.total_users.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 tabular-nums">
                    {data.stats.total_buyers} buyers · {data.stats.total_sellers} sellers
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Total Products</div>
                  <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                    {(data.stats.total_all_items ?? data.items.length).toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 tabular-nums">
                    {data.stats.total_items} active · {data.stats.total_institutions} campuses
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Orders Activity</div>
                  <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                    {ordersList.length.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 tabular-nums">
                    Today: {data.stats.orders_today ?? 0} · Week: {data.stats.orders_week ?? 0} · Month: {data.stats.orders_month ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">
                    Commission Earned ({commissionPercent}%)
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-green-700 tabular-nums">
                    {formatNaira(finance?.total_admin_commission || 0)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 tabular-nums">
                    AdSense: {formatNaira(finance?.google_ads_earnings || 0)} · Delivery: {formatNaira(finance?.total_delivery_fees || 0)}
                  </div>
                </div>
              </div>

              {/* Money Coming In / Going Out Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Money Coming In</div>
                  <div className="mt-1.5 text-xl font-bold text-slate-900 tabular-nums">
                    {formatNaira(finance?.total_money_in ?? finance?.total_sales ?? 0)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 tabular-nums">
                    {finance?.total_orders || 0} total orders recorded
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Money Going Out</div>
                  <div className="mt-1.5 text-xl font-bold text-slate-900 tabular-nums">
                    {formatNaira(finance?.total_money_out ?? 0)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 tabular-nums">
                    Seller payouts released + refunds
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">To Pay Sellers (Escrow)</div>
                  <div className="mt-1.5 text-xl font-bold text-amber-700 tabular-nums">
                    {formatNaira(finance?.money_to_pay_sellers ?? finance?.escrow_held_amount ?? 0)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 tabular-nums">
                    Paid to sellers: {formatNaira(finance?.money_paid_to_sellers ?? 0)}
                  </div>
                </div>
              </div>

              {/* Sales Chart (Daily / Weekly) */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-green-700" />
                    <h2 className="text-sm font-bold text-slate-900">
                      Sales Overview ({chartGranularity === 'daily' ? 'Last 14 Days' : 'Last 8 Weeks'})
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setChartGranularity('daily')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                        chartGranularity === 'daily'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Per Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartGranularity('weekly')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                        chartGranularity === 'weekly'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Per Week
                    </button>
                  </div>
                </div>

                <SalesSvgChart
                  points={
                    chartGranularity === 'daily'
                      ? data.sales_series_daily || []
                      : data.sales_series_weekly || []
                  }
                />
              </section>

              {/* Most Popular Products & Most Active Sellers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">Most Popular Products</h2>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {(data.popular_products || []).length} tracked
                    </span>
                  </div>
                  {!data.popular_products || data.popular_products.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500">No products listed yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                          <tr>
                            <th className="py-2.5 px-4 font-semibold">Product</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Orders</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Chats</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 tabular-nums">
                          {data.popular_products.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4">
                                <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                                  {p.title}
                                </div>
                                <div className="text-slate-500 truncate max-w-[200px]">
                                  {p.seller_name} · {formatNaira(p.price)}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold">{p.orders_count}</td>
                              <td className="py-2.5 px-3 text-right text-slate-600">{p.messages_count}</td>
                              <td className="py-2.5 px-4 text-right font-semibold text-green-700">
                                {formatNaira(p.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">Most Active Sellers</h2>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {(data.active_sellers || []).length} ranked
                    </span>
                  </div>
                  {!data.active_sellers || data.active_sellers.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500">No sellers active yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                          <tr>
                            <th className="py-2.5 px-4 font-semibold">Seller</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Listings</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Orders</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Sales</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 tabular-nums">
                          {data.active_sellers.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4">
                                <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                                  {s.shop_name || s.name}
                                </div>
                                <div className="text-slate-500 truncate max-w-[200px]">
                                  {s.phone || s.email || s.name}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold">{s.listings_count}</td>
                              <td className="py-2.5 px-3 text-right text-slate-600">{s.orders_count}</td>
                              <td className="py-2.5 px-4 text-right font-semibold text-green-700">
                                {formatNaira(s.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* ==================== b) MONEY / PAYMENTS ==================== */}
          {section === 'money' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Pending Payments</div>
                  <div className="mt-1 text-lg font-bold text-amber-700 tabular-nums">
                    {formatNaira(finance?.pending_payments_amount || 0)}
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    {finance?.pending_payments_count || 0} orders
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Successful Payments</div>
                  <div className="mt-1 text-lg font-bold text-green-700 tabular-nums">
                    {formatNaira(finance?.successful_payments_amount || 0)}
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    {finance?.successful_payments_count || 0} completed
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Failed / Refunded</div>
                  <div className="mt-1 text-lg font-bold text-red-700 tabular-nums">
                    {formatNaira(finance?.failed_payments_amount || 0)}
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    {finance?.failed_payments_count || 0} claims/cancelled
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">To Pay Sellers</div>
                  <div className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
                    {formatNaira(finance?.money_to_pay_sellers || 0)}
                  </div>
                  <div className="text-xs text-slate-500">Held in escrow</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-medium text-slate-500">Paid to Sellers</div>
                  <div className="mt-1 text-lg font-bold text-green-800 tabular-nums">
                    {formatNaira(finance?.money_paid_to_sellers || 0)}
                  </div>
                  <div className="text-xs text-slate-500">Released payouts</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                    {(
                      [
                        ['all', 'All Payments'],
                        ['pending', 'Pending'],
                        ['successful', 'Successful'],
                        ['failed', 'Failed / Refunded'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMoneyFilter(id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                          moneyFilter === id
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={moneySearch}
                      onChange={(e) => setMoneySearch(e.target.value)}
                      placeholder="Search payer, product, ref..."
                      className="w-full min-h-[38px] rounded-lg border border-slate-200 pl-9 pr-3 text-xs focus:border-green-700 focus:outline-none"
                    />
                  </div>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No Paystack payments match your current filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Who Paid</th>
                          <th className="py-2.5 px-3 font-semibold">Product</th>
                          <th className="py-2.5 px-3 font-semibold">When</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Commission</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Seller Payout</th>
                          <th className="py-2.5 px-4 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 tabular-nums">
                        {filteredPayments.map((ord) => {
                          const statusColor =
                            ord.order_status === 'delivered_confirmed'
                              ? 'text-green-700'
                              : ord.order_status === 'paid_escrow' || ord.order_status === 'shipped'
                              ? 'text-amber-700'
                              : 'text-red-700';
                          return (
                            <tr key={ord.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900">{ord.buyer_name}</div>
                                <div className="text-slate-500 font-mono">
                                  {ord.buyer_email || ord.buyer_phone}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-medium text-slate-900 truncate max-w-[180px]">
                                  {ord.item_title}
                                </div>
                                <div className="text-slate-400 font-mono">{ord.reference}</div>
                              </td>
                              <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                                {new Date(ord.created_at).toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-slate-900">
                                {formatNaira(ord.total_amount)}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-green-700">
                                {formatNaira(ord.admin_commission)}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-slate-700">
                                {formatNaira(ord.seller_payout)}
                              </td>
                              <td className={`py-3 px-4 font-bold uppercase ${statusColor}`}>
                                {ord.order_status.replace(/_/g, ' ')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== c) USERS (BUYERS & SELLERS) ==================== */}
          {section === 'users' && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {(
                    [
                      ['buyers', `Buyers (${data.stats.total_buyers})`],
                      ['sellers', `Sellers (${data.stats.total_sellers})`],
                      ['all', `All Users (${data.users.filter((u) => u.role !== 'owner').length})`],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setUserFilter(id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                        userFilter === id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search name, phone, email..."
                    className="w-full min-h-[38px] rounded-lg border border-slate-200 pl-9 pr-3 text-xs focus:border-green-700 focus:outline-none"
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No users match this filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">User</th>
                        <th className="py-2.5 px-3 font-semibold">Phone &amp; Email</th>
                        <th className="py-2.5 px-3 font-semibold">
                          {userFilter === 'buyers'
                            ? 'What They Bought'
                            : userFilter === 'sellers'
                            ? 'What They Are Selling'
                            : 'Activity'}
                        </th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => {
                        const bought =
                          data.buyer_purchases?.[u.id] ||
                          (u.phone_number ? data.buyer_purchases?.[u.phone_number] : undefined) ||
                          (u.email ? data.buyer_purchases?.[u.email] : undefined) ||
                          [];
                        const selling =
                          data.seller_listings?.[u.id] ||
                          (u.phone_number ? data.seller_listings?.[u.phone_number] : undefined) ||
                          [];
                        const summaryList =
                          u.role === 'seller'
                            ? selling
                            : u.role === 'buyer'
                            ? bought
                            : selling.length > 0
                            ? selling
                            : bought;
                        const targetKey = u.id || u.phone_number;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{u.full_name}</div>
                              <div className="text-slate-500">
                                {u.role === 'seller' ? 'Seller' : 'Buyer'} · {u.institution || u.country || 'Marketplace'}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-700">
                              <div>{u.phone_number || '—'}</div>
                              <div className="text-slate-500">{u.email || '—'}</div>
                            </td>
                            <td className="py-3 px-3 text-slate-700 max-w-[260px]">
                              {summaryList.length > 0 ? (
                                <span className="line-clamp-2">{summaryList.join(', ')}</span>
                              ) : (
                                <span className="text-slate-400">
                                  {u.role === 'seller' ? 'No listings yet' : 'No orders yet'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-bold">
                              <span className={u.blocked ? 'text-red-700' : 'text-green-700'}>
                                {u.blocked ? 'Blocked' : 'Active'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                disabled={busyActionId === targetKey}
                                onClick={() => handleToggleBlockUser(targetKey, !u.blocked)}
                                className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
                                  u.blocked
                                    ? 'bg-green-700 text-white hover:bg-green-800'
                                    : 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                                }`}
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>{u.blocked ? 'Unblock' : 'Block'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================== d1) ORDERS ==================== */}
          {section === 'orders' && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                  {(
                    [
                      ['all', 'All Orders'],
                      ['paid_escrow', 'Paid Escrow'],
                      ['shipped', 'Shipped'],
                      ['delivered_confirmed', 'Delivered'],
                      ['refund_requested', 'Refund Claims'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setOrderFilter(id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                        orderFilter === id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search orders..."
                    className="w-full min-h-[38px] rounded-lg border border-slate-200 pl-9 pr-3 text-xs focus:border-green-700 focus:outline-none"
                  />
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No orders found for this filter.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredOrders.map((ord) => (
                    <div key={ord.id} className="p-4 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-bold text-slate-900">{ord.item_title}</span>{' '}
                          <span className="font-mono text-slate-500">({ord.reference})</span>
                        </div>
                        <span className="font-bold uppercase text-slate-700">
                          {ord.order_status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-slate-600">
                        Buyer: <strong>{ord.buyer_name}</strong> ({ord.buyer_phone || ord.buyer_email})
                        {' → '}
                        Seller: <strong>{ord.seller_name}</strong> ({ord.seller_phone})
                      </div>
                      <div className="flex flex-wrap gap-4 text-slate-600 tabular-nums pt-1">
                        <span>
                          Total Paid: <strong className="text-slate-900">{formatNaira(ord.total_amount)}</strong>
                        </span>
                        <span>
                          Commission: <strong className="text-green-700">{formatNaira(ord.admin_commission)}</strong>
                        </span>
                        <span>
                          Seller Payout: <strong className="text-slate-900">{formatNaira(ord.seller_payout)}</strong>
                        </span>
                        <span>Date: {new Date(ord.created_at).toLocaleString()}</span>
                      </div>

                      {ord.order_status === 'refund_requested' && (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                          <div className="font-bold text-amber-950">
                            Refund Claim: {ord.refund_reason}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busyActionId === ord.id}
                              onClick={() => handleResolveOrderRefund(ord.id, 'approve_full')}
                              className="min-h-[34px] px-3 rounded-lg bg-green-700 text-white font-semibold"
                            >
                              Approve Full Refund ({formatNaira(ord.total_amount)})
                            </button>
                            <button
                              type="button"
                              disabled={busyActionId === ord.id}
                              onClick={() => handleResolveOrderRefund(ord.id, 'approve_product_only')}
                              className="min-h-[34px] px-3 rounded-lg bg-amber-600 text-white font-semibold"
                            >
                              Refund Product ({formatNaira(ord.product_price)})
                            </button>
                            <button
                              type="button"
                              disabled={busyActionId === ord.id}
                              onClick={() => handleResolveOrderRefund(ord.id, 'reject')}
                              className="min-h-[34px] px-3 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== d2) PRODUCTS ==================== */}
          {section === 'products' && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                  {(
                    [
                      ['all', `All (${data.items.length})`],
                      ['active', 'Approved'],
                      ['pending', 'Pending'],
                      ['rejected', 'Rejected'],
                      ['featured', 'Featured'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setProductFilter(id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                        productFilter === id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search title, seller, school..."
                    className="w-full min-h-[38px] rounded-lg border border-slate-200 pl-9 pr-3 text-xs focus:border-green-700 focus:outline-none"
                  />
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No products found matching this filter.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredProducts.map((it) => (
                    <div
                      key={it.id}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {it.photos?.[0] ? (
                          <img
                            src={it.photos[0]}
                            alt={it.title}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{it.title}</div>
                          <div className="text-xs text-slate-600 tabular-nums">
                            <strong className="text-green-700">{formatNaira(it.price)}</strong>
                            {' · '}
                            {it.category}
                            {' · '}
                            {it.institution}
                          </div>
                          <div className="text-xs text-slate-500">
                            Seller: {it.seller_name} ({it.seller_phone || 'N/A'}) · Status:{' '}
                            <strong
                              className={
                                it.status === 'active'
                                  ? 'text-green-700'
                                  : it.status === 'pending'
                                  ? 'text-amber-700'
                                  : 'text-red-700'
                              }
                            >
                              {it.status.toUpperCase()}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {it.status !== 'active' && (
                          <button
                            type="button"
                            disabled={busyActionId === it.id}
                            onClick={() => handleApproveRejectProduct(it.id, 'approve')}
                            className="min-h-[36px] px-3 rounded-lg bg-green-700 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-green-800 whitespace-nowrap"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}
                        {it.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={busyActionId === it.id}
                            onClick={() => handleApproveRejectProduct(it.id, 'reject')}
                            className="min-h-[36px] px-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold inline-flex items-center gap-1 hover:bg-amber-100 whitespace-nowrap"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyActionId === it.id}
                          onClick={() => handleToggleFeature(it.id, !it.is_featured)}
                          className={`min-h-[36px] px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap ${
                            it.is_featured
                              ? 'bg-amber-400 border-amber-500 text-slate-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>{it.is_featured ? 'Featured' : 'Feature'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyActionId === it.id}
                          onClick={() => handleDeleteProduct(it.id)}
                          className="min-h-[36px] px-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold inline-flex items-center gap-1 hover:bg-red-100 whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== e) MESSAGES / STEALTH CHATS ==================== */}
          {section === 'messages' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <EyeOff className="w-4 h-4 text-green-700 shrink-0" />
                  <span>
                    Stealth Monitoring Active: Buyers and sellers are never notified and read receipts are never modified when you inspect chats.
                  </span>
                </div>
                <span className="tabular-nums font-semibold text-slate-700">
                  {filteredThreads.length} threads · {data.stats.total_messages} messages
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 rounded-xl border border-slate-200 bg-white overflow-hidden min-h-[540px]">
                {/* Left Thread List */}
                <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
                  <div className="p-3 border-b border-slate-200">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={chatSearch}
                        onChange={(e) => setChatSearch(e.target.value)}
                        placeholder="Search buyer, seller, product, text..."
                        className="w-full min-h-[38px] rounded-lg border border-slate-200 pl-9 pr-3 text-xs focus:border-green-700 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[520px]">
                    {filteredThreads.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No conversations recorded yet.
                      </div>
                    ) : (
                      filteredThreads.map((th) => {
                        const selected = activeThread?.thread_key === th.thread_key;
                        return (
                          <button
                            key={th.thread_key}
                            type="button"
                            onClick={() => setSelectedThreadKey(th.thread_key)}
                            className={`w-full text-left p-3.5 transition-colors space-y-1 ${
                              selected ? 'bg-green-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {th.buyer_name} ↔ {th.seller_name}
                              </span>
                              <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                                {th.message_count} msgs
                              </span>
                            </div>
                            <div className="text-xs font-medium text-green-800 truncate">
                              {th.item_title}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {th.messages[th.messages.length - 1]?.message || ''}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Transcript Viewer */}
                <div className="lg:col-span-8 flex flex-col">
                  {!activeThread ? (
                    <div className="flex-1 flex items-center justify-center p-8 text-sm text-slate-500">
                      Select a conversation to view full buyer-seller chat history.
                    </div>
                  ) : (
                    <>
                      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {activeThread.buyer_name} ({activeThread.buyer_phone || 'Buyer'}) ↔{' '}
                            {activeThread.seller_name} ({activeThread.seller_phone || 'Seller'})
                          </div>
                          <div className="text-xs text-slate-600">
                            Listing: <strong>{activeThread.item_title}</strong>
                            {activeThread.item_price > 0
                              ? ` · ${formatNaira(activeThread.item_price)}`
                              : ''}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          {activeThread.message_count} total messages
                        </div>
                      </div>

                      <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[500px] bg-white">
                        {activeThread.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`rounded-xl border px-4 py-3 text-xs space-y-1 ${
                              m.sender_role_label === 'Seller'
                                ? 'border-slate-200 bg-slate-50 ml-6'
                                : 'border-green-200 bg-green-50/60 mr-6'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                              <span className="font-bold text-slate-900">
                                {m.sender_name} · {m.sender_role_label}
                                {m.sender_phone ? ` (${m.sender_phone})` : ''}
                              </span>
                              <span className="tabular-nums">
                                {new Date(m.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-slate-900 whitespace-pre-wrap">{m.message}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== f) SETTINGS ==================== */}
          {section === 'settings' && (
            <form
              onSubmit={handleSaveSettings}
              className="rounded-xl border border-slate-200 bg-white p-6 space-y-6 max-w-3xl"
            >
              <div>
                <h2 className="text-base font-bold text-slate-900">Marketplace Settings</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure platform commission rate, site name, global storefront announcement, and payment/ad keys.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={settingsForm.site_name || ''}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, site_name: e.target.value })
                    }
                    placeholder="Afri Student Mart"
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3.5 text-sm focus:border-green-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Owner Commission (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={settingsForm.commission_percent ?? 10}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        commission_percent: Number(e.target.value),
                      })
                    }
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3.5 text-sm font-semibold tabular-nums focus:border-green-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-200">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Sitewide Announcement</div>
                    <div className="text-xs text-slate-500">
                      Show a notice bar across the top of the marketplace for buyers and sellers.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settingsForm.announcement_enabled)}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        announcement_enabled: e.target.checked,
                      })
                    }
                    className="h-5 w-5 accent-green-700"
                  />
                </label>
                <textarea
                  rows={3}
                  value={settingsForm.announcement || ''}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, announcement: e.target.value })
                  }
                  placeholder="Example: Zero delivery fees on campus orders above ₦10,000 this weekend!"
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-green-700 focus:outline-none"
                />
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  Paystack &amp; Google AdSense Integration
                </h3>

                <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3.5 cursor-pointer bg-slate-50">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Enable Google AdSense Sidebar Slot
                    </div>
                    <div className="text-xs text-slate-500">
                      Renders sidebar ads only on the public storefront (never during checkout).
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.ads_enabled}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        ads_enabled: e.target.checked,
                        interstitial_enabled: false,
                      })
                    }
                    className="h-5 w-5 accent-green-700"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Paystack Public Key
                    </label>
                    <input
                      type="text"
                      value={settingsForm.paystack_public_key || ''}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, paystack_public_key: e.target.value })
                      }
                      className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-xs font-mono focus:border-green-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Paystack Split Code
                    </label>
                    <input
                      type="text"
                      value={settingsForm.paystack_split_code || ''}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, paystack_split_code: e.target.value })
                      }
                      className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-xs font-mono focus:border-green-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Google AdSense Publisher ID
                    </label>
                    <input
                      type="text"
                      value={settingsForm.publisher_id}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, publisher_id: e.target.value })
                      }
                      placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                      className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-xs font-mono focus:border-green-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      AdSense Earnings Recorded (₦)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={settingsForm.google_ads_earnings ?? 0}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          google_ads_earnings: Number(e.target.value || 0),
                        })
                      }
                      className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm font-semibold tabular-nums focus:border-green-700 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="min-h-[44px] px-6 rounded-lg bg-green-700 text-white text-sm font-bold hover:bg-green-800 disabled:opacity-60 whitespace-nowrap"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
};
