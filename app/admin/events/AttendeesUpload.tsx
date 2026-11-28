'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminFetch } from '@/lib/api';

export type Entry = { phone: string; name: string };
/** Held in the form while a NEW trip is being created; saved right after it exists. */
export type PendingList = { entries: Entry[]; files: string[] };

type Summary = { count: number; numbers: number; uploadedAt: string | null; sources: string[] };
type MergeResult = { added: number; updated: number; duplicates: number; invalid: number; total?: number };

/* ───────── reading the spreadsheet ───────── */

const isPhoneHeader = (s: string) => /(mobile|phone|whatsapp|contact|cell|number)/i.test(s);
const isNameHeader = (s: string) => /(^|\b)(name|student|candidate|person|devotee)(\b|$)/i.test(s) && !isPhoneHeader(s);
const looksLikeName = (s: string) => {
  const t = s.trim();
  if (t.length < 2 || t.includes('@')) return false;
  const letters = (t.match(/[A-Za-z\u0C00-\u0C7F\u0900-\u097F]/g) || []).length;
  return letters >= 2 && letters >= t.replace(/\s/g, '').length / 2;
};

type Parsed = { entries: Entry[] };

/**
 * Every number in the file with the name on the same row (when there is one).
 * Every row that has a mobile number is kept (the sheet should list only the
 * people you want on the list).
 */
async function readEntries(file: File): Promise<Parsed> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const out: Entry[] = [];

  for (const sheet of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], { header: 1, raw: false, defval: '' }) as unknown[][];

    // A header row, if there is one, tells us which columns hold the name, number and attendance.
    let phoneCol = -1;
    let nameCol = -1;
    let first = 0;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const cells = rows[i].map(c => String(c ?? ''));
      const p = cells.findIndex(isPhoneHeader);
      const n = cells.findIndex(isNameHeader);
      if (p >= 0 || n >= 0) {
        phoneCol = p; nameCol = n;
        first = i + 1;
        break;
      }
    }

    for (let r = first; r < rows.length; r++) {
      const row = rows[r].map(c => String(c ?? ''));
      const phoneCells = phoneCol >= 0 ? [row[phoneCol] ?? ''] : row;
      let name = nameCol >= 0 ? (row[nameCol] ?? '').trim() : '';
      if (!name && nameCol < 0) name = (row.find(c => looksLikeName(c)) || '').trim();

      const numbers: string[] = [];
      for (const cell of phoneCells) {
        // a cell may hold several numbers ("98765… / 91234…"), so split first
        for (const part of cell.split(/[/,;|\n]+/)) {
          const digits = part.replace(/\D/g, '');
          if (digits.length >= 10 && digits.length <= 13) numbers.push(digits);
        }
      }
      if (numbers.length === 0) continue;

      for (const phone of numbers) out.push({ phone, name });
    }
  }
  return { entries: out };
}

/* Same person = same number AND same name (case / spacing / punctuation ignored). */
const nameKey = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const phone10 = (s: string) => s.replace(/\D/g, '').slice(-10);

/** Browser-side version of the server's merge, for the list held while a new trip is created. */
function mergeLocal(existing: Entry[], incoming: Entry[]): { merged: Entry[]; added: number; duplicates: number; invalid: number } {
  const byPhone = new Map<string, Map<string, Entry>>();
  for (const e of existing) {
    const m = byPhone.get(e.phone) || new Map<string, Entry>();
    m.set(nameKey(e.name), e);
    byPhone.set(e.phone, m);
  }
  let added = 0, duplicates = 0, invalid = 0;
  for (const e of incoming) {
    const phone = phone10(e.phone);
    if (!/^[6-9]\d{9}$/.test(phone)) { invalid++; continue; }
    const nk = nameKey(e.name);
    const m = byPhone.get(phone) || new Map<string, Entry>();
    byPhone.set(phone, m);
    if (m.has(nk)) { duplicates++; continue; }
    if (!nk && m.size > 0) { duplicates++; continue; }
    if (nk && m.has('')) { m.delete(''); }   // the number gains a name (not a new person)
    m.set(nk, { phone, name: e.name.trim() });
    added++;
  }
  const merged: Entry[] = [];
  byPhone.forEach(m => m.forEach(v => merged.push(v)));
  return { merged, added, duplicates, invalid };
}

