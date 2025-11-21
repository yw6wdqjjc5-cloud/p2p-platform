const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createRiskScore() {
  const loanId = 'e56a0030-6748-4cec-a7d9-dffc25d2bd95';
  
  // Check what columns exist in risk_scores
  const { data: testInsert, error: testError } = await supabase
    .from('risk_scores')
    .insert({
      loan_id: loanId,
      model_version: 'mock-v1',
      score: 75,
      recommended_ltv: 0.65,
      comments: 'Mock scoring for testing purposes.',
      raw_ai_response: { score: 75, recommended_ltv: 0.65, comments: 'Mock' }
    })
    .select()
    .single();
  
  if (testError) {
    console.log('❌ Error:', testError.message);
  } else {
    console.log('✅ Created risk score:', testInsert.id);
  }
}

createRiskScore();
