'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const [notifOn, setNotifOn] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => setNotifOn(d.warrantyNotificationsEnabled));
  }, []);

  async function toggleNotif() {
    const next = !notifOn;
    setNotifOn(next); // optimistic
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warrantyNotificationsEnabled: next }),
    });
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    const res = await fetch('/api/account/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setMessage('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setMessage(body?.error?.message ?? 'Could not update password');
    }
  }

  return (
    <div className="pb-24">
      <div className="border-b border-border px-4 py-3.5">
        <span className="font-display text-base font-bold">Settings</span>
      </div>

      <div className="mx-auto flex max-w-content flex-col p-4" style={{ gap: 22 }}>
        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">Notifications</span>
          <div className="flex items-center justify-between gap-3.5 rounded-card border border-border bg-surface p-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">Warranty expiration banner</span>
              <span className="text-xs text-text-secondary">Shown on the dashboard when a warranty expires this month.</span>
            </div>
            <button
              onClick={toggleNotif}
              className="flex w-11 flex-shrink-0 items-center rounded-full p-0.5 transition-colors"
              style={{ height: 26, background: notifOn ? 'var(--accent)' : 'var(--border)', justifyContent: notifOn ? 'flex-end' : 'flex-start' }}
            >
              <div className="h-5 w-5 rounded-full bg-white shadow" />
            </button>
          </div>
        </div>

        <form onSubmit={updatePassword} className="flex flex-col gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">Account</span>
          {message && <div className="text-xs text-text-secondary">{message}</div>}
          <Field label="Current password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <Field label="New password" type="password" required minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 10 characters" />
          <Button type="submit" variant="ghost" disabled={saving}>
            {saving ? 'Updating…' : 'Update password'}
          </Button>
        </form>

        <Button
          variant="danger"
          disabled={loggingOut}
          onClick={() => {
            setLoggingOut(true);
            signOut({ callbackUrl: '/login' });
          }}
        >
          {loggingOut ? 'Logging out…' : 'Log out'}
        </Button>
      </div>
    </div>
  );
}
