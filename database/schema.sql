-- ═══════════════════════════════════════
-- NEXAHOST DATABASE SCHEMA
-- Run: psql -U nexahost_user -d nexahost -f schema.sql
-- ═══════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ───
CREATE TABLE IF NOT EXISTS users (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  role                VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  plan                VARCHAR(20) NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','business','pro')),
  plan_status         VARCHAR(20) NOT NULL DEFAULT 'trial' CHECK (plan_status IN ('trial','active','suspended','cancelled','terminated')),
  phone               VARCHAR(50),
  country             VARCHAR(100),
  whm_username        VARCHAR(50),
  whm_domain          VARCHAR(255),
  cpanel_url          TEXT,
  trial_ends_at       TIMESTAMPTZ,
  last_login          TIMESTAMPTZ,
  reset_token         TEXT,
  reset_token_expires TIMESTAMPTZ,
  stripe_customer_id  VARCHAR(100),
  flw_customer_id     VARCHAR(100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_plan_status ON users(plan_status);

-- ─── SUBSCRIPTIONS ───
CREATE TABLE IF NOT EXISTS subscriptions (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan            VARCHAR(20) NOT NULL,
  plan_name       VARCHAR(100),
  price           DECIMAL(10,2) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'trial',
  trial_ends_at   TIMESTAMPTZ,
  renews_at       TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  stripe_sub_id   VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);

-- ─── INVOICES ───
CREATE TABLE IF NOT EXISTS invoices (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_number  VARCHAR(50) UNIQUE NOT NULL,
  plan            VARCHAR(20),
  amount          DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(10) DEFAULT 'USD',
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  payment_method  VARCHAR(50),
  stripe_pi_id    VARCHAR(100),
  flw_tx_id       VARCHAR(100),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user   ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ─── WEBSITES ───
CREATE TABLE IF NOT EXISTS websites (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain        VARCHAR(255) NOT NULL,
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','setup','suspended')),
  ssl_status    VARCHAR(20) DEFAULT 'pending',
  ssl_expires   TIMESTAMPTZ,
  cms           VARCHAR(50),
  disk_used_gb  DECIMAL(10,2) DEFAULT 0,
  last_backup   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_websites_user ON websites(user_id);

-- ─── DOMAINS ───
CREATE TABLE IF NOT EXISTS domains (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain      VARCHAR(255) NOT NULL,
  status      VARCHAR(20) DEFAULT 'active',
  expires_at  TIMESTAMPTZ,
  auto_renew  BOOLEAN DEFAULT true,
  registrar   VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domains_user ON domains(user_id);

-- ─── EMAIL ACCOUNTS ───
CREATE TABLE IF NOT EXISTS email_accounts (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address     VARCHAR(255) NOT NULL,
  quota_gb    INTEGER DEFAULT 2,
  used_mb     DECIMAL(10,2) DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DATABASES ───
CREATE TABLE IF NOT EXISTS databases (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  size_mb     DECIMAL(10,2) DEFAULT 0,
  tables      INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TICKETS ───
CREATE TABLE IF NOT EXISTS tickets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  department  VARCHAR(100) DEFAULT 'General Support',
  status      VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open','awaiting_reply','in_progress','resolved','closed')),
  priority    VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  assigned_to INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_user   ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- ─── TICKET REPLIES ───
CREATE TABLE IF NOT EXISTS ticket_replies (
  id          SERIAL PRIMARY KEY,
  ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id),
  message     TEXT NOT NULL,
  is_admin    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USAGE SNAPSHOTS ───
CREATE TABLE IF NOT EXISTS usage_snapshots (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  disk_used_gb        DECIMAL(10,2) DEFAULT 0,
  disk_total_gb       DECIMAL(10,2) DEFAULT 10,
  bandwidth_used_gb   DECIMAL(10,2) DEFAULT 0,
  emails_count        INTEGER DEFAULT 0,
  databases_count     INTEGER DEFAULT 0,
  snapped_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user ON usage_snapshots(user_id, snapped_at DESC);

-- ─── UPDATED_AT TRIGGER ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON users;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON subscriptions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON tickets;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
