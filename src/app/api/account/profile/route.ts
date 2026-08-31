import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/api-utils';

const schema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  image: z.string().min(1).nullable().optional(),
});

// Update the current user's display name and/or avatar image — backs the
// Profile screen (docs/DESIGN.md). Deletes the previous avatar Blob (if any)
// when replaced, mirroring the swap-and-delete pattern in
// /api/items/[id]/attachments/[attId] (see docs/API.md's Account section).
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input');

  const { name, image } = parsed.data;
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return jsonError(401, 'Unauthorized');

  if (image !== undefined && user.image && user.image !== image) {
    await del(user.image).catch(() => {}); // don't block on a Blob-side failure
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(image !== undefined && { image }),
    },
  });

  return NextResponse.json({ name: updated.name, image: updated.image });
}
