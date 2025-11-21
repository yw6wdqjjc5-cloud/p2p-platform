const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkActualColumns() {
  console.log('Fetching actual table structures from Supabase...\n');
  
  // Query the information schema to get actual columns
  const tables = ['users', 'borrowers', 'assets', 'cars', 'loans'];
  
  for (const table of tables) {
    // Just try to select with * and see what we get back
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (!error && data) {
      console.log(`${table}:`);
      if (data.length > 0) {
        console.log('  Columns:', Object.keys(data[0]).join(', '));
      } else {
        console.log('  Table exists but is empty. Attempting insert to discover columns...');
      }
    } else if (error) {
      console.log(`${table}: Error - ${error.message}`);
    }
  }
}

checkActualColumns();
