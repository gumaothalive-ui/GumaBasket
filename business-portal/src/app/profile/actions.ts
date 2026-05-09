'use server';

import { supabase } from '@/lib/supabase';

export async function saveBankDetails(formData: FormData) {
  const email = formData.get('email') as string;
  const vendorName = formData.get('vendorName') as string;
  const bankName = formData.get('bankName') as string;
  const branchCode = formData.get('branchCode') as string;
  const accountNumber = formData.get('accountNumber') as string;
  const accountHolder = formData.get('accountHolder') as string;

  if (!email || !bankName || !accountNumber) {
    return { success: false, error: 'Email, Bank Name, and Account Number are required.' };
  }

  const { error } = await supabase
    .from('vendor_profiles')
    .upsert({ 
      email, 
      vendor_name: vendorName,
      bank_name: bankName,
      branch_code: branchCode,
      account_number: accountNumber,
      account_holder: accountHolder
    }, { onConflict: 'email' });


  if (error) {
    console.error('Error saving profile:', error);
    return { success: false, error: `Database Error: ${error.message} (Is vendor_profiles migration run?)` };
  }

  return { success: true };
}

export async function getBankDetails(vendorName: string) {
  const { data, error } = await supabase
    .from('vendor_profiles')
    .select('*')
    .eq('vendor_name', vendorName)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return { success: false, error: 'No profile found' };
  }

  return {
    success: true,
    details: {
      email: data.email,
      bankName: data.bank_name,
      branchCode: data.branch_code,
      accountNumber: data.account_number,
      accountHolder: data.account_holder || ''
    }
  };
}

export async function saveStoreLogo(vendorName: string, logoUrl: string) {
  if (!vendorName || !logoUrl) return { success: false, error: 'Missing information.' };

  // Store logo in sellers table where logo_url exists
  const { error } = await supabase
    .from('sellers')
    .update({ logo_url: logoUrl })
    .eq('business_name', vendorName);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getStoreLogo(vendorName: string) {
  const { data, error } = await supabase
    .from('sellers')
    .select('logo_url')
    .eq('business_name', vendorName)
    .single();

  if (error || !data) return { success: false, logoUrl: null };
  return { success: true, logoUrl: data.logo_url as string | null };
}

export async function saveBusinessHours(vendorName: string, openingTime: string, closingTime: string) {
  if (!vendorName || !openingTime || !closingTime) {
    return { success: false, error: 'Vendor name and business hours are required.' };
  }

  // Save to sellers table — that's where business info lives
  const { error } = await supabase
    .from('sellers')
    .update({ opening_time: openingTime, closing_time: closingTime })
    .eq('business_name', vendorName);

  if (error) {
    console.error('Error saving business hours:', error);
    return { success: false, error: `${error.message} — Did you run the 20260420_store_hours.sql migration?` };
  }

  return { success: true };
}

export async function getBusinessHours(vendorName: string) {
  const { data, error } = await supabase
    .from('sellers')
    .select('opening_time, closing_time')
    .eq('business_name', vendorName)
    .single();

  if (error || !data) return { success: false, openingTime: null, closingTime: null };
  return { success: true, openingTime: data.opening_time as string | null, closingTime: data.closing_time as string | null };
}
export async function saveSellerPhone(vendorName: string, phone: string) {
  if (!vendorName) return { success: false, error: 'Missing vendor name.' };
  const { error } = await supabase
    .from('sellers')
    .update({ phone })
    .eq('business_name', vendorName);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getSellerPhone(vendorName: string) {
  const { data, error } = await supabase
    .from('sellers')
    .select('phone')
    .eq('business_name', vendorName)
    .single();
  if (error || !data) return { success: false, phone: null };
  return { success: true, phone: data.phone as string | null };
}

export async function saveStoreAddress(vendorName: string, address: string, locationLink: string, latitude: string, longitude: string) {
  if (!vendorName || !address) return { success: false, error: 'Missing vendor name or address.' };
  
  const updateData: any = { address };
  if (locationLink) updateData.location_link = locationLink;
  if (latitude) updateData.latitude = parseFloat(latitude);
  if (longitude) updateData.longitude = parseFloat(longitude);

  const { error } = await supabase
    .from('sellers')
    .update(updateData)
    .eq('business_name', vendorName);
    
  if (error) {
    console.error('Error saving store address:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function getStoreAddress(vendorName: string) {
  const { data, error } = await supabase
    .from('sellers')
    .select('address, location_link, latitude, longitude')
    .eq('business_name', vendorName)
    .single();
  if (error || !data) return { success: false, address: null, locationLink: null, latitude: null, longitude: null };
  return { 
    success: true, 
    address: data.address as string | null,
    locationLink: data.location_link as string | null,
    latitude: data.latitude as number | null,
    longitude: data.longitude as number | null
  };
}
