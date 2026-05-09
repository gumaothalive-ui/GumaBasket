import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/payment/notify
 * 
 * PayFast ITN (Instant Transaction Notification) handler.
 * PayFast calls this endpoint AFTER every payment attempt — successful or failed.
 * 
 * Security checks:
 * 1. Validate the signature matches our passphrase
 * 2. Verify request came from PayFast's IP addresses
 * 3. Check payment_status === 'COMPLETE'
 * 
 * PayFast ITN docs: https://developers.payfast.co.za/docs#notify
 */

const PAYFAST_VALID_IPS = [
  '197.97.145.144',
  '197.97.145.145',
  '197.97.145.146',
  '197.97.145.147',
  '197.97.145.148',
  '197.97.145.149',
  '197.97.145.150',
  '197.97.145.151',
  // Sandbox IPs
  '196.33.227.224',
  '196.33.227.225',
  '196.33.227.226',
  '196.33.227.227',
];

const PAYFAST_SANDBOX = process.env.PAYFAST_SANDBOX === 'true';

function validateSignature(data: Record<string, string>, passphrase: string): boolean {
  const receivedSignature = data.signature;
  const dataWithoutSig = { ...data };
  delete dataWithoutSig.signature;

  const paramString = Object.keys(dataWithoutSig)
    .sort()
    .map(key => `${key}=${encodeURIComponent(dataWithoutSig[key]).replace(/%20/g, '+')}`)
    .join('&');

  const withPassphrase = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
    : paramString;

  const computedSignature = crypto.createHash('md5').update(withPassphrase).digest('hex');
  return computedSignature === receivedSignature;
}

export async function POST(req: NextRequest) {
  try {
    // Parse form-encoded body
    const text = await req.text();
    const params = new URLSearchParams(text);
    const data: Record<string, string> = {};
    params.forEach((value, key) => { data[key] = value; });

    console.log('[PayFast ITN] Received notification:', {
      payment_status: data.payment_status,
      order_id: data.m_payment_id,
      amount: data.amount_gross,
      custom_str2: data.custom_str2,
    });

    // 1. Validate signature
    const passphrase = process.env.PAYFAST_PASSPHRASE || '';
    if (!validateSignature(data, passphrase)) {
      console.error('[PayFast ITN] ❌ Invalid signature');
      return new NextResponse('Invalid signature', { status: 400 });
    }

    // 2. Skip IP check in sandbox mode
    if (!PAYFAST_SANDBOX) {
      const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
      const isValidIp = PAYFAST_VALID_IPS.some(ip => clientIp.includes(ip));
      if (!isValidIp) {
        console.error('[PayFast ITN] ❌ Invalid IP:', clientIp);
        return new NextResponse('Unauthorized IP', { status: 403 });
      }
    }

    // 3. Handle payment outcome
    const orderId = data.m_payment_id || data.custom_str2;
    const status = data.payment_status;
    const amountPaid = parseFloat(data.amount_gross || '0');

    if (status === 'COMPLETE') {
      console.log(`[PayFast ITN] ✅ Payment COMPLETE for order ${orderId} — R${amountPaid}`);

      // Update the Order status in Supabase to 'processing' (or 'paid')
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', orderId);

      // Synchonize business portal orders
      const shortRef = orderId.substring(0, 8).toUpperCase();
      await supabase
        .from('seller_orders')
        .update({ status: 'completed' })
        .eq('order_ref', shortRef);

      if (updateError) {
        console.error('[DB] Failed to update order status:', updateError);
        // We still return 200 OK to PayFast to stop retries, as we've logged the success
      }

      // SEND AUTOMATED ORDER RECEIPT TO CUSTOMER!
      try {
        const customerEmail = data.email_address;
        if (customerEmail) {
          const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
              user: process.env.EMAIL_USER || 'GUMA BASKET380@gmail.com',
              pass: process.env.EMAIL_PASS || 'pxog cqgl zqsk trfs',
            },
          });
          await transporter.sendMail({
            from: '"GUMA BASKET Elite Orders" <' + (process.env.EMAIL_USER || 'GUMA BASKET380@gmail.com') + '>',
            to: customerEmail,
            subject: `Payment Receipt: Order #${orderId.slice(0, 8)}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 40px; background: #fff; max-width: 600px; margin: auto; border: 1px solid #eaeaea;">
                <h2 style="color: #10b981; margin-bottom: 2px;">Thank you for your order!</h2>
                <p style="color: #666;">We have successfully received your payment of <strong>R${amountPaid}</strong>.</p>
                <hr style="border-top: 1px solid #f0f0f0; margin: 30px 0;" />
                <p style="font-size: 14px; color: #888;">Order Reference: ${orderId}</p>
                <p style="font-size: 14px; color: #888;">Status: <strong>Processing for Delivery</strong></p>
                <div style="margin-top: 40px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Track My Order</a>
                </div>
              </div>
            `,
          });
          console.log(`[Automated Receipt] Sent email to ${customerEmail}`);
        }
      } catch (emailErr) {
        console.error('[Automated Receipt] Failed to send confirmation email:', emailErr);
      }

    } else if (status === 'CANCELLED') {
      console.log(`[PayFast ITN] ⚠️ Payment CANCELLED for order ${orderId}`);
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    } else if (status === 'FAILED') {
      console.log(`[PayFast ITN] ❌ Payment FAILED for order ${orderId}`);
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    }

    // PayFast expects a 200 OK response
    return new NextResponse('OK', { status: 200 });

  } catch (error: any) {
    console.error('[PayFast ITN] Error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}
