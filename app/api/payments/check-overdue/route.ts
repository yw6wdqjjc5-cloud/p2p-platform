import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Find all payments that are overdue (due_date < today AND status='pending')
    const { data: overduePayments, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('status', 'pending')
      .lt('due_date', today);

    if (fetchError) {
      console.error('Failed to fetch overdue payments', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch overdue payments' },
        { status: 500 }
      );
    }

    if (!overduePayments || overduePayments.length === 0) {
      return NextResponse.json(
        {
          success: true,
          overdue_count: 0,
          message: 'No overdue payments found',
        },
        { status: 200 }
      );
    }

    // Update status to 'overdue'
    const overdueIds = overduePayments.map((p) => p.id);
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({ status: 'overdue' })
      .in('id', overdueIds);

    if (updateError) {
      console.error('Failed to update payment statuses', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update payment statuses' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        overdue_count: overduePayments.length,
        message: `${overduePayments.length} payment(s) marked as overdue`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error checking overdue payments', error);
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


