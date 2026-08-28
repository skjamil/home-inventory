import { db } from '@/lib/db';
import { getExpiringWarranties } from '@/lib/warranty';
import { getExpiringAmcContracts } from '@/lib/amc';
import { getExpiryStatus } from '@/lib/expiry';
import type { ExpiringEntry } from '@/components/dashboard/ExpirationBanner';

// Shared by the dashboard's SSR fetch and the /api/notifications/expiring
// polling route so both surfaces agree on exactly the same data.
export async function getExpiringEntries(userId: string): Promise<ExpiringEntry[]> {
  const prefs = await db.userPreferences.findUnique({ where: { userId } });
  const warrantyNotifOn = prefs?.warrantyNotificationsEnabled ?? true;
  const amcNotifOn = prefs?.amcNotificationsEnabled ?? true;

  const [warranties, amcContracts] = await Promise.all([
    warrantyNotifOn ? getExpiringWarranties(userId) : Promise.resolve([]),
    amcNotifOn ? getExpiringAmcContracts(userId) : Promise.resolve([]),
  ]);

  const entries: ExpiringEntry[] = [
    ...warranties.map((i) => {
      const status = getExpiryStatus(i.warrantyExpiration);
      return {
        key: `warranty-${i.id}`,
        itemId: i.id,
        itemName: i.name,
        date: i.warrantyExpiration?.toISOString() ?? null,
        kind: 'warranty' as const,
        daysUntil: status.daysUntil,
        isExpired: status.isExpired,
      };
    }),
    ...amcContracts.map((c) => {
      const status = getExpiryStatus(c.endDate);
      return {
        key: `amc-${c.id}`,
        itemId: c.item.id,
        itemName: c.item.name,
        date: c.endDate?.toISOString() ?? null,
        kind: 'amc' as const,
        daysUntil: status.daysUntil,
        isExpired: status.isExpired,
      };
    }),
  ].sort((a, b) => (a.date && b.date ? +new Date(a.date) - +new Date(b.date) : 0));

  return entries;
}
