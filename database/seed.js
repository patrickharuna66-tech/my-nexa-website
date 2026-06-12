require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'nexahost',
  user:     process.env.DB_USER || 'nexahost_user',
  password: process.env.DB_PASSWORD,
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;

    // ── ADMIN USER ──
    const adminHash = await bcrypt.hash('admin123', rounds);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role, plan, plan_status)
      VALUES ('Admin', 'admin@nexahost.com', $1, 'admin', 'pro', 'active')
      ON CONFLICT (email) DO NOTHING`, [adminHash]);
    console.log('Admin user seeded: admin@nexahost.com / admin123');

    // ── DEMO CUSTOMER ──
    const custHash  = await bcrypt.hash('customer123', rounds);
    const trial_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const custRes   = await client.query(`
      INSERT INTO users (name, email, password_hash, role, plan, plan_status, trial_ends_at)
      VALUES ('Jane Doe', 'jane@example.com', $1, 'customer', 'business', 'trial', $2)
      ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
      RETURNING id`, [custHash, trial_end]);
    console.log('Customer seeded: jane@example.com / customer123');

    if (custRes.rows.length) {
      const uid = custRes.rows[0].id;
      // Subscription
      await client.query(`
        INSERT INTO subscriptions (user_id, plan, plan_name, price, status, trial_ends_at)
        VALUES ($1,'business','Business Growth',12.99,'trial',$2) ON CONFLICT DO NOTHING`,
        [uid, trial_end]);
      // Websites
      await client.query(`
        INSERT INTO websites (user_id, domain, status, ssl_status, cms, disk_used_gb, last_backup)
        VALUES ($1,'janedoe.com','active','valid','WordPress 6.4',14.2,NOW()-interval'2 hours'),
               ($1,'myblog.io','active','valid','WordPress 6.3',7.8,NOW()-interval'3 hours'),
               ($1,'newproject.dev','setup','pending',NULL,1.4,NULL)
        ON CONFLICT DO NOTHING`, [uid]);
      // Emails
      await client.query(`
        INSERT INTO email_accounts (user_id, address, quota_gb, used_mb)
        VALUES ($1,'hello@janedoe.com',2,340),
               ($1,'info@janedoe.com',2,120),
               ($1,'support@janedoe.com',2,88)
        ON CONFLICT DO NOTHING`, [uid]);
      // Databases
      await client.query(`
        INSERT INTO databases (user_id, name, size_mb, tables)
        VALUES ($1,'janedoe_wp',245,12),($1,'janedoe_store',88,38)
        ON CONFLICT DO NOTHING`, [uid]);
      // Domains
      await client.query(`
        INSERT INTO domains (user_id, domain, status, expires_at, auto_renew)
        VALUES ($1,'janedoe.com','active',NOW()+interval'2 years',true),
               ($1,'myblog.io','active',NOW()+interval'1 year',true)
        ON CONFLICT DO NOTHING`, [uid]);
      // Invoices
      await client.query(`
        INSERT INTO invoices (user_id, invoice_number, plan, amount, status, paid_at)
        VALUES ($1,'INV-2024-11','business',12.99,'paid',NOW()-interval'30 days'),
               ($1,'INV-2024-10','business',12.99,'paid',NOW()-interval'60 days'),
               ($1,'INV-2024-09','business',12.99,'paid',NOW()-interval'90 days')
        ON CONFLICT DO NOTHING`, [uid]);
      // Sample ticket
      await client.query(`
        INSERT INTO tickets (user_id, subject, message, status, priority)
        VALUES ($1,'Email not sending from janedoe.com','My emails are bouncing since yesterday. Please help.','open','high')
        ON CONFLICT DO NOTHING`, [uid]);
      // Usage snapshot
      await client.query(`
        INSERT INTO usage_snapshots (user_id, disk_used_gb, disk_total_gb, bandwidth_used_gb, emails_count, databases_count)
        VALUES ($1,23.4,50,120,7,4) ON CONFLICT DO NOTHING`, [uid]);
    }

    console.log('Seeding complete!');
    console.log('\nLogin credentials:');
    console.log('  Admin:    admin@nexahost.com    / admin123');
    console.log('  Customer: jane@example.com      / customer123\n');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
