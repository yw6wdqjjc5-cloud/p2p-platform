import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Default interest rate (2% per month = 0.02)
const DEFAULT_INTEREST_RATE = 0.02;

type GeneratePaymentsRequest = {
  loan_id: string;
};

function validateRequest(body: unknown): body is GeneratePaymentsRequest {
  if (!body || typeof body !== 'object') return false;
  const { loan_id } = body as GeneratePaymentsRequest;
  return typeof loan_id === 'string' && loan_id.length > 0;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (!validateRequest(payload)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: loan_id is required' },
        { status: 400 }
      );
    }

    const { loan_id } = payload;

    // Fetch loan details
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('id, term_months, created_at')
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) {
      console.error('Failed to fetch loan', loanError);
      return NextResponse.json(
        { success: false, error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Fetch all investments for this loan
    const { data: investments, error: investmentsError } = await supabaseAdmin
      .from('investments')
      .select('id, amount')
      .eq('loan_id', loan_id);

    if (investmentsError || !investments || investments.length === 0) {
      console.error('Failed to fetch investments', investmentsError);
      return NextResponse.json(
        { success: false, error: 'No investments found for this loan' },
        { status: 404 }
      );
    }

    // Use loan creation date or current date as start date
    const loanStartDate = loan.created_at ? new Date(loan.created_at) : new Date();
    const interestRate = DEFAULT_INTEREST_RATE;

    // Generate payments for each investment
    const paymentsToCreate = [];

    for (const investment of investments) {
      for (let month = 1; month <= loan.term_months; month++) {
        // Calculate due date (loan start + N months)
        const dueDate = new Date(loanStartDate);
        dueDate.setMonth(dueDate.getMonth() + month);

        // Simple interest: same interest payment every month
        const interestPayment = investment.amount * interestRate;

        // Principal paid only in last month
        const principalPayment = month === loan.term_months ? investment.amount : 0;

        paymentsToCreate.push({
          loan_id: loan.id,
          investment_id: investment.id,
          due_date: dueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
          interest_payment: Math.round(interestPayment * 100) / 100,
          principal_payment: principalPayment,
          status: 'pending',
        });
      }
    }

    // Check if payments already exist for this loan
    const { data: existingPayments, error: checkError } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('loan_id', loan_id)
      .limit(1);

    if (checkError) {
      console.error('Failed to check existing payments', checkError);
      return NextResponse.json(
        { success: false, error: 'Failed to check existing payments' },
        { status: 500 }
      );
    }

    if (existingPayments && existingPayments.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Payments already exist for this loan' },
        { status: 400 }
      );
    }

    // Insert all payments
    const { data: createdPayments, error: insertError } = await supabaseAdmin
      .from('payments')
      .insert(paymentsToCreate)
      .select('id');

    if (insertError || !createdPayments) {
      console.error('Failed to insert payments', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create payments' },
        { status: 500 }
      );
    }

    // Log the payment generation event
    await supabaseAdmin.from('event_logs').insert({
      event_type: 'payment_generated',
      data: {
        loan_id: loan.id,
        payments_created: createdPayments.length,
        investments_count: investments.length,
        term_months: loan.term_months,
      },
    });

    return NextResponse.json(
      {
        success: true,
        created: createdPayments.length,
        loan_id: loan.id,
        investments_count: investments.length,
        payments_per_investment: loan.term_months,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error generating payments', error);
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

