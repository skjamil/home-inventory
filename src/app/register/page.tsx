'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/layout/AuthShell';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? 'Something went wrong');
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75">
              <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
              <path d="M4 7l8 6 8-6" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-extrabold">Check your email</h1>
          <p className="text-sm text-text-secondary">
            We sent a verification link to <strong className="text-text">{email}</strong>.
          </p>
          <Link href="/login" className="text-sm text-accent">
            Back to log in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-5 flex flex-col gap-1.5">
        <h1 className="font-display text-xl font-extrabold">Create your account</h1>
        <p className="text-sm text-text-secondary">Track everything you own. Your inventory stays private to you.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <div className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn-text">{error}</div>}
        <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Field label="Password" type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" />
        <Field label="Confirm password" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password" />
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link href="/login" className="text-accent">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
