const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function completeTest() {
  const loanId = 'e56a0030-6748-4cec-a7d9-dffc25d2bd95';
  
  console.log('🧪 Complete Investor Marketplace Test\n');
  
  // 1. Create risk score
  console.log('1. Creating risk score...');
  const { data: riskScore, error: riskError } = await supabase
    .from('risk_scores')
    .insert({
      loan_id: loanId,
      score: 75,
      risk_level: 'low'
    })
    .select()
    .single();
  
  if (riskError) {
    console.log('   ❌ Error:', riskError.message);
  } else {
    console.log('   ✅ Risk score created:', riskScore.id);
  }
  
  // 2. Check loan status
  console.log('\n2. Checking loan status...');
  const { data: loan } = await supabase
    .from('loans')
    .select('id, status, amount, currency')
    .eq('id', loanId)
    .single();
  
  console.log(`   Status: ${loan.status}`);
  console.log(`   Amount: ${loan.amount} ${loan.currency}`);
  
  // 3. Test investment
  console.log('\n3. Creating test investment...');
  const { data: investment, error: investError } = await supabase
    .from('investments')
    .insert({
      loan_id: loanId,
      investor_email: 'test@investor.com',
      amount: 1000000
    })
    .select()
    .single();
  
  if (investError) {
    console.log('   ❌ Error:', investError.message);
  } else {
    console.log('   ✅ Investment created:', investment.id);
    console.log(`   Amount: ${investment.amount}`);
  }
  
  // 4. Check total invested
  console.log('\n4. Checking total invested...');
  const { data: investments } = await supabase
    .from('investments')
    .select('amount')
    .eq('loan_id', loanId);
  
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  console.log(`   Total invested: ${totalInvested.toLocaleString()} ${loan.currency}`);
  console.log(`   Remaining: ${(loan.amount - totalInvested).toLocaleString()} ${loan.currency}`);
  console.log(`   Progress: ${((totalInvested / loan.amount) * 100).toFixed(1)}%`);
  
  console.log('\n✨ Test complete!');
  console.log('\n📍 Next steps:');
  console.log('   Visit: http://localhost:3000/investor/deals');
  console.log('   Click "View Deal" on the Toyota Camry loan');
  console.log('   Make additional investments via the UI');
}

completeTest();
