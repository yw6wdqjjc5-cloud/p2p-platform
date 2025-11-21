const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyInvestmentsSchema() {
  console.log('Creating investments table...\n');
  
  // Check if table exists
  const { data: existingInvestments, error: checkError } = await supabase
    .from('investments')
    .select('id')
    .limit(1);
  
  if (!checkError) {
    console.log('✅ Investments table already exists!');
    return;
  }
  
  console.log('⚠️  Investments table does not exist.');
  console.log('\nPlease apply the schema manually:');
  console.log('1. Go to: https://supabase.com/dashboard/project/tknysxsctsgmtkmputhg/editor');
  console.log('2. Click "SQL Editor"');
  console.log('3. Paste and run the following SQL:\n');
  console.log('------------------------------------------------------------');
  console.log(`
-- Create investments table
create table if not exists public.investments (
    id uuid primary key default uuid_generate_v4(),
    loan_id uuid references public.loans(id) not null,
    investor_email text not null,
    amount numeric not null check (amount > 0),
    created_at timestamptz default now()
);

-- Create indexes
create index if not exists idx_investments_loan_id on public.investments (loan_id);
create index if not exists idx_investments_investor_email on public.investments (investor_email);
  `);
  console.log('------------------------------------------------------------\n');
}

applyInvestmentsSchema();
