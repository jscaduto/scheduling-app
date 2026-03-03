'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = { provider: string };

export default function CalendarDisconnectButton({ provider }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDisconnect() {
    setLoading(true);
    await fetch(`/api/calendar/connect?provider=${provider}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <button
      onClick={handleDisconnect}
      disabled={loading}
      className="text-sm text-red-500 hover:text-red-600 hover:underline disabled:opacity-50"
    >
      {loading ? 'Disconnecting…' : 'Disconnect'}
    </button>
  );
}
