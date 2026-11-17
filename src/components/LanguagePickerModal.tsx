import React, { useEffect, useState } from 'react';
import { Check, Globe2, X } from 'lucide-react';
import { COUNTRY_LANGUAGE_CONFIGS, getCountryConfig } from '../data/languages';
import { useI18n } from '../lib/i18nContext';
import { api } from '../lib/api';
import type { PublicUser } from '../types';

interface LanguagePickerModalProps {
  open: boolean;
  canClose: boolean;
  user?: PublicUser | null;
  onUserUpdated?: (user: PublicUser) => void;
  onClose: () => void;
}

export const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({
  open,
  canClose,
  user,
  onUserUpdated,
  onClose,
}) => {
  const { country, language, setCountryAndLanguage, setCountryOnly, t } = useI18n();
  const [selectedCountry, setSelectedCountry] = useState<string>(
    country === 'All' ? 'Nigeria' : country
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>(language || 'English');
  const [viewAllCountries, setViewAllCountries] = useState<boolean>(country === 'All');

  useEffect(() => {
    if (open) {
      setSelectedCountry(country === 'All' ? 'Nigeria' : country);
      setSelectedLanguage(language || 'English');
      setViewAllCountries(country === 'All');
    }
  }, [open, country, language]);

  if (!open) return null;

  const activeConfig = getCountryConfig(selectedCountry);

  const handleSelectCountry = (countryName: string) => {
    setSelectedCountry(countryName);
    setViewAllCountries(false);
    const cfg = getCountryConfig(countryName);
    if (!cfg.languages.includes(selectedLanguage)) {
      setSelectedLanguage(cfg.languages[0] || 'English');
    }
  };

  const handleConfirm = async () => {
    setCountryAndLanguage(selectedCountry, selectedLanguage, true);
    if (viewAllCountries) {
      setCountryOnly('All');
    }
    if (user) {
      try {
        const res = await api.updateProfile({
          country: selectedCountry,
          language: selectedLanguage,
        });
        onUserUpdated?.(res.user);
      } catch {
        // Keep local language preference even if profile sync fails offline
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white sm:bg-black/60 sm:items-center sm:justify-center sm:p-4">
      <div className="flex flex-col w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-white sm:rounded-2xl sm:shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-green-800 text-white px-4 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Globe2 className="w-5 h-5 text-yellow-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold truncate">{t('pick_lang_title')}</h2>
              <p className="text-xs text-green-100 truncate">{t('pick_lang_sub')}</p>
            </div>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-green-700 flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* 1. Pick Country */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-extrabold text-slate-900">
                1. {t('country_label')} (West Africa + South Africa)
              </label>
              <button
                type="button"
                onClick={() => setViewAllCountries((v) => !v)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${
                  viewAllCountries
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                {t('all_countries')} {viewAllCountries ? '✓' : ''}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COUNTRY_LANGUAGE_CONFIGS.map((cfg) => {
                const active = selectedCountry === cfg.country;
                return (
                  <button
                    key={cfg.country}
                    type="button"
                    onClick={() => handleSelectCountry(cfg.country)}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-left transition-colors flex items-center justify-between gap-1.5 ${
                      active
                        ? 'border-green-700 bg-green-50 text-green-950 font-extrabold ring-1 ring-green-700'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-green-400 font-semibold'
                    }`}
                  >
                    <span className="truncate text-xs sm:text-sm">
                      {cfg.country} <span className="text-[11px] text-slate-500">{cfg.dialCode}</span>
                    </span>
                    <span className="text-[11px] font-bold text-green-800 shrink-0">
                      {cfg.currencySymbol.trim()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. ALL Languages for selected country - NEVER hide small ones */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-slate-900">
                2. {t('language_label')} — {activeConfig.country} ({activeConfig.languages.length})
              </label>
              <span className="text-xs font-bold text-green-800">{selectedLanguage}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeConfig.languages.map((lang) => {
                const active = selectedLanguage === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setCountryAndLanguage(selectedCountry, lang, true);
                    }}
                    className={`min-h-[40px] rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors ${
                      active
                        ? 'bg-green-700 text-white border-green-700'
                        : 'bg-white text-slate-800 border-slate-300 hover:border-green-600'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                    <span>{lang}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Confirm */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600 min-w-0">
            <span className="font-bold text-slate-900">
              {viewAllCountries ? t('all_countries') : activeConfig.country}
            </span>{' '}
            · {selectedLanguage} · {activeConfig.currencySymbol.trim()}
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="min-h-[48px] px-6 rounded-xl bg-green-700 text-white font-extrabold text-sm sm:text-base hover:bg-green-800 shrink-0"
          >
            {t('continue_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};
