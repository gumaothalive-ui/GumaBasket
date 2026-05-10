const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dtfypdvcqjniiafmzucq.supabase.co';
const supabaseAnonKey = 'sb_publishable_IQNuWxaRMCIqK690TkK6tg_xoi4BAFM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log('Checking for tables in Supabase...');
  
  const tables = ['seller_orders', 'seller_payouts', 'order_messages'];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ Table "${table}" error:`, error.message);
    } else {
      console.log(`✅ Table "${table}" exists.`);
    }
  }
}

checkTables();
