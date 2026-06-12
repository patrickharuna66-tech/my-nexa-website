const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db     = require('../config/db');
const { sendWelcome, sendPasswordReset } = require('../utils/email');
const whm    = require('../utils/whm');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

const PLAN_PRICES = { starter: 5.99, business: 12.99, pro: 19.99 };
const PLAN_NAMES  = { starter: 'Starter Essential', business: 'Business Growth', pro: 'Pro Enterprise' };

exports.register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  const { name, email, password, plan } = req.body;
  try {
    // Check existing
    const exists = await db.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ message: 'An account with that email already exists.' });

    // Hash password
    const rounds    = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passHash  = await bcrypt.hash(password, rounds);

    // Trial end date
    const trialDays = parseInt(process.env.TRIAL_DAYS) || 30;
    const trialEnd  = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    // Insert user
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, plan, plan_status, trial_ends_at, created_at)
       VALUES ($1,$2,$3,'customer',$4,'trial',$5,NOW())
       RETURNING id, name, email, role, plan, plan_status, trial_ends_at`,
      [name, email, passHash, plan, trialEnd]
    );
    const user = result.rows[0];

    // Create WHM hosting account (async, don't block registration)
    let whmData = null;
    try {
      whmData = await whm.createHostingAccount(user, plan);
      await db.query(
        'UPDATE users SET whm_username=$1, whm_domain=$2, cpanel_url=$3 WHERE id=$4',
        [whmData.username, whmData.domain, whmData.cpanelUrl, user.id]
      );
    } catch (whmErr) {
      console.error('[WHM] Account creation failed (non-fatal):', whmErr.message);
      // Queue for manual setup or retry
    }

    // Log subscription record
    await db.query(
      `INSERT INTO subscriptions (user_id, plan, price, status, trial_ends_at, created_at)
       VALUES ($1,$2,$3,'trial',$4,NOW())`,
      [user.id, plan, PLAN_PRICES[plan], trialEnd]
    );

    // Welcome email (non-blocking)
    sendWelcome(user, PLAN_NAMES[plan]).catch(e => console.error('[EMAIL] Welcome failed:', e.message));

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan }
    });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid credentials.' });

  const { email, password } = req.body;
  try {
    const result = await db.query(
      'SELECT id, name, email, password_hash, role, plan, plan_status FROM users WHERE email=$1',
      [email]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ message: 'Incorrect email or password.' });

    if (user.plan_status === 'terminated')
      return res.status(403).json({ message: 'Your account has been terminated. Please contact support.' });

    // Update last login
    await db.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan, planStatus: user.plan_status }
    });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, plan, plan_status, created_at, last_login FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
};

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    const result = await db.query('SELECT id, name, email FROM users WHERE email=$1', [email]);
    // Always respond OK (don't reveal if email exists)
    if (!result.rows.length) return res.json({ message: 'If that email exists, you\'ll receive a reset link.' });

    const user  = result.rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await db.query('UPDATE users SET reset_token=$1, reset_token_expires=NOW()+interval\'1 hour\' WHERE id=$2', [token, user.id]);

    sendPasswordReset(user, token).catch(e => console.error('[EMAIL] Reset failed:', e.message));
    res.json({ message: 'If that email exists, you\'ll receive a reset link.' });
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8)
    return res.status(400).json({ message: 'Invalid request.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result  = await db.query(
      'SELECT id FROM users WHERE id=$1 AND reset_token=$2 AND reset_token_expires>NOW()',
      [decoded.id, token]
    );
    if (!result.rows.length) return res.status(400).json({ message: 'Reset link is invalid or expired.' });

    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await db.query('UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2', [hash, decoded.id]);
    res.json({ message: 'Password updated. You can now sign in.' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(400).json({ message: 'Invalid reset link.' });
    next(err);
  }
};

exports.logout = (req, res) => res.json({ message: 'Signed out.' });
