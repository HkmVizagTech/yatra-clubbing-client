import type { Registration, StudentStatus } from './types';

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
  const cols: (keyof Registration)[] = [
    'created_at', 'ref', 'name', 'phone', 'email',
    'pass_type', 'qty_general', 'qty_student', 'total',
    'payment_status', 'payment_id', 'student_status',
  ];
  const head = cols.join(',');
  const body = registrations.map(x =>
    cols.map(c => '"' + String(x[c] ?? '').replace(/"/g, '""') + '"').join(',')
  ).join('\n');
  const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'yatra-registrations.csv';
  a.click();
}
