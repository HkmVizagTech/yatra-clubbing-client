import type { Registration, StudentStatus, WhatsAppStatus } from './types';

export function inr(n: number | null | undefined): string {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

export function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return s;
  }
}

export function fmtShortDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch {
    return s;
  }
}

/** 'male' → 'Male'. Older bookings taken before the field existed have none. */
export function genderLabel(g: string | null | undefined): string {
  const v = String(g || '').trim().toLowerCase();
  if (v === 'male') return 'Male';
  if (v === 'female') return 'Female';
  return '';
}

export function getStudentStatus(r: Registration): StudentStatus {
  if (r.qty_student <= 0) return 'none';
  const s = r.student_status || '';
  if (s === 'verified') return 'verified';
  if (s.startsWith('rejected')) return 'rejected';
  return 'pending';
}

export function getRejectionReason(r: Registration): string {
  return (r.student_status || '').replace(/^rejected\s*—?\s*/i, '');
}

/**
 * WhatsApp delivery state of the confirmation message.
 *
 *   none      — no confirmation was sent (or no message id recorded)
 *   sent      — handed to Gupshup; no delivery callback yet
 *   delivered — reached the devotee's WhatsApp
 *   read      — the devotee opened it (also delivered)
 *   failed    — Gupshup reported a failure
 */
export function getWhatsappStatus(r: Registration): WhatsAppStatus {
  const s = (r.whatsapp_status || '').toLowerCase();
  if (s === 'delivered' || s === 'read' || s === 'failed') return s as WhatsAppStatus;
  if (r.whatsapp_message_id || r.whatsapp_sent_at) return 'sent';
  return 'none';
}

/**
 * A booking is "confirmed" only when the message actually reached the devotee.
 * "failed" is the one outcome that unambiguously did NOT get there.
 */
export function isWhatsappConfirmed(r: Registration): boolean {
  const s = getWhatsappStatus(r);
  return s === 'delivered' || s === 'read';
}

export function buildChartData(registrations: Registration[]) {
  const map = new Map<string, { count: number; revenue: number }>();
  registrations.forEach(r => {
    const date = r.created_at.slice(0, 10);
    const prev = map.get(date) || { count: 0, revenue: 0 };
    map.set(date, {
      count: prev.count + 1,
      revenue: prev.revenue + (r.payment_status === 'paid' ? (r.total || 0) : 0),
    });
  });
  const result: { date: string; count: number; revenue: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const data = map.get(key) || { count: 0, revenue: 0 };
    result.push({ date: key.slice(5).replace('-', '/'), ...data });
  }
  return result;
}

export function downloadCSV(registrations: Registration[]) {
  const cols: string[] = [
    'created_at', 'ref', 'name', 'age', 'gender', 'phone', 'email',
    'college', 'course', 'year_of_study',
    'pass_type', 'total',
    'payment_status', 'payment_id', 'student_status',
    'whatsapp_status', 'whatsapp_message_id',
    'whatsapp_sent_at', 'whatsapp_delivered_at', 'whatsapp_read_at', 'whatsapp_failed_at',
    'whatsapp_failure_reason',
  ];
  const head = cols.join(',');
  const body = registrations.map(x =>
    cols.map(c => '"' + String((x as unknown as Record<string, unknown>)[c] ?? '').replace(/"/g, '""') + '"').join(',')
  ).join('\n');
  const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'yatra-registrations.csv';
  a.click();
}
