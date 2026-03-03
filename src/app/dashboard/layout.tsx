import { redirect } from 'next/navigation';
import { auth0 } from '@/lib/auth0';
import DashboardNav from '@/components/dashboard/DashboardNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-white">
      <DashboardNav />
      {children}
    </div>
  );
}
