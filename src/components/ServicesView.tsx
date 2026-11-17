import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  MapPin,
  Megaphone,
  MessageCircle,
  Plus,
  Search,
  Star,
  User,
  Wrench,
} from 'lucide-react';
import { api, compressImageFile } from '../lib/api';
import { useI18n } from '../lib/i18nContext';
import {
  PublicUser,
  SERVICE_CATEGORIES,
  ServiceProvider,
} from '../types';
import { BadgeRow } from './BadgePill';

interface ServicesViewProps {
  user: PublicUser | null;
  onRequireAuth: () => void;
  onOpenServiceProfile: (service: ServiceProvider) => void;
  onChatService: (service: ServiceProvider) => void;
  onNotice: (msg: string) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  user,
  onRequireAuth,
  onOpenServiceProfile,
  onChatService,
  onNotice,
}) => {
  const { countryConfig, formatMoney, t } = useI18n();
  const [services, setServices] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // New Service Post drawer
  const [showAddService, setShowAddService] = useState(false);
  const [svcTitle, setSvcTitle] = useState('');
  const [svcCategory, setSvcCategory] = useState<string>(SERVICE_CATEGORIES[0]);
  const [svcPriceFrom, setSvcPriceFrom] = useState('2000');
  const [svcLocation, setSvcLocation] = useState(user?.campus || '');
  const [svcDesc, setSvcDesc] = useState('');
  const [svcPhotos, setSvcPhotos] = useState<string[]>([]);
  const [publishingSvc, setPublishingSvc] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await api.getServices();
      setServices(res.services);
    } catch {
      // Keep current
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (user) {
      setSvcLocation((prev) => prev || user.campus);
    }
  }, [user?.id]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (selectedCategory !== 'All' && s.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hit =
          s.title.toLowerCase().includes(q) ||
          s.provider_name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [services, selectedCategory, search]);

  const handleSvcPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const rem = 4 - svcPhotos.length;
    if (rem <= 0) return;
    onNotice('Compressing image...');
    try {
      const compressed = await Promise.all(
        files.slice(0, rem).map((f) => compressImageFile(f, 800, 200 * 1024))
      );
      setSvcPhotos((prev) => [...prev, ...compressed].slice(0, 4));
      onNotice('Service photo compressed (<=200KB).');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Photo error.');
    }
    e.target.value = '';
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setErrMsg('');
    setPublishingSvc(true);
    try {
      const res = await api.createService({
        title: svcTitle,
        category: svcCategory,
        description: svcDesc,
        price_from: Number(svcPriceFrom || 1500),
        location: svcLocation || user.campus,
        work_photos: svcPhotos,
        offerings: [
          {
            name: svcTitle,
            price: Number(svcPriceFrom || 1500),
            duration: '1 - 2 hrs',
          },
        ],
      });
      setServices((prev) => [res.service, ...prev]);
      setShowAddService(false);
      setSvcTitle('');
      setSvcDesc('');
      setSvcPhotos([]);
      onNotice('Your service is now live on Services Near You!');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Could not publish service.');
    } finally {
      setPublishingSvc(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Search */}
      <section className="rounded-3xl bg-gradient-to-br from-green-800 via-green-700 to-blue-700 text-white p-5 sm:p-7 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-300">
              Verified Campus &amp; Local Pros
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-0.5">{t('services_near_you')}</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                onRequireAuth();
              } else {
                setShowAddService(!showAddService);
              }
            }}
            className="min-h-[44px] px-4 rounded-xl bg-orange-500 text-white text-sm font-extrabold inline-flex items-center gap-1.5 hover:bg-orange-600 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>List Your Service (Free)</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a service (Hair, Plumbing, Tutoring, Photography...)"
            className="w-full min-h-[50px] rounded-2xl bg-white text-slate-900 pl-12 pr-4 text-base font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </section>

      {errMsg && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-800">
          {errMsg}
        </div>
      )}

      {/* Add Service Form */}
      {showAddService && user && (
        <form
          onSubmit={handleCreateService}
          className="rounded-2xl border-2 border-green-700 bg-white p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">Post Your Service</h2>
            <button
              type="button"
              onClick={() => setShowAddService(false)}
              className="text-xs font-bold text-slate-500"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Service Title</label>
              <input
                type="text"
                required
                value={svcTitle}
                onChange={(e) => setSvcTitle(e.target.value)}
                placeholder="e.g. Neat Braids & Wig Revamp"
                className="w-full min-h-[46px] rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={svcCategory}
                onChange={(e) => setSvcCategory(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-slate-300 px-3 text-sm bg-white"
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Price From ({countryConfig.currencySymbol.trim()})
              </label>
              <input
                type="number"
                required
                min={100}
                value={svcPriceFrom}
                onChange={(e) => setSvcPriceFrom(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-slate-300 px-3 text-sm font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                required
                value={svcLocation}
                onChange={(e) => setSvcLocation(e.target.value)}
                placeholder="e.g. Moremi Hall / Gate"
                className="w-full min-h-[46px] rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={svcDesc}
              onChange={(e) => setSvcDesc(e.target.value)}
              placeholder="Tell students what you do and turnaround time..."
              className="w-full rounded-xl border border-slate-300 p-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Work Photos ({svcPhotos.length}/4)
            </label>
            <div className="flex flex-wrap gap-2">
              {svcPhotos.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                />
              ))}
              {svcPhotos.length < 4 && (
                <label className="w-16 h-16 rounded-xl border-2 border-dashed border-green-700 bg-green-50 flex flex-col items-center justify-center cursor-pointer text-green-800">
                  <Camera className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleSvcPhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={publishingSvc}
            className="w-full min-h-[48px] rounded-xl bg-green-700 text-white font-extrabold text-sm hover:bg-green-800"
          >
            {publishingSvc ? 'Publishing Service...' : 'Publish Service Free'}
          </button>
        </form>
      )}

      {/* 9 Service Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['All', ...SERVICE_CATEGORIES].map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 border transition-colors ${
                active
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-green-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Top Service Providers List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Top Service Providers</h2>
          <span className="text-xs font-bold text-slate-500 tabular-nums">
            {filteredServices.length} provider{filteredServices.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-56 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-2">
            <Wrench className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-base font-bold text-slate-900">No service providers found</p>
            <p className="text-sm text-slate-500">
              Try another category or be the first to list this service!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((svc) => (
              <article
                key={svc.id}
                className={`rounded-2xl border bg-white p-4 flex flex-col justify-between space-y-3 transition-shadow hover:shadow-md ${
                  svc.is_advertised ? 'border-orange-400 ring-1 ring-orange-200' : 'border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenServiceProfile(svc)}
                      className="w-14 h-14 rounded-2xl bg-green-100 border border-green-200 overflow-hidden flex items-center justify-center shrink-0"
                    >
                      {svc.work_photos[0] || svc.profile_pic ? (
                        <img
                          src={svc.work_photos[0] || svc.profile_pic}
                          alt={svc.provider_name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-7 h-7 text-green-800" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenServiceProfile(svc)}
                          className="text-base font-extrabold text-slate-900 truncate hover:text-green-800 text-left"
                        >
                          {svc.provider_name}
                        </button>
                        {svc.is_advertised && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white shrink-0">
                            <Megaphone className="w-2.5 h-2.5" />
                            Top
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-blue-700 truncate">{svc.category}</div>
                      <div className="mt-1">
                        <BadgeRow badges={svc.badges} size="xs" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenServiceProfile(svc)}
                    className="text-left block w-full"
                  >
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{svc.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{svc.description}</p>
                  </button>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-0.5 font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        {svc.rating.toFixed(1)}
                      </span>
                      <span className="text-slate-500">({svc.reviews_count} reviews)</span>
                    </div>
                    <div className="font-extrabold text-green-800 tabular-nums">
                      From {formatMoney(svc.price_from)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 truncate">
                    <MapPin className="w-3.5 h-3.5 text-green-700 shrink-0" />
                    <span className="truncate">
                      {svc.location} · {svc.distance_km} km away
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onChatService(svc)}
                    className="min-h-[44px] rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-700"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenServiceProfile(svc)}
                    className="min-h-[44px] rounded-xl bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-green-800"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Book Now</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
