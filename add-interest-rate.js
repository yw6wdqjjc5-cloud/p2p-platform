const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addInterestRate() {
  console.log('Setting default interest rate for loans...\n');
  
  // Update published/funded loans with a default 2% monthly interest rate
  const { data: loans, error } = await supabase
    .from('loans')
    .select('id, status')
    .in('status', ['published', 'funded']);
  
  if (error) {
    console.log('Error fetching loans:', error.message);
    return;
  }
  
  console.log(`Found ${loans?.length || 0} loans to update`);
  
  // Note: Since interest_rate_monthly column doesn't exist in the table,
  // we'll use a default rate of 2% (0.02) in the dashboard calculations
  console.log('\n⚠️  Note: interest_rate_monthly column does not exist in loans table');
  console.log('Dashboard will use a default rate of 2% per month (0.02)');
  console.log('\nTo add the column properly, run this SQL in Supabase:');
  console.log('------------------------------------------------------------');
  console.log('ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS interest_rate_monthly numeric DEFAULT 0.02;');
  console.log('UPDATE public.loans SET interest_rate_monthly = 0.02 WHERE interest_rate_monthly IS NULL;');
  console.log('------------------------------------------------------------');
}

addInterestRate();
