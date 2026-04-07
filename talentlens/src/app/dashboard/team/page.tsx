'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/client-fetch';

interface Member { id: string; name: string | null; email: string; role: string; createdAt: string; }
interface Invite  { id: string; email: string; role: string; createdAt: string; }

const ROLE_BADGE: Record<string, string> = {
  ADMIN:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  HR:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  VIEWER: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function TeamPage() {
  const [members, setMembers]   = useState<Member[]>([]);
  const [invites, setInvites]   = useState<Invite[]>([]);
  const [loading, setLoading]   = useState(true);
  const [email,   setEmail]     = useState('');
  const [role,    setRole]      = useState<'HR' | 'VIEWER'>('HR');
  const [sending, setSending]   = useState(false);
  const [error,   setError]     = useState('');
  const [success, setSuccess]   = useState('');

  async function load() {
    const res = await apiFetch<{ members: Member[]; invites: Invite[] }>('/api/team');
    if (res.success) { setMembers(res.data.members); setInvites(res.data.invites); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setError(''); setSuccess('');
    const res = await apiFetch('/api/team', { method: 'POST', body: JSON.stringify({ email, role }) });
    setSending(false);
    if (!res.success) { setError((res as { error: string }).error); return; }
    setSuccess(`Приглашение отправлено на ${email}`);
    setEmail('');
    load();
  }

  async function revokeInvite(id: string) {
    await apiFetch(`/api/team?inviteId=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="p-8 max-w-3xl page-enter">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text)]">Команда</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Управляйте участниками и приглашениями</p>
      </motion.div>

      {/* Invite form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Пригласить коллегу</h2>
        <form onSubmit={handleInvite} className="flex gap-3 flex-wrap">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@company.com"
            className="flex-1 min-w-48 rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select value={role} onChange={(e) => setRole(e.target.value as 'HR' | 'VIEWER')}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="HR">HR-менеджер</option>
            <option value="VIEWER">Наблюдатель</option>
          </select>
          <button type="submit" disabled={sending}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
            {sending ? 'Отправка...' : 'Пригласить'}
          </button>
        </form>
        <AnimatePresence>
          {error   && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 text-sm text-red-500">{error}</motion.p>}
          {success && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 text-sm text-emerald-500">✓ {success}</motion.p>}
        </AnimatePresence>
      </motion.div>

      {/* Members */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl overflow-hidden mb-4">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)]">Участники ({members.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <motion.div className="w-5 h-5 rounded-full border-2 border-blue-500/30 border-t-blue-500"
              animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {members.map((m, i) => (
              <motion.li key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(m.name ?? m.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{m.name ?? '—'}</p>
                  <p className="text-xs text-[var(--text-faint)] truncate">{m.email}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_BADGE[m.role]}`}>{m.role}</span>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text)]">Ожидают ответа ({invites.length})</h2>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--border)] flex items-center justify-center text-[var(--text-faint)] text-sm shrink-0">?</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text)] truncate">{inv.email}</p>
                  <p className="text-xs text-[var(--text-faint)]">Отправлено {new Date(inv.createdAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_BADGE[inv.role]}`}>{inv.role}</span>
                <button onClick={() => revokeInvite(inv.id)}
                  className="text-xs text-[var(--text-faint)] hover:text-red-500 transition-colors ml-2">
                  Отозвать
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
