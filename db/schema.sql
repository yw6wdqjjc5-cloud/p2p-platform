Implement AI risk scoring and the admin dashboard.

1) Create API route:
File: app/api/ai/risk-score/route.ts
Method: POST
Input JSON: { "loan_id": string }

Steps:
- Load loan, borrower, user, asset, and car from Supabase using the service role key.
- If any record is missing, return 400 with JSON error.
- Build a detailed risk assessment prompt using:
  loan info, car info, borrower country, requested_amount, term_months, and car market_value_estimate.

AI response format must be STRICT JSON:
{
  "score": number,
  "recommended_ltv": number,
  "comments": string
}

- Parse AI response safely (try/catch).
- Insert into risk_scores table.
- Update loans.status = 'published'.
- Return the saved risk_scores row.

2) Create admin page:
File: app/admin/loans/page.tsx

Requirements:
- Server component fetching all loans with:
  borrower email,
  car brand/model/year,
  requested_amount,
  status,
  latest risk score (if exists).
- Render in a Tailwind table.
- Each row has a "Run AI scoring" button.
- Button executes POST /api/ai/risk-score and refreshes the page (router.refresh()).
- Handle loading and errors.

Use clean TypeScript, Tailwind CSS, and App Router conventions.

