const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  const { data: loans } = await supabase
    .from('loans')
    .select('*')
    .limit(1);
  
  if (loans && loans.length > 0) {
    console.log('Loans table columns:', Object.keys(loans[0]));
  }
}

checkSchema();
