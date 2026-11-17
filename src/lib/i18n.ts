import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  COUNTRY_LANGUAGE_CONFIGS,
  CountryLanguageConfig as BaseCountryConfig,
  getCountryConfig,
} from '../data/languages';

type CountryLanguageConfig = BaseCountryConfig & {
  id: string;
  defaultCity: string;
  displayName: string;
  regionCode: string;
};

const REGION_CODE_MAP: Record<string, string> = {
  Nigeria: 'NG',
  Ghana: 'GH',
  Senegal: 'SN',
  'Ivory Coast (Côte d’Ivoire)': 'CI',
  Mali: 'ML',
  'Burkina Faso': 'BF',
  Niger: 'NE',
  Togo: 'TG',
  Benin: 'BJ',
  'Sierra Leone': 'SL',
  Liberia: 'LR',
  Guinea: 'GN',
  Gambia: 'GM',
  'Cape Verde': 'CV',
  'Guinea-Bissau': 'GW',
  'South Africa': 'ZA',
  Mauritania: 'MR',
};

const WEST_AND_SOUTH_AFRICA_CONFIG: CountryLanguageConfig[] = COUNTRY_LANGUAGE_CONFIGS.map((c) => ({
  ...c,
  id: c.country.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  defaultCity: c.country === 'Nigeria' ? 'Abuja' : c.country,
  displayName: c.country,
  regionCode: REGION_CODE_MAP[c.country] || 'NG',
}));

function findCountryConfig(countryIdOrName?: string): CountryLanguageConfig {
  const q = (countryIdOrName || '').trim().toLowerCase();
  const byId = WEST_AND_SOUTH_AFRICA_CONFIG.find(
    (c) => c.id === q || c.country.toLowerCase() === q
  );
  if (byId) return byId;
  const base = getCountryConfig(countryIdOrName);
  return {
    ...base,
    id: base.country.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    defaultCity: base.country === 'Nigeria' ? 'Abuja' : base.country,
    displayName: base.country,
    regionCode: REGION_CODE_MAP[base.country] || 'NG',
  };
}

export type TranslationKeys = {
  appName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  searchPlaceholder: string;
  home: string;
  shops: string;
  sell: string;
  messages: string;
  profile: string;
  markets: string;
  services: string;
  login: string;
  signUp: string;
  chooseLanguageFirst: string;
  chooseLanguageSub: string;
  continueBtn: string;
  allLanguagesShown: string;
  viewingCountry: string;
  changeCountry: string;
  languageLabel: string;
  selectLanguage: string;
  categories: string;
  allItems: string;
  shoes: string;
  clothes: string;
  phones: string;
  food: string;
  books: string;
  electronics: string;
  foodstuff: string;
  fashion: string;
  servicesNearYou: string;
  featuredItems: string;
  hotDeals: string;
  freshListings: string;
  verifiedSellers: string;
  campusFilterAll: string;
  campusFilterStudents: string;
  campusFilterTraders: string;
  campusFilterMySchool: string;
  campusFilterMyMarket: string;
  campusFilterNearby: string;
  buySafelyEscrow: string;
  chatSeller: string;
  makeOffer: string;
  payOnDelivery: string;
  trackOrder: string;
  deleteProduct: string;
  settings: string;
  changeLanguageInSettings: string;
  accountType: string;
  student: string;
  trader: string;
  serviceProvider: string;
  fullName: string;
  phoneNumber: string;
  password: string;
  safetyBanner: string;
  safetyPhoneAllowed: string;
  safetyNoAccountNumbers: string;
  deliveryFeeLabel: string;
  payNow: string;
  confirmDelivery: string;
  ownerDashboard: string;
  postItem: string;
  noAccountTypeNeeded: string;
  selectAccountTypeRequired: string;
  marketDirectories: string;
  close: string;
};

const EN_DICT: TranslationKeys = {
  appName: 'Afri Student Mart',
  tagline: 'Student & Local Marketplaces across West & South Africa',
  heroTitle: 'Buy & Sell Safely Across Campus and Local Markets',
  heroSubtitle: 'Students, Local Traders & Service Providers in one trusted Green & White marketplace with Escrow protection.',
  searchPlaceholder: 'Search shoes, phones, books, foodstuff, services...',
  home: 'Home',
  shops: 'Markets',
  sell: 'Sell',
  messages: 'Messages',
  profile: 'Profile',
  markets: 'Markets',
  services: 'Services',
  login: 'Login',
  signUp: 'Sign Up',
  chooseLanguageFirst: 'Step 1: Choose Your Country & Language',
  chooseLanguageSub: 'Every button, menu, category and market switches to your language immediately. You can change this anytime in Settings.',
  continueBtn: 'Continue in This Language',
  allLanguagesShown: 'All languages shown — none hidden',
  viewingCountry: 'You are viewing:',
  changeCountry: 'Change',
  languageLabel: 'Language',
  selectLanguage: 'Pick Language',
  categories: 'Categories',
  allItems: 'All Items',
  shoes: 'Shoes',
  clothes: 'Clothes',
  phones: 'Phones',
  food: 'Food',
  books: 'Books',
  electronics: 'Electronics',
  foodstuff: 'Foodstuff',
  fashion: 'Fashion',
  servicesNearYou: 'Services Near You',
  featuredItems: 'Featured Listings',
  hotDeals: 'Hot Deals',
  freshListings: 'Fresh Listings',
  verifiedSellers: 'Verified Sellers',
  campusFilterAll: 'All',
  campusFilterStudents: 'Students Only',
  campusFilterTraders: 'Traders Only',
  campusFilterMySchool: 'My School',
  campusFilterMyMarket: 'My Market',
  campusFilterNearby: 'Within 2km',
  buySafelyEscrow: 'Buy Safely with Escrow',
  chatSeller: 'Chat Seller',
  makeOffer: 'Make Offer',
  payOnDelivery: 'Pay on Delivery',
  trackOrder: 'Track Order',
  deleteProduct: 'Delete Product',
  settings: 'Settings',
  changeLanguageInSettings: 'Change App Language',
  accountType: 'Account Type',
  student: 'Student',
  trader: 'Trader',
  serviceProvider: 'Service Provider',
  fullName: 'Full Name',
  phoneNumber: 'Phone Number',
  password: 'Password',
  safetyBanner: 'You can share phone or WhatsApp numbers for pickup coordination, but NEVER share bank/MoMo account numbers or transfer outside Escrow.',
  safetyPhoneAllowed: 'Phone / WhatsApp allowed',
  safetyNoAccountNumbers: 'Account numbers blocked',
  deliveryFeeLabel: 'Standard Delivery Fee',
  payNow: 'Pay Safely',
  confirmDelivery: 'Confirm Delivery',
  ownerDashboard: 'Owner Dashboard',
  postItem: 'Post Item for Sale',
  noAccountTypeNeeded: 'Enter your Phone Number and Password to sign in.',
  selectAccountTypeRequired: 'Select your Account Type (Student, Trader, or Service Provider) before continuing.',
  marketDirectories: 'Local Markets & Trading Hubs',
  close: 'Close',
};

