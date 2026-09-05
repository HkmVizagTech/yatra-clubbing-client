export interface PublicTicketTier {
  key: string;
  name: string;
  price: number;
  was: number | null;
  maxQty: number;
  description: string;
  tag?: string;
  requiresStudentId?: boolean;
  features: string[];
}

export interface PublicHighlight {
  image: string;
  title: string;
  caption: string;
}

export interface PublicEvent {
  code: string;
  slug?: string;
  name: string;
  tagline: string;
  org: string;
  ageLimit?: string;
  locations?: string[];
  description: string;
  venue: string;
  timing?: string;
  transport?: string;
  highlights?: PublicHighlight[];
  benefits?: string[];
  dates: { display: string; start?: string; end?: string };
  timeline: { time: string; title: string; description: string }[];
  tickets: PublicTicketTier[];
  branding: {
    heroDesktop?: string;
    heroMobile?: string;
    themeColor?: string;
    showCountdown?: boolean;
    mantra?: string;
  };
  /** Booking ref prefix for this event, e.g. "YJ-". */
  receiptPrefix?: string;
  status: string;
}

/** Slimmer shape returned by /api/public/events for the home page chooser. */
export interface PublicEventCard {
  code: string;
  name: string;
  tagline: string;
  org: string;
  venue: string;
  ageLimit?: string;
  locations?: string[];
  dates: { display: string; start?: string; end?: string };
  priceFrom: number | null;
  ticketCount: number;
  branding: {
    heroDesktop?: string;
    heroMobile?: string;
    themeColor?: string;
  };
  status: string;
}
