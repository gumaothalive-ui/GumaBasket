import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase'; // Updated to use real Supabase client for database operations

/**
 * POST /api/payment/create
 * 
 * 1. Creates a 'pending' order in Supabase
 * 2. Builds a signed PayFast payment request with the Order UUID
 * 3. Returns PayFast URL + form data
 */

const PAYFAST_SANDBOX = process.env.PAYFAST_SANDBOX === 'true';
const PAYFAST_URL = PAYFAST_SANDBOX
  ? 'https://sandbox.payfast.co.za/eng/process'
  : 'https://www.payfast.co.za/eng/process';

function buildSignature(data: Record<string, string>, passphrase: string): string {
  const paramString = Object.keys(data)
    .sort()
    .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
    .join('&');

  const withPassphrase = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
    : paramString;

  return crypto.createHash('md5').update(withPassphrase).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cart, subtotal, shipping, user } = body;

    if (!cart || cart.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // 1. Create the Pending Order in Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id || null, // Allow guest checkouts if policy allows
        total_amount: subtotal,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      console.error('[DB] Order creation failed:', orderError);
      throw new Error('Failed to initiate order in database');
    }

    // 2. Insert Order Items (optional but recommended for record keeping)
    const orderItems = cart.map((item: any) => ({
      order_id: order.id,
      product_id: item.id.startsWith('shp-') ? null : item.id, // Handle external products
      quantity: item.quantity,
      unit_price: item.price,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) {
      console.warn('[DB] Failed to save order items, but continuing with payment...', itemsError);
    }

    // 2b. Create Seller Orders (Business Portal View)
    const sellerOrders = cart.filter((item: any) => !!item.vendorName).map((item: any) => ({
      order_ref: order.id.substring(0, 8).toUpperCase(),
      vendor_name: item.vendorName,
      product_title: item.title,
      quantity: item.quantity,
      amount: (item.basePrice || (item.price / 1.15)) * item.quantity,
      customer_amount: item.price * item.quantity,
      status: 'pending' // pending PayFast payment
    }));
    
    if (sellerOrders.length > 0) {
      const { error: sellerError } = await supabase.from('seller_orders').insert(sellerOrders);
      if (sellerError) {
        console.warn('[DB] Failed to save seller orders (is table created?):', sellerError.message);
      }
    }

    // 3. Prepare PayFast Request
    const merchantId = process.env.PAYFAST_MERCHANT_ID!;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY!;
    const passphrase = process.env.PAYFAST_PASSPHRASE || '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const orderId = order.id; // Use the Supabase UUID

    const itemName = cart.length === 1
      ? cart[0].title
      : `GUMA BASKET Order (${cart.length} items)`;

    const itemDescription = cart
      .map((item: any) => `${item.title} x${item.quantity}`)
      .join(', ')
      .slice(0, 255);

    const data: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${appUrl}/payment/success?order=${orderId}`,
      cancel_url: `${appUrl}/payment/cancel`,
      notify_url: `${appUrl}/api/payment/notify`,
      name_first: shipping?.firstName || 'Customer',
      name_last: shipping?.lastName || 'GUMA BASKET',
      email_address: user?.email || shipping?.email || 'customer@GUMA BASKET.co.za',
      m_payment_id: orderId, // Crucial: This links PayFast to our DB Order
      amount: subtotal.toFixed(2),
      item_name: itemName.slice(0, 100),
      item_description: itemDescription,
      custom_str1: user?.id || 'guest',
      custom_str2: orderId,
    };

    // Clean empty values
    Object.keys(data).forEach(key => {
      if (data[key] === '' || data[key] === undefined) delete data[key];
    });

    const signature = buildSignature(data, passphrase);
    data.signature = signature;

    return NextResponse.json({
      payfast_url: PAYFAST_URL,
      form_data: data,
      order_id: orderId,
    });

  } catch (error: any) {
    console.error('[PayFast] Create payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
