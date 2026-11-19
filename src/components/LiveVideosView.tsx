import React, { useCallback, useEffect, useState } from 'react';
import {
  Globe,
  Loader2,
  Plus,
  Radio,
  Square,
  Store,
  Video,
  X,
} from 'lucide-react';
import { COUNTRY_LANGUAGE_CONFIGS, getCountryConfig, getCountryDisplayName } from '../data/languages';
import { api, compressAndValidateVideo, formatTimeAgo } from '../lib/api';
import { useI18n } from '../lib/i18nContext';
import { supabase } from '../lib/supabaseClient';
import type { LiveVideo, PublicUser, TraderShop } from '../types';

interface LiveVideosViewProps {
  user: PublicUser | null;
  onRequireAuth: () => void;
  onNotice: (msg: string) => void;
}

export const LiveVideosView: React.FC<LiveVideosViewProps> = ({
  user,
  onRequireAuth,
  onNotice,
}) => {
  const { country: globalCountry } = useI18n();
  const [filterCountry, setFilterCountry] = useState<string>(
    globalCountry || user?.country || 'All'
  );
  const [videos, setVideos] = useState<LiveVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [myShop, setMyShop] = useState<TraderShop | null>(null);

  const [showGoLive, setShowGoLive] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [streamCountry, setStreamCountry] = useState(
    user?.country || (globalCountry === 'All' ? 'Nigeria' : globalCountry)
  );
  const [videoUrl, setVideoUrl] = useState('');
  const [compressingVideo, setCompressingVideo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    setFilterCountry(globalCountry || 'All');
  }, [globalCountry]);

  useEffect(() => {
    if (user?.country) {
      setStreamCountry(user.country);
    }
    if (user) {
      api
        .getMyShop()
        .then((res) => setMyShop(res.shop))
        .catch(() => {});
    } else {
      setMyShop(null);
    }
  }, [user?.id, user?.country]);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLiveVideos({
        country: filterCountry === 'All' ? undefined : filterCountry,
      });
      setVideos(res.videos);
    } catch {
      // Keep current list
    } finally {
      setLoading(false);
    }
  }, [filterCountry]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    const channel = supabase
      .channel('live-videos-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_videos' },
        () => {
          void loadVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadVideos]);

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrMsg('');
    setCompressingVideo(true);
    try {
      const encoded = await compressAndValidateVideo(file, 15);
      setVideoUrl(encoded);
      onNotice('Live video clip ready.');
    } catch (err) {
      setErrMsg(
        err instanceof Error ? err.message : 'Could not process video (max 720p, 15s, 5MB).'
      );
    } finally {
      setCompressingVideo(false);
    }
    e.target.value = '';
  };

  const handleStartLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!title.trim()) {
      setErrMsg('Enter a title for your live showcase.');
      return;
    }
    if (!videoUrl.trim()) {
      setErrMsg('Record/upload a product video clip or paste a live stream URL.');
      return;
    }
    setErrMsg('');
    setSubmitting(true);
    try {
      const res = await api.startLiveVideo({
        shop_id: myShop?.id,
        shop_name: myShop?.shop_name || user.shop_name,
        title: title.trim(),
        description: description.trim(),
        video_url: videoUrl.trim(),
        country: streamCountry,
      });
      setVideos((prev) => [res.video, ...prev]);
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setShowGoLive(false);
      onNotice('You are now LIVE on Afri Student Mart!');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Could not start live video.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndLive = async (liveId: string) => {
    setErrMsg('');
    setEndingId(liveId);
    try {
      await api.endLiveVideo(liveId);
      setVideos((prev) => prev.filter((v) => v.id !== liveId));
      onNotice('Live stream ended.');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Could not end live stream.');
    } finally {
      setEndingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-r from-green-800 via-green-700 to-orange-600 text-white p-5 sm:p-7 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-200">
              Live Video Product Showcases
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-0.5">
              Live Videos Across Africa
            </h1>
            <p className="text-sm text-green-50 mt-1">
              Watch sellers demonstrate real products live before you buy, or go live from your shop.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                onRequireAuth();
              } else {
                setShowGoLive((prev) => !prev);
              }
            }}
            className="min-h-[44px] px-4 rounded-xl bg-white text-green-900 font-extrabold text-sm inline-flex items-center gap-1.5 hover:bg-green-50 shrink-0"
          >
            <Plus className="w-4 h-4 text-orange-600" />
            <span>{showGoLive ? 'Close Form' : 'Go Live Now'}</span>
          </button>
        </div>

        {/* Country Filter + All Africa Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterCountry('All')}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 border transition-colors ${
              filterCountry === 'All'
                ? 'bg-yellow-400 text-green-950 border-yellow-400'
                : 'bg-white/15 text-white border-white/30 hover:bg-white/25'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>All Africa</span>
          </button>

          <select
            aria-label="Filter live videos by country"
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="min-h-[40px] rounded-xl border border-white/30 bg-white text-slate-900 px-3 text-xs sm:text-sm font-bold"
          >
            <option value="All">All Africa</option>
            {COUNTRY_LANGUAGE_CONFIGS.map((cfg) => (
              <option key={cfg.country} value={cfg.country}>
                {cfg.flag} {getCountryDisplayName(cfg.country)}
              </option>
            ))}
          </select>
        </div>
      </section>

      {errMsg && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-800">
          {errMsg}
        </div>
      )}

      {/* Go Live Form */}
      {showGoLive && user && (
        <form
          onSubmit={handleStartLive}
          className="rounded-2xl border-2 border-green-700 bg-white p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-extrabold text-slate-900">Start Live Showcase</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowGoLive(false)}
              className="p-1 text-slate-400 hover:text-slate-700"
              aria-label="Close go live form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Live Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fresh Sneakers & Backpacks Live Demo"
                className="w-full min-h-[46px] rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
              <select
                value={streamCountry}
                onChange={(e) => setStreamCountry(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold"
              >
                {COUNTRY_LANGUAGE_CONFIGS.map((cfg) => (
                  <option key={cfg.country} value={cfg.country}>
                    {cfg.flag} {getCountryDisplayName(cfg.country)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              What are you showing live?
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Prices, sizes, pickup area or delivery info..."
              className="w-full rounded-xl border border-slate-300 p-3 text-sm"
            />
          </div>

          <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">
                Record / Upload Live Video or Paste Stream URL
              </span>
              <label className="min-h-[38px] px-3 rounded-lg bg-green-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-green-800">
                <Video className="w-4 h-4" />
                <span>{compressingVideo ? 'Compressing...' : 'Record / Upload Clip'}</span>
                <input
                  type="file"
                  accept="video/*"
                  capture="environment"
                  disabled={compressingVideo}
                  onChange={handleVideoFile}
                  className="hidden"
                />
              </label>
            </div>

            <input
              type="text"
              value={videoUrl.startsWith('data:') ? '' : videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Or paste live stream / MP4 video URL (https://...)"
              className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-sm"
            />

            {compressingVideo && (
              <div className="flex items-center gap-2 text-xs font-bold text-green-800">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Preparing live video...</span>
              </div>
            )}

            {videoUrl && (
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-52 object-contain"
                />
                <button
                  type="button"
                  onClick={() => setVideoUrl('')}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-bold"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || compressingVideo}
            className="w-full min-h-[48px] rounded-xl bg-red-600 text-white font-extrabold text-sm hover:bg-red-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            <Radio className="w-4 h-4" />
            <span>{submitting ? 'Starting Live Stream...' : 'Publish Live Stream Now'}</span>
          </button>
        </form>
      )}

      {/* Active Live Videos Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Live Now {filterCountry === 'All' ? '(All Africa)' : `in ${getCountryDisplayName(filterCountry)}`}
          </h2>
          <span className="text-xs font-bold text-slate-500 tabular-nums">
            {videos.length} live stream{videos.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3">
            <Video className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-base font-bold text-slate-900">
              No live streams right now {filterCountry === 'All' ? '' : `in ${getCountryDisplayName(filterCountry)}`}
            </p>
            <p className="text-sm text-slate-500">
              Switch to All Africa or start a live showcase of your products!
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {filterCountry !== 'All' && (
                <button
                  type="button"
                  onClick={() => setFilterCountry('All')}
                  className="min-h-[42px] px-4 rounded-xl border border-slate-300 bg-slate-50 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                >
                  Show All Africa
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    onRequireAuth();
                  } else {
                    setShowGoLive(true);
                  }
                }}
                className="min-h-[42px] px-4 rounded-xl bg-green-700 text-white text-xs font-extrabold hover:bg-green-800"
              >
                Go Live Free
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((v) => {
              const cCfg = getCountryConfig(v.country);
              const isMine = Boolean(user && user.id === v.seller_id);
              return (
                <article
                  key={v.id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between shadow-xs"
                >
                  <div className="relative bg-black aspect-video">
                    {v.video_url ? (
                      <video
                        src={v.video_url}
                        controls
                        playsInline
                        preload="metadata"
                        poster={v.thumbnail_url || undefined}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/70 text-xs">
                        Stream URL unavailable
                      </div>
                    )}
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-extrabold text-white">
                      <Radio className="w-3 h-3" />
                      LIVE
                    </span>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-base font-extrabold text-slate-900 line-clamp-1">
                          {v.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-0.5">
                          <span className="font-bold text-slate-800">{v.seller_name}</span>
                          {v.shop_name && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 font-semibold text-orange-700">
                                <Store className="w-3.5 h-3.5" />
                                {v.shop_name}
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>
                            {cCfg.flag} {getCountryDisplayName(cCfg.country)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatTimeAgo(v.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {v.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">{v.description}</p>
                    )}

                    {isMine && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          disabled={endingId === v.id}
                          onClick={() => handleEndLive(v.id)}
                          className="min-h-[38px] px-3.5 rounded-xl bg-red-600 text-white text-xs font-extrabold inline-flex items-center gap-1.5 hover:bg-red-700 disabled:opacity-60"
                        >
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>{endingId === v.id ? 'Ending...' : 'End Live'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
