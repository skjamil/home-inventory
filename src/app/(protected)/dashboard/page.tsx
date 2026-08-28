import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getExpiringWarranties } from '@/lib/warranty';
import { getExpiringAmcContracts } from '@/lib/amc';
import { ExpirationBanner, type ExpiringEntry } from '@/components/dashboard/ExpirationBanner';
import { CategoryIcon } from '@/components/CategoryIcon';

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [categories, prefs] = await Promise.all([
    db.category.findMany({
      where: { userId },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    db.userPreferences.findUnique({ where: { userId } }),
  ]);

  const warrantyNotifOn = prefs?.warrantyNotificationsEnabled ?? true;
  const amcNotifOn = prefs?.amcNotificationsEnabled ?? true;
  const [warranties, amcContracts] = await Promise.all([
    warrantyNotifOn ? getExpiringWarranties(userId) : Promise.resolve([]),
    amcNotifOn ? getExpiringAmcContracts(userId) : Promise.resolve([]),
  ]);

  const entries: ExpiringEntry[] = [
    ...warranties.map((i) => ({
      key: `warranty-${i.id}`,
      itemId: i.id,
      itemName: i.name,
      date: i.warrantyExpiration?.toISOString() ?? null,
      kind: 'warranty' as const,
    })),
    ...amcContracts.map((c) => ({
      key: `amc-${c.id}`,
      itemId: c.item.id,
      itemName: c.item.name,
      date: c.endDate?.toISOString() ?? null,
      kind: 'amc' as const,
    })),
  ].sort((a, b) => (a.date && b.date ? +new Date(a.date) - +new Date(b.date) : 0));

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <path d="M8 12h8M12 8v8" />
          </svg>
          <span className="font-display text-base font-bold">Home Inventory</span>
        </div>
        <div className="h-7 w-7 rounded-full bg-border" />
      </div>

      <div className="mx-auto flex max-w-content flex-col gap-4 p-4">
        <ExpirationBanner entries={entries} />

        <div className="flex flex-col gap-3">
          <span className="font-display text-xl font-extrabold">Your inventory</span>
          {categories.length === 0 ? (
            <p className="text-sm text-text-secondary">No categories yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/items?categoryId=${c.id}`}
                  className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
                >
                  <CategoryIcon icon={c.icon} />
                  <div>
                    <div className="text-xl font-bold">{c._count.items}</div>
                    <div className="text-xs text-text-secondary">{c.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
