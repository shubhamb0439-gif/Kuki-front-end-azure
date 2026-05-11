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

async function setupAdmin() {
  console.log('Setting up admin account...\n');

  // IMPORTANT: Change these credentials before running!
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  try {
    console.log('Step 1: Signing in or creating admin auth account...');

    // Try to sign in first
    let userId;
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });

    if (signInError) {
      // If sign in fails, try to sign up
      console.log('Sign in failed, attempting to create new account...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            full_name: 'Admin'
          }
        }
      });

      if (signUpError) throw signUpError;
      userId = signUpData.user.id;
      console.log('✓ Admin auth account created');
    } else {
      userId = signInData.user.id;
      console.log('✓ Signed in as admin');
    }

    console.log('User ID:', userId);

    console.log('\nStep 2: Creating admin profile...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: adminEmail,
        name: 'Admin',
        role: 'admin',
        currency: 'USD',
        preferred_language: 'en'
      }, {
        onConflict: 'id'
      })
      .select();

    if (profileError) {
      console.error('Profile error:', profileError);
    } else {
      console.log('✓ Admin profile created');
      console.log('Profile data:', profileData);
    }

    const { data: checkProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('\nVerification - Profile exists:', checkProfile);

    console.log('\n✓ Admin setup complete!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

setupAdmin();
