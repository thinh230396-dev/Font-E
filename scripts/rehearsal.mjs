/**
 * Tổng duyệt — diễn trọn kịch bản ba vai trên máy chủ thật, 174 bước.
 *
 * Đây **không phải** bộ kiểm thử của backend. Bộ ấy là xUnit, nằm trong solution
 * `NailManagement`, dựng máy chủ trong bộ nhớ trên một database dùng một lần. Kịch bản này đi
 * ngược lại: nó gọi đúng máy chủ mà trình duyệt đang gọi, trên đúng database mà buổi bảo vệ sẽ
 * dùng — nên nó bắt được những thứ chỉ sai ở môi trường thật, ví dụ dữ liệu mẫu đã lệch ngày,
 * hay một endpoint chạy khác đi vì cấu hình.
 *
 * Không đi đường thẳng qua mạch demo mà **ấn vào từng ranh giới**: hạn mức gói, cách ly tiệm,
 * chặn ghi khi hết hạn, sơ đồ chuyển trạng thái, công thức tiền, và những lối rẽ mà một phép
 * thử chỉ kiểm "đường hạnh phúc" không bao giờ chạm tới.
 *
 * Cách chạy:
 *
 *     npm run rehearsal
 *     API_ORIGIN=http://localhost:5000 npm run rehearsal
 *
 * Ba điều kiện bắt buộc:
 *
 * 1. **Máy chủ đang chạy.** Kịch bản không tự khởi động nó.
 * 2. **Database còn nguyên dữ liệu mẫu.** Nó dựa vào sáu tiệm của DemoDataSeeder và ba tài
 *    khoản của DemoAccountSeeder, kèm đúng bốn trạng thái hiển thị (ACTIVE, TRIAL, OVERDUE,
 *    SUSPENDED) mà bộ nạp cố ý dựng sẵn để có thứ mà kiểm.
 * 3. **Chấp nhận rác.** Mỗi lượt chạy để lại một tiệm "Tiệm Tổng Duyệt <số>" cùng chi nhánh,
 *    nhân sự, khách và hóa đơn của nó — BR-DEL-001 không cho xóa cứng, nên kịch bản không dọn.
 *    Chạy xong trên database thật thì dựng lại từ số 0 bằng `dotnet ef database drop --force`
 *    rồi khởi động lại máy chủ.
 *
 * Thoát với mã 1 nếu có bước nào hỏng, để một chuỗi lệnh gọi nó cũng biết mà dừng.
 */
const BASE = process.env.API_ORIGIN || 'http://localhost:5282';

const results = [];
let section = '';
let step = 0;

class Session {
  constructor(label) { this.label = label; this.cookie = null; }

  async call(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.cookie) headers['Cookie'] = this.cookie;
    const res = await fetch(BASE + path, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body)
    });
    for (const c of (res.headers.getSetCookie?.() || [])) {
      const pair = c.split(';')[0];
      if (pair.startsWith('salonsys')) this.cookie = pair;
    }
    const text = await res.text();
    let json = null;
    if (text) { try { json = JSON.parse(text); } catch { json = { raw: text }; } }
    return { status: res.status, body: json, code: json?.error?.code, fields: (json?.error?.fields || []).map(f => f.field) };
  }
}

const head = (name) => { section = name; console.log(`\n──────── ${name} ────────`); };

const ok = (label, cond, detail) => {
  step++;
  console.log(`${String(step).padStart(3, '0')}. [${cond ? 'PASS' : 'FAIL'}] ${label}${detail ? '  ·  ' + detail : ''}`);
  results.push({ step, section, label, pass: !!cond, detail });
  return !!cond;
};

const short = (r, n = 190) => `HTTP ${r.status} ${JSON.stringify(r.body ?? {}).slice(0, n)}`;
const vnd = (n) => (n === undefined || n === null) ? '?' : Number(n).toLocaleString('vi-VN') + '₫';

