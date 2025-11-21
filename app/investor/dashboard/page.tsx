import { supabaseAdmin } from '@/lib/supabase';
import { InvestmentCard } from './InvestmentCard';
import { PaymentsTable } from './PaymentsTable';

// Default interest rate (2% per month = 0.02)
const DEFAULT_INTEREST_RATE = 0.02;

type InvestmentData = {
  id: string;
  loan_id: string;
  amount: number;
  created_at: string;
  loan: {
    id: string;
    amount: number;
    currency: string;
    term_months: number;
    status: string;
    asset_id: string;
  };
  car?: {
    brand: string;
    model: string;
    year: number;
  };
  risk_score?: {
    score: number;
    risk_level: string;
  };
};

type Payment = {
  id: string;
  loan_id: string;
  investment_id: string;
  due_date: string;
  interest_payment: number;
  principal_payment: number;
  status: string;
  paid_at: string | null;
  created_at: string;
};

async function fetchInvestorData() {
  const investorEmail = 'test@investor.com';

  // Fetch all investments for this investor
  const { data: investments, error: investmentsError } = await supabaseAdmin
    .from('investments')
    .select('id, loan_id, amount, created_at')
    .eq('investor_email', investorEmail)
    .order('created_at', { ascending: false });

  if (investmentsError || !investments || investments.length === 0) {
    console.error('Error fetching investments:', investmentsError);
    return {
      investments: [],
      totalInvested: 0,
      totalMonthlyIncome: 0,
      upcomingPayments: [],
      paidPayments: [],
      overduePayments: [],
    };
  }

  // Get unique loan IDs
  const loanIds = [...new Set(investments.map((inv) => inv.loan_id))];
  const investmentIds = investments.map((inv) => inv.id);

  // Fetch related data
  const [loansResult, carsResult, riskScoresResult, paymentsResult] = await Promise.all([
    supabaseAdmin.from('loans').select('id, amount, currency, term_months, status, asset_id').in('id', loanIds),
    supabaseAdmin.from('cars').select('id, brand, model, year').in('loan_id', loanIds),
    supabaseAdmin.from('risk_scores').select('loan_id, score, risk_level').in('loan_id', loanIds),
    supabaseAdmin
      .from('payments')
      .select('*')
      .in('investment_id', investmentIds)
      .order('due_date', { ascending: true }),
  ]);

  // Create maps for easy lookup
  const loansMap = new Map();
  const carsMap = new Map();
  const riskScoresMap = new Map();

  loansResult.data?.forEach((loan) => loansMap.set(loan.id, loan));
  carsResult.data?.forEach((car) => carsMap.set(car.id, car));
  riskScoresResult.data?.forEach((rs) => riskScoresMap.set(rs.loan_id, rs));

  // If cars are by asset_id, fetch them properly
  if (loansResult.data && carsResult.data?.length === 0) {
    const assetIds = loansResult.data.map((l) => l.asset_id).filter(Boolean);
    if (assetIds.length > 0) {
      const { data: carsByAsset } = await supabaseAdmin
        .from('cars')
        .select('id, brand, model, year')
        .in('id', assetIds);
      carsByAsset?.forEach((car) => carsMap.set(car.id, car));
    }
  }

  // Combine data
  const enrichedInvestments: InvestmentData[] = investments.map((inv) => {
    const loan = loansMap.get(inv.loan_id);
    const car = loan ? carsMap.get(loan.asset_id) : null;
    const riskScore = riskScoresMap.get(inv.loan_id);

    return {
      ...inv,
      loan: loan || { id: inv.loan_id, amount: 0, currency: 'KZT', term_months: 0, status: 'unknown', asset_id: '' },
      car: car || undefined,
      risk_score: riskScore || undefined,
    };
  });

  // Calculate totals
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalMonthlyIncome = investments.reduce((sum, inv) => {
    return sum + inv.amount * DEFAULT_INTEREST_RATE;
  }, 0);

  // Categorize payments
  const upcomingPayments = paymentsResult.data?.filter((p) => p.status === 'pending') || [];
  const paidPayments = paymentsResult.data?.filter((p) => p.status === 'paid') || [];
  const overduePayments = paymentsResult.data?.filter((p) => p.status === 'overdue') || [];

  return {
    investments: enrichedInvestments,
    totalInvested,
    totalMonthlyIncome,
    upcomingPayments,
    paidPayments,
    overduePayments,
  };
}

export default async function InvestorDashboardPage() {
  const { investments, totalInvested, totalMonthlyIncome, upcomingPayments, paidPayments, overduePayments } =
    await fetchInvestorData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Investment Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track your investments, payments, and returns
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Invested</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {totalInvested.toLocaleString()} KZT
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Monthly Income</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {totalMonthlyIncome.toLocaleString()} KZT
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Based on {(DEFAULT_INTEREST_RATE * 100).toFixed(1)}% monthly interest
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active Investments</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{investments.length}</p>
        </div>
      </div>

      {/* Payments Overview */}
      {(upcomingPayments.length > 0 || paidPayments.length > 0 || overduePayments.length > 0) && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Payment Overview</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900">Upcoming Payments</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{upcomingPayments.length}</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-900">Paid</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{paidPayments.length}</p>
            </div>
            {overduePayments.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-900">Overdue</p>
                <p className="mt-1 text-2xl font-bold text-red-600">{overduePayments.length}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overdue Payments */}
      {overduePayments.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-red-900">⚠️ Overdue Payments</h2>
          <PaymentsTable payments={overduePayments} />
        </div>
      )}

      {/* Upcoming Payments */}
      {upcomingPayments.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Upcoming Payments</h2>
          <PaymentsTable payments={upcomingPayments.slice(0, 10)} />
          {upcomingPayments.length > 10 && (
            <p className="mt-2 text-sm text-slate-500">
              Showing 10 of {upcomingPayments.length} upcoming payments
            </p>
          )}
        </div>
      )}

      {/* Investments List */}
      {investments.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">No investments yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            Browse <a href="/investor/deals" className="text-blue-600 hover:underline">available deals</a> to get started.
          </p>
        </div>
      ) : (
        <div className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Your Investments</h2>
          {investments.map((investment) => (
            <InvestmentCard
              key={investment.id}
              investment={investment}
              interestRate={DEFAULT_INTEREST_RATE}
            />
          ))}
        </div>
      )}

      {/* Paid Payments (Collapsible) */}
      {paidPayments.length > 0 && (
        <div className="mb-8">
          <details className="rounded-lg border border-slate-200 bg-white">
            <summary className="cursor-pointer px-6 py-4 font-semibold text-slate-900 hover:bg-slate-50">
              Payment History ({paidPayments.length} paid)
            </summary>
            <div className="border-t border-slate-200 p-6">
              <PaymentsTable payments={paidPayments.slice(0, 20)} />
              {paidPayments.length > 20 && (
                <p className="mt-2 text-sm text-slate-500">
                  Showing 20 of {paidPayments.length} paid payments
                </p>
              )}
            </div>
          </details>
        </div>
      )}

      {/* Info Note */}
      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-900">Simple Interest Model</h3>
        <p className="mt-1 text-xs text-blue-800">
          All calculations use simple interest at {(DEFAULT_INTEREST_RATE * 100).toFixed(1)}% per month.
          Interest is paid monthly, and principal is returned at the end of the loan term.
        </p>
      </div>
    </div>
  );
}
