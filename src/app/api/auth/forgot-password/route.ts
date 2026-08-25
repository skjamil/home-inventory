import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import { jsonError, randomToken } from '@/lib/api-utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const { ok } = await checkRateLimit(`forgot-password:${ip}`);
  if (!ok) return jsonError(429, 'Too many attempts. Try again in a few minutes.');

  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Invalid email');

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  // Identical response whether or not the account exists — see docs/API.md.
  if (user) {
    const token = randomToken();
    await db.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });
    await sendPasswordResetEmail(user.email, token);
  }

  return NextResponse.json({ message: 'If an account exists for this email, a reset link has been sent' });
}
