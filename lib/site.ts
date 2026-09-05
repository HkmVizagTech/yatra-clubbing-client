/**
 * Organisation details shared with the main site at harekrishnavizag.org.
 *
 * Yatra Clubbing runs on a subdomain, so its header and footer should carry the
 * same contact details, daily schedule and navigation as the parent site. They
 * live here rather than being scattered through components, so there is one
 * place to correct when the temple's details change.
 *
 * Values taken from harekrishnavizag.org.
 */

export const MAIN_SITE = 'https://harekrishnavizag.org';

export const ORG = {
  name: 'Hare Krishna Movement',
  city: 'Visakhapatnam',
  phone: '+91 89777 61187',
  phoneHref: 'tel:+918977761187',
  email: 'social@hkmvizag.org',
  emailHref: 'mailto:social@hkmvizag.org',
  addressLines: [
    'Chaitanya Bhavan,',
    'Hare Krishna Vaikuntham Cultural Centre,',
    'IIM Rd, opp. Akshaya Patra Foundation, Gambhiram,',
    'Visakhapatnam, Andhra Pradesh 531163',
  ],
  directions: 'https://maps.app.goo.gl/Yg2imkSEDxuY5u2K9?g_st=aw',
};

/** Mirrors the parent site's main navigation, so the subdomain feels continuous. */
export const NAV = [
  { label: 'Home', href: MAIN_SITE },
  { label: 'About', href: `${MAIN_SITE}/about` },
  { label: 'Temple', href: `${MAIN_SITE}/temple` },
  { label: 'Seva', href: `${MAIN_SITE}/seva` },
  { label: 'Yatras', href: '/', local: true },
];

export const DAILY_SCHEDULE = [
  ['Mangala Aarti', '4:30 AM'],
  ['Shringar Aarti', '7:30 AM'],
  ['Bhagavatam Class', '8:15 AM'],
  ['Rajbhog Aarti', '12:00 PM'],
  ['Dhoop Aarti', '4:30 PM'],
  ['Sandhya Aarti', '7:00 PM'],
  ['Shayan Aarti', '8:15 PM'],
];

export const SOCIALS = [
  { label: 'WhatsApp Channel', href: 'https://whatsapp.com/channel/0029VaZDEG67T8bWHjibTy2u' },
  { label: 'Instagram', href: 'https://www.instagram.com/harekrishnavizag/' },
  { label: 'YouTube', href: 'https://www.youtube.com/user/harekrishnavizag' },
  { label: 'Facebook', href: 'https://www.facebook.com/hkm.vizag/' },
];

export const APPS = [
  { label: 'Google Play', href: 'https://play.google.com/store/apps/details?id=in.harekrishnavizag' },
  { label: 'App Store', href: 'https://apps.apple.com/in/app/vaikuntham/id6774589633' },
];

export const LEGAL = [
  { label: 'Privacy Policy', href: `${MAIN_SITE}/privacy-policy` },
  { label: 'Terms', href: `${MAIN_SITE}/terms` },
  { label: 'Refunds', href: `${MAIN_SITE}/refunds` },
];
