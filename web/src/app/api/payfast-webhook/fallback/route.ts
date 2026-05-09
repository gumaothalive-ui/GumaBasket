import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Fallback for localhost testing where webhooks don't reach
export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'No orderId' }, { status: 400 });

    console.log(`[Fallback API] Setting order ${orderId} to preparing (sandbox fallback)`);

    // Only update if it's currently pending to avoid overriding real webhook
    const { data } = await supabase.from('orders').select('status').eq('id', orderId).single();
    
    if (data && data.status === 'pending') {
      await supabase.from('orders').update({ status: 'preparing' }).eq('id', orderId);
      await supabase.from('seller_orders').update({ status: 'preparing' }).eq('order_ref', orderId.substring(0, 8).toUpperCase());
      
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
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
