'use client';

import { useState } from 'react';

type Props = { current: string | null };

/** Parent should pass `key` when `current` changes from the server (e.g. `key={current ?? ''}`) so local state resets. */
export default function GravatarUsernameField({ current }: Props) {
  const [value, setValue] = useState(current ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setError('');
    setSaved(false);
    const trimmed = value.trim();
    const effective = trimmed === '' ? null : trimmed;
    if (effective === current) {
      setSaved(true);
      return;
    }
    setSaving(true);
    const res = await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gravatarUsername: effective }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Could not save.');
      return;
    }
    setSaved(true);
  }

  const unchanged = value.trim() === (current ?? '');

  return (
    <div className="flex flex-col gap-1 min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
            setError('');
          }}
          disabled={saving}
          placeholder="e.g. johndoe"
          autoComplete="off"
          spellCheck={false}
          className="text-sm border border-gray-300 rounded-md px-2 py-1 font-mono text-gray-800 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || unchanged}
          className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 shrink-0"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && !error && <span className="text-xs text-green-600">Saved</span>}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-gray-400">
        Your Gravatar profile username or full profile URL (e.g. johndoe or gravatar.com/johndoe).
        Required for the full profile card; also used to resolve your profile when that option is on.
      </p>
    </div>
  );
}
