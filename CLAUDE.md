# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # vite --port=3000 --host=0.0.0.0 — proxies /api to the .NET backend
npm run build        # vite build — SPA only
npm run build:legacy # vite build + scripts/prepare-sites-build.mjs — the superseded Cloudflare Worker bundle
npm run build:server # build, then copy dist/ into the backend's wwwroot — one port, one command
npm run preview      # vite preview — serve the production build locally
npm run lint         # tsc --noEmit — this is the only lint/typecheck step; there is no ESLint config
npm run rehearsal    # node scripts/rehearsal.mjs — 174-step end-to-end pass over the running backend
```

There are two ways to run the whole thing, and they are for different situations.

**Developing** — two processes, two ports. `npm run dev` serves the UI on 3000 and proxies `/api` to the backend on 5282, so you get HMR. Start the backend first or every API call 502s.

**Presenting** — one process, one port. `npm run build:server` builds the UI and copies it into `NailManagement.API/wwwroot`; from then on `dotnet run` alone serves both the UI and the API on http://localhost:5282, and Node is not needed at all. `Program.cs` only serves static files when `wwwroot/index.html` exists, so a machine without a build behaves exactly as before. Re-run `build:server` after any frontend change — the copied bundle does not update itself.

The SPA fallback deliberately sits *after* the `/api/{**path}` fallback: `/api/*` keeps returning the JSON error contract instead of an HTML page, because a mistyped endpoint that answers with HTML makes the frontend report "unreadable response" rather than "no such endpoint".

There is no unit-test runner in **this** repo (no Jest/Vitest). Verify frontend changes with `npm run lint` and by running the app. The backend is a separate solution with its own xUnit suite — see below.

`npm run rehearsal` is a different thing from that xUnit suite, and the difference is the point. xUnit builds the server in-memory on a throwaway database; the rehearsal script drives the **running** server on the **real** demo database, walking all three roles and pressing on each rule boundary (package limits, tenant isolation, write-blocking when expired, the appointment status graph, the money formulas). It therefore catches what only the real environment gets wrong — demo data that has drifted out of date, or an endpoint behaving differently under actual configuration. It needs the backend up and the demo seed intact, exits non-zero on any failed step, and **leaves one throwaway tenant behind per run** (BR-DEL-001 forbids hard deletes, so it does not clean up). Rebuild from zero afterwards:

```bash
dotnet ef database drop --force --project NailManagement.Infrastructure --startup-project NailManagement.API
```

Both seeders now run only when the environment is Development **and** `DemoSeed:Enabled` is set — see `NailManagement.API/Startup/DemoSeedPolicy.cs`. The flag ships turned on in `appsettings.Development.json`, so a dev machine behaves as before; anywhere else the server creates nothing and expects `Bootstrap__AdminEmail` / `Bootstrap__AdminPassword` instead.

Note that `DemoDataSeeder` builds its history backwards from the moment it runs, so everything in it is anchored to the day you seeded. It also lays down seven days of appointments *ahead* of that moment (`DemoDataSeeder.UpcomingDays`), which is what keeps the receptionist desk from being empty on a database seeded earlier in the week — those future appointments stop at PENDING/CONFIRMED and carry no invoices, so revenue figures are unaffected. Past a week, re-seed. And re-seeding means dropping first: the seeder only runs when the `Packages` table is empty, so an existing database never grows the new rows on its own.

The dev server only proxies `/api`; it does not serve it. Start the backend first, or every API call 502s:

```bash
dotnet run --project C:/Users/letru/source/repos/NailManagement/NailManagement.API --launch-profile http
```

To view the shared UI component library in isolation, run `npm run dev` and open `/ui-preview.html` (entry: `src/ui-preview.tsx`) — no login required. This harness is excluded from the production bundle.

## Architecture

This is a frontend export from Google AI Studio: a multi-tenant nail/beauty salon SaaS admin console ("SalonSys") with three role-based portals — Superadmin, Tenant Admin, Receptionist. React 19 + TypeScript, Vite 6, Tailwind CSS v4.

### No router, one state tree

There is no `react-router`. The current screen is plain React state (`activeTab` in `src/App.tsx`), not the URL — the browser Back button and bookmarking do not work as a normal SPA would. `src/App.tsx` (~1,440 lines) still holds most app state as `useState`, with `useEffect` hooks that sync each piece to `localStorage` and run business logic that would normally belong to a backend (auto-expiring subscriptions, auto-generating invoices, writing audit log entries).

That is shrinking. Tenants now come from the real API via `useTenants` / `useMyTenant`; `alerts`, `tickets`, `announcements`, `systemSettings` and `themeMode` are deliberately staying in `localStorage` for the MVP. When touching business rules for the *unmigrated* domains, expect the logic inside `App.tsx`'s effects, not in the component that renders the screen — but do not add new logic there for a domain that already has a service and hook.

### The real backend is a separate ASP.NET Core solution

The backend lives **outside this repo**, at `C:\Users\letru\source\repos\NailManagement` — a five-project ASP.NET Core 10 solution (`Domain` · `Application` · `Infrastructure` · `API` · `Tests`) on EF Core + SQL Server 2022, following Clean Architecture: use cases are classes with `ExecuteAsync()`, with their own DTOs, mappers, and repository ports.

`vite.config.ts` proxies `/api` to `http://localhost:5282` (override with `API_ORIGIN`). Same-origin proxying is deliberate — it keeps the `SameSite=Strict` session cookie working and means the backend opens CORS for nobody.

Roughly 51 endpoints across 14 controllers cover auth/sessions, tenants, branches, services, staff, customers, appointments, sales invoices and payments, revenue reporting, audit logs, and session administration. Sessions are a cookie plus an `AppSessions` table (not JWT), so account status is re-checked on every request. `dotnet test` runs an xUnit suite (115 tests) that drives the real server in-memory over HTTP against a throwaway `NailManagementTests` database on the same SQL Server instance.

Test layout: `Infrastructure/` is the harness (client, factory, throwaway DB, xUnit collection); `Scenarios/SalonScenario.cs` builds business data (appointments, invoices) and is shared via `using static`. That sharing is load-bearing, not cosmetic — every test class books for the same technician, so `SalonScenario.NextSlot()` must stay the *single* slot counter for the whole run or classes collide on BR-APT-011 and go red for reasons unrelated to what they test. Its 8-hour slot spacing is load-bearing too, and for a less obvious reason: the scenario books whichever service the catalogue returns *first*, `ServiceRepository` orders by name **in the database**, and Vietnamese collation sorts "Combo" (200 minutes) ahead of "Chăm sóc" (55 minutes) because Vietnamese treats "Ch" as a letter after "C". Spacing must therefore clear the *longest* service in the seed, not the one that happens to sort first — a 2-hour gap turned 11 tests red the day the server collation changed. Test classes themselves are grouped by rule area: `Authorization/`, `Isolation/`, `Appointments/`, `Invoices/`, `Payments/`, `Sessions/`.

**Do not add business logic to `scripts/sites-worker.js` or `db/schema.ts`.** Those are the pre-backend Cloudflare Worker + D1 prototype and its hand-written schema; both are superseded and kept only as history. `scripts/vite-local-auth.ts` is likewise dead — the plugin was removed from `vite.config.ts` because it intercepted `/api/auth/*` before the proxy could run. It survives only as a place to look up the three demo accounts.

### How screens talk to the API

Not every screen is connected yet. Connected so far: login and tenant-picking, `TenantManagement`, `TenantAdminManagement` (branches), `TenantAdminServices`, `TenantAdminStaff`, `TenantAdminCustomers`, `ReceptionistPortal` (appointments, technicians roster, service catalogue, invoices and payments), `TenantAdminReports` (the revenue tab), `TenantAdminOverview`, `Overview` (Superadmin platform revenue), and `SecurityAndLogs` (audit log list and the live sessions tab). Everything else still runs on `localStorage` mock data and carries a "Dữ liệu mẫu — chưa nối máy chủ" notice.

Those notices are **not** written into each screen. Each portal keeps one `MOCK_DATA_REASONS` table next to where it picks the screen — `App.tsx`, `NailTenantAdminPortal`, `ReceptionistPortal` — and renders `<MockDataNotice>` from it, so connecting a screen means deleting one line rather than hunting for a banner inside a multi-thousand-line file. Three screens keep their own inline notice on purpose, because theirs is about a *part* of the page rather than the whole: `stations`, `pos`, and `reports` (only the non-revenue tabs are mock). The sessions tab of `SecurityAndLogs` used to be a fourth; it lost its notice on 03/09 when session administration went live.

Money is VND-only (BR-VAL-003). `CurrencyCode` is a one-member union, deliberately kept as a type so `tsc` rejects the next `'USD'` someone writes; there is no `convertMoney` and no exchange rate. `formatMoney`'s second argument survives only because 86 call sites pass a record's currency field.

`ReceptionistPortal` is the one to read before connecting anything else — it is ~6,100 lines and was migrated without rewriting its render tree. Two ideas carried the whole thing: an **adapter** (`toReceptionAppointment`, `toReceptionPayment`) that redresses server DTOs into the shapes the existing JSX already reads, and a small **client-side extras map** for the handful of fields the backend deliberately has no column for (attendance, allergies, reminders — all cut in §9.4 of the roadmap). Deleting the old `setAppointments` / `setPayments` setters outright turned `tsc` into the checklist of every write path that needed rewiring.

The pattern for connecting a new domain is two layers, and both already exist to copy from:

- `src/services/*.ts` — typed `fetch` wrappers over `apiClient.ts`. **These never swallow errors.** `src/utils/authApi.ts` is the old shape that returned `null` for both "not logged in" and "server is down"; `src/services/auth.ts` replaced it precisely because callers could not tell those apart.
- `src/hooks/use*.ts` — one hook per domain, owning load/refetch state so the screen stays free of `fetch` details.

`README-BACKEND-ROADMAP.md` is the day-by-day plan and running log for this work, including which decisions were made and why. Read it before changing backend-facing behavior; `README-BUSINESS-RULES.md` is the binding source of truth for the business rules themselves (`BR-*` codes).

### Design system and shared UI components

`src/index.css` (~7,700 lines) defines the full token system via Tailwind v4's `@theme static` block — typography, spacing, radius, shadow, z-index, motion, and one `--accent` per role shell (Superadmin indigo, Tenant Admin pink, Receptionist green). `src/components/ui/` holds the shared primitive/composite components (`Button`, `Field`, `Modal`, `DataTable`, `StatusBadge`) — check here before adding new UI primitives to a screen; `StatusBadge`'s `STATUS_MAP` is the single place status→label/tone/icon mapping should live (don't create a second mapping table per screen).

`README.md` is the project's own 15-section state-of-the-source document (in Vietnamese) — what runs where, which screens are connected, which are still mock, and how to start both processes. It promises to match the source, so correct it when you change behaviour rather than letting it drift. `README-MIGRATION.md` tracks an in-progress effort to bring existing screens into compliance with the design system in `src/index.css` and `src/components/ui/` (token consolidation done; component library done; screen-by-screen migration ~3/38 complete) and documents hard constraints for that work: don't invent a new design system, don't change fonts/icons/role accents, no decorative gradients/blur/glassmorphism, no full-screen backdrop `<button>` overlays, and — importantly — **don't change business logic, API, database, data model, authentication, or permissions** as part of UI migration work. Read `README-MIGRATION.md` §11 before doing any UI cleanup pass.

### Known structural issues to be aware of

- Several screen components are very large (`TenantAdminOnlineBooking.tsx` ~3,800 lines, `TenantAdminInventory.tsx` ~3,100 lines, `TenantAdminFinanceCompact.tsx` ~2,800 lines) — UI and data-fetching concerns are not separated.
- `src/components/TenantAdminPortal.tsx` is dead code (not imported anywhere; `App.tsx` imports `NailTenantAdminPortal` instead). `src/components/TenantAdminFinance.tsx` is a 4-line re-export shim for `TenantAdminFinanceCompact`.
- npm is the package manager; `bun.lock` was deleted deliberately, don't reintroduce it.
- Path alias `@/*` maps to the repo root (see `tsconfig.json` / `vite.config.ts`).
- `tsconfig.json` excludes `claude-skills/` — an unrelated, gitignored tool checkout that `tsc` would otherwise scan and report module errors for. Leave the exclude in place.
