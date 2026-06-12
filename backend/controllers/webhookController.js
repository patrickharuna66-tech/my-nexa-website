const db  = require('../config/db');
const whm = require('../utils/whm');
const { sendInvoice } = require('../utils/email');

const PLAN_PRICES = { starter: 5.99, business: 12.99, pro: 19.99 };

// ─── STRIPE WEBHOOK ───
exports.stripeWebhook = async (req, res) => {
  let event;
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[STRIPE] Webhook signature failed:', err.message);
    return res.status(400).json({ message: 'Webhook signature verification failed.' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[STRIPE] Webhook processing error:', err.message);
    res.status(500).json({ message: 'Webhook processing failed.' });
  }
};

// ─── FLUTTERWAVE WEBHOOK ───
exports.flutterwaveWebhook = async (req, res) => {
  const hash = req.headers['verif-hash'];
  if (hash !== process.env.FLUTTERWAVE_WEBHOOK_SECRET)
    return res.status(401).json({ message: 'Invalid webhook.' });

  const payload = req.body;
  if (payload.event === 'charge.completed' && payload.data?.status === 'successful') {
    await handlePaymentSuccess({
      metadata: payload.data.meta,
      amount_paid: payload.data.amount,
      customer: { email: payload.data.customer?.email }
    }).catch(err => console.error('[FLW] Payment processing error:', err.message));
  }
  res.json({ status: 'ok' });
};

// ─── SHARED PAYMENT HANDLER ───
async function handlePaymentSuccess(paymentObj) {
  const email  = paymentObj.customer?.email || paymentObj.metadata?.email;
  const plan   = paymentObj.metadata?.plan;
  const amount = paymentObj.amount_paid || PLAN_PRICES[plan] || 0;

  const userRes = await db.query('SELECT * FROM users WHERE email=$1', [email]);
  if (!userRes.rows.length) return console.warn('[PAYMENT] User not found:', email);
  const user = userRes.rows[0];

  const renewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Activate account
  await db.query(
    `UPDATE users SET plan_status='active', plan=COALESCE($1,plan), updated_at=NOW() WHERE id=$2`,
    [plan || user.plan, user.id]
  );

  // Update subscription
  await db.query(
    `UPDATE subscriptions SET status='active', renews_at=$1, updated_at=NOW() WHERE user_id=$2`,
    [renewsAt, user.id]
  );

  // Create invoice
  const invNum = 'INV-' + Date.now();
  const inv = await db.query(
    `INSERT INTO invoices (user_id, invoice_number, plan, amount, status, created_at)
     VALUES ($1,$2,$3,$4,'paid',NOW()) RETURNING *`,
    [user.id, invNum, plan || user.plan, amount]
  );

  // Unsuspend WHM account if needed
  if (user.whm_username && user.plan_status === 'suspended')
    await whm.unsuspendAccount(user.whm_username).catch(()=>{});

  // Send invoice email
  sendInvoice(user, inv.rows[0]).catch(()=>{});
}

async function handlePaymentFailed(paymentObj) {
  const email = paymentObj.customer_email;
  if (!email) return;
  // Optionally send dunning email, flag account
  console.log('[PAYMENT] Failed for:', email);
}

async function handleSubscriptionCancelled(subscription) {
  const email = subscription.metadata?.email;
  if (!email) return;
  await db.query("UPDATE users SET plan_status='cancelled', updated_at=NOW() WHERE email=$1", [email]);
  console.log('[SUBSCRIPTION] Cancelled for:', email);
}
