import { addDays, startOfDay } from 'date-fns';
import { db } from '@/lib/db';
import { EXPIRY_THRESHOLDS_DAYS } from '@/lib/expiry';

// AMC contracts expiring within the largest configured threshold (30 days)
// or already expired — mirrors lib/warranty.ts's shape. Indexed by
// (userId, endDate) in prisma/schema.prisma.
export function getExpiringAmcContracts(userId: string) {
  const cutoff = addDays(startOfDay(new Date()), Math.max(...EXPIRY_THRESHOLDS_DAYS));
  return db.amcContract.findMany({
    where: {
      userId,
      endDate: { lte: cutoff },
    },
    include: { item: { select: { id: true, name: true } } },
    orderBy: { endDate: 'asc' },
  });
}
