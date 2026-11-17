import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { Globe } from 'lucide-react';
import { WEST_AND_SOUTH_AFRICA_COUNTRIES } from '../data/countries';
import {
  NIGERIAN_INSTITUTIONS,
  NIGERIAN_STATES,
  getInstitutionsByCountry,
} from '../data/institutions';
import { COUNTRY_LANGUAGE_CONFIGS, getCountryConfig } from '../data/languages';
import { ALL_MARKET_NAMES } from '../data/markets';
import { EXACT_SAFETY_MESSAGES } from '../data/policies';
import { api, compressImageFile } from '../lib/api';
import { useI18n } from '../lib/i18nContext';
import { AFRICAN_PAYOUT_BANKS } from '../lib/paystack';
import {
  AccountBadge,
  PolicyPageId,
  PublicUser,
  SERVICE_CATEGORIES,
} from '../types';
import { BrandLogo } from './Logo';

interface AuthModalProps {
  open: boolean;
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onSuccess: (token: string, user: PublicUser) => void;
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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Country & Language FIRST (before signup)
  const [signupCountry, setSignupCountry] = useState<string>(initialCfg.country);
  const [signupLanguage, setSignupLanguage] = useState<string>(language || 'English');

  // Step 3: Account type picker (after Name, Phone, Password)
  const [accountType, setAccountType] = useState<AccountBadge | ''>('');

  // Shared / Login
  const [loginName, setLoginName] = useState('');
  const [countryCode, setCountryCode] = useState(initialCfg.dialCode || '+234');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Common Signup
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [stateName, setStateName] = useState(
    initialCfg.country === 'Nigeria' ? 'Lagos' : initialCfg.country
  );
  const [campus, setCampus] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [agreedPolicies, setAgreedPolicies] = useState(false);

  // Student-specific
  const [instSearch, setInstSearch] = useState('');
  const [institution, setInstitution] = useState(() => {
    const list = getInstitutionsByCountry(initialCfg.country);
    return list[0]?.name || 'University of Lagos (UNILAG)';
  });
  const [level, setLevel] = useState('200 Level');
  const [schoolIdPhoto, setSchoolIdPhoto] = useState('');

  // Trader-specific
  const [shopName, setShopName] = useState('');
  const [market, setMarket] = useState('');
  const [shopDocPhoto, setShopDocPhoto] = useState('');

