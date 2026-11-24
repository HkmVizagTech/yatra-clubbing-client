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
  /** Price for people on the uploaded returning-attendee list (optional). */
  returningPrice?: number | null;
  maxQty: number;
  description: string;
  tag?: string;
  requiresStudentId?: boolean;
  features?: string[];
}

/** One photo highlight from the poster: an image, a title and a short caption. */
export interface EventHighlight {
  image: string;
  title: string;
  caption: string;
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
  /** Free text such as "Early morning · 7 AM to 12 PM". */
  timing?: string;
  /** Free text such as "Transportation facility is available". */
  transport?: string;
  highlights?: EventHighlight[];
  /** "Why join" lines — spiritual learning, new friendships, … */
  benefits?: string[];
  dates: EventDates;
  timeline: EventTimelineItem[];
  tickets: EventTicketTier[];
  branding: EventBranding;
  payments: EventPaymentConfig;
  status: EventStatus;
  /** The trip's date has passed (set by the server). A live trip that ends closes itself. */
  ended?: boolean;
  /** How returning attendees are treated: skipId = they don't need to upload a student ID. */
  returning?: {
    skipId: boolean;
    label: string;
    /** pull new attendees from Vanabhojanam every hour (off unless switched on) */
    autoSync?: boolean;
    lastSyncAt?: string;
    lastSyncAdded?: number;
    lastSyncTotal?: number;
    lastSyncError?: string;
  };
  createdAt: string;
  updatedAt: string;
}
