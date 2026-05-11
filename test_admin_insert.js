import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file
const envFile = readFileSync(join(__dirname, '.env'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdmin() {
  console.log('Testing admin profile insertion...\n');

  // Sign in as admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  console.log('✓ Signed in as admin');
  console.log('User ID:', authData.user.id);

  // Try to insert profile directly (authenticated request)
  console.log('\nAttempting to insert profile...');
  const { data: insertData, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email: adminEmail,
      name: 'Admin',
      role: 'admin'
    })
    .select();

  if (insertError) {
    console.error('Insert error:', insertError);
  } else {
    console.log('✓ Profile inserted:', insertData);
  }

  // Check if profile exists
  console.log('\nChecking if profile exists...');
  const { data: checkData, error: checkError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id);

  if (checkError) {
    console.error('Check error:', checkError);
  } else {
    console.log('Profiles found:', checkData);
  }

  // Check all profiles
  console.log('\nChecking all profiles...');
  const { data: allProfiles, error: allError } = await supabase
    .from('profiles')
    .select('*');

  if (allError) {
    console.error('All profiles error:', allError);
  } else {
    console.log('Total profiles:', allProfiles?.length);
    console.log('All profiles:', allProfiles);
  }
}

testAdmin();
