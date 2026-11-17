import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { REFUND_POLICY_RULES } from '../data/policies';

interface RefundPolicyBoxProps {
  compact?: boolean;
  onViewFullPolicy?: () => void;
}

export const RefundPolicyBox: React.FC<RefundPolicyBoxProps> = ({
  compact = false,
  onViewFullPolicy,
}) => {
  return (
    <div className="rounded-xl border border-green-300 bg-green-50/70 p-3.5 sm:p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-800 shrink-0" />
          <h4 className="text-xs sm:text-sm font-extrabold text-green-950">
            Afri Student Mart Refund Policy
          </h4>
        </div>
        {onViewFullPolicy && (
          <button
            type="button"
            onClick={onViewFullPolicy}
            className="text-xs font-bold text-green-800 underline underline-offset-2 hover:text-green-950 shrink-0"
          >
            Full Policies
          </button>
        )}
      </div>

      <ul className={`space-y-1.5 text-slate-800 leading-relaxed ${compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'}`}>
        {REFUND_POLICY_RULES.map((rule) => (
          <li key={rule.label} className="flex items-start gap-1.5">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-700 shrink-0" />
            <span>
              <strong className="text-slate-900">{rule.label}:</strong> {rule.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
