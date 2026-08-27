import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { jsonError, randomToken } from '@/lib/api-utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendVerificationEmail } from '@/lib/email';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const schema = z.object({ email: z.string().trim().toLowerCase().email() });

// Backs the "resend verification email" action described in docs/DESIGN.md's
// Login and Verify Email screens. Not yet in docs/API.md — added while
// implementing; needs a doc-sync pass (see the standing rule in CLAUDE.md).
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const { ok } = await checkRateLimit(`resend-verification:${ip}`);
  if (!ok) return jsonError(429, 'Too many attempts. Try again in a few minutes.');

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Invalid email');

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  // Same response whether or not the account exists / is already verified —
  // mirrors forgot-password's "never reveal account existence" behavior.
  if (user && !user.emailVerified) {
    const token = randomToken();
    await db.emailVerificationToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS) },
    });
    await sendVerificationEmail(user.email, token);
  }

  return NextResponse.json({ message: 'If that account needs verifying, a new link has been sent' });
}