function downloadSample() {
  const csv = 'Name,Mobile\nAsha Reddy,9876543210\nRavi Kumar,9123456780\nMeena,9000000012\n';
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'excel-sheet-sample.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const SheetIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M8 13h8M8 17h8M11 10v10" />
  </svg>
);

const resultLine = (r: MergeResult) => {
  const bits = [`${r.added.toLocaleString('en-IN')} added`];
  if (r.updated) bits.push(`${r.updated} names filled in`);
  if (r.duplicates) bits.push(`${r.duplicates.toLocaleString('en-IN')} already on the list`);
  if (r.invalid) bits.push(`${r.invalid.toLocaleString('en-IN')} unusable`);
  return bits.join(' · ');
};

type Row = { id: string; name: string; phone: string; source: string };

/** Every person on the list, one by one: search, remove one, add one. */
function ListViewer({
  eventKey, pending, onPending, onChanged, busy, setMsg,
}: {
  eventKey?: string;
  pending: PendingList | null;
  onPending: (p: PendingList | null) => void;
  onChanged: () => void;
  busy: boolean;
  setMsg: (m: { ok: boolean; text: string } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: Row[]; total: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(false);
  const [paste, setPaste] = useState('');
  const base = eventKey ? `/api/events/${encodeURIComponent(eventKey)}/attendees` : '';

  const fetchPage = useCallback(async () => {
    if (!eventKey || !open) return;
    setLoading(true);
    try {
      const r = await adminFetch(`${base}?list=1&page=${page}&limit=25&q=${encodeURIComponent(q.trim())}`);
      if (r.ok) setData(await r.json());
    } catch { /* keep what we have */ } finally { setLoading(false); }
  }, [eventKey, open, base, page, q]);

  // search-as-you-type, lightly debounced
  useEffect(() => {
    if (!open || !eventKey) return;
    const t = setTimeout(fetchPage, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [fetchPage, open, eventKey, q]);
  useEffect(() => { setPage(1); }, [q]);

  // A trip that is still being created keeps its list in the form, so filter that locally.
  const local = (pending?.entries || []).filter(e => {
    const t = q.trim().toLowerCase();
    return !t || e.name.toLowerCase().includes(t) || e.phone.includes(t.replace(/\D/g, '') || '\u0000');
  });
  const rows: Row[] = eventKey
    ? (data?.rows || [])
    : local.slice((page - 1) * 25, page * 25).map((e, i) => ({ id: `${e.phone}|${e.name}`, name: e.name, phone: e.phone, source: 'excel' }));
  const total = eventKey ? (data?.total ?? 0) : local.length;
  const pages = eventKey ? (data?.pages ?? 1) : Math.max(Math.ceil(local.length / 25), 1);

  async function remove(r: Row) {
    if (!confirm(`Remove ${r.name || r.phone} from the list?`)) return;
    if (!eventKey) {
      onPending({ entries: (pending?.entries || []).filter(e => `${e.phone}|${e.name}` !== r.id), files: pending?.files || [] });
      return;
    }
    const res = await adminFetch(`${base}/${encodeURIComponent(r.id)}`, { method: 'DELETE' });
    if (res.ok) { await fetchPage(); onChanged(); } else setMsg({ ok: false, text: 'Could not remove that person.' });
  }

  async function addOne() {
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9][0-9]{9}$/.test(digits)) { setMsg({ ok: false, text: 'Enter a valid 10-digit mobile number.' }); return; }
    const entry = { phone: digits, name: name.trim() };
    setAdding(true);
    try {
      if (!eventKey) {
        const m = mergeLocal(pending?.entries || [], [entry]);
        onPending({ entries: m.merged, files: pending?.files || [] });
        setMsg({ ok: true, text: m.added ? 'Added. Saved when you create the trip.' : 'That person is already on the list.' });
      } else {
        const r = await adminFetch(base, { method: 'POST', body: JSON.stringify({ entries: [entry] }) });
        const d = await r.json() as MergeResult & { error?: string };
        if (!r.ok && !(d.duplicates > 0)) { setMsg({ ok: false, text: d.error || 'Could not add.' }); return; }
        setMsg({ ok: true, text: d.added ? 'Added to the list.' : 'That person is already on the list.' });
        await fetchPage(); onChanged();
      }
      setName(''); setPhone('');
    } finally { setAdding(false); }
  }

  /** Many at once: one person per line, "Name, Mobile" or just the mobile number. */
  async function addPasted() {
    const entries: Entry[] = [];
    let invalid = 0;
    for (const line of paste.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      const digits = (t.match(/[0-9][0-9 \-+]{8,}[0-9]/g) || []).map(x => x.replace(/\D/g, '').slice(-10)).find(d => /^[6-9][0-9]{9}$/.test(d));
      if (!digits) { invalid++; continue; }
      const nm = t.replace(/[0-9][0-9 \-+]{8,}[0-9]/g, '').replace(/[,;|\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      entries.push({ phone: digits, name: nm });
    }
    if (entries.length === 0) { setMsg({ ok: false, text: 'No valid 10-digit mobile numbers found in what you pasted.' }); return; }
    setAdding(true);
    try {
      const tail = invalid ? ` · ${invalid} line${invalid === 1 ? '' : 's'} skipped (no valid number)` : '';
      if (!eventKey) {
        const m = mergeLocal(pending?.entries || [], entries);
        onPending({ entries: m.merged, files: pending?.files || [] });
        setMsg({ ok: true, text: `${resultLine({ ...m, updated: 0 })}${tail}. Saved when you create the trip.` });
      } else {
        const r = await adminFetch(base, { method: 'POST', body: JSON.stringify({ entries }) });
        const d = await r.json() as MergeResult & { error?: string };
        if (!r.ok && !(d.duplicates > 0)) { setMsg({ ok: false, text: d.error || 'Could not add.' }); return; }
        setMsg({ ok: true, text: `${resultLine(d)}${tail}.` });
        await fetchPage(); onChanged();
      }
      setPaste('');
    } finally { setAdding(false); }
  }

  return (
    <details className="group rounded-2xl border border-stone-200 bg-white" open={open} onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer select-none list-none flex items-center justify-between gap-3 px-4 py-3">
        <span>
          <span className="block text-sm font-semibold text-stone-800">See the list · add or remove people one by one</span>
          <span className="block text-[12px] text-stone-500">Add a single person, paste several, or remove anyone.</span>
        </span>
        <span className="text-stone-400 transition group-open:rotate-180" aria-hidden="true">▾</span>
      </summary>
      <div className="px-4 pb-4 pt-3 border-t border-stone-100 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOne(); } }}>
          <input className="input" placeholder="Name" value={name} onChange={e => setName(e.target.value)} maxLength={80} />
          <input className="input" placeholder="Mobile number" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value)} maxLength={15} />
          <button type="button" onClick={addOne} className="btn-primary btn-sm" disabled={adding || busy}>{adding ? 'Adding…' : '+ Add person'}</button>
        </div>

        <details className="rounded-xl border border-stone-200 bg-stone-50/60">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-amber-700">Paste many people at once</summary>
          <div className="px-3 pb-3 space-y-2">
            <textarea className="input min-h-[110px] font-mono text-xs" value={paste} onChange={e => setPaste(e.target.value)}
              placeholder={'One person per line\nAsha Reddy, 9876543210\nRavi Kumar 9123456780\n9000000012'} />
            <button type="button" className="btn-primary btn-sm" onClick={addPasted} disabled={adding || busy || !paste.trim()}>{adding ? 'Adding…' : 'Add all'}</button>
          </div>
        </details>

        <input className="input" type="search" placeholder="Search by name or number" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} />

        <div className="rounded-xl border border-stone-200 divide-y divide-stone-100 max-h-80 overflow-y-auto" aria-busy={loading}>
          {rows.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-stone-500">{loading ? 'Loading…' : q ? 'No one matches that.' : 'Nobody on the list yet.'}</div>
          )}
          {rows.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-stone-800 truncate">{r.name || <span className="text-stone-400 font-normal">No name</span>}</div>
                <div className="text-xs text-stone-500">+91 {r.phone}</div>
              </div>
              <span className="hidden sm:inline text-[11px] rounded-full bg-stone-100 text-stone-600 px-2 py-0.5">{r.source === 'vanabhojanam' ? 'Vanabhojanam' : 'Excel'}</span>
              <button type="button" onClick={() => remove(r)} disabled={busy} aria-label={`Remove ${r.name || r.phone}`} className="shrink-0 w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50">✕</button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>{total.toLocaleString('en-IN')} {total === 1 ? 'person' : 'people'}{q ? ' match' : ''}</span>
          <span className="flex items-center gap-2">
            <button type="button" className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(p - 1, 1))}>← Prev</button>
            <span>Page {page} of {pages}</span>
            <button type="button" className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </span>
        </div>
      </div>
    </details>
  );
}

