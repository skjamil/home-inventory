import { startOfMonth, endOfMonth } from 'date-fns';
import { db } from '@/lib/db';

// Warranties expiring within the current calendar month — see
// docs/ARCHITECTURE.md's "Expiration notification" data flow. Indexed by
// (userId, warrantyExpiration) in prisma/schema.prisma. Deliberately scoped
// to this month only (a warranty that expired last month drops off on the
// 1st) — this is the in-app banner's own view and doesn't affect the
// 30/7/1-day email/push thresholds in lib/expiry.ts, which are unrelated.
export function getExpiringWarranties(userId: string) {
  const now = new Date();
  return db.item.findMany({
    where: {
      userId,
      warrantyExpiration: { gte: startOfMonth(now), lte: endOfMonth(now) },
    },
    orderBy: { warrantyExpiration: 'asc' },
  });
}
