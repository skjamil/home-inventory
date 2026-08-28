import webpush from 'web-push';
import { db } from '@/lib/db';

const vapidConfigured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);

if (vapidConfigured) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Sends to every device the user has subscribed on; prunes subscriptions the
// push service reports as gone (410) or not found (404) — see
// docs/ARCHITECTURE.md's "Push notifications" section.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!vapidConfigured) {
    console.log(`[push not configured] would notify user ${userId}: ${payload.title}`);
    return { sent: 0 };
  }

  const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );

  const staleEndpoints: string[] = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const statusCode = (result.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) staleEndpoints.push(subscriptions[i].endpoint);
    }
  });
  if (staleEndpoints.length) {
    await db.pushSubscription.deleteMany({ where: { endpoint: { in: staleEndpoints } } });
  }

  return { sent: results.filter((r) => r.status === 'fulfilled').length };
}
