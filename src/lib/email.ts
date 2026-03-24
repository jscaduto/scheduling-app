import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? 'Scheduling App <noreply@resend.dev>';
const BASE = process.env.APP_BASE_URL!;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BookingEmailPayload = {
  guestName: string;
  guestEmail: string;
  hostName: string | null;
  hostEmail: string;
  eventTitle: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  cancelToken: string;
  username: string;
  eventSlug: string;
  notes?: string | null;
  guestPhone?: string | null;
  locationLink?: string;
  guestTimezone?: string;
  hostTimezone?: string;
};

export type CancellationEmailPayload = {
  guestName: string;
  guestEmail: string;
  hostName: string | null;
  hostEmail: string;
  eventTitle: string;
  startTime: Date;
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatDateTime(date: Date, timezone?: string): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
    year:    'numeric',
    hour:    'numeric',
    minute:  '2-digit',
    timeZoneName: 'short',
    ...(timezone ? { timeZone: timezone } : {}),
  });
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function confirmationGuestHtml(p: BookingEmailPayload): string {
  const cancelUrl = `${BASE}/${p.username}/${p.eventSlug}/cancel?token=${p.cancelToken}`;
  return `
    <p>Hi ${p.guestName},</p>
    <p>Your booking is confirmed.</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Event</td><td><strong>${p.eventTitle}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">With</td><td>${p.hostName ?? p.hostEmail}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">When</td><td>${formatDateTime(p.startTime, p.guestTimezone)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Duration</td><td>${p.duration} minutes</td></tr>
      ${p.notes ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Notes</td><td>${p.notes}</td></tr>` : ''}
      ${p.locationLink ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Join</td><td><a href="${p.locationLink}">${p.locationLink}</a></td></tr>` : ''}
    </table>
    <p>Need to cancel? <a href="${cancelUrl}">Cancel this booking</a></p>
  `.trim();
}

function confirmationHostHtml(p: BookingEmailPayload): string {
  return `
    <p>Hi ${p.hostName ?? 'there'},</p>
    <p>You have a new booking.</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Event</td><td><strong>${p.eventTitle}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Guest</td><td>${p.guestName} &lt;${p.guestEmail}&gt;</td></tr>
      ${p.guestPhone ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Phone</td><td>${p.guestPhone}</td></tr>` : ''}
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">When</td><td>${formatDateTime(p.startTime, p.hostTimezone)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Duration</td><td>${p.duration} minutes</td></tr>
      ${p.notes ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Notes</td><td>${p.notes}</td></tr>` : ''}
      ${p.locationLink ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Join</td><td><a href="${p.locationLink}">${p.locationLink}</a></td></tr>` : ''}
    </table>
  `.trim();
}

function cancellationHtml(p: CancellationEmailPayload, recipientName: string): string {
  return `
    <p>Hi ${recipientName},</p>
    <p>The following booking has been cancelled.</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Event</td><td><strong>${p.eventTitle}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Guest</td><td>${p.guestName}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Was scheduled for</td><td>${formatDateTime(p.startTime)}</td></tr>
    </table>
  `.trim();
}

// ---------------------------------------------------------------------------
// Public send functions (failures are non-fatal — callers should catch)
// ---------------------------------------------------------------------------

export async function sendBookingConfirmation(p: BookingEmailPayload): Promise<void> {
  await Promise.all([
    resend.emails.send({
      from:    FROM,
      to:      p.guestEmail,
      subject: `Booking confirmed: ${p.eventTitle} with ${p.hostName ?? p.hostEmail}`,
      html:    confirmationGuestHtml(p),
    }),
    resend.emails.send({
      from:    FROM,
      to:      p.hostEmail,
      subject: `New booking: ${p.eventTitle} with ${p.guestName}`,
      html:    confirmationHostHtml(p),
    }),
  ]);
}

export async function sendBookingCancellation(p: CancellationEmailPayload): Promise<void> {
  await Promise.all([
    resend.emails.send({
      from:    FROM,
      to:      p.guestEmail,
      subject: `Booking cancelled: ${p.eventTitle}`,
      html:    cancellationHtml(p, p.guestName),
    }),
    resend.emails.send({
      from:    FROM,
      to:      p.hostEmail,
      subject: `Booking cancelled: ${p.eventTitle} with ${p.guestName}`,
      html:    cancellationHtml(p, p.hostName ?? 'there'),
    }),
  ]);
}
