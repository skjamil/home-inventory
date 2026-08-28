import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createAmcContractSchema } from '@/lib/validations/amc';
import { jsonError } from '@/lib/api-utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const item = await db.item.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!item) return jsonError(404, 'Item not found');

  const amcContracts = await db.amcContract.findMany({
    where: { itemId: item.id },
    orderBy: { startDate: 'desc' },
  });

  return NextResponse.json(amcContracts);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const item = await db.item.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!item) return jsonError(404, 'Item not found');

  const body = await req.json().catch(() => null);
  const parsed = createAmcContractSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? 'Invalid input');

  const amcContract = await db.amcContract.create({
    data: {
      ...parsed.data,
      itemId: item.id,
      userId: session.user.id,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    },
  });

  return NextResponse.json(amcContract, { status: 201 });
}
