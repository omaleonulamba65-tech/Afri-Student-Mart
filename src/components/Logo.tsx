import React from 'react';

interface LogoProps {
  compact?: boolean;
  showPoweredBy?: boolean;
  size?: 'sm' | 'md' | 'lg';
  siteName?: string;
}

export const LogoIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Clean green shopping bag body */}
    <rect x="8" y="18" width="48" height="40" rx="10" fill="#15803D" />
    {/* Bag handle */}
    <path
      d="M22 20V15C22 9.477 26.477 5 32 5C37.523 5 42 9.477 42 15V20"
      stroke="#14532D"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
    {/* Open Book inside lower bag */}
    <path
      d="M17 37C21.5 34.5 27.5 34.5 32 37.5C36.5 34.5 42.5 34.5 47 37V50C42.5 47.5 36.5 47.5 32 50.5C27.5 47.5 21.5 47.5 17 50V37Z"
      fill="#FFFFFF"
    />
    <path d="M32 37.5V50.5" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />

    {/* Yellow Graduation Cap perched cleanly above book */}
    <path d="M32 16L50 24L32 32L14 24L32 16Z" fill="#FACC15" stroke="#14532D" strokeWidth="2" strokeLinejoin="round" />
    <path d="M22 28V33.5C22 33.5 26.5 36.5 32 36.5C37.5 36.5 42 33.5 42 33.5V28" fill="#EAB308" />
    <path d="M47 25.5V35" stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="47" cy="36" r="2.2" fill="#FACC15" />
  </svg>
);

export const BrandLogo: React.FC<LogoProps> = ({
  compact = false,
  showPoweredBy = true,
  size = 'md',
  siteName,
}) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  const titleSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';
  const resolvedName = (siteName || '').trim() || 'Afri Student Mart';

  return (
    <div className="inline-flex items-center gap-2.5 shrink-0">
      <LogoIcon className={iconSize} />
      <div className="flex flex-col leading-none">
        <span className={`${titleSize} font-extrabold tracking-tight text-green-900 whitespace-nowrap`}>
          {resolvedName}
        </span>
        {!compact && showPoweredBy && (
          <span className="mt-1 text-[10px] font-bold tracking-wider uppercase text-amber-500 whitespace-nowrap">
            Powered by JOKEY PERKY GROUP
          </span>
        )}
      </div>
    </div>
  );
};
