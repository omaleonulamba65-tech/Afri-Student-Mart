import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import { WEST_AND_SOUTH_AFRICA_COUNTRIES } from '../data/countries';
import { getStatesByCountry } from '../data/countryDocuments';
import {
  NIGERIAN_INSTITUTIONS,
  getInstitutionsByCountry,
} from '../data/institutions';
import {
  getCountryConfig,
  getCountryDisplayName,
} from '../data/languages';
import { ALL_MARKET_NAMES, getMarketsByCountry } from '../data/markets';
import { api, compressImageFile } from '../lib/api';
import { useI18n } from '../lib/i18nContext';
import {
  AccountBadge,
  ITEM_CATEGORIES,
  PolicyPageId,
  PublicUser,
  SERVICE_CATEGORIES,
} from '../types';
import { BrandLogo } from './Logo';

interface AuthModalProps {
  open: boolean;
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onSuccess: (token: string, user: PublicUser, isNewSignup?: boolean) => void;
  onOpenPolicy: (policyId: PolicyPageId) => void;
}

const LEVELS = [
  '100 Level',
  '200 Level',
  '300 Level',
  '400 Level',
  '500 Level',
  'ND 1',
  'ND 2',
  'HND 1',
  'HND 2',
  'NCE',
  'Postgraduate',
];

const QUICK_TRADER_PRODUCTS = [
  'Foodstuffs & Groceries',
  'Clothes & Fashion',
  'Shoes & Sneakers',
  'Bags & Backpacks',
  'Phone Accessories',
  'Textbooks & Stationery',
  'Beauty & Skincare',
  'Hostel Essentials',
  'Electronics',
];

