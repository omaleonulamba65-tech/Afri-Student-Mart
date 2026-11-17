import React, { useState } from 'react';
import { CreditCard, Lock, ShieldCheck, X } from 'lucide-react';
import { EXACT_SAFETY_MESSAGES } from '../data/policies';
import { formatNaira } from '../lib/api';
import { launchPaystackInline, resolvePaystackConfig } from '../lib/paystack';
import type { AdSettings, PublicUser } from '../types';

export interface PaystackFeeRequest {
  feeType: 'boost_item' | 'feature_shop' | 'advertise_service';
  targetId: string;
  title: string;
  amountNaira: number;
  description: string;
}

interface PaystackFeeModalProps {
  request: PaystackFeeRequest | null;
  user: PublicUser | null;
  adSettings?: Partial<AdSettings> | null;
  onClose: () => void;
  onSuccess: (reference: string) => Promise<void> | void;
}

export const PaystackFeeModal: React.FC<PaystackFeeModalProps> = ({
  request,
  user,
  adSettings,
  onClose,
  onSuccess,
}) => {
  const [processing, setProcessing] = useState(false);
  const [testSheetOpen, setTestSheetOpen] = useState(false);
  const [pendingRef, setPendingRef] = useState('');
  const [error, setError] = useState('');

  if (!request) return null;

  const cfg = resolvePaystackConfig(adSettings);
  const email = user?.phone_number
    ? `seller.${user.phone_number}@afristudentmart.ng`
    : 'seller@afristudentmart.ng';

  const completeWithRef = async (ref: string) => {
    setProcessing(true);
    setError('');
    try {
      await onSuccess(ref);
      setTestSheetOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not activate Paystack promotion.');
    } finally {
      setProcessing(false);
    }
  };

  const handleStartPaystack = () => {
    setError('');
    const ref = `ASM_PROMO_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;
    setPendingRef(ref);

    const launched = launchPaystackInline({
      settings: adSettings,
      email,
      amountNaira: request.amountNaira,
      reference: ref,
      metadata: {
        fee_type: request.feeType,
        target_id: request.targetId,
        title: request.title,
      },
      onSuccess: (paidRef) => {
        void completeWithRef(paidRef);
      },
      onClose: () => {
        setError('Paystack payment cancelled. Click Pay Now via Paystack to complete.');
      },
    });

    if (!launched) {
      setTestSheetOpen(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between bg-green-800 text-white px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-base font-extrabold truncate">Paystack Fee Checkout</h3>
            <p className="text-xs text-green-100 truncate">
              {EXACT_SAFETY_MESSAGES.outsidePaymentWarning}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-green-700 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-start gap-2.5 text-xs text-green-950 font-semibold">
            <ShieldCheck className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
            <span>
              All seller promotion fees &amp; ad fees go ONLY through Paystack Inline JS. No cash or direct transfer.
            </span>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-800">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Promotion / Ad Package
            </div>
            <div className="text-base font-extrabold text-slate-900">{request.title}</div>
            <p className="text-xs text-slate-600">{request.description}</p>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Total Fee</span>
              <span className="text-2xl font-extrabold text-green-800 tabular-nums">
                {formatNaira(request.amountNaira)}
              </span>
            </div>
          </div>

          {testSheetOpen ? (
            <div className="rounded-2xl border-2 border-green-800 bg-green-50 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-extrabold text-green-950">
                <span className="inline-flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-green-800" />
                  Paystack Inline Test Mode
                </span>
                <span className="font-mono text-[11px]">{pendingRef}</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Key: <span className="font-mono">{cfg.publicKey}</span> · Amount: {request.amountNaira * 100} kobo
              </p>
              <button
                type="button"
                disabled={processing}
                onClick={() => completeWithRef(pendingRef)}
                className="w-full min-h-[48px] rounded-xl bg-green-700 text-white font-extrabold text-sm hover:bg-green-800 disabled:opacity-60"
              >
                {processing
                  ? 'Confirming Paystack Payment...'
                  : `Authorize Paystack Test Fee (${formatNaira(request.amountNaira)})`}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={processing}
              onClick={handleStartPaystack}
              className="w-full min-h-[54px] rounded-xl bg-green-700 text-white font-extrabold text-base flex items-center justify-center gap-2 hover:bg-green-800 disabled:opacity-60"
            >
              <Lock className="w-5 h-5" />
              <span>Pay Now via Paystack — {formatNaira(request.amountNaira)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
