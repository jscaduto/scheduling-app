'use client';

import type { EventType, EventTypeLocation, LocationType } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AvailabilityBuilder from '@/components/dashboard/AvailabilityBuilder';
import { DEFAULT_AVAILABILITY, type AvailabilitySchedule } from '@/lib/types';

type Props = {
  eventType?: EventType & { location?: EventTypeLocation | null };
  username?: string;
};

const LOCATION_OPTIONS: { value: LocationType | ''; label: string; placeholder?: string }[] = [
  { value: '',            label: 'None' },
  { value: 'GOOGLE_MEET', label: 'Google Meet' },
  { value: 'IN_PERSON',   label: 'In Person',   placeholder: 'e.g. 123 Main St, San Francisco' },
  { value: 'PHONE_CALL',  label: 'Phone Call',   placeholder: 'e.g. +1 (555) 000-0000' },
  { value: 'CUSTOM',      label: 'Custom URL',   placeholder: 'https://zoom.us/j/…' },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const INCREMENT_OPTIONS = [15, 30, 60]; // slot start-time step choices (minutes)

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function EventTypeForm({ eventType, username }: Props) {
  const router = useRouter();
  const isEditing = !!eventType;

  const [title, setTitle] = useState(eventType?.title ?? '');
  const [slug, setSlug] = useState(eventType?.slug ?? '');
  const [duration, setDuration] = useState(eventType?.duration ?? 30);
  const [slotIncrement, setSlotIncrement] = useState(eventType?.slotIncrement ?? 0);
  const [description, setDescription] = useState(eventType?.description ?? '');
  const [color, setColor] = useState(eventType?.color ?? '#0070f3');
  const [isActive, setIsActive] = useState(eventType?.isActive ?? true);
  const [isPublic, setIsPublic] = useState(eventType?.isPublic ?? true);
  const [availability, setAvailability] = useState<AvailabilitySchedule>(
    (eventType?.availability as unknown as AvailabilitySchedule) ?? DEFAULT_AVAILABILITY
  );
  const [locationType, setLocationType] = useState<LocationType | ''>(
    eventType?.location?.type ?? ''
  );
  const [locationValue, setLocationValue] = useState(eventType?.location?.value ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!isEditing) setSlug(toSlug(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch(
      isEditing ? `/api/event-types/${eventType.id}` : '/api/event-types',
      {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, slug, duration, slotIncrement, description, color, isActive, isPublic, availability,
          location: locationType
            ? { type: locationType, value: locationValue || null }
            : null,
        }),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong');
      setLoading(false);
      return;
    }

    router.push('/dashboard/event-types');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="30-minute meeting"
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="30-minute-meeting"
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400">Used in your booking URL</p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <div>
          <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
            Show on public scheduling page
          </label>
          <p className="text-xs text-gray-400 mt-0.5">
            When enabled, this event is listed on your public page
            {username ? (
              <>
                {' '}
                (<span className="font-mono">/{username}</span>)
              </>
            ) : null}
            . The direct booking link still works when this is off.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
        <select
          value={duration}
          onChange={(e) => {
            const d = Number(e.target.value);
            setDuration(d);
            // Reset increment if the current value would exceed the new duration.
            if (slotIncrement > 0 && slotIncrement >= d) setSlotIncrement(0);
          }}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DURATION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d} minutes
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Slot increment</label>
        <select
          value={slotIncrement}
          onChange={(e) => setSlotIncrement(Number(e.target.value))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={0}>Same as duration ({duration} min)</option>
          {INCREMENT_OPTIONS.filter((inc) => inc < duration).map((inc) => (
            <option key={inc} value={inc}>
              Every {inc} minutes
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">
          How often a new start time is offered. Use a shorter increment to show more slot options.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="A brief description of what this meeting is for."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-16 rounded border border-gray-300 cursor-pointer"
          />
          <span className="text-sm text-gray-500 font-mono">{color}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <select
          value={locationType}
          onChange={(e) => {
            setLocationType(e.target.value as LocationType | '');
            setLocationValue('');
          }}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {LOCATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {locationType && locationType !== 'GOOGLE_MEET' && (() => {
          const opt = LOCATION_OPTIONS.find((o) => o.value === locationType);
          return (
            <input
              type="text"
              value={locationValue}
              onChange={(e) => setLocationValue(e.target.value)}
              placeholder={opt?.placeholder ?? ''}
              className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          );
        })()}

        {locationType === 'GOOGLE_MEET' && (
          <p className="mt-1 text-xs text-gray-400">
            A Google Meet link will be generated automatically when a booking is confirmed.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Weekly Availability</label>
        <AvailabilityBuilder value={availability} onChange={setAvailability} />
      </div>

      {isEditing && (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Active (visible for booking)
          </label>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Event Type'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 rounded-md text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
