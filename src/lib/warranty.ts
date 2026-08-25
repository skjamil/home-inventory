import { startOfMonth, endOfMonth } from 'date-fns';
import { db } from '@/lib/db';

// "N warranties expire this month" — see docs/ARCHITECTURE.md's
// "Warranty notification" data flow. Indexed by (userId, warrantyExpiration)
// in prisma/schema.prisma.
export function getExpiringWarranties(userId: string) {
  const now = new Date();
  return db.item.findMany({
    where: {
      userId,
      warrantyExpiration: {
        gte: startOfMonth(now),
        lte: endOfMonth(now),
      },
    },
    orderBy: { warrantyExpiration: 'asc' },
  });
}