/**
 * The returning-attendee list for a trip. It is LIVE and cumulative:
 *   • Add from Excel — as many times as you like; each upload ADDS to the list.
 *   • Sync from Vanabhojanam — pulls who attended straight from its API; also ADDS.
 * Two rows are the same person only when the number AND the name match.
 *
 * `eventKey` set → the trip exists, changes are saved immediately.
 * `eventKey` unset → creating a trip: changes are held in `pending` and saved
 * (and the sync run, if ticked) right after the trip is created.
 */
export default function AttendeesUpload({
  eventKey,
  pending,
  onPending,
  syncAfterCreate,
  onSyncAfterCreate,
  autoSync,
  onAutoSync,
  lastSync,
}: {
  eventKey?: string;
  pending: PendingList | null;
  onPending: (p: PendingList | null) => void;
  syncAfterCreate: boolean;
  onSyncAfterCreate: (v: boolean) => void;
  autoSync: boolean;
  onAutoSync: (v: boolean) => void;
  lastSync?: { lastSyncAt?: string; lastSyncAdded?: number; lastSyncTotal?: number; lastSyncError?: string };
}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState<'' | 'file' | 'sync' | 'clear'>('');
  const [over, setOver] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!eventKey) return;
    try {
      const r = await adminFetch(`/api/events/${encodeURIComponent(eventKey)}/attendees`);
      if (r.ok) setSummary(await r.json());
    } catch { /* leave unknown */ }
  }, [eventKey]);
  useEffect(() => { load(); }, [load]);

  async function onFile(file?: File | null) {
    if (!file) return;
    setBusy('file');
    setMsg(null);
    try {
      const { entries: incoming } = await readEntries(file);
      if (incoming.length === 0) {
        setMsg({
          ok: false,
          text: 'No mobile numbers found in that file. It needs a column of 10-digit numbers (and, ideally, a Name column).',
        });
        return;
      }
      if (!eventKey) {
        const m = mergeLocal(pending?.entries || [], incoming);
        onPending({ entries: m.merged, files: [...(pending?.files || []), file.name] });
        setMsg({ ok: true, text: `${resultLine({ ...m, updated: 0 })} · ${m.merged.length.toLocaleString('en-IN')} in total. Saved when you create the trip.` });
        return;
      }
      const r = await adminFetch(`/api/events/${encodeURIComponent(eventKey)}/attendees`, {
        method: 'POST',
        body: JSON.stringify({ entries: incoming }),
      });
      const d = await r.json() as MergeResult & { error?: string };
      if (!r.ok) setMsg({ ok: false, text: d.error || 'Upload failed.' });
      else { setMsg({ ok: true, text: `${resultLine(d)} · ${(d.total ?? 0).toLocaleString('en-IN')} in total.` }); await load(); }
    } catch {
      setMsg({ ok: false, text: 'Could not read that file. Use .xlsx, .xls or .csv.' });
    } finally {
      setBusy('');
      if (input.current) input.current.value = '';
    }
  }

  async function sync(who: 'attended' | 'paid' = 'attended') {
    if (!eventKey) return;
    setBusy('sync');
    setMsg(null);
    try {
      const r = await adminFetch(`/api/events/${encodeURIComponent(eventKey)}/attendees/sync`, { method: 'POST', body: JSON.stringify({ who }) });
      const d = await r.json() as MergeResult & { error?: string };
      if (!r.ok) setMsg({ ok: false, text: d.error || 'Sync failed.' });
      else { setMsg({ ok: true, text: `${who === 'paid' ? 'From Vanabhojanam (everyone who paid)' : 'From Vanabhojanam (attended)'}: ${resultLine(d)} · ${(d.total ?? 0).toLocaleString('en-IN')} in total.` }); await load(); }
    } catch {
      setMsg({ ok: false, text: 'Could not reach the server.' });
    } finally {
      setBusy('');
    }
  }

  async function clearAll() {
    if (!confirm('Remove EVERYONE from this list? People will then pay the regular price and need an ID.')) return;
    if (!eventKey) { onPending(null); setMsg(null); return; }
    setBusy('clear');
    try {
      await adminFetch(`/api/events/${encodeURIComponent(eventKey)}/attendees`, { method: 'DELETE' });
      setMsg({ ok: true, text: 'List cleared.' });
      await load();
    } finally {
      setBusy('');
    }
  }

  const people = eventKey ? (summary?.count || 0) : (pending?.entries.length || 0);
  const numbers = eventKey ? (summary?.numbers || 0) : new Set((pending?.entries || []).map(e => e.phone)).size;
  const has = people > 0;
  const sources = eventKey ? (summary?.sources || []) : ((pending?.files.length ? ['excel'] : []));
  const when = eventKey && summary?.uploadedAt
    ? new Date(summary.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-stone-800">Excel sheet list</div>
        <button type="button" onClick={downloadSample} className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline">
          Download sample sheet
        </button>
      </div>

      {/* what is on the list right now */}
      <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3.5 ${has ? 'border-emerald-200 bg-emerald-50/70' : 'border-stone-200 bg-white'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${has ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'}`}><SheetIcon /></div>
        <div className="min-w-[9rem] flex-1">
          {has ? (
            <>
              <div className="font-bold text-emerald-900">{people.toLocaleString('en-IN')} {people === 1 ? 'person' : 'people'}</div>
              <div className="text-xs text-emerald-800/80">
                {numbers.toLocaleString('en-IN')} mobile numbers
                {sources.length > 0 && <> · from {sources.map(s => (s === 'vanabhojanam' ? 'Vanabhojanam' : 'Excel')).join(' + ')}</>}
                {when && <> · last added {when}</>}
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold text-stone-700">Nobody on the list yet</div>
              <div className="text-xs text-stone-500">Add an Excel below, or sync from Vanabhojanam.</div>
            </>
          )}
        </div>
        {has && (
          <button type="button" className="btn-ghost btn-sm text-red-600 hover:bg-red-50 w-full sm:w-auto" onClick={clearAll} disabled={busy !== ''}>Remove all</button>
        )}
      </div>

      <ListViewer eventKey={eventKey} pending={pending} onPending={onPending} onChanged={load} busy={busy !== ''} setMsg={setMsg} />

      <label
        className={`flex flex-col items-center justify-center text-center gap-1 rounded-2xl border-2 border-dashed px-4 py-7 cursor-pointer transition ${
          over ? 'border-amber-500 bg-amber-50' : 'border-stone-300 bg-white hover:border-amber-400 hover:bg-amber-50/40'
        } ${busy !== '' ? 'opacity-60 pointer-events-none' : ''}`}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); }}
      >
        <span className="text-amber-600"><SheetIcon /></span>
        <span className="text-sm font-semibold text-stone-800">{busy === 'file' ? 'Reading your file…' : has ? 'Add more from Excel' : 'Add from Excel'}</span>
        <span className="text-xs text-stone-500">Drop a file or click · .xlsx .xls .csv<br />Name + Mobile</span>
        <input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
      </label>


      {/* Optional extra: pull from Vanabhojanam */}
      <details className="group rounded-2xl border border-stone-200 bg-white" open={!!eventKey}>
        <summary className="cursor-pointer select-none list-none flex items-center justify-between gap-3 px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-stone-800">Sync from Vanabhojanam</span>
            <span className="block text-[12px] text-stone-500">Adds everyone Vanabhojanam has marked as attended. Optional if you upload a sheet.</span>
          </span>
          <span className="text-stone-400 transition group-open:rotate-180" aria-hidden="true">▾</span>
        </summary>
        <div className="px-4 pb-4 pt-3 border-t border-stone-100 space-y-3">
          <p className="text-xs text-stone-500 leading-relaxed">
            Adds everyone Vanabhojanam has marked as attended (name + number). Anything you uploaded stays.
          </p>
      {eventKey ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" onClick={() => sync('attended')} disabled={busy !== ''} className="btn-primary btn-sm disabled:opacity-60">
            {busy === 'sync' ? 'Syncing…' : '↻ Sync attendees'}
          </button>
          <button type="button" onClick={() => sync('paid')} disabled={busy !== ''} className="text-xs font-semibold text-amber-700 hover:underline disabled:opacity-60">
            or everyone who paid
          </button>
        </div>
      ) : (
        <label className="mt-3 flex items-start gap-2 text-xs text-stone-700 cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={syncAfterCreate} onChange={e => onSyncAfterCreate(e.target.checked)} />
          <span>Pull the Vanabhojanam attendees automatically when I create the trip</span>
        </label>
      )}
          <label className="flex items-start gap-2 text-xs text-stone-700 cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={autoSync} onChange={e => onAutoSync(e.target.checked)} />
            <span>
              <strong>Check Vanabhojanam every 10 minutes</strong> and add new attendees automatically. Off by default.
            {lastSync?.lastSyncAt && (
              <div className={`text-[11px] mt-1 ${lastSync.lastSyncError ? 'text-red-600' : 'text-stone-500'}`}>
                Last checked {new Date(lastSync.lastSyncAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                {lastSync.lastSyncError ? ` — failed: ${lastSync.lastSyncError}` : ` — ${lastSync.lastSyncAdded ?? 0} added, ${(lastSync.lastSyncTotal ?? 0).toLocaleString('en-IN')} on the list`}
              </div>
            )}
            </span>
          </label>
        </div>
      </details>

      {msg && <p role="status" className={`text-xs font-medium ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}

      <ul className="text-[11px] leading-relaxed text-stone-500 list-disc pl-4 space-y-0.5">
        <li>Everyone in the sheet is added, so list only the people you want on it. A <strong>Name</strong> and a <strong>Mobile</strong> column is all it needs.</li>
        <li>Every upload or sync <strong>adds</strong> to the list. Nobody is removed by an upload. Remove people one by one in the list above, or use “Remove all”.</li>
        <li>The same person is only counted once: a row is a duplicate when the <strong>number and the name</strong> both match. Same number with a different name is kept.</li>
        <li>On the booking form, anyone whose mobile number is on this list automatically gets the special price, and skips the student ID if you switched that on. Only names and numbers are stored.</li>
      </ul>
    </div>
  );
}
