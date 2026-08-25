'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/layout/AuthShell';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthShell><p className="text-center text-sm text-text-secondary">Loading…</p></AuthShell>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (!token) {
      setError('This reset link is invalid or has expired');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? 'This reset link is invalid or has expired');
      return;
    }
    router.push('/login');
  }

  return (
    <AuthShell>
      <div className="mb-5 flex flex-col gap-1.5">
        <h1 className="font-display text-xl font-extrabold">Set a new password</h1>
        <p className="text-sm text-text-secondary">Reached via the link in your reset email.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn-text">
            {error} — <Link href="/forgot-password" className="underline">request a new one</Link>
          </div>
        )}
        <Field label="New password" type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" />
        <Field label="Confirm new password" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter new password" />
        <Button type="submit" disabled={loading}>
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </AuthShell>
  );
}
