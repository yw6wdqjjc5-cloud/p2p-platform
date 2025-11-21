const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPaymentsTable() {
  console.log('Checking payments table...\n');
  
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('❌ Table does not exist or has issues:', error.message);
    console.log('\n📋 SQL to create payments table:\n');
    console.log('------------------------------------------------------------');
    console.log(`
create table if not exists public.payments (
    id uuid primary key default uuid_generate_v4(),
    loan_id uuid references public.loans(id) not null,
    investment_id uuid references public.investments(id) not null,
    due_date date not null,
    interest_payment numeric not null,
    principal_payment numeric not null default 0,
    status text not null default 'pending' check (status in ('pending', 'paid', 'overdue')),
    created_at timestamptz default now(),
    paid_at timestamptz
);

create index if not exists idx_payments_loan_id on public.payments (loan_id);
create index if not exists idx_payments_investment_id on public.payments (investment_id);
create index if not exists idx_payments_status on public.payments (status);
create index if not exists idx_payments_due_date on public.payments (due_date);
    `);
    console.log('------------------------------------------------------------\n');
  } else {
    console.log('✅ Payments table exists');
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    }
  }
}

checkPaymentsTable();
