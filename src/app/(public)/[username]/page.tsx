import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

// ── Gravatar helpers ──────────────────────────────────────────────────────────

function gravatarAvatarUrl(email: string, size = 96) {
  const hash = createHash('md5').update(email.trim().toLowerCase()).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
}

// Normalised shape used in the card — sourced from Gravatar REST API v3
type GravatarProfile = {
  displayName?: string;
  avatarUrl?: string;
  headerImage?: string;
  backgroundColor?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  description?: string;
  profileUrl?: string;
  verifiedAccounts?: { serviceLabel: string; serviceIcon?: string; url: string }[];
  links?: { label: string; url: string }[];
};

// v3 REST API response shape
// NOTE: header_image is only returned when a valid API key is provided
type GravatarV3Response = {
  display_name?: string;
  avatar_url?: string;
  header_image?: string;
  background_color?: string;
  job_title?: string;
  company?: string;
  location?: string;
  description?: string;
  profile_url?: string;
  verified_accounts?: { service_type: string; service_label: string; service_icon?: string; url: string; is_hidden?: boolean }[];
  links?: { label: string; url: string }[];
};

function mapGravatarV3ToProfile(data: GravatarV3Response): GravatarProfile {
  return {
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    headerImage: data.header_image || undefined,
    backgroundColor: data.background_color || undefined,
    jobTitle: data.job_title || undefined,
    company: data.company || undefined,
    location: data.location || undefined,
    description: data.description || undefined,
    profileUrl: data.profile_url || undefined,
    verifiedAccounts: data.verified_accounts
      ?.filter((a) => !a.is_hidden)
      .map((a) => ({ serviceLabel: a.service_label, serviceIcon: a.service_icon, url: a.url })),
    links: data.links?.length ? data.links : undefined,
  };
}

async function fetchGravatarProfileV3(
  pathSegment: string,
  apiKey: string | undefined
): Promise<GravatarV3Response | null> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(
    `https://api.gravatar.com/v3/profiles/${encodeURIComponent(pathSegment)}`,
    { headers, next: { revalidate: 3600 } }
  );
  if (!res.ok) return null;
  return (await res.json()) as GravatarV3Response;
}

async function fetchGravatarProfile(
  email: string,
  gravatarUsername: string | null
): Promise<GravatarProfile | null> {
  try {
    const apiKey = process.env.GRAVATAR_API_KEY;
    const emailHash = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');

    // Prefer dashboard "Profile" username (same as curl /v3/profiles/joescaduto); else SHA256(email).
    const data =
      (gravatarUsername?.trim() &&
        (await fetchGravatarProfileV3(gravatarUsername.trim(), apiKey))) ||
      (await fetchGravatarProfileV3(emailHash, apiKey));

    if (!data) return null;
    return mapGravatarV3ToProfile(data);
  } catch {
    return null;
  }
}

/**
 * Gravatar returns `header_image` as a full CSS `background` shorthand like:
 *   url('https://...?size=1024') no-repeat 50% 50% / 100%
 *
 * The ?size= URL requires the API key, which the browser can't add to a CSS
 * background-image request. We proxy it through /api/gravatar/header so
 * Next.js can attach the Authorization header and return the full-res image.
 */
