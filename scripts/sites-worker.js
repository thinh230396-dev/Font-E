const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }
});

const ensureUpgradeRequestSchema = async (db) => {
  await db.batch([
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
  await ensureUpgradeRequestSchema(env.DB);

  if (request.method === 'GET' && url.pathname === '/api/package-upgrade-requests') {
    const result = await env.DB.prepare(
      'SELECT * FROM package_upgrade_requests ORDER BY requested_at DESC'
    ).all();
    return json({ requests: (result.results || []).map(toRequest) });
  }

  if (request.method === 'POST' && url.pathname === '/api/package-upgrade-requests') {
    const body = await request.json();
    const required = [
      'id', 'tenantId', 'tenantName', 'requestedByName', 'requestedByEmail',
      'currentPackageName', 'requestedPackageId', 'requestedPackageName',
      'billingCycle', 'effectiveDate', 'quotedAmount', 'currency', 'status', 'requestedAt'
    ];
    if (required.some((key) => body[key] === undefined || body[key] === null || body[key] === '')) {
      return json({ error: 'Thiếu dữ liệu yêu cầu nâng cấp.' }, 400);
    }

    await env.DB.prepare(`INSERT OR REPLACE INTO package_upgrade_requests (
      id, tenant_id, tenant_name, requested_by_name, requested_by_email,
      current_package_id, current_package_name, requested_package_id,
      requested_package_name, billing_cycle, effective_date, quoted_amount,
      currency, status, requested_at, reviewed_at, reviewed_by, review_note, invoice_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        body.id, body.tenantId, body.tenantName, body.requestedByName, body.requestedByEmail,
        body.currentPackageId || null, body.currentPackageName, body.requestedPackageId,
        body.requestedPackageName, body.billingCycle, body.effectiveDate, body.quotedAmount,
        body.currency, body.status, body.requestedAt, body.reviewedAt || null,
        body.reviewedBy || null, body.reviewNote || null, body.invoiceId || null
      )
      .run();
    return json({ request: body }, 201);
  }

  const match = url.pathname.match(/^\/api\/package-upgrade-requests\/([^/]+)$/);
  if (request.method === 'PATCH' && match) {
    const id = decodeURIComponent(match[1]);
    const body = await request.json();
    if (!['APPROVED', 'REJECTED'].includes(body.status)) {
      return json({ error: 'Trạng thái phê duyệt không hợp lệ.' }, 400);
    }
    const result = await env.DB.prepare(`UPDATE package_upgrade_requests
      SET status = ?, effective_date = ?, reviewed_at = ?, reviewed_by = ?,
          review_note = ?, invoice_id = ?
      WHERE id = ?`)
      .bind(
        body.status, body.effectiveDate, body.reviewedAt || null, body.reviewedBy || null,
        body.reviewNote || null, body.invoiceId || null, id
      )
      .run();
    if (!result.meta?.changes) return json({ error: 'Không tìm thấy yêu cầu.' }, 404);
    return json({ ok: true });
  }

  return json({ error: 'Không hỗ trợ thao tác này.' }, 405);
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/package-upgrade-requests')) {
      try {
        return await handleUpgradeRequests(request, env, url);
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'Lỗi lưu yêu cầu nâng cấp.' }, 500);
      }
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    if (request.method === 'GET' && !url.pathname.includes('.')) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
    }

    return response;
  }
};
