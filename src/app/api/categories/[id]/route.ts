import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateCategorySchema } from '@/lib/validations/category';
import { jsonError } from '@/lib/api-utils';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const existing = await db.category.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!existing) return jsonError(404, 'Category not found');

  const body = await req.json().catch(() => null);
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input');

  if (parsed.data.name) {
    const conflict = await db.category.findUnique({
      where: { userId_name: { userId: session.user.id, name: parsed.data.name } },
    });
    if (conflict && conflict.id !== existing.id) return jsonError(409, 'A category with this name already exists');
  }

  const category = await db.category.update({ where: { id: existing.id }, data: parsed.data });
  return NextResponse.json({ id: category.id, name: category.name, icon: category.icon });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const existing = await db.category.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { _count: { select: { items: true } } },
  });
  if (!existing) return jsonError(404, 'Category not found');

  if (existing._count.items > 0) {
    return jsonError(409, 'Reassign or delete this category\'s items before deleting it');
  }

  await db.category.delete({ where: { id: existing.id } });
  return new NextResponse(null, { status: 204 });
}
