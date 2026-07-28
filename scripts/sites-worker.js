const json = (payload, status = 200, headers = {}) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  }
});

const SESSION_COOKIE = 'salonsys_session';
const SESSION_HOURS = 8;
const REMEMBER_SESSION_DAYS = 30;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const DEMO_USERS = [
  {
    id: 'USR-SUPERADMIN',
    email: 'superadmin@salonsys.vn',
    username: 'superadmin',
    password: 'Super@2026',
    role: 'SUPERADMIN',
    displayName: 'Superadmin',
    status: 'ACTIVE'
  },
  {
    id: 'USR-TENANT-LUMIERE',
    email: 'tenantadmin@lumierehair.vn',
    username: 'nguyenvanboss',
    password: 'Lumiere@2026',
    role: 'TENANT_ADMIN',
    displayName: 'Nguyễn Văn Boss',
    tenantId: 'TEN-LUMIERE',
    tenantName: 'Nailé Studio',
    status: 'ACTIVE'
  },
  {
    id: 'USR-RECEPTION-NAILE',
    email: 'receptionist@nailestudio.vn',
    username: 'receptionist',
    password: 'Reception@2026',
    role: 'RECEPTIONIST',
    displayName: 'Lê Hoàng Nam',
    tenantId: 'TEN-LUMIERE',
    tenantName: 'Nailé Studio',
    branchCode: 'Q3',
    branchName: 'Nailé Studio · Chi nhánh Quận 3',
    status: 'ACTIVE'
  }
];

const bytesToHex = (bytes) => Array.from(new Uint8Array(bytes))
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('');

const hashPassword = async (password, salt) => {
  const input = new TextEncoder().encode(`${salt}:${password}`);
  return bytesToHex(await crypto.subtle.digest('SHA-256', input));
};

const getCookie = (request, name) => {
  const source = request.headers.get('Cookie') || '';
  const pair = source.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : '';
};

const accountFromRow = (row) => ({
  email: row.email,
  role: row.role,
  displayName: row.display_name,
  tenantId: row.tenant_id || undefined,
  tenantName: row.tenant_name || undefined,
  branchCode: row.branch_code || undefined,
  branchName: row.branch_name || undefined
});

const isNonEmptyString = (value, max = 255) => typeof value === 'string'
  && value.trim().length > 0
  && value.trim().length <= max;

const initializeSchema = async (db) => {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS app_users (
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
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS app_users_role_idx
      ON app_users (role, status)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS app_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS app_sessions_expiry_idx
      ON app_sessions (expires_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS package_upgrade_requests (
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
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS package_upgrade_requests_tenant_idx
      ON package_upgrade_requests (tenant_id, requested_at DESC)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS package_upgrade_requests_status_idx
      ON package_upgrade_requests (status, requested_at DESC)`)
  ]);

  const now = new Date().toISOString();
  for (const user of DEMO_USERS) {
    const salt = `salonsys:${user.id.toLowerCase()}`;
    const passwordHash = await hashPassword(user.password, salt);
    await db.prepare(`INSERT OR IGNORE INTO app_users (
      id, email, username, password_hash, password_salt, role, display_name,
      tenant_id, tenant_name, branch_code, branch_name, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        user.id, user.email, user.username, passwordHash, salt, user.role, user.displayName,
        user.tenantId || null, user.tenantName || null, user.branchCode || null,
        user.branchName || null, user.status, now, now
      )
      .run();
  }
};

let schemaInitialization;
const ensureSchema = (db) => {
  if (!schemaInitialization) schemaInitialization = initializeSchema(db);
  return schemaInitialization;
};

const getSession = async (request, db) => {
  const sessionId = getCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;
  const now = new Date().toISOString();
  const row = await db.prepare(`SELECT
      u.id, u.email, u.role, u.display_name, u.tenant_id, u.tenant_name,
      u.branch_code, u.branch_name, u.status, s.expires_at
    FROM app_sessions s
    JOIN app_users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > ?`)
    .bind(sessionId, now)
    .first();
  if (!row || row.status !== 'ACTIVE') return null;
  return { id: row.id, sessionId, ...accountFromRow(row) };
};

const requireSession = async (request, db, roles) => {
  const session = await getSession(request, db);
  if (!session) return { response: json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }, 401) };
  if (roles && !roles.includes(session.role)) {
    return { response: json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, 403) };
  }
  return { session };
};

