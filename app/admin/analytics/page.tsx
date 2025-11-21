import { supabaseAdmin } from '@/lib/supabase';

const DEFAULT_INTEREST_RATE = 0.02;

type AnalyticsData = {
  totalPortfolioValue: number;
  totalInvested: number;
  monthlyInterestFlow: number;
  activeLoansCount: number;
  fundedLoansCount: number;
  overduePaymentsCount: number;
  paymentStats: {
    pending: number;
    paid: number;
    overdue: number;
  };
};

async function fetchAnalytics(): Promise<AnalyticsData> {
  // 1. Total portfolio value
  const { data: loansData, error: loansError } = await supabaseAdmin
    .from('loans')
    .select('amount');

  const totalPortfolioValue = loansData?.reduce((sum, loan) => sum + (loan.amount || 0), 0) || 0;

  // 2. Total invested
  const { data: investmentsData, error: investmentsError } = await supabaseAdmin
    .from('investments')
    .select('amount');

  const totalInvested = investmentsData?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

  // 3. Monthly interest flow
  const { data: investmentsWithLoans, error: investmentsWithLoansError } = await supabaseAdmin
    .from('investments')
    .select(
      `
      amount,
      loans (
        interest_rate_monthly
      )
      `
    );

  let monthlyInterestFlow = 0;
  if (investmentsWithLoans) {
    for (const inv of investmentsWithLoans) {
      const loan = (inv as any).loans;
      const interestRate = loan?.interest_rate_monthly || DEFAULT_INTEREST_RATE;
      monthlyInterestFlow += inv.amount * interestRate;
    }
  }

  // 4. Active loans count
  const { count: activeLoansCount } = await supabaseAdmin
    .from('loans')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published');

  // 5. Funded loans count
  const { count: fundedLoansCount } = await supabaseAdmin
    .from('loans')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'funded');

  // 6. Overdue payments count
  const { count: overduePaymentsCount } = await supabaseAdmin
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'overdue');

  // 7. Payment stats
  const { count: pendingCount } = await supabaseAdmin
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: paidCount } = await supabaseAdmin
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'paid');

  const { count: overdueCount } = await supabaseAdmin
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'overdue');

  return {
    totalPortfolioValue,
    totalInvested,
    monthlyInterestFlow,
    activeLoansCount: activeLoansCount || 0,
    fundedLoansCount: fundedLoansCount || 0,
    overduePaymentsCount: overduePaymentsCount || 0,
    paymentStats: {
      pending: pendingCount || 0,
      paid: paidCount || 0,
      overdue: overdueCount || 0,
    },
  };
}

export default async function AdminAnalyticsPage() {
  const analytics = await fetchAnalytics();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold text-slate-900">Platform Analytics</h1>

      {/* KPI Cards */}
      <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Portfolio Value */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">Total Portfolio Value</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {analytics.totalPortfolioValue.toLocaleString()} USD
          </p>
        </div>

        {/* Total Invested */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">Total Invested</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {analytics.totalInvested.toLocaleString()} USD
          </p>
        </div>

        {/* Monthly Interest Flow */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">Monthly Interest Flow</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {Math.round(analytics.monthlyInterestFlow).toLocaleString()} USD
          </p>
        </div>

        {/* Active Loans */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">Active Loans</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">{analytics.activeLoansCount}</p>
        </div>

        {/* Funded Loans */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">Funded Loans</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{analytics.fundedLoansCount}</p>
        </div>

        {/* Overdue Payments */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">Overdue Payments</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">{analytics.overduePaymentsCount}</p>
        </div>
      </div>

      {/* Payment Status Chart */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">Payments by Status</h2>
        </div>

        <div className="p-6">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Visual
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">Pending</td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {analytics.paymentStats.pending}
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-full max-w-md rounded-full bg-slate-100">
                      <div
                        className="h-4 rounded-full bg-yellow-500"
                        style={{
                          width: `${
                            (analytics.paymentStats.pending /
                              Math.max(
                                analytics.paymentStats.pending +
                                  analytics.paymentStats.paid +
                                  analytics.paymentStats.overdue,
                                1
                              )) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">Paid</td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {analytics.paymentStats.paid}
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-full max-w-md rounded-full bg-slate-100">
                      <div
                        className="h-4 rounded-full bg-green-500"
                        style={{
                          width: `${
                            (analytics.paymentStats.paid /
                              Math.max(
                                analytics.paymentStats.pending +
                                  analytics.paymentStats.paid +
                                  analytics.paymentStats.overdue,
                                1
                              )) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">Overdue</td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {analytics.paymentStats.overdue}
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-full max-w-md rounded-full bg-slate-100">
                      <div
                        className="h-4 rounded-full bg-red-500"
                        style={{
                          width: `${
                            (analytics.paymentStats.overdue /
                              Math.max(
                                analytics.paymentStats.pending +
                                  analytics.paymentStats.paid +
                                  analytics.paymentStats.overdue,
                                1
                              )) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


