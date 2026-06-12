const db  = require('../config/db');
const whm = require('../utils/whm');

exports.getOverview = async (req, res, next) => {
  try {
    const [statsRes, planRes, revenueRes, ticketsRes] = await Promise.all([
      db.query(`SELECT
        COUNT(*) FILTER (WHERE role='customer') AS total_customers,
        COUNT(*) FILTER (WHERE plan_status='active') AS active,
        COUNT(*) FILTER (WHERE plan_status='trial') AS trials,
        COUNT(*) FILTER (WHERE plan_status='suspended') AS suspended,
        COUNT(*) FILTER (WHERE created_at >= NOW()-interval'30 days' AND role='customer') AS new_this_month
        FROM users`),
      db.query(`SELECT plan, COUNT(*) AS count FROM users WHERE role='customer' GROUP BY plan`),
      db.query(`SELECT DATE_TRUNC('month', created_at) AS month, SUM(amount) AS revenue
        FROM invoices WHERE status='paid' GROUP BY 1 ORDER BY 1 DESC LIMIT 7`),
      db.query(`SELECT COUNT(*) FILTER (WHERE status='open') AS open_tickets FROM tickets`),
    ]);

    const stats   = statsRes.rows[0];
    const planMap = {};
    planRes.rows.forEach(r => planMap[r.plan] = parseInt(r.count));

    const mrr = (planMap.starter||0)*5.99 + (planMap.business||0)*12.99 + (planMap.pro||0)*19.99;

    res.json({
      metrics: {
        mrr: Math.round(mrr * 100) / 100,
        customers:   parseInt(stats.total_customers),
        active:      parseInt(stats.active),
        trials:      parseInt(stats.trials),
        churned:     parseInt(stats.suspended),
        openTickets: parseInt(ticketsRes.rows[0].open_tickets),
        newThisMonth:parseInt(stats.new_this_month),
      },
      planDist: {
        starter:  planMap.starter  || 0,
        business: planMap.business || 0,
        pro:      planMap.pro      || 0,
      },
      revenueMonths: revenueRes.rows.map(r => ({
        month: new Date(r.month).toLocaleString('default',{month:'short'}),
        val:   parseFloat(r.revenue) || 0
      })).reverse(),
    });
  } catch (err) { next(err); }
};

exports.getCustomers = async (req, res, next) => {
  try {
    const { search, plan, status, page = 1, limit = 50 } = req.query;
    let query = `SELECT id,name,email,plan,plan_status,whm_domain,created_at,last_login FROM users WHERE role='customer'`;
    const params = [];
    let pi = 1;
    if (search) { query += ` AND (name ILIKE $${pi} OR email ILIKE $${pi})`; params.push(`%${search}%`); pi++; }
    if (plan)   { query += ` AND plan=$${pi}`;        params.push(plan);   pi++; }
    if (status) { query += ` AND plan_status=$${pi}`; params.push(status); pi++; }
    query += ` ORDER BY created_at DESC LIMIT $${pi} OFFSET $${pi+1}`;
    params.push(parseInt(limit), (parseInt(page)-1)*parseInt(limit));
    const result = await db.query(query, params);
    res.json({ customers: result.rows, page: parseInt(page) });
  } catch (err) { next(err); }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const [userRes, tickRes, invRes] = await Promise.all([
      db.query('SELECT id,name,email,plan,plan_status,whm_username,whm_domain,cpanel_url,created_at,last_login FROM users WHERE id=$1', [req.params.id]),
      db.query('SELECT * FROM tickets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10', [req.params.id]),
      db.query('SELECT * FROM invoices WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10', [req.params.id]),
    ]);
    if (!userRes.rows.length) return res.status(404).json({ message: 'Customer not found.' });
    res.json({ customer: userRes.rows[0], tickets: tickRes.rows, invoices: invRes.rows });
  } catch (err) { next(err); }
};

