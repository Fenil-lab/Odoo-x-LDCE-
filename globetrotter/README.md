# GlobeTrotter 🌍

A multi-city travel itinerary planner with budget tracking, built with Next.js + Supabase.

## Quick Start (for team members)

### 1. Install dependencies

```bash
cd globetrotter
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Then edit `.env.local` and paste the Supabase credentials:
- **Project URL**: `https://amndzaqapjndtjxxmnlk.supabase.co`
- **Anon Key**: Ask the project owner or check the shared team doc

> You can find these in Supabase Dashboard → Settings → API

### 3. Set up the database (first time only)

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard) for our project
2. Open a **New Query**
3. Copy-paste the entire contents of `supabase-schema.sql`
4. Click **Run**

This creates all tables, row-level security policies, and seeds 35 cities + 70+ activities.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → Sign up → Start planning trips!

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Supabase** (Auth + Postgres)
- **Tailwind CSS v4**
- **Recharts** (budget charts)

## Project Structure

```
src/
├── app/
│   ├── login/            # Email/password login
│   ├── signup/           # Account creation
│   ├── forgot-password/  # Password reset request
│   ├── reset-password/   # Set new password (from email link)
│   ├── dashboard/        # Welcome + recent trips
│   ├── trips/
│   │   ├── page.tsx      # Trip list with cards
│   │   ├── new/          # Create trip form
│   │   └── [id]/
│   │       ├── page.tsx  # Itinerary view + budget charts
│   │       ├── builder/  # Add stops & activities
│   │       ├── edit/     # Edit trip details
│   │       └── calendar/ # Calendar view
│   ├── cities/           # Explore cities
│   ├── activities/       # Browse activities
│   ├── profile/          # User profile
│   └── share/[tripId]/   # Public shared trip
├── components/
│   └── Navbar.tsx
├── context/
│   └── AuthContext.tsx    # Supabase auth provider
└── lib/
    ├── supabase.ts       # Supabase client
    └── types.ts          # TypeScript interfaces
```

## Database Schema

See `supabase-schema.sql` for the full schema. Tables:

- `cities` — 35 seeded cities with cost indices
- `activity_catalog` — 70+ seeded activities (city-specific + generic)
- `trips` — User trips
- `stops` — Trip stops (linked to cities)
- `activities` — Activities within stops

## Deploy to Vercel

```bash
npx vercel
```

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables in Vercel project settings.
