'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminFetch } from '@/lib/api';
import EventForm from '../EventForm';
import type { Event } from '@/lib/eventTypes';

// ?from=CODE prefills the form from an existing event — the usual case for a
// yatra that runs again. Everything is copied except the identity: a duplicate
// needs its own code and its own dates, and starts as a draft.
function stripIdentity(e: Event): Event {
  return {
    ...e,
    _id: undefined,
    code: '',
    slug: undefined,
    status: 'draft',
    dates: { display: '', start: undefined, end: undefined },
  };
}

function NewEventInner() {
  const from = useSearchParams().get('from');
  const [initial, setInitial] = useState<Event | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>(from ? 'loading' : 'idle');

  useEffect(() => {
    if (!from) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await adminFetch(`/api/events/${encodeURIComponent(from)}`);
        if (!r.ok) throw new Error('Not found');
        const d = await r.json() as { event: Event };
        if (cancelled) return;
        setInitial(stripIdentity(d.event));
        setState('idle');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [from]);

  if (state === 'loading') {
    return <div className="flex items-center justify-center h-96 text-stone-500 text-sm">Copying event…</div>;
  }

  return (
    <>
      {from && state === 'error' && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-4">
          Could not load “{from}” to copy from — starting with a blank event instead.
        </div>
      )}
      {initial && (
        <div className="rounded-xl bg-stone-100 border border-stone-200 px-4 py-3 text-sm text-stone-600 mb-4">
          Copied from <strong>{initial.name}</strong>. Give it a new code and date — everything else came across.
        </div>
      )}
      <EventForm mode="new" initial={initial || undefined} />
    </>
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96 text-stone-500 text-sm">Loading…</div>}>
      <NewEventInner />
    </Suspense>
  );
}
