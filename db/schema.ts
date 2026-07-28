export const packageUpgradeRequestsSchema = `
CREATE TABLE IF NOT EXISTS package_upgrade_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  tenant_name TEXT NOT NULL,
  requested_by_name TEXT NOT NULL,
  requested_by_email TEXT NOT NULL,
  current_package_id TEXT,
  current_package_name TEXT NOT NULL,
  requested_package_id TEXT NOT NULL,
  requested_package_name TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  quoted_amount REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  review_note TEXT,
  invoice_id TEXT
)`;

export const packageUpgradeRequestsTenantIndex = `
CREATE INDEX IF NOT EXISTS package_upgrade_requests_tenant_idx
ON package_upgrade_requests (tenant_id, requested_at DESC)`;

export const packageUpgradeRequestsStatusIndex = `
CREATE INDEX IF NOT EXISTS package_upgrade_requests_status_idx
ON package_upgrade_requests (status, requested_at DESC)`;

export const appUsersSchema = `
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL,
  display_name TEXT NOT NULL,
  tenant_id TEXT,
  tenant_name TEXT,
  branch_code TEXT,
  branch_name TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

export const appUsersRoleIndex = `
CREATE INDEX IF NOT EXISTS app_users_role_idx
ON app_users (role, status)`;

export const appSessionsSchema = `
CREATE TABLE IF NOT EXISTS app_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
)`;

export const appSessionsExpiryIndex = `
CREATE INDEX IF NOT EXISTS app_sessions_expiry_idx
ON app_sessions (expires_at)`;
