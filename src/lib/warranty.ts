import { addDays, startOfDay } from 'date-fns';
import { db } from '@/lib/db';
import { EXPIRY_THRESHOLDS_DAYS } from '@/lib/expiry';

// Warranties expiring within the largest configured threshold (30 days) or
// already expired — see docs/ARCHITECTURE.md's "Expiration notification"
// data flow. Indexed by (userId, warrantyExpiration) in prisma/schema.prisma.
// No lower bound: an already-expired warranty must keep showing up here
// (previously this used a startOfMonth/endOfMonth window, which silently
// dropped expired items once the calendar month rolled over).
export function getExpiringWarranties(userId: string) {
  const cutoff = addDays(startOfDay(new Date()), Math.max(...EXPIRY_THRESHOLDS_DAYS));
  return db.item.findMany({
    where: {
      userId,
      warrantyExpiration: { lte: cutoff },
    },
    orderBy: { warrantyExpiration: 'asc' },
  });
}
