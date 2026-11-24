import { Phone, Mail, MapPin, ArrowUpRight } from 'lucide-react';
import YatraLogo from './YatraLogo';
import { ORG, SOCIALS } from '@/lib/site';

/** The closing footer of a trip page: who we are, how to reach us, where to find us. */
export default function TripFooter({ org }: { org?: string }) {
  return (
    <footer className="yt-foot">
      <div className="yt-foot-wrap">
        <div className="yt-foot-brand">
          <YatraLogo org={org} />
          <p>Temple trails, seva and kirtan. One-day yatras from Hare Krishna Vaikuntham, Visakhapatnam.</p>
          <div className="yt-foot-soc">
            {SOCIALS.map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a>
            ))}
          </div>
        </div>

        <div className="yt-foot-col">
          <h3>Talk to us</h3>
          <a className="yt-foot-row" href={ORG.phoneHref}>
            <span className="ic"><Phone size={17} /></span>
            <span><small>Call or WhatsApp</small><b>{ORG.phone}</b></span>
          </a>
          <a className="yt-foot-row" href={ORG.emailHref}>
            <span className="ic"><Mail size={17} /></span>
            <span><small>Email</small><b>{ORG.email}</b></span>
          </a>
        </div>

        <div className="yt-foot-col">
          <h3>Find us</h3>
          <div className="yt-foot-row static">
            <span className="ic"><MapPin size={17} /></span>
            <span>
              <small>Hare Krishna Vaikuntham</small>
              <b>{ORG.addressLines.slice(1).join(' ')}</b>
            </span>
          </div>
          <a className="yt-foot-dir" href={ORG.directions} target="_blank" rel="noopener noreferrer">
            Get directions <ArrowUpRight size={16} />
          </a>
        </div>
      </div>

      <div className="yt-foot-base">
        <span>© {new Date().getFullYear()} {org || 'Hare Krishna Movement'} · Visakhapatnam</span>
        <span>Hare Krishna 🙏</span>
      </div>
    </footer>
  );
}
