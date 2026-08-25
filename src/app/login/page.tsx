'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { AuthShell } from '@/components/layout/AuthShell';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      if (result.code === 'EMAIL_NOT_VERIFIED') {
        setError('Please verify your email before logging in.');
      } else {
        setError('Invalid email or password.');
      }
      return;
    }
    router.push('/dashboard');
  }

  return (
    <AuthShell>
      <div className="mb-4 flex flex-col gap-1.5">
        <h1 className="font-display text-xl font-extrabold">Log in</h1>
        <p className="text-sm text-text-secondary">Welcome back — pick up where you left off.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn-text">
            <span>{error}</span>
          </div>
        )}
        <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Field label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-accent">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-accent">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