const handleAuth = async (request, env, url) => {
  if (!env.DB) return json({ error: 'D1 binding is unavailable.' }, 503);
  await ensureSchema(env.DB);

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await request.json();
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!identifier || !password) return json({ error: 'Thiếu tài khoản hoặc mật khẩu.' }, 400);

    const user = await env.DB.prepare(`SELECT * FROM app_users
      WHERE lower(email) = ? OR lower(username) = ?`)
      .bind(identifier, identifier)
      .first();
    if (!user) return json({ error: 'Tài khoản hoặc mật khẩu không đúng.' }, 401);

    const now = new Date();
    if (user.locked_until && new Date(user.locked_until).getTime() > now.getTime()) {
      return json({ error: 'Tài khoản đang tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.' }, 423);
    }
    if (user.status !== 'ACTIVE') return json({ error: 'Tài khoản chưa được kích hoạt hoặc đang bị khóa.' }, 403);

    const suppliedHash = await hashPassword(password, user.password_salt);
    if (suppliedHash !== user.password_hash) {
      const failedAttempts = Number(user.failed_attempts || 0) + 1;
      const lockedUntil = failedAttempts >= MAX_LOGIN_ATTEMPTS
        ? new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString()
        : null;
      await env.DB.prepare(`UPDATE app_users
        SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?`)
        .bind(failedAttempts >= MAX_LOGIN_ATTEMPTS ? 0 : failedAttempts, lockedUntil, now.toISOString(), user.id)
        .run();
      return json({ error: 'Tài khoản hoặc mật khẩu không đúng.' }, 401);
    }

    await env.DB.prepare(`UPDATE app_users
      SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?`)
      .bind(now.toISOString(), user.id)
      .run();
    const remember = body.remember === true;
    const maxAge = remember ? REMEMBER_SESSION_DAYS * 86_400 : SESSION_HOURS * 3_600;
    const expiresAt = new Date(now.getTime() + maxAge * 1000).toISOString();
    const sessionId = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO app_sessions (id, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)`)
      .bind(sessionId, user.id, now.toISOString(), expiresAt)
      .run();
    const secure = url.protocol === 'https:' ? '; Secure' : '';
    return json(
      { account: accountFromRow(user) },
      200,
      { 'Set-Cookie': `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=${maxAge}` }
    );
  }

  if (request.method === 'GET' && url.pathname === '/api/auth/session') {
    const auth = await requireSession(request, env.DB);
    if (auth.response) return auth.response;
    return json({ account: auth.session });
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
    const sessionId = getCookie(request, SESSION_COOKIE);
    if (sessionId) {
      await env.DB.prepare('DELETE FROM app_sessions WHERE id = ?').bind(sessionId).run();
    }
    const secure = url.protocol === 'https:' ? '; Secure' : '';
    return json({ ok: true }, 200, {
      'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=0`
    });
  }

  if (request.method === 'PUT' && url.pathname === '/api/auth/accounts') {
    const auth = await requireSession(request, env.DB, ['SUPERADMIN']);
    if (auth.response) return auth.response;
    const body = await request.json();
    if (
      !isNonEmptyString(body.id, 120)
      || !isNonEmptyString(body.email, 254)
      || !isNonEmptyString(body.displayName, 160)
      || !['TENANT_ADMIN', 'RECEPTIONIST'].includes(body.role)
    ) {
      return json({ error: 'Thông tin tài khoản không hợp lệ.' }, 400);
    }

    const email = body.email.trim().toLowerCase();
    const username = isNonEmptyString(body.username, 120) ? body.username.trim().toLowerCase() : null;
    const existing = await env.DB.prepare('SELECT * FROM app_users WHERE id = ? OR lower(email) = ?')
      .bind(body.id.trim(), email)
      .first();
    if (!existing && !isNonEmptyString(body.password, 128)) {
      return json({ error: 'Tài khoản mới cần có mật khẩu tạm.' }, 400);
    }

    const salt = isNonEmptyString(body.password, 128)
      ? `salonsys:${crypto.randomUUID()}`
      : existing.password_salt;
    const passwordHash = isNonEmptyString(body.password, 128)
      ? await hashPassword(body.password, salt)
      : existing.password_hash;
    const now = new Date().toISOString();
    const status = body.status === 'ACTIVE' ? 'ACTIVE' : body.status === 'SUSPENDED' ? 'SUSPENDED' : 'PENDING_VERIFICATION';
    await env.DB.prepare(`INSERT INTO app_users (
      id, email, username, password_hash, password_salt, role, display_name,
      tenant_id, tenant_name, branch_code, branch_name, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      username = excluded.username,
      password_hash = excluded.password_hash,
      password_salt = excluded.password_salt,
      role = excluded.role,
      display_name = excluded.display_name,
      tenant_id = excluded.tenant_id,
      tenant_name = excluded.tenant_name,
      branch_code = excluded.branch_code,
      branch_name = excluded.branch_name,
      status = excluded.status,
      updated_at = excluded.updated_at`)
      .bind(
        body.id.trim(), email, username, passwordHash, salt, body.role, body.displayName.trim(),
        body.tenantId || null, body.tenantName || null, body.branchCode || null,
        body.branchName || null, status, existing?.created_at || now, now
      )
      .run();
    return json({ ok: true });
  }

  const accountMatch = url.pathname.match(/^\/api\/auth\/accounts\/([^/]+)$/);
  if (request.method === 'DELETE' && accountMatch) {
    const auth = await requireSession(request, env.DB, ['SUPERADMIN']);
    if (auth.response) return auth.response;
    const identifier = decodeURIComponent(accountMatch[1]).trim().toLowerCase();
    const result = await env.DB.prepare(`DELETE FROM app_users
      WHERE lower(id) = ? OR lower(email) = ?`)
      .bind(identifier, identifier)
      .run();
    return result.meta?.changes ? json({ ok: true }) : json({ error: 'Không tìm thấy tài khoản.' }, 404);
  }

  return json({ error: 'Không hỗ trợ thao tác này.' }, 405);
};

