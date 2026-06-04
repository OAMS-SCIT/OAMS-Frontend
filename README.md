# OAMS Frontend

Office Asset Management System — Next.js frontend migrated from the Figma Make export.

## Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** + Radix primitives
- **Recharts** for dashboard analytics
- **Lucide React** icons

## Architecture

```
src/
├── app/                    # Next.js App Router (routes only)
│   ├── login/
│   ├── admin/              # Admin portal routes
│   └── employee/           # Employee portal routes
├── components/
│   ├── ui/                 # Reusable shadcn UI primitives
│   ├── layout/             # App shell (sidebar + header)
│   ├── overlays/           # Modals and drawers
│   └── shared/             # Shared utilities (e.g. image fallback)
├── features/               # Feature modules (domain UI)
│   ├── auth/
│   ├── dashboard/
│   ├── assets/
│   ├── assignments/
│   ├── users/
│   ├── categories/
│   ├── employees/
│   └── profile/
├── lib/                    # Mock data and helpers
├── providers/              # React context (app state)
└── types/                  # Shared TypeScript types
```

**Routing** lives in `app/`; **UI and business presentation** live in `features/`; **shared primitives** in `components/`.

State is managed client-side via `AppProvider` with mock data (ready to swap for API calls later).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on the login page.

Use any email/password to sign in. Choose **Admin** or **Preview Employee View**.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start development server |
| `npm run build`| Production build         |
| `npm run start`| Start production server  |
| `npm run lint` | Run ESLint               |

## Portals

| Role     | Base path   | Key screens                                      |
|----------|-------------|--------------------------------------------------|
| Admin    | `/admin/*`  | Dashboard, Inventory, Assignments, Users, Categories |
| Employee | `/employee/*` | My Assets, History, Profile                    |

## Notes

- Frontend-only: no backend API yet; all data comes from `src/lib/mock-data.ts`.
- The **Preview Mode Switcher** in the sidebar lets you toggle between admin and employee views (from the Figma prototype).
