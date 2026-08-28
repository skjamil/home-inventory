import { NextRequest, NextResponse } from 'next/server';
import { addDays, startOfDay } from 'date-fns';
import { db } from '@/lib/db';
import { getExpiryStatus, crossedThresholdsToday, EXPIRY_THRESHOLDS_DAYS } from '@/lib/expiry';
import { sendExpirationDigestEmail } from '@/lib/email';
import { sendPushToUser } from '@/lib/push';
import type { UserPreferences, NotificationChannel, ExpirySourceType, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Source {
  sourceType: ExpirySourceType;
  sourceId: string;
  itemName: string;
  kind: 'warranty' | 'amc';
  daysUntil: number;
  userId: string;
  userEmail: string;
  prefs: UserPreferences | null;
}

function sourceTypeEnabled(kind: 'warranty' | 'amc', prefs: UserPreferences | null) {
  return kind === 'warranty' ? (prefs?.warrantyNotificationsEnabled ?? true) : (prefs?.amcNotificationsEnabled ?? true);
}

// Daily digest — checks every warranty/AMC contract expiring within the
// largest configured threshold (30 days), sends at most one email + one
// push per user per run, and logs what was sent to ExpiryNotificationLog so
// the same threshold is never notified twice. See docs/ARCHITECTURE.md's
// "Expiration notification" section. Triggered by Vercel Cron (vercel.json),
// which sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const cutoff = addDays(startOfDay(new Date()), Math.max(...EXPIRY_THRESHOLDS_DAYS));

  const [items, amcContracts] = await Promise.all([
    db.item.findMany({
      where: { warrantyExpiration: { lte: cutoff } },
      select: {
        id: true,
        name: true,
        warrantyExpiration: true,
        userId: true,
        user: { select: { email: true, preferences: true } },
      },
    }),
    db.amcContract.findMany({
      where: { endDate: { lte: cutoff } },
      select: {
        id: true,
        endDate: true,
        userId: true,
        item: { select: { name: true } },
        user: { select: { email: true, preferences: true } },
      },
    }),
  ]);

  const sources: Source[] = [];
  for (const item of items) {
    if (!item.warrantyExpiration) continue;
    const { daysUntil } = getExpiryStatus(item.warrantyExpiration);
    if (daysUntil === null || daysUntil < 0) continue;
    sources.push({
      sourceType: 'WARRANTY',
      sourceId: item.id,
      itemName: item.name,
      kind: 'warranty',
      daysUntil,
      userId: item.userId,
      userEmail: item.user.email,
      prefs: item.user.preferences,
    });
  }
  for (const c of amcContracts) {
    if (!c.endDate) continue;
    const { daysUntil } = getExpiryStatus(c.endDate);
    if (daysUntil === null || daysUntil < 0) continue;
    sources.push({
      sourceType: 'AMC',
      sourceId: c.id,
      itemName: c.item.name,
      kind: 'amc',
      daysUntil,
      userId: c.userId,
      userEmail: c.user.email,
      prefs: c.user.preferences,
    });
  }

  const existingLogs = await db.expiryNotificationLog.findMany({
    where: {
      OR: [
        { sourceType: 'WARRANTY', sourceId: { in: items.map((i) => i.id) } },
        { sourceType: 'AMC', sourceId: { in: amcContracts.map((c) => c.id) } },
      ],
    },
  });
  const loggedThresholds = new Map<string, Set<number>>();
  for (const log of existingLogs) {
    const key = `${log.sourceType}:${log.sourceId}:${log.channel}`;
    if (!loggedThresholds.has(key)) loggedThresholds.set(key, new Set());
    loggedThresholds.get(key)!.add(log.thresholdDays);
  }

  const byUser = new Map<string, { email: string; prefs: UserPreferences | null; sources: (Source & { emailThresholds: number[]; pushThresholds: number[] })[] }>();
  for (const source of sources) {
    const loggedEmail = loggedThresholds.get(`${source.sourceType}:${source.sourceId}:EMAIL`) ?? new Set<number>();
    const loggedPush = loggedThresholds.get(`${source.sourceType}:${source.sourceId}:PUSH`) ?? new Set<number>();
    const emailThresholds = crossedThresholdsToday(source.daysUntil, loggedEmail);
    const pushThresholds = crossedThresholdsToday(source.daysUntil, loggedPush);
    if (emailThresholds.length === 0 && pushThresholds.length === 0) continue;

    if (!byUser.has(source.userId)) byUser.set(source.userId, { email: source.userEmail, prefs: source.prefs, sources: [] });
    byUser.get(source.userId)!.sources.push({ ...source, emailThresholds, pushThresholds });
  }

  let emailsSent = 0;
  let pushSent = 0;
  const errors: string[] = [];
  const logRows: Prisma.ExpiryNotificationLogCreateManyInput[] = [];

  await Promise.allSettled(
    Array.from(byUser.entries()).map(async ([userId, { email, prefs, sources: userSources }]) => {
      const emailDue = userSources.filter((s) => s.emailThresholds.length > 0 && sourceTypeEnabled(s.kind, prefs));
      const pushDue = userSources.filter((s) => s.pushThresholds.length > 0 && sourceTypeEnabled(s.kind, prefs));

      if ((prefs?.emailNotificationsEnabled ?? true) && emailDue.length > 0) {
        try {
          await sendExpirationDigestEmail(
            email,
            emailDue.map((s) => ({ itemName: s.itemName, kind: s.kind, daysUntil: s.daysUntil }))
          );
          emailsSent++;
          for (const s of emailDue) {
            for (const t of s.emailThresholds) {
              logRows.push({ userId, sourceType: s.sourceType, sourceId: s.sourceId, thresholdDays: t, channel: 'EMAIL' as NotificationChannel });
            }
          }
        } catch (err) {
          errors.push(`email:${userId}:${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (pushDue.length > 0) {
        try {
          const title = pushDue.length === 1 ? `${pushDue[0].itemName} is expiring soon` : `${pushDue.length} items expiring soon`;
          const body = pushDue.map((s) => `${s.itemName} (${s.daysUntil}d)`).join(', ');
          const result = await sendPushToUser(userId, { title, body, url: '/dashboard' });
          if (result.sent > 0) {
            pushSent++;
            for (const s of pushDue) {
              for (const t of s.pushThresholds) {
                logRows.push({ userId, sourceType: s.sourceType, sourceId: s.sourceId, thresholdDays: t, channel: 'PUSH' as NotificationChannel });
              }
            }
          }
        } catch (err) {
          errors.push(`push:${userId}:${err instanceof Error ? err.message : String(err)}`);
        }
      }
    })
  );

  if (logRows.length > 0) {
    await db.expiryNotificationLog.createMany({ data: logRows, skipDuplicates: true });
  }

  return NextResponse.json({ usersNotified: byUser.size, emailsSent, pushSent, errors });
}
