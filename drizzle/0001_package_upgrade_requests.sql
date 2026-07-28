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
);

CREATE INDEX IF NOT EXISTS package_upgrade_requests_tenant_idx
ON package_upgrade_requests (tenant_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS package_upgrade_requests_status_idx
ON package_upgrade_requests (status, requested_at DESC);
