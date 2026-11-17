import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  Check,
  MessageCircle,
  Send,
  ShieldCheck,
  Tag,
  User,
  X,
} from 'lucide-react';
import { api, formatTimeAgo } from '../lib/api';
import { useI18n } from '../lib/i18nContext';
import { supabaseClient } from '../lib/supabaseClient';
import type {
  ChatMessage,
  ChatThread,
  ItemOffer,
  MarketplaceItem,
  PublicUser,
} from '../types';

interface MessagesViewProps {
  user: PublicUser | null;
  activeChatTarget: { itemId: string; partnerId?: string } | null;
  onSelectThread: (target: { itemId: string; partnerId?: string } | null) => void;
  onRequireAuth: () => void;
  onUnreadCountChange: (count: number) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  user,
  activeChatTarget,
  onSelectThread,
  onRequireAuth,
  onUnreadCountChange,
}) => {
  const { formatMoney, t } = useI18n();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);

  const [chatItem, setChatItem] = useState<MarketplaceItem | null>(null);
  const [chatPartner, setChatPartner] = useState<PublicUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Active Offer / Haggle for this item thread
  const [offers, setOffers] = useState<ItemOffer[]>([]);
  const [counterDraft, setCounterDraft] = useState<Record<string, string>>({});
  const [offerBusyId, setOfferBusyId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    if (!user) return;
    setLoadingThreads(true);
    try {
      const res = await api.getThreads();
      setThreads(res.threads);
      const totalUnread = res.threads.reduce((acc, t) => acc + t.unread_count, 0);
      onUnreadCountChange(totalUnread);
    } catch {
      // Ignore transient errors
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadOffersForThread = (itemId: string) => {
    if (!user || itemId.startsWith('service:') || itemId.startsWith('shop:')) {
      setOffers([]);
      return;
    }
    api
      .getOffers(itemId)
      .then((res) => setOffers(res.offers))
      .catch(() => {});
  };

  const loadConversation = async (itemId: string, partnerId?: string) => {
    if (!user) return;
    setLoadingChat(true);
    setError('');
    try {
      const res = await api.getThreadMessages(itemId, partnerId);
      setChatItem(res.item);
      setChatPartner(res.partner);
      setMessages(res.messages);
      loadOffersForThread(itemId);
      loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open chat.');
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadThreads();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user && activeChatTarget) {
      loadConversation(activeChatTarget.itemId, activeChatTarget.partnerId);
    } else {
      setChatItem(null);
      setChatPartner(null);
      setMessages([]);
      setOffers([]);
    }
  }, [user?.id, activeChatTarget?.itemId, activeChatTarget?.partnerId]);

  // Real-time Supabase subscription + fallback polling while chat view is open
  useEffect(() => {
    if (!user) return;

    const refreshActive = () => {
      if (activeChatTarget) {
        api
          .getThreadMessages(activeChatTarget.itemId, activeChatTarget.partnerId)
          .then((res) => {
            setMessages(res.messages);
          })
          .catch(() => {});
      } else {
        loadThreads();
      }
    };

    const channel = supabaseClient
      ? supabaseClient
          .channel(`messages-live-${user.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            () => {
              refreshActive();
            }
          )
          .subscribe()
      : null;

    const interval = setInterval(refreshActive, 3500);
    return () => {
      clearInterval(interval);
      if (channel && supabaseClient) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, [user?.id, activeChatTarget?.itemId, activeChatTarget?.partnerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-4 my-6">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-100 text-green-800 flex items-center justify-center">
          <MessageCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">In-App Campus Messages</h2>
        <p className="text-sm text-slate-600">
          Sign in to chat privately with buyers and sellers in your school. {t('chat_safety')}
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-bold text-base hover:bg-green-800"
        >
          Login or Sign Up to Chat
        </button>
      </div>
    );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatTarget || !draft.trim() || sending) return;
    const text = draft.trim();
    setDraft('');
    setSending(true);
    setError('');
    try {
      const res = await api.sendMessage({
        item_id: activeChatTarget.itemId,
        partner_id: activeChatTarget.partnerId,
        message: text,
      });
      setMessages((prev) => [...prev, res.message]);
      loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message failed to send.');
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const handleOfferAction = async (
    offer: ItemOffer,
    action: 'accept' | 'reject' | 'counter'
  ) => {
    if (!activeChatTarget) return;
    setError('');
    setOfferBusyId(offer.id);
    try {
      const counterVal = counterDraft[offer.id]
        ? Number(counterDraft[offer.id])
        : Math.round(((offer.item_price || offer.offered_price) + offer.offered_price) / 2);
      const res = await api.respondToOffer(offer.id, {
        action,
        ...(action === 'counter' ? { counter_price: counterVal } : {}),
      });
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? res.offer : o)));
      loadConversation(activeChatTarget.itemId, activeChatTarget.partnerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update offer.');
    } finally {
      setOfferBusyId(null);
    }
  };

  const handleBlockPartner = async () => {
    if (!chatPartner) return;
    try {
      const res = await api.blockUser(chatPartner.id, 'Blocked from buyer-seller chat');
      setNotice(
        res.auto_suspended
          ? 'User blocked and automatically suspended after 3 reports.'
          : 'User reported and blocked. Owner will review.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not block user.');
    }
  };

  // Active Chat Conversation View (WhatsApp style)
  if (activeChatTarget) {
    return (
      <div className="mx-auto max-w-3xl flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Partner header */}
        <div className="flex items-center justify-between gap-2 bg-green-800 text-white px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => onSelectThread(null)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-green-700 shrink-0"
              aria-label="Back to chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full bg-yellow-400 text-green-950 font-bold flex items-center justify-center overflow-hidden shrink-0">
              {chatPartner?.profile_pic ? (
                <img src={chatPartner.profile_pic} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{chatPartner?.full_name || 'Loading...'}</div>
              <div className="text-[11px] text-yellow-200 truncate">
                {chatPartner?.institution || 'Campus Member'}
              </div>
            </div>
          </div>
          {chatPartner && (
            <button
              type="button"
              onClick={handleBlockPartner}
              className="min-h-[40px] px-3 rounded-xl bg-green-900/70 hover:bg-red-700 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Block</span>
            </button>
          )}
        </div>

        {/* Attached Item Card at Top */}
        {chatItem && (
          <div className="flex items-center gap-3 border-b border-slate-200 bg-green-50/70 px-4 py-2.5">
            {chatItem.photos?.[0] && (
              <img
                src={chatItem.photos[0]}
                alt={chatItem.title}
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-900 truncate">{chatItem.title}</div>
              <div className="text-sm font-extrabold text-green-800 tabular-nums">
                {formatMoney(chatItem.price, chatItem.country)} · <span className="font-semibold text-xs text-slate-600">{chatItem.condition}</span>
              </div>
            </div>
          </div>
        )}

        {/* Active Make Offer / Haggle Bar (Seller: Accept / Reject / Counter; Buyer: Accept Counter) */}
        {offers.length > 0 && (() => {
          const relevantOffers = chatPartner
            ? offers.filter(
                (o) => o.buyer_id === chatPartner.id || o.seller_id === chatPartner.id
              )
            : offers;
          const activeOffer = relevantOffers[0];
          if (!activeOffer) return null;
          const isSeller = Boolean(activeOffer.is_seller);
          const busy = offerBusyId === activeOffer.id;

          return (
            <div className="border-b border-orange-200 bg-orange-50/90 px-4 py-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-extrabold text-orange-900">
                  <Tag className="w-3.5 h-3.5 text-orange-600" />
                  Offer: {formatMoney(activeOffer.offered_price, chatItem?.country)}
                  {activeOffer.counter_price && (
                    <span className="text-green-800">
                      → Counter: {formatMoney(activeOffer.counter_price, chatItem?.country)}
                    </span>
                  )}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase ${
                    activeOffer.status === 'accepted'
                      ? 'bg-green-700 text-white'
                      : activeOffer.status === 'rejected'
                      ? 'bg-red-600 text-white'
                      : activeOffer.status === 'countered'
                      ? 'bg-blue-600 text-white'
                      : 'bg-orange-500 text-white'
                  }`}
                >
                  {activeOffer.status}
                </span>
              </div>

              {isSeller && activeOffer.status === 'pending' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleOfferAction(activeOffer, 'accept')}
                    className="min-h-[34px] px-3 rounded-lg bg-green-700 text-white text-xs font-extrabold inline-flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleOfferAction(activeOffer, 'reject')}
                    className="min-h-[34px] px-3 rounded-lg bg-red-600 text-white text-xs font-extrabold inline-flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <div className="flex items-center gap-1 flex-1 min-w-[150px]">
                    <input
                      type="number"
                      min={100}
                      value={
                        counterDraft[activeOffer.id] ??
                        String(
                          Math.round(
                            ((activeOffer.item_price || activeOffer.offered_price) +
                              activeOffer.offered_price) /
                              2
                          )
                        )
                      }
                      onChange={(e) =>
                        setCounterDraft((p) => ({ ...p, [activeOffer.id]: e.target.value }))
                      }
                      className="w-24 min-h-[34px] rounded-lg border border-orange-300 bg-white px-2 text-xs font-bold tabular-nums"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleOfferAction(activeOffer, 'counter')}
                      className="min-h-[34px] px-2.5 rounded-lg bg-orange-500 text-white text-xs font-extrabold whitespace-nowrap"
                    >
                      Counter
                    </button>
                  </div>
                </div>
              )}

              {!isSeller && activeOffer.status === 'countered' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleOfferAction(activeOffer, 'accept')}
                    className="min-h-[34px] px-3 rounded-lg bg-green-700 text-white text-xs font-extrabold inline-flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      Accept Counter (
                      {formatMoney(activeOffer.counter_price || activeOffer.offered_price, chatItem?.country)})
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleOfferAction(activeOffer, 'reject')}
                    className="min-h-[34px] px-3 rounded-lg border border-red-300 bg-white text-red-700 text-xs font-extrabold"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Safety strip */}
        <div className="bg-green-50 border-b border-green-200 px-4 py-2.5 text-xs text-green-950 space-y-0.5">
          <div className="flex items-center gap-2 font-extrabold">
            <ShieldCheck className="w-4 h-4 text-green-800 shrink-0" />
            <span>{t('chat_safety')}</span>
          </div>
          <p className="text-[11px] text-green-900 pl-6">
            Normal phone &amp; WhatsApp calls allowed. Account numbers are blocked for your safety.
          </p>
        </div>

        {notice && (
          <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-xs font-semibold text-green-900">
            {notice}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs font-semibold text-red-800">
            {error}
          </div>
        )}

        {/* Messages body */}
        <div className="h-[46vh] sm:h-[420px] overflow-y-auto p-4 space-y-2.5 bg-slate-50">
          {loadingChat && messages.length === 0 ? (
            <div className="text-center text-sm text-slate-500 py-8">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-slate-500 py-8">
              Say hello! Ask if the item is still available and arrange a safe campus meeting spot.
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender_is_me ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                    m.sender_is_me
                      ? 'bg-green-700 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm'
                  }`}
                >
                  <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">{m.message}</p>
                  <div
                    className={`mt-1 text-[10px] ${
                      m.sender_is_me ? 'text-green-100 text-right' : 'text-slate-400'
                    }`}
                  >
                    {formatTimeAgo(m.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-3 flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('type_message')}
            className="flex-1 min-h-[48px] rounded-xl border border-slate-300 px-4 text-base focus:border-green-700 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="min-h-[48px] min-w-[52px] rounded-xl bg-green-700 text-white flex items-center justify-center hover:bg-green-800 disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    );
  }

  // Threads Inbox View
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{t('nav_chat')}</h2>
            <p className="text-xs font-bold text-green-800 mt-0.5">{t('chat_safety')}</p>
          </div>
        </div>

        {loadingThreads && threads.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading your chats...</div>
        ) : threads.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <MessageCircle className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-base font-bold text-slate-800">No messages yet</p>
            <p className="text-sm text-slate-500">
              Tap &ldquo;Chat Seller&rdquo; on any item in the marketplace to start negotiating safely.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {threads.map((t) => (
              <button
                key={t.thread_key}
                type="button"
                onClick={() =>
                  onSelectThread({
                    itemId: t.item_id,
                    partnerId: t.is_seller ? t.partner_id : undefined,
                  })
                }
                className="w-full text-left px-4 py-3.5 flex items-center gap-3.5 hover:bg-green-50/50 transition-colors min-h-[72px]"
              >
                <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  {t.item_photo ? (
                    <img src={t.item_photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 truncate">{t.partner_name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{formatTimeAgo(t.last_message_at)}</span>
                  </div>
                  <div className="text-xs font-semibold text-green-800 truncate">
                    {t.item_title} · {formatMoney(t.item_price)}
                  </div>
                  <p className="text-sm text-slate-600 truncate mt-0.5">{t.last_message}</p>
                </div>
                {t.unread_count > 0 && (
                  <span className="min-w-[24px] h-6 px-2 rounded-full bg-green-700 text-white text-xs font-extrabold flex items-center justify-center shrink-0 tabular-nums">
                    {t.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
