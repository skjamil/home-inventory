import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ProfileForm } from '@/components/profile/ProfileForm';

export default async function ProfilePage() {
  const session = await auth();
  const user = await db.user.findUniqueOrThrow({
    where: { id: session!.user!.id! },
    select: { name: true, email: true, image: true },
  });

  return (
    <div className="pb-24">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
        <Link href="/dashboard">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="font-display text-base font-bold">Profile</span>
      </div>

      <div className="mx-auto max-w-content p-4">
        <ProfileForm initialName={user.name} email={user.email} initialImage={user.image} />
      </div>
    </div>
  );
}
