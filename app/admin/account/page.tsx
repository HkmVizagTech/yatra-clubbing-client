'use client';

import { useState, FormEvent } from 'react';
import { adminFetch, type AdminUser } from '@/lib/api';
import { useAdmin } from '../AdminContext';

export default function AccountPage() {
  const { user, replaceSession, signOut } = useAdmin();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== again) { setMsg({ ok: false, text: 'The new passwords do not match.' }); return; }
    setSaving(true);
    try {
      const r = await adminFetch('/api/admin/auth/change-password', { method: 'POST', body: JSON.stringify({ current, next }) });
      const d = await r.json() as { token?: string; user?: AdminUser; error?: string };
      if (!r.ok || !d.token || !d.user) throw new Error(d.error || `Server error ${r.status}`);
      replaceSession(d.token, d.user);
      setCurrent(''); setNext(''); setAgain('');
      setMsg({ ok: true, text: 'Password changed. Your other sessions have been signed out.' });
    } catch (e2) {
      setMsg({ ok: false, text: (e2 as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">My account</h1>
          <p className="page-subtitle">{user.name} · {user.roleLabel}</p>
        </div>
      </div>

      <div className="panel space-y-1">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Signed in as</div>
        <div className="text-stone-900 font-semibold break-all">{user.email}</div>
      </div>

      <form onSubmit={submit} className="panel space-y-3">
        <h2 className="panel-title">Change password</h2>
        <div><label className="label">Current password</label><input className="input" type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required /></div>
        <div><label className="label">New password</label><input className="input" type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} required placeholder="10+ characters, letters and numbers" /></div>
        <div><label className="label">Repeat new password</label><input className="input" type="password" autoComplete="new-password" value={again} onChange={e => setAgain(e.target.value)} required /></div>
        {msg && <p role="alert" className={`text-sm font-medium ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
        <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Change password'}</button>
      </form>

      <button onClick={signOut} className="btn-ghost text-sm">Sign out</button>
    </div>
  );
}
