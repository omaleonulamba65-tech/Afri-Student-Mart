import React from 'react';
import { ArrowLeft, Phone, ShieldCheck, X } from 'lucide-react';
import { POLICY_DOCUMENTS } from '../data/policies';
import type { PolicyPageId } from '../types';
import { RefundPolicyBox } from './RefundPolicyBox';

interface PolicyModalProps {
  policyId: PolicyPageId | null;
  onSelectPolicy: (id: PolicyPageId) => void;
  onClose: () => void;
}

const ALL_POLICY_TABS: Array<{ id: PolicyPageId; label: string }> = [
  { id: 'refund', label: 'Refund Policy' },
  { id: 'delivery', label: 'Delivery Policy' },
  { id: 'seller_policy', label: 'Seller Policy' },
  { id: 'escrow', label: 'Escrow Protection' },
  { id: 'terms', label: 'Terms' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'safety', label: 'Safety Tips' },
  { id: 'community', label: 'Rules' },
  { id: 'prohibited', label: 'Prohibited' },
  { id: 'cookies', label: 'Cookies & Ads' },
  { id: 'report', label: 'Report & Block' },
  { id: 'contact', label: 'Contact Us' },
];

export const PolicyModal: React.FC<PolicyModalProps> = ({
  policyId,
  onSelectPolicy,
  onClose,
}) => {
  if (!policyId) return null;
  const doc = POLICY_DOCUMENTS[policyId] || POLICY_DOCUMENTS.refund;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white sm:bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex flex-col w-full h-full sm:h-auto sm:max-h-[88vh] sm:max-w-2xl bg-white sm:rounded-2xl sm:shadow-2xl overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 bg-green-800 text-white">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-green-700"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold truncate">{doc.title}</h2>
            <p className="text-xs text-yellow-300 truncate">Afri Student Mart · JOKEY PERKY GROUP</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-green-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy selector strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          {ALL_POLICY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectPolicy(tab.id)}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                policyId === tab.id
                  ? 'bg-green-700 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-green-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-green-950">{doc.title}</h3>
              <p className="text-sm text-green-800 mt-0.5">{doc.subtitle}</p>
            </div>
          </div>

          {policyId === 'refund' ? (
            <RefundPolicyBox />
          ) : (
            doc.sections.map((sec) => (
              <section key={sec.heading} className="space-y-2.5">
                <h4 className="text-base font-bold text-slate-900">{sec.heading}</h4>
                <ul className="space-y-2">
                  {sec.points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-slate-700">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-700 shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}

          {policyId === 'refund' && doc.sections[1] && (
            <section className="space-y-2.5">
              <h4 className="text-base font-bold text-slate-900">{doc.sections[1].heading}</h4>
              <ul className="space-y-2">
                {doc.sections[1].points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-slate-700">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green-700 shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="rounded-xl bg-yellow-50 border border-yellow-300 p-4 flex items-center gap-3">
            <Phone className="w-5 h-5 text-green-900 shrink-0" />
            <div className="text-sm text-green-950">
              <span className="font-bold">Official Support Email:</span> afristudentmartsupportjpg@gmail.com · Powered by JOKEY PERKY GROUP
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 p-4 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] rounded-xl bg-green-700 text-white font-bold text-base hover:bg-green-800 transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
