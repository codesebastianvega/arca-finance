import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function run() {
  console.log("Checking beta_feedback table...");
  const { data, error } = await supabase.from('beta_feedback').select('id').limit(1);
  if (error) {
    console.log("Table check error:", error.message);
  } else {
    console.log("beta_feedback table exists! Data:", data);
  }
}

run();
