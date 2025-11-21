# Database Schema Setup Required

## Issue
The Supabase database tables exist but are missing columns defined in `db/schema.sql`.

## Solution
You need to apply the complete schema to your Supabase database.

### Steps to Apply Schema:

1. **Go to Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/tknysxsctsgmtkmputhg/editor
   ```

2. **Click on "SQL Editor" in the left sidebar**

3. **Create a new query and paste the following SQL:**

```sql
-- Enable extensions
create extension if not exists "uuid-ossp";

-- Create or update tables
create table if not exists public.users (
    id uuid primary key default uuid_generate_v4(),
    email text,
    phone text,
    role text check (role in ('borrower','investor','admin')),
    created_at timestamptz default now()
);

create table if not exists public.investors (
    id uuid primary key references public.users(id),
    kyc_status text,
    country text,
    risk_profile text,
    created_at timestamptz default now()
);

create table if not exists public.borrowers (
    id uuid primary key references public.users(id),
    country text,
    kyc_status text,
    has_business boolean,
    created_at timestamptz default now()
);

create table if not exists public.assets (
    id uuid primary key default uuid_generate_v4(),
    borrower_id uuid references public.borrowers(id),
    type text check (type in ('car','property')),
    title text,
    description text,
    country text,
    city text,
    raw_data jsonb,
    created_at timestamptz default now()
);

create table if not exists public.cars (
    id uuid primary key references public.assets(id),
    vin text,
    brand text,
    model text,
    year int,
    mileage int,
    market_value_estimate numeric
);

create table if not exists public.loans (
    id uuid primary key default uuid_generate_v4(),
    borrower_id uuid references public.borrowers(id),
    asset_id uuid references public.assets(id),
    requested_amount numeric,
    approved_amount numeric,
    currency text,
    interest_rate_monthly numeric,
    term_months int,
    status text check (status in ('draft','published','funding','active','repaid','defaulted')),
    created_at timestamptz default now()
);

create table if not exists public.risk_scores (
    id uuid primary key default uuid_generate_v4(),
    loan_id uuid references public.loans(id),
    asset_id uuid references public.assets(id),
    model_version text,
    score int,
    recommended_ltv numeric,
    comments text,
    raw_ai_response jsonb,
    created_at timestamptz default now()
);

-- Create indexes
create index if not exists idx_assets_borrower_id on public.assets (borrower_id);
create index if not exists idx_loans_status on public.loans (status);
create index if not exists idx_risk_scores_loan_id on public.risk_scores (loan_id);
```

4. **Click "Run" or press Cmd/Ctrl + Enter**

5. **Verify success** - you should see "Success. No rows returned"

### After Applying Schema:

The application will work correctly. All API endpoints will be able to:
- Create loan applications
- Run AI risk scoring
- Display data in the admin dashboard

### Quick Test:
After applying the schema, test the borrower application endpoint:
```bash
curl -X POST http://localhost:3000/api/borrower/applications \
  -H "Content-Type: application/json" \
  -d '{
    "borrowerUser": {"email": "test@example.com", "phone": "+1234567890", "country": "Kazakhstan"},
    "car": {"brand": "Toyota", "model": "Camry", "year": 2020, "mileage": 50000},
    "loan": {"requested_amount": 5000000, "term_months": 24, "currency": "KZT"}
  }'
```

Expected response:
```json
{
  "success": true,
  "loan_id": "...",
  "asset_id": "..."
}
```



