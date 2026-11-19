import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageCircle, Mic, Send, Square, Volume2, VolumeX, X } from 'lucide-react';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18nContext';
import {
  type BrowserSpeechRecognition,
  formatVoiceSeconds,
  getSpeechRecognitionCtor,
  pickSupportedAudioMimeType,
  resolveSpeechLangTag,
  speakText,
  stopSpeaking,
  transcribeVoiceBlob,
} from '../lib/voiceRecorder';
import type { MarketplaceItem, PublicUser } from '../types';

export interface ChatbotUserContext {
  id?: string;
  name?: string;
  user_type?: 'Buyer' | 'Student' | 'Trader' | 'Service Provider';
  role?: string;
  school?: string;
  student_id?: string;
  business_name?: string;
  products?: string;
  service_type?: string;
  service_details?: string;
  area?: string;
}

const AI_USER_CTX_STORAGE_KEY = 'afri_mart_ai_user_context';

function buildUserContextFromUser(user: PublicUser | null | undefined): ChatbotUserContext | null {
  if (!user) return null;
  const resolvedType: ChatbotUserContext['user_type'] =
    user.user_type ||
    (user.badges?.includes('service_provider')
      ? 'Service Provider'
      : user.badges?.includes('trader')
      ? 'Trader'
      : user.role === 'buyer' && (!user.badges || user.badges.length === 0)
      ? 'Buyer'
      : 'Student');

  return {
    id: user.id,
    name: user.full_name || user.name,
    user_type: resolvedType,
    role: user.role,
    school: user.institution || undefined,
    student_id: user.student_id || user.id_doc_number || undefined,
    business_name: user.shop_name || undefined,
    products: user.trader_products || undefined,
    service_type: user.service_category || undefined,
    service_details: user.service_details || undefined,
    area: user.campus || user.market || user.state || undefined,
  };
}

