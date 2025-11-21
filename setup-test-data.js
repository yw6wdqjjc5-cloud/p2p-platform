const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupTestData() {
  const loanId = 'e56a0030-6748-4cec-a7d9-dffc25d2bd95';
  
  console.log('Setting up test data for investor marketplace...\n');
  
  // 1. Create a mock risk score
  const { data: riskScore, error: riskError } = await supabase
    .from('risk_scores')
    .insert({
      loan_id: loanId,
      asset_id: '8a91dcb3-5a66-4e20-a4a4-799055cf8679',
      model_version: 'mock-v1',
      score: 75,
      recommended_ltv: 0.65,
      comments: 'Mock scoring for testing purposes.',
      raw_ai_response: { score: 75, recommended_ltv: 0.65, comments: 'Mock scoring for testing purposes.' }
    })
    .select()
    .single();
  
  if (riskError) {
    console.log('❌ Failed to create risk score:', riskError.message);
  } else {
    console.log('✅ Created risk score');
  }
  
  // 2. Update loan status to published
  const { error: updateError } = await supabase
    .from('loans')
    .update({ status: 'published' })
    .eq('id', loanId);
  
  if (updateError) {
    console.log('❌ Failed to update loan status:', updateError.message);
  } else {
    console.log('✅ Updated loan status to published');
  }
  
  // 3. Verify
  const { data: loan } = await supabase
    .from('loans')
    .select('id, status, amount, currency')
    .eq('id', loanId)
    .single();
  
  console.log('\n📊 Test loan ready:');
  console.log(`   ID: ${loan.id}`);
  console.log(`   Status: ${loan.status}`);
  console.log(`   Amount: ${loan.amount} ${loan.currency}`);
  
  console.log('\n✨ Test data setup complete!');
  console.log('\nYou can now:');
  console.log('1. Visit: http://localhost:3000/investor/deals');
  console.log('2. Click "View Deal" on the Toyota Camry loan');
  console.log('3. Make a test investment');
}

setupTestData();
