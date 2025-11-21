const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLoanQuery() {
  const loanId = 'e56a0030-6748-4cec-a7d9-dffc25d2bd95';
  
  console.log('Testing loan query with joins...\n');
  
  // Test 1: Simple query
  const { data: loan1, error: error1 } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();
  
  if (error1) {
    console.log('❌ Simple query failed:', error1.message);
  } else {
    console.log('✅ Simple query succeeded');
    console.log('   Loan data:', JSON.stringify(loan1, null, 2));
  }
  
  // Test 2: Query with borrowers join
  const { data: loan2, error: error2 } = await supabase
    .from('loans')
    .select(`
      *,
      borrowers (
        id,
        country
      )
    `)
    .eq('id', loanId)
    .single();
  
  if (error2) {
    console.log('\n❌ Query with borrowers join failed:', error2.message);
  } else {
    console.log('\n✅ Query with borrowers join succeeded');
  }
  
  // Test 3: Query with assets join
  const { data: loan3, error: error3 } = await supabase
    .from('loans')
    .select(`
      *,
      assets (
        id,
        title
      )
    `)
    .eq('id', loanId)
    .single();
  
  if (error3) {
    console.log('\n❌ Query with assets join failed:', error3.message);
  } else {
    console.log('\n✅ Query with assets join succeeded');
  }
}

testLoanQuery();
