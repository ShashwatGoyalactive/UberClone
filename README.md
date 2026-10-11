# Comet

A real-time ride-hailing platform: **Comet** for riders, **Comet Pilot** for drivers, and **Comet Ops** for admins. Live tracking, a wallet with UPI and cash, and a safety suite (SOS, live trip sharing, women-only rides).

> Work in progress — being rebuilt from the ground up. The original 2025 version (Express + MongoDB + Socket.io) lives in this repo's history.

## Stack

- **Next.js 16** (App Router, Server Actions), **React 19**, **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**, themed with Comet's design tokens
- **Supabase** — Postgres + PostGIS, Auth, Realtime, Storage
- **Prisma 7** with the `pg` driver adapter
- **Mapbox** for maps, place search and routing
- **Razorpay** in test mode — no real money moves
- **Vitest** (unit + integration against real Postgres) and **Playwright** (end to end)

## Running locally

Requires Node 22+ and Docker.

```bash
npm install
npm run db:start          # local Supabase in Docker
cp .env.example .env.local  # then fill in from `npx supabase status`
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000 and choose **Try as rider** or **Try as Pilot** — no sign-up needed.

## Checks

```bash
npm test                  # unit
npm run db:test:up        # throwaway PostGIS on :54330
npm run test:integration  # integration
npm run test:e2e          # end to end (needs local Supabase)
npm run lint && npm run typecheck && npm run build
```

## Environments

`dev → qa → stage → prod`, promoted by fast-forward only. CI runs typecheck, lint, formatting, unit and integration tests, and a secret-free build on every push and pull request.
