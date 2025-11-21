import { supabaseAdmin } from '@/lib/supabase';
import { RunScoringButton } from './RunScoringButton';

type LoanWithDetails = {
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

type AssetData = {
  id: string;
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
  recommended_ltv: number;
  created_at: string;
};

async function fetchLoans() {
  // Fetch all loans
  const { data: loans, error: loansError } = await supabaseAdmin
    .from('loans')
    .select('id, amount, currency, term_months, status, created_at, borrower_id, asset_id')
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

  const [usersResult, assetsResult, carsResult, riskScoresResult] = await Promise.all([
    supabaseAdmin.from('users').select('id, email').in('id', borrowerIds),
    supabaseAdmin.from('assets').select('id').in('id', assetIds),
    supabaseAdmin.from('cars').select('id, brand, model, year').in('id', assetIds),
    supabaseAdmin.from('risk_scores').select('id, loan_id, score, recommended_ltv, created_at').in('loan_id', loans.map((l) => l.id)),
  ]);

  const usersMap = new Map<string, UserData>();
  const assetsMap = new Map<string, AssetData>();
  const carsMap = new Map<string, CarData>();
  const riskScoresMap = new Map<string, RiskScoreData[]>();

  usersResult.data?.forEach((u) => usersMap.set(u.id, u));
  assetsResult.data?.forEach((a) => assetsMap.set(a.id, a));
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
    asset: assetsMap.get(loan.asset_id),
    car: carsMap.get(loan.asset_id),
    risk_scores: riskScoresMap.get(loan.id) || [],
  }));
}

export default async function AdminLoansPage() {
  const loans = await fetchLoans();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Loan Applications Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review and manage all loan applications. Run AI risk scoring to assess creditworthiness.
        </p>
      </div>

      {loans.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">No loan applications found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Borrower
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Loan Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Term
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loans.map((loan) => {
                  const latestRiskScore =
                    loan.risk_scores && loan.risk_scores.length > 0
                      ? loan.risk_scores.sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        )[0]
                      : null;

                  return (
                    <tr key={loan.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {loan.user?.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {loan.car
                          ? `${loan.car.brand} ${loan.car.model} (${loan.car.year})`
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {loan.amount.toLocaleString()} {loan.currency}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {loan.term_months} months
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            loan.status === 'draft'
                              ? 'bg-gray-100 text-gray-800'
                              : loan.status === 'published'
                                ? 'bg-blue-100 text-blue-800'
                                : loan.status === 'funding'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : loan.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : loan.status === 'repaid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {latestRiskScore ? (
                          <div>
                            <div className="font-semibold">
                              Score: {latestRiskScore.score}/100
                            </div>
                            <div className="text-xs text-slate-500">
                              LTV: {(latestRiskScore.recommended_ltv * 100).toFixed(0)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Not scored</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <RunScoringButton loanId={loan.id} />
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
        <h2 className="text-sm font-semibold text-slate-900">Status Guide:</h2>
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          <li>
            <strong>draft:</strong> Initial submission, not yet scored
          </li>
          <li>
            <strong>published:</strong> AI scored and available for investors
          </li>
          <li>
            <strong>funding:</strong> Receiving investments
          </li>
          <li>
            <strong>active:</strong> Fully funded and active
          </li>
          <li>
            <strong>repaid:</strong> Loan fully repaid
          </li>
          <li>
            <strong>defaulted:</strong> Borrower defaulted
          </li>
        </ul>
      </div>
    </div>
  );
}
