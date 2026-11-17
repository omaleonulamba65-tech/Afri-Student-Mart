import React, { useState } from 'react';
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Megaphone,
  MessageCircle,
  Star,
  User,
  X,
} from 'lucide-react';
import { api, formatNaira, formatTimeAgo } from '../lib/api';
import type { AdSettings, PublicUser, ServiceProvider } from '../types';
import { BadgeRow } from './BadgePill';
import { PaystackFeeModal, PaystackFeeRequest } from './PaystackFeeModal';

interface ServiceProfileModalProps {
  service: ServiceProvider | null;
  user: PublicUser | null;
  adSettings?: Partial<AdSettings> | null;
  onClose: () => void;
  onRequireAuth: () => void;
  onChatService: (service: ServiceProvider) => void;
  onUpdated: (service: ServiceProvider) => void;
  onNotice: (msg: string) => void;
}

export const ServiceProfileModal: React.FC<ServiceProfileModalProps> = ({
  service,
  user,
  adSettings,
  onClose,
  onRequireAuth,
  onChatService,
  onUpdated,
  onNotice,
}) => {
  const [showBookForm, setShowBookForm] = useState(false);
  const [selectedOffering, setSelectedOffering] = useState(0);
  const [scheduledDay, setScheduledDay] = useState('Monday');
  const [location, setLocation] = useState(user?.campus || '');
  const [notes, setNotes] = useState('');
  const [reminder7Days, setReminder7Days] = useState(true);
  const [bookingBusy, setBookingBusy] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [feeRequest, setFeeRequest] = useState<PaystackFeeRequest | null>(null);
  const [errMsg, setErrMsg] = useState('');

  if (!service) return null;

  const isOwnerOrProvider =
    user && (user.id === service.provider_id || user.phone_number === '07089628626');

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setErrMsg('');
    setBookingBusy(true);
    try {
      const offering = service.offerings[selectedOffering] || {
        name: service.title,
        price: service.price_from,
      };
      await api.bookService({
        service_id: service.id,
        service_name: offering.name,
        scheduled_day: scheduledDay,
        location: location || user.campus,
        notes,
        price: offering.price,
        set_7_day_reminder: reminder7Days,
      });
      setShowBookForm(false);
      setNotes('');
      onNotice(
        reminder7Days
          ? `Booked ${offering.name} for ${scheduledDay}! 7-day reminder set.`
          : `Booked ${offering.name} for ${scheduledDay}!`
      );
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Booking failed.');
    } finally {
      setBookingBusy(false);
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!comment.trim()) return;
    setErrMsg('');
    setReviewBusy(true);
    try {
      const res = await api.addServiceReview(service.id, { rating, comment });
      setComment('');
      onUpdated(res.service);
      onNotice('Thank you! Your review has been added.');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Failed to post review.');
    } finally {
      setReviewBusy(false);
    }
  };

  const handleAdvertise = () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setErrMsg('');
    setFeeRequest({
      feeType: 'advertise_service',
      targetId: service.id,
      title: `Advertise Service: ${service.title}`,
      amountNaira: 1000,
      description: 'Pay ₦1,000/week ad fee via Paystack Inline JS to rank #1 in Services Near You.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white sm:bg-black/55 sm:items-center sm:justify-center sm:p-4">
      <div className="flex flex-col w-full h-full sm:h-auto sm:max-h-[94vh] sm:max-w-3xl bg-white sm:rounded-2xl sm:shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-2 flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-green-800"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <span className="text-sm font-bold text-slate-900 truncate">{service.category}</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errMsg && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-800">
              {errMsg}
            </div>
          )}

          {/* Provider Summary */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-green-100 border border-green-300 overflow-hidden flex items-center justify-center shrink-0">
              {service.profile_pic ? (
                <img
                  src={service.profile_pic}
                  alt={service.provider_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-green-800" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900">{service.provider_name}</h2>
                {service.is_advertised && (
                  <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    Top Ad
                  </span>
                )}
              </div>
              <BadgeRow badges={service.badges} size="sm" />
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  {service.rating.toFixed(1)} ({service.reviews_count} reviews)
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-green-700" />
                  {service.location} ({service.distance_km} km away)
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed">{service.description}</p>

          {/* Photos Gallery */}
          {service.work_photos.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-slate-900">Work Photos Gallery</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {service.work_photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={photo}
                      alt={`Work ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services List with Price + Duration */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-extrabold text-slate-900">Services &amp; Price List</h3>
            <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
              {service.offerings.map((off, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900">{off.name}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Duration: {off.duration}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-extrabold text-green-800 tabular-nums">
                      {formatNaira(off.price)}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOffering(idx);
                        setShowBookForm(true);
                      }}
                      className="mt-1 text-xs font-bold text-blue-700 hover:underline"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Book Now Inline Form */}
          {showBookForm && (
            <form
              onSubmit={handleBook}
              className="rounded-2xl border-2 border-green-700 bg-green-50/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900">Book This Service</h3>
                <button
                  type="button"
                  onClick={() => setShowBookForm(false)}
                  className="text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Service Option</label>
                  <select
                    value={selectedOffering}
                    onChange={(e) => setSelectedOffering(Number(e.target.value))}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold"
                  >
                    {service.offerings.map((off, idx) => (
                      <option key={idx} value={idx}>
                        {off.name} — {formatNaira(off.price)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Day</label>
                  <select
                    value={scheduledDay}
                    onChange={(e) => setScheduledDay(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Hostel / Campus Address
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Moremi Hall Room 204"
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminder7Days}
                  onChange={(e) => setReminder7Days(e.target.checked)}
                  className="h-4 w-4 accent-green-700"
                />
                <span>Send me a repeat reminder after 7 days</span>
              </label>
              <button
                type="submit"
                disabled={bookingBusy}
                className="w-full min-h-[48px] rounded-xl bg-green-700 text-white font-extrabold text-sm hover:bg-green-800"
              >
                {bookingBusy ? 'Confirming Booking...' : 'Confirm Booking Now'}
              </button>
            </form>
          )}

          {/* Advertise Your Service Monetization Button */}
          <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                Stay on Top of Services Near You
              </div>
              <div className="text-xs text-slate-600">
                Advertise Your Service for ₦1,000/week to rank #1 in searches.
              </div>
            </div>
            {service.is_advertised ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2.5 text-xs font-extrabold text-white shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                Advertised Top Spot
              </span>
            ) : (
              <button
                type="button"
                onClick={handleAdvertise}
                disabled={adBusy || !isOwnerOrProvider}
                className="min-h-[44px] px-4 rounded-xl bg-orange-500 text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 hover:bg-orange-600 disabled:opacity-60 shrink-0"
              >
                <Megaphone className="w-4 h-4" />
                <span>{adBusy ? 'Activating...' : 'Advertise Service (₦1,000/wk)'}</span>
              </button>
            )}
          </div>

          {/* Reviews */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              Customer Reviews ({service.reviews_count})
            </h3>
            {service.reviews.length === 0 ? (
              <p className="text-xs text-slate-500">No reviews yet. Be the first to review after booking.</p>
            ) : (
              <div className="space-y-2.5">
                {service.reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{r.author_name}</span>
                      <span className="text-amber-600 font-bold">
                        {'★'.repeat(r.rating)} · {formatTimeAgo(r.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleReview} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Leave a Review</span>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} Stars
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share how the service went..."
                  className="flex-1 min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-sm"
                />
                <button
                  type="submit"
                  disabled={reviewBusy}
                  className="min-h-[42px] px-4 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                >
                  Post
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sticky Bottom Chat + Book Now Bar */}
        <div className="border-t border-slate-200 bg-white p-4 pb-safe grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChatService(service)}
            className="min-h-[50px] rounded-xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-blue-700"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Chat Provider</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBookForm(true)}
            className="min-h-[50px] rounded-xl bg-green-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-green-800"
          >
            <CalendarCheck className="w-5 h-5" />
            <span>Book Now</span>
          </button>
        </div>
      </div>

      <PaystackFeeModal
        request={feeRequest}
        user={user}
        adSettings={adSettings}
        onClose={() => setFeeRequest(null)}
        onSuccess={async (reference) => {
          setAdBusy(true);
          try {
            await api.advertiseService(service.id, reference);
            onUpdated({ ...service, is_advertised: true });
            setFeeRequest(null);
            onNotice('Service Advertised (₦1,000/week via Paystack)! Your service now stays on top.');
          } finally {
            setAdBusy(false);
          }
        }}
      />
    </div>
  );
};
