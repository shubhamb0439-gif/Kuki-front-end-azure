import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file manually
const envFile = readFileSync(join(__dirname, '.env'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  console.error('URL:', supabaseUrl);
  console.error('Key:', supabaseAnonKey ? 'present' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminAccount() {
  const adminEmail = 'admin@gmail.com';
  const adminPassword = 'Admin123';

  try {
    console.log('Creating admin user via signup...');

    // Sign up the admin user
    const { data: userData, error: userError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          full_name: 'Admin'
        }
      }
    });

    if (userError) {
      console.error('Error creating admin user:', userError);
      return;
    }

    if (!userData.user) {
      console.error('No user data returned');
      return;
    }

    console.log('Admin user created:', userData.user.id);

    // Wait a bit for the user to be created
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create profile with admin role
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userData.user.id,
        email: adminEmail,
        name: 'Admin',
        role: 'admin',
        currency: 'USD',
        preferred_language: 'en'
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
      return;
    }

    console.log('Admin profile created successfully');
    console.log('\nAdmin account credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('User ID:', userData.user.id);
    console.log('\nYou can now login with these credentials.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createAdminAccount();
