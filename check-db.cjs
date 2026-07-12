const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vdfifjocleoavrjubvon.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZmlmam9jbGVvYXZyanVidm9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzAzOTgyNCwiZXhwIjoyMDk4NjE1ODI0fQ.mvBBN836aceb4AFXJsP6RvWFFrGcaBXTjML1cYJLleE'
);

async function check() {
  console.log('Checking connection and tables...');
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Error (table might be missing):', error.message);
  } else {
    console.log('Table "profiles" exists. Data count:', data.length);
  }

  const { data: bData, error: bError } = await supabase.from('businesses').select('*').limit(1);
  if (bError) {
    console.error('Error with "businesses" table:', bError.message);
  } else {
    console.log('Table "businesses" exists. Data count:', bData.length);
  }
}

check();
