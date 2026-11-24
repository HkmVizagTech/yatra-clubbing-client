'use client';

import { useCallback, useEffect, useState, FormEvent } from 'react';
import { adminFetch } from '@/lib/api';
import { useAdmin } from '../AdminContext';

type Member = { id: string; name: string; email: string; role: string; active: boolean; createdAt: string | null; lastLoginAt: string | null };
type RoleInfo = { key: string; label: string; description: string };

const ROLE_PILL: Record<string, string> = {
  super_admin: 'pill-violet',
  admin: 'pill-amber',
  verifier: 'pill-green',
  viewer: 'pill-gray',
  devotee: 'pill-gray',
};

function when(s: string | null) {
  if (!s) return 'Never';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function TeamPage() {
  const { user: me } = useAdmin();
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<Member | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminFetch('/api/admin/users');
      const d = await r.json() as { users?: Member[]; roles?: RoleInfo[]; error?: string };
      if (!r.ok) throw new Error(d.error || `Server error ${r.status}`);
      setMembers(d.users || []);
      setRoles(d.roles || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function patch(id: string, body: Record<string, unknown>, done: string) {
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      const r = await adminFetch(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      const d = await r.json() as { user?: Member; error?: string };
      if (!r.ok) throw new Error(d.error || `Server error ${r.status}`);
      setMembers(list => list.map(m => (m.id === id ? d.user! : m)));
      setNotice(done);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusyId(null);
    }
  }

  const roleLabel = (k: string) => roles.find(r => r.key === k)?.label || k;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">{members.length} member{members.length === 1 ? '' : 's'} · access depends on role</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary text-sm">＋ Add member</button>
      </div>

      {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      {/* What each role can do */}
      {roles.length > 0 && (
        <div className="panel">
          <h2 className="panel-title mb-3">Roles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {roles.map(r => (
              <div key={r.key} className="rounded-xl border border-stone-200 p-3">
                <span className={ROLE_PILL[r.key] || 'pill-gray'}>{r.label}</span>
                <p className="text-xs text-stone-500 mt-2 leading-relaxed">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-amber-500 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {members.map(m => {
            const isSelf = m.id === me.id;
            return (
              <div key={m.id} className={`panel !p-4 sm:!p-5 ${m.active ? '' : 'opacity-70'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                    {(m.name || m.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-stone-900 truncate max-w-full">{m.name}</span>
                      {isSelf && <span className="pill-gray">You</span>}
                      {!m.active && <span className="pill-red">Disabled</span>}
                    </div>
                    <div className="text-sm text-stone-500 break-all">{m.email}</div>
                    <div className="text-[11px] text-stone-400 mt-1">Last sign-in: {when(m.lastLoginAt)}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                  <div>
                    <label className="label">Role</label>
                    <select
                      className="select"
                      value={m.role}
                      disabled={isSelf || busyId === m.id}
                      onChange={e => patch(m.id, { role: e.target.value }, `${m.name} is now ${roleLabel(e.target.value)}.`)}
                    >
                      {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button className="btn-ghost btn-sm" disabled={busyId === m.id} onClick={() => setResetFor(m)}>Reset password</button>
                    {!isSelf && (
                      <button
                        className={`btn-ghost btn-sm ${m.active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'}`}
                        disabled={busyId === m.id}
                        onClick={() => {
                          if (m.active && !confirm(`Disable ${m.name}? They will be signed out immediately.`)) return;
                          patch(m.id, { active: !m.active }, m.active ? `${m.name} has been disabled.` : `${m.name} can sign in again.`);
                        }}
                      >
                        {m.active ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <AddMember
          roles={roles}
          onClose={() => setAdding(false)}
          onAdded={m => { setMembers(l => [...l, m]); setNotice(`${m.name} was added. Share their email and password with them.`); setAdding(false); }}
        />
      )}
      {resetFor && (
        <ResetPassword
          member={resetFor}
          onClose={() => setResetFor(null)}
          onReset={async pw => {
            const ok = await patch(resetFor.id, { password: pw }, `Password reset for ${resetFor.name}. They were signed out.`);
            if (ok) setResetFor(null);
          }}
        />
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-extrabold text-stone-900">{title}</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close">✕</button>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

function AddMember({ roles, onClose, onAdded }: { roles: RoleInfo[]; onClose: () => void; onAdded: (m: Member) => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const r = await adminFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(form) });
      const d = await r.json() as { user?: Member; error?: string };
      if (!r.ok || !d.user) throw new Error(d.error || `Server error ${r.status}`);
      onAdded(d.user);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const desc = roles.find(r => r.key === form.role)?.description;
  return (
    <Modal title="Add a team member" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} required autoFocus /></div>
        <div><label className="label">Email</label><input className="input" type="email" inputMode="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
        <div>
          <label className="label">Temporary password</label>
          <input className="input" type="text" autoComplete="off" value={form.password} onChange={e => set('password', e.target.value)} required placeholder="10+ characters, letters and numbers" />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="select" value={form.role} onChange={e => set('role', e.target.value)}>
            {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          {desc && <p className="text-xs text-stone-500 mt-1.5">{desc}</p>}
        </div>
        {err && <p role="alert" className="text-red-600 text-sm font-medium">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Adding…' : 'Add member'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPassword({ member, onClose, onReset }: { member: Member; onClose: () => void; onReset: (pw: string) => Promise<void> }) {
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Modal title={`Reset password · ${member.name}`} onClose={onClose}>
      <form onSubmit={async e => { e.preventDefault(); setSaving(true); await onReset(pw); setSaving(false); }} className="space-y-3">
        <p className="text-sm text-stone-500">They will be signed out everywhere and must use this new password.</p>
        <div>
          <label className="label">New password</label>
          <input className="input" type="text" autoComplete="off" value={pw} onChange={e => setPw(e.target.value)} required autoFocus placeholder="10+ characters, letters and numbers" />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Saving…' : 'Reset password'}</button>
        </div>
      </form>
    </Modal>
  );
}
