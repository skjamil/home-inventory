import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { registerSchema } from '@/lib/validations/auth';
import { jsonError, randomToken } from '@/lib/api-utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendVerificationEmail } from '@/lib/email';
import { DEFAULT_CATEGORIES } from '@/lib/default-categories';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const { ok } = await checkRateLimit(`register:${ip}`);
  if (!ok) return jsonError(429, 'Too many attempts. Try again in a few minutes.');

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input');

  const { email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return jsonError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 12);
  const token = randomToken();

  // User + default categories + verification token all created together —
  // see docs/ARCHITECTURE.md's "Registration → verification" data flow.
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, passwordHash } });
    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id })),
    });
    await tx.userPreferences.create({ data: { userId: user.id } });
    await tx.emailVerificationToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS) },
    });
  });

  await sendVerificationEmail(email, token);

  return NextResponse.json({ message: 'Check your email to verify your account' }, { status: 201 });
}
