import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const ids = [
    'a6829107-fe9f-4675-a2ea-0033371522ab',
    '215230da-a129-467f-96b7-0c739d776290',
    'e75f0456-b861-4180-9fec-8919a0deec95',
    'debbc65e-f1dc-4882-a4b5-b40c5a26b457'
  ];

  const results = [];

  for (const id of ids) {
    const { error } = await supabase.from('sellers').delete().eq('id', id);
    results.push({ id, status: error ? `Error: ${error.message}` : 'Deleted' });
  }

  // Also try email-based delete for any extras
  const emails = [
    'gumaqiqa323@gmail.com',
    'contact@unitedcashcarry.com',
    'info@devland.co.za',
    'wholesale@GUMA BASKET.co.za'
  ];

  for (const email of emails) {
    const { error } = await supabase.from('sellers').delete().eq('email', email);
    if (!error) results.push({ email, status: 'Deleted by email' });
  }

  const { data: remaining } = await supabase.from('sellers').select('id, email, business_name');
  
  return NextResponse.json({ 
    results,
    remaining: remaining ?? [],
    total_remaining: remaining?.length ?? 0
  });
}
