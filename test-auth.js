import { createClient } from '@supabase/supabase-js';

const supaUrl = process.env.VITE_SUPABASE_URL;
const supaKey = process.env.VITE_SUPABASE_ANON_KEY;
const supa = createClient(supaUrl, supaKey);

async function test() {
  console.log('Testing password123...');
  let res = await supa.auth.signInWithPassword({ email: 'syahrulardi@it.student.pens.ac.id', password: 'password123' });
  console.log('Result 1:', res.error ? res.error.message : 'Success');

  console.log('Testing pens_cas_bypass_2026!...');
  res = await supa.auth.signInWithPassword({ email: 'syahrulardi@it.student.pens.ac.id', password: 'pens_cas_bypass_2026!' });
  console.log('Result 2:', res.error ? res.error.message : 'Success');
}
test();
