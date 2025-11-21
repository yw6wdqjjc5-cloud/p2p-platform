import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

type MarkPaidRequest = {
  payment_id: string;
};

function validateRequest(body: unknown): body is MarkPaidRequest {
  if (!body || typeof body !== 'object') return false;
  const { payment_id } = body as MarkPaidRequest;
  return typeof payment_id === 'string' && payment_id.length > 0;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (!validateRequest(payload)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: payment_id is required' },
        { status: 400 }
      );
    }

    const { payment_id } = payload;

    // Verify payment exists
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select('id, status')
      .eq('id', payment_id)
      .single();

    if (fetchError || !payment) {
      console.error('Failed to fetch payment', fetchError);
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (payment.status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Payment is already marked as paid' },
        { status: 400 }
      );
    }

    // Update payment status to 'paid' and set paid_at timestamp
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment_id);

    if (updateError) {
      console.error('Failed to update payment', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to mark payment as paid' },
        { status: 500 }
      );
    }

    // Log the payment marked paid event
    await supabaseAdmin.from('event_logs').insert({
      event_type: 'payment_marked_paid',
      data: {
        payment_id,
        previous_status: payment.status,
        paid_at: new Date().toISOString(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        payment_id,
        message: 'Payment marked as paid',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error marking payment as paid', error);
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

