const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const EMAIL_FROM = process.env.EMAIL_FROM || 'NexaHost <support@nexahost.com>';

async function sendWelcome(user, plan) {
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: user.email,
    subject: `Welcome to NexaHost, ${user.name.split(' ')[0]}!`,
    html: `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#05050a;color:#f0eeff;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#1a0b35,#0d1e35);padding:48px 40px;text-align:center">
        <h1 style="font-size:32px;margin:0;background:linear-gradient(135deg,#a585ff,#00e5c3);-webkit-background-clip:text;-webkit-text-fill-color:transparent">NexaHost</h1>
        <p style="color:#a89ec9;margin:8px 0 0">Welcome aboard!</p>
      </div>
      <div style="padding:40px">
        <h2 style="font-size:22px;margin:0 0 16px">Hi ${user.name.split(' ')[0]}, your account is ready!</h2>
        <p style="color:#a89ec9;line-height:1.7">You're now on the <strong style="color:#a585ff">${plan}</strong> plan. Your 30-day free trial starts now.</p>
        <div style="margin:28px 0;background:#12121f;border-radius:12px;padding:20px;border:1px solid rgba(255,255,255,0.1)">
          <p style="margin:0 0 8px;font-size:14px;color:#6b6490">What's next:</p>
          <p style="margin:4px 0;font-size:14px">✓ Log in to your dashboard</p>
          <p style="margin:4px 0;font-size:14px">✓ Add your first website</p>
          <p style="margin:4px 0;font-size:14px">✓ Set up your professional email</p>
          <p style="margin:4px 0;font-size:14px">✓ Install WordPress in 1 click</p>
        </div>
        <a href="${process.env.FRONTEND_URL}/pages/customer-dashboard.html" style="display:inline-block;background:linear-gradient(135deg,#7c5cfc,#a585ff);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:16px">Go to My Dashboard →</a>
        <p style="margin-top:32px;font-size:13px;color:#6b6490">Need help? Reply to this email or open a support ticket anytime.</p>
      </div>
    </div>`
  });
}

async function sendPasswordReset(user, token) {
  const link = `${process.env.FRONTEND_URL}/pages/reset-password.html?token=${token}`;
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: user.email,
    subject: 'Reset your NexaHost password',
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2>Password Reset Request</h2>
      <p>Hi ${user.name},</p>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${link}" style="display:inline-block;background:#7c5cfc;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700">Reset Password</a>
      <p style="font-size:13px;color:#888;margin-top:20px">If you didn't request this, you can safely ignore this email.</p>
    </div>`
  });
}

async function sendInvoice(user, invoice) {
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: user.email,
    subject: `NexaHost Invoice #${invoice.id} — $${invoice.amount}`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2>Your Invoice</h2>
      <p>Hi ${user.name},</p>
      <p>Invoice <strong>#${invoice.id}</strong> for <strong>$${invoice.amount}</strong> has been generated for your ${invoice.plan} plan.</p>
      <p>Thank you for being a NexaHost customer!</p>
    </div>`
  });
}

module.exports = { sendWelcome, sendPasswordReset, sendInvoice };
