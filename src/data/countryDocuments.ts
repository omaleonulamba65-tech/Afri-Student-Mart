export interface CountryDocumentRequirement {
  country: string;
  dialCode: string;
  idLabel: string;
  idPlaceholder: string;
  idHint: string;
  idPattern: RegExp;
  businessLabel: string;
  businessPlaceholder: string;
  businessHint: string;
  businessPattern: RegExp;
  secondaryBusinessLabel?: string;
  secondaryBusinessPlaceholder?: string;
  secondaryBusinessHint?: string;
  secondaryBusinessPattern?: RegExp;
  docPhotoLabel: string;
}

export const COUNTRY_DOCUMENT_REQUIREMENTS: Record<string, CountryDocumentRequirement> = {
  Nigeria: {
    country: 'Nigeria',
    dialCode: '+234',
    idLabel: 'NIN (National Identity Number)',
    idPlaceholder: '11-digit NIN e.g. 12345678901',
    idHint: 'Enter your 11-digit Nigerian NIN.',
    idPattern: /^[A-Za-z0-9\-\s]{8,20}$/,
    businessLabel: 'CAC Business Registration Number',
    businessPlaceholder: 'e.g. RC123456 or BN2345678',
    businessHint: 'Enter your CAC RC/BN/IT registration number.',
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,24}$/,
    docPhotoLabel: 'Shop Photo / NIN / CAC Document',
  },
  Ghana: {
    country: 'Ghana',
    dialCode: '+233',
    idLabel: 'Ghana Card Number',
    idPlaceholder: 'e.g. GHA-123456789-0',
    idHint: 'Enter your Ghana Card PIN (e.g. GHA-XXXXXXXXX-X).',
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: "Registrar General's Dept / Ghana Business Registration Number",
    businessPlaceholder: 'e.g. BN123452024 or CS123452024',
    businessHint: "Enter your Registrar General's Department (RGD) business number.",
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,24}$/,
    docPhotoLabel: 'Shop Photo / Ghana Card / RGD Certificate',
  },
  'South Africa': {
    country: 'South Africa',
    dialCode: '+27',
    idLabel: 'South African ID Number',
    idPlaceholder: '13-digit SA ID e.g. 9501015009087',
    idHint: 'Enter your 13-digit South African Smart ID / Green ID number.',
    idPattern: /^[A-Za-z0-9\-\s]{8,16}$/,
    businessLabel: 'CIPC Company Registration Number',
    businessPlaceholder: 'e.g. 2024/123456/07',
    businessHint: 'Enter your CIPC enterprise registration number (e.g. YYYY/NNNNNN/07).',
    businessPattern: /^[A-Za-z0-9\-\/\s]{5,24}$/,
    docPhotoLabel: 'Shop Photo / SA ID / CIPC Certificate',
  },
  Senegal: {
    country: 'Senegal',
    dialCode: '+221',
    idLabel: "CNI (Carte Nationale d'Identité)",
    idPlaceholder: 'e.g. 1 755 1990 01234',
    idHint: "Enter your Senegal CNI number.",
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'NINEA Number (Business Registration)',
    businessPlaceholder: 'e.g. 005123456 2G3',
    businessHint: 'Enter your NINEA business identification number.',
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,24}$/,
    docPhotoLabel: 'Shop Photo / CNI / NINEA Document',
  },
  'Ivory Coast': {
    country: 'Ivory Coast',
    dialCode: '+225',
    idLabel: 'CNI (Carte Nationale d’Identité)',
    idPlaceholder: 'e.g. CI0123456789',
    idHint: "Enter your Côte d'Ivoire CNI number.",
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'Registre de Commerce et du Crédit Mobilier (RCCM)',
    businessPlaceholder: 'e.g. CI-ABJ-03-2024-B12-00123',
    businessHint: 'Enter your RCCM commercial registration number.',
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,30}$/,
    docPhotoLabel: 'Shop Photo / CNI / RCCM Document',
  },
  Cameroon: {
    country: 'Cameroon',
    dialCode: '+237',
    idLabel: "CNI (Carte Nationale d'Identité)",
    idPlaceholder: 'e.g. 112233445',
    idHint: 'Enter your Cameroon CNI number.',
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'Registre de Commerce (RCCM) / Carte de Contribuable',
    businessPlaceholder: 'e.g. RC/DLA/2024/A/123 or P012345678901A',
    businessHint: 'Enter your RCCM or Carte de Contribuable (NIU).',
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,30}$/,
    docPhotoLabel: 'Shop Photo / CNI / RCCM / Contribuable',
  },
  Togo: {
    country: 'Togo',
    dialCode: '+228',
    idLabel: "CNI (Carte Nationale d'Identité)",
    idPlaceholder: 'e.g. TG-012345678',
    idHint: 'Enter your Togo CNI number.',
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'CFE / Registre de Commerce',
    businessPlaceholder: 'e.g. TG-LOM-2024-A-1234',
    businessHint: 'Enter your CFE Unique Business Card / RCCM number.',
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,28}$/,
    docPhotoLabel: 'Shop Photo / CNI / CFE Document',
  },
  Benin: {
    country: 'Benin',
    dialCode: '+229',
    idLabel: 'CIP / CNI',
    idPlaceholder: 'e.g. 1234567890 (CIP / CNI)',
    idHint: "Enter your Benin CIP (Certificat d'Identification Personnelle) or CNI.",
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'Registre de Commerce (RCCM)',
    businessPlaceholder: 'e.g. RB/COT/24 A 12345',
    businessHint: 'Enter your Benin Registre de Commerce number.',
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,28}$/,
    secondaryBusinessLabel: 'IFU Number (Identifiant Fiscal Unique)',
    secondaryBusinessPlaceholder: '13-digit IFU e.g. 0202412345678',
    secondaryBusinessHint: 'Enter your Benin IFU tax identification number.',
    secondaryBusinessPattern: /^[A-Za-z0-9\-\s]{6,20}$/,
    docPhotoLabel: 'Shop Photo / CIP-CNI / IFU / RCCM',
  },
  'Sierra Leone': {
    country: 'Sierra Leone',
    dialCode: '+232',
    idLabel: 'National ID (NIN)',
    idPlaceholder: 'e.g. SL-NIN-12345678',
    idHint: 'Enter your Sierra Leone NCRA National ID (NIN).',
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'Business Registration (Corporate Affairs Commission)',
    businessPlaceholder: 'e.g. CAC-2024-12345',
    businessHint: 'Enter your Corporate Affairs Commission (CAC) registration number.',
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,26}$/,
    docPhotoLabel: 'Shop Photo / NIN / CAC Certificate',
  },
  Liberia: {
    country: 'Liberia',
    dialCode: '+231',
    idLabel: 'National ID (NIR)',
    idPlaceholder: 'e.g. LBR-1234567890',
    idHint: 'Enter your Liberian National Identification Registry (NIR) ID.',
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'Liberia Business Registry (LBR) Number',
    businessPlaceholder: 'e.g. LBR-B-123456',
    businessHint: 'Enter your Liberia Business Registry (LBR) registration code.',
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,26}$/,
    docPhotoLabel: 'Shop Photo / National ID / LBR Certificate',
  },
  Gambia: {
    country: 'Gambia',
    dialCode: '+220',
    idLabel: 'National ID (Gambian ID)',
    idPlaceholder: 'e.g. 12345678901',
    idHint: 'Enter your Gambian National Identity Card number.',
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'Business Registration (Registrar of Companies)',
    businessPlaceholder: 'e.g. GM/RC/2024/1234',
    businessHint: 'Enter your Registrar of Companies business registration number.',
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,26}$/,
    docPhotoLabel: 'Shop Photo / National ID / Business Reg',
  },
  Guinea: {
    country: 'Guinea',
    dialCode: '+224',
    idLabel: 'CNI / Biometric ID',
    idPlaceholder: 'e.g. GN-123456789',
    idHint: 'Enter your Guinea CNI or Biometric ID number.',
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'RCCM (Registre du Commerce)',
    businessPlaceholder: 'e.g. GN.TCC.2024.A.01234',
    businessHint: 'Enter your Guinea RCCM registration number.',
    businessPattern: /^[A-Za-z0-9.\-\/\s]{4,28}$/,
    docPhotoLabel: 'Shop Photo / CNI / RCCM Document',
  },
  Mali: {
    country: 'Mali',
    dialCode: '+223',
    idLabel: 'CNI / Carte NINA',
    idPlaceholder: 'e.g. 12345678901234M',
    idHint: 'Enter your Mali CNI or NINA identification number.',
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'NINA / RCCM Business Number',
    businessPlaceholder: 'e.g. MA.BKO.2024.A.1234',
    businessHint: 'Enter your Mali RCCM or NINA business registration number.',
    businessPattern: /^[A-Za-z0-9.\-\/\s]{4,28}$/,
    docPhotoLabel: 'Shop Photo / CNI / NINA-RCCM',
  },
  'Burkina Faso': {
    country: 'Burkina Faso',
    dialCode: '+226',
    idLabel: 'CNIB (Carte Nationale d’Identité Burkinabè)',
    idPlaceholder: 'e.g. B12345678',
    idHint: 'Enter your Burkina Faso CNIB number.',
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'RCCM / IFU Number',
    businessPlaceholder: 'e.g. BF OUA 2024 A 1234 / IFU 00123456A',
    businessHint: 'Enter your Burkina Faso RCCM or IFU business number.',
    businessPattern: /^[A-Za-z0-9.\-\/\s]{4,30}$/,
    docPhotoLabel: 'Shop Photo / CNIB / RCCM-IFU',
  },
  Niger: {
    country: 'Niger',
    dialCode: '+227',
    idLabel: "CNI (Carte Nationale d'Identité)",
    idPlaceholder: 'e.g. NE-12345678',
    idHint: 'Enter your Niger CNI number.',
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'RCCM / NIF Number',
    businessPlaceholder: 'e.g. NE-NIM-01-2024-A10-00123',
    businessHint: 'Enter your Niger RCCM or NIF business registration.',
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,30}$/,
    docPhotoLabel: 'Shop Photo / CNI / RCCM Document',
  },
  'Cape Verde': {
    country: 'Cape Verde',
    dialCode: '+238',
    idLabel: 'CNI / Bilhete de Identidade (BI)',
    idPlaceholder: 'e.g. 19950101M001A',
    idHint: 'Enter your Cabo Verde CNI or BI number.',
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'NIF / Registo Comercial',
    businessPlaceholder: 'e.g. NIF 212345678',
    businessHint: 'Enter your Cabo Verde NIF or commercial registration number.',
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,24}$/,
    docPhotoLabel: 'Shop Photo / CNI / NIF Document',
  },
  'Guinea-Bissau': {
    country: 'Guinea-Bissau',
    dialCode: '+245',
    idLabel: 'Bilhete de Identidade (BI)',
    idPlaceholder: 'e.g. GW-12345678',
    idHint: 'Enter your Guinea-Bissau BI number.',
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'NIF / Registo Comercial',
    businessPlaceholder: 'e.g. NIF 510012345',
    businessHint: 'Enter your Guinea-Bissau NIF / Registo Comercial number.',
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,24}$/,
    docPhotoLabel: 'Shop Photo / BI / NIF Document',
  },
  Mauritania: {
    country: 'Mauritania',
    dialCode: '+222',
    idLabel: "NNI (Numéro National d'Identification)",
    idPlaceholder: '10-digit NNI e.g. 1234567890',
    idHint: 'Enter your Mauritanian NNI number.',
    idPattern: /^[A-Za-z0-9\-\s]{6,22}$/,
    businessLabel: 'Registre du Commerce (RC)',
    businessPlaceholder: 'e.g. RC/NKC/2024/1234',
    businessHint: 'Enter your Mauritanian Registre du Commerce number.',
    businessPattern: /^[A-Za-z0-9\-\/\s]{4,26}$/,
    docPhotoLabel: 'Shop Photo / NNI / RC Document',
  },
};

