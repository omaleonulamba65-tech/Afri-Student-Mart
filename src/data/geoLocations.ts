export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

const KNOWN_GEO_POINTS: Array<{ keywords: string[]; point: GeoPoint }> = [
  // Nigeria - Abuja & Major Campuses/Markets
  { keywords: ['uniabuja', 'university of abuja', 'gwagwalada', 'mini campus'], point: { lat: 8.9806, lng: 7.1774, label: 'UNIABUJA / Gwagwalada, Abuja' } },
  { keywords: ['baze university', 'jabi', 'life camp'], point: { lat: 9.0306, lng: 7.4044, label: 'Baze University / Jabi, Abuja' } },
  { keywords: ['nile university'], point: { lat: 9.0185, lng: 7.3941, label: 'Nile University, Abuja' } },
  { keywords: ['veritas', 'bwari'], point: { lat: 9.2833, lng: 7.3812, label: 'Veritas University / Bwari, Abuja' } },
  { keywords: ['wuse market', 'wuse'], point: { lat: 9.0643, lng: 7.4658, label: 'Wuse Market, Abuja' } },
  { keywords: ['banex'], point: { lat: 9.0837, lng: 7.4671, label: 'Banex Plaza, Wuse II, Abuja' } },
  { keywords: ['utako'], point: { lat: 9.0672, lng: 7.4461, label: 'Utako Market, Abuja' } },
  { keywords: ['garki'], point: { lat: 9.0279, lng: 7.4932, label: 'Garki Market, Abuja' } },
  { keywords: ['kubwa'], point: { lat: 9.1538, lng: 7.3224, label: 'Kubwa, Abuja' } },
  { keywords: ['lugbe'], point: { lat: 8.9815, lng: 7.3728, label: 'Lugbe, Abuja' } },
  { keywords: ['maitama'], point: { lat: 9.0882, lng: 7.4934, label: 'Maitama, Abuja' } },
  { keywords: ['unilag', 'yaba', 'lagos', 'computer village', 'balogun'], point: { lat: 6.5158, lng: 3.3898, label: 'Lagos Mainland / UNILAG' } },
  { keywords: ['ui', 'ibadan', 'dugbe'], point: { lat: 7.4417, lng: 3.9003, label: 'Ibadan / UI' } },
  { keywords: ['unn', 'nsukka', 'enugu'], point: { lat: 6.8669, lng: 7.4083, label: 'UNN Nsukka / Enugu' } },
  { keywords: ['abu zaria', 'zaria', 'kaduna'], point: { lat: 11.1512, lng: 7.6546, label: 'ABU Zaria' } },
  { keywords: ['bayero', 'kano', 'sabon gari'], point: { lat: 11.9794, lng: 8.4775, label: 'Kano / Bayero' } },
  { keywords: ['abuja'], point: { lat: 9.0765, lng: 7.3986, label: 'Abuja Central' } },

  // Ghana
  { keywords: ['ug legon', 'legon', 'makola', 'accra', 'kaneshie', 'circle'], point: { lat: 5.6506, lng: -0.1869, label: 'Accra / UG Legon' } },
  { keywords: ['knust', 'kumasi', 'kejetia'], point: { lat: 6.6745, lng: -1.5716, label: 'Kumasi / KNUST' } },
  { keywords: ['ucc', 'cape coast'], point: { lat: 5.1155, lng: -1.2909, label: 'Cape Coast / UCC' } },

  // South Africa
  { keywords: ['wits', 'uj', 'johannesburg', 'soweto', 'braamfontein'], point: { lat: -26.1929, lng: 28.0305, label: 'Johannesburg' } },
  { keywords: ['uct', 'cape town', 'stellenbosch'], point: { lat: -33.9577, lng: 18.4612, label: 'Cape Town / UCT' } },
  { keywords: ['tuks', 'pretoria', 'up'], point: { lat: -25.7545, lng: 28.2314, label: 'Pretoria / UP' } },
  { keywords: ['ukzn', 'durban'], point: { lat: -29.8673, lng: 30.9809, label: 'Durban / UKZN' } },

  // Senegal, Ivory Coast, Mali, Burkina, Niger, Togo, Benin, Sierra Leone, Liberia, Guinea, Gambia, Cape Verde, Guinea-Bissau
  { keywords: ['ucad', 'dakar', 'sandaga'], point: { lat: 14.6937, lng: -17.4441, label: 'Dakar, Senegal' } },
  { keywords: ['abidjan', 'cocody', 'adjame'], point: { lat: 5.3600, lng: -4.0083, label: 'Abidjan, Ivory Coast' } },
  { keywords: ['bamako'], point: { lat: 12.6392, lng: -8.0029, label: 'Bamako, Mali' } },
  { keywords: ['ouagadougou'], point: { lat: 12.3714, lng: -1.5197, label: 'Ouagadougou, Burkina Faso' } },
  { keywords: ['niamey'], point: { lat: 13.5116, lng: 2.1254, label: 'Niamey, Niger' } },
  { keywords: ['lome', 'lomé'], point: { lat: 6.1319, lng: 1.2228, label: 'Lomé, Togo' } },
  { keywords: ['cotonou', 'dantokpa'], point: { lat: 6.3703, lng: 2.3912, label: 'Cotonou, Benin' } },
  { keywords: ['freetown', 'fourah bay'], point: { lat: 8.4657, lng: -13.2317, label: 'Freetown, Sierra Leone' } },
  { keywords: ['monrovia'], point: { lat: 6.3156, lng: -10.8074, label: 'Monrovia, Liberia' } },
  { keywords: ['conakry', 'madina'], point: { lat: 9.6412, lng: -13.5784, label: 'Conakry, Guinea' } },
  { keywords: ['banjul', 'serrekunda'], point: { lat: 13.4549, lng: -16.5790, label: 'Banjul, Gambia' } },
  { keywords: ['praia'], point: { lat: 14.9331, lng: -23.5133, label: 'Praia, Cape Verde' } },
  { keywords: ['bissau'], point: { lat: 11.8636, lng: -15.5977, label: 'Bissau, Guinea-Bissau' } },
];

export function resolveGeoCoords(placeText?: string, fallbackOffset = 0): GeoPoint {
  const normalized = String(placeText || '').toLowerCase();
  for (const entry of KNOWN_GEO_POINTS) {
    if (entry.keywords.some((k) => normalized.includes(k))) {
      return {
        lat: entry.point.lat + fallbackOffset * 0.012,
        lng: entry.point.lng + fallbackOffset * 0.015,
        label: placeText?.trim() || entry.point.label,
      };
    }
  }
  return {
    lat: 9.0643 + fallbackOffset * 0.032,
    lng: 7.4658 + fallbackOffset * 0.025,
    label: placeText?.trim() || 'Abuja Campus Hub',
  };
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const km = 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.max(1.2, Number(km.toFixed(1)));
}

export function estimateDeliveryEtaMinutes(distanceKm: number, status: string): number {
  if (status === 'delivered_confirmed') return 0;
  if (status === 'shipped') {
    return Math.max(12, Math.round(distanceKm * 2.2));
  }
  return Math.max(25, Math.round(distanceKm * 2.8 + 18));
}
