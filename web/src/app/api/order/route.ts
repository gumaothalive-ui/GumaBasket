import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { sendNotification, sendWhatsApp } from '@/services/notificationService';

// Maps static supplier_id keys → seller business_name stored in DB
// This ensures hardcoded catalog products always route to the correct vendor
const SUPPLIER_TO_VENDOR: Record<string, string> = {
  'fresh-farms':   'Unity cash and carry',
  'the-butchery':  'Unity cash and carry',
  'dairy-co':      'Unity cash and carry',
  'the-bakery':    'Unity cash and carry',
  'ice-cream-co':  'Unity cash and carry',
  'choc-world':    'Unity cash and carry',
  'pantry-plus':   'Unity cash and carry',
  'beverages-co':  'Unity cash and carry',
  'frozen-co':     'Unity cash and carry',
};

function generateOrderId(): string {
  return crypto.randomUUID();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cart, subtotal, shipping, user } = body;

    if (!cart || cart.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Validate Stock Before Proceeding
    for (const item of cart) {
      if (item.id && item.id.length === 36) { // Only check actual DB products
        const { data: dbProduct } = await supabase.from('products').select('title, stock_quantity').eq('id', item.id).single();
        if (dbProduct && dbProduct.stock_quantity < item.quantity) {
          return NextResponse.json({ error: `Insufficient stock for: ${dbProduct.title}` }, { status: 400 });
        }
      }
    }

    const orderId = generateOrderId();
    const orderRef = orderId.substring(0, 8).toUpperCase();

    // 1. Create the Order in Supabase as PENDING
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        user_id: user?.id || null,
        total_amount: subtotal,
        status: 'pending',
        shipping_address: shipping || null,
      });

    if (orderError) {
      console.warn('[Order API] orders insert warning (non-fatal):', orderError.message);
    }

    // 2. Insert Order Items
    const orderItems = cart.map((item: any) => ({
      order_id: orderId,
      product_id: typeof item.id === 'string' && item.id.length === 36 ? item.id : null,
      quantity: item.quantity,
      unit_price: item.price,
    }));
    await supabase.from('order_items').insert(orderItems);

    // Group for seller portal (still pending)
    const groupedByVendor = cart.reduce((acc: any, item: any) => {
      const resolvedVendor = item.vendorName || SUPPLIER_TO_VENDOR[item.supplier_id || ''] || 'GUMA BASKET';
      if (!acc[resolvedVendor]) {
        acc[resolvedVendor] = { vendor_name: resolvedVendor, items: [], total_amount: 0, customer_amount: 0, total_qty: 0 };
      }
      acc[resolvedVendor].items.push(`${item.title} (x${item.quantity})`);
      acc[resolvedVendor].total_amount += (item.price / 1.15) * item.quantity;
      acc[resolvedVendor].customer_amount += item.price * item.quantity;
      acc[resolvedVendor].total_qty += item.quantity;
      return acc;
    }, {});

    const sellerOrders = Object.values(groupedByVendor).map((group: any) => ({
      order_ref:       orderRef,
      vendor_name:     group.vendor_name,
      product_title:   group.items.join(', '),
      quantity:        group.total_qty,
      amount:          parseFloat(group.total_amount.toFixed(2)),
      customer_amount: parseFloat(group.customer_amount.toFixed(2)),
      status:          'pending',
    }));
    await supabase.from('seller_orders').insert(sellerOrders);

    console.log(`[Order API] ✅ Order ${orderRef} created as pending. Generating PayFast payload.`);

    // ── Generate PayFast Payload ──────────────────────────────────────────
    const merchantId = process.env.PAYFAST_MERCHANT_ID || '10000100';
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a';
    const passphrase = process.env.PAYFAST_PASSPHRASE || '';
    
    // Dynamically grab the exact origin the user is on (e.g. http://localhost:3001)
    const origin = req.headers.get('origin');
    const baseUrl = origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const payfastArgs: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${baseUrl}/checkout/success?order_id=${orderId}&order_ref=${orderRef}`,
      cancel_url: `${baseUrl}/checkout?cancelled=true`,
      notify_url: `${baseUrl}/api/payfast-webhook`,
      name_first: user?.user_metadata?.full_name?.split(' ')[0] || 'Guest',
      email_address: user?.email || 'guest@GUMA BASKET.com',
      m_payment_id: orderId,
      amount: parseFloat(subtotal).toFixed(2),
      item_name: `GUMA BASKET Order ${orderRef}`
    };

    let pfnvs = '';
    for (const key in payfastArgs) {
      if (payfastArgs[key] !== '') {
        pfnvs += `${key}=${encodeURIComponent(payfastArgs[key].trim()).replace(/%20/g, '+')}&`;
      }
    }
    pfnvs = pfnvs.slice(0, -1);
    if (passphrase) {
      pfnvs += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
    }
    const signature = crypto.createHash('md5').update(pfnvs).digest('hex');
    payfastArgs.signature = signature;

    const payfastUrl = process.env.PAYFAST_SANDBOX === 'false' 
      ? 'https://www.payfast.co.za/eng/process'
      : 'https://sandbox.payfast.co.za/eng/process';

    const isLocalhost = baseUrl.includes('localhost');
    const isSandbox = process.env.PAYFAST_SANDBOX !== 'false';

    if (isLocalhost) {
      console.log(`[Order API] ⚠️ Localhost detected. Spoofing successful payment...`);
      
      // Auto-approve the order since we skipped the Payfast webhook
      // For local testing of the Uber app, we auto-set seller_orders to 'ready' 
      // so it instantly pings the driver dashboard without needing manual vendor approval.
      await supabase.from('orders').update({ status: 'preparing' }).eq('id', orderId);
      await supabase.from('seller_orders').update({ status: 'ready' }).eq('order_ref', orderRef);

      // Send real confirmation email
      if (user?.email) {
        const itemNames    = cart.map((i: any) => `${i.title} x${i.quantity}`).join(', ');
        const customerName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
        await sendNotification(user.email, 'email', `✅ GUMA BASKET Order #${orderRef} Confirmed`, '', {
          orderRef,
          customerName,
          items: itemNames,
          itemsList: cart.map((i: any) => ({ title: i.title, quantity: i.quantity, price: i.price, imageUrl: i.imageUrl })),
          total: parseFloat(subtotal).toFixed(2),
          phone: shipping?.phone,
        });
      }

      // Send SMS to customer's phone number from checkout form
      if (shipping?.phone) {
        const itemNames  = cart.map((i: any) => `${i.title} x${i.quantity}`).join(', ');
        let phone = shipping.phone.replace(/\s+/g, '').replace(/-/g, '');
        if (phone.startsWith('0')) phone = '+27' + phone.slice(1);
        else if (!phone.startsWith('+')) phone = '+27' + phone;

        if (/^\+[1-9]\d{6,14}$/.test(phone)) {
          const smsMessage =
            `GUMA BASKET: Order #${orderRef} confirmed! 🛒\n` +
            `Items: ${cart.map((i: any) => `${i.title} x${i.quantity}`).join(', ')}\n` +
            `Total: R${parseFloat(subtotal).toFixed(2)}`;
          await sendNotification('', 'sms', '', smsMessage, { phone });
        } else {
          console.warn(`[SMS] Invalid phone number skipped. Input was: ${shipping.phone}`);
        }
      }

      // 🔔 Notify each vendor by SMS about the new order
      const uniqueVendors = [...new Set(sellerOrders.map((o: any) => o.vendor_name))];
      for (const vendorName of uniqueVendors) {
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('email, phone')
          .eq('business_name', vendorName)
          .single();

        const vendorItems = sellerOrders
          .filter((o: any) => o.vendor_name === vendorName)
          .map((o: any) => o.product_title)
          .join(', ');

        if (sellerData?.phone) {
          let sellerPhone = sellerData.phone.replace(/\s+/g, '').replace(/-/g, '');
          if (sellerPhone.startsWith('0')) sellerPhone = '+27' + sellerPhone.slice(1);
          else if (!sellerPhone.startsWith('+')) sellerPhone = '+27' + sellerPhone;

          if (/^\+[1-9]\d{6,14}$/.test(sellerPhone)) {
            await sendNotification('', 'sms', '', 
              `🛒 NEW ORDER #${orderRef} on GUMA BASKET!\nItems: ${vendorItems}\nTotal: R${parseFloat(subtotal).toFixed(2)}\nCheck your portal now!`,
              { phone: sellerPhone }
            );
            // Also send WhatsApp notification
            await sendWhatsApp(sellerPhone,
              `🛒 *NEW ORDER #${orderRef}* — GUMA BASKET\n\n` +
              `📦 *Items:* ${vendorItems}\n` +
              `💰 *Total:* R${parseFloat(subtotal).toFixed(2)}\n\n` +
              `👉 Check your portal: http://localhost:3001/orders`
            );
          }
        }
      }

      return NextResponse.json({
        success: true,
        isLocalBypass: true,
        bypassUrl: payfastArgs.return_url,
        order_id: orderId,
        order_ref: orderRef,
      });
    }

    return NextResponse.json({
      success: true,
      payfastUrl,
      payfastArgs,
      order_id: orderId,
      order_ref: orderRef,
    });

  } catch (error: any) {
    console.error('[Order API] ERROR:', error);
    return NextResponse.json({ error: error.message || 'Failed to place order' }, { status: 500 });
  }
}
