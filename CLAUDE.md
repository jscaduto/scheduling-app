# CLAUDE.md

## Project
Calendly-like scheduling app. See @docs/architecture.md for full design.

## Stack
- Next.js 16 App Router, TypeScript, Tailwind CSS
- Auth0 via @auth0/nextjs-auth0 v4 (Auth0Client in `src/lib/auth0.ts`)
- Prisma 7 + PostgreSQL (adapter-based — no Rust engine)
- Resend for email

## Commands
- `npm run dev` — start dev server
- `npm run lint` — run ESLint
- `npm run typecheck` — run tsc
- `npx prisma db push` — sync schema
- `npx prisma studio` — inspect database
- `docker compose up --build` — run full stack (app + postgres)

## Pre-commit hooks
Husky + lint-staged run automatically on `git commit`:
- ESLint (--fix) on staged `.ts`/`.tsx` files
- TypeScript check (`tsc --noEmit`) on full project

## Conventions
- All protected routes live under `app/dashboard/`
- Public booking pages live under `app/(public)/[username]/[eventSlug]/`
- API routes mirror the structure in the design doc
- Use server components by default; add "use client" only when needed
- Auth0 user `sub` is stored as `auth0Id` on the User model; user DB record is provisioned in the `onCallback` hook in `src/lib/auth0.ts`
- Auth0 v4 routes are at `/auth/*` (login, logout, callback) — handled automatically by `proxy.ts`, no route handler needed
- Use `auth0.getSession()` in server components; `useSession()` from `@auth0/nextjs-auth0/client` in client components
- Dashboard protection lives in `src/app/dashboard/layout.tsx` (redirects to `/auth/login` if no session)
- Protect API routes by wrapping handlers with `withAuth()` from `src/lib/with-auth.ts`

## Testing
- Run `npm test` for unit tests
- Typecheck and lint run automatically via pre-commit hook

## Deployment
- Use Github Actions for a Pipeline