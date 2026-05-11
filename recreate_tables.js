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

async function checkTables() {
  const tables = [
    'profiles',
    'employees',
    'employee_wages',
    'employee_loans',
    'employee_bonuses',
    'statements',
    'qr_transactions',
    'salary_adjustments',
    'friend_requests',
    'job_postings',
    'job_applications',
    'employee_ratings',
    'employer_ratings',
    'job_roles'
  ];

  console.log('Checking if tables exist:\n');

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✓ ${table}: exists`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n\nChecking admin account:');
  const { data: adminProfile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'admin@gmail.com')
    .maybeSingle();

  if (error) {
    console.log('❌ Error checking admin:', error.message);
  } else if (adminProfile) {
    console.log('✓ Admin profile exists:');
    console.log('  ID:', adminProfile.id);
    console.log('  Email:', adminProfile.email);
    console.log('  Name:', adminProfile.name);
    console.log('  Role:', adminProfile.role);
  } else {
    console.log('❌ Admin profile not found');
  }
}

checkTables();
