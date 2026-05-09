require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: o } = await supabase.from('orders').select('id, status').order('created_at', { ascending: false }).limit(3);
  console.log("Recent Orders:", o);
  
  const { data: s } = await supabase.from('seller_orders').select('order_id, status').order('created_at', { ascending: false }).limit(3);
  console.log("Recent Seller Orders:", s);
}
check();
