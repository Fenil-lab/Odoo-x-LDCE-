# GlobeTrotter

GlobeTrotter is a travel planner for building multi-city trips.

You can:

- Create and edit trips
- Add cities and activities
- Plan stops by date
- Track travel costs
- View trips on a timeline
- Share an itinerary with a public link
- Reset your account password

## Tech Stack

- **Next.js**: Runs the web app
- **TypeScript**: Helps keep the code reliable
- **Tailwind CSS**: Styles the screens
- **Supabase**: Handles login and stores trip data
- **PostgreSQL**: The database provided by Supabase
- **Recharts**: Displays budget charts

## Run Locally

From the `globetrotter` folder:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app needs these values in `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Setup

1. Open the Supabase SQL Editor.
2. Run `supabase-schema.sql` once.
3. Run `supabase-public-sharing-migration.sql` for public trip sharing.

The database includes cities, activities, trips, stops, and user accounts.
