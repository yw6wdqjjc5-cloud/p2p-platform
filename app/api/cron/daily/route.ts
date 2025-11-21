import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const DEFAULT_INTEREST_RATE = 0.02;

export async function POST(req: Request) {
  try {
    let generatedPaymentsCount = 0;
    let overdueCount = 0;

    // Step 1: Check overdue payments
    const today = new Date().toISOString().split('T')[0];

    const { data: overduePayments, error: fetchOverdueError } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('status', 'pending')
      .lt('due_date', today);

    if (!fetchOverdueError && overduePayments && overduePayments.length > 0) {
      const overdueIds = overduePayments.map((p) => p.id);
      const { error: updateOverdueError } = await supabaseAdmin
        .from('payments')
        .update({ status: 'overdue' })
        .in('id', overdueIds);

      if (!updateOverdueError) {
        overdueCount = overduePayments.length;
      }
    }

    // Step 2: Check active loans and generate payments if needed
    const { data: activeLoans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('id, term_months, created_at')
      .in('status', ['published', 'funded']);

    if (!loansError && activeLoans && activeLoans.length > 0) {
      for (const loan of activeLoans) {
        // Check if payments already exist for this loan
        const { data: existingPayments, error: checkPaymentsError } = await supabaseAdmin
          .from('payments')
          .select('id')
          .eq('loan_id', loan.id)
          .limit(1);

        // Skip if payments already generated or if there's an error checking
        if (checkPaymentsError || (existingPayments && existingPayments.length > 0)) {
          continue;
        }

        // Fetch investments for this loan
        const { data: investments, error: investmentsError } = await supabaseAdmin
          .from('investments')
          .select('id, amount')
          .eq('loan_id', loan.id);

        if (investmentsError || !investments || investments.length === 0) {
          continue;
        }

        // Generate payments
        const loanStartDate = loan.created_at ? new Date(loan.created_at) : new Date();
        const paymentsToCreate = [];

        for (const investment of investments) {
          for (let month = 1; month <= loan.term_months; month++) {
            const dueDate = new Date(loanStartDate);
            dueDate.setMonth(dueDate.getMonth() + month);

            const interestPayment = investment.amount * DEFAULT_INTEREST_RATE;
            const principalPayment = month === loan.term_months ? investment.amount : 0;

            paymentsToCreate.push({
              loan_id: loan.id,
              investment_id: investment.id,
              due_date: dueDate.toISOString().split('T')[0],
              interest_payment: Math.round(interestPayment * 100) / 100,
              principal_payment: principalPayment,
              status: 'pending',
            });
          }
        }

        // Insert payments
        const { data: createdPayments, error: insertPaymentsError } = await supabaseAdmin
          .from('payments')
          .insert(paymentsToCreate)
          .select('id');

        if (!insertPaymentsError && createdPayments) {
          generatedPaymentsCount += createdPayments.length;
        }
      }
    }

    // Step 3: Log the cron execution
    await supabaseAdmin.from('event_logs').insert({
      event_type: 'cron_daily',
      data: {
        generated_payments_count: generatedPaymentsCount,
        overdue_count: overdueCount,
        execution_time: new Date().toISOString(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        generated: generatedPaymentsCount,
        overdue: overdueCount,
        message: `Cron job completed: ${generatedPaymentsCount} payments generated, ${overdueCount} marked overdue`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in daily cron job', error);

    // Log error
    await supabaseAdmin.from('event_logs').insert({
      event_type: 'cron_daily_error',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    });

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


