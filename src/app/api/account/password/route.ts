import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/api-utils';

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, 'Password must be at least 10 characters'),
});

// Change password for an authenticated user — distinct from the public
// forgot/reset-password flow. Backs the form in docs/DESIGN.md's Settings
// screen. Not yet in docs/API.md — added while implementing; needs a
// doc-sync pass (see the standing rule in CLAUDE.md).
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input');

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return jsonError(401, 'Unauthorized');

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return jsonError(400, 'Current password is incorrect', 'currentPassword');

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });

  return NextResponse.json({ message: 'Password updated' });
}
