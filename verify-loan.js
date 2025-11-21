const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyLoan() {
  const { data: loans, error } = await supabase
    .from('loans')
    .select(`
      id,
      amount,
      currency,
      term_months,
      status,
      borrower_id,
      asset_id
    `)
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (error) {
    console.log('Error fetching loans:', error.message);
    return;
  }
  
  console.log(`Found ${loans.length} loan(s):\n`);
  loans.forEach((loan, i) => {
    console.log(`${i + 1}. Loan ID: ${loan.id}`);
    console.log(`   Amount: ${loan.amount} ${loan.currency}`);
    console.log(`   Term: ${loan.term_months} months`);
    console.log(`   Status: ${loan.status}`);
    console.log(`   Borrower ID: ${loan.borrower_id}`);
    console.log(`   Asset ID: ${loan.asset_id}\n`);
  });
}

verifyLoan();
