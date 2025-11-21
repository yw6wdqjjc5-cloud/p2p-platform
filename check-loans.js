const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLoans() {
  const { data: loans, error } = await supabase
    .from('loans')
    .select('id, status, amount, currency')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('Recent loans:\n');
  loans.forEach((loan, i) => {
    console.log(`${i + 1}. ID: ${loan.id}`);
    console.log(`   Status: ${loan.status}`);
    console.log(`   Amount: ${loan.amount} ${loan.currency}\n`);
  });
  
  // Check for published loans
  const { data: publishedLoans } = await supabase
    .from('loans')
    .select('id, status')
    .eq('status', 'published');
  
  console.log(`\nPublished loans: ${publishedLoans?.length || 0}`);
}

checkLoans();