const toRequest = (row) => ({
  id: row.id,
  tenantId: row.tenant_id,
  tenantName: row.tenant_name,
  requestedByName: row.requested_by_name,
  requestedByEmail: row.requested_by_email,
  currentPackageId: row.current_package_id || undefined,
  currentPackageName: row.current_package_name,
  requestedPackageId: row.requested_package_id,
  requestedPackageName: row.requested_package_name,
  billingCycle: row.billing_cycle,
  effectiveDate: row.effective_date,
  quotedAmount: row.quoted_amount,
  currency: row.currency,
  status: row.status,
  requestedAt: row.requested_at,
  reviewedAt: row.reviewed_at || undefined,
  reviewedBy: row.reviewed_by || undefined,
  reviewNote: row.review_note || undefined,
  invoiceId: row.invoice_id || undefined
});

const handleUpgradeRequests = async (request, env, url) => {
  if (!env.DB) return json({ error: 'D1 binding is unavailable.' }, 503);
  await ensureSchema(env.DB);
  const auth = await requireSession(request, env.DB, ['SUPERADMIN', 'TENANT_ADMIN']);
  if (auth.response) return auth.response;
  const session = auth.session;

  if (request.method === 'GET' && url.pathname === '/api/package-upgrade-requests') {
    const result = session.role === 'SUPERADMIN'
      ? await env.DB.prepare('SELECT * FROM package_upgrade_requests ORDER BY requested_at DESC').all()
      : await env.DB.prepare(`SELECT * FROM package_upgrade_requests
          WHERE lower(requested_by_email) = ? OR tenant_id = ?
          ORDER BY requested_at DESC`)
        .bind(session.email.toLowerCase(), session.tenantId || '')
        .all();
    return json({ requests: (result.results || []).map(toRequest) });
  }

  if (request.method === 'POST' && url.pathname === '/api/package-upgrade-requests') {
    if (session.role !== 'TENANT_ADMIN') {
      return json({ error: 'Chỉ Tenant Admin có thể gửi yêu cầu nâng cấp.' }, 403);
    }
    const body = await request.json();
    const valid = [
      body.id, body.tenantId, body.tenantName, body.requestedByName,
      body.requestedByEmail, body.currentPackageName, body.requestedPackageId,
      body.requestedPackageName, body.requestedAt
    ].every((value) => isNonEmptyString(value))
      && ['monthly', 'yearly'].includes(body.billingCycle)
      && ['immediate', 'next_cycle'].includes(body.effectiveDate)
      && ['USD', 'VND'].includes(body.currency)
      && Number.isFinite(Number(body.quotedAmount))
      && Number(body.quotedAmount) > 0
      && body.status === 'PENDING'
      && body.requestedByEmail.trim().toLowerCase() === session.email.toLowerCase()
      && (!session.tenantId || body.tenantId === session.tenantId);
    if (!valid) return json({ error: 'Dữ liệu yêu cầu nâng cấp không hợp lệ.' }, 400);

    try {
      await env.DB.prepare(`INSERT INTO package_upgrade_requests (
        id, tenant_id, tenant_name, requested_by_name, requested_by_email,
        current_package_id, current_package_name, requested_package_id,
        requested_package_name, billing_cycle, effective_date, quoted_amount,
        currency, status, requested_at, reviewed_at, reviewed_by, review_note, invoice_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          body.id, body.tenantId, body.tenantName, body.requestedByName, session.email,
          body.currentPackageId || null, body.currentPackageName, body.requestedPackageId,
          body.requestedPackageName, body.billingCycle, body.effectiveDate, Number(body.quotedAmount),
          body.currency, 'PENDING', body.requestedAt, null, null, null, null
        )
        .run();
    } catch (error) {
      if (String(error).toLowerCase().includes('unique')) {
        return json({ error: 'Yêu cầu này đã tồn tại.' }, 409);
      }
      throw error;
    }
    return json({ request: { ...body, requestedByEmail: session.email, status: 'PENDING' } }, 201);
  }

  const match = url.pathname.match(/^\/api\/package-upgrade-requests\/([^/]+)$/);
  if (request.method === 'PATCH' && match) {
    if (session.role !== 'SUPERADMIN') return json({ error: 'Chỉ Super Admin có thể duyệt yêu cầu.' }, 403);
    const id = decodeURIComponent(match[1]);
    const body = await request.json();
    if (
      !['APPROVED', 'REJECTED'].includes(body.status)
      || !['immediate', 'next_cycle'].includes(body.effectiveDate)
    ) {
      return json({ error: 'Dữ liệu phê duyệt không hợp lệ.' }, 400);
    }
    const result = await env.DB.prepare(`UPDATE package_upgrade_requests
      SET status = ?, effective_date = ?, reviewed_at = ?, reviewed_by = ?,
          review_note = ?, invoice_id = ?
      WHERE id = ? AND status = 'PENDING'`)
      .bind(
        body.status, body.effectiveDate, body.reviewedAt || new Date().toISOString(),
        session.email, body.reviewNote || null, body.invoiceId || null, id
      )
      .run();
    if (!result.meta?.changes) return json({ error: 'Không tìm thấy yêu cầu đang chờ duyệt.' }, 404);
    return json({ ok: true });
  }

  if (request.method === 'DELETE' && match) {
    if (session.role !== 'SUPERADMIN') return json({ error: 'Chỉ Super Admin có thể xóa yêu cầu.' }, 403);
    const id = decodeURIComponent(match[1]);
    const result = await env.DB.prepare('DELETE FROM package_upgrade_requests WHERE id = ?').bind(id).run();
    return result.meta?.changes ? json({ ok: true }) : json({ error: 'Không tìm thấy yêu cầu.' }, 404);
  }

  return json({ error: 'Không hỗ trợ thao tác này.' }, 405);
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/auth/')) {
        return await handleAuth(request, env, url);
      }
      if (url.pathname.startsWith('/api/package-upgrade-requests')) {
        return await handleUpgradeRequests(request, env, url);
      }
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Đã xảy ra lỗi máy chủ.' }, 500);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    if (request.method === 'GET' && !url.pathname.includes('.')) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
    }

    return response;
  }
};
