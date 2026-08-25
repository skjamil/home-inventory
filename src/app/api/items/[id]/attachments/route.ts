import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createAttachmentSchema } from '@/lib/validations/item';
import { jsonError } from '@/lib/api-utils';

// Links an already-uploaded Blob file to an item — see "File upload" in
// docs/ARCHITECTURE.md. The file bytes were already PUT directly to Blob;
// only this metadata + blobUrl round-trips through the API.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const item = await db.item.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!item) return jsonError(404, 'Item not found');

  const body = await req.json().catch(() => null);
  const parsed = createAttachmentSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Invalid attachment');

  const attachment = await db.attachment.create({
    data: { ...parsed.data, itemId: item.id },
  });

  return NextResponse.json(attachment, { status: 201 });
}
