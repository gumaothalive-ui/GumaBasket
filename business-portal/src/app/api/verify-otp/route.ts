import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, otp, password, businessName } = await req.json();

    if (!email || !otp || !password || !businessName) {
      return NextResponse.json({ success: false, error: 'All fields are required.' }, { status: 400 });
    }

    // Fetch stored OTP
    const { data: record, error: fetchErr } = await supabase
      .from('signup_otps')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchErr || !record) {
      return NextResponse.json(
        { success: false, error: 'No OTP found for this email. Please request a new code.' },
        { status: 404 }
      );
    }

    // Check expiry
    if (new Date() > new Date(record.expires_at)) {
      await supabase.from('signup_otps').delete().eq('email', email);
      return NextResponse.json(
        { success: false, error: 'OTP has expired. Please request a new code.' },
        { status: 410 }
      );
    }

    // Check OTP match
    if (record.otp !== otp) {
      return NextResponse.json(
        { success: false, error: 'Invalid code. Please check your email and try again.' },
        { status: 401 }
      );
    }

    // Create seller account
    const { error: insertErr } = await supabase
      .from('sellers')
      .insert({ email, password, business_name: businessName });

    if (insertErr) {
      return NextResponse.json(
        { success: false, error: `Registration failed: ${insertErr.message}` },
        { status: 500 }
      );
    }

    // Clean up OTP record
    await supabase.from('signup_otps').delete().eq('email', email);

    const response = NextResponse.json({ success: true, vendor: businessName });
    response.cookies.set('vendor_session', businessName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Unexpected error.' }, { status: 500 });
  }
}
