# Design Document: Scheduling App (Next.js + Auth0)

**Version:** 1.0  
**Date:** March 1, 2026  
**Status:** Draft

---

## 1. Overview

This document outlines the architecture and design for a scheduling web application built with Next.js, modeled after Calendly. The app allows users to define their availability, share booking links, and let others schedule meetings with them — all secured via Auth0.

---

## 2. Goals & Non-Goals

### Goals
- Allow authenticated users to create and manage event types (e.g., "30-min call", "1-hr consultation")
- Let guests book time slots without needing an account
- Sync with external calendars (Google Calendar, Outlook) to detect conflicts
- Send automated confirmation and reminder emails
- Support Auth0 for user authentication and session management

### Non-Goals
- Native mobile apps (web only, responsive)
- Payment processing (out of scope for v1)
- Team/round-robin scheduling (v2)

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Auth | Auth0 (`@auth0/nextjs-auth0`) |
| Database | PostgreSQL via Prisma ORM |
| Styling | Tailwind CSS |
| Email | Resend (transactional email) |
| Calendar Sync | Google Calendar API, Microsoft Graph API |
| Deployment | Vercel |
| State Management | React Query (TanStack Query) |

---

## 4. Authentication with Auth0

### 4.1 Setup

The app uses the `@auth0/nextjs-auth0` v3 SDK with the Next.js App Router.

```
AUTH0_SECRET=<long-random-string>
AUTH0_BASE_URL=https://yourdomain.com
AUTH0_ISSUER_BASE_URL=https://<tenant>.auth0.com
AUTH0_CLIENT_ID=<client-id>
AUTH0_CLIENT_SECRET=<client-secret>
```

### 4.2 Route Handler

A catch-all Auth0 route handles login, logout, and callback:

```ts
// app/api/auth/[auth0]/route.ts
import { handleAuth } from '@auth0/nextjs-auth0';
export const GET = handleAuth();
```

### 4.3 Session & Middleware

Middleware protects all dashboard routes. Public routes (booking pages, landing) remain accessible without authentication.

```ts
// middleware.ts
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

export default withMiddlewareAuthRequired();

export const config = {
  matcher: ['/dashboard/:path*', '/api/user/:path*'],
};
```

### 4.4 Auth Flow

```
User → /login → Auth0 Universal Login → Callback → /dashboard
                                                  ↓
                                         Create user record in DB
                                         (if first login)
```

On first login, a `postLogin` action (Auth0 Action) or a check in the callback handler creates a corresponding user record in the PostgreSQL database, seeded with the Auth0 `sub` as the external ID.

---

## 5. Data Model

```prisma
model User {
  id            String        @id @default(cuid())
  auth0Id       String        @unique
  email         String        @unique
  name          String?
  username      String        @unique   // used in public booking URLs
  timezone      String        @default("UTC")
  eventTypes    EventType[]
  bookings      Booking[]
  calendarConns CalendarConnection[]
  createdAt     DateTime      @default(now())
}

model EventType {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id])
  title        String
  slug         String                        // e.g. "30-min-call"
  duration     Int                           // minutes
  description  String?
  color        String    @default("#0070f3")
  isActive     Boolean   @default(true)
  availability Json                          // weekly schedule config
  bookings     Booking[]
  createdAt    DateTime  @default(now())

  @@unique([userId, slug])
}

model Booking {
  id          String      @id @default(cuid())
  eventTypeId String
  eventType   EventType   @relation(fields: [eventTypeId], references: [id])
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  guestName   String
  guestEmail  String
  startTime   DateTime
  endTime     DateTime
  status      BookingStatus @default(PENDING)
  cancelToken String      @unique @default(cuid())
  notes       String?
  createdAt   DateTime    @default(now())
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
}

model CalendarConnection {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  provider     String   // "google" | "outlook"
  accessToken  String
  refreshToken String
  expiresAt    DateTime
}
```

---

## 6. Application Structure

