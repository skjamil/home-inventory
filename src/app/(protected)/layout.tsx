import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { NavBar } from '@/components/layout/NavBar';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen bg-bg">
      {children}
      <NavBar />
    </div>
  );
}