function getServiceConversationPrompt(serviceType: string): {
  question: string;
  placeholder: string;
  helperTip: string;
} {
  const s = serviceType.toLowerCase();
  if (s.includes('laundry')) {
    return {
      question: 'Tell us about your laundry setup: Which areas do you pick up/deliver from and how fast is your turnaround?',
      placeholder: 'e.g. Same-day & 24hr wash/iron around Hostel A-D & Wuse, free pickup for 10+ clothes',
      helperTip: 'Afri Assistant will use this to answer student laundry inquiries & suggest your service.',
    };
  }
  if (s.includes('hair') || s.includes('makeup')) {
    return {
      question: 'What styles or looks do you specialize in, and do you offer hostel home-service or studio sessions?',
      placeholder: 'e.g. Knotless braids, wig revamping, bridal & birthday glam — hostel home service available',
      helperTip: 'Afri Assistant will remember your specialty and match you with customers looking for it.',
    };
  }
  if (s.includes('phone') || s.includes('repair')) {
    return {
      question: 'Which phone brands & repairs do you handle (screens, batteries, charging ports) and how fast?',
      placeholder: 'e.g. iPhone, Samsung, Tecno & Infinix screen/battery replacement in 1 hour with warranty',
      helperTip: 'Afri Assistant will quote your specialty & turnaround when students ask for phone repairs.',
    };
  }
  if (s.includes('tutor')) {
    return {
      question: 'Which courses, subjects, or exams do you tutor, and do you hold physical or online sessions?',
      placeholder: 'e.g. MTH 101, CHM, GST & JAMB/WAEC prep — one-on-one at campus library or WhatsApp/Zoom',
      helperTip: 'Afri Assistant will follow up with tutoring tips & direct students needing those courses to you.',
    };
  }
  if (s.includes('delivery')) {
    return {
      question: 'Which campuses, hostels, or city zones do you deliver to, and do you use dispatch bike or foot?',
      placeholder: 'e.g. Fast campus & city dispatch bike delivery across Abuja, Gwagwalada, Wuse & Lugbe',
      helperTip: 'Afri Assistant will help route delivery leads in your covered zones to you.',
    };
  }
  if (s.includes('photo')) {
    return {
      question: 'What shoots do you cover (portraits, graduations, events, product photos) & delivery time?',
      placeholder: 'e.g. Matriculation, convocation, hostel portraits & product photography with edited copies in 24h',
      helperTip: 'Afri Assistant will follow up with photoshoot package ideas for your bookings.',
    };
  }
  if (s.includes('graphic')) {
    return {
      question: 'What designs do you create (flyers, logos, CVs, brand kits) & how fast do you deliver?',
      placeholder: 'e.g. Business flyers, campus event posters, logos & CVs delivered within 12 hours',
      helperTip: 'Afri Assistant will connect campus sellers & traders who need flyers/logos with you.',
    };
  }
  if (s.includes('plumb')) {
    return {
      question: 'What plumbing jobs do you handle (leaks, sinks, pipes, pumps) & do you take emergency callouts?',
      placeholder: 'e.g. Hostels & apartments — leaking taps, toilet/sink fixes, water tank & emergency repairs',
      helperTip: 'Afri Assistant will highlight your rapid response areas to customers.',
    };
  }
  if (s.includes('electr')) {
    return {
      question: 'What electrical work do you do (sockets, fans, lighting, inverters/solar) & response time?',
      placeholder: 'e.g. Room wiring, ceiling fan installation, socket repairs & solar/inverter setup',
      helperTip: 'Afri Assistant will remember your electrical specialty for nearby booking requests.',
    };
  }
  return {
    question: `Tell Afri Assistant about your "${serviceType || 'service'}" — what do you offer & what makes it stand out?`,
    placeholder: 'e.g. Reliable service around campus, flexible hours, quick turnaround & student-friendly rates',
    helperTip: 'Afri Assistant will remember your Service Type and continue the conversation with you.',
  };
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  initialMode = 'login',
  onClose,
  onSuccess,
  onOpenPolicy,
}) => {
  const { country, language, setCountryAndLanguage, t } = useI18n();
  const initialCountry = country === 'All' ? 'Nigeria' : country;
  const initialCfg = getCountryConfig(initialCountry);

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  // Step 1: Phone + Country Code
  // Step 2: Buyer or Seller?
  // Step 3: If Buyer -> Easy Buyer Signup (Name, Phone, Area). If Seller -> Choose Student / Trader / Service Provider
  // Step 4: (Seller only) Role-specific details (Student ID + School | Business Name + Products | Service Type + Follow-up)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [signupCountry, setSignupCountry] = useState<string>(initialCfg.country);
  const [signupLanguage, setSignupLanguage] = useState<string>(language || 'English');
  const [countryCode, setCountryCode] = useState(initialCfg.dialCode || '+234');
  const [phone, setPhone] = useState('');

  const [role, setRole] = useState<'buyer' | 'seller' | ''>('');
  const [sellerType, setSellerType] = useState<AccountBadge | ''>('');

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginName, setLoginName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Common user fields
  const [fullName, setFullName] = useState('');
  const [stateName, setStateName] = useState(
    () => getStatesByCountry(initialCfg.country)[0] || initialCfg.country
  );
  const [area, setArea] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [agreedPolicies, setAgreedPolicies] = useState(true);

  // Student Seller fields (Student ID + School)
  const [studentId, setStudentId] = useState('');
  const [instSearch, setInstSearch] = useState('');
  const [institution, setInstitution] = useState(() => {
    const list = getInstitutionsByCountry(initialCfg.country);
    return list[0]?.name || `${initialCfg.country} Campus`;
  });
  const [customSchool, setCustomSchool] = useState('');
  const [level, setLevel] = useState('200 Level');
  const [schoolIdPhoto, setSchoolIdPhoto] = useState('');

  // Trader Seller fields (Business Name + Products)
  const [shopName, setShopName] = useState('');
  const [traderProducts, setTraderProducts] = useState('');
  const [market, setMarket] = useState('');

  // Service Provider Seller fields (Service Type + conversation follow-up)
  const [serviceCategory, setServiceCategory] = useState<string>(SERVICE_CATEGORIES[0]);
  const [customServiceType, setCustomServiceType] = useState('');
  const [serviceDetails, setServiceDetails] = useState('');
  const [priceFrom, setPriceFrom] = useState('2000');
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setStep(1);
      setError('');
      setInfoMessage('');
      const targetCountry = country === 'All' ? 'Nigeria' : country;
      const cfg = getCountryConfig(targetCountry);
      setSignupCountry(cfg.country);
      setCountryCode(cfg.dialCode);
      setSignupLanguage(
        cfg.languages.includes(language) ? language : cfg.languages[0] || 'English'
      );
      const states = getStatesByCountry(cfg.country);
      setStateName(states[0] || cfg.country);
      const countryInsts = getInstitutionsByCountry(cfg.country);
      setInstitution(countryInsts[0]?.name || `${cfg.country} Main Campus`);
    }
  }, [open, initialMode, country, language]);

  const activeSignupCountryCfg = getCountryConfig(signupCountry);
  const availableStates = useMemo(() => getStatesByCountry(signupCountry), [signupCountry]);
  const countryMarkets = useMemo(() => {
    const groups = getMarketsByCountry(signupCountry);
    const list = groups.flatMap((g) => g.markets);
    return list.length > 0 ? list : ALL_MARKET_NAMES;
  }, [signupCountry]);

  const filteredInstitutions = useMemo(() => {
    const q = instSearch.trim().toLowerCase();
    const countryList = getInstitutionsByCountry(signupCountry);
    const baseList = countryList.length > 0 ? countryList : NIGERIAN_INSTITUTIONS;
    if (!q) return baseList;
    return baseList.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.shortName.toLowerCase().includes(q) ||
        i.state.toLowerCase().includes(q) ||
        (i.country || '').toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q)
    );
  }, [instSearch, signupCountry]);

  const resolvedServiceType =
    serviceCategory === '__OTHER__'
      ? customServiceType.trim() || 'Custom Service'
      : serviceCategory;
  const servicePrompt = useMemo(
    () => getServiceConversationPrompt(resolvedServiceType),
    [resolvedServiceType]
  );

  if (!open) return null;

  const handleSelectCountryByDialCode = (nextCode: string) => {
    setCountryCode(nextCode);
    const matched = WEST_AND_SOUTH_AFRICA_COUNTRIES.find((c) => c.code === nextCode);
    if (!matched) return;
    const cfg = getCountryConfig(matched.country);
    setSignupCountry(cfg.country);
    const defaultLang = cfg.languages.includes(signupLanguage)
      ? signupLanguage
      : cfg.languages[0] || 'English';
    setSignupLanguage(defaultLang);
    setCountryAndLanguage(cfg.country, defaultLang, true);
    setMarket('');
    setArea('');
    const nextStates = getStatesByCountry(cfg.country);
    const countryInsts = getInstitutionsByCountry(cfg.country);
    if (countryInsts.length > 0) {
      setInstitution(countryInsts[0].name);
      const matchedState = nextStates.find(
        (s) =>
          s.toLowerCase().includes(countryInsts[0].state.toLowerCase()) ||
          countryInsts[0].state.toLowerCase().includes(s.toLowerCase())
      );
      setStateName(matchedState || nextStates[0] || countryInsts[0].state);
    } else {
      setInstitution(`${cfg.country} Main Campus`);
      setStateName(nextStates[0] || cfg.country);
    }
  };

  const handleSelectInstitution = (instName: string) => {
    setInstitution(instName);
    const match = NIGERIAN_INSTITUTIONS.find((i) => i.name === instName);
    if (match) {
      setStateName(match.state);
    }
  };

  const handleSingleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setCompressingImage(true);
    try {
      const compressed = await compressImageFile(file, 800, 200 * 1024);
      setter(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process photo.');
    } finally {
      setCompressingImage(false);
    }
    e.target.value = '';
  };

  const handleWorkPhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError('');
    const remaining = 4 - workPhotos.length;
    if (remaining <= 0) {
      setError('Up to 4 work photos allowed.');
      return;
    }
    setCompressingImage(true);
    try {
      const compressed = await Promise.all(
        files.slice(0, remaining).map((f) => compressImageFile(f, 800, 200 * 1024))
      );
      setWorkPhotos((prev) => [...prev, ...compressed].slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process work photos.');
    } finally {
      setCompressingImage(false);
    }
    e.target.value = '';
  };

  const toggleProductTag = (tag: string) => {
    const current = traderProducts
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (current.some((c) => c.toLowerCase() === tag.toLowerCase())) {
      setTraderProducts(
        current.filter((c) => c.toLowerCase() !== tag.toLowerCase()).join(', ')
      );
    } else {
      setTraderProducts([...current, tag].join(', '));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    const identifier = loginIdentifier.trim();
    if (!identifier || !password) {
      setError('Enter your Email Address (or Phone Number) and Password.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.login({
        email: identifier.includes('@') ? identifier : undefined,
        phone_number: identifier,
        password,
        full_name: loginName.trim() || undefined,
      });
      onSuccess(res.token, res.user, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Continue = () => {
    setError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) {
      setError('Enter a valid phone number (at least 7 digits).');
      return;
    }
    if (!countryCode) {
      setError('Pick your country code.');
      return;
    }
    setCountryAndLanguage(signupCountry, signupLanguage, true);
    setStep(2);
  };

  const handleSelectBuyerOrSeller = (chosen: 'buyer' | 'seller') => {
    setError('');
    setRole(chosen);
    if (chosen === 'buyer') {
      setSellerType('');
    }
    setStep(3);
  };

  const handleSelectSellerType = (chosen: AccountBadge) => {
    setError('');
    setSellerType(chosen);
    setStep(4);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7) {
      setError('Enter a valid phone number.');
      return;
    }
    if (!fullName.trim()) {
      setError('Enter your Full Name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid Email Address for sign in & order receipts.');
      return;
    }
    if (password.length < 6) {
      setError('Create a password with at least 6 characters.');
      return;
    }
    if (!agreedPolicies) {
      setError('Please tick "I agree to Policies" to finish creating your account.');
      return;
    }

    if (role === 'buyer') {
      if (!area.trim()) {
        setError('Enter your Area / Neighborhood (no Student ID or documents needed).');
        return;
      }
    } else if (role === 'seller') {
      if (!sellerType) {
        setError('Choose your Seller option: Student, Trader, or Service Provider.');
        return;
      }
      if (sellerType === 'student') {
        const finalSchool =
          institution === '__CUSTOM__' ? customSchool.trim() : institution.trim();
        if (!studentId.trim()) {
          setError('Enter your Student ID / Matric Number.');
          return;
        }
        if (!finalSchool) {
          setError('Select or enter your School name.');
          return;
        }
      } else if (sellerType === 'trader') {
        if (!shopName.trim()) {
          setError('Enter your Business Name.');
          return;
        }
        if (!traderProducts.trim()) {
          setError('Enter the Products you sell.');
          return;
        }
      } else if (sellerType === 'service_provider') {
        if (!resolvedServiceType.trim()) {
          setError('Choose or enter your Service Type.');
          return;
        }
      }
    } else {
      setError('Choose whether to sign up as Buyer or Seller.');
      return;
    }

    setLoading(true);
    try {
      const isBuyer = role === 'buyer';
      const finalSchool =
        institution === '__CUSTOM__' ? customSchool.trim() : institution.trim();
      const finalArea =
        area.trim() || market.trim() || stateName || availableStates[0] || signupCountry;

      const res = await api.signup({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phone.trim(),
        country_code: countryCode,
        country: signupCountry,
        language: signupLanguage,
        password,
        account_type: isBuyer ? 'buyer' : (sellerType as AccountBadge),
        role: isBuyer ? 'buyer' : 'seller',
        institution:
          !isBuyer && sellerType === 'student'
            ? finalSchool
            : isBuyer
            ? ''
            : market.trim() || finalArea,
        student_id: !isBuyer && sellerType === 'student' ? studentId.trim() : undefined,
        id_doc_number: !isBuyer && sellerType === 'student' ? studentId.trim() : undefined,
        level: !isBuyer && sellerType === 'student' ? level : undefined,
        school_id_photo: !isBuyer && sellerType === 'student' ? schoolIdPhoto : undefined,
        shop_name: !isBuyer && sellerType === 'trader' ? shopName.trim() : undefined,
        trader_products: !isBuyer && sellerType === 'trader' ? traderProducts.trim() : undefined,
        market: !isBuyer && sellerType === 'trader' ? (market.trim() || finalArea) : undefined,
        service_category:
          !isBuyer && sellerType === 'service_provider' ? resolvedServiceType : undefined,
        service_details:
          !isBuyer && sellerType === 'service_provider' ? serviceDetails.trim() : undefined,
        price_from:
          !isBuyer && sellerType === 'service_provider'
            ? Number(priceFrom || 2000)
            : undefined,
        work_photos:
          !isBuyer && sellerType === 'service_provider' ? workPhotos : undefined,
        state: stateName || availableStates[0] || signupCountry,
        campus: finalArea,
        profile_pic: profilePic || undefined,
        agreed_policies: agreedPolicies,
      });

      setCountryAndLanguage(signupCountry, signupLanguage, true);
      if (res.needsEmailConfirmation || !res.token) {
        setLoginIdentifier(email.trim().toLowerCase());
        setMode('login');
        setInfoMessage(
          `Account created for ${email.trim().toLowerCase()}! Check your inbox to confirm your email, then sign in below.`
        );
      } else {
        onSuccess(res.token, res.user, true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = role === 'buyer' ? 3 : 4;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white sm:bg-black/60 sm:items-center sm:justify-center sm:p-4">
      <div className="flex flex-col w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg bg-white sm:rounded-2xl sm:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-white">
          <BrandLogo size="sm" />
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
            aria-label="Close sign in"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1.5 mx-5 mt-4 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setInfoMessage('');
            }}
            className={`min-h-[44px] rounded-lg text-sm font-bold transition-colors ${
              mode === 'login' ? 'bg-white text-green-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            {t('login_title')}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setStep(1);
              setError('');
              setInfoMessage('');
            }}
            className={`min-h-[44px] rounded-lg text-sm font-bold transition-colors ${
              mode === 'signup' ? 'bg-white text-green-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            {t('signup_free')}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {compressingImage && (
            <div className="mb-3 rounded-xl bg-green-50 border border-green-300 px-3.5 py-2.5 text-xs font-bold text-green-900 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-green-700" />
              <span>Compressing image... (max 800px, &le;200KB)</span>
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </div>
          )}
          {infoMessage && (
            <div className="mb-4 rounded-xl bg-green-50 border border-green-300 px-4 py-3 text-sm font-semibold text-green-900">
              {infoMessage}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t('welcome_back')}</h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Sign in with your Email Address (or Phone Number) and Password.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Email Address or Phone Number
                </label>
                <div className="flex gap-2">
                  {!loginIdentifier.includes('@') && (
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      aria-label="Country code"
                      className="w-28 min-h-[48px] rounded-xl border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-800 focus:border-green-700 focus:outline-none shrink-0"
                    >
                      {WEST_AND_SOUTH_AFRICA_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="you@example.com or 08012345678"
                    className="flex-1 min-h-[48px] rounded-xl border border-slate-300 px-4 text-base focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  {t('password_label')}
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 pr-12 text-base focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full / Business Name (Optional)
                </label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="Enter account or business name if applicable"
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 text-sm focus:border-green-700 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-bold text-base hover:bg-green-800 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Signing in...' : t('login_now')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Step Indicator */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 pb-1">
                <span>
                  Step {step} of {totalSteps}
                </span>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalSteps }, (_, idx) => idx + 1).map((n) => (
                    <span
                      key={n}
                      className={`h-2 rounded-full transition-all ${
                        n <= step ? 'w-7 bg-green-700' : 'w-4 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* STEP 1: 1) ENTER PHONE NUMBER & 2) PICK COUNTRY CODE */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-green-700 text-white flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        Enter Phone Number &amp; Country Code
                      </h2>
                      <p className="text-xs text-slate-600">
                        Fast signup — start with your phone number &amp; country dial code.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-phone-input"
                      className="block text-sm font-bold text-slate-900 mb-1.5"
                    >
                      1. {t('phone_number_label')} *
                    </label>
                    <input
                      id="signup-phone-input"
                      type="tel"
                      required
                      autoFocus
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 08012345678"
                      className="w-full min-h-[50px] rounded-xl border-2 border-slate-300 px-4 text-base font-semibold focus:border-green-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="signup-country-code"
                      className="block text-sm font-bold text-slate-900 mb-1.5"
                    >
                      2. Pick Country Code *
                    </label>
                    <select
                      id="signup-country-code"
                      value={countryCode}
                      onChange={(e) => handleSelectCountryByDialCode(e.target.value)}
                      className="w-full min-h-[50px] rounded-xl border-2 border-green-700/40 bg-white px-3 text-base font-bold text-slate-900 focus:border-green-700 focus:outline-none"
                    >
                      {WEST_AND_SOUTH_AFRICA_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.displayName} ({c.code}) · {c.currencySymbol.trim()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quick Language preference */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Preferred Language ({getCountryDisplayName(signupCountry)})
                      </label>
                      <span className="text-xs font-extrabold text-green-800">{signupLanguage}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeSignupCountryCfg.languages.map((lang) => {
                        const selected = signupLanguage === lang;
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => {
                              setSignupLanguage(lang);
                              setCountryAndLanguage(signupCountry, lang, true);
                            }}
                            className={`min-h-[34px] px-2.5 rounded-lg border text-xs font-bold transition-colors ${
                              selected
                                ? 'bg-green-700 text-white border-green-700'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-green-700'
                            }`}
                          >
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStep1Continue}
                    className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-extrabold text-base hover:bg-green-800 transition-colors"
                  >
                    {t('continue_btn')} &rarr;
                  </button>
                </div>
              )}

              {/* STEP 2: 3) ASK: SIGN UP AS BUYER OR SELLER? */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      aria-label="Back to phone step"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        Sign up as Buyer or Seller?
                      </h2>
                      <p className="text-xs text-slate-600 inline-flex items-center gap-1.5">
                        <span>{activeSignupCountryCfg.flag}</span>
                        <span>
                          {countryCode} {phone}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectBuyerOrSeller('buyer')}
                      className={`rounded-2xl border-2 p-4 text-left transition-colors flex items-center gap-3.5 ${
                        role === 'buyer'
                          ? 'border-green-700 bg-green-50'
                          : 'border-slate-200 bg-white hover:border-green-600 hover:bg-green-50/40'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-green-700 text-white flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-extrabold text-slate-900">Buyer</span>
                          <span className="rounded-md bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[11px] font-bold">
                            Easy Signup
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Name, Phone &amp; Area only — NO Student ID or documents required!
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectBuyerOrSeller('seller')}
                      className={`rounded-2xl border-2 p-4 text-left transition-colors flex items-center gap-3.5 ${
                        role === 'seller'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 bg-white hover:border-orange-400 hover:bg-orange-50/40'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                        <Store className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-extrabold text-slate-900">Seller</span>
                          <span className="rounded-md bg-orange-100 text-orange-900 px-2 py-0.5 text-[11px] font-bold">
                            3 Options
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Student, Trader, or Service Provider — sell items or get bookings.
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3A: IF BUYER -> EASY SIGNUP ONLY (Name, Phone, Area — NO Student ID or documents) */}
              {step === 3 && role === 'buyer' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      aria-label="Back to Buyer or Seller"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        Easy Buyer Signup
                      </h2>
                      <p className="text-xs font-semibold text-green-800">
                        Name, Phone &amp; Area only — no Student ID or documents needed
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Amina Bello"
                      className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-base focus:border-green-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      Phone Number *
                    </label>
                    <div className="flex gap-2">
                      <span className="min-h-[48px] px-3 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-800 inline-flex items-center gap-1.5 shrink-0">
                        <span>{activeSignupCountryCfg.flag}</span>
                        <span>{countryCode}</span>
                      </span>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="08012345678"
                        className="flex-1 min-h-[48px] rounded-xl border border-slate-300 px-4 text-base focus:border-green-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        State / Region
                      </label>
                      <select
                        value={availableStates.includes(stateName) ? stateName : availableStates[0]}
                        onChange={(e) => setStateName(e.target.value)}
                        className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3 text-sm bg-white focus:border-green-700 focus:outline-none"
                      >
                        {availableStates.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        Your Area / Location *
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          list="afri-buyer-areas"
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                          placeholder="e.g. Wuse II, Yaba, Legon"
                          className="w-full min-h-[48px] rounded-xl border border-slate-300 pl-10 pr-3 text-sm sm:text-base focus:border-green-700 focus:outline-none"
                        />
                        <datalist id="afri-buyer-areas">
                          {countryMarkets.map((m) => (
                            <option key={m} value={m} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                    <p className="text-xs font-bold text-slate-700">
                      Login details (for order tracking &amp; chat sync)
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm focus:border-green-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Create Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPass ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 pr-11 text-sm focus:border-green-700 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500"
                          aria-label={showPass ? 'Hide password' : 'Show password'}
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Policy Agreement */}
                  <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={agreedPolicies}
                        onClick={() => setAgreedPolicies(!agreedPolicies)}
                        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                          agreedPolicies
                            ? 'bg-green-700 border-green-700 text-white'
                            : 'bg-white border-slate-400'
                        }`}
                      >
                        {agreedPolicies && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <span className="text-xs text-slate-700 leading-snug">
                        <strong>I agree to Policies</strong> (safe escrow payments &amp; community rules).
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-3 pl-7 text-[11px] font-semibold text-green-800">
                      <button type="button" onClick={() => onOpenPolicy('terms')} className="underline">
                        Terms
                      </button>
                      <button type="button" onClick={() => onOpenPolicy('privacy')} className="underline">
                        Privacy
                      </button>
                      <button type="button" onClick={() => onOpenPolicy('safety')} className="underline">
                        Safety
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-extrabold text-base hover:bg-green-800 disabled:opacity-60 transition-colors"
                  >
                    {loading ? 'Creating Buyer Account...' : 'Create Buyer Account'}
                  </button>
                </div>
              )}

              {/* STEP 3B: IF SELLER -> SHOW 3 OPTIONS: STUDENT, TRADER, SERVICE PROVIDER */}
              {step === 3 && role === 'seller' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      aria-label="Back to Buyer or Seller"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        Choose Your Seller Type
                      </h2>
                      <p className="text-xs text-slate-600">
                        Afri Assistant will remember your account type &amp; guide you accordingly.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectSellerType('student')}
                      className={`rounded-2xl border-2 p-4 flex items-center gap-3.5 text-left transition-colors ${
                        sellerType === 'student'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-blue-400'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-slate-900">Student</span>
                          <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            Student Seller
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Ask Student ID + School. Sell textbooks, hostel items, gadgets &amp; food on campus.
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectSellerType('trader')}
                      className={`rounded-2xl border-2 p-4 flex items-center gap-3.5 text-left transition-colors ${
                        sellerType === 'trader'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 bg-white hover:border-orange-400'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                        <Store className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-slate-900">Trader</span>
                          <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            Business Shop
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Ask Business Name + Products you sell. Reach students &amp; shoppers daily.
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectSellerType('service_provider')}
                      className={`rounded-2xl border-2 p-4 flex items-center gap-3.5 text-left transition-colors ${
                        sellerType === 'service_provider'
                          ? 'border-green-700 bg-green-50'
                          : 'border-slate-200 bg-white hover:border-green-500'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-green-700 text-white flex items-center justify-center shrink-0">
                        <Wrench className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-slate-900">
                            Service Provider
                          </span>
                          <span className="rounded-md bg-green-700 px-2 py-0.5 text-[10px] font-bold text-white">
                            Service Pro
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Pick your Service Type &amp; continue a tailored setup conversation.
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: SELLER ROLE-SPECIFIC FORM */}
              {step === 4 && role === 'seller' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      aria-label="Back to Seller Type"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        {sellerType === 'student'
                          ? 'Student Seller Setup'
                          : sellerType === 'trader'
                          ? 'Trader Business Setup'
                          : 'Service Provider Setup'}
                      </h2>
                      <p className="text-xs text-slate-600">
                        {activeSignupCountryCfg.flag} {countryCode} {phone}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Adebayo Musa"
                      className="w-full min-h-[46px] rounded-xl border border-slate-300 px-4 text-base focus:border-green-700 focus:outline-none"
                    />
                  </div>

                  {/* === STUDENT SELLER: STUDENT ID + SCHOOL === */}
                  {sellerType === 'student' && (
                    <div className="space-y-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-blue-900">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <span>Student Seller Verification</span>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-1">
                          Student ID / Matric Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="e.g. 21/102938 or UNI/2024/0412"
                          className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold focus:border-blue-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-1">
                          School ({getCountryDisplayName(signupCountry)}) *
                        </label>
                        <div className="relative mb-2">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={instSearch}
                            onChange={(e) => {
                              const nextQuery = e.target.value;
                              setInstSearch(nextQuery);
                              const q = nextQuery.trim().toLowerCase();
                              const baseList = getInstitutionsByCountry(signupCountry);
                              const list = baseList.length > 0 ? baseList : NIGERIAN_INSTITUTIONS;
                              const matches = q
                                ? list.filter(
                                    (i) =>
                                      i.name.toLowerCase().includes(q) ||
                                      i.shortName.toLowerCase().includes(q) ||
                                      i.state.toLowerCase().includes(q)
                                  )
                                : list;
                              if (matches.length > 0 && !matches.some((m) => m.name === institution)) {
                                setInstitution(matches[0].name);
                              }
                            }}
                            placeholder="Search university, polytechnic, or college..."
                            className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                        <select
                          value={institution}
                          onChange={(e) => handleSelectInstitution(e.target.value)}
                          className="w-full min-h-[46px] rounded-xl border border-slate-300 px-3 text-sm bg-white focus:border-blue-600 focus:outline-none"
                        >
                          {filteredInstitutions.map((inst) => (
                            <option key={inst.name} value={inst.name}>
                              {inst.name}
                            </option>
                          ))}
                          <option value="__CUSTOM__">Other school (type below)</option>
                        </select>
                        {institution === '__CUSTOM__' && (
                          <input
                            type="text"
                            required
                            value={customSchool}
                            onChange={(e) => setCustomSchool(e.target.value)}
                            placeholder="Enter your school / campus name"
                            className="mt-2 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm focus:border-blue-600 focus:outline-none"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Level
                          </label>
                          <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm bg-white focus:border-blue-600 focus:outline-none"
                          >
                            {LEVELS.map((lv) => (
                              <option key={lv} value={lv}>
                                {lv}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Hostel / Campus Area
                          </label>
                          <input
                            type="text"
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                            placeholder="e.g. Hostel Block B"
                            className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-xs font-semibold text-slate-700">
                          School ID Photo (Optional)
                        </span>
                        <label className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer hover:bg-blue-700">
                          <Camera className="w-3.5 h-3.5" />
                          <span>{schoolIdPhoto ? 'ID Photo Added ✓' : 'Upload ID Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSingleImageUpload(e, setSchoolIdPhoto)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* === TRADER: BUSINESS NAME + PRODUCTS === */}
                  {sellerType === 'trader' && (
                    <div className="space-y-3.5 rounded-2xl border border-orange-200 bg-orange-50/50 p-4">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-orange-950">
                        <Store className="w-4 h-4 text-orange-600" />
                        <span>Trader Business Details</span>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-1">
                          Business Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          placeholder="e.g. Chinedu Gadgets & Provisions"
                          className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold focus:border-orange-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-1">
                          Products You Sell *
                        </label>
                        <input
                          type="text"
                          required
                          value={traderProducts}
                          onChange={(e) => setTraderProducts(e.target.value)}
                          placeholder="e.g. Sneakers, Rice & Beans, Phone Chargers"
                          className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-orange-500 focus:outline-none"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {QUICK_TRADER_PRODUCTS.map((tag) => {
                            const active = traderProducts
                              .toLowerCase()
                              .includes(tag.toLowerCase());
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleProductTag(tag)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                  active
                                    ? 'bg-orange-500 text-white border-orange-500'
                                    : 'bg-white text-slate-700 border-slate-300 hover:border-orange-400'
                                }`}
                              >
                                {active ? `✓ ${tag}` : `+ ${tag}`}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Categories supported: {ITEM_CATEGORIES.slice(0, 7).join(', ')}, etc.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Market / Shop Area
                          </label>
                          <input
                            type="text"
                            list="afri-trader-markets"
                            value={market}
                            onChange={(e) => {
                              setMarket(e.target.value);
                              setArea(e.target.value);
                            }}
                            placeholder={`e.g. ${countryMarkets[0] || 'Central Market'}`}
                            className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-orange-500 focus:outline-none"
                          />
                          <datalist id="afri-trader-markets">
                            {countryMarkets.map((m) => (
                              <option key={m} value={m} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            State / Region
                          </label>
                          <select
                            value={
                              availableStates.includes(stateName) ? stateName : availableStates[0]
                            }
                            onChange={(e) => setStateName(e.target.value)}
                            className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm bg-white focus:border-orange-500 focus:outline-none"
                          >
                            {availableStates.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === SERVICE PROVIDER: SERVICE TYPE + FOLLOW CONVERSATION BASED ON THAT SERVICE === */}
                  {sellerType === 'service_provider' && (
                    <div className="space-y-3.5 rounded-2xl border border-green-200 bg-green-50/50 p-4">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-green-950">
                        <Wrench className="w-4 h-4 text-green-700" />
                        <span>Service Provider Setup</span>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-1">
                          1. Choose Your Service Type *
                        </label>
                        <select
                          value={serviceCategory}
                          onChange={(e) => setServiceCategory(e.target.value)}
                          className="w-full min-h-[46px] rounded-xl border border-slate-300 px-3 text-base font-semibold bg-white focus:border-green-700 focus:outline-none"
                        >
                          {SERVICE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                          <option value="__OTHER__">Other Service (Type your own)</option>
                        </select>
                        {serviceCategory === '__OTHER__' && (
                          <input
                            type="text"
                            required
                            value={customServiceType}
                            onChange={(e) => setCustomServiceType(e.target.value)}
                            placeholder="e.g. Tailoring, Barbing, Laptop Repair, Catering"
                            className="mt-2 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm focus:border-green-700 focus:outline-none"
                          />
                        )}
                      </div>

                      {/* Dynamic Follow-up Conversation Box tailored to the selected Service Type */}
                      <div className="rounded-xl border border-green-300 bg-white p-3.5 space-y-2.5 shadow-sm">
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#0a7a42] text-white flex items-center justify-center shrink-0 mt-0.5">
                            <MessageCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-[#0a7a42] flex items-center gap-1">
                              <span>Afri Assistant · {resolvedServiceType} Follow-up</span>
                              <Sparkles className="w-3 h-3" />
                            </p>
                            <p className="text-xs font-semibold text-slate-800 mt-0.5 leading-snug">
                              {servicePrompt.question}
                            </p>
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          value={serviceDetails}
                          onChange={(e) => setServiceDetails(e.target.value)}
                          placeholder={servicePrompt.placeholder}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-green-700 focus:outline-none"
                        />
                        <p className="text-[11px] text-slate-500">{servicePrompt.helperTip}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Starting Price ({activeSignupCountryCfg.currencySymbol.trim()})
                          </label>
                          <input
                            type="number"
                            min={10}
                            value={priceFrom}
                            onChange={(e) => setPriceFrom(e.target.value)}
                            placeholder="2000"
                            className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold tabular-nums focus:border-green-700 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Service Area
                          </label>
                          <input
                            type="text"
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                            placeholder="e.g. Campus / Wuse II"
                            className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-green-700 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Work Sample Photos (Optional, {workPhotos.length}/4)
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {workPhotos.map((src, i) => (
                            <div
                              key={i}
                              className="relative aspect-square rounded-xl overflow-hidden border border-slate-200"
                            >
                              <img
                                src={src}
                                alt={`Work sample ${i + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setWorkPhotos((prev) => prev.filter((_, idx) => idx !== i))
                                }
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {workPhotos.length < 4 && (
                            <label className="aspect-square rounded-xl border-2 border-dashed border-green-700/50 bg-white flex flex-col items-center justify-center gap-1 cursor-pointer text-green-800">
                              <Camera className="w-4 h-4" />
                              <span className="text-[10px] font-bold">Add Photo</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleWorkPhotosUpload}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Login Credentials & Policies */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <UserCheck className="w-4 h-4 text-green-700" />
                      <span>Login details &amp; Payout readiness</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-green-700 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Create Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showPass ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 pr-10 text-sm focus:border-green-700 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500"
                            aria-label={showPass ? 'Hide password' : 'Show password'}
                          >
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Policy Agreement */}
                  <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={agreedPolicies}
                        onClick={() => setAgreedPolicies(!agreedPolicies)}
                        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                          agreedPolicies
                            ? 'bg-green-700 border-green-700 text-white'
                            : 'bg-white border-slate-400'
                        }`}
                      >
                        {agreedPolicies && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <span className="text-xs text-slate-700 leading-snug">
                        <strong>I agree to Policies</strong> — post real photos, honest prices in{' '}
                        {activeSignupCountryCfg.currencySymbol.trim()}, and chat safely in-app.
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-3 pl-7 text-[11px] font-semibold text-green-800">
                      <button type="button" onClick={() => onOpenPolicy('terms')} className="underline">
                        Terms
                      </button>
                      <button type="button" onClick={() => onOpenPolicy('seller_policy')} className="underline">
                        Seller Policy
                      </button>
                      <button type="button" onClick={() => onOpenPolicy('privacy')} className="underline">
                        Privacy
                      </button>
                      <button type="button" onClick={() => onOpenPolicy('safety')} className="underline">
                        Safety
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-extrabold text-base hover:bg-green-800 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    {loading
                      ? 'Creating Account...'
                      : sellerType === 'student'
                      ? 'Create Student Seller Account'
                      : sellerType === 'trader'
                      ? 'Create Trader Account'
                      : 'Create Service Provider Account'}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
