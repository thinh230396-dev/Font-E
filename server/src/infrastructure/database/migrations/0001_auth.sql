-- 0001_auth.sql — tài khoản đăng nhập và phiên.
--
-- Nguồn: chuyển từ `scripts/sites-worker.js` (Cloudflare D1) sang SQLite cục bộ,
-- cộng năm cột phiên đã chốt ở README-MIGRATION.md §8.5.

CREATE TABLE IF NOT EXISTS app_users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  username        TEXT UNIQUE,
  password_hash   TEXT NOT NULL,
  password_salt   TEXT NOT NULL,

  -- BR-AUTH-001 — đúng 3 vai trò đăng nhập, không có CUSTOMER, không có SUPPORT.
  role            TEXT NOT NULL CHECK (role IN ('SUPERADMIN', 'TENANT_ADMIN', 'RECEPTIONIST')),
  display_name    TEXT NOT NULL,

  -- BR-AUTH-020 — INACTIVE là kết quả của thao tác "xóa"; không xóa cứng (BR-DEL-001).
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INACTIVE')),

  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT,

  -- BR-AUTH-013/014 — chỉ tài khoản lễ tân trỏ tới hồ sơ nhân viên.
  -- Khóa ngoại sang `staff` sẽ được thêm ở migration ngày 2, khi bảng đó tồn tại.
  staff_id        TEXT,

  -- ⚠️ Bốn cột dưới là TẠM THỜI, chỉ để frontend hiện tại chạy tiếp trong lúc
  -- chuyển backend. Ngày 3 sẽ thay bằng bảng nối `user_tenants` (BR-AUTH-023) và
  -- `active_tenant_id` trong phiên (BR-AUTH-024), rồi bỏ hẳn bốn cột này.
  tenant_id       TEXT,
  tenant_name     TEXT,
  branch_code     TEXT,
  branch_name     TEXT,

  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS app_users_role_status_idx ON app_users (role, status);
CREATE INDEX IF NOT EXISTS app_users_username_idx    ON app_users (username);

CREATE TABLE IF NOT EXISTS app_sessions (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  expires_at       TEXT NOT NULL,

  -- Năm cột dưới theo README-MIGRATION.md §8.5: mở rộng `app_sessions`, KHÔNG tạo
  -- bảng phiên thứ hai. Cố ý không có `location`, `trusted`, `suspicious`,
  -- `mfa_verified` — ba thứ đó không có nguồn dữ liệu thật.
  last_active      TEXT NOT NULL,
  revoked_at       TEXT,
  ip               TEXT,
  user_agent       TEXT,

  -- BR-AUTH-024 — tiệm đang làm việc nằm trong phiên, không gửi kèm mỗi request.
  active_tenant_id TEXT,

  FOREIGN KEY (user_id) REFERENCES app_users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS app_sessions_user_idx   ON app_sessions (user_id);
CREATE INDEX IF NOT EXISTS app_sessions_expiry_idx ON app_sessions (expires_at);
