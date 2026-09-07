'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/*
 * Themed dropdown picker.
 *
 * Native <select> popups are drawn by the browser (default blue highlight and
 * all) and cannot be styled, so every picker in the app — the booking form's
 * gender / year-of-study, the admin filters, the reject-reason and event-status
 * selects, and the per-row gender cells — goes through this component instead.
 * The closed control reuses the navy/gold language of the site's inputs, and
 * the open menu is a custom listbox in the same palette.
 *
 * The menu is portaled to <body> and positioned with fixed coordinates so it
 * never gets clipped by an `overflow` ancestor (the booking modal and the
 * admin tables both clip). It closes on outside click, Escape, scroll or
 * resize.
 */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Shown when `value` matches no option. Defaults to "Choose…". */
  placeholder?: string;
  /** Leading icon (used by the booking form's gender / year-of-study fields). */
  icon?: ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
  /** Extra classes for the root wrapper — e.g. `w-auto` for inline filters. */
  className?: string;
  /** "sm" is the compact per-row variant (admin registration gender cells). */
  size?: 'md' | 'sm';
  /** "gold" tints an empty value gold (the "Set…" affordance); "muted" softens
      an already-set value into the background of a dense table. */
  tone?: 'neutral' | 'gold' | 'muted';
  /** Align the menu to the start (left) or end (right) edge of the control. */
  align?: 'start' | 'end';
}

// useLayoutEffect warns on the server, and the menu only ever opens in the
// browser, so falling back to useEffect for the server pass is harmless.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const ChevronIcon = () => (
  <svg viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 1.5 6 6.5 11 1.5" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m2.5 8.5 3.5 3.5 7.5-8" />
  </svg>
);

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Choose…',
  icon,
  disabled = false,
  ariaLabel,
  title,
  className = '',
  size = 'md',
  tone = 'neutral',
  align = 'start',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const [activeIdx, setActiveIdx] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  const selectedIdx = options.findIndex(o => o.value === value);
  const shown = selectedIdx >= 0 ? options[selectedIdx] : null;

  const close = useCallback(() => setOpen(false), []);

  const pick = useCallback(
    (o: SelectOption) => {
      if (o.disabled) return;
      onChange(o.value);
      setOpen(false);
    },
    [onChange]
  );

  // Position the (portaled) menu under the control, flipping above it when
  // there is no room below, and nudging it back on-screen horizontally.
  useIsoLayoutEffect(() => {
    if (!open) return;
    const trg = triggerRef.current;
    const panel = panelRef.current;
    if (!trg || !panel) return;

    const r = trg.getBoundingClientRect();
    const gap = 6;
    const panelW = panel.offsetWidth;
    const panelH = panel.offsetHeight;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const up = panelH + gap > spaceBelow && spaceAbove > spaceBelow;

    let left = align === 'end' ? r.right - panelW : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8));

    setPos({
      top: up ? Math.max(8, r.top - gap - panelH) : r.bottom + gap,
      left,
      minWidth: r.width,
    });
  }, [open, align]);

  // Close on outside click, Escape, and whenever the page scrolls/resizes (the
  // menu is fixed-positioned, so it must not stay glued to a moved trigger).
  // Scrolling inside the menu itself is fine.
  useEffect(() => {
    if (!open) return;

    function isInMenu(t: EventTarget | null): boolean {
      return t instanceof Node && !!panelRef.current && panelRef.current.contains(t);
    }
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || isInMenu(e.target)) return;
      close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    function onMove(e: Event) {
      if (isInMenu(e.target)) return;
      close();
    }
    function onResize() {
      close();
    }

    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('touchstart', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('touchstart', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  // Keep the highlighted option in view when the keyboard moves it.
  useIsoLayoutEffect(() => {
    if (!open || activeIdx < 0) return;
    const el = panelRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIdx]);

  function openMenu(preferIdx: number) {
    setActiveIdx(preferIdx >= 0 ? preferIdx : 0);
    setOpen(true);
  }

  function nextEnabled(from: number, dir: 1 | -1): number {
    const n = options.length;
    if (n === 0) return -1;
    let i = from;
    for (let step = 0; step < n; step++) {
      i = (i + dir + n) % n;
      if (!options[i].disabled) return i;
    }
    return from;
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu(selectedIdx);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx(i => nextEnabled(i >= 0 ? i : selectedIdx >= 0 ? selectedIdx : -1, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx(i => nextEnabled(i >= 0 ? i : selectedIdx >= 0 ? selectedIdx : 0, -1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIdx >= 0 && activeIdx < options.length && !options[activeIdx].disabled) {
          pick(options[activeIdx]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  }

  const listId = `${uid.replace(/[:]/g, '')}-list`;

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={`yatra-select-trigger${icon ? ' has-icon' : ''}${size === 'sm' ? ' ys-sm' : ''}${
        tone === 'gold' ? ' ys-tone-gold' : tone === 'muted' ? ' ys-tone-muted' : ''
      }`}
      onClick={() => (open ? close() : openMenu(selectedIdx))}
      onKeyDown={onTriggerKeyDown}
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-activedescendant={open && activeIdx >= 0 ? `${listId}-o-${activeIdx}` : undefined}
      aria-label={ariaLabel}
      title={title}
    >
      {icon && (
        <span className="ys-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={`ys-value${shown ? '' : ' is-placeholder'}`}>
        {shown ? shown.label : placeholder}
      </span>
      <span className="ys-chevron" aria-hidden="true">
        <ChevronIcon />
      </span>
    </button>
  );

  const menu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            className={`yatra-select-panel${size === 'sm' ? ' ys-sm' : ''}`}
            style={pos ? { top: pos.top, left: pos.left, minWidth: pos.minWidth } : { visibility: 'hidden' }}
            role="listbox"
            id={listId}
          >
            {options.map((o, i) => (
              <div
                key={o.value}
                data-idx={i}
                id={`${listId}-o-${i}`}
                role="option"
                aria-selected={i === selectedIdx}
                aria-disabled={o.disabled || undefined}
                className={`yatra-select-opt${i === selectedIdx ? ' ys-selected' : ''}${
                  i === activeIdx ? ' ys-active' : ''
                }${o.disabled ? ' ys-disabled' : ''}`}
                onMouseEnter={() => {
                  if (!o.disabled) setActiveIdx(i);
                }}
                onMouseDown={e => {
                  e.preventDefault();
                  pick(o);
                }}
              >
                <span>{o.label}</span>
                <span className="ys-check" aria-hidden="true">
                  <CheckIcon />
                </span>
              </div>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={`yatra-select${className ? ` ${className}` : ''}`}
      data-open={open || undefined}
    >
      {trigger}
      {menu}
    </div>
  );
}
