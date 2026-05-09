'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function loginWithPassword(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  // Look up seller by email
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !seller) {
    return { success: false, error: 'No account found with that email. Please sign up first.' };
  }

  // Check password
  if (seller.password !== password) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  // Set session cookie
  (await cookies()).set('vendor_session', seller.business_name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  });

  return { success: true, vendor: seller.business_name };
}

export async function registerSeller(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const businessName = formData.get('businessName') as string;

  if (!email || !password || !businessName) {
    return { success: false, error: 'All fields are required.' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  // Check if email already registered
  const { data: existing } = await supabase
    .from('sellers')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    return { success: false, error: 'An account with this email already exists. Please log in.' };
  }

  // Create seller
  const { error } = await supabase
    .from('sellers')
    .insert({ email, password, business_name: businessName });

  if (error) {
    return { success: false, error: `Registration failed: ${error.message}` };
  }

  // Set session cookie
  (await cookies()).set('vendor_session', businessName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  });

  return { success: true, vendor: businessName };
}

export async function getSession() {
  const sessionCookie = (await cookies()).get('vendor_session');
  if (!sessionCookie || !sessionCookie.value) {
    return { success: false, vendorName: null };
  }
  return { success: true, vendorName: decodeURIComponent(sessionCookie.value) };
}

export async function logout() {
  (await cookies()).delete('vendor_session');
  return { success: true };
}
