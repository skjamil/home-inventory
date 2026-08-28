import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/api-utils';

const schema = z.object({
  warrantyNotificationsEnabled: z.boolean().optional(),
  amcNotificationsEnabled: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const prefs = await db.userPreferences.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({
    warrantyNotificationsEnabled: prefs?.warrantyNotificationsEnabled ?? true,
    amcNotificationsEnabled: prefs?.amcNotificationsEnabled ?? true,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Invalid input');

  const prefs = await db.userPreferences.upsert({
    where: { userId: session.user.id },
    update: parsed.data,
    create: { userId: session.user.id, ...parsed.data },
  });

  return NextResponse.json({
    warrantyNotificationsEnabled: prefs.warrantyNotificationsEnabled,
    amcNotificationsEnabled: prefs.amcNotificationsEnabled,
  });
}
