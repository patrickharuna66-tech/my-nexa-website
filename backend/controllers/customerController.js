const db     = require('../config/db');
const bcrypt = require('bcryptjs');
const whm    = require('../utils/whm');

exports.getAccount = async (req, res, next) => {
  try {
    const uid = req.user.id;
    const [userRes, subRes, usageRes] = await Promise.all([
      db.query('SELECT id,name,email,plan,plan_status,whm_domain,cpanel_url,trial_ends_at,created_at FROM users WHERE id=$1', [uid]),
      db.query('SELECT * FROM subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [uid]),
      db.query('SELECT * FROM usage_snapshots WHERE user_id=$1 ORDER BY snapped_at DESC LIMIT 1', [uid]),
    ]);
    const user = userRes.rows[0];
    const sub  = subRes.rows[0] || {};
    const snap = usageRes.rows[0] || {};

    res.json({
      plan: { name: sub.plan_name || user.plan, price: sub.price || 0, renewsAt: sub.renews_at, status: user.plan_status },
      usage: {
        disk:      { used: snap.disk_used_gb || 0,      total: snap.disk_total_gb || 50 },
        bandwidth: { used: snap.bandwidth_used_gb || 0, total: null },
        emails:    { used: snap.emails_count || 0,      total: null },
        databases: { used: snap.databases_count || 0,   total: 50 },
      },
      cpanelUrl: user.cpanel_url,
      trialEndsAt: user.trial_ends_at,
    });
  } catch (err) { next(err); }
};

exports.getWebsites = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM websites WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ websites: result.rows });
  } catch (err) { next(err); }
};

exports.getEmails = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM email_accounts WHERE user_id=$1', [req.user.id]);
    res.json({ emails: result.rows });
  } catch (err) { next(err); }
};

exports.getDatabases = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM databases WHERE user_id=$1', [req.user.id]);
    res.json({ databases: result.rows });
  } catch (err) { next(err); }
};

exports.getDomains = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM domains WHERE user_id=$1', [req.user.id]);
    res.json({ domains: result.rows });
  } catch (err) { next(err); }
};

exports.getInvoices = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM invoices WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]
    );
    res.json({ invoices: result.rows });
  } catch (err) { next(err); }
};

exports.getTickets = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM tickets WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]
    );
    res.json({ tickets: result.rows });
  } catch (err) { next(err); }
};

exports.createTicket = async (req, res, next) => {
  const { subject, message, department } = req.body;
  if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required.' });
  try {
    const result = await db.query(
      `INSERT INTO tickets (user_id, subject, message, department, status, created_at)
       VALUES ($1,$2,$3,$4,'open',NOW()) RETURNING *`,
      [req.user.id, subject, message, department || 'General Support']
    );
    res.status(201).json({ ticket: result.rows[0] });
  } catch (err) { next(err); }
};

exports.replyTicket = async (req, res, next) => {
  const { message } = req.body;
  const { id } = req.params;
  try {
    await db.query(
      `INSERT INTO ticket_replies (ticket_id, user_id, message, is_admin, created_at)
       VALUES ($1,$2,$3,false,NOW())`,
      [id, req.user.id, message]
    );
    await db.query("UPDATE tickets SET status='awaiting_reply', updated_at=NOW() WHERE id=$1 AND user_id=$2", [id, req.user.id]);
    res.json({ message: 'Reply sent.' });
  } catch (err) { next(err); }
};

exports.getUsage = async (req, res, next) => {
  try {
    // In production: fetch from WHM API
    const snap = await db.query(
      'SELECT * FROM usage_snapshots WHERE user_id=$1 ORDER BY snapped_at DESC LIMIT 1', [req.user.id]
    );
    res.json({ usage: snap.rows[0] || {} });
  } catch (err) { next(err); }
};

exports.updateSettings = async (req, res, next) => {
  const { name, email, phone, country } = req.body;
  try {
    await db.query(
      'UPDATE users SET name=COALESCE($1,name), phone=COALESCE($2,phone), country=COALESCE($3,country), updated_at=NOW() WHERE id=$4',
      [name, phone, country, req.user.id]
    );
    res.json({ message: 'Settings updated.' });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8)
    return res.status(400).json({ message: 'Provide current and new password (min 8 chars).' });
  try {
    const result = await db.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    const valid  = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });
    const hash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await db.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Password updated.' });
  } catch (err) { next(err); }
};
