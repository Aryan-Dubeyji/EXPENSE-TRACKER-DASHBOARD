# Finlytic — Technical Documentation

## 1. Project Objectives

Finlytic is a personal finance dashboard designed to demonstrate genuine full-stack product engineering: a modern React frontend, a clean typed data layer that mirrors REST semantics, robust form validation, responsive design, and a polished visual system. It is scoped to be realistic enough for internship-portfolio evaluation while remaining a single deployable web application.

## 2. Architecture Overview

Finlytic follows a **client-centric single-page architecture** built on TanStack Start (file-based React routing with SSR support). The application is composed of four concerns:

1. **UI layer** — routes, layouts, and presentation components
2. **State/context layer** — `AuthContext` and a small store-subscription primitive
3. **Data layer** — a typed CRUD API (`src/lib/store.ts`) persisting to `localStorage`
4. **Validation layer** — Zod schemas at every write boundary

The data layer is intentionally shaped like a REST client so it can be replaced by a real Node/Express + MongoDB backend without touching the UI.

```text
┌──────────────────────────────────────────────────────┐
│                    Browser (SPA)                     │
│  ┌────────────┐   ┌───────────────┐   ┌───────────┐  │
│  │  Routes    │──▶│  Contexts     │──▶│  Store    │  │
│  │  (pages)   │   │  (Auth, etc.) │   │  (CRUD)   │  │
│  └────────────┘   └───────────────┘   └─────┬─────┘  │
│                                             │        │
│                                       ┌─────▼─────┐  │
│                                       │localStorage│ │
│                                       └───────────┘  │
└──────────────────────────────────────────────────────┘
```

## 3. Folder Structure

```
src/
  components/
    ui/                  shadcn primitives
    app-sidebar.tsx      Desktop sidebar + mobile bottom nav
    stat-card.tsx        Dashboard KPI card
    expense-dialog.tsx   Add/edit expense modal
    income-dialog.tsx    Add/edit income modal
  lib/
    types.ts             Domain types + default categories
    store.ts             Data layer (CRUD, auth, seed, export/import)
    auth-context.tsx     React auth context
    format.ts            Currency/date formatters, month helpers
    utils.ts             cn() classname helper
  routes/
    __root.tsx           Root shell + providers + toaster
    auth.tsx             Public auth page (login + register)
    _app.tsx             Authenticated layout (sidebar + guard)
    _app.index.tsx       /            Dashboard
    _app.expenses.tsx    /expenses
    _app.income.tsx      /income
    _app.budgets.tsx     /budgets
    _app.analytics.tsx   /analytics
    _app.settings.tsx    /settings
  styles.css             Tailwind v4 theme, tokens, gradients, shadows
  router.tsx             Router factory (QueryClient in context)
```

## 4. Frontend Architecture

The app uses TanStack Router's file-based routing. Every protected page lives under the pathless `_app` layout, which mounts the sidebar, checks the session, and redirects unauthenticated users to `/auth`. Public routes (currently just `/auth`) live at the top level.

Presentation is built with **shadcn/ui** primitives (Radix under the hood) styled by the design system in `src/styles.css`. All colors, gradients, and shadows are semantic OKLCH tokens; no component embeds hex or Tailwind color literals.

State is intentionally minimal:

- **Auth state** — `AuthContext` (session + login/register/logout)
- **App data** — read through `useStoreSnapshot(selector)` which is a thin wrapper around `useSyncExternalStore` so any mutation via the store triggers re-render across every consumer.

## 5. Backend Architecture (data layer)

`src/lib/store.ts` is the "backend". It exposes CRUD functions per entity and a simple pub-sub emitter so React can subscribe to changes. Passwords are hashed client-side using **SHA-256 with a fixed salt** via the Web Crypto API before being written to `localStorage`. Sessions are persisted under `et.session`.

To upgrade to a real backend:

1. Replace each `getX` / `saveX` / `deleteX` with a `fetch` to `/api/...`
2. Move password hashing server-side (bcrypt) and use JWT for sessions
3. Persist JWT in an httpOnly cookie
4. Keep the UI unchanged

## 6. Database Schema (logical)

```ts
User      { id, name, email, passwordHash, createdAt }
Expense   { id, userId, title, amount, category, date, paymentMethod, notes, createdAt }
Income    { id, userId, source, amount, category, date, notes, createdAt }
Budget    { id, userId, category, monthlyLimit, createdAt }
Category  { id, userId, name, kind: "expense" | "income" }
```

Relationships: `User 1—∞ Expense/Income/Budget/Category`. In a Mongo implementation each collection would be indexed on `userId`.

## 7. Authentication Flow