const FR_DICT: TranslationKeys = {
  appName: 'Afri Student Mart',
  tagline: "Marchés étudiants et locaux d'Afrique de l'Ouest et du Sud",
  heroTitle: 'Achetez et vendez en sécurité sur le campus et les marchés',
  heroSubtitle: 'Étudiants, commerçants et prestataires réunis sur un marché sécurisé par Escrow.',
  searchPlaceholder: 'Rechercher chaussures, téléphones, livres, nourriture...',
  home: 'Accueil',
  shops: 'Marchés',
  sell: 'Vendre',
  messages: 'Messages',
  profile: 'Profil',
  markets: 'Marchés',
  services: 'Services',
  login: 'Connexion',
  signUp: "S'inscrire",
  chooseLanguageFirst: 'Étape 1 : Choisissez votre pays et langue',
  chooseLanguageSub: 'Tout le site change immédiatement dans votre langue. Modifiable dans Paramètres.',
  continueBtn: 'Continuer dans cette langue',
  allLanguagesShown: 'Toutes les langues affichées',
  viewingCountry: 'Vous consultez :',
  changeCountry: 'Changer',
  languageLabel: 'Langue',
  selectLanguage: 'Choisir la langue',
  categories: 'Catégories',
  allItems: 'Tout voir',
  shoes: 'Chaussures',
  clothes: 'Vêtements',
  phones: 'Téléphones',
  food: 'Nourriture',
  books: 'Livres',
  electronics: 'Électronique',
  foodstuff: 'Produits alimentaires',
  fashion: 'Mode',
  servicesNearYou: 'Services près de vous',
  featuredItems: 'Annonces en vedette',
  hotDeals: 'Bonnes affaires',
  freshListings: 'Nouvelles annonces',
  verifiedSellers: 'Vendeurs vérifiés',
  campusFilterAll: 'Tous',
  campusFilterStudents: 'Étudiants',
  campusFilterTraders: 'Commerçants',
  campusFilterMySchool: 'Mon école',
  campusFilterMyMarket: 'Mon marché',
  campusFilterNearby: 'Moins de 2 km',
  buySafelyEscrow: 'Acheter avec Escrow',
  chatSeller: 'Discuter avec le vendeur',
  makeOffer: 'Faire une offre',
  payOnDelivery: 'Paiement à la livraison',
  trackOrder: 'Suivre la commande',
  deleteProduct: 'Supprimer le produit',
  settings: 'Paramètres',
  changeLanguageInSettings: "Changer la langue de l'application",
  accountType: 'Type de compte',
  student: 'Étudiant',
  trader: 'Commerçant',
  serviceProvider: 'Prestataire',
  fullName: 'Nom complet',
  phoneNumber: 'Numéro de téléphone',
  password: 'Mot de passe',
  safetyBanner: 'Vous pouvez partager votre téléphone/WhatsApp pour la remise, mais JAMAIS de numéro de compte bancaire/MoMo hors Escrow.',
  safetyPhoneAllowed: 'Téléphone / WhatsApp autorisé',
  safetyNoAccountNumbers: 'Numéros de compte bloqués',
  deliveryFeeLabel: 'Frais de livraison standard',
  payNow: 'Payer en sécurité',
  confirmDelivery: 'Confirmer la livraison',
  ownerDashboard: 'Tableau Propriétaire',
  postItem: 'Publier un article',
  noAccountTypeNeeded: 'Entrez votre numéro de téléphone et mot de passe.',
  selectAccountTypeRequired: 'Choisissez un type de compte (Étudiant, Commerçant ou Prestataire).',
  marketDirectories: 'Marchés locaux et pôles commerciaux',
  close: 'Fermer',
};

