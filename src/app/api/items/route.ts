import { NextRequest, NextResponse } from 'next/server';
import { startOfMonth, endOfMonth } from 'date-fns';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createItemSchema } from '@/lib/validations/item';
import { jsonError } from '@/lib/api-utils';
import type { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const categoryId = req.nextUrl.searchParams.get('categoryId') ?? undefined;
  const search = req.nextUrl.searchParams.get('search') ?? undefined;
  const expiringOnly = req.nextUrl.searchParams.get('warrantyExpiringThisMonth') === '1';

  const where: Prisma.ItemWhereInput = { userId: session.user.id };
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (expiringOnly) {
    const now = new Date();
    where.warrantyExpiration = { gte: startOfMonth(now), lte: endOfMonth(now) };
  }

  const items = await db.item.findMany({
    where,
    include: { category: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const body = await req.json().catch(() => null);
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input');

  const { attachments, amcContracts, ...itemData } = parsed.data;
  const userId = session.user.id;

  const category = await db.category.findFirst({
    where: { id: itemData.categoryId, userId },
  });
  if (!category) return jsonError(404, 'Category not found');

  const item = await db.item.create({
    data: {
      ...itemData,
      userId,
      purchaseDate: itemData.purchaseDate ? new Date(itemData.purchaseDate) : null,
      warrantyExpiration: itemData.warrantyExpiration ? new Date(itemData.warrantyExpiration) : null,
      attachments: attachments ? { create: attachments } : undefined,
      amcContracts: amcContracts
        ? {
            create: amcContracts.map((c) => ({
              ...c,
              userId,
              startDate: c.startDate ? new Date(c.startDate) : null,
              endDate: c.endDate ? new Date(c.endDate) : null,
            })),
          }
        : undefined,
    },
    include: { attachments: true, amcContracts: true },
  });

  return NextResponse.json(item, { status: 201 });
}
