'use client';

import { useEffect, useState } from 'react';

type Status = 'unsupported' | 'checking' | 'off' | 'on' | 'denied';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>('checking');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function checkSubscription() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription();
      setStatus(subscription ? 'on' : 'off');
    }
    checkSubscription();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      setStatus('on');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus('off');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'unsupported') return null;

  const on = status === 'on';
  const description =
    status === 'denied'
      ? 'Blocked in your browser settings. Allow notifications for this site to enable.'
      : 'Get a browser notification on this device 30, 7, and 1 day before something expires, even if the app is closed.';

  return (
    <div className="flex items-center justify-between gap-3.5 rounded-card border border-border bg-surface p-3.5">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">Push notifications (this device)</span>
        <span className="text-xs text-text-secondary">{description}</span>
      </div>
      <button
        onClick={() => (on ? disable() : enable())}
        disabled={busy || status === 'denied' || status === 'checking'}
        className="flex w-11 flex-shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50"
        style={{ height: 26, background: on ? 'var(--accent)' : 'var(--border)', justifyContent: on ? 'flex-end' : 'flex-start' }}
      >
        <div className="h-5 w-5 rounded-full bg-white shadow" />
      </button>
    </div>
  );
}