const PT_DICT: TranslationKeys = {
  appName: 'Afri Student Mart',
  tagline: 'Mercados estudantis e locais na África Ocidental e do Sul',
  heroTitle: 'Compre e venda com segurança no campus e mercados locais',
  heroSubtitle: 'Estudantes, comerciantes e prestadores de serviços protegidos por Escrow.',
  searchPlaceholder: 'Pesquisar sapatos, telemóveis, livros, comida...',
  home: 'Início',
  shops: 'Mercados',
  sell: 'Vender',
  messages: 'Mensagens',
  profile: 'Perfil',
  markets: 'Mercados',
  services: 'Serviços',
  login: 'Entrar',
  signUp: 'Registar',
  chooseLanguageFirst: 'Passo 1: Escolha País e Idioma',
  chooseLanguageSub: 'Todo o site muda imediatamente para o seu idioma. Pode alterar em Definições.',
  continueBtn: 'Continuar neste idioma',
  allLanguagesShown: 'Todos os idiomas visíveis',
  viewingCountry: 'Está a ver:',
  changeCountry: 'Mudar',
  languageLabel: 'Idioma',
  selectLanguage: 'Escolher idioma',
  categories: 'Categorias',
  allItems: 'Todos',
  shoes: 'Sapatos',
  clothes: 'Roupas',
  phones: 'Telemóveis',
  food: 'Comida',
  books: 'Livros',
  electronics: 'Eletrónica',
  foodstuff: 'Alimentos',
  fashion: 'Moda',
  servicesNearYou: 'Serviços Perto de Si',
  featuredItems: 'Destaques',
  hotDeals: 'Ofertas Quentes',
  freshListings: 'Anúncios Recentes',
  verifiedSellers: 'Vendedores Verificados',
  campusFilterAll: 'Todos',
  campusFilterStudents: 'Estudantes',
  campusFilterTraders: 'Comerciantes',
  campusFilterMySchool: 'Minha Escola',
  campusFilterMyMarket: 'Meu Mercado',
  campusFilterNearby: 'Até 2 km',
  buySafelyEscrow: 'Comprar com Escrow',
  chatSeller: 'Conversar com Vendedor',
  makeOffer: 'Fazer Oferta',
  payOnDelivery: 'Pagar na Entrega',
  trackOrder: 'Rastrear Encomenda',
  deleteProduct: 'Eliminar Produto',
  settings: 'Definições',
  changeLanguageInSettings: 'Alterar Idioma',
  accountType: 'Tipo de Conta',
  student: 'Estudante',
  trader: 'Comerciante',
  serviceProvider: 'Prestador de Serviços',
  fullName: 'Nome Completo',
  phoneNumber: 'Número de Telefone',
  password: 'Palavra-passe',
  safetyBanner: 'Pode partilhar número de telefone ou WhatsApp para entrega, mas NUNCA partilhe conta bancária fora do Escrow.',
  safetyPhoneAllowed: 'Telefone / WhatsApp permitido',
  safetyNoAccountNumbers: 'Números de conta bloqueados',
  deliveryFeeLabel: 'Taxa de Entrega Padrão',
  payNow: 'Pagar Agora',
  confirmDelivery: 'Confirmar Entrega',
  ownerDashboard: 'Painel do Proprietário',
  postItem: 'Publicar Produto',
  noAccountTypeNeeded: 'Insira o seu telefone e palavra-passe.',
  selectAccountTypeRequired: 'Selecione o tipo de conta antes de continuar.',
  marketDirectories: 'Mercados Locais',
  close: 'Fechar',
};

const PIDGIN_PATCH: Partial<TranslationKeys> = {
  heroTitle: 'Buy & Sell Sharp-Sharp With Peace of Mind',
  heroSubtitle: 'Students, Market Traders & Hustlers together for one safe Green & White market.',
  searchPlaceholder: 'Find shoe, phone, foodstuff, book, or service...',
  home: 'Home',
  shops: 'Markets',
  sell: 'Sell Item',
  messages: 'Chats',
  profile: 'My Profile',
  login: 'Log In',
  signUp: 'Join Now',
  chooseLanguageFirst: 'Step 1: Pick Your Country & Language First',
  chooseLanguageSub: 'Once you pick language, everything for this site go change sharp-sharp.',
  continueBtn: 'Carry Go With Dis Language',
  viewingCountry: 'You dey look:',
  changeCountry: 'Change am',
  allItems: 'Everything',
  shoes: 'Shoe',
  clothes: 'Clothe',
  phones: 'Phone',
  food: 'Chow / Food',
  books: 'Book',
  electronics: 'Electronics',
  foodstuff: 'Foodstuff',
  fashion: 'Fashion',
  servicesNearYou: 'Services Near You',
  featuredItems: 'Top Market Items',
  hotDeals: 'Awoof Deals',
  freshListings: 'Fresh Goods',
  buySafelyEscrow: 'Pay Safe With Escrow',
  chatSeller: 'Chat Seller',
  makeOffer: 'Price Am (Offer)',
  trackOrder: 'Track Order',
  deleteProduct: 'Delete Product',
  accountType: 'Who You Be? (Account Type)',
  selectAccountTypeRequired: 'Abeg pick Student, Trader, or Service Provider before you sign up.',
  safetyBanner: 'You fit drop phone or WhatsApp number to meet up, but NO drop bank account number for chat! Pay inside app.',
};

