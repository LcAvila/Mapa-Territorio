const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('SUPABASE_URL:', supabaseUrl ? '✅ OK' : '❌ MISSING');
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ OK' : '❌ MISSING');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ OK' : '❌ MISSING');

// Test getUser with a fake token to see what error we get
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  // Try to sign in as admin to get a real token
  console.log('\n--- Testing Supabase Auth Connection ---');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@mapaterritorio.com',
    password: 'admin123',
  });

  if (error) {
    console.error('❌ Sign-in failed:', error.message);
    console.error('   Code:', error.code);
    return;
  }

  console.log('✅ Sign-in successful!');
  console.log('   User email:', data.user.email);
  console.log('   Access token (first 40 chars):', data.session.access_token.substring(0, 40) + '...');

  // Now test getUser with the real token
  const { data: userData, error: userError } = await supabase.auth.getUser(data.session.access_token);
  if (userError) {
    console.error('❌ getUser failed:', userError.message);
  } else {
    console.log('✅ getUser successful! User:', userData.user.email);
  }
}

main().catch(console.error);
