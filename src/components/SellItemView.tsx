import React, { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Loader2,
  PackageCheck,
  Sparkles,
  Tag,
  Trash2,
  Video,
} from 'lucide-react';
import { ALL_MARKET_NAMES } from '../data/markets';
import { api, compressAndValidateVideo, compressDualImage } from '../lib/api';
import { useI18n } from '../lib/i18nContext';
import {
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  ItemCondition,
  MarketplaceItem,
  PublicUser,
} from '../types';

interface SellItemViewProps {
  user: PublicUser | null;
  onRequireAuth: () => void;
  onPublished: (item: MarketplaceItem) => void;
}

export const SellItemView: React.FC<SellItemViewProps> = ({
  user,
  onRequireAuth,
  onPublished,
}) => {
  const { country, countryConfig, translateCategory } = useI18n();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(ITEM_CATEGORIES[0]);
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('Neatly Used');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(user?.campus || '');
  const [photos, setPhotos] = useState<string[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [makeOffer, setMakeOffer] = useState(true);
  const [payOnDelivery, setPayOnDelivery] = useState(true);
  const [confirmRealPhotos, setConfirmRealPhotos] = useState(false);

  const [compressingImage, setCompressingImage] = useState(false);
  const [compressingVideo, setCompressingVideo] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTip, setAiTip] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-4 my-6">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-100 text-green-800 flex items-center justify-center">
          <Camera className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Post Item for Free</h2>
        <p className="text-sm text-slate-600">
          Free listing for all Students, Traders &amp; Service Providers. Sign up with your phone number to upload photos and live video.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-bold text-base hover:bg-green-800"
        >
          Login or Sign Up to Post
        </button>
      </div>
    );
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError('');

    const remaining = 4 - photos.length;
    if (remaining <= 0) {
      setError('Maximum of 4 photos allowed per item.');
      return;
    }

    setCompressingImage(true);
    try {
      const results = await Promise.all(files.slice(0, remaining).map((f) => compressDualImage(f)));
      setPhotos((prev) => [...prev, ...results.map((r) => r.full)].slice(0, 4));
      setThumbnails((prev) => [...prev, ...results.map((r) => r.thumbnail)].slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compress selected photos.');
    } finally {
      setCompressingImage(false);
    }
    e.target.value = '';
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setCompressingVideo(true);
    try {
      const encoded = await compressAndValidateVideo(file);
      setVideoUrl(encoded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not compress video (max 720p, 10s, 5MB).');
    } finally {
      setCompressingVideo(false);
    }
    e.target.value = '';
  };

  const handleAskMartAIHelp = async () => {
    if (!title.trim()) {
      setError('Type your item title first so Mart AI can suggest a fair price and clean description.');
      return;
    }
    setError('');
    setAiLoading(true);
    try {
      const res = await api.askMartAI({
        institution: user.institution,
        message: `I am selling "${title}" (${category}, condition: ${condition}) at ${user.institution}. Please suggest a fair price range in Naira (₦) and write a short 3-sentence honest item description (no phone numbers or WhatsApp links).`,
      });
      setAiTip(res.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mart AI helper is unavailable right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (compressingImage || compressingVideo) {
      setError('Please wait for image/video compression to finish.');
      return;
    }
    if (photos.length === 0) {
      setError('Please upload at least 1 real photo of your item (compressed <=200KB).');
      return;
    }
    if (!videoUrl) {
      setError('Live Video Required: Please record or upload a short video (max 720p, 10s, 5MB) of your item.');
      return;
    }
    if (!confirmRealPhotos) {
      setError('Please confirm that your photos & video are real and the condition is true.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createItem({
        title,
        category,
        price: Number(price),
        condition,
        description,
        photos,
        thumbnails,
        video_url: videoUrl,
        make_offer: makeOffer,
        pay_on_delivery: payOnDelivery,
        institution: user.institution,
        location: location || user.campus,
        country: user.country || (country === 'All' ? countryConfig.country : country),
      });
      setTitle('');
      setPrice('');
      setDescription('');
      setPhotos([]);
      setThumbnails([]);
      setVideoUrl('');
      setAiTip('');
      setConfirmRealPhotos(false);
      onPublished(res.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Post Item</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Live in <span className="font-semibold text-green-800">{user.institution}</span>
            </p>
          </div>
          <span className="rounded-lg bg-green-100 px-3 py-1 text-xs font-extrabold text-green-800">
            Free Listing for All
          </span>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Photos (up to 4, compressed to 800px <=200KB + 200px <=30KB thumbnails) */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              Real Photos ({photos.length}/4) — Auto-compressed (800px &le;200KB + 200px thumbnail)
            </label>
            {compressingImage && (
              <div className="mb-2.5 rounded-xl bg-green-50 border border-green-300 px-3.5 py-2.5 text-xs font-bold text-green-900 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-green-700" />
                <span>Compressing image... (resizing to max 800px &amp; &le;200KB WebP/JPEG)</span>
              </div>
            )}
            <div className="grid grid-cols-4 gap-2.5">
              {photos.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
                >
                  <img
                    src={thumbnails[i] || src}
                    alt={`Upload ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotos((prev) => prev.filter((_, idx) => idx !== i));
                      setThumbnails((prev) => prev.filter((_, idx) => idx !== i));
                    }}
                    className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center"
                    aria-label="Remove photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-green-700/50 bg-green-50/70 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-green-50 text-green-800">
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-bold">
                    {compressingImage ? 'Working...' : 'Add Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={compressingImage}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Live Video (Required: max 720p, max 10s, max 5MB) */}
          <div className="rounded-xl border-2 border-blue-300 bg-blue-50/60 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    Live Video Required *
                  </div>
                  <div className="text-xs text-slate-600">
                    Max 720p, max 10 seconds, max 5MB. Proves item is real.
                  </div>
                </div>
              </div>
              {!videoUrl && (
                <label className="min-h-[42px] px-3.5 rounded-lg bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-blue-700 shrink-0">
                  <Video className="w-4 h-4" />
                  <span>{compressingVideo ? 'Compressing...' : 'Record / Upload'}</span>
                  <input
                    type="file"
                    accept="video/*"
                    capture="environment"
                    disabled={compressingVideo}
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {compressingVideo && (
              <div className="rounded-lg bg-white border border-blue-200 px-3 py-2 text-xs font-bold text-blue-900 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Compressing video... (max 720p, 10s, 5MB)</span>
              </div>
            )}
            {videoUrl && (
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-48"
                />
                <button
                  type="button"
                  onClick={() => setVideoUrl('')}
                  className="absolute top-2 right-2 min-h-[34px] px-2.5 rounded-lg bg-red-600 text-white text-xs font-bold"
                >
                  Remove Video
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. HP EliteBook 840 G5 (8GB / 256GB)"
              className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-base focus:border-green-700 focus:outline-none"
            />
          </div>

          {/* Category + Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3 text-base bg-white focus:border-green-700 focus:outline-none"
              >
                {ITEM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {translateCategory(cat)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3 text-base bg-white focus:border-green-700 focus:outline-none"
              >
                {ITEM_CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price in Active Country Currency */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              Price ({countryConfig.currencyCode} · {countryConfig.currencySymbol.trim()})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-green-800 text-base">
                {countryConfig.currencySymbol.trim()}
              </span>
              <input
                type="number"
                required
                min={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="25000"
                className="w-full min-h-[48px] rounded-xl border border-slate-300 pl-14 pr-4 text-base font-bold tabular-nums focus:border-green-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Toggles: Make Offer ON/OFF + Paystack Escrow Delivery ON/OFF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMakeOffer(!makeOffer)}
              className={`min-h-[56px] rounded-xl border-2 px-4 py-2.5 flex items-center justify-between gap-2 text-left ${
                makeOffer ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Tag className={`w-5 h-5 shrink-0 ${makeOffer ? 'text-orange-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-sm font-bold text-slate-900">Make Offer</div>
                  <div className="text-[11px] text-slate-500">Allow buyers to haggle</div>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-md text-xs font-extrabold ${
                  makeOffer ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {makeOffer ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPayOnDelivery(!payOnDelivery)}
              className={`min-h-[56px] rounded-xl border-2 px-4 py-2.5 flex items-center justify-between gap-2 text-left ${
                payOnDelivery ? 'border-green-700 bg-green-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <PackageCheck
                  className={`w-5 h-5 shrink-0 ${payOnDelivery ? 'text-green-700' : 'text-slate-400'}`}
                />
                <div>
                  <div className="text-sm font-bold text-slate-900">Paystack Escrow</div>
                  <div className="text-[11px] text-slate-500">93% after Paystack fee</div>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-md text-xs font-extrabold ${
                  payOnDelivery ? 'bg-green-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {payOnDelivery ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-xs text-green-950 font-semibold space-y-1">
            <div>You will receive 93% after Paystack fee. (7% Owner / 93% Seller Paystack Split).</div>
            <div>Pay only on Afri Mart via Paystack to stay safe. Seller accounts requesting direct bank transfer will be banned.</div>
          </div>

          {/* Mart AI Helper shortcut */}
          <div className="rounded-xl bg-amber-50 border border-amber-300 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900">
                Need help pricing or describing your item?
              </span>
              <button
                type="button"
                onClick={handleAskMartAIHelp}
                disabled={aiLoading}
                className="min-h-[38px] px-3 rounded-lg bg-green-800 text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-green-900 disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>{aiLoading ? 'Asking Mart AI...' : 'Ask Mart AI'}</span>
              </button>
            </div>
            {aiTip && (
              <div className="rounded-lg bg-white border border-amber-200 p-3 text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                {aiTip}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              Description (Do not put bank account numbers here)
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe defects, specs, accessories included, and where to meet..."
              className="w-full rounded-xl border border-slate-300 p-3.5 text-base focus:border-green-700 focus:outline-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              Location / Hostel / Market
            </label>
            <input
              type="text"
              required
              list="afri-markets-list-sell"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Wuse Market / Moremi Hall / Main Gate"
              className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-base focus:border-green-700 focus:outline-none"
            />
            <datalist id="afri-markets-list-sell">
              {ALL_MARKET_NAMES.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          {/* Rule attestation */}
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3.5 cursor-pointer bg-slate-50">
            <input
              type="checkbox"
              checked={confirmRealPhotos}
              onChange={(e) => setConfirmRealPhotos(e.target.checked)}
              className="mt-1 h-5 w-5 accent-green-700 rounded"
            />
            <span className="text-sm text-slate-800 leading-snug">
              I confirm these are <strong>real photos &amp; live video</strong> of my item, the condition is true, and I am not posting any prohibited item or phone number.
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting || compressingImage || compressingVideo}
            className="w-full min-h-[54px] rounded-xl bg-green-700 text-white font-extrabold text-base flex items-center justify-center gap-2 hover:bg-green-800 disabled:opacity-60"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{submitting ? 'Publishing Item...' : 'Publish Item Free Now'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