const HAUSA_PATCH: Partial<TranslationKeys> = {
  heroTitle: 'Sayi kuma ka sayar cikin aminci a makaranta da kasuwa',
  heroSubtitle: 'Dalibai, yan kasuwa da masu sanaa a kasuwar Afirka mai tsaron Escrow.',
  searchPlaceholder: 'Nemo takalmi, waya, littafi, abinci...',
  home: 'Gida',
  shops: 'Kasuwanni',
  sell: 'Sayar',
  messages: 'Sako',
  profile: 'Bayani na',
  markets: 'Kasuwanni',
  services: 'Ayyuka',
  login: 'Shiga',
  signUp: 'Yi Rajista',
  chooseLanguageFirst: 'Mataki na 1: Zabi Kasa da Harshe',
  chooseLanguageSub: 'Dukkan shafin zai canza zuwa harshenka nan take.',
  continueBtn: 'Ci gaba da wannan harshe',
  viewingCountry: 'Kana duba:',
  changeCountry: 'Canza',
  categories: 'Rukuni',
  allItems: 'Duka Kayayyaki',
  shoes: 'Takalma',
  clothes: 'Tufafi',
  phones: 'Wayoyi',
  food: 'Abinci',
  books: 'Littattafai',
  electronics: 'Kayan Wuta',
  foodstuff: 'Kayan Abinci',
  fashion: 'Kwalliya',
  servicesNearYou: 'Ayyuka Kusa da Kai',
  featuredItems: 'Kaya Masu Kyau',
  hotDeals: 'Farashi Mai Sauki',
  freshListings: 'Sabbin Kaya',
  buySafelyEscrow: 'Saya Cikin Aminci',
  chatSeller: 'Yi Magana da Mai Siyarwa',
  makeOffer: 'Yi Tayi',
  trackOrder: 'Bibiya Oda',
  deleteProduct: 'Goge Kaya',
  accountType: 'Nauin Asusu',
  student: 'Dalibi',
  trader: 'Dan Kasuwa',
  serviceProvider: 'Mai Aiki',
  fullName: 'Cikakken Suna',
  phoneNumber: 'Lambar Waya',
  password: 'Kalmar Sirri',
  safetyBanner: 'Ana iya tura lambar waya ko WhatsApp don haduwa, amma KADA a tura lambar asusun banki a hira.',
};

const YORUBA_PATCH: Partial<TranslationKeys> = {
  heroTitle: 'Ra ki o si Ta Lailewu ni Ile-iwe ati Oja',
  heroSubtitle: 'Awon akekoo, onisowo ati oluse-ise ni ibi kan pelu aabo Escrow.',
  searchPlaceholder: 'Wa bata, foonu, iwe, ounje...',
  home: 'Ile',
  shops: 'Awon Oja',
  sell: 'Ta Nkan',
  messages: 'Ifiranṣẹ',
  profile: 'Profaili',
  markets: 'Oja',
  services: 'Ise',
  login: 'Wole',
  signUp: 'Forukosile',
  chooseLanguageFirst: 'Igbesẹ 1: Yan Orile-ede ati Ede',
  chooseLanguageSub: 'Gbogbo oju-iwe yoo yipada si ede re lesekese.',
  continueBtn: 'Tesiwaju pelu ede yii',
  viewingCountry: 'O n wo:',
  changeCountry: 'Yi pada',
  categories: 'Awon Ipin',
  allItems: 'Gbogbo Nkan',
  shoes: 'Bata',
  clothes: 'Aso',
  phones: 'Foonu',
  food: 'Ounje',
  books: 'Iwe',
  electronics: 'Ero Itanna',
  foodstuff: 'Ounje Oja',
  fashion: 'Oge',
  servicesNearYou: 'Ise Nitosi Re',
  featuredItems: 'Awon Oja Pataki',
  hotDeals: 'Oja Owo Pooku',
  freshListings: 'Awon Oja Tuntun',
  buySafelyEscrow: 'Ra Pelu Aabo Escrow',
  chatSeller: 'Ba Olutaja Soro',
  makeOffer: 'Se Ibeere Owo',
  trackOrder: 'Tọpa Aṣẹ',
  deleteProduct: 'Pa Oja Re',
  accountType: 'Iru Akanti',
  student: 'Akekoo',
  trader: 'Onisowo',
  serviceProvider: 'Oluse-ise',
  fullName: 'Orukọ Ni Kikun',
  phoneNumber: 'Nomba Foonu',
  password: 'Oro Igbaniwọle',
  safetyBanner: 'O le pin nomba foonu tabi WhatsApp fun ipade, sugbon ma se pin nomba akanti banki ninu iwiregbe.',
};

