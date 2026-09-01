'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/lib/api';
import type { Event, EventStatus } from '@/lib/eventTypes';

export type EventRow = Event & { registration_count: number };

export function useEvents() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminFetch('/api/events');
      if (!r.ok) return;
      const d = await r.json() as { events: EventRow[] };
      setEvents(d.events || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { events, loading, reload: load };
}

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  closed: 'Closed',
  cancelled: 'Cancelled',
};
