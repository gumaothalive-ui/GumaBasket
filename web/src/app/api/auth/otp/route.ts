import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';

// Use the persistent vendor_otps table from Supabase for cross-instance reliability.
// This prevents OTPs from "vanishing" during serverless function cold starts.

function generateDerivedPassword(email: string) {
  return crypto.createHash('sha256').update(email + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).digest('hex').substring(0, 16);
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    // 1. Generate a 6 digit secure code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // 2. Persist to DB for cross-instance reliability
    const { error: dbError } = await supabase
      .from('vendor_otps')
      .upsert({ 
        email: email.toLowerCase(), 
        otp: otpCode, 
        verified: false,
        expires_at: new Date(expiresAt).toISOString(),
        created_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (dbError) throw new Error(`Database persistence failed: ${dbError.message}`);

    // 3. Setup Nodemailer explicitly pulling from the .env.local variables the user provided
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('EMAIL_USER and EMAIL_PASS environment variables are required.');
    }
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"GUMA BASKET Elite" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your GUMA BASKET Login Code',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px; background-color: #fcfcfc;">
          <h1 style="color: #000; font-weight: 900; letter-spacing: 2px;">GUMA BASKET ELITE</h1>
          <p style="color: #666; font-size: 16px; margin-top: 20px;">Use the following premium passcode to access your account instantly:</p>
          <div style="margin: 40px auto; padding: 20px; background-color: #10b981; color: #fff; font-size: 36px; font-weight: 900; letter-spacing: 8px; width: fit-content; border-radius: 8px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
            ${otpCode}
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
      `,
    };

    // 4. Send the email visually identically to how business-portal handles it
    await transporter.sendMail(mailOptions);
    console.log('[Native OTP] Sent explicitly formatted code ' + otpCode + ' to ' + email);

    // Provide a development-fallback header so the client can simulate completion if the user checks terminal
    return NextResponse.json({ success: true, message: 'OTP Sent' });

  } catch (error: any) {
    console.error('[Native OTP API] Failed to send:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { email, token, password } = await req.json();
    const cleanEmail = email.toLowerCase();
    
    // 1. Verify the code against our DB
    const { data: stored, error: fetchError } = await supabase
      .from('vendor_otps')
      .select('*')
      .eq('email', cleanEmail)
      .single();

    if (fetchError || !stored || stored.otp !== token || new Date(stored.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invalid or expired code. Please try again.' }, { status: 400 });
    }

    // Mark as verified/consumed (optional: delete it instead)
    await supabase.from('vendor_otps').delete().eq('email', cleanEmail);

    // 2. Perform the actual Supabase DB authentication using the provided password or fallback to derived
    const finalPassword = password || generateDerivedPassword(cleanEmail);

    const signInResult = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: finalPassword
    });

    let user = signInResult.data.user;
    let session = signInResult.data.session;

    // If perfectly successful, the user existed! If not, we automatically create them behind the scenes (SignUp flow handled implicitly by OTP!)
    if (signInResult.error && signInResult.error.message.includes('Invalid login credentials')) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: finalPassword,
      });
      if (signUpError) throw signUpError;
      
      // Attempt login one final time to fetch session
      const authRes = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: finalPassword
      });
      user = authRes.data.user;
      session = authRes.data.session;
    }

    if (!user || !session) {
      return NextResponse.json({ error: 'Authentication layer failed to attach session.' }, { status: 500 });
    }

    return NextResponse.json({ user, session });

  } catch (error: any) {
    console.error('[Verify OTP API] Verification failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
