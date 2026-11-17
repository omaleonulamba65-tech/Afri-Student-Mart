import { PolicyPageId } from '../types';

export interface PolicyDocument {
  id: PolicyPageId;
  title: string;
  subtitle: string;
  sections: Array<{ heading: string; points: string[] }>;
}

export const REFUND_POLICY_RULES: Array<{ label: string; text: string }> = [
  {
    label: 'Wrong Item / Damaged Item',
    text: 'If you receive wrong or damaged product, report within 24 hours with photo/video. We will refund 100% or replace it.',
  },
  {
    label: 'Seller Did Not Deliver',
    text: 'If seller does not deliver within 48 hours, you get full refund including delivery fee.',
  },
  {
    label: 'Change of Mind',
    text: 'If you change your mind BEFORE seller ships, you get full product price refund, but delivery fee is NOT refundable.',
  },
  {
    label: 'After Delivery Confirmed',
    text: 'No refund after you press "I Have Received My Order". Please check well before confirming.',
  },
  {
    label: 'How To Request Refund',
    text: 'Go to My Orders > Request Refund > Upload Photo > Explain problem.',
  },
  {
    label: 'Refund Time',
    text: 'Approved refunds are paid back to your bank/card within 3-5 working days through Paystack.',
  },
  {
    label: 'No Refund For',
    text: 'Food that has been opened/eaten, used clothes/underwear, and products damaged by buyer.',
  },
];

export const OFFICIAL_SUPPORT_EMAIL = 'afristudentmartsupportjpg@gmail.com';

export const EXACT_SAFETY_MESSAGES = {
  chatSafety: 'Chat for questions only. Pay on this site to stay safe.',
  outsidePaymentWarning: 'Pay only on Afri Mart via Paystack to stay safe.',
  escrowProtection: 'Your money is safe. We hold payment until you receive your product.',
  deliveryPolicy:
    'Nigeria: ₦500 (Same-City) / ₦1,000 (Standard). Ghana: GH₵20. South Africa: R50. Delivery in 24-48 hours; inspect well before confirming.',
  sellerPolicy:
    'Seller must not ask buyer to pay outside Afri Student Mart. If seller asks for direct bank transfer, report them. Seller account will be banned.',
  sellerFeeNote: 'You will receive 93% after Paystack fee.',
  paymentSuccess: 'Payment Successful via Paystack. Owner keeps 7% + Delivery Fee; Seller gets 93%.',
  chatAccountBlocked:
    'For your safety, you cannot share account numbers in chat. Please complete payment on Afri Student Mart to protect your order.',
};

