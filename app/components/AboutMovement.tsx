import { Music2, BookOpen, Utensils, Heart } from 'lucide-react';
import Reveal from './Reveal';

const PILLARS = [
  { icon: <Music2 />, title: 'Kirtan', text: 'Chanting the holy names together, the heart of every gathering.' },
  { icon: <BookOpen />, title: 'Wisdom', text: 'Timeless lessons from the Bhagavad-gita, made simple and practical.' },
  { icon: <Utensils />, title: 'Prasadam', text: 'Wholesome vegetarian food offered to Krishna and shared with all.' },
  { icon: <Heart />, title: 'Seva', text: 'Joyful service, the way to a life of purpose and gratitude.' },
];

/** Who we are: the Hare Krishna Movement and the teachings of Srila Prabhupada. */
export default function AboutMovement() {
  return (
    <section className="yt-sec yt-about-mv" id="who-we-are">
      <div className="yt-wrap">
        <Reveal>
          <div className="yt-mv-head">
            <span className="yt-eyebrow">Who we are</span>
            <h2>Hare Krishna Movement</h2>
            <p>
              The Hare Krishna Movement was founded in 1966 by His Divine Grace A.C. Bhaktivedanta Swami Srila Prabhupada,
              who carried the teachings of the Bhagavad-gita and the Srimad-Bhagavatam to the whole world. His message is
              simple: live simply, think deeply, chant the holy names and share what you have with everyone.
            </p>
            <p>
              Yatra Clubbing brings young people together for one-day journeys to sacred places in that same spirit,
              with good company, joyful kirtan, thoughtful talks and prasadam for all.
            </p>
          </div>
        </Reveal>
        <div className="yt-mv-row">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 80} className="yt-mv-item">
              <span className="ic" aria-hidden="true">{p.icon}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