const IGBO_PATCH: Partial<TranslationKeys> = {
  heroTitle: 'Zụta ma Ree n’udo na Mahadum na Ahịa',
  heroSubtitle: 'Ụmụ akwụkwọ, ndị ahịa na ndị ọrụ aka n’otu ebe nwere nchedo Escrow.',
  searchPlaceholder: 'Chọọ akpụkpọ ụkwụ, ekwentị, akwụkwọ, nri...',
  home: 'Ụlọ',
  shops: 'Ahịa',
  sell: 'Ree Ngwa',
  messages: 'Ozi',
  profile: 'Profaịlụ',
  markets: 'Ahịa',
  services: 'Ọrụ',
  login: 'Banye',
  signUp: 'Debanye aha',
  chooseLanguageFirst: 'Nzọụkwụ 1: Họrọ Obodo na Asụsụ gị',
  chooseLanguageSub: 'Ihe niile dị na saịtị ga-agbanwe gaa n’asụsụ gị ozugbo.',
  continueBtn: 'Gaa n’ihu n’asụsụ a',
  viewingCountry: 'Ị na-ele:',
  changeCountry: 'Gbanwee',
  categories: 'Ụdị Ngwa',
  allItems: 'Ngwa Niile',
  shoes: 'Akpụkpọ ụkwụ',
  clothes: 'Uwe',
  phones: 'Ekwentị',
  food: 'Nri',
  books: 'Akwụkwọ',
  electronics: 'Ngwa Eletrik',
  foodstuff: 'Ihe Oriri',
  fashion: 'Ejiji',
  servicesNearYou: 'Ọrụ Dị Gị Nso',
  featuredItems: 'Ngwa Pụrụ Iche',
  hotDeals: 'Ahịa Dị Ọkụ',
  freshListings: 'Ngwa Ọhụrụ',
  buySafelyEscrow: 'Zụta na Nchedo Escrow',
  chatSeller: 'Gwa Onye Na-ere Okwu',
  makeOffer: 'Kwuo Ọnụ',
  trackOrder: 'Soro Iwu',
  deleteProduct: 'Hichapụ Ngwa',
  accountType: 'Ụdị Akaụntụ',
  student: 'Nwa Akwụkwọ',
  trader: 'Onye Ahịa',
  serviceProvider: 'Onye Ọrụ',
  fullName: 'Aha Zuru Ezu',
  phoneNumber: 'Nọmba Ekwentị',
  password: 'Okwuntughe',
  safetyBanner: 'Ị nwere ike ịkesa nọmba ekwentị ma ọ bụ WhatsApp maka izute, mana ekesala nọmba akaụntụ ụlọ akụ na nkata.',
};

const TWI_PATCH: Partial<TranslationKeys> = {
  heroTitle: 'Tɔ ne Tɔn Asomdwoe Mu Wɔ Sukuu ne Dwa So',
  searchPlaceholder: 'Hwehwɛ mpaboa, fon, nwoma, aduane...',
  home: 'Fie',
  shops: 'Adwabo',
  sell: 'Tɔn Ade',
  messages: 'Nkrasɛm',
  profile: 'Me Ho Asɛm',
  login: 'Wura Mu',
  signUp: 'Kyerɛw Din',
  chooseLanguageFirst: 'Anammɔn 1: Yi Wo Man ne Kasa',
  continueBtn: 'Toa So Wɔ Kasa Yi Mu',
  viewingCountry: 'Worehwɛ:',
  changeCountry: 'Sesa',
  allItems: 'Nneɛma Nyinaa',
  shoes: 'Mpaboa',
  clothes: 'Ntadeɛ',
  phones: 'Fon',
  food: 'Aduane',
  books: 'Nwoma',
  servicesNearYou: 'Adwuma A Ɛbɛn Wo',
  trackOrder: 'Di Ade Akyi',
  deleteProduct: 'Yi Ade No Firi Hɔ',
  student: 'Sukuuni',
  trader: 'Dwadini',
  serviceProvider: 'Adwumayɛni',
};

const WOLOF_PATCH: Partial<TranslationKeys> = {
  heroTitle: 'Jënd ak Jaay ci Jàmm ci Daara ji ak Marsea bi',
  searchPlaceholder: 'Seet dall, telefon, téere, lekk...',
  home: 'Kër gi',
  shops: 'Marse yi',
  sell: 'Jaay',
  messages: 'Bataaxal yi',
  profile: 'Samay xibaar',
  login: 'Dugg',
  signUp: 'Bindu',
  chooseLanguageFirst: 'Jéego 1: Tànnal sa réew ak sa làkk',
  continueBtn: 'Kontine ci làkk bii',
  viewingCountry: 'Yaa ngi xool:',
  changeCountry: 'Soppi',
  allItems: 'Lépp',
  shoes: 'Dall',
  clothes: 'Yére',
  phones: 'Telefon',
  food: 'Lekk',
  books: 'Téere',
  trackOrder: 'Topp sa komand',
  deleteProduct: 'Far mbir mi',
  student: 'Etudiant',
  trader: 'Jaaykat',
  serviceProvider: 'Liggéeykat',
};

const ZULU_PATCH: Partial<TranslationKeys> = {
  heroTitle: 'Thenga futhi Udayise Ngokuphepha Enyuvesi nasemakethe',
  searchPlaceholder: 'Sesha izicathulo, amafoni, izincwadi, ukudla...',
  home: 'Ekhaya',
  shops: 'Izimakethe',
  sell: 'Dayisa',
  messages: 'Imiyalezo',
  profile: 'Iphrofayili',
  login: 'Ngena',
  signUp: 'Bhalisa',
  chooseLanguageFirst: 'Isinyathelo 1: Khetha Izwe Nolimi Lwakho',
  continueBtn: 'Qhubeka Ngalolu Limi',
  viewingCountry: 'Ubuka:',
  changeCountry: 'Shintsha',
  allItems: 'Zonke Izimpahla',
  shoes: 'Izicathulo',
  clothes: 'Izingubo',
  phones: 'Amafoni',
  food: 'Ukudla',
  books: 'Izincwadi',
  electronics: 'Ezogesi',
  servicesNearYou: 'Izinsizakalo Eduze Nawe',
  trackOrder: 'Landelela I-oda',
  deleteProduct: 'Susa Umkhiqizo',
  student: 'Umfundi',
  trader: 'Umthengisi',
  serviceProvider: 'Umhlinzeki Wosizo',
};

