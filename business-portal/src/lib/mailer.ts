import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendOtpEmail(toEmail: string, otp: string) {
  const mailOptions = {
    from: `"GUMA BASKET Elite" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your GUMA BASKET Vendor Login Code',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px; background-color: #fcfcfc;">
        <h1 style="color: #000; font-weight: 900; letter-spacing: 2px;">GUMA BASKET BUSINESS</h1>
        <p style="color: #666; font-size: 16px; margin-top: 20px;">Use the following Elite Vendor Passcode to access your storefront:</p>
        <div style="margin: 40px auto; padding: 20px; background-color: #000; color: #fff; font-size: 32px; font-weight: 900; letter-spacing: 5px; width: fit-content; border-radius: 4px;">
          ${otp}
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 40px;">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}
