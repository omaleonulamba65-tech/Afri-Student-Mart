import { COUNTRY_LANGUAGE_CONFIGS } from './languages';

export interface CountryCodeOption {
  country: string;
  displayName: string;
  code: string;
  flag: string;
  currencySymbol: string;
  currencyCode: string;
  deliveryFeeSameCity: number;
  deliveryFeeStandard: number;
  languages: string[];
}

export const WEST_AND_SOUTH_AFRICA_COUNTRIES: CountryCodeOption[] = COUNTRY_LANGUAGE_CONFIGS.map(
  (c) => ({
    country: c.country,
    displayName: c.displayName || c.country,
    code: c.dialCode,
    flag: c.flag,
    currencySymbol: c.currencySymbol,
    currencyCode: c.currencyCode,
    deliveryFeeSameCity: c.deliveryFeeSameCity,
    deliveryFeeStandard: c.deliveryFeeStandard,
    languages: c.languages,
  })
);

