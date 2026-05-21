import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');

async function testSupabase() {
  const supaUrl = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("URL:", supaUrl);
  
  const supabase = createClient(supaUrl, anonKey);
  const supaAdmin = createClient(supaUrl, serviceKey);
  
  const email = 'syahrulardi@it.student.pens.ac.id';
  const password = 'pens_cas_bypass_2026!';

  console.log("1. Check if user exists in auth.users via admin...");
  const { data: users, error: adminErr } = await supaAdmin.auth.admin.listUsers();
  if (adminErr) {
    console.error("Admin List Users Error:", adminErr.message);
  } else {
    const user = users.users.find(u => u.email === email);
    console.log("User exists:", !!user, user ? user.id : '');
  }

  console.log("2. Attempting to sign in with password...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("SignIn Error:", error.message, error.name, error.status);
  } else {
    console.log("SignIn Success:", data.user.id);
  }
}

testSupabase();
