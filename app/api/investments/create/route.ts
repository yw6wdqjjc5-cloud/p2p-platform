import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

type InvestmentRequest = {
  loan_id: string;
  investor_email: string;
  amount: number;
};

function validateRequest(body: unknown): body is InvestmentRequest {
  if (!body || typeof body !== 'object') return false;

  const { loan_id, investor_email, amount } = body as InvestmentRequest;

  return (
    typeof loan_id === 'string' &&
    loan_id.length > 0 &&
    typeof investor_email === 'string' &&
    investor_email.length > 0 &&
    typeof amount === 'number' &&
    amount > 0
  );
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (!validateRequest(payload)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: loan_id, investor_email, and amount are required' },
        { status: 400 }
      );
    }

    const { loan_id, investor_email, amount } = payload;

    // Validate amount is positive
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Fetch loan to validate it exists and get requested amount
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('id, amount, status')
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) {
      console.error('Failed to fetch loan', loanError);
      return NextResponse.json(
        { success: false, error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Check loan status
    if (loan.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Loan is not available for investment' },
        { status: 400 }
      );
    }

    // Calculate current total invested
    const { data: existingInvestments, error: investmentsError } = await supabaseAdmin
      .from('investments')
      .select('amount')
      .eq('loan_id', loan_id);

    if (investmentsError) {
      console.error('Failed to fetch existing investments', investmentsError);
      return NextResponse.json(
        { success: false, error: 'Failed to calculate total invested' },
        { status: 500 }
      );
    }

    const currentTotalInvested = existingInvestments
      ? existingInvestments.reduce((sum, inv) => sum + (inv.amount || 0), 0)
      : 0;

    // Check if investment would exceed requested amount
    const newTotalInvested = currentTotalInvested + amount;
    if (newTotalInvested > loan.amount) {
      const remainingAmount = loan.amount - currentTotalInvested;
      return NextResponse.json(
        {
          success: false,
          error: `Investment would exceed loan amount. Maximum available: ${remainingAmount}`,
        },
        { status: 400 }
      );
    }

    // Insert investment
    const { data: investment, error: insertError } = await supabaseAdmin
      .from('investments')
      .insert({
        loan_id,
        investor_email,
        amount,
      })
      .select()
      .single();

    if (insertError || !investment) {
      console.error('Failed to create investment', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create investment' },
        { status: 500 }
      );
    }

    // Check if loan is now fully funded
    if (newTotalInvested >= loan.amount) {
      const { error: updateError } = await supabaseAdmin
        .from('loans')
        .update({ status: 'funded' })
        .eq('id', loan_id);

      if (updateError) {
        console.error('Failed to update loan status to funded', updateError);
        // Don't fail the request, just log the error
      }
    }

    // Log the investment creation event
    await supabaseAdmin.from('event_logs').insert({
      event_type: 'investment_created',
      data: {
        investment_id: investment.id,
        loan_id,
        investor_email,
        amount,
        total_invested: newTotalInvested,
        fully_funded: newTotalInvested >= loan.amount,
      },
    });

    return NextResponse.json(
      {
        success: true,
        investment,
        invested: newTotalInvested,
        fully_funded: newTotalInvested >= loan.amount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error creating investment', error);
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

