'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const ALL_ZONES: string[] = Intl.supportedValuesOf('timeZone');

type Props = { current: string };

export default function TimezoneSelect({ current }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(current);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(current); // revert unsaved input
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [current]);

  const filtered = ALL_ZONES.filter((tz) =>
    tz.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 50);

  async function select(tz: string) {
    setQuery(tz);
    setOpen(false);
    setSaving(true);
    setSaved(false);
    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: tz }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setSaved(false);
          }}
          onFocus={() => setOpen(true)}
          disabled={saving}
          placeholder="Search timezone…"
          className="text-sm border border-gray-300 rounded-md px-2 py-1 w-56 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        {saving && <span className="text-xs text-gray-400">Saving…</span>}
        {!saving && saved && <span className="text-xs text-green-600">Saved</span>}
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 w-56 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg text-sm">
          {filtered.map((tz) => (
            <li
              key={tz}
              // mousedown fires before blur so we can prevent the input from
              // losing focus before the click registers
              onMouseDown={(e) => {
                e.preventDefault();
                void select(tz);
              }}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 text-gray-800"
            >
              {tz}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
