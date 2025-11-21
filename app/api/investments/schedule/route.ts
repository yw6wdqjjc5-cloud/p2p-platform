import { NextResponse } from 'next/server';

type ScheduleRequest = {
  loan_id: string;
  investment_amount: number;
  interest_rate_monthly: number;
  term_months: number;
};

type PaymentScheduleItem = {
  month: number;
  interest_payment: number;
  principal_payment: number;
  remaining_principal: number;
};

function validateRequest(body: unknown): body is ScheduleRequest {
  if (!body || typeof body !== 'object') return false;

  const { loan_id, investment_amount, interest_rate_monthly, term_months } =
    body as ScheduleRequest;

  return (
    typeof loan_id === 'string' &&
    loan_id.length > 0 &&
    typeof investment_amount === 'number' &&
    investment_amount > 0 &&
    typeof interest_rate_monthly === 'number' &&
    interest_rate_monthly >= 0 &&
    typeof term_months === 'number' &&
    term_months > 0
  );
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (!validateRequest(payload)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid payload: loan_id, investment_amount, interest_rate_monthly, and term_months are required',
        },
        { status: 400 }
      );
    }

    const { investment_amount, interest_rate_monthly, term_months } = payload;

    // Generate payment schedule using simple interest model
    const schedule: PaymentScheduleItem[] = [];

    for (let month = 1; month <= term_months; month++) {
      // Simple interest: same interest payment every month
      const interestPayment = investment_amount * interest_rate_monthly;

      // Principal is only paid back on the last month
      const principalPayment = month === term_months ? investment_amount : 0;

      // Remaining principal stays the same until final month
      const remainingPrincipal = month === term_months ? 0 : investment_amount;

      schedule.push({
        month,
        interest_payment: Math.round(interestPayment * 100) / 100, // Round to 2 decimals
        principal_payment: principalPayment,
        remaining_principal: remainingPrincipal,
      });
    }

    // Calculate totals
    const totalInterest = schedule.reduce((sum, item) => sum + item.interest_payment, 0);
    const totalPayments = totalInterest + investment_amount;

    return NextResponse.json(
      {
        success: true,
        schedule,
        summary: {
          investment_amount,
          total_interest: Math.round(totalInterest * 100) / 100,
          total_return: Math.round(totalPayments * 100) / 100,
          term_months,
          interest_rate_monthly,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error generating payment schedule', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


