const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseServiceKey = '';
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseServiceKey = line.split('=')[1].trim();
});

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/tryout_events?select=id,title,status,flyer_image_url`, {
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`
    }
  });
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

run().catch(console.error);
