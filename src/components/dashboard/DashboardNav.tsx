import Link from 'next/link';

const NAV_LINKS = [
  { href: '/dashboard/event-types', label: 'Event Types' },
  { href: '/dashboard/bookings',    label: 'Bookings' },
  { href: '/dashboard/settings',    label: 'Settings' },
];

export default function DashboardNav() {
  return (
    <nav className="border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-6 flex items-center gap-6 h-14">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-gray-900 hover:text-blue-600 mr-2"
        >
          Dashboard
        </Link>
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