const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
const today = vnNow.toISOString().slice(0, 10);
const dayOffset = (days) => {
  const d = new Date(vnNow); d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const range = (from, to) => `from=${encodeURIComponent(`${from}T00:00:00+07:00`)}&to=${encodeURIComponent(`${to}T23:59:59+07:00`)}`;

const stamp = Date.now().toString().slice(-6);

const run = async () => {
  console.log(`╔══ TỔNG DUYỆT KỸ — ${today} (giờ tiệm +07:00) ══╗`);

  // ═══════════════════════════════════════════════ 1. PHIÊN VÀ PHÂN QUYỀN
  head('1. Phiên đăng nhập và phân quyền — BR-AUTH');

  const anon = new Session('anon');
  let r = await anon.call('GET', '/api/auth/session');
  ok('Chưa đăng nhập → 401', r.status === 401, short(r, 90));

  r = await anon.call('GET', '/api/tenants');
  ok('Gọi API khi chưa đăng nhập → 401', r.status === 401, short(r, 90));

  r = await anon.call('POST', '/api/auth/login', { identifier: 'superadmin@salonsys.vn', password: 'sai-mat-khau' });
  ok('Sai mật khẩu → 401, không lộ tài khoản có tồn tại hay không',
    r.status === 401 && !/không tồn tại|not found/i.test(r.body?.error?.message || ''), short(r, 130));

  r = await anon.call('POST', '/api/auth/login', { identifier: 'khong-co@salonsys.vn', password: 'Super@2026' });
  ok('Email không tồn tại → cùng mã lỗi với sai mật khẩu', r.status === 401, short(r, 130));

  r = await anon.call('POST', '/api/auth/login', { identifier: 'superadmin@salonsys.vn' });
  ok('Thiếu mật khẩu → 422 gắn vào ô password',
    r.status === 422 && r.fields.includes('password'), short(r, 130));

  const sa = new Session('superadmin');
  r = await sa.call('POST', '/api/auth/login', { identifier: 'superadmin@salonsys.vn', password: 'Super@2026' });
  ok('Superadmin đăng nhập', r.status === 200 && r.body?.account?.role === 'SUPERADMIN', short(r, 130));
  ok('Superadmin không phải chọn tiệm (BR-AUTH-014)', r.body?.mustSelectTenant === false, `mustSelectTenant=${r.body?.mustSelectTenant}`);

  r = await sa.call('GET', '/api/auth/session');
  ok('Phiên đọc lại được ở request sau', r.status === 200 && r.body?.account?.id === 'USR-SUPERADMIN', short(r, 120));
  ok('Superadmin không gắn tiệm nào', r.body?.activeTenantId === null && r.body?.branch === null,
    `activeTenantId=${r.body?.activeTenantId} branch=${r.body?.branch}`);

  // Đăng nhập bằng USERNAME chứ không phải email
  const byName = new Session('username');
  r = await byName.call('POST', '/api/auth/login', { identifier: 'superadmin', password: 'Super@2026' });
  ok('Đăng nhập được bằng tên đăng nhập', r.status === 200, short(r, 110));
  await byName.call('POST', '/api/auth/logout');
  r = await byName.call('GET', '/api/auth/session');
  ok('Đăng xuất rồi thì phiên chết hẳn → 401', r.status === 401, short(r, 90));

  // ═════════════════════════════════════ 2. SUPERADMIN KHÔNG ĐỌC ĐƯỢC DỮ LIỆU TIỆM
  head('2. Tầng nền tảng không đọc dữ liệu nghiệp vụ của tiệm — BR-AUTH-030');

  for (const [name, path] of [
    ['lịch hẹn', `/api/appointments?${range(today, today)}`],
    ['khách hàng', '/api/customers'],
    ['nhân viên', '/api/staff'],
    ['dịch vụ', '/api/services'],
    ['chi nhánh', '/api/branches'],
    ['hóa đơn bán hàng', `/api/sales-invoices?${range(today, today)}`],
    ['báo cáo doanh thu', `/api/reports/revenue?${range(today, today)}`]
  ]) {
    r = await sa.call('GET', path);
    ok(`Superadmin KHÔNG đọc được ${name}`, r.status === 403, `HTTP ${r.status} ${r.code || ''}`);
  }

  // ═══════════════════════════════════════════ 3. DANH MỤC NỀN TẢNG
  head('3. Gói dịch vụ và danh sách tiệm — BR-SUB, BR-TENANT-001/002');

  r = await sa.call('GET', '/api/packages');
  const packages = r.body?.packages || [];
  ok('Ba gói, đúng giá VND của DemoSeedCatalog',
    packages.length === 3
    && packages.find(p => p.id === 'PKG-BASIC')?.price === 1_200_000
    && packages.find(p => p.id === 'PKG-PREMIUM')?.price === 2_500_000
    && packages.find(p => p.id === 'PKG-ENTERPRISE')?.price === 6_200_000,
    packages.map(p => `${p.name}=${vnd(p.price)}`).join(' · '));

  r = await sa.call('GET', '/api/tenants');
  const tenants = r.body?.tenants || [];
  const seeded = ['TEN-LUMIERE', 'TEN-MUSE', 'TEN-AURORA', 'TEN-BLOOM', 'TEN-OASIS', 'TEN-MORNING'];
  ok('Sáu tiệm của bộ nạp đều có mặt', seeded.every(id => tenants.some(t => t.id === id)),
    `${tenants.length} tiệm, thiếu: ${seeded.filter(id => !tenants.some(t => t.id === id)).join(',') || 'không'}`);

  const byId = Object.fromEntries(tenants.map(t => [t.id, t]));
  const expect = [
    ['TEN-LUMIERE', 'ACTIVE', false],
    ['TEN-MUSE', 'ACTIVE', false],
    ['TEN-AURORA', 'ACTIVE', false],
    ['TEN-BLOOM', 'TRIAL', false],
    ['TEN-OASIS', 'OVERDUE', true],
    ['TEN-MORNING', 'SUSPENDED', true]
  ];
  for (const [id, status, readOnly] of expect) {
    const t = byId[id];
    ok(`${t?.name || id} → ${status}${readOnly ? ' + khóa ghi' : ''}`,
      t?.displayStatus === status && t?.isReadOnly === readOnly,
      `displayStatus=${t?.displayStatus} isReadOnly=${t?.isReadOnly} daysRemaining=${t?.daysRemaining}`);
  }

  r = await sa.call('GET', '/api/subscription-invoices');
  const subInvoices = r.body?.invoices || [];
  ok('Năm hóa đơn đăng ký của bộ nạp đều có mặt',
    subInvoices.filter(i => (i.code || '').startsWith('DK-')).length >= 5, `${subInvoices.length} hóa đơn`);

  r = await sa.call('GET', '/api/audit-logs');
  const logsAtStart = (r.body?.entries || []).length;
  ok('Nhật ký kiểm toán đọc được', r.status === 200, `${logsAtStart} bản ghi`);

  // ═══════════════════════════════════════════ 4. TẠO TIỆM — CÁC ĐƯỜNG BỊ CHẶN
  head('4. Lập tiệm mới — các đường hợp lệ và không hợp lệ');

  const newTenantBody = (over = {}) => ({
    code: `RS${stamp}`,
    name: `Tiệm Tổng Duyệt ${stamp}`,
    packageId: 'PKG-PREMIUM',
    expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
    isTrial: false,
    billingCycle: 'monthly',
    address: '12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    phone: '0283939999',
    contactEmail: `lienhe${stamp}@tongduyet.vn`,
    primaryBranchName: 'Chi nhánh Trung tâm',
    primaryBranchCode: 'TT',
    owner: { mode: 'new', email: `chu${stamp}@tongduyet.vn`, username: `chu${stamp}`, displayName: 'Chủ Tiệm Tổng Duyệt' },
    ...over
  });

  r = await sa.call('POST', '/api/tenants', newTenantBody({ expiresAt: '2020-01-01T00:00:00+07:00' }));
  ok('Hạn dùng trong quá khứ bị chặn', r.status === 422, `HTTP ${r.status} ${r.fields.join(',')}`);

  r = await sa.call('POST', '/api/tenants', newTenantBody({ packageId: 'PKG-KHONG-CO' }));
  ok('Gói không tồn tại bị chặn', r.status >= 400, `HTTP ${r.status} ${r.code}`);

  r = await sa.call('POST', '/api/tenants', newTenantBody({ name: '' }));
  ok('Tên tiệm rỗng bị chặn', r.status === 422 && r.fields.includes('name'), `HTTP ${r.status} ${r.fields.join(',')}`);

  r = await sa.call('POST', '/api/tenants', newTenantBody({
    owner: { mode: 'new', email: 'tenantadmin@lumierehair.vn', username: `trung${stamp}`, displayName: 'Trùng email' }
  }));
  ok('Email chủ tiệm đã dùng bị chặn', r.status >= 400, `HTTP ${r.status} ${r.code} ${r.fields.join(',')}`);

  r = await sa.call('POST', '/api/tenants', newTenantBody());
  const T = r.body?.tenant;
  const ownerPassword = r.body?.generatedPassword;
  ok('Lập tiệm hợp lệ → 201', r.status === 201 && !!T, short(r, 130));
  if (!T) return report();
  ok('Máy chủ sinh mật khẩu tạm cho chủ tiệm', typeof ownerPassword === 'string' && ownerPassword.length >= 8, ownerPassword ? 'có' : 'KHÔNG');
  ok('Tiệm mới ở trạng thái ACTIVE, không khóa ghi', T.displayStatus === 'ACTIVE' && T.isReadOnly === false,
    `displayStatus=${T.displayStatus}`);

  r = await sa.call('POST', '/api/tenants', newTenantBody());
  ok('Mã tiệm trùng bị chặn', r.status >= 400, `HTTP ${r.status} ${r.code} ${r.fields.join(',')}`);

  // ═══════════════════════════════════════════ 5. CHỦ TIỆM — DỰNG TIỆM
  head('5. Chủ tiệm dựng tiệm — chi nhánh, dịch vụ, nhân sự, khách');

  const ta = new Session('chu-tiem');
  r = await ta.call('POST', '/api/auth/login', { identifier: `chu${stamp}@tongduyet.vn`, password: ownerPassword });
  ok('Chủ tiệm mới đăng nhập bằng mật khẩu tạm', r.status === 200, short(r, 130));
  ok('Chủ tiệm PHẢI chọn tiệm trước (BR-AUTH-023)', r.body?.mustSelectTenant === true, `mustSelectTenant=${r.body?.mustSelectTenant}`);
  if (r.status !== 200) return report();

  r = await ta.call('GET', '/api/branches');
  ok('Chưa chọn tiệm thì mọi API nghiệp vụ bị chặn', r.status === 403, `HTTP ${r.status} ${r.code}`);

  r = await ta.call('GET', '/api/auth/my-tenants');
  ok('Chỉ thấy đúng tiệm của mình', (r.body?.tenants || []).length === 1 && r.body.tenants[0].id === T.id,
    (r.body?.tenants || []).map(t => t.id).join(','));

  r = await ta.call('POST', '/api/auth/session/tenant', { tenantId: 'TEN-LUMIERE' });
  ok('Không chọn được tiệm mình không quản (BR-ISO-001)', r.status >= 400, `HTTP ${r.status} ${r.code}`);

  r = await ta.call('POST', '/api/auth/session/tenant', { tenantId: T.id });
  ok('Chọn tiệm của mình → OK', r.status === 200, short(r, 130));
  const capabilities = r.body?.tenant?.capabilities || [];
  ok('Phiên mang theo quyền tính năng của gói', capabilities.length > 0, `${capabilities.length} quyền`);

  r = await ta.call('GET', '/api/tenants/me');
  ok('Đọc được hồ sơ tiệm mình', r.status === 200 && r.body?.tenant?.id === T.id, short(r, 110));

  r = await ta.call('GET', '/api/tenants');
  ok('Chủ tiệm KHÔNG xem được danh sách nền tảng', r.status === 403, `HTTP ${r.status} ${r.code}`);

  r = await ta.call('GET', '/api/branches');
  let branches = r.body?.branches || [];
  ok('Chi nhánh chính sinh ra cùng tiệm', branches.length === 1 && branches[0].isPrimary === true,
    `${branches.length} chi nhánh, isPrimary=${branches[0]?.isPrimary}`);
  const primaryBranch = branches[0];

  r = await ta.call('PATCH', `/api/branches/${primaryBranch.id}/status`, { status: 'INACTIVE' });
  ok('Chi nhánh chính không ngừng hoạt động được (BR-BRANCH-002)', r.status >= 400, `HTTP ${r.status} ${r.code}`);

  r = await ta.call('POST', '/api/branches', { name: 'Chi nhánh Thảo Điền', code: 'TD', address: '5 Quốc Hương, TP. Thủ Đức', phone: '0283938888' });
  const branch2 = r.body?.branch;
  ok('Lập chi nhánh thứ hai (gói Premium cho 3)', r.status === 201, short(r, 130));

  r = await ta.call('POST', '/api/branches', { name: 'Chi nhánh Ba', code: 'B3' });
  ok('Lập chi nhánh thứ ba — vừa chạm trần gói', r.status === 201, `HTTP ${r.status}`);

  r = await ta.call('POST', '/api/branches', { name: 'Chi nhánh Bốn', code: 'B4' });
  ok('Chi nhánh thứ tư vượt hạn mức gói bị chặn (BR-BRANCH-005)', r.status >= 400,
    `HTTP ${r.status} ${r.code} — ${(r.body?.error?.message || '').slice(0, 80)}`);

  // Dịch vụ
  r = await ta.call('POST', '/api/services', { name: 'Giá âm', price: -1000, durationMinutes: 60, bufferMinutes: 10 });
  ok('Dịch vụ giá âm bị chặn', r.status === 422, `HTTP ${r.status} ${r.fields.join(',')}`);

  r = await ta.call('POST', '/api/services', { name: 'Không thời lượng', price: 100000, durationMinutes: 0, bufferMinutes: 0 });
  ok('Dịch vụ thời lượng 0 phút bị chặn', r.status === 422, `HTTP ${r.status} ${r.fields.join(',')}`);

  r = await ta.call('POST', '/api/services', {
    name: 'Sơn gel tổng duyệt', category: 'Nail', price: 350000,
    durationMinutes: 60, bufferMinutes: 10, description: 'Dịch vụ dựng lúc tổng duyệt'
  });
  const service = r.body?.service;
  ok('Lập dịch vụ 350.000₫ · 60p + 10p dọn', r.status === 201, short(r, 130));

  r = await ta.call('POST', '/api/services', { name: 'Dịch vụ phụ', price: 120000, durationMinutes: 30, bufferMinutes: 5 });
  const service2 = r.body?.service;
  ok('Lập dịch vụ thứ hai 120.000₫ · 30p + 5p', r.status === 201, `HTTP ${r.status}`);

  // Nhân sự
  r = await ta.call('POST', '/api/staff', {
    branchId: primaryBranch.id, fullName: 'Kỹ Thuật Viên Duyệt', phone: '0912000019',
    email: `ktv${stamp}@tongduyet.vn`, role: 'TECHNICIAN',
    shiftStart: '09:00', shiftEnd: '18:00', commissionRate: 0.15, skills: ['Nail']
  });
  const tech = r.body?.staff;
  ok('Lập kỹ thuật viên (ca 09:00–18:00)', r.status === 201, short(r, 130));

  r = await ta.call('POST', '/api/staff', {
    branchId: primaryBranch.id, fullName: 'KTV hoa hồng sai', role: 'TECHNICIAN',
    shiftStart: '09:00', shiftEnd: '18:00', commissionRate: 1.5, skills: []
  });
  ok('Hoa hồng ngoài khoảng 0…1 bị chặn', r.status === 422 && r.fields.includes('commissionRate'),
    `HTTP ${r.status} ${r.fields.join(',')}`);

  r = await ta.call('POST', `/api/staff/${tech?.id}/account`, { email: `ktv${stamp}@tongduyet.vn`, username: `ktv${stamp}` });
  ok('Kỹ thuật viên KHÔNG được cấp tài khoản (BR-AUTH-002)', r.status >= 400, `HTTP ${r.status} ${r.code}`);

  r = await ta.call('POST', '/api/staff', {
    branchId: primaryBranch.id, fullName: 'Lễ Tân Duyệt', phone: '0912000020',
    email: `letan${stamp}@tongduyet.vn`, role: 'RECEPTIONIST',
    shiftStart: '08:00', shiftEnd: '20:00', commissionRate: 0, skills: []
  });
  const recStaff = r.body?.staff;
  ok('Lập hồ sơ lễ tân', r.status === 201, short(r, 130));

  r = await ta.call('POST', `/api/staff/${recStaff?.id}/account`, {
    email: `letan${stamp}@tongduyet.vn`, username: `letan${stamp}`, displayName: 'Lễ Tân Duyệt'
  });
  const recPassword = r.body?.generatedPassword;
  ok('Cấp tài khoản đăng nhập cho lễ tân (BR-AUTH-013)', r.status === 201 || r.status === 200, `HTTP ${r.status}`);
  ok('Máy chủ sinh mật khẩu lễ tân, trả về đúng một lần', !!recPassword, recPassword ? 'có' : 'KHÔNG');

  r = await ta.call('POST', `/api/staff/${recStaff?.id}/account`, { email: `letan2${stamp}@tongduyet.vn`, username: `letan2${stamp}` });
  ok('Cấp tài khoản lần thứ hai cho cùng hồ sơ bị chặn', r.status >= 400, `HTTP ${r.status} ${r.code}`);

  // Khách hàng
  r = await ta.call('POST', '/api/customers', { phone: '123', fullName: 'Số sai định dạng' });
  ok('Số điện thoại sai định dạng bị chặn', r.status === 422 && r.fields.includes('phone'), `HTTP ${r.status} ${r.fields.join(',')}`);

  r = await ta.call('POST', '/api/customers', { phone: '0977000019', fullName: 'Khách Tổng Duyệt', email: `khach${stamp}@gmail.com` });
  const customer = r.body?.customer;
  ok('Lập hồ sơ khách', r.status === 201, short(r, 130));

  r = await ta.call('POST', '/api/customers', { phone: '0977000019', fullName: 'Khách trùng số' });
  ok('Số điện thoại trùng trong cùng tiệm bị chặn', r.status >= 400, `HTTP ${r.status} ${r.code} ${r.fields.join(',')}`);

  r = await ta.call('POST', '/api/customers', { phone: '0977000020', fullName: 'Khách Thứ Hai' });
  const customer2 = r.body?.customer;
  ok('Khách thứ hai, số khác → OK', r.status === 201, `HTTP ${r.status}`);

  // ═══════════════════════════════════════════ 6. LỄ TÂN — LỊCH HẸN
  head('6. Lễ tân đặt lịch — BR-APT');

  const rc = new Session('le-tan');
  r = await rc.call('POST', '/api/auth/login', { identifier: `letan${stamp}@tongduyet.vn`, password: recPassword });
  ok('Lễ tân đăng nhập', r.status === 200, short(r, 120));
  ok('Lễ tân không phải chọn tiệm — phiên gắn sẵn', r.body?.mustSelectTenant === false, `mustSelectTenant=${r.body?.mustSelectTenant}`);
  if (r.status !== 200) return report();

  r = await rc.call('GET', '/api/auth/session');
  ok('Phiên lễ tân gắn đúng chi nhánh của hồ sơ (BR-APT-002)', r.body?.branch?.id === primaryBranch.id,
    `branch=${r.body?.branch?.code} (${r.body?.branch?.id})`);

  const book = (over = {}) => ({
    customerId: customer.id, staffId: tech.id,
    startAt: `${today}T14:00:00+07:00`,
    services: [{ serviceId: service.id }],
    status: 'CONFIRMED', source: 'RECEPTION', ...over
  });

  r = await rc.call('POST', '/api/appointments', book({ services: [] }));
  ok('Lịch hẹn không có dịch vụ bị chặn', r.status === 422 && r.fields.includes('services'), `HTTP ${r.status} ${r.fields.join(',')}`);

  r = await rc.call('POST', '/api/appointments', book({ staffId: 'STF-KHONG-CO' }));
  ok('Kỹ thuật viên không tồn tại bị chặn', r.status === 404 || r.status === 422, `HTTP ${r.status} ${r.code}`);

  r = await rc.call('POST', '/api/appointments', book({ status: 'IN_SERVICE' }));
  ok('Đặt lịch thẳng vào IN_SERVICE bị chặn (BR-APT-021)', r.status >= 400, `HTTP ${r.status} ${r.code}`);

  r = await rc.call('POST', '/api/appointments', book());
  const A1 = r.body?.appointment;
  ok('Đặt lịch 14:00 → 201', r.status === 201, short(r, 130));
  if (!A1) return report();
  ok('Khoảng chiếm chỗ = 60p dịch vụ + 10p dọn (BR-APT-010)', A1.totalMinutes === 70, `totalMinutes=${A1.totalMinutes}`);
  ok('endAt suy ra đúng: 14:00 → 15:10', (A1.endAt || '').includes('15:10'), `endAt=${A1.endAt}`);
  ok('Chi nhánh của lịch = chi nhánh của KTV (BR-EMP-003)', A1.branchId === primaryBranch.id, `branchId=${A1.branchId}`);
  ok('nextStatuses gửi kèm để giao diện dựng nút', Array.isArray(A1.nextStatuses) && A1.nextStatuses.length > 0,
    (A1.nextStatuses || []).join(','));

  r = await rc.call('POST', '/api/appointments', book({ startAt: `${today}T14:30:00+07:00` }));
  ok('Trùng giữa khoảng bị chặn (BR-APT-011)', r.status === 409 && r.code === 'SLOT_CONFLICT', short(r, 160));

  r = await rc.call('POST', '/api/appointments', book({ startAt: `${today}T13:30:00+07:00` }));
  ok('Trùng đè lên đầu khoảng cũng bị chặn', r.status === 409, `HTTP ${r.status} ${r.code}`);

  r = await rc.call('POST', '/api/appointments', book({ startAt: `${today}T15:05:00+07:00` }));
  ok('Đặt vào đúng khoảng dọn dẹp bị chặn', r.status === 409, `HTTP ${r.status} ${r.code}`);

  r = await rc.call('POST', '/api/appointments', book({ startAt: `${today}T15:10:00+07:00`, source: 'PHONE', customerId: customer2.id }));
  const A2 = r.body?.appointment;
  ok('Lịch nối đuôi ngay sau khoảng dọn KHÔNG phải trùng', r.status === 201, `HTTP ${r.status}`);

  r = await rc.call('POST', '/api/appointments', book({ startAt: `${dayOffset(-3)}T14:00:00+07:00`, customerId: customer2.id }));
  ok('Đặt lịch trong quá khứ vẫn nhận, kèm cảnh báo (BR-APT-005)',
    r.status === 201 && (r.body?.warnings || []).length > 0,
    `HTTP ${r.status} warnings=${(r.body?.warnings || []).map(w => w.code).join(',')}`);
  const APast = r.body?.appointment;

  r = await rc.call('POST', '/api/appointments', book({ startAt: `${dayOffset(1)}T22:00:00+07:00`, customerId: customer2.id }));
  ok('Đặt ngoài ca kỹ thuật viên vẫn nhận, kèm cảnh báo (BR-APT-013)',
    r.status === 201 && (r.body?.warnings || []).length > 0,
    `HTTP ${r.status} warnings=${(r.body?.warnings || []).map(w => w.code).join(',')}`);
  const AOutOfShift = r.body?.appointment;

  // ═══════════════════════════════════════════ 7. SƠ ĐỒ CHUYỂN TRẠNG THÁI
  head('7. Sơ đồ chuyển trạng thái lịch hẹn — §16.1');

  r = await rc.call('PATCH', `/api/appointments/${A1.id}/status`, { status: 'IN_SERVICE' });
  ok('CONFIRMED → IN_SERVICE (nhảy cóc qua check-in) bị chặn', r.status >= 400, `HTTP ${r.status} ${r.code}`);

  r = await rc.call('PATCH', `/api/appointments/${A1.id}/status`, { status: 'COMPLETED' });
  ok('Lễ tân KHÔNG tự đóng lịch (BR-APT-026)', r.status === 403 || r.status === 422, `HTTP ${r.status} ${r.code}`);

  r = await rc.call('PATCH', `/api/appointments/${A1.id}/status`, { status: 'CHECKED_IN' });
  ok('CONFIRMED → CHECKED_IN', r.body?.appointment?.status === 'CHECKED_IN', `status=${r.body?.appointment?.status}`);

  r = await rc.call('PATCH', `/api/appointments/${A1.id}/status`, { status: 'IN_SERVICE' });
  ok('CHECKED_IN → IN_SERVICE', r.body?.appointment?.status === 'IN_SERVICE', `status=${r.body?.appointment?.status}`);

  r = await rc.call('PATCH', `/api/appointments/${AOutOfShift.id}/status`, { status: 'CANCELLED' });
  ok('Hủy lịch được (BR-APT-024)', r.body?.appointment?.status === 'CANCELLED', `status=${r.body?.appointment?.status}`);

  r = await rc.call('PATCH', `/api/appointments/${AOutOfShift.id}/status`, { status: 'CONFIRMED' });
  ok('CANCELLED là điểm cuối, không quay lại (BR-APT-041)', r.status >= 400, `HTTP ${r.status} ${r.code}`);

  r = await rc.call('PATCH', `/api/appointments/${APast.id}/status`, { status: 'NO_SHOW' });
  ok('Ghi nhận khách không đến', r.body?.appointment?.status === 'NO_SHOW', `status=${r.body?.appointment?.status}`);

  r = await rc.call('PATCH', `/api/appointments/${APast.id}/status`, { status: 'CHECKED_IN' });
  ok('NO_SHOW cũng là điểm cuối', r.status >= 400, `HTTP ${r.status} ${r.code}`);

  r = await rc.call('PATCH', `/api/appointments/${A2.id}/schedule`, { startAt: `${today}T16:30:00+07:00` });
  ok('Dời lịch giữ nguyên trạng thái và độ dài (BR-APT-025)',
    r.status === 200 && r.body?.appointment?.status === 'CONFIRMED' && r.body?.appointment?.totalMinutes === A2.totalMinutes,
    `status=${r.body?.appointment?.status} totalMinutes=${r.body?.appointment?.totalMinutes}`);

  r = await rc.call('PATCH', `/api/appointments/${A2.id}/schedule`, { startAt: `${today}T14:30:00+07:00` });
  ok('Dời vào chỗ trùng vẫn chạy lại phép chống trùng', r.status === 409, `HTTP ${r.status} ${r.code}`);

  // ═══════════════════════════════════════════ 8. HÓA ĐƠN VÀ TIỀN
  head('8. Hóa đơn và công thức tiền — BR-INV, BR-PAY');

  r = await rc.call('POST', '/api/sales-invoices', { appointmentId: A1.id, discount: 400000 });
  ok('Giảm giá lớn hơn tiền hàng bị chặn', r.status === 422 && r.fields.includes('discount'), `HTTP ${r.status} ${r.fields.join(',')}`);

  r = await rc.call('POST', '/api/sales-invoices', {
    appointmentId: A1.id, discount: 50000, discountReason: 'Khách quen', tip: 20000
  });
  const INV = r.body?.invoice;
  ok('Lập hóa đơn từ lịch hẹn (BR-INV-010)', r.status === 201, short(r, 130));
  if (!INV) return report();
  ok('Công thức tiền: 350.000 − 50.000 + 20.000 = 320.000 (BR-INV-020)',
    INV.subtotal === 350000 && INV.discount === 50000 && INV.tip === 20000 && INV.total === 320000,
    `subtotal=${vnd(INV.subtotal)} discount=${vnd(INV.discount)} tip=${vnd(INV.tip)} total=${vnd(INV.total)}`);
  ok('Chưa thu đồng nào → PENDING, còn thiếu đúng tổng',
    INV.status === 'PENDING' && INV.collected === 0 && INV.remaining === 320000,
    `status=${INV.status} collected=${vnd(INV.collected)} remaining=${vnd(INV.remaining)}`);
  ok('Dòng hóa đơn chép từ dịch vụ của lịch hẹn', (INV.lines || []).length === 1 && INV.lines[0].unitPrice === 350000,
    `${(INV.lines || []).length} dòng`);

  r = await rc.call('POST', '/api/sales-invoices', { appointmentId: A1.id });
  ok('Lập hóa đơn thứ hai cho cùng lịch hẹn bị chặn', r.status >= 400, `HTTP ${r.status} ${r.code}`);

  r = await rc.call('POST', `/api/sales-invoices/${INV.id}/payments`, { method: 'TIENMAT', amount: 1000 });
  ok('Phương thức thanh toán không hợp lệ bị chặn', r.status === 422, `HTTP ${r.status} ${r.fields.join(',')}`);

  r = await rc.call('POST', `/api/sales-invoices/${INV.id}/payments`, { method: 'CASH', amount: 0 });
  ok('Thu 0₫ bị chặn', r.status === 422, `HTTP ${r.status} ${r.fields.join(',')}`);

  r = await rc.call('POST', `/api/sales-invoices/${INV.id}/payments`, { method: 'CASH', amount: -50000 });
  ok('Thu số tiền âm bị chặn', r.status === 422, `HTTP ${r.status} ${r.fields.join(',')}`);

  r = await rc.call('POST', `/api/sales-invoices/${INV.id}/payments`, { method: 'CASH', amount: 320001 });
  ok('Thu vượt 1₫ ngay lần đầu bị chặn (BR-PAY-009)',
    r.status === 422 && r.fields.includes('amount'), `HTTP ${r.status} — ${(r.body?.error?.message || '').slice(0, 70)}`);

  r = await rc.call('GET', `/api/sales-invoices/${INV.id}`);
  ok('Lần từ chối không để lại dấu vết', r.body?.invoice?.status === 'PENDING' && r.body?.invoice?.collected === 0,
    `status=${r.body?.invoice?.status} collected=${vnd(r.body?.invoice?.collected)}`);

  r = await rc.call('POST', `/api/sales-invoices/${INV.id}/payments`, { method: 'CASH', amount: 100000 });
  ok('Thu lần 1: 100.000₫ → PARTIAL (BR-PAY-003)',
    r.body?.invoice?.status === 'PARTIAL' && r.body?.invoice?.remaining === 220000,
    `status=${r.body?.invoice?.status} remaining=${vnd(r.body?.invoice?.remaining)}`);

  r = await rc.call('GET', `/api/appointments/${A1.id}`);
  ok('Thu chưa đủ thì lịch hẹn CHƯA đóng', r.body?.appointment?.status === 'IN_SERVICE', `status=${r.body?.appointment?.status}`);

  r = await rc.call('POST', `/api/sales-invoices/${INV.id}/payments`, { method: 'BANK', amount: 220001 });
  ok('Thu vượt phần còn thiếu 1₫ bị chặn', r.status === 422 && r.fields.includes('amount'),
    `HTTP ${r.status} — ${(r.body?.error?.message || '').slice(0, 70)}`);

  r = await rc.call('POST', `/api/sales-invoices/${INV.id}/payments`, { method: 'BANK', amount: 220000, reference: 'VCB-TD-19' });
  ok('Thu lần 2 đúng bằng phần còn thiếu → PAID',
    r.body?.invoice?.status === 'PAID' && r.body?.invoice?.remaining === 0,
    `status=${r.body?.invoice?.status} collected=${vnd(r.body?.invoice?.collected)} remaining=${vnd(r.body?.invoice?.remaining)}`);
  ok('Hai lần thu, hai dòng tiền (BR-PAY-001/004)', (r.body?.invoice?.payments || []).length === 2,
    `${(r.body?.invoice?.payments || []).length} dòng`);

  r = await rc.call('POST', `/api/sales-invoices/${INV.id}/payments`, { method: 'CASH', amount: 1000 });
  ok('Hóa đơn đã đủ thì không thu thêm', r.status === 422, `HTTP ${r.status} — ${(r.body?.error?.message || '').slice(0, 60)}`);

  r = await rc.call('GET', `/api/appointments/${A1.id}`);
  ok('Hóa đơn PAID → lịch hẹn tự COMPLETED (BR-APT-026)', r.body?.appointment?.status === 'COMPLETED',
    `status=${r.body?.appointment?.status}`);

  r = await rc.call('PUT', `/api/sales-invoices/${INV.id}`, { lines: [{ serviceId: service.id, quantity: 2 }] });
  ok('Hóa đơn đã thanh toán không sửa được (BR-INV-014)', r.status >= 400, `HTTP ${r.status} ${r.code}`);

  r = await rc.call('POST', `/api/sales-invoices/${INV.id}/refunds`, { method: 'CASH', amount: 50000, reason: 'Khách khiếu nại' });
  ok('Lễ tân KHÔNG hoàn tiền được (BR-PAY-007)', r.status === 403, `HTTP ${r.status} ${r.code}`);

  // Hóa đơn bán lẻ do chủ tiệm lập
  r = await ta.call('POST', '/api/sales-invoices', {
    customerId: customer2.id, staffId: tech.id, branchId: primaryBranch.id,
    lines: [{ serviceId: service2.id, quantity: 2 }], note: 'Hóa đơn bán lẻ'
  });
  const INV2 = r.body?.invoice;
  ok('Chủ tiệm lập hóa đơn bán lẻ, không cần lịch hẹn (BR-INV-011)', r.status === 201, short(r, 130));
  ok('Số lượng 2 × 120.000 = 240.000', INV2?.subtotal === 240000 && INV2?.total === 240000,
    `subtotal=${vnd(INV2?.subtotal)} total=${vnd(INV2?.total)}`);

  r = await ta.call('POST', `/api/sales-invoices/${INV2.id}/refunds`, { method: 'CASH', amount: 10000, reason: 'Hoàn khi chưa thu' });
  ok('Hoàn tiền khi hóa đơn chưa thu đủ bị chặn', r.status === 422, `HTTP ${r.status} ${r.fields.join(',')}`);

  r = await ta.call('POST', `/api/sales-invoices/${INV2.id}/payments`, { method: 'CASH', amount: 240000 });
  ok('Chủ tiệm thu tiền hóa đơn bán lẻ → PAID', r.body?.invoice?.status === 'PAID', `status=${r.body?.invoice?.status}`);

  r = await ta.call('POST', `/api/sales-invoices/${INV2.id}/refunds`, { method: 'CASH', amount: 240001, reason: 'Hoàn vượt' });
  ok('Hoàn vượt tổng đã thu bị chặn (BR-PAY-008)', r.status === 422 && r.fields.includes('amount'), `HTTP ${r.status}`);

  r = await ta.call('POST', `/api/sales-invoices/${INV2.id}/refunds`, { method: 'CASH', amount: 40000 });
  ok('Hoàn tiền thiếu lý do bị chặn (BR-PAY-006)', r.status === 422 && r.fields.includes('reason'), `HTTP ${r.status}`);

  r = await ta.call('POST', `/api/sales-invoices/${INV2.id}/refunds`, { method: 'CASH', amount: 40000, reason: 'Khách không hài lòng' });
  ok('Chủ tiệm hoàn 40.000₫ → REFUNDED', r.body?.invoice?.status === 'REFUNDED', `status=${r.body?.invoice?.status}`);

  // ═══════════════════════════════════════════ 9. BÁO CÁO DOANH THU
  head('9. Báo cáo doanh thu — BR-REV');

  r = await rc.call('GET', `/api/reports/revenue?${range(today, today)}`);
  ok('Lễ tân KHÔNG xem được báo cáo doanh thu', r.status === 403, `HTTP ${r.status} ${r.code}`);

  r = await ta.call('GET', `/api/reports/revenue?${range(today, today)}`);
  const rep = r.body?.report;
  ok('Chủ tiệm đọc được báo cáo', r.status === 200 && !!rep, short(r, 130));

  // 320.000 (đã thu đủ, tip 20.000) + 240.000 bán lẻ − 40.000 hoàn = 520.000 thực thu; tip 20.000
  ok('Tiền qua két = 320.000 + 240.000 − 40.000 = 520.000', rep?.collected === 520000, `collected=${vnd(rep?.collected)}`);
  ok('Hoàn tiền ghi âm vào đúng ngày hoàn (BR-REV-003)', rep?.refunds === 40000, `refunds=${vnd(rep?.refunds)}`);
  ok('Doanh thu = tiền thực thu trừ tip (BR-REV-001)', rep?.revenue === 500000 && rep?.tips === 20000,
    `revenue=${vnd(rep?.revenue)} tips=${vnd(rep?.tips)}`);
  ok('revenue + tips = collected', (rep?.revenue + rep?.tips) === rep?.collected,
    `${vnd(rep?.revenue)} + ${vnd(rep?.tips)} = ${vnd(rep?.collected)}`);

  const sum = (rows) => (rows || []).reduce((a, x) => a + (x.revenue || 0), 0);
  ok('Bốn chiều phân rã cộng lại đúng doanh thu (BR-REV-004)',
    [rep?.byDay, rep?.byBranch, rep?.byStaff, rep?.byService].every(rows => rows && sum(rows) === rep.revenue),
    `ngày=${vnd(sum(rep?.byDay))} chi nhánh=${vnd(sum(rep?.byBranch))} nhân viên=${vnd(sum(rep?.byStaff))} dịch vụ=${vnd(sum(rep?.byService))}`);

  r = await ta.call('GET', `/api/reports/revenue?${range(today, today)}&branchId=${primaryBranch.id}`);
  ok('Lọc theo chi nhánh chạy đúng', r.status === 200 && r.body?.report?.branchId === primaryBranch.id,
    `revenue=${vnd(r.body?.report?.revenue)} branchId=${r.body?.report?.branchId}`);

  r = await ta.call('GET', `/api/reports/revenue?${range(today, today)}&branchId=BRN-LUMIERE-Q3`);
  ok('Lọc theo chi nhánh của tiệm KHÁC không rò dữ liệu',
    r.status >= 400 || (r.body?.report?.revenue === 0),
    `HTTP ${r.status} revenue=${vnd(r.body?.report?.revenue)}`);

  r = await ta.call('GET', `/api/reports/revenue?${range(dayOffset(-2), dayOffset(-1))}`);
  ok('Kỳ không có khoản thu nào → doanh thu 0, không lỗi',
    r.status === 200 && r.body?.report?.revenue === 0, `revenue=${vnd(r.body?.report?.revenue)}`);

  // ═══════════════════════════════════════════ 10. CÁCH LY TIỆM
  head('10. Cách ly tiệm — BR-ISO');

  const lum = new Session('nailé');
  r = await lum.call('POST', '/api/auth/login', { identifier: 'tenantadmin@lumierehair.vn', password: 'Lumiere@2026' });
  ok('Chủ tiệm Nailé đăng nhập', r.status === 200, `HTTP ${r.status}`);
  r = await lum.call('GET', '/api/auth/my-tenants');
  ok('Một tài khoản quản hai tiệm (BR-AUTH-023)', (r.body?.tenants || []).length === 2,
    (r.body?.tenants || []).map(t => t.id).join(','));
  await lum.call('POST', '/api/auth/session/tenant', { tenantId: 'TEN-LUMIERE' });

  for (const [name, path] of [
    ['lịch hẹn', `/api/appointments/${A1.id}`],
    ['hóa đơn', `/api/sales-invoices/${INV.id}`],
    ['khách hàng', `/api/customers/${customer.id}`]
  ]) {
    r = await lum.call('GET', path);
    ok(`Tiệm khác KHÔNG đọc được ${name} của tiệm mình`, r.status === 404 || r.status === 403, `HTTP ${r.status} ${r.code}`);
  }

  r = await lum.call('PATCH', `/api/appointments/${A1.id}/status`, { status: 'CANCELLED' });
  ok('Tiệm khác KHÔNG ghi được lên lịch hẹn của tiệm mình', r.status === 404 || r.status === 403, `HTTP ${r.status} ${r.code}`);

  r = await lum.call('GET', '/api/branches');
  const lumBranches = r.body?.branches || [];
  ok('Nailé chỉ thấy hai chi nhánh của chính nó', lumBranches.length === 2,
    lumBranches.map(b => b.code).join(','));
  ok('Không lẫn chi nhánh của tiệm tổng duyệt', !lumBranches.some(b => b.tenantId === T.id), 'không lẫn');

  // Đổi tiệm trong cùng phiên
  await lum.call('POST', '/api/auth/session/tenant', { tenantId: 'TEN-MUSE' });
  r = await lum.call('GET', '/api/branches');
  ok('Đổi sang tiệm Muse thì dữ liệu đổi theo', (r.body?.branches || []).length === 1,
    (r.body?.branches || []).map(b => b.code).join(','));

  // ═══════════════════════════════════════════ 11. CHẶN GHI KHI HẾT HẠN / TẠM NGƯNG
  head('11. Chặn ghi khi tiệm hết hạn hoặc tạm ngưng — BR-TENANT-010…013');

  for (const [label, email, tenantId] of [
    ['Oasis (quá hạn)', 'ngoc.trinh@oasiswellness.vn', 'TEN-OASIS'],
    ['Morning Dew (tạm ngưng)', 'uyen.hoang@morningdew.vn', 'TEN-MORNING']
  ]) {
    const s = new Session(tenantId);
    r = await s.call('POST', '/api/auth/login', { identifier: email, password: 'Tenant@2026' });
    ok(`${label}: vẫn đăng nhập được`, r.status === 200, `HTTP ${r.status}`);
    r = await s.call('POST', '/api/auth/session/tenant', { tenantId });
    ok(`${label}: chọn tiệm được`, r.status === 200, `HTTP ${r.status}`);
    r = await s.call('GET', '/api/branches');
    ok(`${label}: ĐỌC được`, r.status === 200, `HTTP ${r.status}`);
    r = await s.call('GET', '/api/tenants/me');
    ok(`${label}: đọc được hồ sơ tiệm`, r.status === 200, `isReadOnly=${r.body?.tenant?.isReadOnly}`);
    r = await s.call('POST', '/api/services', { name: 'Không được phép', price: 100000, durationMinutes: 30, bufferMinutes: 5 });
    ok(`${label}: GHI bị chặn`, r.status === 403 && r.code === 'TENANT_READONLY', `HTTP ${r.status} ${r.code}`);
    r = await s.call('POST', '/api/customers', { phone: '0988000001', fullName: 'Không được phép' });
    ok(`${label}: mọi đường ghi đều bị chặn, không chỉ một`, r.status === 403, `HTTP ${r.status} ${r.code}`);
  }

  // ═══════════════════════════════════════════ 12. VÒNG ĐỜI TIỆM
  head('12. Vòng đời tiệm — Superadmin gia hạn, khóa, mở, xóa mềm');

  r = await sa.call('POST', `/api/tenants/${T.id}/renew`, { expiresAt: new Date(Date.now() + 365 * 86400000).toISOString() });
  ok('Gia hạn tiệm (BR-TENANT-006)', r.status === 200 && r.body?.tenant?.daysRemaining > 300,
    `daysRemaining=${r.body?.tenant?.daysRemaining}`);

  r = await sa.call('PATCH', `/api/tenants/${T.id}/status`, { status: 'SUSPENDED' });
  ok('Khóa tiệm', r.body?.tenant?.displayStatus === 'SUSPENDED', `displayStatus=${r.body?.tenant?.displayStatus}`);

  r = await ta.call('POST', '/api/customers', { phone: '0988000002', fullName: 'Sau khi bị khóa' });
  ok('Tiệm vừa bị khóa thì phiên đang mở cũng bị chặn ghi ngay', r.status === 403 && r.code === 'TENANT_READONLY',
    `HTTP ${r.status} ${r.code}`);

  r = await ta.call('GET', '/api/customers');
  ok('…nhưng vẫn đọc được', r.status === 200, `${(r.body?.customers || []).length} khách`);

  r = await sa.call('PATCH', `/api/tenants/${T.id}/status`, { status: 'ACTIVE' });
  ok('Mở khóa tiệm', r.body?.tenant?.displayStatus === 'ACTIVE', `displayStatus=${r.body?.tenant?.displayStatus}`);

  r = await ta.call('POST', '/api/customers', { phone: '0988000003', fullName: 'Sau khi mở khóa' });
  ok('Mở khóa xong ghi lại được ngay, không cần đăng nhập lại', r.status === 201, `HTTP ${r.status}`);

  // ═══════════════════════════════════════════ 13. NHẬT KÝ KIỂM TOÁN
  head('13. Nhật ký kiểm toán — BR-LOG');

  r = await sa.call('GET', '/api/audit-logs');
  const entries = r.body?.entries || [];
  ok('Nhật ký tăng sau buổi tổng duyệt', entries.length > logsAtStart, `${logsAtStart} → ${entries.length}`);

  const events = new Set(entries.map(e => e.event || e.eventType));
  ok('Có ghi sự kiện thu tiền', [...events].some(e => /PAYMENT/i.test(e || '')), [...events].slice(0, 8).join(','));
  ok('Có ghi sự kiện tạo tiệm', [...events].some(e => /TENANT/i.test(e || '')), `${events.size} loại sự kiện`);

  const own = entries.filter(e => e.tenantId === T.id);
  ok('Nhật ký gắn đúng mã tiệm', own.length > 0, `${own.length} bản ghi của tiệm tổng duyệt`);

  // ═══════════════════════════════════════════ 14. SỬA VÀ NGỪNG HOẠT ĐỘNG
  head('14. Đường sửa hồ sơ và ngừng hoạt động — BR-DEL-001');

  r = await ta.call('PUT', `/api/branches/${branch2.id}`, {
    name: 'Chi nhánh Thảo Điền (đổi tên)', code: 'TD', address: '9 Xuân Thủy, TP. Thủ Đức', phone: '0283937777'
  });
  ok('Sửa chi nhánh', r.status === 200 && r.body?.branch?.name?.includes('đổi tên'), `name=${r.body?.branch?.name}`);

  r = await ta.call('PATCH', `/api/branches/${branch2.id}/status`, { status: 'INACTIVE' });
  ok('Ngừng hoạt động chi nhánh phụ', r.body?.branch?.status === 'INACTIVE', `status=${r.body?.branch?.status}`);

  r = await ta.call('POST', '/api/branches', { name: 'Chi nhánh Bốn thử lại', code: 'B4B' });
  ok('Ngừng một chi nhánh thì mở lại được chỗ trong hạn mức (BR-BRANCH-005 đếm ACTIVE)',
    r.status === 201, `HTTP ${r.status} ${r.code || ''}`);

  r = await ta.call('PUT', `/api/services/${service2.id}`, {
    name: 'Dịch vụ phụ (đổi giá)', price: 150000, durationMinutes: 30, bufferMinutes: 5
  });
  ok('Sửa giá dịch vụ', r.status === 200 && r.body?.service?.price === 150000, `price=${vnd(r.body?.service?.price)}`);

  r = await ta.call('GET', `/api/sales-invoices/${INV2.id}`);
  ok('Đổi giá dịch vụ KHÔNG làm đổi hóa đơn cũ (BR-SVC-007 — giá chốt lúc lập)',
    r.body?.invoice?.subtotal === 240000, `subtotal=${vnd(r.body?.invoice?.subtotal)}`);

  r = await ta.call('PATCH', `/api/services/${service2.id}/status`, { status: 'INACTIVE' });
  ok('Ngừng bán một dịch vụ', r.body?.service?.status === 'INACTIVE', `status=${r.body?.service?.status}`);

  r = await ta.call('PUT', `/api/customers/${customer2.id}`, { phone: '0977000021', fullName: 'Khách Thứ Hai (đổi tên)' });
  ok('Sửa hồ sơ khách', r.status === 200 && r.body?.customer?.phone === '0977000021', `phone=${r.body?.customer?.phone}`);

  r = await ta.call('PUT', `/api/customers/${customer2.id}`, { phone: '0977000019', fullName: 'Cướp số của khách khác' });
  ok('Sửa sang số điện thoại đã có của khách khác bị chặn', r.status >= 400, `HTTP ${r.status} ${r.code}`);

  r = await ta.call('PATCH', `/api/customers/${customer2.id}/status`, { status: 'INACTIVE' });
  ok('Ngừng hồ sơ khách — xóa mềm, không xóa cứng (BR-DEL-001)',
    r.body?.customer?.status === 'INACTIVE', `status=${r.body?.customer?.status}`);

  r = await ta.call('GET', `/api/customers/${customer2.id}`);
  ok('Hồ sơ đã ngừng vẫn đọc lại được, không biến mất', r.status === 200, `HTTP ${r.status}`);

  r = await ta.call('PUT', `/api/staff/${tech.id}`, {
    branchId: primaryBranch.id, fullName: 'Kỹ Thuật Viên Duyệt', phone: '0912000019',
    role: 'TECHNICIAN', shiftStart: '10:00', shiftEnd: '19:00', commissionRate: 0.2, skills: ['Nail', 'Spa']
  });
  ok('Sửa ca làm và hoa hồng của kỹ thuật viên',
    r.status === 200 && r.body?.staff?.commissionRate === 0.2, `shift=${r.body?.staff?.shiftStart}–${r.body?.staff?.shiftEnd} hoa hồng=${r.body?.staff?.commissionRate}`);

  r = await ta.call('PUT', `/api/tenants/${T.id}`, { name: `Tiệm Tổng Duyệt ${stamp} (đổi tên)`, phone: '0283939000' });
  ok('Chủ tiệm KHÔNG tự sửa hồ sơ tiệm của mình qua đường này', r.status === 403, `HTTP ${r.status} ${r.code}`);

  r = await sa.call('PUT', `/api/tenants/${T.id}`, { name: `Tiệm Tổng Duyệt ${stamp} (đổi tên)`, phone: '0283939000' });
  ok('Superadmin sửa được hồ sơ tiệm', r.status === 200 && r.body?.tenant?.name?.includes('đổi tên'),
    `name=${r.body?.tenant?.name}`);

  r = await sa.call('GET', '/api/accounts?role=TENANT_ADMIN');
  ok('Danh sách tài khoản chủ tiệm đọc được', r.status === 200 && (r.body?.accounts || []).length > 0,
    `${(r.body?.accounts || []).length} tài khoản`);

  report();
};

const report = () => {
  const failed = results.filter(x => !x.pass);
  process.exitCode = failed.length ? 1 : 0;
  console.log('\n╔═══════════════ KẾT QUẢ ═══════════════╗');
  const bySection = {};
  for (const x of results) {
    bySection[x.section] ||= { pass: 0, fail: 0 };
    bySection[x.section][x.pass ? 'pass' : 'fail']++;
  }
  for (const [name, c] of Object.entries(bySection)) {
    console.log(`  ${c.fail ? '✗' : '✓'} ${name} — ${c.pass}/${c.pass + c.fail}`);
  }
  console.log(`\n  TỔNG: ${results.length - failed.length}/${results.length} bước đạt.`);
  if (failed.length) {
    console.log('\n  Chỗ vấp:');
    failed.forEach(f => console.log(`    ✗ ${f.step}. ${f.label}${f.detail ? '  ·  ' + f.detail : ''}`));
  } else {
    console.log('  Không có chỗ vấp.');
  }
};

run().catch((error) => {
  // Máy chủ chưa bật là lỗi hay gặp nhất, và câu mặc định của fetch ("fetch failed") không nói
  // ra điều đó — nói thẳng kèm lệnh cần chạy thì người đọc đỡ phải đoán.
  if (error?.cause?.code === 'ECONNREFUSED' || /fetch failed/i.test(error?.message || '')) {
    console.error(`\nKhông kết nối được ${BASE}. Máy chủ đã chạy chưa?\n`);
    console.error('  dotnet run --project NailManagement.API --launch-profile http\n');
    process.exitCode = 1;
    return;
  }

  console.error('LỖI CHẠY:', error);
  report();
  process.exitCode = 1;
});
