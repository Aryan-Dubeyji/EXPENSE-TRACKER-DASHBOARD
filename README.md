# Finlytic — Expense Tracker Dashboard

A modern, production-quality personal finance dashboard built as a full-stack single-page application. Track expenses, income, budgets, and financial health with a premium fintech-inspired interface.

## Overview

Finlytic is an expense management application that lets users manage their day-to-day money — income, expenses, budgets, savings, and analytics — from a single beautifully designed dashboard. This build is a **frontend-only edition**: all data lives in the browser (localStorage) with hashed-password authentication, so the app is fully functional as a demo without any backend to run.

## Key Features

- Authentication — register, login, logout, change password (passwords hashed with SHA-256 + salt)
- Dashboard — total balance, monthly income/expense/savings, savings rate, budget usage, recent activity
- Expense management — add, edit, delete, duplicate, search, filter by category, sort by date/amount
- Income management — add, edit, delete, search, filter
- Budgets — monthly limits per category with progress bars and over-budget warnings
- Analytics — cash-flow area chart, income vs expense line chart, category bar chart, savings trend, distribution pie chart
- Categories — default sets for expenses and income, plus custom categories
- Toast notifications on every mutation
- Settings — light/dark theme, currency symbol, profile update, password change, CSV/JSON export & JSON import
- Fully responsive — desktop sidebar, mobile bottom nav
- Demo data auto-seeded on account creation

## Technology Stack

**Frontend:** React 19, TypeScript, Vite 7, TanStack Start (routing/SSR), Tailwind CSS v4, shadcn/ui, Recharts, React Hook Form + Zod, Sonner toasts, Lucide icons.

**"Backend":** In-browser data layer (localStorage) with a typed store API — `src/lib/store.ts` — that mirrors REST-style CRUD operations and can be swapped for a real Node/Express + MongoDB backend by replacing the store implementation.

## Installation

```bash
bun install    # or: npm install
bun dev        # or: npm run dev
```

The app is served on `http://localhost:8080`.

## Environment Variables

None required for the frontend-only build.

## Scripts

- `bun dev` — start dev server
- `bun run build` — production build
- `bun run lint` — run ESLint
- `bun run format` — Prettier formatting

## API Overview (data layer)

The store module exposes CRUD-style functions that a real REST client would replace 1:1:

| Frontend function        | Equivalent REST endpoint       |
| ------------------------ | ------------------------------ |
| `registerUser`           | `POST /api/register`           |
| `loginUser`              | `POST /api/login`              |
| `getExpenses`            | `GET  /api/expenses`           |
| `saveExpense`            | `POST/PUT /api/expenses[/:id]` |
| `deleteExpense`          | `DELETE /api/expenses/:id`     |
| `getIncome / saveIncome` | `/api/income`                  |
| `getBudgets / saveBudget`| `/api/budgets`                 |

## Future Improvements

- Real backend (Node + Express + MongoDB/Prisma) with JWT auth
- Multi-currency conversion & foreign exchange support
- Recurring transactions & subscription tracking
- Bank/CSV auto-import with parsing
- AI-generated spending insights
- Shared/household budgets
- PWA installability with offline support
