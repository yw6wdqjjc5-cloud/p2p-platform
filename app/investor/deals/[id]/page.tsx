import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { InvestButton } from './InvestButton';

type PageProps = {
  params: Promise<{ id: string }>;
};

async function fetchDealDetails(loanId: string) {
  // Fetch loan
  const { data: loan, error: loanError } = await supabaseAdmin
    .from('loans')
    .select('id, borrower_id, asset_id, amount, currency, term_months, status, created_at')
    .eq('id', loanId)
    .single();

  if (loanError || !loan) {
    return null;
  }

  // Fetch related data in parallel
  const [userResult, borrowerResult, assetResult, carResult, riskScoresResult, investmentsResult] =
    await Promise.all([
      supabaseAdmin.from('users').select('id, email, phone').eq('id', loan.borrower_id).single(),
      supabaseAdmin
        .from('borrowers')
        .select('id, country, kyc_status')
        .eq('id', loan.borrower_id)
        .single(),
      supabaseAdmin.from('assets').select('id, title, country, type').eq('id', loan.asset_id).single(),
      supabaseAdmin
        .from('cars')
        .select('id, brand, model, year, mileage, vin, market_value_estimate')
        .eq('id', loan.asset_id)
        .single(),
      supabaseAdmin
        .from('risk_scores')
        .select('id, score, risk_level, created_at')
        .eq('loan_id', loan.id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('investments')
        .select('amount')
        .eq('loan_id', loan.id),
    ]);

  // Calculate total invested
  const totalInvested = investmentsResult.data
    ? investmentsResult.data.reduce((sum, inv) => sum + (inv.amount || 0), 0)
    : 0;

  return {
    loan,
    user: userResult.data,
    borrower: borrowerResult.data,
    asset: assetResult.data,
    car: carResult.data,
    latestRiskScore: riskScoresResult.data?.[0] || null,
    totalInvested,
  };
}

export default async function DealDetailPage({ params }: PageProps) {
  const { id } = await params;
  const dealData = await fetchDealDetails(id);

  if (!dealData) {
    notFound();
  }

  const { loan, user, borrower, asset, car, latestRiskScore, totalInvested } = dealData;

  const progressPercentage = ((totalInvested / loan.amount) * 100).toFixed(1);
  const remainingAmount = loan.amount - totalInvested;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Investment Opportunity</h1>
        <p className="mt-2 text-sm text-slate-600">Review the details and invest in this loan</p>
      </div>

      <div className="space-y-6">
        {/* Funding Progress */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Funding Progress</h2>
            <span className="text-2xl font-bold text-slate-900">
              {totalInvested.toLocaleString()} / {loan.amount.toLocaleString()} {loan.currency}
            </span>
          </div>

          <div className="mb-2 h-4 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-green-600 transition-all duration-300"
              style={{ width: `${Math.min(Number(progressPercentage), 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{progressPercentage}% funded</span>
            <span>
              {remainingAmount > 0
                ? `${remainingAmount.toLocaleString()} ${loan.currency} remaining`
                : 'Fully funded'}
            </span>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Vehicle Details</h2>
          {car ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-slate-500">Brand & Model</p>
                <p className="mt-1 text-base text-slate-900">
                  {car.brand} {car.model}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Year</p>
                <p className="mt-1 text-base text-slate-900">{car.year}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Mileage</p>
                <p className="mt-1 text-base text-slate-900">{car.mileage.toLocaleString()} km</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">VIN</p>
                <p className="mt-1 text-base text-slate-900">{car.vin || 'Not provided'}</p>
              </div>
              {car.market_value_estimate && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Estimated Value</p>
                  <p className="mt-1 text-base text-slate-900">
                    {car.market_value_estimate.toLocaleString()} {loan.currency}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500">Vehicle information not available</p>
          )}
        </div>

        {/* Loan Information */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Loan Terms</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-500">Requested Amount</p>
              <p className="mt-1 text-base text-slate-900">
                {loan.amount.toLocaleString()} {loan.currency}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Term</p>
              <p className="mt-1 text-base text-slate-900">{loan.term_months} months</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Borrower Country</p>
              <p className="mt-1 text-base text-slate-900">{borrower?.country || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">KYC Status</p>
              <p className="mt-1 text-base text-slate-900">{borrower?.kyc_status || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        {latestRiskScore && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Risk Assessment</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-slate-500">Risk Score</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-2xl font-bold text-slate-900">{latestRiskScore.score}/100</p>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      latestRiskScore.risk_level === 'low'
                        ? 'bg-green-100 text-green-800'
                        : latestRiskScore.risk_level === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {latestRiskScore.risk_level}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Risk Level</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 capitalize">
                  {latestRiskScore.risk_level}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Investment Form */}
        {loan.status === 'published' && remainingAmount > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Make an Investment</h2>
            <InvestButton loanId={loan.id} maxAmount={remainingAmount} currency={loan.currency} />
          </div>
        )}

        {loan.status !== 'published' && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
            <p className="text-sm text-yellow-800">
              This loan is currently <strong>{loan.status}</strong> and not available for new
              investments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

