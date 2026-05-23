# MenuLink — Restaurant SaaS Platform 🍽️

A production-ready multi-tenant SaaS for restaurants in Senegal. Each restaurant gets their own premium ordering website.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Supabase · Supabase Auth

---

## Architecture Overview

```
menulink/
├── src/
│   ├── app/
│   │   ├── (auth)/               # Unauthenticated pages
│   │   │   ├── login/            # Login page
│   │   │   └── logout/           # Logout route handler
│   │   ├── (protected)/          # Auth-required pages
│   │   │   ├── dashboard/        # Smart role-based redirect
│   │   │   ├── super-admin/      # Super admin dashboard
│   │   │   │   ├── page.tsx      # Overview + stats
│   │   │   │   ├── restaurants/  # Restaurant list
│   │   │   │   ├── users/        # User list
│   │   │   │   ├── create-admin/ # Create admin + restaurant form
│   │   │   │   └── settings/     # Placeholder
│   │   │   └── restaurant/       # Restaurant admin dashboard
│   │   │       ├── page.tsx      # Overview
│   │   │       ├── menu/         # Menu management (Phase 2)
│   │   │       ├── orders/       # Orders (Phase 2)
│   │   │       ├── profile/      # Restaurant profile
│   │   │       └── settings/     # Settings (Phase 2)
│   │   ├── api/
│   │   │   ├── auth/me/          # GET current user info
│   │   │   ├── restaurants/      # GET all restaurants
│   │   │   └── users/
│   │   │       └── create-restaurant-admin/  # POST — creates auth + restaurant + links them
│   │   ├── page.tsx              # Landing page
│   │   ├── layout.tsx            # Root layout (fonts, metadata)
│   │   ├── globals.css           # Tailwind + custom CSS
│   │   ├── error.tsx             # Global error boundary
│   │   └── not-found.tsx         # 404 page
│   ├── components/
│   │   ├── ui/                   # Reusable UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Loading.tsx       # Spinner, Skeleton, EmptyState
│   │   ├── layout/               # Structural components
│   │   │   ├── SuperAdminSidebar.tsx
│   │   │   ├── RestaurantSidebar.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── dashboard/
│   │   │   └── StatCard.tsx
│   │   └── landing/
│   │       └── LandingNav.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser client (SSR-safe)
│   │   │   ├── server.ts         # Server component client
│   │   │   ├── admin.ts          # Service role client (API routes only)
│   │   │   └── middleware.ts     # Session refresh + role routing
│   │   ├── hooks/
│   │   │   └── useAuth.ts        # Client-side auth hook
│   │   ├── types/
│   │   │   ├── index.ts          # App-level types
│   │   │   └── database.ts       # Supabase generated types
│   │   └── utils/
│   │       └── index.ts          # cn(), slugify(), formatCurrency()...
│   └── middleware.ts             # Next.js middleware (session + guards)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.example
├── vercel.json
└── README.md
```

---

## Multi-Tenant Design

Each restaurant is a **row** in the `restaurants` table. Isolation is enforced at two levels:

1. **Middleware** — checks role and redirects to the correct dashboard before any page renders.
2. **Row Level Security (RLS)** — Supabase policies ensure restaurant admins can only read/write their own restaurant's data, even if they call the API directly.

The key linkage:
```
auth.users → profiles.id (1:1)
profiles.restaurant_id → restaurants.id (N:1)
restaurants.id → subscriptions.restaurant_id (1:1)
```

When the super admin creates a restaurant admin, the API route (`/api/users/create-restaurant-admin`) does **all 4 steps atomically**:
1. Creates the Supabase Auth user
2. Creates the restaurant row
3. Updates the auto-created profile with `restaurant_id`
4. Creates the subscription row

This eliminates the "No restaurant connected" bug — the link is guaranteed at creation time.

---

## Database Schema

Three core tables, all with Row Level Security:

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | FK → auth.users |
| email | text | |
| full_name | text | |
| role | enum | `super_admin` or `restaurant_admin` |
| restaurant_id | uuid | FK → restaurants (null for super_admin) |
| avatar_url | text | |
| phone | text | |

### `restaurants`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | |
| slug | text | unique, used in URLs |
| city | text | |
| owner_id | uuid | FK → auth.users |
| is_active | boolean | |
| is_verified | boolean | manually set by super_admin |

### `subscriptions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| restaurant_id | uuid | FK → restaurants, unique |
| plan | enum | `starter`, `pro`, `enterprise` |
| status | enum | `active`, `trial`, `suspended`, `cancelled` |
| ends_at | timestamptz | null = no expiry |

