'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminFetch } from '@/lib/api';
import EventForm from '../EventForm';
import type { Event } from '@/lib/eventTypes';

export default function EditEventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const r = await adminFetch(`/api/events/${encodeURIComponent(slug)}`);
        if (!r.ok) throw new Error('Not found');
        const d = await r.json() as { event: Event };
        setEvent(d.event);
        setStatus('ok');
      } catch {
        setStatus('error');
      }
    })();
  }, [slug]);

  if (status === 'loading') {
    return <div className="flex items-center justify-center h-96 text-bark-light text-sm">Loading event…</div>;
  }
  if (status === 'error' || !event) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-3">Could not load this event.</p>
        <a href="/admin/events" className="btn-ghost text-sm">← Back to events</a>
      </div>
    );
  }

  return <EventForm mode="edit" slug={slug} initial={event} />;
}
