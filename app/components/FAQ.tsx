'use client';

import { useState } from 'react';

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * Accessible accordion for the FAQ section. Buttons control disclosure with the
 * correct aria-* roles, so it works with a keyboard and screen readers.
 */
export default function FAQ({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  if (!items.length) return null;

  return (
    <div className="faq-list">
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `faq-panel-${i}`;
        const btnId = `faq-btn-${i}`;
        return (
          <div className={`faq-item${isOpen ? ' is-open' : ''}`} key={i}>
            <h3 className="faq-q">
              <button
                id={btnId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="faq-btn"
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span>{item.q}</span>
                <span className="faq-chev" aria-hidden="true">+</span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              className="faq-a-wrap"
              style={{ maxHeight: isOpen ? 320 : 0 }}
            >
              <div className="faq-a">{item.a}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
