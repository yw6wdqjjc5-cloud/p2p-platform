const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndFixSchema() {
  console.log('Checking loans table schema...\n');
  
  // Try to insert with approved_amount to see what columns are missing
  const { data, error } = await supabase
    .from('loans')
    .insert({
      borrower_id: '00000000-0000-0000-0000-000000000000', // fake ID to test
      asset_id: '00000000-0000-0000-0000-000000000000',
      requested_amount: 1000,
      term_months: 12,
      currency: 'USD',
      status: 'draft'
    })
    .select('id')
    .single();
  
  if (error && error.code !== '23503') { // 23503 is foreign key violation, which is expected
    console.log('Error:', error.message);
    console.log('Code:', error.code);
  } else {
    console.log('✅ Loans table has correct schema (or test insert worked despite fake IDs)');
  }
  
  console.log('\n📋 The schema.sql file needs to be applied to your Supabase database.');
  console.log('\nPlease follow these steps:');
  console.log('1. Go to: https://supabase.com/dashboard/project/tknysxsctsgmtkmputhg/editor');
  console.log('2. Click the "SQL Editor" tab');
  console.log('3. Copy the entire contents of db/schema.sql');
  console.log('4. Paste it into the SQL editor and click "Run"');
  console.log('\nThis will create all the necessary tables and columns.');
}

checkAndFixSchema();