function loadStoredUserContext(): ChatbotUserContext | null {
  try {
    const raw = localStorage.getItem(AI_USER_CTX_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatbotUserContext;
    return parsed && parsed.user_type ? parsed : null;
  } catch {
    return null;
  }
}

function saveStoredUserContext(ctx: ChatbotUserContext | null) {
  try {
    if (!ctx) {
      localStorage.removeItem(AI_USER_CTX_STORAGE_KEY);
    } else {
      localStorage.setItem(AI_USER_CTX_STORAGE_KEY, JSON.stringify(ctx));
    }
  } catch {
    // Ignore storage issues
  }
}

interface MartAIWidgetProps {
  institution?: string;
  items?: MarketplaceItem[];
  user?: PublicUser | null;
}

interface ChatMessage {
  who: 'user' | 'bot';
  text: string;
}

const CORE_CHAT_LANGUAGES = ['English', 'Pidgin', 'Hausa', 'Yoruba', 'Igbo', 'French'];

function normalizeChatLang(siteLang: string): string {
  const lower = (siteLang || '').trim().toLowerCase();
  if (!lower) return 'English';
  if (lower.includes('pidgin')) return 'Pidgin';
  if (lower.includes('hausa')) return 'Hausa';
  if (lower.includes('yoruba')) return 'Yoruba';
  if (lower.includes('igbo')) return 'Igbo';
  if (lower.includes('french')) return 'French';
  if (lower.includes('english')) return 'English';
  return siteLang.trim();
}

function getServiceFollowUpQuestion(serviceType?: string, lang = 'English'): string {
  const s = (serviceType || '').toLowerCase();
  if (lang === 'Pidgin') {
    if (s.includes('laundry')) return 'Which hostel or area you dey do pickup/delivery, and how much per bundle?';
    if (s.includes('hair') || s.includes('makeup')) return 'You dey do home-service for hostel or studio, and which styles you sabi pass?';
    if (s.includes('phone')) return 'Which phone brands & wahala you dey repair (screen, battery, charging port)?';
    if (s.includes('tutor')) return 'Which courses or exams you dey teach, and how much per hour/class?';
    if (s.includes('delivery')) return 'Which campuses or areas your dispatch dey cover?';
    return `Tell me more about your ${serviceType || 'service'} packages & rates so I fit help bring customers!`;
  }
  if (s.includes('laundry')) {
    return 'Which campuses or areas do you pick up/deliver from, and what is your bundle price & turnaround time?';
  }
  if (s.includes('hair') || s.includes('makeup')) {
    return 'Do you offer hostel home-service or studio appointments, and which styles/looks are your specialty?';
  }
  if (s.includes('phone') || s.includes('repair')) {
    return 'Which phone brands and repairs (screens, batteries, charging ports) do you handle, and how fast is turnaround?';
  }
  if (s.includes('tutor')) {
    return 'Which courses, subjects, or exams do you tutor, and do you prefer campus meetups or online sessions?';
  }
  if (s.includes('delivery')) {
    return 'Which campuses or city zones do you cover, and what are your standard vs same-day rates?';
  }
  if (s.includes('photo')) {
    return 'What types of shoots do you offer (portraits, graduation, product shots) and what is your starting package?';
  }
  if (s.includes('graphic')) {
    return 'What designs do you specialize in (flyers, logos, CVs, social graphics) and what is your delivery speed?';
  }
  if (s.includes('plumb')) {
    return 'Which plumbing jobs and emergency callout areas do you cover?';
  }
  if (s.includes('electr')) {
    return 'Which electrical jobs (wiring, fans, sockets, solar/inverters) and areas do you handle?';
  }
  return `Tell me about your ${serviceType || 'service'} packages, pricing, and availability so we can set you up for bookings!`;
}

function getPersonaQuickPrompts(ctx: ChatbotUserContext | null): string[] {
  if (!ctx?.user_type) {
    return ['Show available items', 'How does delivery work?', 'How do I pay safely?'];
  }
  if (ctx.user_type === 'Service Provider') {
    const svc = ctx.service_type || 'my service';
    return [
      `Set up my ${svc} pricing & packages`,
      `How do I get more ${svc} bookings?`,
      `Tips for ${svc} providers`,
    ];
  }
  if (ctx.user_type === 'Trader') {
    return [
      `Tips to sell ${ctx.products || 'my products'} faster`,
      'How do I grow my Trader Shop?',
      'How do Paystack payouts work?',
    ];
  }
  if (ctx.user_type === 'Student') {
    return [
      `Popular items at ${ctx.school || 'campus'}`,
      'How to share my QR code with coursemates',
      'Tips for Student Sellers',
    ];
  }
  return [
    `What is available near ${ctx.area || 'me'}?`,
    'Show available items',
    'How does Paystack Escrow work?',
  ];
}

function getGreetingForLanguage(lang: string, ctx?: ChatbotUserContext | null): string {
  const firstName = ctx?.name?.split(' ')[0];
  if (ctx?.user_type === 'Service Provider') {
    const svc = ctx.service_type || 'your service';
    const followUp = getServiceFollowUpQuestion(svc, lang);
    if (lang === 'Pidgin') {
      return `Welcome ${firstName || 'boss'}! I remember say you be Service Provider for ${svc} 🤝. ${followUp}`;
    }
    if (lang === 'French') {
      return `Bienvenue ${firstName || ''} ! Je note que vous êtes Prestataire de services (${svc}) 🤝. Parlez-moi de vos tarifs et disponibilités pour attirer des clients !`;
    }
    return `Welcome ${firstName || ''}! I remember you're a Service Provider for ${svc} 🤝.\n\n${followUp}`;
  }
  if (ctx?.user_type === 'Trader') {
    const biz = ctx.business_name || 'your business';
    const prods = ctx.products ? ` (${ctx.products})` : '';
    if (lang === 'Pidgin') {
      return `Welcome ${firstName || 'oga/madam'} of ${biz}! I sabi say you be Trader${prods} 🤝. How business today — you wan tips to boost sales or manage your Trader Shop?`;
    }
    return `Welcome back, ${firstName || 'Trader'} of ${biz}! 🤝 I've noted your Trader profile${prods}. Want help setting up your shop, pricing products, or reaching more campus buyers?`;
  }
  if (ctx?.user_type === 'Student') {
    const school = ctx.school || 'your campus';
    if (lang === 'Pidgin') {
      return `Hey ${firstName || 'my guy'} from ${school}! As a Student Seller 🤝, wetin you wan do today — check campus prices, post item, or share QR code?`;
    }
    return `Hey ${firstName || 'Student'} from ${school}! 🤝 As a Student Seller, I can help you price items for campus, track what students are buying, or generate QR codes to share. What's on your mind?`;
  }
  if (ctx?.user_type === 'Buyer') {
    const areaText = ctx.area ? ` in ${ctx.area}` : '';
    if (lang === 'Pidgin') {
      return `Welcome ${firstName || 'my friend'}! You be Buyer${areaText} 🤝. Wetin you wan buy today?`;
    }
    return `Welcome ${firstName || 'back'}! 😊 Looking to buy something${areaText} today? Tell me what you need and I'll check live prices for you.`;
  }

  switch (lang) {
    case 'Pidgin':
      return 'Hello my friend! Welcome to Afri Student Mart 😊 How you dey today? Wetin you dey find?';
    case 'Hausa':
      return 'Sannu abokina! Barka da zuwa Afri Student Mart 😊 Yaya kake yau? Me kake nema?';
    case 'Yoruba':
      return 'Ẹ n lẹ! Ẹ kaabo si Afri Student Mart 😊 Bawo ni ẹ ṣe wa loni? Kini ẹ n wa?';
    case 'Igbo':
      return 'Ndewo enyi m! Nnọọ na Afri Student Mart 😊 Kedu ka ị mere taa? Gịnị ka ị na-achọ?';
    case 'French':
      return 'Bonjour mon ami(e) ! Bienvenue sur Afri Student Mart 😊 Comment allez-vous aujourd’hui ? Que cherchez-vous ?';
    default:
      return 'Hello! Welcome to Afri Student Mart 😊 How are you doing today? What can I help you find?';
  }
}

function detectLanguageInMessage(rawQ: string): string | null {
  const q = rawQ.toLowerCase();
  if (
    q.includes('how far') ||
    q.includes('how you dey') ||
    q.includes('wetin') ||
    q.includes('abeg') ||
    q.includes('no wahala') ||
    q.includes('dey available')
  ) {
    return 'Pidgin';
  }
  if (q.includes('sannu') || q.includes('yaya kake') || q.includes('barka') || q.includes('ina kwana')) {
    return 'Hausa';
  }
  if (q.includes('bawo ni') || q.includes('e kaabo') || q.includes('ẹ n lẹ') || q.includes('ẹ kaarọ')) {
    return 'Yoruba';
  }
  if (q.includes('ndewo') || q.includes('kedu') || q.includes('nnọọ') || q.includes('biko')) {
    return 'Igbo';
  }
  if (q.includes('bonjour') || q.includes('bonsoir') || q.includes('ça va') || q.includes('combien')) {
    return 'French';
  }
  return null;
}

function getStaticSiteFallbackAnswer(
  rawQ: string,
  lang: string,
  products: MarketplaceItem[],
  formatMoney: (amt: number, c?: string) => string,
  userCtx?: ChatbotUserContext | null
): string {
  const q = rawQ.toLowerCase();

  if (
    q.includes('hello') ||
    q.includes('hi') ||
    q.includes('hey') ||
    q.includes('good morning') ||
    q.includes('good afternoon') ||
    q.includes('good evening') ||
    q.includes('sannu') ||
    q.includes('bawo ni') ||
    q.includes('ndewo') ||
    q.includes('bonjour')
  ) {
    return getGreetingForLanguage(lang, userCtx);
  }

  if (q.includes('who am i') || q.includes('my account') || q.includes('user type') || q.includes('remember me')) {
    if (userCtx?.user_type === 'Service Provider') {
      return `I remember you! You're ${userCtx.name || 'a verified'} Service Provider specializing in **${userCtx.service_type || 'Campus Service'}**${userCtx.area ? ` around ${userCtx.area}` : ''}. ${getServiceFollowUpQuestion(userCtx.service_type, lang)}`;
    }
    if (userCtx?.user_type === 'Trader') {
      return `I remember you! You're ${userCtx.name || 'a verified'} Trader running **${userCtx.business_name || 'your business'}** selling **${userCtx.products || 'products'}**. Want help listing stock or growing sales?`;
    }
    if (userCtx?.user_type === 'Student') {
      return `I remember you! You're ${userCtx.name || 'a verified'} Student Seller at **${userCtx.school || 'your school'}**${userCtx.student_id ? ` (ID: ${userCtx.student_id})` : ''}. Want help posting campus items or sharing product QR codes?`;
    }
    if (userCtx?.user_type === 'Buyer') {
      return `I remember you! You're registered as a Buyer${userCtx.area ? ` in ${userCtx.area}` : ''}. Tell me what you want to buy and I'll check live prices!`;
    }
  }

  if (userCtx?.user_type === 'Service Provider' && (q.includes('booking') || q.includes('pricing') || q.includes('package') || q.includes('service') || q.includes('tip') || q.includes('customer'))) {
    const svc = userCtx.service_type || 'your service';
    return `For your **${svc}** service${userCtx.area ? ` in ${userCtx.area}` : ''}:\n• Add 3 clear packages (Basic, Standard, Express) in the Services tab so students can book 1-tap.\n• Upload 2–4 real work photos to boost trust.\n• Share your profile link in campus groups.\n\nWhat starting price or package would you like to offer for ${svc}?`;
  }

  if (userCtx?.user_type === 'Trader' && (q.includes('shop') || q.includes('sell') || q.includes('boost') || q.includes('tip') || q.includes('payout') || q.includes('product'))) {
    return `Tips for **${userCtx.business_name || 'your Trader Shop'}** (${userCtx.products || 'your goods'}):\n• Post clear photos + a quick 10-second live video under the Post tab.\n• Add your payout bank in Profile/Shop so Paystack pays your 93% automatically.\n• Print or share Product QR codes for walk-in and campus buyers!\n\nWould you like help pricing any item right now?`;
  }

  if (userCtx?.user_type === 'Student' && (q.includes('qr') || q.includes('campus') || q.includes('sell') || q.includes('tip') || q.includes('student'))) {
    return `Student Seller tips for **${userCtx.school || 'your campus'}**:\n• List textbooks, hostel items, clothes, or snacks using the Post tab.\n• Tap the QR button on any of your listings to print/share on hostel WhatsApp groups!\n• Meet at safe campus spots or accept Paystack Escrow.\n\nWhat item are you planning to post next?`;
  }

  if (q.includes('how are you') || q.includes('how far') || q.includes('how you dey') || q.includes('kedu') || q.includes('ça va')) {
    if (lang === 'Pidgin') return 'I dey fine, thank you for ask! How about you? Wetin I fit help you find?';
    if (lang === 'Hausa') return 'Lafiya lau, na gode! Kai fa? Me zan taimaka maka nema?';
    if (lang === 'Yoruba') return 'Mo wa daadaa, ẹ ṣeun! Bawo ni tiyin naa? Kini mo le ran yin lọwọ lati wa?';
    if (lang === 'Igbo') return 'Adị m mma, daalụ! Kedu maka gị? Gịnị ka m ga-enyere gị chọta?';
    if (lang === 'French') return 'Je vais très bien, merci ! Et vous ? Quel produit cherchez-vous ?';
    return "I'm doing well, thanks for asking! How about you? How can I help you today?";
  }

  if (q.includes('who are you') || q.includes('your name') || q.includes('what can you do')) {
    if (lang === 'Pidgin')
      return 'I be Afri Assistant for Afri Student Mart! I fit help you check products, prices, delivery for Abuja & across campuses, and guide Students, Traders, Service Providers & Buyers. Wetin you wan do today?';
    return "I'm Afri Assistant, your friendly shopping & business helper at Afri Student Mart (by Jokey Perky Group). I remember your account role (Buyer, Student, Trader, or Service Provider) and help with products, prices, bookings, and general questions. What would you like help with?";
  }

  if (
    q.includes('price') ||
    q.includes('how much') ||
    q.includes('cost') ||
    q.includes('available') ||
    q.includes('do you have') ||
    q.includes('list') ||
    q.includes('show me') ||
    q.includes('what do you sell') ||
    q.includes('combien')
  ) {
    if (q.includes('available') || q.includes('list') || q.includes('show me') || q.includes('what do you sell')) {
      const avail = products.slice(0, 8);
      if (avail.length === 0) {
        return lang === 'Pidgin'
          ? 'No product load finish right now o, abeg wait small or check the Home feed.'
          : 'I could not see available products loaded yet. Please browse the Home feed or try again shortly.';
      }
      const header =
        lang === 'Pidgin'
          ? 'These ones dey available on site right now o:\n\n'
          : lang === 'French'
          ? 'Voici les articles disponibles en ce moment :\n\n'
          : 'Here are available items on the site right now:\n\n';
      const lines = avail
        .map((p) => `• ${p.title} - ${formatMoney(p.price, p.country)} (${p.location || p.institution})`)
        .join('\n');
      const footer =
        lang === 'Pidgin'
          ? '\n\nWhich one you wan order?'
          : lang === 'French'
          ? '\n\nLequel souhaitez-vous commander ?'
          : '\n\nWhich one would you like to check or order?';
      return `${header}${lines}${footer}`;
    }

    const words = q
      .replace(/how much is|price of|do you have|cost of/g, '')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const match = products.find((p) => {
      const titleLower = p.title.toLowerCase();
      return words.some((w) => titleLower.includes(w)) || q.includes(titleLower);
    });

    if (match) {
      return lang === 'Pidgin'
        ? `Yes o, ${match.title} dey available! Price na ${formatMoney(match.price, match.country)} (${match.condition}, ${match.location || match.institution}). You wan order am?`
        : `Yes, ${match.title} is available! Price is ${formatMoney(match.price, match.country)} (${match.condition}, ${match.location || match.institution}). Do you want help placing the order?`;
    }

    return lang === 'Pidgin'
      ? "I check our site well well, I no see that exact item. Type the name again or type 'show available' make I list wetin dey ground!"
      : "I checked our site and couldn't find that exact item. Try typing the item name again, or type 'show available' to see live items on the market.";
  }

  if (q.includes('delivery') || q.includes('deliver') || q.includes('shipping')) {
    return lang === 'Pidgin'
      ? 'Yes o! We dey deliver inside Abuja & campus areas (delivery fee depend on your area, 24-48 hrs). Where you dey?'
      : 'Yes, we deliver in Abuja and campus areas (24–48 hrs; fee depends on your area). Where are you located?';
  }

  if (q.includes('head office') || q.includes('location') || q.includes('address')) {
    return 'Our head office is in Abuja, FCT, Nigeria (Afri Student Mart by Jokey Perky Group). We deliver across Abuja and serve campuses across West & South Africa. Would you like to check products near your area?';
  }

  if (q.includes('payment') || q.includes('pay') || q.includes('transfer') || q.includes('escrow')) {
    return 'You can pay safely via Paystack Escrow (Bank transfer, card, mobile money, or pay on delivery depending on seller/area). Do you want help finding a product to order?';
  }

  if (q.includes('thank')) {
    return lang === 'Pidgin' ? 'You welcome my friend! Anytime o 😊' : 'You are welcome! Anytime. 😊';
  }

  if (q.includes('bye')) {
    return lang === 'Pidgin'
      ? 'Bye bye o! Come back Afri Student Mart soon! 👋'
      : 'Bye bye! Thanks for visiting Afri Student Mart. Come back soon! 👋';
  }

  return lang === 'Pidgin'
    ? "I never fit answer that one directly from here, but I fit help you check products, prices, delivery, or connect you with human support at afristudentmartsupportjpg@gmail.com. Type 'show available' to see items!"
    : "I couldn't find an exact answer to that here, but I can help you with live products, prices, delivery, and orders — or connect you to human support at afristudentmartsupportjpg@gmail.com. Type 'show available' to browse items!";
}

export const MartAIWidget: React.FC<MartAIWidgetProps> = ({ institution, items = [], user }) => {
  const { country, language: siteLanguage, formatMoney } = useI18n();
  const [open, setOpen] = useState(true);
  const [chatLang, setChatLang] = useState<string>(() => normalizeChatLang(siteLanguage));
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [listeningMode, setListeningMode] = useState<'speech' | 'recorder' | null>(null);
  const [recordSecs, setRecordSecs] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceOutEnabled, setVoiceOutEnabled] = useState(true);
  const [voiceError, setVoiceError] = useState('');
  const [fetchedProducts, setFetchedProducts] = useState<MarketplaceItem[]>([]);
  const [rememberedUserCtx, setRememberedUserCtx] = useState<ChatbotUserContext | null>(() =>
    buildUserContextFromUser(user) || loadStoredUserContext()
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const lastUserSignatureRef = useRef<string>('');
  const hadLiveUserRef = useRef<boolean>(Boolean(user));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const cancelRecordRef = useRef(false);
  const speechRecRef = useRef<BrowserSpeechRecognition | null>(null);
  const voiceOutEnabledRef = useRef(voiceOutEnabled);
  voiceOutEnabledRef.current = voiceOutEnabled;

  const languageOptions = useMemo(() => {
    const normalized = normalizeChatLang(siteLanguage);
    if (CORE_CHAT_LANGUAGES.includes(normalized)) return CORE_CHAT_LANGUAGES;
    return [normalized, ...CORE_CHAT_LANGUAGES];
  }, [siteLanguage]);

  // Sync chat language whenever the website language setting changes
  useEffect(() => {
    setChatLang(normalizeChatLang(siteLanguage));
  }, [siteLanguage]);

  // Remember user account type (Student, Trader, Service Provider, or Buyer) whenever user signs up/in or logs out
  useEffect(() => {
    if (user) {
      hadLiveUserRef.current = true;
      const nextCtx = buildUserContextFromUser(user);
      setRememberedUserCtx(nextCtx);
      saveStoredUserContext(nextCtx);

      const sig = `${user.id}|${nextCtx?.user_type}|${nextCtx?.school || ''}|${nextCtx?.business_name || ''}|${nextCtx?.service_type || ''}`;
      if (sig !== lastUserSignatureRef.current) {
        const wasLoggedOut = !lastUserSignatureRef.current;
        lastUserSignatureRef.current = sig;
        const personalized = getGreetingForLanguage(
          normalizeChatLang(user.language || siteLanguage),
          nextCtx
        );
        setMessages((prev) => {
          if (prev.length <= 1 || wasLoggedOut) {
            return [{ who: 'bot', text: personalized }];
          }
          return [...prev, { who: 'bot', text: personalized }];
        });
      }
    } else if (hadLiveUserRef.current) {
      hadLiveUserRef.current = false;
      lastUserSignatureRef.current = '';
      setRememberedUserCtx(null);
      saveStoredUserContext(null);
      setMessages([{ who: 'bot', text: getGreetingForLanguage(chatLang, null) }]);
    }
  }, [user, siteLanguage, chatLang]);

  useEffect(() => {
    const onCtxUpdated = () => {
      const freshCtx = loadStoredUserContext();
      if (freshCtx) {
        setRememberedUserCtx(freshCtx);
        const personalized = getGreetingForLanguage(chatLang, freshCtx);
        setMessages((prev) => {
          if (prev.length <= 1) return [{ who: 'bot', text: personalized }];
          return [...prev, { who: 'bot', text: personalized }];
        });
      }
    };
    window.addEventListener('afri-ai-user-context-updated', onCtxUpdated);
    return () => window.removeEventListener('afri-ai-user-context-updated', onCtxUpdated);
  }, [chatLang]);

  // Initial friendly greeting when widget mounts
  useEffect(() => {
    const initialLang = normalizeChatLang(siteLanguage);
    const initialCtx = buildUserContextFromUser(user) || loadStoredUserContext();
    const t = window.setTimeout(() => {
      setMessages((prev) =>
        prev.length > 0
          ? prev
          : [{ who: 'bot', text: getGreetingForLanguage(initialLang, initialCtx) }]
      );
    }, 150);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load live products from Supabase so Afri Assistant always has fresh product data
  useEffect(() => {
    let cancelled = false;
    api
      .getItems({
        limit: 40,
        lite: true,
        country: country === 'All' ? undefined : country,
      })
      .then((res) => {
        if (!cancelled && Array.isArray(res?.items)) {
          setFetchedProducts(res.items);
        }
      })
      .catch(() => {
        // Use items passed via props as fallback
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  const combinedProducts = useMemo(() => {
    const byId = new Map<string, MarketplaceItem>();
    for (const it of items) byId.set(it.id, it);
    for (const it of fetchedProducts) {
      if (!byId.has(it.id)) byId.set(it.id, it);
    }
    return Array.from(byId.values());
  }, [items, fetchedProducts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, sending, transcribing]);

  const cleanupRecordingResources = useCallback(() => {
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    if (speechRecRef.current) {
      try {
        speechRecRef.current.abort();
      } catch {
        // Ignore
      }
      speechRecRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelRecordRef.current = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore
        }
      }
      cleanupRecordingResources();
      stopSpeaking();
    };
  }, [cleanupRecordingResources]);

  const submitMessageText = async (rawText: string, displayLabel?: string) => {
    const q = rawText.trim();
    if (!q || sending) return;
    setVoiceError('');

    // Auto-switch if user suddenly writes in another Nigerian/African language
    const detected = detectLanguageInMessage(q);
    const activeLang = detected || chatLang;
    if (detected && detected !== chatLang) {
      setChatLang(detected);
    }

    const nextHistory = [
      ...messages.slice(-8).map((m) => ({
        role: m.who === 'user' ? ('user' as const) : ('assistant' as const),
        text: m.text.replace(/^🎤\s*/, ''),
      })),
    ];

    setMessages((prev) => [...prev, { who: 'user', text: displayLabel || q }]);
    setInput('');
    setSending(true);

    try {
      const qWords = q
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);

      const prioritized = [...combinedProducts]
        .sort((a, b) => {
          const scoreA = qWords.reduce(
            (s, w) => (a.title.toLowerCase().includes(w) || a.category.toLowerCase().includes(w) ? s + 1 : s),
            0
          );
          const scoreB = qWords.reduce(
            (s, w) => (b.title.toLowerCase().includes(w) || b.category.toLowerCase().includes(w) ? s + 1 : s),
            0
          );
          return scoreB - scoreA;
        })
        .slice(0, 15);

      const compactProducts = prioritized.map((p) => ({
        id: p.id,
        name: p.title,
        price: p.price,
        formatted_price: formatMoney(p.price, p.country),
        available: true,
        category: p.category,
        condition: p.condition,
        location: p.location || p.institution,
      }));

      const res = await fetch('/api/mart-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          institution: institution || rememberedUserCtx?.school,
          country: country === 'All' ? 'Nigeria' : country,
          language: activeLang,
          products: compactProducts,
          history: nextHistory,
          userContext: rememberedUserCtx || undefined,
          stream: true,
        }),
      });

      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamedText = '';
        let botBubbleCreated = false;

        const appendBotText = (chunkText: string) => {
          streamedText += chunkText;
          if (!botBubbleCreated) {
            botBubbleCreated = true;
            setMessages((prev) => [...prev, { who: 'bot', text: streamedText }]);
          } else {
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { who: 'bot', text: streamedText };
              return copy;
            });
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const evt of events) {
            const dataLine = evt
              .split('\n')
              .find((line) => line.startsWith('data: '));
            if (!dataLine) continue;
            const payload = dataLine.slice(6).trim();
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload) as { text?: string; error?: string };
              if (parsed.error) {
                appendBotText(parsed.error);
              } else if (parsed.text) {
                appendBotText(parsed.text);
              }
            } catch {
              // Ignore partial non-JSON lines
            }
          }
        }

        if (!botBubbleCreated) {
          const fallbackMsg =
            "I couldn't generate a response right now. Please try asking again!";
          setMessages((prev) => [...prev, { who: 'bot', text: fallbackMsg }]);
          if (voiceOutEnabledRef.current) speakText(fallbackMsg, activeLang);
        } else if (voiceOutEnabledRef.current && streamedText.trim()) {
          speakText(streamedText, activeLang);
        }
        return;
      }

      if (!contentType.includes('application/json')) {
        // Static-only hosting (e.g., Netlify SPA without Node server.ts)
        const reply = getStaticSiteFallbackAnswer(
          q,
          activeLang,
          combinedProducts,
          formatMoney,
          rememberedUserCtx
        );
        setMessages((prev) => [...prev, { who: 'bot', text: reply }]);
        if (voiceOutEnabledRef.current) speakText(reply, activeLang);
        return;
      }

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        const errReply = data?.error || `Afri Assistant could not respond right now (${res.status}).`;
        setMessages((prev) => [...prev, { who: 'bot', text: errReply }]);
        return;
      }

      const finalReply =
        data.reply || "I couldn't generate a response right now. Please try asking again!";
      setMessages((prev) => [...prev, { who: 'bot', text: finalReply }]);
      if (voiceOutEnabledRef.current) speakText(finalReply, activeLang);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          who: 'bot',
          text: 'Network error reaching Afri Assistant. Please check your connection and try again.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const sendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await submitMessageText(input);
  };

  const startMediaRecorderVoice = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setVoiceError('Voice recording is not supported on this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      cancelRecordRef.current = false;

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          audioChunksRef.current.push(evt.data);
        }
      };

      recorder.onstop = async () => {
        const wasCancelled = cancelRecordRef.current;
        const chunks = [...audioChunksRef.current];
        const recordedType = recorder.mimeType || mimeType || 'audio/webm';
        cleanupRecordingResources();
        setRecording(false);
        setListeningMode(null);
        setRecordSecs(0);

        if (wasCancelled || chunks.length === 0) return;

        const blob = new Blob(chunks, { type: recordedType });
        setTranscribing(true);
        try {
          const { transcript } = await transcribeVoiceBlob(blob, chatLang);
          setTranscribing(false);
          setInput(transcript);
          await submitMessageText(transcript, `🎤 ${transcript}`);
        } catch (err) {
          setTranscribing(false);
          setVoiceError(
            err instanceof Error ? err.message : 'Could not understand that voice note.'
          );
        }
      };

      recorder.start(250);
      setRecording(true);
      setListeningMode('recorder');
      setRecordSecs(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSecs((prev) => {
          const next = prev + 1;
          if (next >= 45 && mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
          return next;
        });
      }, 1000);
    } catch {
      cleanupRecordingResources();
      setRecording(false);
      setListeningMode(null);
      setVoiceError('Microphone access denied. Allow mic permission in your browser to record.');
    }
  };

  const startVoiceRecording = async () => {
    if (recording || transcribing || sending) return;
    setVoiceError('');
    stopSpeaking();

    const SpeechRec = getSpeechRecognitionCtor();
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = resolveSpeechLangTag(chatLang);
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        speechRecRef.current = rec;
        cancelRecordRef.current = false;

        let gotResult = false;
        rec.onresult = (evt) => {
          gotResult = true;
          const transcript = (evt?.results?.[0]?.[0]?.transcript || '').trim();
          speechRecRef.current = null;
          setRecording(false);
          setListeningMode(null);
          setRecordSecs(0);
          if (recordTimerRef.current !== null) {
            window.clearInterval(recordTimerRef.current);
            recordTimerRef.current = null;
          }
          if (transcript && !cancelRecordRef.current) {
            setInput(transcript);
            void submitMessageText(transcript, `🎤 ${transcript}`);
          }
        };

        rec.onerror = (evt) => {
          const errCode = evt?.error || '';
          speechRecRef.current = null;
          setRecording(false);
          setListeningMode(null);
          setRecordSecs(0);
          if (recordTimerRef.current !== null) {
            window.clearInterval(recordTimerRef.current);
            recordTimerRef.current = null;
          }
          if (cancelRecordRef.current || errCode === 'aborted') return;
          if (errCode === 'not-allowed' || errCode === 'permission-denied') {
            setVoiceError('Microphone permission denied. Allow mic access in your browser.');
            return;
          }
          if (errCode === 'network' || errCode === 'service-not-allowed') {
            // Fall back seamlessly to MediaRecorder + /api/mart-ai/transcribe
            void startMediaRecorderVoice();
            return;
          }
          setVoiceError('Could not hear speech clearly. Tap Talk and try again.');
        };

        rec.onend = () => {
          if (!gotResult) {
            speechRecRef.current = null;
            setRecording(false);
            setListeningMode(null);
            setRecordSecs(0);
            if (recordTimerRef.current !== null) {
              window.clearInterval(recordTimerRef.current);
              recordTimerRef.current = null;
            }
          }
        };

        setRecording(true);
        setListeningMode('speech');
        setRecordSecs(0);
        recordTimerRef.current = window.setInterval(() => {
          setRecordSecs((prev) => prev + 1);
        }, 1000);
        rec.start();
        return;
      } catch {
        speechRecRef.current = null;
        setRecording(false);
        setListeningMode(null);
      }
    }

    await startMediaRecorderVoice();
  };

  const stopAndSendVoice = () => {
    if (listeningMode === 'speech' && speechRecRef.current) {
      cancelRecordRef.current = false;
      try {
        speechRecRef.current.stop();
      } catch {
        setRecording(false);
        setListeningMode(null);
      }
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      cancelRecordRef.current = false;
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceRecording = () => {
    cancelRecordRef.current = true;
    if (listeningMode === 'speech' && speechRecRef.current) {
      try {
        speechRecRef.current.abort();
      } catch {
        // Ignore
      }
      speechRecRef.current = null;
      setRecording(false);
      setListeningMode(null);
      setRecordSecs(0);
      if (recordTimerRef.current !== null) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupRecordingResources();
      setRecording(false);
      setListeningMode(null);
      setRecordSecs(0);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-5 md:right-5 z-40 min-h-[46px] px-4 rounded-xl bg-[#0a7a42] text-white font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-[#086335] active:scale-95 transition-transform"
        aria-label="Open Afri Assistant"
      >
        <MessageCircle className="w-4 h-4 shrink-0" />
        <span>Afri Assistant 🤝</span>
      </button>
    );
  }

  return (
    <div
      id="chat-box"
      className="fixed bottom-20 right-4 md:bottom-5 md:right-5 z-40 w-[320px] max-w-[calc(100vw-2rem)] bg-white rounded-[15px] shadow-[0_0_15px_rgba(0,0,0,0.2)] overflow-hidden font-sans border border-slate-200"
    >
      <div className="bg-[#0a7a42] text-white px-3 py-2.5 font-bold text-sm flex items-center justify-between gap-1.5">
        <span className="truncate">Afri Student Mart 🤝</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = !voiceOutEnabled;
              setVoiceOutEnabled(next);
              if (!next) stopSpeaking();
            }}
            title={voiceOutEnabled ? 'Mute voice replies' : 'Speak bot replies aloud'}
            aria-label={voiceOutEnabled ? 'Mute voice replies' : 'Speak bot replies aloud'}
            className="p-1 text-white/95 hover:text-white rounded hover:bg-white/10"
          >
            {voiceOutEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <select
            id="lang-select"
            aria-label="Assistant language"
            value={chatLang}
            onChange={(e) => {
              const next = e.target.value;
              setChatLang(next);
            }}
            className="bg-white text-slate-900 text-xs font-semibold border-none rounded px-1.5 py-1 outline-none cursor-pointer"
          >
            {languageOptions.map((langOpt) => (
              <option key={langOpt} value={langOpt}>
                {langOpt}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              setOpen(false);
            }}
            className="px-1.5 py-0.5 text-white/95 hover:text-white font-bold cursor-pointer rounded hover:bg-white/10"
            aria-label="Close chatbot"
          >
            X
          </button>
        </div>
      </div>

      {/* Remembered User Type Bar */}
      {rememberedUserCtx?.user_type && (
        <div className="bg-green-50 border-b border-green-200 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px]">
          <span className="font-bold text-green-900 truncate">
            {rememberedUserCtx.user_type === 'Service Provider'
              ? `Service Provider · ${rememberedUserCtx.service_type || 'Campus Service'}`
              : rememberedUserCtx.user_type === 'Trader'
              ? `Trader · ${rememberedUserCtx.business_name || 'Business Shop'}`
              : rememberedUserCtx.user_type === 'Student'
              ? `Student · ${rememberedUserCtx.school || 'Campus Seller'}`
              : `Buyer · ${rememberedUserCtx.area || 'Shopper'}`}
          </span>
          <span className="text-[10px] font-semibold text-green-700 shrink-0">Remembered ✓</span>
        </div>
      )}

      <div
        id="chat-messages"
        className="h-[260px] overflow-y-auto p-2.5 text-sm bg-white"
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`my-2 ${m.who === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div className="inline-flex items-end gap-1 max-w-[90%]">
              <span
                className={`inline-block px-3 py-2 rounded-[12px] text-slate-900 leading-snug break-words whitespace-pre-line text-left ${
                  m.who === 'user' ? 'bg-[#dcf8c6]' : 'bg-[#f1f1f1]'
                }`}
              >
                {m.text}
              </span>
              {m.who === 'bot' && (
                <button
                  type="button"
                  onClick={() => speakText(m.text, chatLang)}
                  title="Listen to reply"
                  aria-label="Listen to reply"
                  className="p-1 text-slate-400 hover:text-[#0a7a42] rounded shrink-0"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {transcribing && (
          <div className="my-2 text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-[#dcf8c6] text-slate-700 text-xs italic">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Transcribing voice note...
            </span>
          </div>
        )}
        {sending && messages[messages.length - 1]?.who === 'user' && (
          <div className="my-2 text-left">
            <span className="inline-block px-3 py-2 rounded-[12px] bg-[#f1f1f1] text-slate-500 text-xs italic">
              Afri Assistant is typing...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Role/Service-tailored quick prompts */}
      {!recording && !sending && (
        <div className="flex gap-1.5 overflow-x-auto px-2.5 py-1.5 bg-slate-50 border-t border-slate-100">
          {getPersonaQuickPrompts(rememberedUserCtx).map((promptText) => (
            <button
              key={promptText}
              type="button"
              onClick={() => void submitMessageText(promptText)}
              className="shrink-0 px-2.5 py-1 rounded-lg border border-green-700/30 bg-white text-[11px] font-semibold text-green-900 hover:bg-green-50 whitespace-nowrap"
            >
              {promptText}
            </button>
          ))}
        </div>
      )}

      {voiceError && (
        <div className="px-3 py-1.5 bg-red-50 border-t border-red-200 text-[11px] font-semibold text-red-700 flex items-center justify-between gap-2">
          <span className="truncate">{voiceError}</span>
          <button
            type="button"
            onClick={() => setVoiceError('')}
            aria-label="Dismiss voice error"
            className="text-red-500 hover:text-red-700 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {recording ? (
        <div className="flex items-center justify-between gap-2 border-t border-red-200 bg-red-50 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
            <span className="text-xs font-extrabold text-red-700 tabular-nums">
              {formatVoiceSeconds(recordSecs)}
            </span>
            <span className="text-xs font-semibold text-slate-700 truncate">Listening...</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={cancelVoiceRecording}
              aria-label="Cancel voice recording"
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={stopAndSendVoice}
              aria-label="Stop and send voice message"
              className="px-2.5 py-1.5 rounded-lg bg-[#0a7a42] text-white text-xs font-bold hover:bg-[#086335] inline-flex items-center gap-1"
            >
              <Square className="w-3 h-3 fill-white" />
              <span>Send</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={sendChat} className="flex items-center border-t border-[#ddd] bg-white">
          <input
            id="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={transcribing}
            className="flex-1 min-w-0 border-none px-3 py-2.5 text-sm outline-none text-slate-900 placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={startVoiceRecording}
            disabled={sending || transcribing}
            title="Talk with voice"
            aria-label="Talk with voice"
            className="bg-[#0a7a42]/10 text-[#0a7a42] hover:bg-[#0a7a42] hover:text-white px-2.5 py-2.5 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50 shrink-0 transition-colors"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Talk</span>
          </button>
          <button
            type="submit"
            disabled={sending || transcribing || !input.trim()}
            aria-label="Send chat message"
            className="bg-[#0a7a42] text-white border-none px-3 py-2.5 text-xs sm:text-sm font-semibold cursor-pointer hover:bg-[#086335] disabled:opacity-60 inline-flex items-center gap-1 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      )}
    </div>
  );
};
