export type EventStatus = 'draft' | 'active' | 'closed' | 'cancelled';

export interface EventTimelineItem {
  time: string;
  title: string;
  description: string;
}

export interface EventTicketTier {
  key: string;
  name: string;
  price: number;
  was: number | null;
  maxQty: number;
  description: string;
  tag?: string;
  requiresStudentId?: boolean;
  features?: string[];
}

export interface EventBranding {
  heroDesktop?: string;
  heroMobile?: string;
  themeColor?: string;
  showCountdown?: boolean;
  mantra?: string;
}

export interface EventWhatsAppTemplates {
  booking: string;
  studentApproved: string;
  studentRejected: string;
}

export interface EventPaymentConfig {
  receiptPrefix: string;
  whatsapp: EventWhatsAppTemplates;
}

export interface EventDates {
  display: string;
  start?: string;
  end?: string;
}

export interface Event {
  _id?: string;
  code: string;
  slug?: string;
  name: string;
  tagline: string;
  org: string;
  ageLimit?: string;
  locations?: string[];
  description: string;
  venue: string;
  dates: EventDates;
  timeline: EventTimelineItem[];
  tickets: EventTicketTier[];
  branding: EventBranding;
  payments: EventPaymentConfig;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}
