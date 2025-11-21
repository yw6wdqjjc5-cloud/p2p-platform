const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabase() {
  console.log('Testing database tables...\n');
  
  // Test each table
  const tables = ['users', 'borrowers', 'assets', 'cars', 'loans', 'risk_scores'];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: Table exists`);
    }
  }
  
  // Try inserting a test user
  console.log('\n\nTesting insertion pipeline...');
  
  const testEmail = `test-${Date.now()}@example.com`;
  
  // 1. Insert user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({ email: testEmail, phone: '+1234567890' })
    .select('id')
    .single();
  
  if (userError) {
    console.log('❌ User insert failed:', userError.message);
    return;
  }
  console.log('✅ User created:', user.id);
  
  // 2. Insert borrower
  const { error: borrowerError } = await supabase
    .from('borrowers')
    .insert({
      id: user.id,
      country: 'Test Country',
      kyc_status: 'pending',
      has_business: false
    });
  
  if (borrowerError) {
    console.log('❌ Borrower insert failed:', borrowerError.message);
    return;
  }
  console.log('✅ Borrower created');
  
  // 3. Insert asset
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .insert({
      borrower_id: user.id,
      type: 'car',
      title: 'Test Car',
      country: 'Test Country',
      raw_data: { test: true }
    })
    .select('id')
    .single();
  
  if (assetError) {
    console.log('❌ Asset insert failed:', assetError.message);
    return;
  }
  console.log('✅ Asset created:', asset.id);
  
  // 4. Insert car
  const { error: carError } = await supabase
    .from('cars')
    .insert({
      id: asset.id,
      brand: 'Toyota',
      model: 'Test',
      year: 2020,
      mileage: 10000,
      market_value_estimate: null
    });
  
  if (carError) {
    console.log('❌ Car insert failed:', carError.message);
    return;
  }
  console.log('✅ Car created');
  
  // 5. Insert loan
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .insert({
      borrower_id: user.id,
      asset_id: asset.id,
      requested_amount: 10000,
      term_months: 12,
      currency: 'USD',
      status: 'draft',
      approved_amount: null,
      interest_rate_monthly: null
    })
    .select('id')
    .single();
  
  if (loanError) {
    console.log('❌ Loan insert failed:', loanError.message);
    console.log('Error details:', JSON.stringify(loanError, null, 2));
    return;
  }
  console.log('✅ Loan created:', loan.id);
  
  console.log('\n✅ All tests passed!');
}

testDatabase().catch(console.error);
