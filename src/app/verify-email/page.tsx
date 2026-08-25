'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className="text-center text-sm text-text-secondary">Verifying…</p>
        </AuthShell>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [resent, setResent] = useState(false);

  // The verify-email API call isn't idempotent — it deletes the token on
  // first use — but React 18 Strict Mode double-invokes effects in dev
  // (mount → unmount → remount) to surface exactly this kind of bug. This
  // ref makes sure the request only actually fires once per token, so the
  // dev double-invoke doesn't burn the token before the "real" call runs.
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    if (requestedFor.current === token) return;
    requestedFor.current = token;

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => setStatus(res.ok ? 'success' : 'error'))
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'checking') {
    return (
      <AuthShell>
        <p className="text-center text-sm text-text-secondary">Verifying…</p>
      </AuthShell>
    );
  }

  if (status === 'success') {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="2.25">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-extrabold">Email verified</h1>
          <p className="text-sm text-text-secondary">Your account is ready. Log in with the password you created.</p>
          <Link href="/login" className="w-full">
            <Button>Continue to log in</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-display text-xl font-extrabold">Link invalid or expired</h1>
        <p className="text-sm text-text-secondary">This verification link no longer works. Request a new one below.</p>
        {resent ? (
          <p className="text-sm text-accent">New link sent — check your email.</p>
        ) : (
          <Button
            onClick={async () => {
              const email = window.prompt('Enter your email to resend the verification link');
              if (!email) return;
              await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
              });
              setResent(true);
            }}
          >
            Resend verification email
          </Button>
        )}
      </div>
    </AuthShell>
  );
}