  // Service-provider-specific
  const [serviceCategory, setServiceCategory] = useState<string>(SERVICE_CATEGORIES[0]);
  const [priceFrom, setPriceFrom] = useState('2000');
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);

  // Seller Paystack Subaccount payout details
  const [payoutBankName, setPayoutBankName] = useState<string>(AFRICAN_PAYOUT_BANKS[0]);
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
  const [payoutAccountName, setPayoutAccountName] = useState('');

  const [loading, setLoading] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [error, setError] = useState('');

  const activeSignupCountryCfg = getCountryConfig(signupCountry);

  const isSellerSignup =
    accountType === 'trader' ||
    accountType === 'service_provider' ||
    (accountType === 'student' && role === 'seller');

  const filteredInstitutions = useMemo(() => {
    const q = instSearch.trim().toLowerCase();
    const countryList = getInstitutionsByCountry(signupCountry);
    const baseList = q
      ? NIGERIAN_INSTITUTIONS
      : countryList.length > 0
      ? countryList
      : NIGERIAN_INSTITUTIONS;
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

  if (!open) return null;

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

  const handleSelectSignupCountry = (nextCountry: string) => {
    const cfg = getCountryConfig(nextCountry);
    setSignupCountry(cfg.country);
    setCountryCode(cfg.dialCode);
    const defaultLang = cfg.languages[0] || 'English';
    setSignupLanguage(defaultLang);
    setCountryAndLanguage(cfg.country, defaultLang, true);
    const countryInsts = getInstitutionsByCountry(cfg.country);
    if (countryInsts.length > 0) {
      setInstitution(countryInsts[0].name);
      setStateName(countryInsts[0].state);
    } else {
      setStateName(cfg.country);
    }
  };

  const handleSelectSignupLanguage = (nextLang: string) => {
    setSignupLanguage(nextLang);
    setCountryAndLanguage(signupCountry, nextLang, true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login({
        phone_number: phone,
        password,
        full_name: loginName.trim() || undefined,
      });
      onSuccess(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      if (!signupCountry || !signupLanguage) {
        setError('Please pick your Country and Language first.');
        return;
      }
      setCountryAndLanguage(signupCountry, signupLanguage, true);
      setStep(2);
    } else if (step === 2) {
      if (!fullName.trim() || !phone.trim() || password.length < 4) {
        setError('Enter your Full Name, Phone Number, and a Password (min 4 characters).');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!accountType) {
        setError('Please pick your account type: Student, Trader, or Service Provider.');
        return;
      }
      if (accountType === 'student') {
        if (!institution || !campus.trim()) {
          setError('Please select your School Name and enter your Campus / Hostel Area.');
          return;
        }
      } else if (accountType === 'trader') {
        if (!shopName.trim() || !market.trim()) {
          setError('Please enter your Shop Name and Market / Campus Location.');
          return;
        }
      } else if (accountType === 'service_provider') {
        if (!serviceCategory || !campus.trim() || !Number(priceFrom)) {
          setError(
            `Please select Service Category, enter Price From (${activeSignupCountryCfg.currencySymbol}), and your Location.`
          );
          return;
        }
      }
      if (isSellerSignup && payoutAccountNumber.replace(/\D/g, '').length < 8) {
        setError('Please enter your Bank Account Number for Paystack Payouts.');
        return;
      }
      setStep(4);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!accountType) {
      setError('Choose your account type.');
      return;
    }
    if (!agreedPolicies) {
      setError('You must tick "I agree to Policies" before creating your account.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.signup({
        full_name: fullName,
        phone_number: phone,
        country_code: countryCode,
        country: signupCountry,
        language: signupLanguage,
        password,
        account_type: accountType,
        role: accountType === 'student' ? role : 'seller',
        institution: accountType === 'student' ? institution : market || campus,
        level: accountType === 'student' ? level : undefined,
        school_id_photo: accountType === 'student' ? schoolIdPhoto : undefined,
        shop_name: accountType === 'trader' ? shopName : undefined,
        market: accountType === 'trader' ? market : undefined,
        shop_doc_photo: accountType === 'trader' ? shopDocPhoto : undefined,
        service_category: accountType === 'service_provider' ? serviceCategory : undefined,
        price_from: accountType === 'service_provider' ? Number(priceFrom) : undefined,
        work_photos: accountType === 'service_provider' ? workPhotos : undefined,
        state: stateName,
        campus: campus || market || 'Main Campus',
        profile_pic: profilePic,
        agreed_policies: agreedPolicies,
        payout_bank_name: isSellerSignup ? payoutBankName : undefined,
        payout_account_number: isSellerSignup ? payoutAccountNumber : undefined,
        payout_account_name: isSellerSignup ? payoutAccountName || fullName : undefined,
      });
      setCountryAndLanguage(signupCountry, signupLanguage, true);
      onSuccess(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

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

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t('welcome_back')}</h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Sign in with your phone number and password. No email needed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  {t('phone_number_label')}
                </label>
                <div className="flex gap-2">
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
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
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
                  Full / Business Name (Required for Owner Login)
                </label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="Optional for buyers/sellers; required for Owner"
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
              {/* 4-Step Indicator */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 pb-1">
                <span>Step {step} of 4</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((n) => (
                    <span
                      key={n}
                      className={`h-2 rounded-full transition-all ${
                        n <= step ? 'w-7 bg-green-700' : 'w-4 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* STEP 1: LANGUAGE & COUNTRY FIRST (BEFORE SIGN UP!) */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-green-700 text-white flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        {t('step1_pick_lang')}
                      </h2>
                      <p className="text-xs text-slate-600">{t('pick_lang_sub')}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">
                      {t('country_label')} (West Africa + South Africa)
                    </label>
                    <select
                      value={signupCountry}
                      onChange={(e) => handleSelectSignupCountry(e.target.value)}
                      className="w-full min-h-[48px] rounded-xl border-2 border-green-700/40 bg-white px-3 text-sm font-bold text-slate-900 focus:border-green-700 focus:outline-none"
                    >
                      {COUNTRY_LANGUAGE_CONFIGS.map((cfg) => (
                        <option key={cfg.country} value={cfg.country}>
                          {cfg.flag} {cfg.country} ({cfg.dialCode} · {cfg.currencySymbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-slate-900">
                        {t('language_label')} ({activeSignupCountryCfg.languages.length})
                      </label>
                      <span className="text-xs font-extrabold text-green-800">
                        {signupLanguage}
                      </span>
                    </div>
                    {/* ALL languages in the selected country shown visibly — none hidden */}
                    <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      {activeSignupCountryCfg.languages.map((lang) => {
                        const selected = signupLanguage === lang;
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => handleSelectSignupLanguage(lang)}
                            className={`min-h-[36px] px-3 rounded-lg border text-xs font-bold transition-colors ${
                              selected
                                ? 'bg-green-700 text-white border-green-700'
                                : 'bg-white text-slate-800 border-slate-300 hover:border-green-700'
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
                    onClick={handleNextStep}
                    className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-extrabold text-base hover:bg-green-800 transition-colors"
                  >
                    {t('continue_btn')} &rarr;
                  </button>
                </div>
              )}

              {/* STEP 2: NAME, PHONE (+ Country Code) & PASSWORD */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        {t('step2_details')}
                      </h2>
                      <p className="text-xs text-slate-600">
                        {activeSignupCountryCfg.flag} {signupCountry} · {signupLanguage}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      {t('full_name_label')}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Adebayo Musa"
                      className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-base focus:border-green-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      {t('phone_number_label')} (West &amp; South Africa)
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        aria-label="Country code"
                        className="w-36 min-h-[48px] rounded-xl border border-slate-300 bg-white px-2 text-xs sm:text-sm font-semibold text-slate-800 focus:border-green-700 focus:outline-none shrink-0"
                      >
                        {WEST_AND_SOUTH_AFRICA_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.country} ({c.code})
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="08012345678"
                        className="flex-1 min-h-[48px] rounded-xl border border-slate-300 px-3 text-base focus:border-green-700 focus:outline-none"
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
                        placeholder="Create password (min 4 chars)"
                        className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 pr-12 text-base focus:border-green-700 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500"
                      >
                        {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-bold text-base hover:bg-green-800 transition-colors"
                  >
                    Next: {t('step3_account_type')}
                  </button>
                </div>
              )}

              {/* STEP 3: ACCOUNT TYPE (AFTER Name, Phone, Password) + VERIFICATION DETAILS */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        {t('step3_account_type')}
                      </h2>
                      <p className="text-xs text-slate-600">
                        You can also add a 2nd badge later in Profile Settings.
                      </p>
                    </div>
                  </div>

                  {/* Mandatory 3-Type Selector */}
                  <div className="grid grid-cols-1 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAccountType('student')}
                      className={`min-h-[60px] rounded-xl border-2 p-3 flex items-center gap-3 text-left transition-colors ${
                        accountType === 'student'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">Student</span>
                          <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            BLUE Verified Badge
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          School Name, Level &amp; School ID photo
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType('trader')}
                      className={`min-h-[60px] rounded-xl border-2 p-3 flex items-center gap-3 text-left transition-colors ${
                        accountType === 'trader'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 bg-white hover:border-orange-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">Trader</span>
                          <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            ORANGE Verified Badge
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Shop Name, Market &amp; Shop photo / NIN / CAC
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType('service_provider')}
                      className={`min-h-[60px] rounded-xl border-2 p-3 flex items-center gap-3 text-left transition-colors ${
                        accountType === 'service_provider'
                          ? 'border-green-700 bg-green-50'
                          : 'border-slate-200 bg-white hover:border-green-400'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-green-700 text-white flex items-center justify-center shrink-0">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">
                            Service Provider
                          </span>
                          <span className="rounded-md bg-green-700 px-2 py-0.5 text-[10px] font-bold text-white">
                            GREEN Verified Badge
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Category, Work photos, Price From &amp; Location
                        </p>
                      </div>
                    </button>
                  </div>

                  {accountType === 'student' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                          Search School Name
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
                              const matches = q
                                ? NIGERIAN_INSTITUTIONS.filter(
                                    (i) =>
                                      i.name.toLowerCase().includes(q) ||
                                      i.shortName.toLowerCase().includes(q) ||
                                      i.state.toLowerCase().includes(q) ||
                                      (i.country || '').toLowerCase().includes(q) ||
                                      i.type.toLowerCase().includes(q)
                                  )
                                : NIGERIAN_INSTITUTIONS;
                              if (matches.length > 0 && !matches.some((m) => m.name === institution)) {
                                setInstitution(matches[0].name);
                                setStateName(matches[0].state);
                              }
                            }}
                            placeholder="Type UNILAG, KNUST, Legon, UCT, Wits, Lomé, Ghana..."
                            className="w-full min-h-[44px] rounded-xl border border-slate-300 pl-10 pr-4 text-sm focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                        <select
                          value={institution}
                          onChange={(e) => handleSelectInstitution(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3 text-sm bg-white focus:border-blue-600 focus:outline-none"
                        >
                          {filteredInstitutions.length === 0 ? (
                            <option value="" disabled>
                              No matching school found — clear search
                            </option>
                          ) : (
                            filteredInstitutions.map((inst) => (
                              <option key={inst.name} value={inst.name}>
                                {inst.name} — {inst.country ? inst.country : inst.type}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                            Level
                          </label>
                          <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3 text-sm bg-white focus:border-blue-600 focus:outline-none"
                          >
                            {LEVELS.map((lv) => (
                              <option key={lv} value={lv}>
                                {lv}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                            State / Region
                          </label>
                          <select
                            value={stateName}
                            onChange={(e) => setStateName(e.target.value)}
                            className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3 text-sm bg-white focus:border-blue-600 focus:outline-none"
                          >
                            {NIGERIAN_STATES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                          Campus / Hostel Area
                        </label>
                        <input
                          type="text"
                          required
                          value={campus}
                          onChange={(e) => setCampus(e.target.value)}
                          placeholder="e.g. Moremi Hall, Main Campus"
                          className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-base focus:border-blue-600 focus:outline-none"
                        />
                      </div>

                      {/* School ID Photo */}
                      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 flex items-center gap-3.5">
                        <div className="w-16 h-16 rounded-xl bg-white border border-blue-200 overflow-hidden flex items-center justify-center shrink-0">
                          {schoolIdPhoto ? (
                            <img src={schoolIdPhoto} alt="School ID" className="w-full h-full object-cover" />
                          ) : (
                            <GraduationCap className="w-7 h-7 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900">School ID Photo</p>
                          <p className="text-xs text-slate-600">
                            For your BLUE Verified Student badge (compressed &lt;200KB).
                          </p>
                          <label className="mt-2 inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer hover:bg-blue-700">
                            <Camera className="w-4 h-4" />
                            <span>{schoolIdPhoto ? 'Change School ID' : 'Upload School ID'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSingleImageUpload(e, setSchoolIdPhoto)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                          I want to start as:
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setRole('buyer')}
                            className={`min-h-[48px] rounded-xl border-2 px-3 flex items-center justify-center gap-2 font-bold text-sm ${
                              role === 'buyer'
                                ? 'border-blue-600 bg-blue-50 text-blue-900'
                                : 'border-slate-200 text-slate-700'
                            }`}
                          >
                            <ShoppingBag className="w-4 h-4" />
                            <span>Buyer</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRole('seller')}
                            className={`min-h-[48px] rounded-xl border-2 px-3 flex items-center justify-center gap-2 font-bold text-sm ${
                              role === 'seller'
                                ? 'border-blue-600 bg-blue-50 text-blue-900'
                                : 'border-slate-200 text-slate-700'
                            }`}
                          >
                            <Store className="w-4 h-4" />
                            <span>Seller</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {accountType === 'trader' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                          Shop Name
                        </label>
                        <input
                          type="text"
                          required
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          placeholder="e.g. Chinedu Gadgets & Phones"
                          className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-base focus:border-orange-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                          Market / Plaza / Campus Gate
                        </label>
                        <input
                          type="text"
                          required
                          list="afri-markets-list-auth"
                          value={market}
                          onChange={(e) => {
                            setMarket(e.target.value);
                            setCampus(e.target.value);
                          }}
                          placeholder="e.g. Wuse Market, Balogun Market, Computer Village Ikeja"
                          className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-base focus:border-orange-500 focus:outline-none"
                        />
                        <datalist id="afri-markets-list-auth">
                          {ALL_MARKET_NAMES.map((m) => (
                            <option key={m} value={m} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                          State
                        </label>
                        <select
                          value={stateName}
                          onChange={(e) => setStateName(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3 text-sm bg-white focus:border-orange-500 focus:outline-none"
                        >
                          {NIGERIAN_STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3.5 flex items-center gap-3.5">
                        <div className="w-16 h-16 rounded-xl bg-white border border-orange-200 overflow-hidden flex items-center justify-center shrink-0">
                          {shopDocPhoto ? (
                            <img src={shopDocPhoto} alt="Shop or ID" className="w-full h-full object-cover" />
                          ) : (
                            <Store className="w-7 h-7 text-orange-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900">
                            Shop Photo / NIN / CAC
                          </p>
                          <p className="text-xs text-slate-600">
                            For your ORANGE Verified Trader badge.
                          </p>
                          <label className="mt-2 inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-lg bg-orange-500 text-white text-xs font-bold cursor-pointer hover:bg-orange-600">
                            <Camera className="w-4 h-4" />
                            <span>{shopDocPhoto ? 'Change Photo' : 'Upload Shop / ID'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSingleImageUpload(e, setShopDocPhoto)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {accountType === 'service_provider' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                          Service Category
                        </label>
                        <select
                          value={serviceCategory}
                          onChange={(e) => setServiceCategory(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3 text-base bg-white focus:border-green-700 focus:outline-none"
                        >
                          {SERVICE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                            Price From ({activeSignupCountryCfg.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min={100}
                            required
                            value={priceFrom}
                            onChange={(e) => setPriceFrom(e.target.value)}
                            placeholder="2000"
                            className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-base font-bold tabular-nums focus:border-green-700 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                            State
                          </label>
                          <select
                            value={stateName}
                            onChange={(e) => setStateName(e.target.value)}
                            className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3 text-sm bg-white focus:border-green-700 focus:outline-none"
                          >
                            {NIGERIAN_STATES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                          Service Location / Campus Area
                        </label>
                        <input
                          type="text"
                          required
                          value={campus}
                          onChange={(e) => setCampus(e.target.value)}
                          placeholder="e.g. Akoka / Yaba / Campus Gate"
                          className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 text-base focus:border-green-700 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                          Work Photos ({workPhotos.length}/4)
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {workPhotos.map((src, i) => (
                            <div
                              key={i}
                              className="relative aspect-square rounded-xl overflow-hidden border border-slate-200"
                            >
                              <img src={src} alt="" className="w-full h-full object-cover" />
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
                            <label className="aspect-square rounded-xl border-2 border-dashed border-green-700/50 bg-green-50 flex flex-col items-center justify-center gap-1 cursor-pointer text-green-800">
                              <Camera className="w-5 h-5" />
                              <span className="text-[11px] font-bold">Work Pic</span>
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
                    </>
                  )}

                  {isSellerSignup && (
                    <div className="rounded-xl border-2 border-green-700/30 bg-green-50/70 p-4 space-y-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-green-950">
                          Enter your Bank Account for Paystack Payouts *
                        </h3>
                        <p className="text-xs font-semibold text-green-800 mt-0.5">
                          {EXACT_SAFETY_MESSAGES.sellerFeeNote} Creates your Paystack Subaccount automatically.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Select Bank
                        </label>
                        <select
                          value={payoutBankName}
                          onChange={(e) => setPayoutBankName(e.target.value)}
                          className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold focus:border-green-700 focus:outline-none"
                        >
                          {AFRICAN_PAYOUT_BANKS.map((bank) => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Account Number *
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            required={isSellerSignup}
                            maxLength={12}
                            value={payoutAccountNumber}
                            onChange={(e) =>
                              setPayoutAccountNumber(e.target.value.replace(/\D/g, ''))
                            }
                            placeholder="0123456789"
                            className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-mono font-bold focus:border-green-700 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Account Name
                          </label>
                          <input
                            type="text"
                            value={payoutAccountName}
                            onChange={(e) => setPayoutAccountName(e.target.value)}
                            placeholder={fullName || 'Account holder name'}
                            className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm focus:border-green-700 focus:outline-none"
                          />
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600">
                        Your bank account is used ONLY to create your Paystack Subaccount for automatic 93% Split payouts and is NEVER displayed on Checkout.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-bold text-base hover:bg-green-800 transition-colors"
                  >
                    Next: {t('step4_photo_policies')}
                  </button>
                </div>
              )}

              {/* STEP 4: PROFILE PHOTO & POLICIES */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {t('step4_photo_policies')}
                      </h2>
                      <p className="text-sm text-slate-600">
                        Almost ready to buy, sell, or offer services.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <div className="w-16 h-16 rounded-full bg-green-100 border border-green-300 overflow-hidden flex items-center justify-center shrink-0">
                      {profilePic ? (
                        <img src={profilePic} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-green-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">Profile Picture (Optional)</p>
                      <p className="text-xs text-slate-500">Compressed automatically to max 200KB.</p>
                      <label className="mt-2 inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800 cursor-pointer hover:bg-slate-100">
                        <Camera className="w-4 h-4" />
                        <span>{profilePic ? 'Change Photo' : 'Upload Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSingleImageUpload(e, setProfilePic)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Mandatory Policy Checkbox */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={agreedPolicies}
                        onClick={() => setAgreedPolicies(!agreedPolicies)}
                        className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          agreedPolicies
                            ? 'bg-green-700 border-green-700 text-white'
                            : 'bg-white border-slate-400'
                        }`}
                      >
                        {agreedPolicies && <Check className="w-4 h-4" />}
                      </button>
                      <span className="text-sm text-slate-800 leading-snug">
                        <strong>I agree to Policies</strong> — I will post real photos, quote honest prices in local currency ({activeSignupCountryCfg.currencySymbol}), chat inside the app, and follow all safety rules.
                      </span>
                    </label>

                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 pl-9 text-xs font-semibold text-green-800">
                      <button type="button" onClick={() => onOpenPolicy('terms')} className="underline">
                        Terms of Service
                      </button>
                      <button type="button" onClick={() => onOpenPolicy('privacy')} className="underline">
                        Privacy Policy
                      </button>
                      <button type="button" onClick={() => onOpenPolicy('community')} className="underline">
                        Community Rules
                      </button>
                      <button type="button" onClick={() => onOpenPolicy('safety')} className="underline">
                        Safety Tips
                      </button>
                      <button type="button" onClick={() => onOpenPolicy('prohibited')} className="underline">
                        Prohibited Items
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[52px] rounded-xl bg-green-700 text-white font-extrabold text-base hover:bg-green-800 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    {loading ? 'Creating Account...' : t('create_account')}
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
