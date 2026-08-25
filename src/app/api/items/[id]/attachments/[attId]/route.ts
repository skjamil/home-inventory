import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/api-utils';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; attId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const attachment = await db.attachment.findFirst({
    where: { id: params.attId, itemId: params.id, item: { userId: session.user.id } },
  });
  if (!attachment) return jsonError(404, 'Attachment not found');

  await del(attachment.blobUrl).catch(() => {}); // don't block on a Blob-side failure
  await db.attachment.delete({ where: { id: attachment.id } });

  return new NextResponse(null, { status: 204 });
}
