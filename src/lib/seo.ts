import type { NavTab } from '../components/BottomNav';
import type { MarketplaceItem } from '../types';

export const BASE_SITE_URL = 'https://afristudentmartjpg.netlify.app';
export const DEFAULT_SEO_TITLE =
  'Afri Student Mart - Buy, Sell, Connect | JOKEY PERKY GROUP';
export const DEFAULT_SEO_DESCRIPTION =
  'Buy and sell food, clothes, textbooks, services across West Africa. Created for students by JOKEY PERKY GROUP.';

export interface SeoConfig {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

export function resolveInitialRouteState(): {
  tab: NavTab;
  authModal: 'login' | 'signup' | null;
} {
  if (typeof window === 'undefined') return { tab: 'home', authModal: null };
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const tabParam = (params.get('tab') || '').toLowerCase();

  if (path === '/login') return { tab: 'home', authModal: 'login' };
  if (path === '/signup' || path === '/register') return { tab: 'home', authModal: 'signup' };
  if (path === '/market' || path === '/markets' || tabParam === 'markets') {
    return { tab: 'markets', authModal: null };
  }
  if (path === '/services' || tabParam === 'services') return { tab: 'services', authModal: null };
  if (path === '/live' || tabParam === 'live') return { tab: 'live', authModal: null };
  if (path === '/shop' || path === '/shops' || tabParam === 'shop') {
    return { tab: 'shop', authModal: null };
  }
  if (path === '/post' || path === '/sell' || tabParam === 'post') {
    return { tab: 'post', authModal: null };
  }
  if (path === '/chat' || path === '/messages' || tabParam === 'chat') {
    return { tab: 'chat', authModal: null };
  }
  if (path === '/profile' || path === '/dashboard' || tabParam === 'profile') {
    return { tab: 'profile', authModal: null };
  }
  return { tab: 'home', authModal: null };
}

export function resolveInitialProductId(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/product\/([^/]+)\/?$/i);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  const params = new URLSearchParams(window.location.search);
  const qId = params.get('product') || params.get('item');
  return qId && qId.trim() ? qId.trim() : null;
}

export function tabToPath(tab: NavTab): string {
  switch (tab) {
    case 'markets':
      return '/market';
    case 'services':
      return '/services';
    case 'live':
      return '/live';
    case 'shop':
      return '/shop';
    case 'post':
      return '/post';
    case 'chat':
      return '/chat';
    case 'profile':
      return '/profile';
    default:
      return '/';
  }
}

export function getSeoForView(opts: {
  isOwnerRoute: boolean;
  activeTab: NavTab;
  authModalOpen: boolean;
  authMode: 'login' | 'signup';
  detailItem: MarketplaceItem | null;
}): SeoConfig {
  if (opts.isOwnerRoute) {
    return {
      title: 'Owner Portal | Afri Student Mart',
      description: 'Private management portal for Afri Student Mart.',
      path: '/owner-dashboard',
      noindex: true,
    };
  }

  if (opts.detailItem) {
    const loc = opts.detailItem.location || opts.detailItem.country || 'West Africa';
    return {
      title: `${opts.detailItem.title} | Afri Student Mart - JOKEY PERKY GROUP`,
      description: `${opts.detailItem.title} in ${loc}. ${DEFAULT_SEO_DESCRIPTION}`,
      path: `/product/${encodeURIComponent(opts.detailItem.id)}`,
    };
  }

  if (opts.authModalOpen) {
    if (opts.authMode === 'signup') {
      return {
        title: `Sign Up Free | ${DEFAULT_SEO_TITLE}`,
        description: `Create a free student, trader, or service provider account. ${DEFAULT_SEO_DESCRIPTION}`,
        path: '/signup',
      };
    }
    return {
      title: `Login | ${DEFAULT_SEO_TITLE}`,
      description: `Log in to your Afri Student Mart account. ${DEFAULT_SEO_DESCRIPTION}`,
      path: '/login',
    };
  }

  switch (opts.activeTab) {
    case 'markets':
      return {
        title: `Campus & City Markets | ${DEFAULT_SEO_TITLE}`,
        description: `Explore student and local markets across West Africa. ${DEFAULT_SEO_DESCRIPTION}`,
        path: '/market',
      };
    case 'services':
      return {
        title: `Student & Local Services | ${DEFAULT_SEO_TITLE}`,
        description: `Find laundry, hair & makeup, phone repair, tutoring, delivery, and photography. ${DEFAULT_SEO_DESCRIPTION}`,
        path: '/services',
      };
    case 'live':
      return {
        title: `Live Product Videos | ${DEFAULT_SEO_TITLE}`,
        description: `Watch live product demos across West Africa before you buy. ${DEFAULT_SEO_DESCRIPTION}`,
        path: '/live',
      };
    case 'shop':
      return {
        title: `Online Shops Directory | ${DEFAULT_SEO_TITLE}`,
        description: `Browse verified student & trader storefronts or open your own shop free. ${DEFAULT_SEO_DESCRIPTION}`,
        path: '/shop',
      };
    case 'post':
      return {
        title: `Sell Products Free | ${DEFAULT_SEO_TITLE}`,
        description: `Post food, clothes, shoes, bags, textbooks, and electronics free. ${DEFAULT_SEO_DESCRIPTION}`,
        path: '/post',
      };
    case 'chat':
      return {
        title: `Live Chat | ${DEFAULT_SEO_TITLE}`,
        description: `Message buyers, sellers, and service providers directly. ${DEFAULT_SEO_DESCRIPTION}`,
        path: '/chat',
      };
    case 'profile':
      return {
        title: `My Dashboard & Orders | ${DEFAULT_SEO_TITLE}`,
        description: `Manage your shop, products, orders, bookings, and live videos. ${DEFAULT_SEO_DESCRIPTION}`,
        path: '/profile',
      };
    default:
      return {
        title: DEFAULT_SEO_TITLE,
        description: DEFAULT_SEO_DESCRIPTION,
        path: '/',
      };
  }
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function applyPageSeo(cfg: SeoConfig) {
  if (typeof document === 'undefined') return;
  document.title = cfg.title;

  const origin =
    typeof window !== 'undefined' && window.location.hostname.includes('netlify.app')
      ? window.location.origin
      : BASE_SITE_URL;
  const canonicalUrl = `${origin}${cfg.path === '/' ? '/' : cfg.path}`;

  upsertMeta('name', 'description', cfg.description);
  upsertMeta('name', 'robots', cfg.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  upsertMeta('property', 'og:title', cfg.title);
  upsertMeta('property', 'og:description', cfg.description);
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('name', 'twitter:title', cfg.title);
  upsertMeta('name', 'twitter:description', cfg.description);

  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', canonicalUrl);
}
