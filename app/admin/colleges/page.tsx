'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/lib/api';

interface College {
  _id: string;
  name: string;
  short?: string;
  createdAt?: string;
}

export default function CollegesPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [short, setShort] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await adminFetch('/api/admin/colleges');
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const d = await r.json() as { colleges: College[] };
      setColleges(d.colleges || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setSaving(true);
    setMessage(null);
    try {
      const r = await adminFetch('/api/admin/colleges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean, short: short.trim() }),
      });
      const d = await r.json() as { college?: College; error?: string };
      if (d.college) {
        setColleges(prev => [...prev, d.college!].sort((a, b) => a.name.localeCompare(b.name)));
        setName('');
        setShort('');
        setMessage({ type: 'ok', text: 'College added.' });
      } else {
        setMessage({ type: 'err', text: d.error || 'Could not add that college.' });
      }
    } catch (err) {
      setMessage({ type: 'err', text: String(err) });
    } finally {
      setSaving(false);
    }
  }

  const remove = useCallback(async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the college list? Registrations already made are kept as recorded.`)) return;
    setRemoving(id);
    setMessage(null);
    try {
      const r = await adminFetch(`/api/admin/colleges/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const d = await r.json() as { deleted?: boolean; error?: string };
      if (d.deleted) {
        setColleges(prev => prev.filter(c => c._id !== id));
        setMessage({ type: 'ok', text: 'College removed.' });
      } else {
        setMessage({ type: 'err', text: d.error || 'Could not remove that college.' });
      }
    } catch (err) {
      setMessage({ type: 'err', text: String(err) });
    } finally {
      setRemoving(null);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Colleges</h1>
          <p className="page-subtitle">
            The global list of colleges shown as a picker when students register. Add the colleges whose students
            attend your yatras.
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-sm">↻ Refresh</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
        {/* Add form */}
        <form onSubmit={add} className="panel space-y-3">
          <h2 className="panel-title">Add a college</h2>
          <div>
            <label className="label">College name *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Andhra University" autoFocus />
          </div>
          <div>
            <label className="label">Short name (optional)</label>
            <input className="input" value={short} onChange={e => setShort(e.target.value)} placeholder="e.g. AU" />
            <p className="text-[11px] text-stone-400 mt-1">Not shown publicly — kept for reference.</p>
          </div>
          <button type="submit" disabled={saving || !name.trim()} className="btn-primary w-full text-sm">
            {saving ? 'Adding…' : '＋ Add college'}
          </button>
          {message && (
            <p className={`text-xs font-medium ${message.type === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}
        </form>

        {/* List */}
        <div className="panel">
          <div className="flex items-center justify-between mb-3">
            <h2 className="panel-title">{colleges.length} college{colleges.length === 1 ? '' : 's'}</h2>
          </div>

          {loading ? (
            <p className="text-stone-400 text-sm py-8 text-center">Loading colleges…</p>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 text-sm mb-2">{error}</p>
              <button onClick={load} className="btn-ghost text-sm">Retry</button>
            </div>
          ) : colleges.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3 text-xl">🎓</div>
              <p className="text-stone-500 text-sm">No colleges yet. Add the first one to the left.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {colleges.map(c => (
                <li key={c._id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="font-medium text-stone-900 text-sm truncate">{c.name}</div>
                    {c.short && <div className="text-[11px] text-stone-400">{c.short}</div>}
                  </div>
                  <button
                    onClick={() => remove(c._id, c.name)}
                    disabled={removing === c._id}
                    className="icon-btn text-red-500 hover:bg-red-50"
                    title="Remove college"
                    aria-label={`Remove ${c.name}`}
                  >
                    {removing === c._id ? '…' : '🗑'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