```
Register  → hash(pw) → users[] → session ← redirect to /
Login     → hash(pw) → match user → session ← redirect to /
_app      → guard checks session → allow or redirect to /auth
Logout    → clear session
```

Password strength is enforced client-side (min 6 chars) and validated with Zod at every submission.

## 8. REST-Style API Reference (logical)

The store surface mirrors a canonical REST API. If a Node/Express server is bolted on, endpoints would be:

```
POST   /api/auth/register    → { name, email, password }
POST   /api/auth/login       → { email, password }
GET    /api/auth/profile
POST   /api/auth/password    → { current, next }

GET    /api/expenses
POST   /api/expenses
PUT    /api/expenses/:id
DELETE /api/expenses/:id

GET    /api/income
POST   /api/income
PUT    /api/income/:id
DELETE /api/income/:id

GET    /api/budgets
POST   /api/budgets
DELETE /api/budgets/:id

GET    /api/dashboard        → aggregated stats for the current user
```

## 9. State Management

- **Auth** — React context, updated after login/register/logout
- **Domain data** — `useStoreSnapshot` (built on `useSyncExternalStore`) subscribing to a lightweight emitter fired by every write in `store.ts`
- **Ephemeral UI** — component-local `useState`

TanStack Query is available in the stack but not required for the localStorage build; it becomes valuable the moment a real API is introduced.

## 10. Component Hierarchy

```
__root
 └─ AuthProvider
     ├─ /auth               → AuthPage
     └─ _app  (guarded)     → AppSidebar + MobileNav + <Outlet />
         ├─ index           → Dashboard
         ├─ expenses        → Filters + Table + ExpenseDialog
         ├─ income          → Filters + List + IncomeDialog
         ├─ budgets         → BudgetCards + Create modal
         ├─ analytics       → 4 Recharts panels
         └─ settings        → Profile, appearance, password, data
```

## 11. Data Flow

1. User submits a form → Zod validates
2. Handler calls a `save*` function on the store
3. Store writes to `localStorage` and emits a change event
4. Every `useStoreSnapshot` re-runs its selector and re-renders
5. Sonner shows a toast

## 12. Validation Strategy

Every write path uses a Zod schema. Fields have length caps (title/notes) and type coercion (amount → number, positive). Invalid submissions surface as toast errors and never reach the store.

## 13. Error Handling

- Route-level `errorComponent` at `__root` catches render errors and offers retry / home
- Auth flows surface caught errors via `toast.error`
- The store returns `Error` objects for known cases (duplicate email, wrong password)

## 14. Security Considerations

For a localStorage build:

- Passwords are hashed before storage (SHA-256 + salt) — never plaintext
- Zod prevents malformed writes
- No `dangerouslySetInnerHTML` anywhere
- CSV export escapes double quotes

Production-grade upgrades (documented for later): bcrypt on the server, JWT in httpOnly cookies, CSRF, rate-limiting, RLS in the database.

## 15. Responsive Design

- Fixed 256px sidebar on `lg:` and above
- Bottom tab bar on mobile (`< lg`)
- Grid + `min-w-0` + `shrink-0` on every header row (Tailwind v4 responsive pattern)
- Content padding scales from `px-4` mobile to `px-10` desktop
- Charts use `ResponsiveContainer` so they scale to any breakpoint

## 16. Performance

- Route-based code splitting via TanStack Router
- `useSyncExternalStore` avoids over-rendering
- Charts memoize aggregated data implicitly via `useMemo` on filtered/sorted lists
- Font preconnect + display-swap for Inter

## 17. Third-Party Libraries

- **@tanstack/react-router / react-start** — routing + SSR shell
- **@tanstack/react-query** — cached queries (ready for API upgrade)
- **recharts** — all charts
- **zod** — schema validation
- **react-hook-form** — imported but the dialogs use lightweight local state (Zod is still enforced)
- **sonner** — toast notifications
- **lucide-react** — icons
- **tailwindcss v4 + tw-animate-css** — styling
- **shadcn/ui** — accessible component primitives (Radix under the hood)

## 18. Future Enhancements

- Node.js + Express + MongoDB (or Prisma + PostgreSQL) backend with JWT auth
- Recurring transactions
- Multi-currency with live FX rates
- Bank-CSV import parser
- AI insights ("Your dining spend rose 22% vs last month")
- PWA + offline mode
- Household/shared budgets

## 19. Conclusion

Finlytic is a compact but complete demonstration of modern frontend engineering: strong types end-to-end, a clean data-layer abstraction shaped like a REST client, careful validation, a coherent semantic design system, and responsive polish that reads as a real fintech SaaS product. Bolting on a real backend requires only swapping `src/lib/store.ts` for `fetch` calls — the entire UI and validation surface stays as-is.
