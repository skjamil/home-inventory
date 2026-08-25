import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { resetPasswordSchema } from '@/lib/validations/auth';
import { jsonError } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input');

  const { token, newPassword } = parsed.data;
  const record = await db.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return jsonError(400, 'This reset link is invalid or has expired');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Note: sessions are JWTs (see src/lib/auth.ts), not database-backed, so
  // an existing session isn't force-revoked here — it remains valid until
  // it expires. Restoring that property would need a token-versioning
  // scheme; deferred as a follow-up.
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.json({ message: 'Password updated' });
}