export function getCountryDocumentRequirement(countryName?: string): CountryDocumentRequirement {
  const clean = (countryName || 'Nigeria').trim().toLowerCase();
  const matchedKey = Object.keys(COUNTRY_DOCUMENT_REQUIREMENTS).find(
    (k) =>
      k.toLowerCase() === clean ||
      (clean.includes('ivory') && k === 'Ivory Coast') ||
      ((clean.includes('côte') || clean.includes('cote')) && k === 'Ivory Coast') ||
      ((clean.includes('cabo') || clean.includes('cape')) && k === 'Cape Verde')
  );
  return COUNTRY_DOCUMENT_REQUIREMENTS[matchedKey || 'Nigeria'];
}

export const COUNTRY_STATES_MAP: Record<string, string[]> = {
  Nigeria: [
    'Lagos',
    'FCT Abuja',
    'Rivers',
    'Oyo',
    'Enugu',
    'Kano',
    'Kaduna',
    'Ogun',
    'Osun',
    'Edo',
    'Anambra',
    'Abia',
    'Delta',
    'Imo',
    'Kwara',
    'Ondo',
    'Ekiti',
    'Cross River',
    'Akwa Ibom',
    'Plateau',
    'Benue',
    'Kogi',
    'Nasarawa',
    'Niger',
    'Bauchi',
    'Borno',
    'Sokoto',
    'Adamawa',
    'Bayelsa',
    'Ebonyi',
    'Gombe',
    'Jigawa',
    'Katsina',
    'Kebbi',
    'Taraba',
    'Yobe',
    'Zamfara',
  ],
  Ghana: [
    'Greater Accra',
    'Ashanti (Kumasi)',
    'Central (Cape Coast)',
    'Northern (Tamale)',
    'Western (Takoradi)',
    'Eastern (Koforidua)',
    'Volta (Ho)',
    'Bono (Sunyani)',
    'Upper East (Bolgatanga)',
    'Upper West (Wa)',
  ],
  'South Africa': [
    'Gauteng (Johannesburg / Pretoria)',
    'Western Cape (Cape Town / Stellenbosch)',
    'KwaZulu-Natal (Durban)',
    'Eastern Cape (Port Elizabeth / Makhanda)',
    'Free State (Bloemfontein)',
    'Limpopo (Polokwane)',
    'Mpumalanga (Nelspruit)',
    'North West (Mahikeng)',
    'Northern Cape (Kimberley)',
  ],
  Senegal: ['Dakar', 'Saint-Louis', 'Thiès', 'Diourbel (Bambey)', 'Kaolack', 'Ziguinchor'],
  'Ivory Coast': ['Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro', 'Korhogo'],
  Cameroon: [
    'Centre (Yaoundé)',
    'Littoral (Douala)',
    'South-West (Buea / Limbe)',
    'West (Dschang / Bafoussam)',
    'North-West (Bamenda)',
    'North (Garoua)',
    'Far North (Maroua)',
  ],
  Togo: ['Maritime (Lomé)', 'Kara', 'Plateaux', 'Centrale', 'Savanes'],
  Benin: ['Littoral (Cotonou)', 'Atlantique (Abomey-Calavi)', 'Borgou (Parakou)', 'Ouémé (Porto-Novo)', 'Zou'],
  'Sierra Leone': ['Western Area (Freetown)', 'Southern (Bo / Njala)', 'Northern (Makeni)', 'Eastern (Kenema)'],
  Liberia: ['Montserrado (Monrovia)', 'Bong (Cuttington)', 'Margibi', 'Nimba', 'Grand Bassa'],
  Gambia: ['Banjul', 'Kanifing (Serekunda)', 'West Coast (Brikama)', 'North Bank', 'Central River'],
  Guinea: ['Conakry', 'Kankan', 'Labé', 'Kindia', 'Nzérékoré'],
  Mali: ['Bamako', 'Ségou', 'Sikasso', 'Mopti', 'Kayes'],
  'Burkina Faso': ['Centre (Ouagadougou)', 'Hauts-Bassins (Bobo-Dioulasso)', 'Centre-Ouest (Koudougou)'],
  Niger: ['Niamey', 'Zinder', 'Maradi', 'Tahoua', 'Agadez'],
  'Cape Verde': ['Santiago (Praia)', 'São Vicente (Mindelo)', 'Sal', 'Santo Antão'],
  'Guinea-Bissau': ['Bissau', 'Bafatá', 'Gabú', 'Cacheu'],
  Mauritania: ['Nouakchott', 'Nouadhibou', 'Rosso', 'Kiffa'],
};