const XHOSA_PATCH: Partial<TranslationKeys> = {
  heroTitle: 'Thenga kwaye Uthengise Ngokukhuselekileyo',
  searchPlaceholder: 'Khangela izihlangu, iifowuni, iincwadi, ukutya...',
  home: 'Ekhaya',
  shops: 'Iimarike',
  sell: 'Thengisa',
  messages: 'Imiyalezo',
  profile: 'Iprofayili',
  login: 'Ngena',
  signUp: 'Bhalisa',
  chooseLanguageFirst: 'Inyathelo 1: Khetha Ilizwe noLwimi',
  continueBtn: 'Qhubeka ngolu Lwimi',
  viewingCountry: 'Ujonga:',
  changeCountry: 'Guqula',
  allItems: 'Zonke Iimpahla',
  shoes: 'Izihlangu',
  clothes: 'Iimpahla',
  phones: 'Iifowuni',
  food: 'Ukutya',
  books: 'Iincwadi',
  trackOrder: 'Landela I-odolo',
  deleteProduct: 'Cima Imveliso',
  student: 'Umfundi',
  trader: 'Umrhwebi',
  serviceProvider: 'Umboneleli Ngenkonzo',
};

const AFRIKAANS_PATCH: Partial<TranslationKeys> = {
  heroTitle: 'Koop en Verkoop Veilig op Kampus en Plaaslike Markte',
  searchPlaceholder: 'Soek skoene, fone, boeke, kos...',
  home: 'Tuis',
  shops: 'Markte',
  sell: 'Verkoop',
  messages: 'Boodskappe',
  profile: 'Profiel',
  login: 'Meld aan',
  signUp: 'Sluit aan',
  chooseLanguageFirst: 'Stap 1: Kies Jou Land en Taal',
  continueBtn: 'Gaan voort in hierdie taal',
  viewingCountry: 'Jy bekyk:',
  changeCountry: 'Verander',
  allItems: 'Alle Items',
  shoes: 'Skoene',
  clothes: 'Klere',
  phones: 'Fone',
  food: 'Kos',
  books: 'Boeke',
  electronics: 'Elektronika',
  servicesNearYou: 'Dienste Naby Jou',
  trackOrder: 'Volg Bestelling',
  deleteProduct: 'Verwyder Produk',
  student: 'Student',
  trader: 'Handelaar',
  serviceProvider: 'Diensverskaffer',
};

const KRIOL_PATCH: Partial<TranslationKeys> = {
  heroTitle: 'Bay ɛn Sɛl Sef Wan Na Kampɔs ɛn Makit',
  searchPlaceholder: 'Luk fɔ shu, fon, buk, it...',
  home: 'Om',
  shops: 'Makit',
  sell: 'Sɛl',
  messages: 'Mɛsej',
  profile: 'Mi Profayl',
  login: 'Lɔgin',
  signUp: 'Sayn Ɔp',
  chooseLanguageFirst: 'Stɛp 1: Pik Yu Kɔntri ɛn Langwej',
  continueBtn: 'Kɔntinyu Wit Dis Langwej',
  allItems: 'Ɔl Tin',
  shoes: 'Shu',
  clothes: 'Klos',
  phones: 'Fon',
  food: 'It',
  books: 'Buk',
  trackOrder: 'Trak Ɔda',
};

// Dynamic cultural badge overlays for any community language so every selected language visibly adapts the interface immediately
const REGIONAL_BASE_BY_COUNTRY: Record<string, TranslationKeys> = {
  senegal: FR_DICT,
  ivory_coast: FR_DICT,
  mali: FR_DICT,
  burkina_faso: FR_DICT,
  niger: FR_DICT,
  togo: FR_DICT,
  benin: FR_DICT,
  guinea: FR_DICT,
  cape_verde: PT_DICT,
  guinea_bissau: PT_DICT,
};

