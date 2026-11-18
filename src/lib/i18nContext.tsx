import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  COUNTRY_LANGUAGE_CONFIGS,
  CountryLanguageConfig,
  TranslationKey,
  getCountryConfig,
  getDictionaryForLanguage,
} from '../data/languages';

const COUNTRY_STORAGE_KEY = 'afri_mart_country';
const LANG_STORAGE_KEY = 'afri_mart_language';
const LANG_CHOSEN_KEY = 'afri_mart_lang_chosen';

interface I18nContextValue {
  country: string; // 'Nigeria', 'Ghana', ... or 'All' for All Countries filter
  language: string;
  countryConfig: CountryLanguageConfig;
  hasChosenLanguage: boolean;
  setCountryAndLanguage: (country: string, language: string, markChosen?: boolean) => void;
  setCountryOnly: (country: string) => void;
  t: (key: TranslationKey) => string;
  translateCategory: (cat: string) => string;
  formatMoney: (amount: number, overrideCountry?: string, includeCode?: boolean) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStorage(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [country, setCountry] = useState<string>(() => readStorage(COUNTRY_STORAGE_KEY, 'Nigeria'));
  const [language, setLanguage] = useState<string>(() => readStorage(LANG_STORAGE_KEY, 'English'));
  const [hasChosenLanguage, setHasChosenLanguage] = useState<boolean>(
    () => readStorage(LANG_CHOSEN_KEY, '0') === '1'
  );

  const countryConfig = getCountryConfig(country === 'All' ? 'Nigeria' : country);

  const setCountryAndLanguage = useCallback(
    (nextCountry: string, nextLanguage: string, markChosen = true) => {
      const validCountry =
        nextCountry === 'All'
          ? 'All'
          : getCountryConfig(nextCountry).country;
      setCountry(validCountry);
      setLanguage(nextLanguage || 'English');
      if (markChosen) setHasChosenLanguage(true);
      try {
        localStorage.setItem(COUNTRY_STORAGE_KEY, validCountry);
        localStorage.setItem(LANG_STORAGE_KEY, nextLanguage || 'English');
        if (markChosen) localStorage.setItem(LANG_CHOSEN_KEY, '1');
      } catch {
        // Ignore storage errors
      }
    },
    []
  );

  const setCountryOnly = useCallback(
    (nextCountry: string) => {
      const validCountry =
        nextCountry === 'All' ? 'All' : getCountryConfig(nextCountry).country;
      setCountry(validCountry);
      try {
        localStorage.setItem(COUNTRY_STORAGE_KEY, validCountry);
      } catch {
        // Ignore
      }
    },
    []
  );

  useEffect(() => {
    document.documentElement.lang =
      language === 'French' ? 'fr' : language === 'Portuguese' ? 'pt' : 'en';
  }, [language]);

  const dict = getDictionaryForLanguage(
    language,
    country === 'All' ? 'Nigeria' : country
  );

  const t = useCallback(
    (key: TranslationKey): string => dict[key] || key,
    [dict]
  );

  const translateCategory = useCallback(
    (cat: string): string => {
      const map: Record<string, TranslationKey> = {
        All: 'cat_all',
        Shoes: 'cat_shoes',
        Clothes: 'cat_clothes',
        Phones: 'cat_phones',
        Food: 'cat_food',
        Books: 'cat_books',
        Electronics: 'cat_electronics',
        Foodstuff: 'cat_foodstuff',
        Fashion: 'cat_fashion',
        'Hostel Items': 'cat_hostel_items',
        __SERVICES__: 'cat_services',
      };
      const k = map[cat];
      return k ? dict[k] : cat;
    },
    [dict]
  );

  const formatMoney = useCallback(
    (amount: number, overrideCountry?: string, includeCode = false): string => {
      const targetCountry = overrideCountry || (country === 'All' ? 'Nigeria' : country);
      const cfg =
        COUNTRY_LANGUAGE_CONFIGS.find(
          (c) => c.country.toLowerCase() === targetCountry.toLowerCase()
        ) || countryConfig;
      const base = `${cfg.currencySymbol}${Number(amount || 0).toLocaleString('en-US')}`;
      return includeCode ? `${base} ${cfg.currencyCode}` : base;
    },
    [country, countryConfig]
  );

  return (
    <I18nContext.Provider
      value={{
        country,
        language,
        countryConfig,
        hasChosenLanguage,
        setCountryAndLanguage,
        setCountryOnly,
        t,
        translateCategory,
        formatMoney,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return ctx;
}
