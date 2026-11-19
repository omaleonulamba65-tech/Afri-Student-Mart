import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Shield } from 'lucide-react';
import { api, isVerifiedOwnerUser } from '../lib/api';
import type { AdSettings, PublicUser } from '../types';
import { OwnerDashboardView } from './OwnerDashboardView';

interface OwnerPortalPageProps {
  user: PublicUser | null;
  authReady: boolean;
  onAuthenticated: (token: string, owner: PublicUser) => void;
  onLogout: () => void;
  onRedirectDenied: () => void;
  onExitToStorefront: () => void;
  onAdsUpdated: (settings: AdSettings) => void;
}

export const OwnerPortalPage: React.FC<OwnerPortalPageProps> = ({
  user,
  authReady,
  onAuthenticated,
  onLogout,
  onRedirectDenied,
  onExitToStorefront,
  onAdsUpdated,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isVerifiedOwner = isVerifiedOwnerUser(user);

  useEffect(() => {
    if (authReady && user && !isVerifiedOwner) {
      onRedirectDenied();
    }
  }, [authReady, user, isVerifiedOwner, onRedirectDenied]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-sm font-semibold text-slate-600 shadow-sm">
          Checking access...
        </div>
      </div>
    );
  }

  if (user && !isVerifiedOwner) {
    return null;
  }

  if (isVerifiedOwner && user) {
    return (
      <OwnerDashboardView
        ownerEmail={user.email || ''}
        onBack={onExitToStorefront}
        onLogout={onLogout}
        onAdsUpdated={onAdsUpdated}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.ownerLogin({ email, password });
      onAuthenticated(res.token, res.user);
    } catch {
      onRedirectDenied();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-green-900 text-yellow-400 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Owner Portal</h1>
            <p className="text-xs font-medium text-slate-500">
              Restricted to Afri Student Mart administration
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="owner-email"
              className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5"
            >
              Owner Email
            </label>
            <input
              id="owner-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter authorized owner email"
              className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-900 focus:border-green-800 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="owner-password"
              className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="owner-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white pl-3.5 pr-11 text-sm font-medium text-slate-900 focus:border-green-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] rounded-xl bg-green-800 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 hover:bg-green-900 disabled:opacity-60"
          >
            <Lock className="w-4 h-4" />
            <span>{submitting ? 'Verifying...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onExitToStorefront}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-green-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Marketplace</span>
          </button>
          <span className="text-[11px] font-medium text-slate-400">Private access only</span>
        </div>
      </div>
    </div>
  );
};
