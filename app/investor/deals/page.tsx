import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

type DealListing = {
  id: string;
  amount: number;
  currency: string;
  term_months: number;
  status: string;
  created_at: string;
  borrower_id: string;
  asset_id: string;
};

type UserData = {
  id: string;
  email: string;
};

type CarData = {
  id: string;
  brand: string;
  model: string;
  year: number;
};

type RiskScoreData = {
  id: string;
  score: number;
  risk_level: string;
  created_at: string;
};

async function fetchPublishedDeals() {
  // Fetch all published loans
  const { data: loans, error: loansError } = await supabaseAdmin
    .from('loans')
    .select('id, amount, currency, term_months, status, created_at, borrower_id, asset_id')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (loansError) {
    console.error('Error fetching loans:', loansError);
    return [];
  }

  if (!loans || loans.length === 0) {
    return [];
  }

  // Fetch related data
  const borrowerIds = [...new Set(loans.map((l) => l.borrower_id))];
  const assetIds = [...new Set(loans.map((l) => l.asset_id))];
  const loanIds = loans.map((l) => l.id);

  const [usersResult, carsResult, riskScoresResult] = await Promise.all([
    supabaseAdmin.from('users').select('id, email').in('id', borrowerIds),
    supabaseAdmin.from('cars').select('id, brand, model, year').in('id', assetIds),
    supabaseAdmin.from('risk_scores').select('id, loan_id, score, risk_level, created_at').in('loan_id', loanIds),
  ]);

  const usersMap = new Map<string, UserData>();
  const carsMap = new Map<string, CarData>();
  const riskScoresMap = new Map<string, RiskScoreData[]>();

  usersResult.data?.forEach((u) => usersMap.set(u.id, u));
  carsResult.data?.forEach((c) => carsMap.set(c.id, c));
  riskScoresResult.data?.forEach((rs) => {
    if (!riskScoresMap.has(rs.loan_id)) {
      riskScoresMap.set(rs.loan_id, []);
    }
    riskScoresMap.get(rs.loan_id)!.push(rs);
  });

  return loans.map((loan) => ({
    ...loan,
    user: usersMap.get(loan.borrower_id),
    car: carsMap.get(loan.asset_id),
    risk_scores: riskScoresMap.get(loan.id) || [],
  }));
}

export default async function InvestorDealsPage() {
  const deals = await fetchPublishedDeals();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Investment Opportunities</h1>
        <p className="mt-2 text-sm text-slate-600">
          Browse car-backed loans ready for investment. All deals have been AI-scored for risk assessment.
        </p>
      </div>

      {deals.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">No investment opportunities available at this time.</p>
          <p className="mt-2 text-sm text-slate-500">
            Check back later for new published deals.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Requested Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Term
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Risk Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Listed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {deals.map((deal) => {
                  // Get latest risk score
                  const latestRiskScore =
                    deal.risk_scores && deal.risk_scores.length > 0
                      ? deal.risk_scores.sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        )[0]
                      : null;

                  const createdDate = new Date(deal.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr key={deal.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {deal.car
                          ? `${deal.car.brand} ${deal.car.model} (${deal.car.year})`
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {deal.amount.toLocaleString()} {deal.currency}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {deal.term_months} months
                      </td>
                      <td className="px-6 py-4">
                        {latestRiskScore ? (
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-slate-900">
                              {latestRiskScore.score}/100
                            </div>
                            <div
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                latestRiskScore.score >= 70
                                  ? 'bg-green-100 text-green-800'
                                  : latestRiskScore.score >= 40
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {latestRiskScore.score >= 70
                                ? 'Low Risk'
                                : latestRiskScore.score >= 40
                                  ? 'Medium Risk'
                                  : 'High Risk'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {latestRiskScore ? (
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              latestRiskScore.risk_level === 'low'
                                ? 'bg-green-100 text-green-800'
                                : latestRiskScore.risk_level === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {latestRiskScore.risk_level}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{createdDate}</td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/investor/deals/${deal.id}`}
                          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          View Deal
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Risk Score Guide:</h2>
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          <li>
            <strong>Low Risk (70-100):</strong> Strong fundamentals, reliable borrower profile
          </li>
          <li>
            <strong>Medium Risk (40-69):</strong> Moderate risk, requires careful evaluation
          </li>
          <li>
            <strong>High Risk (0-39):</strong> Elevated risk factors, higher return potential
          </li>
        </ul>
      </div>
    </div>
  );
}

