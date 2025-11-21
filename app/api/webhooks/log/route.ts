import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

type WebhookLogRequest = {
  event_type: string;
  data?: Record<string, unknown>;
};

function validateRequest(body: unknown): body is WebhookLogRequest {
  if (!body || typeof body !== 'object') return false;
  const { event_type } = body as WebhookLogRequest;
  return typeof event_type === 'string' && event_type.length > 0;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (!validateRequest(payload)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: event_type is required' },
        { status: 400 }
      );
    }

    const { event_type, data } = payload;

    // Insert into event_logs
    const { data: logEntry, error: insertError } = await supabaseAdmin
      .from('event_logs')
      .insert({
        event_type,
        data: data || {},
      })
      .select('id, created_at')
      .single();

    if (insertError || !logEntry) {
      console.error('Failed to insert event log', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to log event' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        log_id: logEntry.id,
        created_at: logEntry.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error logging webhook event', error);
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


