import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateItemSchema } from '@/lib/validations/item';
import { jsonError } from '@/lib/api-utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const item = await db.item.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { attachments: true, amcContracts: true, category: { select: { name: true } } },
  });
  if (!item) return jsonError(404, 'Item not found');

  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const existing = await db.item.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!existing) return jsonError(404, 'Item not found');

  const body = await req.json().catch(() => null);
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input');

  const { attachments: _attachments, amcContracts: _amcContracts, ...itemData } = parsed.data;

  if (itemData.categoryId) {
    const category = await db.category.findFirst({
      where: { id: itemData.categoryId, userId: session.user.id },
    });
    if (!category) return jsonError(404, 'Category not found');
  }

  const item = await db.item.update({
    where: { id: existing.id },
    data: {
      ...itemData,
      purchaseDate: itemData.purchaseDate ? new Date(itemData.purchaseDate) : undefined,
      warrantyExpiration: itemData.warrantyExpiration ? new Date(itemData.warrantyExpiration) : undefined,
    },
    include: { attachments: true, amcContracts: true },
  });

  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const existing = await db.item.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { attachments: true, amcContracts: true },
  });
  if (!existing) return jsonError(404, 'Item not found');

  await Promise.allSettled([
    ...existing.attachments.map((a) => del(a.blobUrl)),
    ...existing.amcContracts.filter((c) => c.documentBlobUrl).map((c) => del(c.documentBlobUrl!)),
  ]);
  await db.item.delete({ where: { id: existing.id } }); // cascades to Attachment + AmcContract rows

  return new NextResponse(null, { status: 204 });
}
