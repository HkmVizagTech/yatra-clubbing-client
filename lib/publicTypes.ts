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

export interface PublicEvent {
  code: string;
  slug?: string;
  name: string;
  tagline: string;
  org: string;
  description: string;
  venue: string;
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
  status: string;
}
