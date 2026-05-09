import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEMO_STORES = [
  { business_name: 'United Cash & Carry', email: 'contact@unitedcashcarry.com', password: 'password123' },
  { business_name: 'Devland Cash & Carry', email: 'info@devland.co.za', password: 'password123' },
  { business_name: 'Guma Basket Wholesale', email: 'wholesale@gumabasket.co.za', password: 'password123' }
];

const DEMO_PRODUCTS = [
  { title: 'Bulk Sugar 12.5kg', description: 'White sugar bulk pack', category: 'pantry', base_price: 180.00, unit: '12.5kg', stock_quantity: 50, vendor_name: 'United Cash & Carry' },
  { title: 'Flour 10kg', description: 'Cake wheat flour bulk bag', category: 'pantry', base_price: 140.00, unit: '10kg', stock_quantity: 30, vendor_name: 'United Cash & Carry' },
  { title: 'Cooking Oil 20L', description: 'Sunflower cooking oil', category: 'pantry', base_price: 360.00, unit: '20L', stock_quantity: 100, vendor_name: 'Devland Cash & Carry' },
  { title: 'Rice 10kg', description: 'Long grain parboiled rice', category: 'pantry', base_price: 120.00, unit: '10kg', stock_quantity: 40, vendor_name: 'Devland Cash & Carry' },
  { title: 'Premium Beef Mince Bulk 5kg', description: 'High-quality lean beef mince bulk box', category: 'meat-poultry', base_price: 450.00, unit: '5kg', stock_quantity: 15, vendor_name: 'Guma Basket Wholesale' },
  { title: 'Bulk Potatoes 10kg', description: 'Large washed potatoes sack', category: 'fruit-veg', base_price: 90.00, unit: '10kg', stock_quantity: 200, vendor_name: 'Guma Basket Wholesale' }
];

export async function GET() {
  const results = [];
  
  for (const store of DEMO_STORES) {
    const { error } = await supabase.from('sellers').insert(store);
    results.push(error ? `Error store ${store.business_name}: ${error.message}` : `Success store ${store.business_name}`);
  }

  const { data: sellers } = await supabase.from('sellers').select('id, business_name');

  for (const product of DEMO_PRODUCTS) {
    const sellerInfo = sellers?.find(s => s.business_name === product.vendor_name);
    const supplier_id = sellerInfo ? sellerInfo.id : null;
    
    const { data: existing } = await supabase.from('products').select('id').eq('title', product.title).eq('vendor_name', product.vendor_name);

    if (!existing || existing.length === 0) {
      const { error } = await supabase.from('products').insert([{ ...product, supplier_id, image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80', premium_price: product.base_price * 1.15 }]);
      results.push(error ? `Error product ${product.title}: ${error.message}` : `Success product ${product.title}`);
    } else {
      results.push(`Skipped product ${product.title}`);
    }
  }

  return NextResponse.json({ success: true, log: results });
}
