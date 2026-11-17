import React, { useEffect, useRef, useState } from 'react';
import type { AdSettings } from '../types';

interface AdSlotProps {
  settings: AdSettings;
  ready?: boolean;
  lowDataMode?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

/**
 * Google AdSense ONLY component.
 * Placed strictly in Right Sidebar on desktop and Bottom of Page on mobile.
 * Never renders pop-ups, overlays, checkout ads, or auto-playing video with sound.
 */
export const AdSlot: React.FC<AdSlotProps> = ({
  settings,
  ready = true,
  lowDataMode = false,
}) => {
  const pushedRef = useRef(false);
  const [deferredReady, setDeferredReady] = useState(false);

  const unitId = (settings.sidebar_unit_id || settings.banner_unit_id || '').trim();
  const publisherId = (settings.publisher_id || '').trim();
  const hasRealPublisher = publisherId.startsWith('ca-pub-') && !publisherId.includes('0000');
  const hasRealUnit = unitId.length > 0;
  const liveAdSenseReady = Boolean(settings.ads_enabled && hasRealPublisher && hasRealUnit);

  // Never block main products from loading first
  useEffect(() => {
    if (!ready || lowDataMode) {
      setDeferredReady(false);
      return;
    }
    const timer = setTimeout(() => setDeferredReady(true), 120);
    return () => clearTimeout(timer);
  }, [ready, lowDataMode]);

  useEffect(() => {
    if (!deferredReady || lowDataMode || !liveAdSenseReady || pushedRef.current) {
      return;
    }
    pushedRef.current = true;
    try {
      const existingScript = document.querySelector(`script[data-adsense-pub="${publisherId}"]`);
      if (!existingScript) {
        const script = document.createElement('script');
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.dataset.adsensePub = publisherId;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
          publisherId
        )}`;
        document.head.appendChild(script);
      }
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // Ignore AdSense runtime errors inside sandboxed preview
    }
  }, [deferredReady, lowDataMode, liveAdSenseReady, publisherId]);

  if (lowDataMode || !ready || !deferredReady) {
    return null;
  }

  return (
    <aside
      aria-label="Sponsored Google AdSense"
      className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Sponsored - Google Ads
        </span>
        <span className="text-[10px] font-semibold text-green-800 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
          AdSense Only
        </span>
      </div>

      {/* Google AdSense Code Container (No pop-ups, no auto-play sound video) */}
      <div className="relative rounded-xl border border-dashed border-slate-300 bg-slate-50 min-h-[220px] flex items-center justify-center p-4 text-center overflow-hidden">
        <ins
          className="adsbygoogle block w-full min-h-[200px]"
          style={{ display: 'block' }}
          data-ad-client={hasRealPublisher ? publisherId : 'ca-pub-0000000000000000'}
          data-ad-slot={hasRealUnit ? unitId : '0000000000'}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        {!liveAdSenseReady && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-1.5">
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              Advertisement - Google Ads will show here after approval
            </p>
            <p className="text-[11px] text-slate-500">
              Google AdSense sidebar slot · Non-intrusive · No pop-ups
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
