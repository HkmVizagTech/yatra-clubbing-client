'use client';

import type { ReactNode } from 'react';
import { useReveal } from './useReveal';

/**
 * Fades/slides its children in as they scroll into view. Wraps a single group
 * in a div. Use the `delay` prop to stagger cards that sit next to each other.
 */
export default function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li';
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      className={`reveal${visible ? ' is-in' : ''}${className ? ` ${className}` : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
