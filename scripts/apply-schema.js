#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applySchema() {
  try {
    console.log('📖 Reading schema.sql...');
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('🔌 Connecting to Supabase...');

    // Split schema into individual statements and execute them
    // Note: This is a simplified approach. For production, consider using proper migration tools
    const statements = schema
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`  [${i + 1}/${statements.length}] Executing...`);

      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      // If rpc doesn't work, try direct execution (this will fail gracefully)
      if (error) {
        // Try alternative approach - create tables directly
        // Note: Supabase doesn't expose direct SQL execution via the JS client for security
        // We'll need to use the HTTP API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ sql: statement }),
        });

        if (!response.ok && response.status !== 404) {
          console.error(`    ⚠️  Warning: ${error.message || response.statusText}`);
        }
      }
    }

    console.log('\n✅ Schema application completed!');
    console.log('Note: If you see warnings above, you may need to apply the schema manually via Supabase Dashboard.');
    console.log('Visit: https://supabase.com/dashboard/project/tknysxsctsgmtkmputhg/editor');

    // Verify tables exist
    console.log('\n🔍 Verifying tables...');
    const { data: tables, error: tablesError } = await supabase.from('users').select('count');

    if (tablesError) {
      console.error('⚠️  Cannot verify tables:', tablesError.message);
      console.log('\n📋 Please apply the schema manually:');
      console.log('1. Go to: https://supabase.com/dashboard/project/tknysxsctsgmtkmputhg/editor');
      console.log('2. Copy the SQL from: db/schema.sql');
      console.log('3. Paste and run in the SQL Editor');
    } else {
      console.log('✅ Tables verified successfully!');
    }
  } catch (error) {
    console.error('❌ Error applying schema:', error.message);
    console.log('\n📋 Please apply the schema manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/tknysxsctsgmtkmputhg/editor');
    console.log('2. Copy the SQL from: db/schema.sql');
    console.log('3. Paste and run in the SQL Editor');
    process.exit(1);
  }
}

applySchema();



