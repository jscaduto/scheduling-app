import { redirect } from 'next/navigation';
import { auth0 } from '@/lib/auth0';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return <>{children}</>;
}
