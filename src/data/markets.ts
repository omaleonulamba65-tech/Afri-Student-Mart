export type MarketRegion = 'Nigeria' | 'West Africa' | 'South Africa';

export interface MarketLocationGroup {
  id: string;
  region: MarketRegion;
  country: string;
  stateOrCity: string;
  markets: string[];
}

export const MARKET_GROUPS: MarketLocationGroup[] = [
  // === NIGERIA ===
  {
    id: 'ng-abuja',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Abuja FCT',
    markets: [
      'Wuse Market',
      'Garki Market',
      'Utako Market',
      'Kuje Market',
      'Nyanya Market',
      'Dei-Dei Market',
      'Karu Market',
    ],
  },
  {
    id: 'ng-lagos',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Lagos',
    markets: [
      'Balogun Market',
      'Mile 12 Market',
      'Computer Village Ikeja',
      'Alaba International Market',
      'Lekki Market',
      'Oshodi Market',
    ],
  },
  {
    id: 'ng-kano',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Kano',
    markets: ['Kantin Kwari Market', 'Sabon Gari Market'],
  },
  {
    id: 'ng-kaduna',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Kaduna',
    markets: ['Central Market Kaduna', 'Kawo Market'],
  },
  {
    id: 'ng-ph',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Port Harcourt',
    markets: ['Mile 1 Market', 'Mile 3 Market', 'Oil Mill Market'],
  },
  {
    id: 'ng-enugu',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Enugu',
    markets: ['Ogbete Main Market', 'New Market Enugu'],
  },
  {
    id: 'ng-onitsha',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Onitsha',
    markets: ['Onitsha Main Market', 'Relief Market'],
  },
  {
    id: 'ng-ibadan',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Ibadan',
    markets: ['Bodija Market', 'Dugbe Market'],
  },
  {
    id: 'ng-abeokuta',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Abeokuta',
    markets: ['Kuto Market', 'Itoku Market'],
  },
  {
    id: 'ng-aba',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Aba',
    markets: ['Ariaria International Market', 'Ekeoha Market'],
  },
  {
    id: 'ng-jos',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Jos',
    markets: ['Terminus Market', 'New Market Jos'],
  },
  {
    id: 'ng-maiduguri',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Maiduguri',
    markets: ['Monday Market'],
  },
  {
    id: 'ng-benin',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Benin',
    markets: ['New Benin Market', 'Oba Market'],
  },
  {
    id: 'ng-uyo',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Uyo',
    markets: ['Itam Market', 'Akpan Andem Market'],
  },
  {
    id: 'ng-calabar',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Calabar',
    markets: ['Watt Market', 'Marian Market'],
  },
  {
    id: 'ng-sokoto',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Sokoto',
    markets: ['Old Market Sokoto', 'Kara Market'],
  },
  {
    id: 'ng-bauchi',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Bauchi',
    markets: ['Wunti Market', 'Central Market Bauchi'],
  },
  {
    id: 'ng-owerri',
    region: 'Nigeria',
    country: 'Nigeria',
    stateOrCity: 'Owerri',
    markets: ['Eke-Ukwu Owerri', 'Relief Market Owerri'],
  },

  // === WEST AFRICA ===
  {
    id: 'wa-ghana',
    region: 'West Africa',
    country: 'Ghana',
    stateOrCity: 'Ghana',
    markets: [
      'Makola Market Accra',
      'Kejetia Market Kumasi',
      'Madina Market',
      'Kaneshie Market',
      'Takoradi Market Circle',
      'Tamale Central Market',
    ],
  },
  {
    id: 'wa-senegal',
    region: 'West Africa',
    country: 'Senegal',
    stateOrCity: 'Senegal',
    markets: ['Sandaga Market Dakar', 'HLM Market', 'Tilene Market', 'Kermel Market'],
  },
  {
    id: 'wa-ivory-coast',
    region: 'West Africa',
    country: 'Ivory Coast',
    stateOrCity: 'Ivory Coast',
    markets: [
      'Treichville Market Abidjan',
      'Adjamé Market',
      'Plateau Market',
      'Yopougon Market',
    ],
  },
  {
    id: 'wa-mali',
    region: 'West Africa',
    country: 'Mali',
    stateOrCity: 'Mali',
    markets: ['Grand Marché Bamako', 'Medina Market Bamako', 'Ségou Market'],
  },
  {
    id: 'wa-burkina',
    region: 'West Africa',
    country: 'Burkina Faso',
    stateOrCity: 'Burkina Faso',
    markets: [
      'Grand Marché Ouagadougou',
      'Rood Woko Market',
      'Bobo Dioulasso Central Market',
    ],
  },
  {
    id: 'wa-niger',
    region: 'West Africa',
    country: 'Niger',
    stateOrCity: 'Niger',
    markets: ['Grand Marché Niamey', 'Petit Marché Niamey', 'Zinder Market'],
  },
  {
    id: 'wa-togo',
    region: 'West Africa',
    country: 'Togo',
    stateOrCity: 'Togo',
    markets: ['Grand Marché Lomé', 'Hédzranawoé Market'],
  },
  {
    id: 'wa-benin',
    region: 'West Africa',
    country: 'Benin',
    stateOrCity: 'Benin Republic',
    markets: ['Dantokpa Market Cotonou', 'Ouando Market Porto-Novo'],
  },
  {
    id: 'wa-sierra-leone',
    region: 'West Africa',
    country: 'Sierra Leone',
    stateOrCity: 'Sierra Leone',
    markets: ['Big Market Freetown', 'Congo Market', 'Waterloo Market'],
  },
  {
    id: 'wa-liberia',
    region: 'West Africa',
    country: 'Liberia',
    stateOrCity: 'Liberia',
    markets: ['Waterside Market Monrovia', 'Red Light Market Paynesville'],
  },
  {
    id: 'wa-guinea',
    region: 'West Africa',
    country: 'Guinea',
    stateOrCity: 'Guinea',
    markets: ['Madina Market Conakry', 'Niger Market Conakry'],
  },
  {
    id: 'wa-gambia',
    region: 'West Africa',
    country: 'Gambia',
    stateOrCity: 'Gambia',
    markets: ['Albert Market Banjul', 'Serekunda Market'],
  },
  {
    id: 'wa-cape-verde',
    region: 'West Africa',
    country: 'Cape Verde',
    stateOrCity: 'Cape Verde',
    markets: ['Sucupira Market Praia', 'Mindelo Market'],
  },
  {
    id: 'wa-guinea-bissau',
    region: 'West Africa',
    country: 'Guinea-Bissau',
    stateOrCity: 'Guinea-Bissau',
    markets: ['Bandim Market Bissau'],
  },

  // === SOUTH AFRICA ===
  {
    id: 'za-jhb',
    region: 'South Africa',
    country: 'South Africa',
    stateOrCity: 'Johannesburg (South Africa)',
    markets: ['Johannesburg CBD Market', 'Alexandra Market', 'Soweto Market'],
  },
  {
    id: 'za-cpt',
    region: 'South Africa',
    country: 'South Africa',
    stateOrCity: 'Cape Town (South Africa)',
    markets: ['Greenmarket Square Cape Town', 'Langa Market', 'Khayelitsha Market'],
  },
  {
    id: 'za-dbn',
    region: 'South Africa',
    country: 'South Africa',
    stateOrCity: 'Durban (South Africa)',
    markets: ['Victoria Street Market Durban', 'Warwick Junction', 'Umlazi Market'],
  },
  {
    id: 'za-pta',
    region: 'South Africa',
    country: 'South Africa',
    stateOrCity: 'Pretoria (South Africa)',
    markets: ['Marabastad Market', 'Pretoria CBD Market'],
  },
  {
    id: 'za-pe',
    region: 'South Africa',
    country: 'South Africa',
    stateOrCity: 'Port Elizabeth (South Africa)',
    markets: ['Central Market Port Elizabeth'],
  },
  {
    id: 'za-bfn',
    region: 'South Africa',
    country: 'South Africa',
    stateOrCity: 'Bloemfontein (South Africa)',
    markets: ['Hoffman Square Market'],
  },
  {
    id: 'za-plk',
    region: 'South Africa',
    country: 'South Africa',
    stateOrCity: 'Polokwane (South Africa)',
    markets: ['Polokwane Market'],
  },
  {
    id: 'za-nlp',
    region: 'South Africa',
    country: 'South Africa',
    stateOrCity: 'Nelspruit (South Africa)',
    markets: ['Nelspruit Market'],
  },
];

export const ALL_MARKET_NAMES: string[] = Array.from(
  new Set(MARKET_GROUPS.flatMap((g) => g.markets))
);

export function getMarketsByCountry(countryName?: string): MarketLocationGroup[] {
  if (!countryName || countryName === 'All') return MARKET_GROUPS;
  const clean = countryName.trim().toLowerCase();
  return MARKET_GROUPS.filter((g) => g.country.toLowerCase() === clean);
}