exports.updateCustomer = async (req, res, next) => {
  const { action, plan } = req.body;
  const { id } = req.params;
  try {
    const userRes = await db.query('SELECT whm_username, plan_status FROM users WHERE id=$1', [id]);
    if (!userRes.rows.length) return res.status(404).json({ message: 'Customer not found.' });
    const user = userRes.rows[0];

    if (action === 'suspended') {
      await db.query("UPDATE users SET plan_status='suspended', updated_at=NOW() WHERE id=$1", [id]);
      if (user.whm_username) await whm.suspendAccount(user.whm_username, 'Admin action').catch(()=>{});
    } else if (action === 'active') {
      await db.query("UPDATE users SET plan_status='active', updated_at=NOW() WHERE id=$1", [id]);
      if (user.whm_username) await whm.unsuspendAccount(user.whm_username).catch(()=>{});
    } else if (action === 'change_plan' && plan) {
      await db.query('UPDATE users SET plan=$1, updated_at=NOW() WHERE id=$2', [plan, id]);
      if (user.whm_username) await whm.changePackage(user.whm_username, plan).catch(()=>{});
    }

    res.json({ message: 'Customer updated.' });
  } catch (err) { next(err); }
};

exports.deleteCustomer = async (req, res, next) => {
  const { id } = req.params;
  try {
    const userRes = await db.query('SELECT whm_username FROM users WHERE id=$1', [id]);
    if (userRes.rows[0]?.whm_username)
      await whm.terminateAccount(userRes.rows[0].whm_username).catch(()=>{});
    await db.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ message: 'Customer deleted.' });
  } catch (err) { next(err); }
};

exports.getAllTickets = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT t.*, u.name AS customer_name, u.email AS customer_email
      FROM tickets t JOIN users u ON t.user_id=u.id
      ORDER BY
        CASE t.status WHEN 'open' THEN 0 WHEN 'awaiting_reply' THEN 1 ELSE 2 END,
        t.created_at DESC`);
    res.json({ tickets: result.rows });
  } catch (err) { next(err); }
};

exports.updateTicket = async (req, res, next) => {
  const { status, reply } = req.body;
  const { id } = req.params;
  try {
    if (reply) {
      await db.query(
        'INSERT INTO ticket_replies (ticket_id, user_id, message, is_admin, created_at) VALUES ($1,$2,$3,true,NOW())',
        [id, req.user.id, reply]
      );
    }
    if (status) {
      await db.query('UPDATE tickets SET status=$1, updated_at=NOW() WHERE id=$2', [status, id]);
    }
    res.json({ message: 'Ticket updated.' });
  } catch (err) { next(err); }
};

exports.getRevenue = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT DATE_TRUNC('month',created_at) AS month, SUM(amount) AS revenue, COUNT(*) AS invoices
      FROM invoices WHERE status='paid'
      GROUP BY 1 ORDER BY 1 DESC LIMIT 12`);
    res.json({ revenue: result.rows });
  } catch (err) { next(err); }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE created_at>=NOW()-interval'30 days') AS new_30d,
        COUNT(*) FILTER (WHERE plan_status='trial') AS trials,
        COUNT(*) FILTER (WHERE plan_status='active') AS active,
        COUNT(*) AS total
      FROM users WHERE role='customer'`);
    res.json({ analytics: result.rows[0] });
  } catch (err) { next(err); }
};

exports.getServers = async (req, res, next) => {
  try {
    // In production: fetch from WHM server stats API
    res.json({ servers: { cpu: 18, memory: 64, disk: 42, uptime: 99.97, status: 'operational' } });
  } catch (err) { next(err); }
};

exports.getAllDomains = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT d.*, u.name AS owner_name, u.plan FROM domains d
      JOIN users u ON d.user_id=u.id ORDER BY d.created_at DESC`);
    res.json({ domains: result.rows });
  } catch (err) { next(err); }
};

exports.getPlans = async (req, res, next) => {
  const plans = [
    { id:'starter',  name:'Starter Essential', price:5.99  },
    { id:'business', name:'Business Growth',   price:12.99 },
    { id:'pro',      name:'Pro Enterprise',    price:19.99 },
  ];
  res.json({ plans });
};

exports.updatePlan = async (req, res, next) => {
  // In production: update plan config in DB
  res.json({ message: 'Plan updated.' });
};

exports.getAllInvoices = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT i.*, u.name AS customer_name, u.email AS customer_email
      FROM invoices i JOIN users u ON i.user_id=u.id
      ORDER BY i.created_at DESC LIMIT 100`);
    res.json({ invoices: result.rows });
  } catch (err) { next(err); }
};

exports.sendBulkEmail = async (req, res, next) => {
  // In production: queue emails via SendGrid/Mailgun batch API
  res.json({ message: 'Bulk email queued.' });
};
