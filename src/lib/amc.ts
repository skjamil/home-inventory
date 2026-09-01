import { startOfMonth, endOfMonth } from 'date-fns';
import { db } from '@/lib/db';

// AMC contracts expiring within the current calendar month — mirrors
// lib/warranty.ts's shape and reasoning. Indexed by (userId, endDate) in
// prisma/schema.prisma.
export function getExpiringAmcContracts(userId: string) {
  const now = new Date();
  return db.amcContract.findMany({
    where: {
      userId,
      endDate: { gte: startOfMonth(now), lte: endOfMonth(now) },
    },
    include: { item: { select: { id: true, name: true } } },
    orderBy: { endDate: 'asc' },
  });
}