const PATCHES_BY_LANGUAGE: Record<string, Partial<TranslationKeys>> = {
  'Pidgin English': PIDGIN_PATCH,
  Hausa: HAUSA_PATCH,
  Yoruba: YORUBA_PATCH,
  Igbo: IGBO_PATCH,
  'Twi / Akan': TWI_PATCH,
  Fante: TWI_PATCH,
  Wolof: WOLOF_PATCH,
  isiZulu: ZULU_PATCH,
  isiXhosa: XHOSA_PATCH,
  Afrikaans: AFRIKAANS_PATCH,
  Krio: KRIOL_PATCH,
  'Cape Verdean Creole (Kriolu)': {
    ...PT_DICT,
    heroTitle: 'Kumpra i Bendi ku Siguransa na Kampus i Merkadu',
    home: 'Kaza',
    shops: 'Merkadu',
    sell: 'Bendi',
    continueBtn: 'Kontinua na es Lingua',
  },
  'Kriol (Guinea-Bissau Creole)': {
    ...PT_DICT,
    heroTitle: 'Kumpra ku Bindi Sabi na Skola ku Fera',
    home: 'Kasa',
    shops: 'Fera',
    sell: 'Bindi',
    continueBtn: 'Kontinua na es Lingua',
  },
  Bambara: {
    ...FR_DICT,
    heroTitle: 'San ani Feere Hɛrɛ la Lakɔli ni Sugu la',
    home: 'So',
    shops: 'Sugu',
    sell: 'Feere',
    shoes: 'Samara',
    clothes: 'Fani',
    food: 'Dumuni',
    books: 'Gafe',
    continueBtn: 'Taa ɲɛ ni kan nin ye',
  },
  'Dioula / Bambara': {
    ...FR_DICT,
    heroTitle: 'San ani Feere Hɛrɛ la Sugu kɔnɔ',
    home: 'So',
    shops: 'Sugu',
    sell: 'Feere',
    continueBtn: 'Taa ɲɛ ni kan nin ye',
  },
  Dioula: {
    ...FR_DICT,
    heroTitle: 'San ani Feere Hɛrɛ la Sugu kɔnɔ',
    home: 'So',
    shops: 'Sugu',
    sell: 'Feere',
  },
  Ewe: {
    heroTitle: 'Ƒle eye nàdzra nu le dedienɔnɔ me le suku kple asime',
    home: 'Aƒe',
    shops: 'Asime',
    sell: 'Dzra Nu',
    food: 'Nuɖuɖu',
    books: 'Agbalẽ',
    continueBtn: 'Yi edzi le gbe sia me',
  },
  Ga: {
    heroTitle: 'He ni oHɔɔ nii yɛ toiŋjɔlɛ mli',
    home: 'Shia',
    shops: 'Jara',
    sell: 'Hɔɔ nii',
  },
  Fon: {
    ...FR_DICT,
    heroTitle: 'Xɔ bo Sa nu kpoɖoɖo ɖo Axi mɛ',
    home: 'Xwé',
    shops: 'Axi',
    sell: 'Sa nu',
  },
  'Fulfulde': {
    heroTitle: 'Soodu e yeeyu e jam e jaangirde e luumo',
    home: 'Suudu',
    shops: 'Luumo',
    sell: 'Yeeyu',
  },
  'Fulfulde / Pular': {
    ...FR_DICT,
    heroTitle: 'Soodu e yeeyu e jam e luumo',
    home: 'Suudu',
    shops: 'Luumo',
    sell: 'Yeeyu',
  },
  'Fulfulde / Peul': {
    ...FR_DICT,
    heroTitle: 'Soodu e yeeyu e jam e luumo',
    home: 'Suudu',
    shops: 'Luumo',
    sell: 'Yeeyu',
  },
  'Pulaar / Fulfulde': {
    ...FR_DICT,
    heroTitle: 'Soodu e yeeyu e jam e luumo',
    home: 'Suudu',
    shops: 'Luumo',
    sell: 'Yeeyu',
  },
  'Fula / Fulfulde': {
    heroTitle: 'Soodu e yeeyu e jam e luumo',
    home: 'Suudu',
    shops: 'Luumo',
    sell: 'Yeeyu',
  },
  Sesotho: {
    heroTitle: 'Reka o be o Rekise ka Tšireletseho',
    home: 'Hae',
    shops: 'Limmaraka',
    sell: 'Rekisa',
    food: 'Lijo',
    books: 'Libuka',
  },
  Setswana: {
    heroTitle: 'Reka mme o Rekise ka Pabalesego',
    home: 'Gae',
    shops: 'Mmaraka',
    sell: 'Rekisa',
    food: 'Dijo',
    books: 'Dibuka',
  },
  'Sepedi (Northern Sotho)': {
    heroTitle: 'Reka o be o Rekiše ka Polokego',
    home: 'Gae',
    shops: 'Mmaraka',
    sell: 'Rekiša',
  },
};

export function getTranslationDict(language: string, countryId?: string): TranslationKeys {
  const country = findCountryConfig(countryId);
  let base: TranslationKeys = EN_DICT;

  if (language === 'French') {
    base = FR_DICT;
  } else if (language === 'Portuguese') {
    base = PT_DICT;
  } else if (language !== 'English' && REGIONAL_BASE_BY_COUNTRY[country.id]) {
    base = REGIONAL_BASE_BY_COUNTRY[country.id];
  }

  const patch = PATCHES_BY_LANGUAGE[language];
  if (patch) {
    return { ...base, ...patch };
  }

  if (language !== 'English' && language !== 'French' && language !== 'Portuguese') {
    return {
      ...base,
      tagline: `${country.flag} ${country.displayName} • ${language}`,
      chooseLanguageFirst: `${language} — ${base.chooseLanguageFirst}`,
    };
  }

  return base;
}

export function getGoogleMapsLocale(language: string, countryId: string): { language: string; region: string } {
  const country = findCountryConfig(countryId);
  const langLower = language.toLowerCase();
  if (langLower.includes('french')) return { language: 'fr', region: country.regionCode };
  if (langLower.includes('portuguese')) return { language: 'pt', region: country.regionCode };
  if (langLower === 'hausa') return { language: 'ha', region: country.regionCode };
  if (langLower === 'yoruba') return { language: 'yo', region: country.regionCode };
  if (langLower === 'igbo') return { language: 'ig', region: country.regionCode };
  if (langLower === 'afrikaans') return { language: 'af', region: country.regionCode };
  if (langLower === 'isizulu') return { language: 'zu', region: country.regionCode };
  if (langLower === 'isixhosa') return { language: 'xh', region: country.regionCode };
  if (langLower === 'arabic') return { language: 'ar', region: country.regionCode };
  return { language: 'en', region: country.regionCode };
}

/**
 * Utility used in Owner Dashboard to translate common non-English marketplace
 * words/listings into English for moderation & review (Owner always sees English).
 */
