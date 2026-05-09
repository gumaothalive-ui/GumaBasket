import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

// Helper to verify the ITN signature and IP address
async function verifyPayFastITN(req: NextRequest) {
  const formData = await req.formData();
  const payload: Record<string, string> = {};
  formData.forEach((value, key) => {
    payload[key] = value.toString();
  });

  // Verify IP Address (optional but recommended for strictly secure apps)
  // Actually, we'll verify the signature

  const signature = payload.signature;
  if (!signature) throw new Error('Missing signature');

  const passphrase = process.env.PAYFAST_PASSPHRASE || '';
  
  let pfnvs = '';
  // PayFast ITN posts back the variables in specific ways, but we can reconstruct it
  // Usually, it's safer to post the exact payload back to payfast for validation (ITN validation)
  
  const validateUrl = process.env.PAYFAST_SANDBOX === 'false'
    ? 'https://www.payfast.co.za/eng/query/validate'
    : 'https://sandbox.payfast.co.za/eng/query/validate';

  // Make a request back to PayFast to validate the ITN
  const params = new URLSearchParams();
  for (const key in payload) {
    if (key !== 'signature') {
       params.append(key, payload[key]);
    }
  }

  const response = await fetch(validateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const text = await response.text();
  if (text !== 'VALID') {
    throw new Error('ITN Validation Failed');
  }

  return payload;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyPayFastITN(req);
    
    // PayFast payment status
    const paymentStatus = payload.payment_status;
    const orderId = payload.m_payment_id;

    if (paymentStatus === 'COMPLETE') {
      console.log(`[Webhook] Payment complete for order ${orderId}`);
      
      // Update order status in main table
      await supabase
        .from('orders')
        .update({ status: 'preparing' })
        .eq('id', orderId);

      // Update seller orders status
      await supabase
        .from('seller_orders')
        .update({ status: 'preparing' })
        .eq('order_ref', orderId.substring(0, 8).toUpperCase());

      // Fetch order details for notifications
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, products(title, image_url)')
        .eq('order_id', orderId);
        
      const mappedItems = orderItems?.map((item: any) => ({
        title: (item.products as any)?.title || (Array.isArray(item.products) ? item.products[0]?.title : 'Product'),
        quantity: item.quantity,
        price: item.unit_price,
        imageUrl: (item.products as any)?.image_url || (Array.isArray(item.products) ? item.products[0]?.image_url : undefined)
      })) || [];

      // Decrement stock levels
      for (const item of orderItems || []) {
        if (item.product_id) {
          const { data: pData } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
          if (pData) {
             const newStock = Math.max(0, pData.stock_quantity - item.quantity);
             await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.product_id);
          }
        }
      }

      if (orderData) {
        const { sendNotification } = await import('@/services/notificationService');
        const orderRef = orderData.id.substring(0, 8).toUpperCase();
        
        let phone = orderData.shipping_address?.phone;
        const total = orderData.total_amount?.toFixed(2);
        
        if (orderData.user_id) {
          const { data: userData } = await supabase.auth.admin.getUserById(orderData.user_id);
          const email = userData?.user?.email;
          if (email) {
            await sendNotification(email, 'email', `✅ GUMA BASKET Order #${orderRef} Confirmed`, '', {
              orderRef, customerName: 'Valued Customer', items: 'Your recent order items', itemsList: mappedItems, total, phone
            });
          }
        }

        if (phone) {
          phone = phone.replace(/\s+/g, '').replace(/-/g, '');
          if (phone.startsWith('0')) phone = '+27' + phone.slice(1);
          else if (!phone.startsWith('+')) phone = '+27' + phone;

          if (/^\+[1-9]\d{6,14}$/.test(phone)) {
            const smsMessage = `GUMA BASKET: Order #${orderRef} confirmed! 🛒\nTotal: R${total}`;
            await sendNotification('', 'sms', '', smsMessage, { phone });
          } else {
            console.warn(`[SMS] Invalid phone number skipped: ${orderData.shipping_address?.phone}`);
          }
        }
      }

    } else {
      console.log(`[Webhook] Payment status ${paymentStatus} for order ${orderId}`);
    }

    return new NextResponse('OK', { status: 200 });

  } catch (err: any) {
    console.error('[PayFast Webhook] Error:', err.message);
    return new NextResponse('Error: ' + err.message, { status: 400 });
  }
}
