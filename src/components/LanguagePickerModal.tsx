import React, { useEffect, useMemo, useState } from 'react';
import { Check, Globe2, MapPin, X } from 'lucide-react';
import { getStatesByCountry } from '../data/countryDocuments';
import { getInstitutionsByCountry } from '../data/institutions';
import {
  COUNTRY_LANGUAGE_CONFIGS,
  getCountryConfig,
  getCountryDisplayName,
} from '../data/languages';
import { getMarketsByCountry } from '../data/markets';
import { useI18n } from '../lib/i18nContext';
import { api } from '../lib/api';
import type { PublicUser } from '../types';

interface LanguagePickerModalProps {
  open: boolean;
  canClose: boolean;
  user?: PublicUser | null;
  initialState?: string;
  initialArea?: string;
  onLocationSelected?: (loc: { country: string; state: string; area: string }) => void;
  onUserUpdated?: (user: PublicUser) => void;
  onClose: () => void;
}

export const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({
  open,
  canClose,
  user,
  initialState = 'All',
  initialArea = 'All',
  onLocationSelected,
  onUserUpdated,
  onClose,
}) => {
  const { country, language, setCountryAndLanguage, setCountryOnly, t } = useI18n();
  const [selectedCountry, setSelectedCountry] = useState<string>(
    country === 'All' ? 'Nigeria' : country
  );
  const [selectedState, setSelectedState] = useState<string>(initialState || 'All');
  const [selectedArea, setSelectedArea] = useState<string>(initialArea || 'All');
  const [selectedLanguage, setSelectedLanguage] = useState<string>(language || 'English');
  const [viewAllCountries, setViewAllCountries] = useState<boolean>(country === 'All');

  useEffect(() => {
    if (open) {
      setSelectedCountry(country === 'All' ? 'Nigeria' : country);
      setSelectedState(initialState || 'All');
      setSelectedArea(initialArea || 'All');
      setSelectedLanguage(language || 'English');
      setViewAllCountries(country === 'All');
    }
  }, [open, country, language, initialState, initialArea]);

  const availableStates = useMemo(
    () => getStatesByCountry(selectedCountry),
    [selectedCountry]
  );

  const availableAreas = useMemo(() => {
    const instNames = getInstitutionsByCountry(selectedCountry)
      .filter((inst) => {
        if (!selectedState || selectedState === 'All') return true;
        const stLower = selectedState.toLowerCase();
        return (
          stLower.includes(inst.state.toLowerCase()) ||
          inst.state.toLowerCase().includes(stLower)
        );
      })
      .map((i) => i.name);

    const marketNames = getMarketsByCountry(selectedCountry)
      .filter((grp) => {
        if (!selectedState || selectedState === 'All') return true;
        const stLower = selectedState.toLowerCase();
        return (
          stLower.includes(grp.stateOrCity.toLowerCase()) ||
          grp.stateOrCity.toLowerCase().includes(stLower) ||
          grp.country.toLowerCase() === grp.stateOrCity.toLowerCase()
        );
      })
      .flatMap((g) => g.markets);

    return Array.from(new Set([...instNames, ...marketNames]));
  }, [selectedCountry, selectedState]);

  if (!open) return null;

  const activeConfig = getCountryConfig(selectedCountry);

  const handleSelectCountry = (countryName: string) => {
    setSelectedCountry(countryName);
    setViewAllCountries(false);
    setSelectedState('All');
    setSelectedArea('All');
    const cfg = getCountryConfig(countryName);
    if (!cfg.languages.includes(selectedLanguage)) {
      setSelectedLanguage(cfg.languages[0] || 'English');
    }
  };

  const handleConfirm = async () => {
    const finalCountry = viewAllCountries ? 'All' : selectedCountry;
    setCountryAndLanguage(selectedCountry, selectedLanguage, true);
    if (viewAllCountries) {
      setCountryOnly('All');
    }
    onLocationSelected?.({
      country: finalCountry,
      state: viewAllCountries ? 'All' : selectedState,
      area: viewAllCountries ? 'All' : selectedArea,
    });
    if (user) {
      try {
        const res = await api.updateProfile({
          country: selectedCountry,
          language: selectedLanguage,
          ...(selectedState && selectedState !== 'All' ? { state: selectedState } : {}),
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
              <p className="text-xs text-green-100 truncate">
                Pick Country &rarr; State/Region &rarr; City/Campus/Market first
              </p>
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
                const active = !viewAllCountries && selectedCountry === cfg.country;
                const display = getCountryDisplayName(cfg.country);
                return (
                  <button
                    key={cfg.country}
                    type="button"
                    onClick={() => handleSelectCountry(cfg.country)}
                    className={`min-h-[46px] rounded-xl border px-3 py-2 text-left transition-colors flex items-center justify-between gap-1.5 ${
                      active
                        ? 'border-green-700 bg-green-50 text-green-950 font-extrabold ring-1 ring-green-700'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-green-400 font-semibold'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="text-xl sm:text-2xl leading-none shrink-0" aria-hidden="true">
                        {cfg.flag}
                      </span>
                      <span className="truncate text-xs sm:text-sm">
                        {display} <span className="text-[11px] text-slate-500">{cfg.dialCode}</span>
                      </span>
                    </span>
                    <span className="text-[11px] font-bold text-green-800 shrink-0">
                      {cfg.currencySymbol.trim()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Pick State/Region then City/Campus/Market */}
          {!viewAllCountries && (
            <div className="rounded-2xl border border-green-200 bg-green-50/50 p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-green-950">
                <MapPin className="w-4 h-4 text-green-700 shrink-0" />
                <span>
                  2. State/Region &rarr; City / Campus / Market ({getCountryDisplayName(selectedCountry)})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    State / Region
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setSelectedArea('All');
                    }}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 focus:border-green-700 focus:outline-none"
                  >
                    <option value="All">All States / Regions in {getCountryDisplayName(selectedCountry)}</option>
                    {availableStates.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City / Campus / Market
                  </label>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 focus:border-green-700 focus:outline-none"
                  >
                    <option value="All">
                      All Campuses &amp; Markets ({availableAreas.length})
                    </option>
                    {availableAreas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 3. ALL Languages for selected country - NEVER hide small ones */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-slate-900 inline-flex items-center gap-1.5">
                <span>3. {t('language_label')} —</span>
                <span className="text-xl leading-none" aria-hidden="true">
                  {activeConfig.flag}
                </span>
                <span>
                  {getCountryDisplayName(activeConfig.country)} ({activeConfig.languages.length})
                </span>
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
          <div className="text-xs text-slate-600 min-w-0 inline-flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-900 inline-flex items-center gap-1.5">
              {!viewAllCountries && (
                <span className="text-xl leading-none" aria-hidden="true">
                  {activeConfig.flag}
                </span>
              )}
              <span>
                {viewAllCountries
                  ? `🌍 ${t('all_countries')}`
                  : getCountryDisplayName(activeConfig.country)}
              </span>
            </span>{' '}
            <span>
              {!viewAllCountries && selectedState !== 'All' ? `· ${selectedState}` : ''}
              {!viewAllCountries && selectedArea !== 'All' ? ` · ${selectedArea}` : ''} · {selectedLanguage} ·{' '}
              {activeConfig.currencySymbol.trim()}
            </span>
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

