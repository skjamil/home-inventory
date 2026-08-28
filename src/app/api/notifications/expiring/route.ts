import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getExpiringEntries } from '@/lib/expiring-entries';
import { jsonError } from '@/lib/api-utils';

// Polled by ExpirationBanner while the dashboard is open, so the banner
// stays live without a full page reload — see docs/ARCHITECTURE.md's
// "Expiration notification" section.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'Unauthorized');

  const entries = await getExpiringEntries(session.user.id);
  return NextResponse.json({ entries });
}
