const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  // Try to select all to see what columns exist
  const { data, error } = await supabase
    .from('risk_scores')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('Existing columns:', Object.keys(data[0]));
  } else {
    console.log('Table is empty. Trying minimal insert...');
    
    // Try minimal insert
    const { data: insertData, error: insertError } = await supabase
      .from('risk_scores')
      .insert({
        loan_id: 'e56a0030-6748-4cec-a7d9-dffc25d2bd95',
        score: 75
      })
      .select();
    
    if (insertError) {
      console.log('Insert error:', insertError.message);
    } else {
      console.log('Success! Columns:', insertData && insertData[0] ? Object.keys(insertData[0]) : 'unknown');
    }
  }
}

checkSchema();
