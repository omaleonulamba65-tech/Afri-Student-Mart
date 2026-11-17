import type { AdSettings } from '../types';

export const PAYSTACK_PUBLIC_KEY_PLACEHOLDER = '[PASTE YOUR pk_test_... HERE]';
export const PAYSTACK_SPLIT_CODE_PLACEHOLDER = '[PASTE YOUR SPLIT CODE HERE]';

export const AFRICAN_PAYOUT_BANKS = [
  'Access Bank',
  'GTBank (Guaranty Trust Bank)',
  'Zenith Bank',
  'First Bank of Nigeria',
  'UBA (United Bank for Africa)',
  'OPay Digital Services',
  'PalmPay',
  'Kuda Bank',
  'Moniepoint MFB',
  'Fidelity Bank',
  'Wema Bank',
  'Stanbic IBTC Bank',
  'Sterling Bank',
  'Ecobank',
  'Union Bank',
  'Polaris Bank',
  'FCMB',
  'GCB Bank (Ghana)',
  'Absa / Standard Bank (South Africa)',
  'FNB / Capitec (South Africa)',
] as const;

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref: string;
        split_code?: string;
        subaccount?: string;
        bearer?: 'account' | 'subaccount';
        transaction_charge?: number;
        metadata?: Record<string, unknown>;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

export function resolvePaystackConfig(settings?: Partial<AdSettings> | null): {
  publicKey: string;
  splitCode: string;
  adminSubaccountCode: string;
  hasLivePublicKey: boolean;
  hasLiveSplitCode: boolean;
} {
  const envKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined)?.trim() || '';
  const envSplit = (import.meta.env.VITE_PAYSTACK_SPLIT_CODE as string | undefined)?.trim() || '';

  const rawKey = (settings?.paystack_public_key || envKey || PAYSTACK_PUBLIC_KEY_PLACEHOLDER).trim();
  const rawSplit = (settings?.paystack_split_code || envSplit || PAYSTACK_SPLIT_CODE_PLACEHOLDER).trim();
  const adminSubaccountCode = (settings?.admin_subaccount_code || '').trim();

  const hasLivePublicKey =
    (rawKey.startsWith('pk_test_') || rawKey.startsWith('pk_live_')) &&
    !rawKey.includes('PASTE') &&
    rawKey !== 'pk_test_0000000000000000000000000000000000000000';

  const hasLiveSplitCode =
    rawSplit.startsWith('SPL_') && !rawSplit.includes('PASTE');

  return {
    publicKey: rawKey,
    splitCode: rawSplit,
    adminSubaccountCode,
    hasLivePublicKey,
    hasLiveSplitCode,
  };
}

export function launchPaystackInline(params: {
  settings?: Partial<AdSettings> | null;
  email: string;
  amountNaira: number;
  currency?: string;
  reference: string;
  sellerSubaccountCode?: string;
  metadata?: Record<string, unknown>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}): boolean {
  const cfg = resolvePaystackConfig(params.settings);
  if (!cfg.hasLivePublicKey || !window.PaystackPop?.setup) {
    return false;
  }

  try {
    const setupConfig: Parameters<NonNullable<typeof window.PaystackPop>['setup']>[0] = {
      key: cfg.publicKey,
      email: params.email,
      amount: Math.round(params.amountNaira * 100),
      currency: params.currency || 'NGN',
      ref: params.reference,
      metadata: {
        ...(params.metadata || {}),
        fee_bearer: 'all-proportional',
        split_rule: '7% Owner / 93% Seller after Paystack fee',
      },
      callback: (response) => {
        params.onSuccess(response.reference || params.reference);
      },
      onClose: params.onClose,
    };

    if (cfg.hasLiveSplitCode) {
      setupConfig.split_code = cfg.splitCode;
    } else if (params.sellerSubaccountCode && params.sellerSubaccountCode.startsWith('ACCT_')) {
      setupConfig.subaccount = params.sellerSubaccountCode;
      setupConfig.bearer = 'subaccount';
    }

    const handler = window.PaystackPop.setup(setupConfig);
    handler.openIframe();
    return true;
  } catch {
    return false;
  }
}
