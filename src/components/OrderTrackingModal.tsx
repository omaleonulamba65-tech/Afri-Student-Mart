import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMapView,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { X, Truck, CheckCircle2, PackageCheck, Clock, MapPin, Navigation, ShieldCheck, AlertTriangle } from 'lucide-react';
import { EscrowOrder } from '../types';
import { resolveGeoCoords, haversineKm, estimateDeliveryEtaMinutes, GeoPoint } from '../data/geoLocations';
import { useLanguage, getGoogleMapsLocale } from '../lib/i18n';

interface OrderTrackingModalProps {
  order: EscrowOrder;
  mapsApiKey: string;
  onClose: () => void;
}

interface ComputedRouteStats {
  distanceMeters: number;
  durationMillis: number;
}

const TrackingRouteOverlay: React.FC<{
  origin: GeoPoint;
  destination: GeoPoint;
  courierPos: GeoPoint;
  status: string;
  onRouteStats: (stats: ComputedRouteStats) => void;
  onRouteError: (errMsg: string) => void;
}> = ({ origin, destination, courierPos, status, onRouteStats, onRouteError }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<Array<{ setMap: (m: unknown) => void }>>([]);

  useEffect(() => {
    if (!routesLib || !map) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const request = {
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    (routesLib.Route as any)
      .computeRoutes(request)
      .then(({ routes }: { routes: any[] }) => {
        if (!routes || routes.length === 0) return;
        const primaryRoute = routes[0];
        if (typeof primaryRoute.createPolylines === 'function') {
          const newPolylines = primaryRoute.createPolylines() as Array<{
            setOptions: (opts: Record<string, unknown>) => void;
            setMap: (m: unknown) => void;
          }>;
          newPolylines.forEach((polyline) => {
            polyline.setOptions({
              strokeColor: '#15803d',
              strokeWeight: 5,
              strokeOpacity: 0.9,
            });
            polyline.setMap(map);
          });
          polylinesRef.current = newPolylines;
        }
        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }
        onRouteStats({
          distanceMeters: primaryRoute.distanceMeters ?? 0,
          durationMillis: primaryRoute.durationMillis ?? 0,
        });
      })
      .catch((err: any) => {
        const msg = String(err?.message || err || '');
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT') || msg.includes('Quota')) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onRouteError(msg || 'Unable to load route data. Please check your network or API quota.');
      });

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng]);

  return (
    <>
      <AdvancedMarker position={{ lat: origin.lat, lng: origin.lng }} title={`Pickup: ${origin.label}`}>
        <Pin background="#166534" borderColor="#14532d" glyphColor="#ffffff" scale={1.15}>
          S
        </Pin>
      </AdvancedMarker>

      <AdvancedMarker position={{ lat: courierPos.lat, lng: courierPos.lng }} title={`Courier (${status})`}>
        <Pin background="#f59e0b" borderColor="#b45309" glyphColor="#ffffff" scale={1.2}>
          🚚
        </Pin>
      </AdvancedMarker>

      <AdvancedMarker position={{ lat: destination.lat, lng: destination.lng }} title={`Dropoff: ${destination.label}`}>
        <Pin background="#15803d" borderColor="#052e16" glyphColor="#ffffff" scale={1.2}>
          B
        </Pin>
      </AdvancedMarker>
    </>
  );
};

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  order,
  mapsApiKey,
  onClose,
}) => {
  const { selectedLanguage, selectedCountry, t } = useLanguage();
  const locale = getGoogleMapsLocale(selectedLanguage, selectedCountry.id);

  const origin = useMemo(
    () => resolveGeoCoords(order.item_location || order.seller_name, 0),
    [order.item_location, order.seller_name]
  );

  const destination = useMemo(() => {
    const dest = resolveGeoCoords(order.delivery_address || selectedCountry.defaultCity, 1);
    if (Math.abs(dest.lat - origin.lat) < 0.004 && Math.abs(dest.lng - origin.lng) < 0.004) {
      return {
        lat: origin.lat + 0.022,
        lng: origin.lng + 0.028,
        label: order.delivery_address || 'Campus Drop-off Point',
      };
    }
    return dest;
  }, [order.delivery_address, origin, selectedCountry.defaultCity]);

  const progressRatio = useMemo(() => {
    switch (order.order_status) {
      case 'paid_escrow':
        return 0.15;
      case 'shipped':
        return 0.62;
      case 'delivered_confirmed':
        return 1;
      case 'refund_requested':
        return 0.5;
      default:
        return 0.15;
    }
  }, [order.order_status]);

  const courierPos: GeoPoint = useMemo(
    () => ({
      lat: origin.lat + (destination.lat - origin.lat) * progressRatio,
      lng: origin.lng + (destination.lng - origin.lng) * progressRatio,
      label: 'Courier En Route',
    }),
    [origin, destination, progressRatio]
  );

  const [routeStats, setRouteStats] = useState<ComputedRouteStats | null>(null);
  const [routeError, setRouteError] = useState<string>('');

  const fallbackKm = useMemo(() => haversineKm(origin, destination), [origin, destination]);
  const distanceKm = routeStats && routeStats.distanceMeters > 0
    ? Number((routeStats.distanceMeters / 1000).toFixed(1))
    : fallbackKm;
  const etaMinutes = routeStats && routeStats.durationMillis > 0 && order.order_status !== 'delivered_confirmed'
    ? Math.max(5, Math.round((routeStats.durationMillis / 60000) * (1 - progressRatio * 0.5)))
    : estimateDeliveryEtaMinutes(distanceKm, order.order_status);

  const activeStepIndex = useMemo(() => {
    if (order.order_status === 'delivered_confirmed') return 3;
    if (order.order_status === 'shipped') return 2;
    return 1;
  }, [order.order_status]);

  const steps = [
    {
      label: 'Order Paid (Escrow)',
      sub: 'Funds secured on Afri Student Mart',
      done: true,
    },
    {
      label: 'Seller Shipped',
      sub: order.shipped_at ? 'Dispatched by seller' : 'Preparing package for dispatch',
      done: activeStepIndex >= 1 && order.order_status !== 'paid_escrow',
    },
    {
      label: 'Courier En Route',
      sub: `${distanceKm} km route • Live GPS tracking`,
      done: activeStepIndex >= 2,
    },
    {
      label: 'Delivered & Confirmed',
      sub: order.confirmed_at ? 'Confirmed by buyer' : 'Hand-off at drop-off point',
      done: order.order_status === 'delivered_confirmed',
    },
  ];

  const centerPoint = {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-green-100">
        {/* Header */}
        <div className="bg-green-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">{t.trackOrder}</h3>
              <p className="text-xs text-green-100 truncate max-w-[230px] sm:max-w-md">
                {order.item_title} • Ref: {order.reference}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/15 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ETA & Summary Banner */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-green-700 font-semibold">
                <Clock className="w-3.5 h-3.5" /> ETA
              </div>
              <p className="text-lg font-extrabold text-green-900 mt-0.5">
                {order.order_status === 'delivered_confirmed' ? 'Arrived' : `~${etaMinutes} min`}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                <Navigation className="w-3.5 h-3.5 text-green-700" /> Distance
              </div>
              <p className="text-lg font-extrabold text-slate-900 mt-0.5">{distanceKm} km</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Escrow
              </div>
              <p className="text-xs font-bold text-emerald-900 mt-1.5 capitalize">
                {order.order_status.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* Interactive Google Maps Container */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative">
            {mapsApiKey ? (
              <div style={{ width: '100%', height: '270px' }}>
                <APIProvider
                  apiKey={mapsApiKey}
                  language={locale.language}
                  region={locale.region}
                  libraries={['routes', 'marker']}
                >
                  <GoogleMapView
                    mapId="DEMO_MAP_ID"
                    defaultCenter={centerPoint}
                    defaultZoom={12}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    style={{ width: '100%', height: '100%' }}
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  >
                    <TrackingRouteOverlay
                      origin={origin}
                      destination={destination}
                      courierPos={courierPos}
                      status={order.order_status}
                      onRouteStats={setRouteStats}
                      onRouteError={setRouteError}
                    />
                  </GoogleMapView>
                </APIProvider>
              </div>
            ) : (
              /* Clean live vector fallback when Maps key is not yet active in runtime */
              <div className="p-4 bg-gradient-to-br from-green-50 via-white to-emerald-50">
                <div className="flex items-center justify-between text-xs text-green-800 font-semibold mb-3">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-green-700" /> Live Route Preview
                  </span>
                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    {distanceKm} km • ~{etaMinutes} mins
                  </span>
                </div>
                <svg viewBox="0 0 420 140" className="w-full h-36 rounded-xl bg-white border border-green-100">
                  <defs>
                    <pattern id="gridPattern" width="24" height="24" patternUnits="userSpaceOnUse">
                      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#f0fdf4" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="420" height="140" fill="url(#gridPattern)" />
                  <path
                    d="M 48 102 Q 160 28 245 72 T 372 44"
                    fill="none"
                    stroke="#bbf7d0"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 48 102 Q 160 28 245 72 T 372 44"
                    fill="none"
                    stroke="#15803d"
                    strokeWidth="4"
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                  />
                  {/* Pickup Pin */}
                  <circle cx="48" cy="102" r="10" fill="#166534" />
                  <text x="48" y="106" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">S</text>
                  <text x="48" y="126" textAnchor="middle" fill="#166534" fontSize="9" fontWeight="600">Pickup</text>
                  {/* Courier */}
                  <circle
                    cx={48 + (372 - 48) * progressRatio}
                    cy={order.order_status === 'delivered_confirmed' ? 44 : 68}
                    r="11"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={48 + (372 - 48) * progressRatio}
                    y={order.order_status === 'delivered_confirmed' ? 48 : 72}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    T
                  </text>
                  {/* Dropoff Pin */}
                  <circle cx="372" cy="44" r="10" fill="#15803d" />
                  <text x="372" y="48" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">B</text>
                  <text x="372" y="25" textAnchor="middle" fill="#14532d" fontSize="9" fontWeight="600">Drop-off</text>
                </svg>
              </div>
            )}

            {routeError && (
              <div className="bg-amber-50 border-t border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{routeError}</span>
              </div>
            )}
          </div>

          {/* Pickup -> Dropoff Addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50">
              <p className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Pickup Point</p>
              <p className="font-bold text-slate-900 mt-0.5">{origin.label}</p>
              <p className="text-slate-500 mt-0.5">Seller: {order.seller_name}</p>
            </div>
            <div className="p-3 rounded-2xl border border-green-200 bg-green-50/50">
              <p className="font-semibold text-green-700 uppercase tracking-wide text-[10px]">Delivery Destination</p>
              <p className="font-bold text-slate-900 mt-0.5">{destination.label}</p>
              <p className="text-slate-500 mt-0.5">Buyer: {order.buyer_name}</p>
            </div>
          </div>

          {/* Status Step-Indicator */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-green-700" /> Delivery Progress
            </h4>
            <div className="space-y-3">
              {steps.map((step, idx) => {
                const isCompleted =
                  idx === 0 ||
                  (idx === 1 && (order.order_status === 'shipped' || order.order_status === 'delivered_confirmed')) ||
                  (idx === 2 && (order.order_status === 'shipped' || order.order_status === 'delivered_confirmed')) ||
                  (idx === 3 && order.order_status === 'delivered_confirmed');
                const isCurrent =
                  (idx === 1 && order.order_status === 'paid_escrow') ||
                  (idx === 2 && order.order_status === 'shipped') ||
                  (idx === 3 && order.order_status === 'delivered_confirmed');

                return (
                  <div key={step.label} className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border text-xs font-bold ${
                        isCompleted
                          ? 'bg-green-700 border-green-700 text-white'
                          : isCurrent
                            ? 'bg-amber-100 border-amber-500 text-amber-800'
                            : 'bg-slate-100 border-slate-300 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div className="flex-1 pb-2 border-b border-slate-100 last:border-b-0">
                      <p className={`text-sm font-bold ${isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-slate-500">{step.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-800 transition"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
