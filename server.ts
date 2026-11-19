import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import {
  OWNER_PHONE,
  addRating,
  addServiceReview,
  advertiseService,
  blockOrReportUserById,
  boostItem,
  confirmOrderDelivery,
  containsProhibitedContactInfo,
  createEscrowOrder,
  createItem,
  createOffer,
  createService,
  createServiceBooking,
  createUser,
  createWantAlert,
  deleteItemAsSellerOrOwner,
  deleteWantAlert,
  ensureOwnerSeededInSupabase,
  featureMyShop,
  getAdSettings,
  getItemById,
  getOrSyncUserFromSupabaseJwt,
  getOwnerDashboardData,
  getSupabaseHealth,
  getThreadMessages,
  getUserByPhone,
  getWishlist,
  hasConfirmedOrderForItem,
  isAuthorizedOwnerName,
  isAuthorizedOwnerPassword,
  isUserBlocked,
  listActiveItems,
  listOffersForUser,
  listOrdersForUser,
  listRatings,
  listServices,
  listThreadsForUser,
  listTraderShops,
  listUserBookings,
  listWantAlerts,
  markOrderShipped,
  normalizePhone,
  ownerResolveOrderRefund,
  ownerResolveReport,
  ownerToggleBlockUser,
  ownerToggleFeatureItem,
  provisionSellerPaystackSubaccount,
  reportItem,
  requestOrderRefund,
  respondToOffer,
  sendMessage,
  signSessionToken,
  toPublicUser,
  toggleWishlist,
  updateAdSettings,
  updateMyShop,
  updateUserProfile,
  verifyPassword,
  verifySessionToken,
  type DbUser,
} from './server/db.ts';
import { type AccountBadge, ITEM_CONDITIONS, type ItemCondition, type ItemFilterMode } from './src/types.ts';

interface AuthedRequest extends Request {
  authUser?: DbUser;
}

const sseClients = new Map<string, Set<Response>>();

function broadcastToUser(phone: string, event: string, payload: unknown) {
  const set = sseClients.get(normalizePhone(phone));
  if (!set) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    try {
      res.write(msg);
    } catch {
      // Ignore closed streams
    }
  }
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const queryToken = typeof req.query.token === 'string' ? req.query.token : '';
  const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : queryToken;
  const phone = verifySessionToken(rawToken);
  const user = phone
    ? await getUserByPhone(phone)
    : await getOrSyncUserFromSupabaseJwt(rawToken);
  if (!user) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }
  if (isUserBlocked(user.phone_number)) {
    res.status(403).json({
      error:
        'Your account has been suspended due to policy reports or Owner action. Contact afristudentmartsupportjpg@gmail.com.',
    });
    return;
  }
  req.authUser = user;
  next();
}

