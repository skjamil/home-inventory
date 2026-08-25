'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/layout/AuthShell';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <AuthShell>
      <div className="mb-5 flex flex-col gap-1.5">
        <h1 className="font-display text-xl font-extrabold">Forgot password</h1>
        <p className="text-sm text-text-secondary">Enter the email on your account and we&apos;ll send a reset link.</p>
      </div>

      {sent ? (
        <div className="rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed text-text-secondary">
          If an account exists for this email, a reset link has been sent.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Button type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-text-secondary">
        <Link href="/login" className="text-accent">
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
}
