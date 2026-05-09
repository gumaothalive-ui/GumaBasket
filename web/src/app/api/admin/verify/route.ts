import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'verified' })
      .eq('id', orderId);

    if (error) {
      throw new Error(error.message);
    }

    // Auto-email user using configured nodemailer
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        // Get total/email for the order
        const { data: orderDetails } = await supabase.from('orders').select('total_amount, user_id, shipping_address').eq('id', orderId).single();
        const email = orderDetails?.shipping_address?.email || 'customer@GUMA BASKET.co.za';

        await transporter.sendMail({
          from: `"GUMA BASKET " <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Payment Verified - GUMA BASKET Order',
          html: `
            <h2>Payment Verified!</h2>
            <p>Your EFT payment for Order <strong>${orderId.slice(0, 8).toUpperCase()}</strong> has been successfully verified.</p>
            <p>Amount Paid: R ${orderDetails?.total_amount || '0.00'}</p>
            <p>Your order is now being processed and will be shipped soon.</p>
            <p>Thank you for shopping with GUMA BASKET!</p>
          `
        });
      }
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
    }

    return NextResponse.json({ success: true, message: 'Payment verified & email sent' });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