```
app/
├── (auth)/
│   └── api/auth/[auth0]/route.ts        # Auth0 handler
├── (public)/
│   └── [username]/
│       └── [eventSlug]/
│           ├── page.tsx                 # Guest booking page
│           └── confirmed/page.tsx       # Booking confirmation
├── dashboard/
│   ├── layout.tsx                       # Protected layout
│   ├── page.tsx                         # Overview / upcoming bookings
│   ├── event-types/
│   │   ├── page.tsx                     # List event types
│   │   └── [id]/page.tsx               # Edit event type
│   ├── availability/page.tsx            # Set weekly availability
│   ├── bookings/page.tsx                # Booking history
│   └── settings/page.tsx               # Profile, calendar connections
├── api/
│   ├── event-types/route.ts
│   ├── bookings/route.ts
│   └── availability/route.ts
components/
├── ui/                                  # Shared UI primitives
├── booking/                             # Guest-facing booking flow
│   ├── CalendarPicker.tsx
│   ├── TimeSlotGrid.tsx
│   └── BookingForm.tsx
├── dashboard/
│   ├── EventTypeCard.tsx
│   └── UpcomingBookings.tsx
lib/
├── prisma.ts                            # Prisma client singleton
├── auth0.ts                             # Auth0 helpers
├── availability.ts                      # Slot generation logic
└── calendar/
    ├── google.ts
    └── outlook.ts
```

---

## 7. Key Features & Implementation Notes

### 7.1 Availability & Slot Generation

The host defines a weekly availability schedule (stored as JSON on `EventType`):

```json
{
  "monday":    { "enabled": true,  "start": "09:00", "end": "17:00" },
  "tuesday":   { "enabled": true,  "start": "09:00", "end": "17:00" },
  "wednesday": { "enabled": false },
  ...
}
```

When a guest visits a booking page, the API:
1. Fetches the host's availability schedule
2. Queries the connected calendar for existing events (busy times)
3. Queries confirmed bookings from the database
4. Returns available time slots by subtracting busy periods from the availability window

### 7.2 Guest Booking Flow

```
Guest visits /{username}/{eventSlug}
→ Sees calendar (next 60 days)
→ Selects a date → sees available time slots
→ Fills in name, email, optional notes
→ Submits → booking created (CONFIRMED)
→ Confirmation emails sent to host and guest
→ Redirected to /confirmed page with cancel link
```

### 7.3 Email Notifications

Using Resend with React Email templates. Emails sent on:
- New booking (to host and guest)
- Cancellation (to both parties)
- 24-hour reminder (via a cron job on Vercel)

### 7.4 Calendar Sync

OAuth tokens for Google/Outlook are stored in `CalendarConnection`. The app uses these to:
- Read busy times when generating available slots
- Create calendar events on confirmed bookings
- Delete events on cancellation

Tokens are refreshed automatically using the stored refresh token when the access token expires.

---

## 8. API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/event-types` | Required | List authenticated user's event types |
| POST | `/api/event-types` | Required | Create a new event type |
| PATCH | `/api/event-types/[id]` | Required | Update an event type |
| DELETE | `/api/event-types/[id]` | Required | Delete an event type |
| GET | `/api/availability/[username]/[slug]` | Public | Get available slots for a date range |
| POST | `/api/bookings` | Public | Create a booking (guest-facing) |
| GET | `/api/bookings` | Required | List the host's bookings |
| DELETE | `/api/bookings/[id]?token=[cancelToken]` | Token | Cancel a booking |
| POST | `/api/calendar/connect` | Required | Initiate calendar OAuth |
| GET | `/api/calendar/callback` | Required | Handle calendar OAuth callback |

---

## 9. Security Considerations

- All dashboard routes and user-scoped API routes are protected via Auth0 middleware
- Booking cancellation is protected by a unique `cancelToken` (UUID), not by auth, so guests can cancel without an account
- Calendar OAuth tokens are stored encrypted at rest (using a KMS key or Prisma field encryption)
- Rate limiting applied to the public `/api/availability` and `/api/bookings` endpoints (via Vercel Edge middleware)
- CSRF protection handled automatically by Auth0 SDK

---

## 10. Environment Variables

```bash
# Auth0
AUTH0_SECRET=
AUTH0_BASE_URL=
AUTH0_ISSUER_BASE_URL=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# Database
DATABASE_URL=

# Email
RESEND_API_KEY=

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft / Outlook
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

---

## 11. Future Considerations (v2)

- **Team scheduling:** round-robin or collective event types
- **Payments:** Stripe integration for paid bookings
- **Embeddable widget:** iframe or web component for external sites
- **Custom domains:** allow users to serve their booking page at their own domain
- **Analytics dashboard:** booking conversion rates, popular time slots