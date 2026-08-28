import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateAmcContractSchema } from '@/lib/validations/amc';
import { jsonError } from '@/lib/api-utils';

export async function PATCH(req: NextRequest, { params }: { params: { id: string; amcId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const existing = await db.amcContract.findFirst({
    where: { id: params.amcId, itemId: params.id, item: { userId: session.user.id } },
  });
  if (!existing) return jsonError(404, 'AMC contract not found');

  const body = await req.json().catch(() => null);
  const parsed = updateAmcContractSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input');

  // Replacing the document: clean up the old Blob object since it has no
  // separate child row to piggyback the delete on (unlike Attachment).
  if (
    parsed.data.documentBlobUrl !== undefined &&
    existing.documentBlobUrl &&
    parsed.data.documentBlobUrl !== existing.documentBlobUrl
  ) {
    await del(existing.documentBlobUrl).catch(() => {});
  }

  const amcContract = await db.amcContract.update({
    where: { id: existing.id },
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    },
  });

  return NextResponse.json(amcContract);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; amcId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const existing = await db.amcContract.findFirst({
    where: { id: params.amcId, itemId: params.id, item: { userId: session.user.id } },
  });
  if (!existing) return jsonError(404, 'AMC contract not found');

  if (existing.documentBlobUrl) await del(existing.documentBlobUrl).catch(() => {});
  await db.amcContract.delete({ where: { id: existing.id } });

  return new NextResponse(null, { status: 204 });
}
