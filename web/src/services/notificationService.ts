import nodemailer from 'nodemailer';

// ── Email transporter (Gmail) ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── SMS via Twilio ────────────────────────────────────────────────────────
async function sendSMS(to: string, message: string) {
  const accountSid       = process.env.TWILIO_ACCOUNT_SID;
  const authToken        = process.env.TWILIO_AUTH_TOKEN;
  const messagingService = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || !messagingService) {
    console.warn('[SMS] Twilio credentials not configured. Skipping SMS.');
    return;
  }

  const url  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    To:                 to,
    MessagingServiceSid: messagingService,
    Body:               message,
  });

  const res  = await fetch(url, {
    method:  'POST',
    headers: {
      Authorization:  'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const json = await res.json();
  if (!res.ok) {
    console.error('[SMS] Twilio error:', json);
  } else {
    console.log(`[SMS] ✅ Sent to ${to}: SID ${json.sid}`);
  }
}

// ── WhatsApp via Twilio ────────────────────────────────────────────────────
export async function sendWhatsApp(to: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_FROM || '+14155238886';

  if (!accountSid || !authToken) {
    console.warn('[WhatsApp] Twilio credentials not configured.');
    return;
  }

  // Normalize SA number → E.164
  let toNum = to.replace(/\s+/g, '').replace(/-/g, '');
  if (toNum.startsWith('0')) toNum = '+27' + toNum.slice(1);
  else if (!toNum.startsWith('+')) toNum = '+27' + toNum;

  const url  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    From: `whatsapp:${from}`,
    To:   `whatsapp:${toNum}`,
    Body: message,
  });

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      Authorization:  'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const json = await res.json();
  if (!res.ok) {
    console.error('[WhatsApp] Twilio error:', json.code, json.message);
  } else {
    console.log(`[WhatsApp] ✅ Sent to ${toNum}: SID ${json.sid}`);
  }
}


// ── Order confirmation email HTML ─────────────────────────────────────────
function buildOrderEmailHTML(orderRef: string, customerName: string, items: string, total: string, appUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:40px 48px;text-align:center;">
          <h1 style="color:#fff;font-size:28px;font-weight:900;margin:0;letter-spacing:-0.5px;">GUMA BASKET</h1>
          <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:6px 0 0;">Fresh groceries delivered to your door</p>
        </td></tr>

        <!-- Success Badge -->
        <tr><td style="padding:40px 48px 0;text-align:center;">
          <div style="display:inline-block;background:#d1fae5;border:1.5px solid #6ee7b7;border-radius:999px;padding:8px 20px;margin-bottom:24px;">
            <span style="color:#065f46;font-weight:800;font-size:13px;letter-spacing:0.06em;">✓ ORDER CONFIRMED</span>
          </div>
          <h2 style="font-size:24px;font-weight:900;color:#0f172a;margin:0 0 8px;">Thank you, ${customerName}!</h2>
          <p style="color:#64748b;font-size:14px;margin:0;">Your order has been received and is being prepared.</p>
        </td></tr>

        <!-- Order Ref -->
        <tr><td style="padding:24px 48px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;text-align:center;">
            <p style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Order Reference</p>
            <p style="color:#0f172a;font-size:28px;font-weight:900;font-family:monospace;margin:0;">#${orderRef}</p>
          </div>
        </td></tr>

        <!-- Items -->
        <tr><td style="padding:0 48px 24px;">
          <h3 style="font-size:13px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">Items Ordered</h3>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;">
            ${items}
          </div>
        </td></tr>

        <!-- Total -->
        <tr><td style="padding:0 48px 32px;">
          <div style="display:flex;justify-content:space-between;align-items:center;background:#0f172a;border-radius:12px;padding:20px 24px;">
            <span style="color:rgba(255,255,255,0.7);font-size:14px;font-weight:700;">Total Paid</span>
            <span style="color:#fff;font-size:22px;font-weight:900;">R ${total}</span>
          </div>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 48px 40px;text-align:center;">
          <a href="${appUrl}/track" style="display:inline-block;background:linear-gradient(135deg,#0f172a,#334155);color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:16px 40px;border-radius:10px;letter-spacing:0.04em;">📍 TRACK MY ORDER</a>
          <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;">Questions? Reply to this email or contact support.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 48px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">© 2025 GUMA BASKET · Fresh groceries delivered</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Main exported function ────────────────────────────────────────────────
export async function sendNotification(
  to: string,
  type: 'email' | 'sms',
  subject: string,
  message: string,
  meta?: {
    orderRef?: string;
    customerName?: string;
    items?: string;
    itemsList?: Array<{ title: string; quantity: number; imageUrl?: string; price?: number }>;
    total?: string;
    phone?: string;
  }
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (type === 'email') {
    try {
      let itemsHtml = `<p style="color:#334155;font-size:14px;line-height:1.8;margin:0;">${meta?.items || 'Your items'}</p>`;
      
      if (meta?.itemsList && meta.itemsList.length > 0) {
        itemsHtml = meta.itemsList.map(item => `
          <div style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #e2e8f0;${item === meta.itemsList![meta.itemsList!.length-1] ? 'border-bottom:none;' : ''}">
            <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=100&h=100&fit=crop'}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;margin-right:16px;" alt="" />
            <div style="flex:1;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">${item.title}</p>
              <p style="margin:0;font-size:12px;color:#64748b;">Qty: ${item.quantity}</p>
            </div>
            ${item.price ? `<div style="font-size:14px;font-weight:800;color:#0f172a;">R ${item.price.toFixed(2)}</div>` : ''}
          </div>
        `).join('');
      }

      const html = meta?.orderRef
        ? buildOrderEmailHTML(
            meta.orderRef,
            meta.customerName || 'Valued Customer',
            itemsHtml,
            meta.total || '0.00',
            appUrl
          )
        : `<p>${message}</p>`;

      await transporter.sendMail({
        from: `"GUMA BASKET 🛒" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`[Email] ✅ Sent order confirmation to ${to}`);
    } catch (err: any) {
      console.error('[Email] ❌ Failed to send:', err.message);
    }
  }

  if (type === 'sms' && meta?.phone) {
    await sendSMS(meta.phone, message);
  }
}
