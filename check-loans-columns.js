const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLoansTable() {
  // First, let's check the OpenAPI spec from PostgREST
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    const spec = await response.json();
    
    if (spec.definitions && spec.definitions.loans) {
      console.log('Loans table schema from API:');
      console.log(JSON.stringify(spec.definitions.loans.properties, null, 2));
    }
  } catch (e) {
    console.log('Could not fetch API spec');
  }
  
  // Alternative: Try inserting with different field combinations
  console.log('\nTrying to discover loans table structure...\n');
  
  const testCombinations = [
    { id: '00000000-0000-0000-0000-000000000001' },
    { amount: 1000 },
    { loan_amount: 1000 },
    { requested_amount: 1000 },
  ];
  
  for (const testData of testCombinations) {
    const { error } = await supabase
      .from('loans')
      .insert(testData)
      .select();
    
    if (error) {
      console.log(`Test with ${Object.keys(testData).join(',')}: ${error.message}`);
    } else {
      console.log(`✅ Success with: ${Object.keys(testData).join(',')}`);
    }
  }
}

checkLoansTable();
