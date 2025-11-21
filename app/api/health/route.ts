import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Check environment variables
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabaseServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

    // Test Supabase connection
    let supabaseConnected = false;
    try {
      const { error } = await supabaseAdmin.from('users').select('id').limit(1);
      supabaseConnected = !error;
    } catch (err) {
      console.error('Supabase connection test failed:', err);
    }

    const allChecks = hasSupabaseUrl && hasSupabaseServiceKey && supabaseConnected;

    return NextResponse.json(
      {
        status: allChecks ? 'healthy' : 'degraded',
        environment: {
          NEXT_PUBLIC_SUPABASE_URL: hasSupabaseUrl ? '✓' : '✗',
          SUPABASE_SERVICE_ROLE_KEY: hasSupabaseServiceKey ? '✓' : '✗',
          OPENAI_API_KEY: hasOpenAIKey ? '✓' : '✗',
        },
        supabase: {
          connected: supabaseConnected ? '✓' : '✗',
          client_initialized: !!supabaseAdmin ? '✓' : '✗',
        },
        timestamp: new Date().toISOString(),
      },
      { status: allChecks ? 200 : 503 }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



