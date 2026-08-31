'use client';

import { useEffect, useState } from 'react';
import { PushNotificationToggle } from '@/components/settings/PushNotificationToggle';

type NotificationField = 'warrantyNotificationsEnabled' | 'amcNotificationsEnabled' | 'emailNotificationsEnabled';

export default function SettingsPage() {
  const [notifOn, setNotifOn] = useState(true);
  const [amcNotifOn, setAmcNotifOn] = useState(true);
  const [emailNotifOn, setEmailNotifOn] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setNotifOn(d.warrantyNotificationsEnabled);
        setAmcNotifOn(d.amcNotificationsEnabled);
        setEmailNotifOn(d.emailNotificationsEnabled);
      });
  }, []);

  async function toggle(field: NotificationField, current: boolean, setter: (v: boolean) => void) {
    const next = !current;
    setter(next); // optimistic
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: next }),
    });
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
              <span className="text-xs text-text-secondary">Shown on the dashboard when a warranty is expiring soon or has expired.</span>
            </div>
            <button
              onClick={() => toggle('warrantyNotificationsEnabled', notifOn, setNotifOn)}
              className="flex w-11 flex-shrink-0 items-center rounded-full p-0.5 transition-colors"
              style={{ height: 26, background: notifOn ? 'var(--accent)' : 'var(--border)', justifyContent: notifOn ? 'flex-end' : 'flex-start' }}
            >
              <div className="h-5 w-5 rounded-full bg-white shadow" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3.5 rounded-card border border-border bg-surface p-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">AMC expiration banner</span>
              <span className="text-xs text-text-secondary">Shown on the dashboard when an AMC contract is expiring soon or has expired.</span>
            </div>
            <button
              onClick={() => toggle('amcNotificationsEnabled', amcNotifOn, setAmcNotifOn)}
              className="flex w-11 flex-shrink-0 items-center rounded-full p-0.5 transition-colors"
              style={{ height: 26, background: amcNotifOn ? 'var(--accent)' : 'var(--border)', justifyContent: amcNotifOn ? 'flex-end' : 'flex-start' }}
            >
              <div className="h-5 w-5 rounded-full bg-white shadow" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3.5 rounded-card border border-border bg-surface p-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">Email notifications</span>
              <span className="text-xs text-text-secondary">Get an email 30, 7, and 1 day before a warranty or AMC contract expires.</span>
            </div>
            <button
              onClick={() => toggle('emailNotificationsEnabled', emailNotifOn, setEmailNotifOn)}
              className="flex w-11 flex-shrink-0 items-center rounded-full p-0.5 transition-colors"
              style={{ height: 26, background: emailNotifOn ? 'var(--accent)' : 'var(--border)', justifyContent: emailNotifOn ? 'flex-end' : 'flex-start' }}
            >
              <div className="h-5 w-5 rounded-full bg-white shadow" />
            </button>
          </div>

          <PushNotificationToggle />
        </div>
      </div>
    </div>
  );
}
