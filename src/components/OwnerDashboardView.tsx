import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  Banknote,
  Building2,
  CheckCircle2,
  Database,
  Flag,
  Megaphone,
  MessageSquare,
  Package,
  Shield,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { api, formatNaira } from '../lib/api';
import { PAYSTACK_PUBLIC_KEY_PLACEHOLDER, PAYSTACK_SPLIT_CODE_PLACEHOLDER } from '../lib/paystack';
import type { AdSettings, OwnerDashboardData } from '../types';

interface OwnerDashboardViewProps {
  onBack: () => void;
  onAdsUpdated: (settings: AdSettings) => void;
}

type OwnerTab = 'overview' | 'orders' | 'items' | 'users' | 'reports' | 'ads';

export const OwnerDashboardView: React.FC<OwnerDashboardViewProps> = ({
  onBack,
  onAdsUpdated,
}) => {
  const [tab, setTab] = useState<OwnerTab>('overview');
  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [adForm, setAdForm] = useState<AdSettings>({
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
  });
  const [loading, setLoading] = useState(true);
  const [savingAds, setSavingAds] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getOwnerDashboard();
      setData(res);
      setAdForm(res.ad_settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Access denied or failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleToggleFeature = async (itemId: string, featured: boolean) => {
    await api.ownerFeatureItem(itemId, featured);
    showToast(featured ? 'Item approved as Featured.' : 'Item removed from Featured.');
    fetchDashboard();
  };

  const handleDeleteItem = async (itemId: string) => {
    await api.ownerDeleteItem(itemId);
    showToast('Item deleted from marketplace.');
    fetchDashboard();
  };

  const handleToggleBlockUser = async (phone: string, blocked: boolean) => {
    await api.ownerBlockUser(phone, blocked);
    showToast(blocked ? `User ${phone} blocked.` : `User ${phone} unblocked.`);
    fetchDashboard();
  };

  const handleResolveReport = async (reportId: string) => {
    await api.ownerResolveReport(reportId);
    showToast('Report marked resolved.');
    fetchDashboard();
  };

  const handleResolveOrderRefund = async (
    orderId: string,
    decision: 'approve_full' | 'approve_product_only' | 'reject'
  ) => {
    await api.ownerResolveOrderRefund(orderId, decision);
    showToast(
      decision === 'reject'
        ? 'Refund request declined; order returned to active fulfillment.'
        : 'Refund approved! Buyer will be credited via Paystack within 3-5 working days.'
    );
    fetchDashboard();
  };

  const handleSaveAds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAds(true);
    try {
      const res = await api.ownerSaveAdSettings(adForm);
      onAdsUpdated(res.settings);
      showToast('Google AdSense settings saved.');
      fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save AdSense settings.');
    } finally {
      setSavingAds(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Loading Private Owner Dashboard...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
        <p className="text-base font-bold text-red-900">{error}</p>
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-5 rounded-xl bg-green-800 text-white text-sm font-bold"
        >
          Back to Marketplace
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      {/* Header */}
      <div className="rounded-2xl bg-green-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-green-800 hover:bg-green-700 flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-400" />
              <h1 className="text-xl font-extrabold">Private Owner Dashboard</h1>
            </div>
            <p className="text-xs text-green-100 mt-0.5">
              JOKEY PERKY GROUP · Support: afristudentmartsupportjpg@gmail.com · Database:{' '}
              <span className="font-bold text-yellow-300 uppercase">{data.storage_mode}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchDashboard}
          className="min-h-[44px] px-4 rounded-xl bg-yellow-400 text-green-950 font-bold text-sm hover:bg-yellow-300 shrink-0"
        >
          Refresh Metrics
        </button>
      </div>

      {toast && (
        <div className="rounded-xl bg-green-50 border border-green-300 px-4 py-3 text-sm font-bold text-green-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-700" />
          <span>{toast}</span>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Users', value: data.stats.total_users, icon: Users },
          { label: 'Buyers', value: data.stats.total_buyers, icon: Users },
          { label: 'Sellers', value: data.stats.total_sellers, icon: Users },
          { label: 'Active Items', value: data.stats.total_items, icon: Package },
          { label: 'Messages', value: data.stats.total_messages, icon: MessageSquare },
          { label: 'Institutions', value: data.stats.total_institutions, icon: Building2 },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>{kpi.label}</span>
              <kpi.icon className="w-4 h-4 text-green-700" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Admin Only Separate Finance Summary: Total Sales, My 10% Earnings, Google Ads Earnings */}
      {data.finance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold text-slate-600">Total Sales (Paystack)</div>
            <div className="mt-1.5 text-2xl font-extrabold text-slate-900 tabular-nums">
              {formatNaira(data.finance.total_sales)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              {data.finance.total_orders} order(s) · Seller 93%: {formatNaira(data.finance.total_seller_payouts)}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-green-700 bg-green-50 p-4">
            <div className="flex items-center justify-between text-xs font-bold text-green-900">
              <span>My 7% Earnings (Paystack Split)</span>
              <Banknote className="w-4 h-4 text-green-700" />
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-green-900 tabular-nums">
              {formatNaira(data.finance.my_10_percent_earnings)}
            </div>
            <div className="text-[11px] text-green-800 mt-0.5 tabular-nums">
              7% Split: {formatNaira(data.finance.total_admin_commission)} · Promo Fees: {formatNaira(data.finance.promotion_fees_total)}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-blue-600 bg-blue-50 p-4">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900">
              <span>Google Ads Earnings (Separate)</span>
              <Megaphone className="w-4 h-4 text-blue-700" />
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-blue-900 tabular-nums">
              {formatNaira(data.finance.google_ads_earnings)}
            </div>
            <div className="text-[11px] text-blue-800 mt-0.5">
              Tracked separately from marketplace sales
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold text-slate-600">Escrow Held / Refunds</div>
            <div className="mt-1.5 text-2xl font-extrabold text-orange-600 tabular-nums">
              {formatNaira(data.finance.escrow_held_amount)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              Pending refunds: {data.finance.pending_refunds_count} · Delivery fees: {formatNaira(data.finance.total_delivery_fees)}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'orders', label: `Orders & 7% Split (${data.orders?.length || 0})` },
            { id: 'overview', label: 'Institutions' },
            { id: 'items', label: `Items (${data.items.length})` },
            { id: 'users', label: `Users (${data.users.length})` },
            { id: 'reports', label: `Reports (${data.stats.open_reports} open)` },
            { id: 'ads', label: 'Google AdSense & Paystack Split' },
          ] as Array<{ id: OwnerTab; label: string }>
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-h-[44px] px-4 rounded-xl text-sm font-bold whitespace-nowrap shrink-0 transition-colors ${
              tab === t.id
                ? 'bg-green-800 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Orders & 10% Paystack Split + Refunds Tab (Admin Only) */}
      {tab === 'orders' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Paystack Split Orders (Owner 7% + Delivery Fee / Seller 93%)
            </h2>
            <p className="text-xs text-slate-600">
              Owner keeps 7% commission + full delivery fee. Seller receives 93% of item price after delivery confirmation.
            </p>
          </div>
          {!data.orders || data.orders.length === 0 ? (
            <p className="text-sm text-slate-500">No Paystack checkout orders placed yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.orders.map((ord) => (
                <div key={ord.id} className="py-4 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-extrabold text-slate-900">{ord.item_title}</span>{' '}
                      <span className="font-mono text-slate-500">({ord.reference})</span>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 font-extrabold uppercase text-slate-800">
                      {ord.order_status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Buyer: <strong>{ord.buyer_name}</strong> ({ord.buyer_phone}) → Seller:{' '}
                    <strong>{ord.seller_name}</strong> ({ord.seller_phone})
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-slate-50 p-2.5 tabular-nums">
                    <div>
                      <span className="text-slate-500">Total Paid:</span>{' '}
                      <strong>{formatNaira(ord.total_amount)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Owner (7% + Del):</span>{' '}
                      <strong className="text-green-800">{formatNaira(ord.admin_total_kept)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Seller 93% Split:</span>{' '}
                      <strong>{formatNaira(ord.seller_payout)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Split / Subaccount:</span>{' '}
                      <strong className="font-mono text-[11px]">
                        {ord.paystack_split_code || ord.seller_subaccount_code || 'Split Pending'}
                      </strong>
                    </div>
                  </div>
                  {ord.order_status === 'refund_requested' && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
                      <div className="font-extrabold text-orange-950">
                        Refund Claim: {ord.refund_reason}
                      </div>
                      {ord.refund_photo && (
                        <img
                          src={ord.refund_photo}
                          alt="Refund proof"
                          className="w-24 h-24 rounded-lg object-cover border border-orange-300"
                        />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleResolveOrderRefund(ord.id, 'approve_full')}
                          className="min-h-[36px] px-3 rounded-lg bg-green-700 text-white font-bold"
                        >
                          Approve 100% Refund ({formatNaira(ord.total_amount)})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveOrderRefund(ord.id, 'approve_product_only')}
                          className="min-h-[36px] px-3 rounded-lg bg-orange-600 text-white font-bold"
                        >
                          Refund Product Only ({formatNaira(ord.product_price)})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveOrderRefund(ord.id, 'reject')}
                          className="min-h-[36px] px-3 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold"
                        >
                          Decline Claim
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

      {/* Tab 1: Institutions */}
      {tab === 'overview' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">All Active Institutions</h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Database className="w-4 h-4 text-green-700" />
              {data.storage_mode === 'supabase' ? 'Connected to Supabase' : 'Local Persistent DB (Ready for Supabase env)'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold text-slate-500">
                <tr>
                  <th className="py-2.5 pr-4">Institution</th>
                  <th className="py-2.5 px-4 text-right">Users</th>
                  <th className="py-2.5 pl-4 text-right">Active Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.institutions.map((inst) => (
                  <tr key={inst.name}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{inst.name}</td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums">{inst.users}</td>
                    <td className="py-3 pl-4 text-right font-bold text-green-800 tabular-nums">
                      {inst.items}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Items */}
      {tab === 'items' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900">Manage Marketplace Items</h2>
          <div className="divide-y divide-slate-100">
            {data.items.map((it) => (
              <div key={it.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {it.photos?.[0] && (
                    <img
                      src={it.photos[0]}
                      alt=""
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{it.title}</div>
                    <div className="text-xs text-slate-600">
                      <span className="font-bold text-green-800 tabular-nums">{formatNaira(it.price)}</span>{' '}
                      · {it.institution} · Seller: {it.seller_name} ({it.seller_phone})
                    </div>
                    <div className="text-xs text-slate-500">
                      Status: <strong className={it.status === 'active' ? 'text-green-700' : 'text-red-700'}>{it.status}</strong> · Reports: <span className="tabular-nums font-bold">{it.report_count}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleFeature(it.id, !it.is_featured)}
                    className={`min-h-[40px] px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border ${
                      it.is_featured
                        ? 'bg-yellow-400 border-yellow-500 text-green-950'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-yellow-50'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>{it.is_featured ? 'Featured' : 'Approve Feature'}</span>
                  </button>
                  {it.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(it.id)}
                      className="min-h-[40px] px-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Users */}
      {tab === 'users' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900">Registered Users</h2>
          <div className="divide-y divide-slate-100">
            {data.users.map((u) => (
              <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900">
                    {u.full_name}{' '}
                    <span className="text-xs font-semibold text-green-800 uppercase">({u.role})</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Phone: <span className="font-mono font-semibold">{u.phone_number}</span> · {u.institution} · {u.campus}
                  </div>
                  <div className="text-xs text-slate-500">
                    Blocks: <span className="tabular-nums font-bold">{u.block_count}</span> · Status:{' '}
                    <strong className={u.blocked ? 'text-red-700' : 'text-green-700'}>
                      {u.blocked ? 'BLOCKED' : 'Active'}
                    </strong>
                  </div>
                </div>
                {u.role !== 'owner' && (
                  <button
                    type="button"
                    onClick={() => handleToggleBlockUser(u.phone_number, !u.blocked)}
                    className={`min-h-[40px] px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 ${
                      u.blocked
                        ? 'bg-green-700 text-white hover:bg-green-800'
                        : 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{u.blocked ? 'Unblock User' : 'Block User'}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Reports */}
      {tab === 'reports' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900">Reports & Abuse Queue</h2>
          {data.reports.length === 0 ? (
            <p className="text-sm text-slate-500">No reports filed yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.reports.map((r) => {
                const isAcctBlock = (r.reason || '').startsWith('Account Number Blocked');
                return (
                  <div
                    key={r.id}
                    className={`py-3 px-2 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isAcctBlock && !r.resolved ? 'bg-red-50/60' : ''
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
                        <Flag className="w-4 h-4 text-red-600 shrink-0" />
                        <span>
                          {r.target_type.toUpperCase()}: {r.target_label}
                        </span>
                        {isAcctBlock && (
                          <span className="rounded-md bg-red-100 border border-red-200 px-2 py-0.5 text-[11px] font-extrabold text-red-800">
                            Account Number Blocked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Reason: {r.reason} · Reporter / User: {r.reporter_phone}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {r.resolved ? (
                        <span className="text-xs font-bold text-green-700">Resolved</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleResolveReport(r.id)}
                          className="min-h-[40px] px-4 rounded-xl bg-green-700 text-white text-xs font-bold hover:bg-green-800"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Google AdSense (Sidebar/Mobile Bottom Only) & Paystack Split Settings */}
      {tab === 'ads' && (
        <form onSubmit={handleSaveAds} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
          <div className="flex items-start gap-3">
            <Megaphone className="w-6 h-6 text-green-800 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Google AdSense (Sidebar Only) &amp; Paystack Split Configuration
              </h2>
              <p className="text-sm text-slate-600">
                Google AdSense renders ONLY in the Right Sidebar on desktop and Bottom of Page on mobile — ZERO pop-ups and ZERO ads on Checkout. Your <span className="font-mono font-bold">/ads.txt</span> verification file is active.
              </p>
            </div>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4 cursor-pointer bg-slate-50">
            <div>
              <div className="text-sm font-bold text-slate-900">Enable Google AdSense Sidebar Slot</div>
              <div className="text-xs text-slate-500">
                Shows Right Sidebar on desktop &amp; Bottom of Page on mobile (never blocks Buy/Search or Checkout)
              </div>
            </div>
            <input
              type="checkbox"
              checked={adForm.ads_enabled}
              onChange={(e) => setAdForm({ ...adForm, ads_enabled: e.target.checked, interstitial_enabled: false })}
              className="h-6 w-6 accent-green-700"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Google AdSense Publisher ID
              </label>
              <input
                type="text"
                value={adForm.publisher_id}
                onChange={(e) => setAdForm({ ...adForm, publisher_id: e.target.value })}
                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-sm font-mono focus:border-green-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Sidebar Ad Unit ID
              </label>
              <input
                type="text"
                value={adForm.sidebar_unit_id ?? adForm.banner_unit_id ?? ''}
                onChange={(e) =>
                  setAdForm({
                    ...adForm,
                    sidebar_unit_id: e.target.value,
                    banner_unit_id: e.target.value,
                  })
                }
                placeholder="1234567890"
                className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-sm font-mono focus:border-green-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Google Ads Earnings Recorded (₦)
              </label>
              <input
                type="number"
                min={0}
                value={adForm.google_ads_earnings ?? 0}
                onChange={(e) =>
                  setAdForm({ ...adForm, google_ads_earnings: Number(e.target.value || 0) })
                }
                className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-sm font-bold tabular-nums focus:border-green-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Paystack Public Key
              </label>
              <input
                type="text"
                value={adForm.paystack_public_key || PAYSTACK_PUBLIC_KEY_PLACEHOLDER}
                onChange={(e) => setAdForm({ ...adForm, paystack_public_key: e.target.value })}
                placeholder={PAYSTACK_PUBLIC_KEY_PLACEHOLDER}
                className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-sm font-mono focus:border-green-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Paystack Split Code (7% Owner / 93% Seller)
              </label>
              <input
                type="text"
                value={adForm.paystack_split_code || PAYSTACK_SPLIT_CODE_PLACEHOLDER}
                onChange={(e) => setAdForm({ ...adForm, paystack_split_code: e.target.value })}
                placeholder={PAYSTACK_SPLIT_CODE_PLACEHOLDER}
                className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-sm font-mono focus:border-green-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Admin Paystack Subaccount Code
              </label>
              <input
                type="text"
                value={adForm.admin_subaccount_code || ''}
                onChange={(e) => setAdForm({ ...adForm, admin_subaccount_code: e.target.value })}
                placeholder="ACCT_XXXXXXXXXXXX"
                className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-sm font-mono focus:border-green-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-950">
            AdSense Verification File:{' '}
            <a
              href="/ads.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-bold underline text-green-800"
            >
              /ads.txt
            </a>{' '}
            is served live for Google AdSense approval.
          </div>

          <button
            type="submit"
            disabled={savingAds}
            className="min-h-[50px] px-6 rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 disabled:opacity-60"
          >
            {savingAds ? 'Saving...' : 'Save AdSense & Paystack Settings'}
          </button>
        </form>
      )}
    </div>
  );
};
