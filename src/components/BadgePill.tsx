import React from 'react';
import { BadgeCheck, GraduationCap, Store, Wrench } from 'lucide-react';
import type { AccountBadge } from '../types';

interface BadgePillProps {
  badge: AccountBadge;
  size?: 'xs' | 'sm';
}

export const VerifiedBadge: React.FC<BadgePillProps> = ({ badge, size = 'xs' }) => {
  const textSize = size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-[11px] px-2 py-0.5';

  if (badge === 'student') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md bg-blue-600 text-white font-bold whitespace-nowrap shrink-0 ${textSize}`}
      >
        <GraduationCap className="w-3.5 h-3.5 shrink-0" />
        <span>Verified Student</span>
      </span>
    );
  }

  if (badge === 'trader') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md bg-orange-500 text-white font-bold whitespace-nowrap shrink-0 ${textSize}`}
      >
        <Store className="w-3.5 h-3.5 shrink-0" />
        <span>Verified Trader</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-green-700 text-white font-bold whitespace-nowrap shrink-0 ${textSize}`}
    >
      <Wrench className="w-3.5 h-3.5 shrink-0" />
      <span>Verified Service</span>
    </span>
  );
};

export const BadgeRow: React.FC<{
  badges?: AccountBadge[];
  size?: 'xs' | 'sm';
  userType?: 'Buyer' | 'Student' | 'Trader' | 'Service Provider';
}> = ({ badges, size = 'xs', userType }) => {
  const textSize = size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-[11px] px-2 py-0.5';
  if (userType === 'Buyer' && (!badges || badges.length === 0)) {
    return (
      <div className="inline-flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 rounded-md bg-emerald-700 text-white font-bold whitespace-nowrap shrink-0 ${textSize}`}
        >
          <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Verified Buyer</span>
        </span>
      </div>
    );
  }
  const list = badges?.length ? badges.slice(0, 2) : (['student'] as AccountBadge[]);
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      {list.map((b) => (
        <VerifiedBadge key={b} badge={b} size={size} />
      ))}
    </div>
  );
};

export const VerifiedCheckIcon: React.FC<{ badge: AccountBadge }> = ({ badge }) => {
  const color =
    badge === 'student'
      ? 'text-blue-600'
      : badge === 'trader'
      ? 'text-orange-500'
      : 'text-green-700';
  return <BadgeCheck className={`w-4 h-4 shrink-0 ${color}`} />;
};
