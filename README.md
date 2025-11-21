## Overview

MVP for a P2P collateral lending platform (auto collateral in Kazakhstan). The stack:

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth) for persistence
- API routes inside Next.js for backend logic

## Requirements

- Node.js 18+
- Supabase project
- OpenAI API key (for upcoming AI risk scoring features)

## Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=sk-...
```

`lib/supabase.ts` uses `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to instantiate a server-side client for protected operations.

## Database Schema / Migrations

1. Open `db/schema.sql`.
2. Run the statements in Supabase SQL Editor **or** use the Supabase CLI:
   ```
   supabase db push --file db/schema.sql
   ```
3. Confirm the tables exist: `users`, `investors`, `borrowers`, `assets`, `cars`, `loans`, `risk_scores`.

## Development

Install dependencies:

```
npm install
```

Start the dev server:

```
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).
