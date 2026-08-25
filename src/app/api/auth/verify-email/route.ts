import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return jsonError(400, 'Missing token');

  const record = await db.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    return jsonError(400, 'This verification link is invalid or has expired');
  }

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    db.emailVerificationToken.delete({ where: { token } }),
  ]);

  return NextResponse.json({ message: 'Email verified' });
}
