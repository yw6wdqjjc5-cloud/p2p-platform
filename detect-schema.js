const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function detectSchema() {
  console.log('Detecting actual database schema...\n');
  
  // Try to query each table to see what we get
  const tables = {
    users: ['id', 'email', 'phone', 'role', 'created_at'],
    borrowers: ['id', 'country', 'kyc_status', 'has_business', 'created_at'],
    assets: ['id', 'borrower_id', 'type', 'title', 'description', 'country', 'city', 'raw_data', 'created_at'],
    cars: ['id', 'vin', 'brand', 'model', 'year', 'mileage', 'market_value_estimate'],
    loans: ['id', 'borrower_id', 'asset_id', 'requested_amount', 'approved_amount', 'currency', 'interest_rate_monthly', 'term_months', 'status', 'created_at']
  };
  
  for (const [tableName, columns] of Object.entries(tables)) {
    const selectColumns = columns.join(',');
    const { data, error } = await supabase
      .from(tableName)
      .select(selectColumns)
      .limit(0);
    
    if (error) {
      console.log(`\n${tableName}:`);
      console.log(`  Status: ❌ Error`);
      console.log(`  Message: ${error.message}`);
      
      // Try with minimal columns
      const { error: minError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      
      if (minError) {
        console.log(`  Table might not exist properly`);
      }
    } else {
      console.log(`\n${tableName}: ✅ All columns accessible`);
    }
  }
}

detectSchema();
