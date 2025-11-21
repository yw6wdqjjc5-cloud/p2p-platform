'use client';

import { useState } from 'react';

type InvestmentCardProps = {
  investment: {
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
  interestRate: number;
};

type PaymentScheduleItem = {
  month: number;
  interest_payment: number;
  principal_payment: number;
  remaining_principal: number;
};

type ScheduleResponse = {
  success: boolean;
  schedule: PaymentScheduleItem[];
  summary: {
    investment_amount: number;
    total_interest: number;
    total_return: number;
    term_months: number;
    interest_rate_monthly: number;
  };
};

export function InvestmentCard({ investment, interestRate }: InvestmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [schedule, setSchedule] = useState<PaymentScheduleItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthlyInterest = investment.amount * interestRate;
  const totalReturn = investment.amount + monthlyInterest * investment.loan.term_months;

  async function fetchSchedule() {
    if (schedule) {
      // Already loaded, just toggle
      setIsExpanded(!isExpanded);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/investments/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_id: investment.loan_id,
          investment_amount: investment.amount,
          interest_rate_monthly: interestRate,
          term_months: investment.loan.term_months,
        }),
      });

      const data: ScheduleResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.success === false && 'error' in data ? String(data.error) : 'Failed to fetch schedule');
      }

      setSchedule(data.schedule);
      setIsExpanded(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setError(message);
      console.error('Error fetching schedule:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                {investment.car
                  ? `${investment.car.brand} ${investment.car.model} (${investment.car.year})`
                  : `Loan ${investment.loan_id.slice(0, 8)}...`}
              </h3>
              {investment.risk_score && (
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    investment.risk_score.risk_level === 'low'
                      ? 'bg-green-100 text-green-800'
                      : investment.risk_score.risk_level === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {investment.risk_score.risk_level}
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Investment</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {investment.amount.toLocaleString()} {investment.loan.currency}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Monthly Interest</p>
                <p className="mt-1 text-lg font-semibold text-green-600">
                  {monthlyInterest.toLocaleString()} {investment.loan.currency}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Term</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {investment.loan.term_months} months
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Return</p>
                <p className="mt-1 text-lg font-semibold text-blue-600">
                  {totalReturn.toLocaleString()} {investment.loan.currency}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={fetchSchedule}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            {isLoading ? (
              'Loading...'
            ) : (
              <>
                <svg
                  className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                {isExpanded ? 'Hide Schedule' : 'View Payment Schedule'}
              </>
            )}
          </button>
          <span className="text-xs text-slate-500">
            Status: <span className="font-medium capitalize">{investment.loan.status}</span>
          </span>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Expandable Schedule */}
      {isExpanded && schedule && (
        <div className="border-t border-slate-200 bg-slate-50 p-6">
          <h4 className="mb-4 text-sm font-semibold text-slate-900">Payment Schedule</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-300 bg-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Month</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-700">
                    Interest Payment
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-700">
                    Principal Payment
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-700">
                    Remaining Principal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {schedule.map((item) => (
                  <tr key={item.month} className="hover:bg-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-900">{item.month}</td>
                    <td className="px-4 py-2 text-right text-green-600">
                      {item.interest_payment.toLocaleString()} {investment.loan.currency}
                    </td>
                    <td className="px-4 py-2 text-right text-blue-600">
                      {item.principal_payment > 0
                        ? `${item.principal_payment.toLocaleString()} ${investment.loan.currency}`
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-700">
                      {item.remaining_principal.toLocaleString()} {investment.loan.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end gap-6 border-t border-slate-300 pt-4">
            <div className="text-right">
              <p className="text-xs text-slate-500">Total Interest</p>
              <p className="text-lg font-semibold text-green-600">
                {(monthlyInterest * investment.loan.term_months).toLocaleString()}{' '}
                {investment.loan.currency}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Total Return</p>
              <p className="text-lg font-semibold text-blue-600">
                {totalReturn.toLocaleString()} {investment.loan.currency}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


