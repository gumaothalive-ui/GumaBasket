import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendOtpEmail } from '@/lib/mailer';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 });
    }

    // Check if email already registered
    const { data: existing } = await supabase
      .from('sellers')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists. Please log in.' },
        { status: 409 }
      );
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Upsert OTP record
    const { error: dbErr } = await supabase
      .from('signup_otps')
      .upsert({ email, otp, expires_at: expiresAt }, { onConflict: 'email' });

    if (dbErr) {
      return NextResponse.json(
        { success: false, error: 'Failed to store OTP. Please try again.' },
        { status: 500 }
      );
    }

    const sent = await sendOtpEmail(email, otp);
    if (!sent) {
      return NextResponse.json(
        { success: false, error: 'Failed to send verification email. Check your email address.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Unexpected error.' }, { status: 500 });
  }
}
