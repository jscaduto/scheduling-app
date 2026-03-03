'use client';

import { useEffect, useState } from 'react';

type Calendar = { id: string; summary: string };

export default function CalendarSelector() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/calendar/calendars')
      .then((r) => r.json())
      .then((data: { calendars: Calendar[]; selectedIds: string[] }) => {
        setCalendars(data.calendars ?? []);
        setSelectedIds(data.selectedIds ?? []);
      })
      .catch(() => {/* non-fatal */})
      .finally(() => setLoading(false));
  }, []);

  async function toggle(id: string, checked: boolean) {
    // Empty selectedIds means "all selected". Build the explicit list from the
    // current effective selection before applying the change.
    const current = selectedIds.length > 0 ? selectedIds : calendars.map((c) => c.id);
    const next = checked ? [...current, id] : current.filter((x) => x !== id);

    setSelectedIds(next);
    setSaving(true);
    setSaved(false);

    await fetch('/api/calendar/calendars', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedIds: next }),
    });

    setSaving(false);
    setSaved(true);
  }

  if (loading) {
    return <p className="mt-4 text-xs text-gray-400">Loading calendars…</p>;
  }

  if (calendars.length === 0) return null;

  // Empty selectedIds means all calendars are selected.
  const effectiveSelected = selectedIds.length > 0 ? new Set(selectedIds) : new Set(calendars.map((c) => c.id));

  return (
    <div className="mt-5 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Calendars to check for conflicts
        </p>
        {saving && <span className="text-xs text-gray-400">Saving…</span>}
        {!saving && saved && <span className="text-xs text-green-600">Saved</span>}
      </div>
      <ul className="space-y-1">
        {calendars.map((cal) => (
          <li key={cal.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`cal-${cal.id}`}
              checked={effectiveSelected.has(cal.id)}
              onChange={(e) => void toggle(cal.id, e.target.checked)}
              disabled={saving}
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <label htmlFor={`cal-${cal.id}`} className="text-sm text-gray-700 cursor-pointer">
              {cal.summary}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