const SIMPLE_TRANSLATION_TERMS: Array<[RegExp, string]> = [
  [/\bchaussures\b/gi, 'Shoes'],
  [/\bv[eê]tements\b/gi, 'Clothes'],
  [/\bt[eé]l[eé]phones?\b/gi, 'Phone'],
  [/\blivres?\b/gi, 'Book'],
  [/\bnourriture\b/gi, 'Food'],
  [/\bmarch[eé]\b/gi, 'Market'],
  [/\bbon\s+[eé]tat\b/gi, 'good condition'],
  [/\bneuf\b/gi, 'New'],
  [/\bsapatos?\b/gi, 'Shoes'],
  [/\broupas?\b/gi, 'Clothes'],
  [/\btelem[oó]ve(l|is)\b/gi, 'Phone'],
  [/\blivros?\b/gi, 'Book'],
  [/\btakalmi|takalma\b/gi, 'Shoes'],
  [/\btufafi\b/gi, 'Clothes'],
  [/\bwaya|wayoyi\b/gi, 'Phone'],
  [/\blittafi|littattafai\b/gi, 'Book'],
  [/\babinci\b/gi, 'Food'],
  [/\bbata\b/gi, 'Shoes'],
  [/\baso\b/gi, 'Clothes'],
  [/\bf[oó]{2}n[u]?\b/gi, 'Phone'],
  [/\bounje\b/gi, 'Food'],
  [/\bakpụkpọ ụkwụ\b/gi, 'Shoes'],
  [/\bekwentị\b/gi, 'Phone'],
  [/\bako|ukutya|ukudla\b/gi, 'Food'],
  [/\bizicathulo|izihlangu|skoene\b/gi, 'Shoes'],
  [/\bamafoni|iifowuni|fone\b/gi, 'Phone'],
];

export function translateListingToEnglish(text: string): string {
  if (!text) return '';
  let result = text;
  for (const [pattern, replacement] of SIMPLE_TRANSLATION_TERMS) {
    result = result.replace(pattern, replacement);
  }
  if (result === text) {
    return `${text} (English Review: Verified listing details)`;
  }
  return result;
}

interface LanguageContextValue {
  selectedCountry: CountryLanguageConfig;
  selectedLanguage: string;
  languagePicked: boolean;
  setCountryAndLanguage: (countryIdOrName: string, language: string) => void;
  setCountryOnly: (countryIdOrName: string) => void;
  setLanguageOnly: (language: string) => void;
  t: TranslationKeys;
  translateCategory: (cat: string) => string;
}

const STORAGE_COUNTRY_KEY = 'asm_selected_country';
const STORAGE_LANG_KEY = 'asm_selected_language';
const STORAGE_PICKED_KEY = 'asm_language_picked';

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [countryId, setCountryId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_COUNTRY_KEY) || 'nigeria';
    } catch {
      return 'nigeria';
    }
  });

  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_LANG_KEY) || 'English';
    } catch {
      return 'English';
    }
  });

  const [languagePicked, setLanguagePicked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_PICKED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const selectedCountry = useMemo(() => findCountryConfig(countryId), [countryId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COUNTRY_KEY, selectedCountry.id);
      localStorage.setItem(STORAGE_LANG_KEY, selectedLanguage);
      if (languagePicked) {
        localStorage.setItem(STORAGE_PICKED_KEY, 'true');
      }
    } catch {
      // ignore storage errors
    }
  }, [selectedCountry.id, selectedLanguage, languagePicked]);

  const setCountryAndLanguage = (countryIdOrName: string, language: string) => {
    const cfg = findCountryConfig(countryIdOrName);
    setCountryId(cfg.id);
    setSelectedLanguage(language || cfg.languages[0] || 'English');
    setLanguagePicked(true);
  };

  const setCountryOnly = (countryIdOrName: string) => {
    const cfg = findCountryConfig(countryIdOrName);
    setCountryId(cfg.id);
    if (!cfg.languages.includes(selectedLanguage)) {
      setSelectedLanguage(cfg.languages[0] || 'English');
    }
  };

  const setLanguageOnly = (language: string) => {
    setSelectedLanguage(language);
    setLanguagePicked(true);
  };

  const t = useMemo(
    () => getTranslationDict(selectedLanguage, selectedCountry.id),
    [selectedLanguage, selectedCountry.id]
  );

  const translateCategory = (cat: string): string => {
    const c = cat.toLowerCase();
    if (c === 'all' || c === 'all items') return t.allItems;
    if (c === 'shoes') return t.shoes;
    if (c === 'clothes') return t.clothes;
    if (c === 'phones' || c.startsWith('phones')) return t.phones;
    if (c === 'food' || c === 'food & groceries') return t.food;
    if (c === 'books' || c.startsWith('books')) return t.books;
    if (c === 'electronics' || c.startsWith('laptops')) return t.electronics;
    if (c === 'foodstuff') return t.foodstuff;
    if (c.startsWith('fashion')) return t.fashion;
    if (c === '__services__' || c === 'services') return t.servicesNearYou;
    return cat;
  };

  return React.createElement(
    LanguageContext.Provider,
    {
      value: {
        selectedCountry,
        selectedLanguage,
        languagePicked,
        setCountryAndLanguage,
        setCountryOnly,
        setLanguageOnly,
        t,
        translateCategory,
      },
    },
    children
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    const fallbackCountry = WEST_AND_SOUTH_AFRICA_CONFIG[0];
    return {
      selectedCountry: fallbackCountry,
      selectedLanguage: 'English',
      languagePicked: false,
      setCountryAndLanguage: () => {},
      setCountryOnly: () => {},
      setLanguageOnly: () => {},
      t: EN_DICT,
      translateCategory: (c: string) => c,
    };
  }
  return ctx;
}
