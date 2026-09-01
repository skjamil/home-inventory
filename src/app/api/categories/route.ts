import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createCategorySchema } from '@/lib/validations/category';
import { jsonError } from '@/lib/api-utils';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const categories = await db.category.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(
    categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon, itemCount: c._count.items }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const body = await req.json().catch(() => null);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input', 'name');

  const existing = await db.category.findFirst({
    where: { userId: session.user.id, name: { equals: parsed.data.name, mode: 'insensitive' } },
  });
  if (existing) return jsonError(409, 'A category with this name already exists');

  const category = await db.category.create({
    data: { userId: session.user.id, name: parsed.data.name, icon: parsed.data.icon },
  });

  return NextResponse.json({ id: category.id, name: category.name, icon: category.icon }, { status: 201 });
}
