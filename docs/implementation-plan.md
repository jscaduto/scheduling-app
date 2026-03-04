# Implementation Plan

## Phase 1 — Foundation
- [x] Install and configure Auth0 (`@auth0/nextjs-auth0`)
- [x] Set up Prisma schema from design doc
- [x] Implement Auth0 middleware for dashboard routes
- [x] Create user provisioning on first login

## Phase 2 — Core Features
- [x] Event type CRUD (API + dashboard UI)
- [x] Availability schedule builder
- [x] Slot generation algorithm
- [x] Guest booking page (`/[username]/[eventSlug]`)
- [x] Booking confirmation + cancel flow

## Phase 3 — Integrations
- [x] Google Calendar OAuth + busy time sync
- [x] Resend email notifications

## Phase 4 - Deployement
- [] Add Terraform for AWS Deployment using ECS