function bannerStyle(headerImage?: string, backgroundColor?: string): CSSProperties {
  const base: CSSProperties = { backgroundColor: backgroundColor ?? '#e5e7eb' };
  if (!headerImage?.trim()) return base;

  // Pull the raw URL out of the CSS shorthand (e.g. url('https://...'))
  const urlMatch = headerImage.match(/url\(['"]?([^'")\s]+)['"]?\)/i);
  const rawUrl = urlMatch ? urlMatch[1] : (!headerImage.startsWith('url') ? headerImage.trim() : null);
  if (!rawUrl) return base;

  // Route through the server-side proxy so auth headers are added
  const proxied = `/api/gravatar/header?url=${encodeURIComponent(rawUrl)}`;

  return {
    ...base,
    backgroundImage: `url(${proxied})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ username: string }>;
};

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return { title: 'Not found' };

  const display = user.name ?? username;
  return {
    title: `Schedule with ${display}`,
    description: `Book a time with ${display}.`,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PublicSchedulingPage({ params }: Props) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      eventTypes: {
        where: { isActive: true, isPublic: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          duration: true,
          description: true,
          color: true,
        },
      },
    },
  });

  if (!user) notFound();

  const heading = user.name ?? username;

  // Full profile card — header_image requires GRAVATAR_API_KEY in env
  const gravatarProfile =
    user.showGravatar && user.showGravatarProfileCard
      ? await fetchGravatarProfile(user.gravatarEmail ?? user.email, user.gravatarUsername)
      : null;

  // Fallback avatar for when Gravatar is enabled but no profile card
  const avatarUrl = user.showGravatar && !gravatarProfile
    ? gravatarAvatarUrl(user.gravatarEmail ?? user.email)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">

        {/* ── Gravatar profile card ── */}
        {gravatarProfile ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8 overflow-hidden">

            {/* Banner / header image */}
            <div
              className="h-32 w-full bg-gray-200"
              style={bannerStyle(gravatarProfile.headerImage, gravatarProfile.backgroundColor)}
            />

            {/* Avatar — overlaps the banner */}
            <div className="px-6 -mt-10 mb-3 flex items-end gap-4">
              {gravatarProfile.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${gravatarProfile.avatarUrl}?s=160`}
                  alt={gravatarProfile.displayName ?? heading}
                  width={80}
                  height={80}
                  className="rounded-full ring-4 ring-white shadow-sm shrink-0"
                />
              )}
            </div>

            {/* Name, job title, location */}
            <div className="px-6 pb-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {gravatarProfile.displayName ?? heading}
              </h1>
              {(gravatarProfile.jobTitle || gravatarProfile.company) && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {[gravatarProfile.jobTitle, gravatarProfile.company].filter(Boolean).join(', ')}
                </p>
              )}
              {gravatarProfile.location && (
                <p className="text-sm text-gray-500 mt-0.5">{gravatarProfile.location}</p>
              )}
            </div>

            {/* Description / about */}
            {gravatarProfile.description && (
              <p className="px-6 pb-4 text-sm text-gray-700 leading-relaxed">
                {gravatarProfile.description}
              </p>
            )}

            {/* Verified accounts */}
            {gravatarProfile.verifiedAccounts && gravatarProfile.verifiedAccounts.length > 0 && (
              <div className="px-6 pb-4 flex flex-wrap gap-2">
                {gravatarProfile.verifiedAccounts.map((a) => (
                  <a
                    key={a.url}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 px-2.5 py-1 rounded-full"
                  >
                    {a.serviceIcon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.serviceIcon} alt="" width={12} height={12} className="shrink-0" />
                    )}
                    {a.serviceLabel}
                  </a>
                ))}
              </div>
            )}

            {/* Links */}
            {gravatarProfile.links && gravatarProfile.links.length > 0 && (
              <div className="px-6 pb-4 flex flex-wrap gap-2">
                {gravatarProfile.links.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2.5 py-1 rounded-full"
                  >
                    {l.label || l.url}
                  </a>
                ))}
              </div>
            )}

            {/* Footer link to full Gravatar profile */}
            {gravatarProfile.profileUrl && (
              <div className="border-t border-gray-100 px-6 py-3">
                <a
                  href={`${gravatarProfile.profileUrl}?utm_source=hovercard`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  View full Gravatar profile →
                </a>
              </div>
            )}
          </div>
        ) : (
          /* ── Simple header (avatar-only or plain text) ── */
          <header className="mb-8">
            {avatarUrl ? (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt={heading}
                  width={72}
                  height={72}
                  className="rounded-full ring-2 ring-white shadow-sm shrink-0"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
                  <p className="mt-0.5 text-sm text-gray-500">Select an event type to book a time.</p>
                </div>
              </div>
            ) : (
              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
                <p className="mt-1 text-sm text-gray-500">Select an event type to book a time.</p>
              </div>
            )}
          </header>
        )}

        {/* ── Event type list ── */}
        {gravatarProfile && (
          <p className="text-sm text-gray-500 mb-4">Select an event type to book a time.</p>
        )}

        {user.eventTypes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center text-sm text-gray-500">
            No public events are available right now.
          </div>
        ) : (
          <ul className="space-y-3">
            {user.eventTypes.map((et) => (
              <li key={et.id}>
                <Link
                  href={`/${username}/${et.slug}`}
                  className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow transition overflow-hidden group"
                >
                  <div className="h-1" style={{ backgroundColor: et.color }} />
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {et.title}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">{et.duration} minutes</p>
                      {et.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{et.description}</p>
                      )}
                    </div>
                    <span className="text-sm font-medium text-blue-600 shrink-0 pt-0.5 group-hover:text-blue-700">
                      Book →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