---

## Roles & Access

| Route | super_admin | restaurant_admin | unauthenticated |
|-------|-------------|-----------------|-----------------|
| `/` | ✅ | ✅ | ✅ |
| `/login` | redirected → super-admin | redirected → restaurant | ✅ |
| `/dashboard/super-admin/**` | ✅ | ❌ redirected | ❌ redirected |
| `/dashboard/restaurant/**` | ❌ redirected | ✅ | ❌ redirected |
| `/api/users/create-restaurant-admin` | ✅ | ❌ 403 | ❌ 401 |

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Supabase account (free tier works)

### 1. Clone and install

```bash
git clone <your-repo>
cd menulink
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to Dakar (Europe West is fine)
3. Copy your project URL and keys

### 3. Set environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

You find these in: Supabase Dashboard → Settings → API

### 4. Run the database migration

1. Open Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/001_initial_schema.sql`
3. Copy the entire content and paste it into the SQL Editor
4. Click **Run**

This creates all tables, enums, triggers, RLS policies, and indexes.

### 5. Create the Super Admin account

**Option A — Supabase Dashboard (recommended):**
1. Go to Authentication → Users → Add user
2. Email: `rokhayagueye0330@gmail.com`
3. Set a strong password
4. Click Create User
5. Copy the generated UUID
6. Go to SQL Editor and run:

```sql
UPDATE public.profiles
SET role = 'super_admin', full_name = 'Rokh Admin'
WHERE email = 'rokhayagueye0330@gmail.com';
```

**Option B — SQL (if trigger already ran):**
```sql
-- This only works if the user was already created in Auth
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'rokhayagueye0330@gmail.com';
```

⚠️ **Security note:** The password is NEVER stored in the codebase. It is set exclusively through the Supabase Auth dashboard or API, and hashed by Supabase using bcrypt. Never hardcode credentials in frontend code.

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "feat: Phase 1 foundation"
git remote add origin https://github.com/yourusername/menulink.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)

### 3. Add environment variables

In Vercel → Settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL        = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJ...
SUPABASE_SERVICE_ROLE_KEY       = eyJ...
NEXT_PUBLIC_APP_URL             = https://your-vercel-domain.vercel.app
```

⚠️ `SUPABASE_SERVICE_ROLE_KEY` must be set as a **server-only** variable (do NOT prefix it with `NEXT_PUBLIC_`).

### 4. Deploy

Click **Deploy**. Vercel builds and deploys automatically on every push to `main`.

### 5. Update Supabase Auth redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** `https://your-app.vercel.app/**`

---

## Creating Your First Restaurant Admin

Once deployed and logged in as super_admin:

1. Go to **Dashboard → Créer admin**
2. Fill in the admin's name, email, password
3. Fill in the restaurant details
4. Click **Créer le compte et le restaurant**

The system will:
- ✅ Create the Supabase Auth account
- ✅ Create the restaurant row
- ✅ Link them via `restaurant_id` in the profile
- ✅ Create a trial subscription
- ✅ Show a success screen

The restaurant admin can now log in and see their dashboard with the restaurant already connected — no "No restaurant connected" error.

---

## Phase 2 Roadmap

- [ ] Menu management (categories, items, photos)
- [ ] Public ordering page (`/r/[slug]`)
- [ ] Real-time order notifications (Supabase Realtime)
- [ ] Wave / Orange Money payment integration
- [ ] WhatsApp order confirmation
- [ ] Analytics dashboard
- [ ] Subscription billing management
- [ ] Restaurant QR code generator

---

## Security Checklist

- [x] Passwords never stored or hardcoded in frontend
- [x] Service role key server-only (never exposed to browser)
- [x] Row Level Security enabled on all tables
- [x] Role checks at middleware level AND API level AND database level (3 layers)
- [x] Auth session handled by `@supabase/ssr` (HTTPOnly cookies, no localStorage)
- [x] Admin user creation via service role in API route only
- [x] Rollback on failed restaurant creation (deletes auth user)

---

## Performance Notes

This app is optimized for the Senegalese mobile context:

- **Server Components by default** — minimal JS sent to browser
- **No heavy client-side state libraries** (no Redux, no Zustand)
- **Minimal dependencies** — only what's essential
- **`display: swap`** on all fonts — text renders immediately
- **`passive: true`** on scroll listeners
- **Images lazy-loaded** by Next.js Image component
- Tailwind CSS is purged in production — CSS bundle is tiny
