import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('tryout_events')
    .select('id, title, status, flyer_image_url')
    .in('status', ['scheduled', 'live']);
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Active events in DB:");
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