function requireOwner(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.authUser || req.authUser.phone_number !== OWNER_PHONE) {
    res.status(403).json({ error: 'Private Owner Dashboard: Access denied.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', async (_req: Request, res: Response) => {
    const health = await getSupabaseHealth();
    res.json(health);
  });

  app.get('/ads.txt', async (_req: Request, res: Response) => {
    const settings = await getAdSettings().catch(() => null);
    const pub = (settings?.publisher_id || 'pub-0000000000000000').replace(/^ca-/, '');
    res.type('text/plain').send(`google.com, ${pub || 'pub-0000000000000000'}, DIRECT, f08c47fec0942fa0\n`);
  });

  const resolveOrigin = (req: Request) => {
    const configured = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
    if (configured) return configured;
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    const host = String(req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000').split(',')[0].trim();
    return `${proto}://${host}`;
  };

  app.get('/robots.txt', (req: Request, res: Response) => {
    const origin = resolveOrigin(req);
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /owner-dashboard\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`
    );
  });

  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const origin = resolveOrigin(req);
    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${origin}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${origin}/?tab=markets`, changefreq: 'daily', priority: '0.9' },
      { loc: `${origin}/?tab=services`, changefreq: 'daily', priority: '0.9' },
      { loc: `${origin}/?tab=shop`, changefreq: 'daily', priority: '0.8' },
      { loc: `${origin}/?tab=post`, changefreq: 'weekly', priority: '0.7' },
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      )
      .join('\n')}\n</urlset>\n`;
    res.type('application/xml').send(xml);
  });

  // === AUTH ===
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    try {
      const {
        full_name,
        phone_number,
        country_code,
        password,
        account_type,
        role,
        institution,
        level,
        school_id_photo,
        id_doc_type,
        id_doc_number,
        business_reg_type,
        business_reg_number,
        secondary_reg_number,
        shop_name,
        market,
        shop_doc_photo,
        service_category,
        price_from,
        work_photos,
        state,
        campus,
        profile_pic,
        agreed_policies,
        payout_bank_name,
        payout_account_number,
        payout_account_name,
        country,
        language,
      } = req.body;

      if (!agreed_policies) {
        res.status(400).json({ error: 'You must tick "I agree to Policies" before signing up.' });
        return;
      }
      const badgeType: AccountBadge =
        account_type === 'trader' || account_type === 'service_provider' ? account_type : 'student';

      if (!full_name || !phone_number || !password) {
        res.status(400).json({ error: 'Please complete Full Name, Phone Number, and Password.' });
        return;
      }
      const normPhone = normalizePhone(String(phone_number));
      if (isAuthorizedOwnerName(String(full_name)) || normPhone === OWNER_PHONE) {
        res.status(403).json({ error: 'This reserved Owner name or phone number cannot be registered.' });
        return;
      }
      if (badgeType === 'student' && (!institution || !campus)) {
        res.status(400).json({ error: 'Students must choose their School Name and Campus / Hostel.' });
        return;
      }
      if (badgeType === 'trader' && (!shop_name || !market)) {
        res.status(400).json({ error: 'Traders must enter Shop Name and Market.' });
        return;
      }
      if (badgeType === 'service_provider' && (!service_category || !campus)) {
        res.status(400).json({ error: 'Service Providers must choose Service Category and Location.' });
        return;
      }
      if (
        (badgeType === 'trader' || badgeType === 'service_provider') &&
        (!String(id_doc_number || '').trim() || !String(business_reg_number || '').trim())
      ) {
        res.status(400).json({
          error:
            'Please provide both your National ID Number and Business Registration Number for your selected country.',
        });
        return;
      }
      const isSellerAccount =
        role === 'seller' || badgeType === 'trader' || badgeType === 'service_provider';
      if (isSellerAccount && (!payout_bank_name || !payout_account_number)) {
        res.status(400).json({
          error: 'Enter your Bank Account for Paystack Payouts so you can receive your 93% split automatically.',
        });
        return;
      }

      if (normPhone.length < 7 || normPhone.length > 15) {
        res.status(400).json({ error: 'Enter a valid phone number (7–15 digits).' });
        return;
      }
      if (String(password).length < 4) {
        res.status(400).json({ error: 'Password must be at least 4 characters.' });
        return;
      }

      const user = await createUser({
        full_name,
        phone_number: normPhone,
        country_code: country_code || '+234',
        country: country ? String(country) : undefined,
        language: language ? String(language) : undefined,
        password,
        account_type: badgeType,
        role: role === 'seller' ? 'seller' : 'buyer',
        institution: institution || market || campus || 'Campus Area',
        level,
        school_id_photo,
        id_doc_type: id_doc_type ? String(id_doc_type) : undefined,
        id_doc_number: id_doc_number ? String(id_doc_number).trim() : undefined,
        business_reg_type: business_reg_type ? String(business_reg_type) : undefined,
        business_reg_number: business_reg_number ? String(business_reg_number).trim() : undefined,
        secondary_reg_number: secondary_reg_number ? String(secondary_reg_number).trim() : undefined,
        shop_name,
        market,
        shop_doc_photo,
        service_category,
        price_from: price_from ? Number(price_from) : undefined,
        work_photos: Array.isArray(work_photos) ? work_photos : [],
        state: state || 'Abuja FCT',
        campus: campus || market || institution || 'Main Campus',
        profile_pic,
        payout_bank_name: payout_bank_name ? String(payout_bank_name) : undefined,
        payout_account_number: payout_account_number ? String(payout_account_number) : undefined,
        payout_account_name: payout_account_name ? String(payout_account_name) : undefined,
      });

      const token = signSessionToken(user.phone_number);
      res.json({ token, user: toPublicUser(user, true) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Signup failed.' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { phone_number, password, full_name } = req.body;
      if (!phone_number || !password) {
        res.status(400).json({ error: 'Enter both phone number and password.' });
        return;
      }
      const normPhone = normalizePhone(String(phone_number));
      const trimmedName = String(full_name || '').trim();
      const rawPassword = String(password);

      if (normPhone === OWNER_PHONE || isAuthorizedOwnerName(trimmedName)) {
        if (normPhone !== OWNER_PHONE || !isAuthorizedOwnerName(trimmedName)) {
          res.status(401).json({ error: 'Wrong Owner details' });
          return;
        }
        const ownerUser = await getUserByPhone(OWNER_PHONE);
        if (!ownerUser || !isAuthorizedOwnerPassword(rawPassword, ownerUser.password)) {
          res.status(401).json({ error: 'Wrong Owner details' });
          return;
        }
        const token = signSessionToken(ownerUser.phone_number);
        res.json({ token, user: toPublicUser(ownerUser, true) });
        return;
      }

      const user = await getUserByPhone(normPhone);
      if (!user || !verifyPassword(rawPassword, user.password)) {
        res.status(401).json({ error: 'Incorrect phone number or password.' });
        return;
      }
      if (isUserBlocked(user.phone_number)) {
        res.status(403).json({
          error: 'Account suspended. Contact afristudentmartsupportjpg@gmail.com for review.',
        });
        return;
      }
      const token = signSessionToken(user.phone_number);
      res.json({ token, user: toPublicUser(user, true) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Login failed.' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
    res.json({ user: toPublicUser(req.authUser!, true) });
  });

  app.patch('/api/auth/profile', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const updated = await updateUserProfile(req.authUser!.phone_number, req.body);
      res.json({ user: toPublicUser(updated, true) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not update profile.' });
    }
  });

  app.post('/api/seller/subaccount', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const { bank_name, account_number, account_name } = req.body;
      if (!bank_name || !account_number) {
        res.status(400).json({ error: 'Enter your Bank Name and Account Number for Paystack Payouts.' });
        return;
      }
      const subaccount = await provisionSellerPaystackSubaccount({
        phone: req.authUser!.phone_number,
        business_name: req.authUser!.full_name,
        bank_name: String(bank_name),
        account_number: String(account_number),
        account_name: String(account_name || req.authUser!.full_name),
      });
      res.json({ subaccount, user: toPublicUser(req.authUser!, true) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not save Paystack subaccount.' });
    }
  });

  // === ITEMS (FAST PAGINATED + LITE THUMBNAIL MODE + NEAR ME / HOT DEALS SORT) ===
  app.get('/api/items', async (req: Request, res: Response) => {
    try {
      const lite = req.query.lite === '1' || req.query.lite === 'true';
      const rawFilterMode = typeof req.query.filterMode === 'string' ? req.query.filterMode : 'all';
      const validModes: ItemFilterMode[] = ['all', 'students', 'traders', 'my_school', 'my_market', 'within_2km'];
      const filterMode: ItemFilterMode = validModes.includes(rawFilterMode as ItemFilterMode)
        ? (rawFilterMode as ItemFilterMode)
        : 'all';
      const sort = req.query.sort === 'cheapest' ? 'cheapest' : 'latest';

      let reqUserPublic = null;
      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        const phone = verifySessionToken(authHeader.slice(7));
        if (phone) {
          const u = await getUserByPhone(phone);
          if (u) reqUserPublic = toPublicUser(u, false);
        }
      }

      const all = await listActiveItems({
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        condition: typeof req.query.condition === 'string' ? req.query.condition : undefined,
        institution: typeof req.query.institution === 'string' ? req.query.institution : undefined,
        market: typeof req.query.market === 'string' ? req.query.market : undefined,
        state: typeof req.query.state === 'string' ? req.query.state : undefined,
        country: typeof req.query.country === 'string' ? req.query.country : undefined,
        sellerId: typeof req.query.sellerId === 'string' ? req.query.sellerId : undefined,
        filterMode,
        sort,
        requesterInstitution:
          (typeof req.query.myInstitution === 'string' ? req.query.myInstitution : undefined) ||
          reqUserPublic?.institution,
        requesterCampus: reqUserPublic?.campus,
        requesterMarket: reqUserPublic?.market,
        lite,
      });

      const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
      const limit = req.query.limit ? Math.max(1, Math.min(50, Number(req.query.limit))) : all.length || 10;
      const start = (page - 1) * limit;
      const paged = req.query.page || req.query.limit ? all.slice(start, start + limit) : all;

      res.json({
        items: paged,
        total: all.length,
        page,
        has_more: start + paged.length < all.length,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load items.' });
    }
  });

  app.get('/api/items/:id', async (req: Request, res: Response) => {
    try {
      const item = await getItemById(String(req.params.id));
      if (!item) {
        res.status(404).json({ error: 'Item not found.' });
        return;
      }
      res.json({ item });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load product.' });
    }
  });

  app.post('/api/items', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const {
        title,
        category,
        price,
        condition,
        description,
        photos,
        thumbnails,
        video_url,
        make_offer,
        pay_on_delivery,
        institution,
        location,
        country,
      } = req.body;
      if (!title || !category || !price || !condition || !description || !location) {
        res.status(400).json({ error: 'Please fill in all required item details.' });
        return;
      }
      const numPrice = Number(price);
      if (!Number.isFinite(numPrice) || numPrice <= 0) {
        res.status(400).json({ error: 'Enter a valid item price.' });
        return;
      }
      if (!ITEM_CONDITIONS.includes(condition as ItemCondition)) {
        res.status(400).json({ error: 'Please select a valid item condition.' });
        return;
      }
      if (!Array.isArray(photos) || photos.length === 0) {
        res.status(400).json({ error: 'Upload at least 1 real photo of your item (compressed <=200KB).' });
        return;
      }
      if (!video_url || typeof video_url !== 'string') {
        res.status(400).json({
          error: 'Live Video is required (max 720p, max 10 seconds, max 5MB) so buyers can verify your item.',
        });
        return;
      }
      if (containsProhibitedContactInfo(`${title} ${description}`)) {
        res.status(400).json({
          error:
            'For your safety, do not put bank account numbers in item titles or descriptions. Complete all payments on Afri Student Mart.',
        });
        return;
      }

      const { item: created, alert_notifications } = await createItem({
        title,
        category,
        price: numPrice,
        condition,
        description,
        photos,
        thumbnails: Array.isArray(thumbnails) ? thumbnails : undefined,
        video_url,
        make_offer: make_offer !== false,
        pay_on_delivery: pay_on_delivery !== false,
        seller_phone: req.authUser!.phone_number,
        institution: institution || req.authUser!.institution,
        location,
        country:
          typeof country === 'string' && country.trim()
            ? country.trim()
            : toPublicUser(req.authUser!, false).country,
      });

      // Notify any buyers whose "I Want This / Price Drop Alert" matched this listing
      for (const n of alert_notifications) {
        broadcastToUser(n.user_phone, 'want_alert_match', n.match);
      }

      res.status(201).json({ item: created });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to publish item.' });
    }
  });

  app.post('/api/items/:id/boost', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const paystackRef =
        typeof req.body?.paystack_reference === 'string' ? req.body.paystack_reference : undefined;
      const isBoosted = await boostItem(
        String(req.params.id),
        req.authUser!.phone_number,
        paystackRef
      );
      res.json({ ok: true, is_boosted: isBoosted });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to boost item.' });
    }
  });

  app.delete('/api/items/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await deleteItemAsSellerOrOwner(String(req.params.id), req.authUser!.phone_number);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete item.' });
    }
  });

  app.post('/api/items/:id/report', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const result = await reportItem(
        String(req.params.id),
        req.authUser!.phone_number,
        String(req.body?.reason || '')
      );
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to report item.' });
    }
  });

  app.post('/api/users/:id/block', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const result = await blockOrReportUserById(
        String(req.params.id),
        req.authUser!.phone_number,
        String(req.body?.reason || '')
      );
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to block user.' });
    }
  });

  // === WISHLIST, OFFERS, RATINGS ===
  app.get('/api/wishlist', requireAuth, (req: AuthedRequest, res: Response) => {
    res.json({ item_ids: getWishlist(req.authUser!.phone_number) });
  });

  app.post('/api/wishlist/:itemId', requireAuth, async (req: AuthedRequest, res: Response) => {
    const itemIds = await toggleWishlist(req.authUser!.phone_number, String(req.params.itemId));
    res.json({ item_ids: itemIds });
  });

  app.get('/api/offers', requireAuth, (req: AuthedRequest, res: Response) => {
    const itemId = typeof req.query.itemId === 'string' ? req.query.itemId : undefined;
    res.json({ offers: listOffersForUser(req.authUser!.phone_number, itemId) });
  });

  app.post('/api/offers', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const { item_id, offered_price } = req.body;
      if (!item_id || !Number(offered_price)) {
        res.status(400).json({ error: 'Enter a valid offer price.' });
        return;
      }
      const offer = await createOffer({
        item_id: String(item_id),
        buyer_phone: req.authUser!.phone_number,
        offered_price: Number(offered_price),
      });
      res.status(201).json({ offer });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save offer.' });
    }
  });

  app.post('/api/offers/:id/respond', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const action = req.body?.action;
      if (action !== 'accept' && action !== 'reject' && action !== 'counter') {
        res.status(400).json({ error: 'Invalid offer action.' });
        return;
      }
      const result = await respondToOffer({
        offer_id: String(req.params.id),
        actor_phone: req.authUser!.phone_number,
        action,
        counter_price: req.body?.counter_price ? Number(req.body.counter_price) : undefined,
      });

      // Also drop the offer status update right into the in-app chat thread
      const partnerId =
        req.authUser!.phone_number === result.seller_phone ? result.offer.buyer_id : result.offer.seller_id;
      await sendMessage({
        item_id: result.offer.item_id,
        sender_phone: req.authUser!.phone_number,
        partner_id: partnerId,
        message: result.chat_note,
      }).catch(() => {});

      broadcastToUser(result.recipient_phone, 'new_message', {
        item_id: result.offer.item_id,
        sender_name: req.authUser!.full_name,
        message: result.chat_note,
        created_at: new Date().toISOString(),
      });

      res.json({ offer: result.offer });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not update offer.' });
    }
  });

  app.get('/api/ratings', (req: Request, res: Response) => {
    const rawType = req.query.target_type;
    const targetType = rawType === 'service' || rawType === 'shop' ? rawType : 'seller';
    const targetId = typeof req.query.target_id === 'string' ? req.query.target_id : '';
    const itemId = typeof req.query.item_id === 'string' ? req.query.item_id : undefined;
    if (!targetId) {
      res.status(400).json({ error: 'target_id is required.' });
      return;
    }
    const authHeader = req.headers.authorization || '';
    const phone = authHeader.startsWith('Bearer ')
      ? verifySessionToken(authHeader.slice(7))
      : null;
    const hasConfirmedOrder = phone
      ? hasConfirmedOrderForItem(phone, itemId, targetId)
      : false;
    res.json({
      ...listRatings(targetType, targetId),
      has_confirmed_order: hasConfirmedOrder,
    });
  });

  app.post('/api/ratings', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const { target_type, target_id, item_id, score, comment, video_url } = req.body;
      if (!target_id || !score) {
        res.status(400).json({ error: 'Target and rating score are required.' });
        return;
      }
      const rating = await addRating({
        target_type: target_type === 'service' || target_type === 'shop' ? target_type : 'seller',
        target_id: String(target_id),
        item_id: item_id ? String(item_id) : undefined,
        rater_phone: req.authUser!.phone_number,
        score: Number(score),
        comment: String(comment || ''),
        video_url: video_url ? String(video_url) : undefined,
      });
      res.status(201).json({ rating });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save rating.' });
    }
  });

  // === PRICE DROP ALERTS / "I WANT THIS" ===
  app.get('/api/want-alerts', requireAuth, (req: AuthedRequest, res: Response) => {
    res.json({ alerts: listWantAlerts(req.authUser!.phone_number) });
  });

  app.post('/api/want-alerts', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const { keyword, max_price, institution } = req.body;
      const alert = await createWantAlert({
        user_phone: req.authUser!.phone_number,
        keyword: String(keyword || ''),
        max_price: Number(max_price),
        institution: institution ? String(institution) : req.authUser!.institution,
      });
      res.status(201).json({ alert });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create alert.' });
    }
  });

  app.delete('/api/want-alerts/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    deleteWantAlert(req.authUser!.phone_number, String(req.params.id));
    res.json({ ok: true });
  });

  // === SERVICES NEAR YOU ===
  app.get('/api/services', async (req: Request, res: Response) => {
    try {
      const services = await listServices({
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
      });
      res.json({ services });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load services.' });
    }
  });

  app.post('/api/services', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const { title, category, description, price_from, location, work_photos, offerings } = req.body;
      if (!title || !category || !location) {
        res.status(400).json({ error: 'Enter service title, category, and location.' });
        return;
      }
      const service = await createService({
        provider_phone: req.authUser!.phone_number,
        title,
        category,
        description: description || '',
        price_from: Number(price_from || 1000),
        location,
        work_photos: Array.isArray(work_photos) ? work_photos : [],
        offerings: Array.isArray(offerings) ? offerings : [],
      });
      res.status(201).json({ service });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not publish service.' });
    }
  });

  app.post('/api/services/:id/advertise', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const paystackRef =
        typeof req.body?.paystack_reference === 'string' ? req.body.paystack_reference : undefined;
      const advertised = await advertiseService(
        String(req.params.id),
        req.authUser!.phone_number,
        paystackRef
      );
      res.json({ ok: true, is_advertised: advertised });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to advertise service.' });
    }
  });

  app.post('/api/services/:id/reviews', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const { rating, comment } = req.body;
      if (!String(comment || '').trim()) {
        res.status(400).json({ error: 'Please write a short review comment.' });
        return;
      }
      const service = await addServiceReview(
        String(req.params.id),
        req.authUser!.full_name,
        Number(rating || 5),
        String(comment)
      );
      res.json({ service });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to post review.' });
    }
  });

  app.get('/api/bookings', requireAuth, (req: AuthedRequest, res: Response) => {
    res.json({ bookings: listUserBookings(req.authUser!.phone_number) });
  });

  app.post('/api/bookings', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const { service_id, service_name, scheduled_day, location, notes, price, set_7_day_reminder } = req.body;
      if (!service_id || !scheduled_day || !location) {
        res.status(400).json({ error: 'Choose day and pickup/service location.' });
        return;
      }
      const booking = await createServiceBooking({
        service_id: String(service_id),
        service_name: String(service_name || 'Campus Service'),
        customer_phone: req.authUser!.phone_number,
        scheduled_day: String(scheduled_day),
        location: String(location),
        notes: notes ? String(notes) : '',
        price: Number(price || 0),
        set_7_day_reminder: Boolean(set_7_day_reminder),
      });
      res.status(201).json({ booking });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not complete booking.' });
    }
  });

  // === TRADER SHOPS ===
  app.get('/api/shops', async (_req: Request, res: Response) => {
    try {
      const shops = await listTraderShops();
      res.json({ shops });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load shops.' });
    }
  });

  app.put('/api/shops/me', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const { shop_name, market, shop_photo } = req.body;
      if (!shop_name || !market) {
        res.status(400).json({ error: 'Shop Name and Market are required.' });
        return;
      }
      const shop = await updateMyShop(req.authUser!.phone_number, {
        shop_name,
        market,
        shop_photo,
      });
      res.json({ shop });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save shop.' });
    }
  });

  app.post('/api/shops/me/feature', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const paystackRef =
        typeof req.body?.paystack_reference === 'string' ? req.body.paystack_reference : undefined;
      const ok = featureMyShop(req.authUser!.phone_number, paystackRef);
      res.json({ ok, is_featured: ok });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to feature shop.' });
    }
  });

  // === MESSAGES & REAL-TIME STREAM ===
  app.get('/api/messages/stream', requireAuth, (req: AuthedRequest, res: Response) => {
    const phone = req.authUser!.phone_number;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('event: connected\ndata: {"ok":true}\n\n');

    if (!sseClients.has(phone)) {
      sseClients.set(phone, new Set());
    }
    sseClients.get(phone)!.add(res);

    const ping = setInterval(() => {
      try {
        res.write('event: ping\ndata: {}\n\n');
      } catch {
        // Ignore
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(ping);
      sseClients.get(phone)?.delete(res);
    });
  });

  app.get('/api/messages/threads', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const threads = await listThreadsForUser(req.authUser!.phone_number);
      res.json({ threads });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load chats.' });
    }
  });

  app.get('/api/messages/thread/:itemId', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const partnerId = typeof req.query.partnerId === 'string' ? req.query.partnerId : undefined;
      const data = await getThreadMessages(String(req.params.itemId), req.authUser!.phone_number, partnerId);
      res.json({ item: data.item, partner: data.partner, messages: data.messages });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not open chat.' });
    }
  });

  app.post('/api/messages', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const { item_id, partner_id, message } = req.body;
      const result = await sendMessage({
        item_id: String(item_id),
        sender_phone: req.authUser!.phone_number,
        partner_id: partner_id ? String(partner_id) : undefined,
        message: String(message || ''),
      });

      broadcastToUser(result.recipient_phone, 'new_message', {
        item_id: result.saved.item_id,
        sender_name: result.sender_name,
        message: result.saved.message,
        created_at: result.saved.created_at,
      });

      res.status(201).json({
        message: {
          id: result.saved.id,
          item_id: result.saved.item_id,
          sender_is_me: true,
          sender_name: result.sender_name,
          message: result.saved.message,
          read_by_recipient: false,
          created_at: result.saved.created_at,
        },
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to send message.' });
    }
  });

  // === GOOGLE ADSENSE PUBLIC SETTINGS ===
  app.get('/api/ads/settings', async (_req: Request, res: Response) => {
    try {
      const settings = await getAdSettings();
      res.json({ settings });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load ad settings.' });
    }
  });

  // === PRIVATE OWNER DASHBOARD (07089628626 ONLY) ===
  app.get('/api/owner/dashboard', requireAuth, requireOwner, async (_req: AuthedRequest, res: Response) => {
    try {
      const data = await getOwnerDashboardData();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load owner dashboard.' });
    }
  });

  app.post('/api/owner/items/:id/feature', requireAuth, requireOwner, async (req: AuthedRequest, res: Response) => {
    try {
      await ownerToggleFeatureItem(String(req.params.id), Boolean(req.body?.featured));
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update featured state.' });
    }
  });

  app.delete('/api/owner/items/:id', requireAuth, requireOwner, async (req: AuthedRequest, res: Response) => {
    try {
      await deleteItemAsSellerOrOwner(String(req.params.id), OWNER_PHONE);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to remove item.' });
    }
  });

  app.post('/api/owner/users/:phone/block', requireAuth, requireOwner, async (req: AuthedRequest, res: Response) => {
    try {
      await ownerToggleBlockUser(String(req.params.phone), Boolean(req.body?.blocked));
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update user status.' });
    }
  });

  app.post('/api/owner/reports/:id/resolve', requireAuth, requireOwner, async (req: AuthedRequest, res: Response) => {
    try {
      await ownerResolveReport(String(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to resolve report.' });
    }
  });

  // === PAYSTACK ESCROW ORDERS & REFUNDS ===
  app.get('/api/orders', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      res.json(listOrdersForUser(req.authUser!.phone_number));
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load orders.' });
    }
  });

  app.post('/api/orders', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const { item_id, delivery_address, paystack_reference, buyer_email, delivery_tier } = req.body;
      if (!item_id || !paystack_reference) {
        res.status(400).json({ error: 'Item and Paystack payment reference are required.' });
        return;
      }
      const order = await createEscrowOrder({
        item_id: String(item_id),
        buyer_phone: req.authUser!.phone_number,
        buyer_email: buyer_email ? String(buyer_email) : undefined,
        delivery_address: String(delivery_address || req.authUser!.campus || 'Campus Delivery'),
        paystack_reference: String(paystack_reference),
        delivery_tier: delivery_tier === 'same_city' ? 'same_city' : 'standard',
      });
      res.status(201).json({ order });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not record Paystack order.' });
    }
  });

  app.post('/api/orders/:id/ship', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const order = markOrderShipped(String(req.params.id), req.authUser!.phone_number);
      res.json({ order });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not update shipping status.' });
    }
  });

  app.post('/api/orders/:id/confirm', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const order = confirmOrderDelivery(String(req.params.id), req.authUser!.phone_number);
      res.json({ order });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not confirm delivery.' });
    }
  });

  app.post('/api/orders/:id/refund', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const { reason, photo, video, change_of_mind_before_ship } = req.body;
      const order = requestOrderRefund(String(req.params.id), req.authUser!.phone_number, {
        reason: String(reason || ''),
        photo: photo ? String(photo) : undefined,
        video: video ? String(video) : undefined,
        change_of_mind_before_ship: Boolean(change_of_mind_before_ship),
      });
      res.json({ order });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not submit refund request.' });
    }
  });

  app.post('/api/owner/orders/:id/refund', requireAuth, requireOwner, (req: AuthedRequest, res: Response) => {
    try {
      const raw = req.body?.decision;
      const decision =
        raw === 'approve_product_only' || raw === 'reject' ? raw : 'approve_full';
      const order = ownerResolveOrderRefund(String(req.params.id), decision);
      res.json({ order });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to resolve refund.' });
    }
  });

  app.put('/api/owner/ads', requireAuth, requireOwner, async (req: AuthedRequest, res: Response) => {
    try {
      const updated = await updateAdSettings(req.body);
      res.json({ settings: updated });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save AdSense settings.' });
    }
  });

  // === MART AI (SERVER-SIDE GEMINI API) ===
  app.post('/api/mart-ai', async (req: Request, res: Response) => {
    try {
      const { message, institution, history } = req.body as {
        message?: string;
        institution?: string;
        history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      };
      const userMessage = (message || '').trim();
      if (!userMessage) {
        res.status(400).json({ error: 'Please type a question for Mart AI.' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(503).json({ error: 'Mart AI is not configured yet (missing GEMINI_API_KEY).' });
        return;
      }

      // Include live marketplace inventory so Mart AI can find real items in their school
      const activeItems = await listActiveItems();
      const sameSchool = institution
        ? activeItems.filter((i) => i.institution.toLowerCase() === institution.toLowerCase())
        : [];
      const sampleInventory = [...sameSchool, ...activeItems.filter((i) => i.institution !== institution)]
        .slice(0, 18)
        .map(
          (i) =>
            `- "${i.title}" | ₦${i.price.toLocaleString('en-NG')} | ${i.condition} | ${i.category} | ${i.institution} (${i.location})`
        )
        .join('\n');

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `You are "Mart AI", the friendly, helpful Nigerian campus student shopping & selling assistant on "Afri Student Mart — Powered by JOKEY PERKY GROUP".
Speak warmly, clearly, and simply like a smart, trustworthy Nigerian senior student helper (clear English with occasional light relatable campus warmth — never cringe or unprofessional).
Current student school: ${institution || 'Not selected yet'}.

Your 4 main duties:
1. FIND ITEMS IN THEIR SCHOOL: Check the live listings below first and recommend exact matching items in their school (and mention if there are options from other schools).
2. SUGGEST FAIR NAIRA PRICES (₦): Give realistic Nigerian campus student price ranges in Naira (₦) based on condition (New, Neatly Used, Fairly Used, Old but Working). Never quote outside Naira.
3. HELP WRITE ITEM DESCRIPTIONS: Write clean, honest, catchy descriptions that state condition and campus meeting point — NEVER include phone numbers or WhatsApp links in descriptions (rule: chat stays inside the app).
4. CAMPUS SAFETY ADVICE: Remind students to always meet in open campus spots during the day (Faculty, SUB, Main Gate, Library), inspect/test items thoroughly before paying, and pay only via Paystack Escrow on Afri Student Mart. If scammed, report in-app or email afristudentmartsupportjpg@gmail.com.

Live Marketplace Listings right now:
${sampleInventory || 'No listings available yet.'}

Keep answers concise, practical, and easy to read on a small Android phone screen.`;

      const conversationText = Array.isArray(history)
        ? history
            .slice(-6)
            .map((h) => `${h.role === 'user' ? 'Student' : 'Mart AI'}: ${h.text}`)
            .join('\n')
        : '';

      const prompt = conversationText ? `${conversationText}\nStudent: ${userMessage}` : userMessage;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      res.json({ reply: response.text || 'I could not generate a response right now. Please try again!' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Mart AI encountered an error.';
      res.status(500).json({ error: msg });
    }
  });

  // === VITE MIDDLEWARE OR STATIC PROD ===
  const distDir = path.resolve(process.cwd(), 'dist');
  const distIndexPath = path.join(distDir, 'index.html');
  const isDevMode =
    process.env.NODE_ENV === 'development' ||
    process.env.npm_lifecycle_event === 'dev' ||
    process.env.DISABLE_HMR === 'true';
  const useStaticProd =
    process.env.NODE_ENV === 'production' ||
    (!isDevMode && fs.existsSync(distIndexPath));

  if (!useStaticProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' || Boolean(process.env.K_SERVICE) ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      if (fs.existsSync(distIndexPath)) {
        res.sendFile(distIndexPath);
      } else {
        res.status(503).send('Production build missing. Run npm run build.');
      }
    });
  }

  const portArgIndex = process.argv.indexOf('--port');
  const argvPort = portArgIndex >= 0 ? Number.parseInt(process.argv[portArgIndex + 1] ?? '', 10) : NaN;
  const parsedEnvPort = Number.parseInt(process.env.PORT ?? '', 10);
  const PORT =
    Number.isFinite(argvPort) && argvPort > 0
      ? argvPort
      : isDevMode && parsedEnvPort === 8080
      ? 3000
      : Number.isFinite(parsedEnvPort) && parsedEnvPort > 0
      ? parsedEnvPort
      : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Afri Student Mart listening on http://0.0.0.0:${PORT}`);
    void ensureOwnerSeededInSupabase().catch((err) => {
      console.warn('Background Supabase owner seed error:', err instanceof Error ? err.message : err);
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