export const POLICY_DOCUMENTS: Record<PolicyPageId, PolicyDocument> = {
  refund: {
    id: 'refund',
    title: 'Afri Student Mart Refund Policy',
    subtitle: 'Escrow-backed buyer protection powered by Paystack',
    sections: [
      {
        heading: 'Afri Student Mart Refund Policy',
        points: REFUND_POLICY_RULES.map((r) => `${r.label}: ${r.text}`),
      },
      {
        heading: 'Escrow Protection Guarantee',
        points: [
          EXACT_SAFETY_MESSAGES.escrowProtection,
          EXACT_SAFETY_MESSAGES.chatSafety,
          `Need help? Email Support: ${OFFICIAL_SUPPORT_EMAIL}`,
        ],
      },
    ],
  },
  delivery: {
    id: 'delivery',
    title: 'Delivery Policy',
    subtitle: 'Fast 24-48 hours campus & market delivery across West & South Africa',
    sections: [
      {
        heading: 'Country Delivery Fees & Inspection Rules',
        points: [
          'Nigeria: ₦500 (Same-City Campus/Market) or ₦1,000 (Standard Inter-Campus).',
          'Ghana: GH₵20 · South Africa: R50 · West Africa CFA zones: transparent delivery fee shown before payment.',
          'Owner keeps 7% commission + Delivery Fee; Seller receives 93% via Paystack Split.',
          'If seller does not deliver within 48 hours, you get full refund including delivery fee.',
          'Always inspect your item carefully before pressing "I Have Received My Order" inside My Orders.',
        ],
      },
    ],
  },
  seller_policy: {
    id: 'seller_policy',
    title: 'Seller Policy',
    subtitle: 'Mandatory rules for every student, trader & service provider on Afri Student Mart',
    sections: [
      {
        heading: 'On-Site Paystack Payment Rule (Zero Bank Account Sharing)',
        points: [
          EXACT_SAFETY_MESSAGES.sellerPolicy,
          EXACT_SAFETY_MESSAGES.chatSafety,
          'Phone numbers and WhatsApp numbers ARE allowed in Buyer-Seller chat for calls & directions, but sharing bank/MoMo account numbers is strictly blocked (3 blocked attempts = 1-hour chat lock).',
        ],
      },
      {
        heading: 'Commission & Paystack Split Payouts',
        points: [
          'Every payment goes through Paystack Split automatically: Owner keeps 7% + Delivery Fee, and Seller gets 93% directly to their Paystack Subaccount.',
          'Paystack transaction fees are deducted proportionally from the total before split.',
          'You will receive 93% after Paystack fee.',
        ],
      },
    ],
  },
  escrow: {
    id: 'escrow',
    title: 'Escrow Protection',
    subtitle: 'How Paystack Split & Buyer Protection keep your money safe on every order',
    sections: [
      {
        heading: 'How Paystack Protection Works on Afri Student Mart',
        points: [
          EXACT_SAFETY_MESSAGES.escrowProtection,
          'Step 1: Pay safely with Paystack on this site (Card, Paystack Transfer, USSD, Mobile Money). Pay only on Afri Mart via Paystack to stay safe.',
          'Step 2: Owner keeps 7% + Delivery Fee, Seller gets 93% via Paystack Split.',
          'Step 3: Delivery arrives in 24-48 hours. Inspect well before pressing "I Have Received My Order".',
          'Step 4: If wrong, damaged, or undelivered within 48 hours, request a refund in My Orders > Request Refund.',
        ],
      },
    ],
  },
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    subtitle: 'Agreement for using Afri Student Mart — Powered by JOKEY PERKY GROUP',
    sections: [
      {
        heading: '1. West & South Africa Student & Market Marketplace',
        points: [
          'Afri Student Mart is an online campus & market platform across Nigeria, West Africa & South Africa operated by JOKEY PERKY GROUP.',
          'By creating an account or buying/selling on this platform, you confirm that you are at least 16 years old and agree to all Escrow, Delivery, Refund, and Seller policies.',
          'Your login phone number serves as your private account ID and is never exposed publicly on listings.',
        ],
      },
      {
        heading: '2. Paystack-Only Payment Rule & Automatic Split',
        points: [
          EXACT_SAFETY_MESSAGES.outsidePaymentWarning,
          'All purchases, delivery fees, seller promotion fees, and ad fees go strictly through Paystack Inline JS on this site.',
          'Owner keeps 7% commission + Delivery Fee; Seller receives 93% after shared Paystack fee.',
        ],
      },
      {
        heading: '3. Honest Pricing & Verified Accounts',
        points: [
          'All item prices must be real and honest in your local market currency. Fake prices (such as 1 or 0 for normal items) are prohibited.',
        ],
      },
    ],
  },
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'How we protect your phone number, profile picture, and chats',
    sections: [
      {
        heading: '1. Private Login Phone Numbers',
        points: [
          'Your phone number is used ONLY to log you in, verify your account, and prevent spam/scam accounts.',
          'Your phone number is NEVER displayed publicly on item cards without your consent.',
          'We NEVER sell, rent, or trade your phone number, profile picture, or personal data to third-party marketers.',
        ],
      },
      {
        heading: '2. Profile Pictures & In-App Chats',
        points: [
          'Your profile picture and name are shown to campus/market members so buyers and sellers recognize who they are trading with.',
          'Phone numbers and WhatsApp numbers may be shared voluntarily inside chat for calls, while bank account numbers are automatically blocked and logged.',
        ],
      },
      {
        heading: '3. Data Removal',
        points: [
          `You may update your profile details or email ${OFFICIAL_SUPPORT_EMAIL} to request account deletion.`,
        ],
      },
    ],
  },
  community: {
    id: 'community',
    title: 'Community & Marketplace Rules',
    subtitle: 'Simple rules that keep West & South Africa campus and market trading honest',
    sections: [
      {
        heading: 'Mandatory Rules for Every Member',
        points: [
          EXACT_SAFETY_MESSAGES.chatSafety,
          EXACT_SAFETY_MESSAGES.sellerPolicy,
          'No scam, no fake price, and no stolen items.',
          'Sellers must upload real photos of the actual item — do NOT upload downloaded internet stock photos.',
          'Sellers must state the true condition: New, Neatly Used, Fairly Used, or Old but Working.',
          '3 Reports on an item automatically removes the item and locks the seller account for Owner review.',
        ],
      },
    ],
  },
  safety: {
    id: 'safety',
    title: 'Campus & Market Safety Tips',
    subtitle: 'How to buy and sell safely across campuses & local markets',
    sections: [
      {
        heading: '1. Always Pay Through Paystack On This Site',
        points: [
          EXACT_SAFETY_MESSAGES.escrowProtection,
          EXACT_SAFETY_MESSAGES.chatSafety,
          EXACT_SAFETY_MESSAGES.sellerPolicy,
        ],
      },
      {
        heading: '2. Inspect Before Confirming Delivery',
        points: [
          EXACT_SAFETY_MESSAGES.deliveryPolicy,
          'For phones and electronics: check battery health, charging port, speaker, camera, screen touch, and serial/IMEI before pressing "I Have Received My Order".',
          'Remember: No refund after you press "I Have Received My Order". Please check well before confirming.',
        ],
      },
      {
        heading: '3. Meet in Open, Busy Campus or Market Spots',
        points: [
          'Prefer daylight campus gates, student union buildings, or busy market plazas during daytime.',
        ],
      },
    ],
  },
  prohibited: {
    id: 'prohibited',
    title: 'Prohibited Items Policy',
    subtitle: 'Items strictly banned on Afri Student Mart',
    sections: [
      {
        heading: 'Zero-Tolerance Banned Items',
        points: [
          'Weapons, firearms, knives, tasers, pepper spray, or ammunition.',
          'Hard drugs, controlled substances, marijuana, codeine, or illegal pharmaceuticals.',
          'Stolen phones, stolen laptops, or goods without proof of ownership.',
          'Fake certificates, forged ID cards, fake receipts, or counterfeit currency.',
          'Exam malpractice materials ("runs", leaked question papers, spy earpieces).',
          'Adult / pornographic content or explicit services.',
          'Ponzi schemes, crypto doubling scams, betting tips, or illegal MLM recruitment.',
        ],
      },
      {
        heading: 'Enforcement',
        points: [
          'Posting any prohibited item results in immediate deletion and permanent account ban.',
        ],
      },
    ],
  },
  cookies: {
    id: 'cookies',
    title: 'Cookie & Google Ads Policy',
    subtitle: 'How sessions and Google Ads cookies work on Afri Student Mart',
    sections: [
      {
        heading: '1. Essential App Storage',
        points: [
          'We use essential browser storage to keep you signed in and remember your selected country, language, and campus.',
        ],
      },
      {
        heading: '2. Google AdSense & Advertising Cookies',
        points: [
          'Afri Student Mart uses Google AdSense only (no other ad network).',
          'Ads appear strictly in the right sidebar on desktop and at the bottom of the page on mobile — never as pop-ups, never on the Checkout page, and never covering Buy or Search buttons.',
          'You can opt out of personalized Google advertising anytime via Google Ad Settings (adssettings.google.com) or your browser cookie controls.',
        ],
      },
    ],
  },
  contact: {
    id: 'contact',
    title: 'Contact Us',
    subtitle: 'Afri Student Mart — Powered by JOKEY PERKY GROUP',
    sections: [
      {
        heading: 'Official Platform Support',
        points: [
          'Company: JOKEY PERKY GROUP',
          'Platform: Afri Student Mart (West & South Africa Marketplace)',
          `Official Support Email: ${OFFICIAL_SUPPORT_EMAIL}`,
          'Hours: Monday – Saturday, 8:00 AM – 6:00 PM WAT',
          `For urgent refund disputes, scam reports, or account help, email ${OFFICIAL_SUPPORT_EMAIL} or use My Orders > Request Refund.`,
        ],
      },
    ],
  },
  report: {
    id: 'report',
    title: 'Report & Block Policy',
    subtitle: 'How community reporting & chat protection guard every buyer and seller',
    sections: [
      {
        heading: 'Automatic Protection Thresholds',
        points: [
          'Every item and chat includes a Report button.',
          EXACT_SAFETY_MESSAGES.sellerPolicy,
          'Sharing bank account numbers in chat is blocked immediately; 3 blocked attempts lock chat for 1 hour and alert Admin.',
          '3 Scam Reports on an item = Item is automatically removed and seller account is automatically locked.',
        ],
      },
      {
        heading: 'Admin Final Review',
        points: [
          `All reports and refund evidence go directly to the Private Owner Dashboard (${OFFICIAL_SUPPORT_EMAIL}).`,
        ],
      },
    ],
  },
};