export function getStatesByCountry(countryName?: string): string[] {
  if (!countryName || countryName === 'All') {
    return COUNTRY_STATES_MAP.Nigeria;
  }
  const clean = countryName.trim().toLowerCase();
  const key = Object.keys(COUNTRY_STATES_MAP).find(
    (k) =>
      k.toLowerCase() === clean ||
      (clean.includes('ivory') && k === 'Ivory Coast') ||
      ((clean.includes('côte') || clean.includes('cote')) && k === 'Ivory Coast') ||
      ((clean.includes('cabo') || clean.includes('cape')) && k === 'Cape Verde')
  );
  return COUNTRY_STATES_MAP[key || 'Nigeria'];
}

export function inferCountryFromLocationText(
  institution?: string,
  location?: string,
  sellerCountry?: string,
  sellerDialCode?: string
): string {
  const text = `${institution || ''} ${location || ''}`.toLowerCase();
  if (
    /\bghana\b|legon|knust|cape coast|tamale|gimpa|ashesi|makola|kaneshie|kejetia|circle|madina|takoradi|accra|kumasi/i.test(
      text
    )
  ) {
    return 'Ghana';
  }
  if (
    /south africa|cape town|johannesburg|durban|pretoria|stellenbosch|witwatersrand|\bwits\b|\buct\b|soweto|umlazi|greenmarket|victoria street|rhodes|gauteng|kwazulu|western cape|bloemfontein|port elizabeth|polokwane|nelspruit/i.test(
      text
    )
  ) {
    return 'South Africa';
  }
  if (/cameroon|cameroun|yaound|douala|buea|dschang|bamenda|mokolo|muea/i.test(text)) {
    return 'Cameroon';
  }
  if (/senegal|dakar|saint-louis|bambey|sandaga|colobane/i.test(text)) return 'Senegal';
  if (/ivory coast|côte d'ivoire|cote d'ivoire|abidjan|bouaké|bouake|daloa|adjamé|adjame|treichville/i.test(text)) {
    return 'Ivory Coast';
  }
  if (/\bmali\b|bamako|ségou|segou/i.test(text)) return 'Mali';
  if (/burkina faso|ouagadougou|bobo-dioulasso|rood woko/i.test(text)) return 'Burkina Faso';
  if (/niger republic|niamey|zinder|maradi/i.test(text)) return 'Niger';
  if (/\btogo\b|lomé|lome|kara|hédzranawoé/i.test(text)) return 'Togo';
  if (/benin republic|abomey-calavi|parakou|cotonou|dantokpa|porto-novo/i.test(text)) return 'Benin';
  if (/sierra leone|freetown|fourah bay|njala|koroma/i.test(text)) return 'Sierra Leone';
  if (/liberia|monrovia|cuttington|paynesville/i.test(text)) return 'Liberia';
  if (/\bguinea-bissau\b|bissau|bandim/i.test(text)) return 'Guinea-Bissau';
  if (/\bguinea\b|conakry|kankan|labé|labe/i.test(text)) return 'Guinea';
  if (/gambia|banjul|serrekunda/i.test(text)) return 'Gambia';
  if (/cape verde|cabo verde|praia|mindelo/i.test(text)) return 'Cape Verde';
  if (/mauritania|nouakchott/i.test(text)) return 'Mauritania';

  if (sellerCountry && COUNTRY_STATES_MAP[sellerCountry]) {
    return sellerCountry;
  }
  if (sellerDialCode) {
    const clean = sellerDialCode.trim();
    const dialEntry = Object.values(COUNTRY_DOCUMENT_REQUIREMENTS).find((d) => d.dialCode === clean);
    if (dialEntry) return dialEntry.country;
  }
  return 'Nigeria';
}
