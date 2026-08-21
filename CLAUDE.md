# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # vite --port=3000 --host=0.0.0.0 — dev server with local auth API
npm run build    # vite build && node scripts/prepare-sites-build.mjs
npm run preview  # vite preview — serve the production build locally
npm run lint      # tsc --noEmit — this is the only lint/typecheck step; there is no ESLint config
```

There is no test runner configured (no Jest/Vitest, no test script). Verify changes with `npm run lint` and by running the app.

To view the shared UI component library in isolation, run `npm run dev` and open `/ui-preview.html` (entry: `src/ui-preview.tsx`) — no login required. This harness is excluded from the production bundle.

## Architecture

This is a frontend export from Google AI Studio: a multi-tenant nail/beauty salon SaaS admin console ("SalonSys") with three role-based portals — Superadmin, Tenant Admin, Receptionist. React 19 + TypeScript, Vite 6, Tailwind CSS v4.

### No router, one state tree

There is no `react-router`. The current screen is plain React state (`activeTab` in `src/App.tsx`), not the URL — the browser Back button and bookmarking do not work as a normal SPA would. `src/App.tsx` (~1,900 lines) is the single source of truth for almost all app state: tenants, packages, invoices, alerts, tickets, tenant admins, and package-upgrade-requests all live here as `useState`, with a large number of `useEffect` hooks that:
- sync each piece of state to `localStorage`,
- run business logic that would normally belong to a backend (auto-expiring subscriptions, auto-generating invoices, migrating legacy tenant/invoice records to newer schema fields, writing audit log entries).

When touching business rules for tenants/packages/invoices, expect to find the logic inside `App.tsx`'s effects, not in the component that renders the screen.

### Two real backends already exist, but only cover auth + one endpoint

Most domain data (tenants, packages, invoices, technicians, appointments, inventory, staff, etc.) is **mock data only**, seeded once from `src/data.ts` / `src/mockData/` into `localStorage` via "seed-once" guards (e.g. `loadTenantsWithOneTimeMocks`, `loadAlertsWithOneTimeMocks` in `App.tsx`) and persisted purely client-side from then on.

However, **authentication and package-upgrade-requests are wired to real backends**, in two parallel implementations:
- **Dev** (`npm run dev`): `scripts/vite-local-auth.ts`, a Vite plugin that serves `/api/auth/login|session|logout` with hard-coded demo accounts and in-memory sessions (lost on restart).
- **Production**: `scripts/sites-worker.js`, a Cloudflare Worker using D1 (SQLite), serving `/api/auth/*` and `/api/package-upgrade-requests` with real password hashing, session cookies, account lockout, and role-based authorization. It's copied into `dist/server/index.js` by `scripts/prepare-sites-build.mjs` during `npm run build`, alongside `.openai/hosting.json` (Cloudflare D1 binding config).

`db/schema.ts` and `drizzle/*.sql` describe the same tables as `sites-worker.js` but are **not wired to any tooling** (no `drizzle-orm`/`drizzle-kit` dependency) — they're manually-kept-in-sync documentation, not an executed migration path.

Frontend calls to these real endpoints go through `src/utils/authApi.ts` and `src/utils/packageUpgradeRequests.ts` — these are the pattern to follow if adding a new domain that talks to a real API: isolate `fetch` calls in a `utils/*.ts` module with typed responses and non-throwing fallbacks, keep the calling component free of `fetch` details.

### Design system and shared UI components

`src/index.css` (~5,600 lines) defines the full token system via Tailwind v4's `@theme static` block — typography, spacing, radius, shadow, z-index, motion, and one `--accent` per role shell (Superadmin indigo, Tenant Admin pink, Receptionist green). `src/components/ui/` holds the shared primitive/composite components (`Button`, `Field`, `Modal`, `DataTable`, `StatusBadge`) — check here before adding new UI primitives to a screen; `StatusBadge`'s `STATUS_MAP` is the single place status→label/tone/icon mapping should live (don't create a second mapping table per screen).

`README.md` is the project's own 26-chapter UI/UX design specification (in Vietnamese) — the binding reference for typography scale, spacing, color roles, component states, accessibility, and responsive rules. `README-MIGRATION.md` tracks an in-progress effort to bring existing screens into compliance with that spec (token consolidation done; component library done; screen-by-screen migration ~3/38 complete) and documents hard constraints for that work: don't invent a new design system, don't change fonts/icons/role accents, no decorative gradients/blur/glassmorphism, no full-screen backdrop `<button>` overlays, and — importantly — **don't change business logic, API, database, data model, authentication, or permissions** as part of UI migration work. Read `README-MIGRATION.md` §11 before doing any UI cleanup pass.

### Known structural issues to be aware of

- Several screen components are very large (`TenantAdminOnlineBooking.tsx` ~3,800 lines, `TenantAdminInventory.tsx` ~3,100 lines, `TenantAdminFinanceCompact.tsx` ~2,800 lines) — UI and data-fetching concerns are not separated.
- `src/components/TenantAdminPortal.tsx` is dead code (not imported anywhere; `App.tsx` imports `NailTenantAdminPortal` instead). `src/components/TenantAdminFinance.tsx` is a 4-line re-export shim for `TenantAdminFinanceCompact`.
- Both `package-lock.json` (npm) and `bun.lock` (bun) are present — pick one when adding dependencies.
- Path alias `@/*` maps to the repo root (see `tsconfig.json` / `vite.config.ts`).
