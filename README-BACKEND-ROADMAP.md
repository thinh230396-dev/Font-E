# SalonSys — Lộ trình 20 ngày dựng backend

Tài liệu này biến `README-BUSINESS-RULES.md` thành **lịch làm việc theo ngày**. Nó không đặt ra business rule mới; mọi rule đều dẫn về mã `BR-*` của tài liệu đó.

| | |
|---|---|
| **Ngân sách** | 20 ngày × 8 giờ = **160 giờ** code. Báo cáo và slide viết ngoài 8 giờ này |
| **Backend** | Node + Express + `node:sqlite`, đặt ở `server/` trong cùng repo |
| **Đầu ra bắt buộc** | Chạy trọn mạch demo ở `README-BUSINESS-RULES.md` §1 bằng dữ liệu thật trong database |
| **Đọc trước** | [README-BUSINESS-RULES.md](README-BUSINESS-RULES.md) — nguồn sự thật nghiệp vụ · [README-MIGRATION.md](README-MIGRATION.md) §8, §12 — hiện trạng frontend |

---

## Mục lục

0. [Quyết định chốt ngày 24/08](#0-quyết-định-chốt-ngày-2408) · 1. [Phép tính thời gian](#1-phép-tính-thời-gian--tại-sao-phải-cắt) · 2. [Cách chia ngày](#2-cách-chia-ngày) · 3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục-server) · 4. [Lịch 20 ngày](#4-lịch-20-ngày) · 5. [Chi tiết từng ngày](#5-chi-tiết-từng-ngày) · 6. [Đường cắt khi trễ](#6-đường-cắt-khi-trễ) · 7. [Rủi ro](#7-rủi-ro-đã-biết) · 8. [Giả định tự chốt](#8-giả-định-tôi-tự-chốt)

---

## 0. Quyết định chốt ngày 24/08

Mười hai quyết định này chốt trong phiên lập lộ trình, bổ sung cho 77 quyết định nghiệp vụ ở `README-BUSINESS-RULES.md`.

| # | Quyết định | Hệ quả |
|---|---|---|
| 1 | **8 giờ/ngày**, báo cáo + slide viết ngoài giờ code | 160 giờ cho sản phẩm |
| 2 | Backend ở **`server/` cùng repo**, cổng 4000, Vite proxy `/api` | Một lần `git clone` là chấm được cả hệ thống |
| 3 | **`node:sqlite` có sẵn + SQL thuần**, không Drizzle, không better-sqlite3 | Không cài gói native, không cần Build Tools trên Windows. Đã chạy thử trên Node v24.18 |
| 4 | Contract lỗi **`{ error: { code, message, fields } }`** | Frontend gắn được thông báo vào đúng ô nhập — chốt §22 mục 3 |
| 5 | **Luôn bắt chọn tiệm** sau khi đăng nhập (mọi TenantAdmin) | Chốt §22 mục 2. Bỏ cột `last_active_tenant_id` khỏi kế hoạch |
| 6 | **Vitest chỉ cho phân quyền + cách ly tenant**, không test CRUD | ~1 ngày, phủ đúng BR-ISO-006 |
| 7 | Nối frontend theo **mạch demo vàng** trước | ~13 màn hình thay vì 22 |
| 8 | Màn chưa nối API **giữ `localStorage` + dải nhãn "Dữ liệu mẫu"** | Không có dữ liệu giả trình bày như thật |
| 9 | **Chỉ chạy localhost**, không deploy | Tiết kiệm 1 ngày. `npm run build` vẫn phải chạy được để phòng thân |
| 10 | **Bỏ USD, toàn hệ thống VND số nguyên** | Đúng BR-VAL-003. Bỏ `convertMoney` và tỷ giá cứng 25000 ở `src/utils/money.ts:5` |
| 11 | Phiên là **cookie + bảng `app_sessions`**, không JWT | BR-AUTH-022 bắt kiểm tra trạng thái tài khoản mỗi request; JWT không thu hồi được giữa chừng |
| 12 | **Chốt npm**, xóa `bun.lock` | Nợ kỹ thuật §21.3 |

> Quyết định 11 suy ra từ source, không phải lựa chọn: `scripts/sites-worker.js:191-258` đã làm đúng mô hình cookie + bảng phiên, chuyển sang Express gần như bê nguyên.

---

## 1. Phép tính thời gian — tại sao phải cắt

Ước lượng thô nếu làm **toàn bộ**:

| Khối | Giờ | Ngày |
|---|---:|---:|
| Backend 9 module (~60 endpoint) | 78 | 9,8 |
| Nối lại 22 màn hình / 35.000 dòng | 93 | 11,6 |
| Kiểm thử + tổng duyệt | 16 | 2,0 |
| **Cộng** | **187** | **23,4** |

Vượt 27 giờ. Nên phạm vi bị cắt như sau:

| Khối | Giờ | Ghi chú |
|---|---:|---|
| Backend 9 module | 68 | Bỏ 4 endpoint báo cáo nâng cao |
| Frontend — **chỉ mạch demo vàng**, 13 màn | 56 | Xem bảng dưới |
| Vitest phân quyền + cách ly tenant | 8 | |
| Dọn dẹp (bỏ USD, nhãn dữ liệu mẫu, code chết) | 4 | |
| Tổng duyệt + sửa lỗi + seed lại | 12 | |
| **Đệm** | **12** | 1,5 ngày cho sự cố |
| **Cộng** | **160** | |

**13 màn hình được nối API:**

| # | Màn hình | Dòng | Giờ | Vì sao trong mạch demo |
|---|---|---:|---:|---|
| 1 | `LoginPage` + `App.tsx` phiên | — | 8 | Cửa vào |
| 2 | `TenantPicker` *(mới)* + bộ chuyển tiệm ở `Header` | — | 4 | Quyết định 5 |
| 3 | `TenantManagement` | 2.305 | 6 | Superadmin tạo tenant + tài khoản chủ tiệm |
| 4 | `TenantAdminManagement` | — | 3 | Lập chi nhánh |
| 5 | `TenantAdminServices` | — | 4 | Lập dịch vụ |
| 6 | `TenantAdminStaff` | 2.686 | 6 | Lập nhân viên + cấp tài khoản lễ tân |
| 7 | `TenantAdminCustomers` | — | 3 | Hồ sơ khách |
| 8–11 | `ReceptionistPortal` — lịch hẹn, check-in, thu tiền, hóa đơn | 5.493 | 14 | Trái tim của demo |
| 12 | `TenantAdminReports` | — | 4 | Bước cuối mạch demo |
| 13 | Hạ tầng: `apiClient` + services + hooks + dải nhãn | — | 8 | Dùng chung |

**Màn hình của 9 module nhưng KHÔNG nối** (giữ `localStorage` + dải nhãn): `TenantAdminAppointments` (3.212 dòng — cổng lễ tân đã demo lịch hẹn rồi), `TenantDetailModal` phần nâng cao, `Overview`, `SystemReports`, `SecurityAndLogs`, `TenantAdminOverview`.

---

## 2. Cách chia ngày

**Ba ngày đầu làm ngang, mười ba ngày sau làm dọc.**

Ngày 1–3 buộc phải làm ngang vì schema và tầng xác thực là nền cho mọi thứ. Từ ngày 5 trở đi mỗi lát cắt đi trọn một module: *endpoint → service ở frontend → hook → màn hình*, đúng thứ tự `README-MIGRATION.md` §12.3.

Lý do chọn lát cắt dọc thay vì làm hết backend rồi mới nối frontend: nếu ngày 18 có sự cố, cách làm dọc để lại **một hệ thống chạy được tới bước N**, còn cách làm ngang để lại một backend đầy đủ mà không màn hình nào gọi được.

**Dọn nợ kỹ thuật đặt xen kẽ, không dồn cuối.** Việc gỡ `BranchCode = 'Q1' | 'Q3'` nằm ở ngày làm chi nhánh; đổi khóa `localStorage` từ `tenantName` sang `tenantId` nằm ở ngày làm nhân viên. Dồn xuống ngày 18 là tự chuốc lấy việc sửa lại thứ vừa viết.

---

## 3. Cấu trúc thư mục `server/`

```
server/
  index.js                    Express bootstrap, cổng 4000
  db/
    connection.js             mở node:sqlite, PRAGMA foreign_keys = ON
    migrate.js                chạy migrations/*.sql theo thứ tự, bảng schema_migrations
    migrations/
      001_auth.sql            app_users, app_sessions, user_tenants
      002_platform.sql        tenants, packages, subscription_invoices,
                              package_upgrade_requests
      003_salon.sql           branches, staff, services, customers, appointments,
                              appointment_services, sales_invoices,
                              sales_invoice_lines, invoice_payments, invoice_counters
      004_audit.sql           audit_logs
    query.js                  ★ LỚP TRUY VẤN DÙNG CHUNG — BR-ISO-002, BR-DEL-002
    seed.js
  middleware/
    session.js                cookie → phiên → user + active_tenant_id (BR-AUTH-022)
    authorize.js              4 bước theo đúng thứ tự BR-TENANT-013
    readonly.js               chặn ghi khi tenant hết hạn (BR-TENANT-012)
    audit.js                  8 sự kiện (BR-AUD-002)
    error.js                  contract lỗi { error: { code, message, fields } }
  modules/
    auth/ tenants/ packages/ branches/ services/ staff/
    customers/ appointments/ invoices/ reports/
      <ten>.routes.js         chỉ định tuyến + kiểm tra đầu vào
      <ten>.service.js        nghiệp vụ + SQL
  lib/
    errors.js  validate.js  ids.js  status.js
  data/
    salonsys.db               tệp SQLite — thêm vào .gitignore
```

Frontend thêm hai thư mục, theo khuôn `src/utils/authApi.ts` nhưng **không chép cách nuốt lỗi của nó** (`README-MIGRATION.md` §12.4):

```
src/services/     apiClient.ts + một file mỗi domain, trả Result thay vì null
src/hooks/        useTenants.ts, useServices.ts, ... — loading / error / refetch
```

**Chạy song song hai tiến trình** — mở hai cửa sổ terminal:

```bash
npm run dev:api
```

```bash
npm run dev
```

`vite.config.ts` thêm `server.proxy['/api'] = 'http://localhost:4000'`. Cùng origin nên cookie `SameSite=Strict` hoạt động bình thường, không cần cấu hình CORS.

> ⚠️ **Ngày 1 phải gỡ `viteLocalAuth()` khỏi `vite.config.ts`.** Plugin đó chặn `/api/auth/*` trước khi proxy kịp chạy, nên nếu để lại thì backend thật không bao giờ nhận được request. Giữ file `scripts/vite-local-auth.ts` để tra ba tài khoản demo.

---

## 4. Lịch 20 ngày

| Ngày | Việc | Mốc |
|:--:|---|---|
| 1 | Khung server, migration runner, contract lỗi, port xác thực từ worker, dọn code chết | |
| 2 | Schema ~19 bảng + lớp truy vấn dùng chung + seed | |
| 3 | Phiên, `user_tenants`, 4 tầng kiểm tra quyền, chặn ghi, audit | |
| 4 | `apiClient` + màn chọn tiệm + `App.tsx` phiên | **① Đăng nhập thật** |
| 5 | BE tenant + chi nhánh (11 endpoint) | |
| 6 | FE `TenantManagement`, gỡ `BranchCode` cứng ở 7 file | |
| 7 | BE dịch vụ + nhân viên + cấp tài khoản lễ tân (9 endpoint) | |
| 8 | FE `TenantAdminManagement` + `TenantAdminServices` | |
| 9 | FE `TenantAdminStaff`, đổi khóa `localStorage` sang `tenantId` | |
| 10 | BE khách hàng (5 endpoint) + FE `TenantAdminCustomers` | **② Dựng xong một tiệm** |
| 11 | BE lịch hẹn (6 endpoint) — chống trùng lịch | |
| 12 | Vitest đợt 1 (4h) + BE khung hóa đơn bán hàng (4h) | |
| 13 | BE thu tiền, hoàn tiền, tự `COMPLETED`, số hóa đơn | |
| 14 | FE `ReceptionistPortal` — lịch hẹn, check-in, đổi trạng thái | |
| 15 | FE `ReceptionistPortal` — thu tiền, hóa đơn | |
| 16 | BE báo cáo doanh thu 4 chiều + FE `TenantAdminReports` | **③ Trọn mạch demo** |
| 17 | Lát cắt gói đăng ký — **cắt đầu tiên nếu trễ** | |
| 18 | Vitest đợt 2 + dọn dẹp: bỏ USD, dải nhãn "Dữ liệu mẫu", audit log | |
| 19 | Tổng duyệt: seed lại, chạy trọn kịch bản 3 vai, sửa lỗi | |
| 20 | Đệm + tổng duyệt lần hai + đóng gói hướng dẫn chạy | |

---

## 5. Chi tiết từng ngày

### Ngày 1 — Khung server

| Giờ | Việc |
|---:|---|
| 1 | `server/` + Express + `npm i express`; thêm `dev:api` vào `package.json`; proxy `/api` trong `vite.config.ts`; **gỡ `viteLocalAuth()`** |
| 1 | `db/connection.js`, `db/migrate.js`, bảng `schema_migrations` |
| 1 | `lib/errors.js` + `middleware/error.js` — mã lỗi: `VALIDATION_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `TENANT_READONLY`, `LIMIT_EXCEEDED`, `SLOT_CONFLICT`, `INTERNAL` |
| 3 | Port xác thực từ `scripts/sites-worker.js:191-358`: hash SHA-256 + salt, khóa 15 phút sau 5 lần sai, cookie HttpOnly `SameSite=Strict`, phiên 8 giờ / 30 ngày nếu ghi nhớ |
| 1 | Xóa `TenantAdminPortal.tsx`, `TenantAdminCustomerCare.tsx`, `TenantAdminFinance.tsx`, `settings-naile-studio.csv`; xóa `bun.lock`; thêm `engines: { node: ">=22" }` |
| 1 | `npm run lint` xanh, commit |

**Xong là:** gọi API đăng nhập bằng tài khoản seed và nhận được cookie phiên.

### Ngày 2 — Schema + lớp truy vấn + seed

| Giờ | Việc |
|---:|---|
| 4 | 4 file migration, ~19 bảng, mọi bảng tầng salon có `tenant_id NOT NULL` + index (BR-ISO-001) |
| 2 | `db/query.js` — **hàm này viết đúng một lần và mọi module dùng lại.** Nhận `session`, tự gắn `tenant_id = ?`, `deleted_at IS NULL`, và tùy ngữ cảnh `status != 'INACTIVE'` (BR-ISO-002, BR-DEL-002) |
| 2 | `db/seed.js` — 1 superadmin, 3 gói, **2 tenant dùng chung 1 TenantAdmin** (để demo được quyết định 5), chi nhánh chính mỗi tenant, 8 dịch vụ, 6 nhân viên, 20 khách, và **30 ngày lịch hẹn + hóa đơn đã thanh toán** để báo cáo có số thật |

**Danh sách bảng:**

| Nhóm | Bảng |
|---|---|
| Xác thực | `app_users`, `app_sessions`, `user_tenants` |
| Nền tảng | `tenants`, `packages`, `subscription_invoices`, `package_upgrade_requests` |
| Salon | `branches`, `staff`, `services`, `customers`, `appointments`, `appointment_services`, `sales_invoices`, `sales_invoice_lines`, `invoice_payments`, `invoice_counters` |
| Hệ thống | `audit_logs`, `schema_migrations` |

`app_sessions` thêm 5 cột theo `README-MIGRATION.md` §8.5: `ip`, `user_agent`, `last_active`, `revoked_at`, `active_tenant_id`. Quyền theo gói (BR-SUB-007) lưu **một cột JSON `capabilities`** trên `packages`, chép nội dung từ `src/utils/tenantAdminEntitlements.ts`.

### Ngày 3 — Phiên, phân quyền, chặn ghi

| Giờ | Việc |
|---:|---|
| 2 | `user_tenants`; `GET /api/auth/my-tenants`; `POST /api/auth/session/tenant` — **bắt buộc kiểm tra tenant có trong `user_tenants`** (BR-AUTH-026) |
| 2 | `middleware/authorize.js` — đúng thứ tự 4 bước BR-TENANT-013, không được đảo. Ma trận §3.4 viết thành **một bảng dữ liệu**, không rải `if` khắp routes |
| 1,5 | `middleware/readonly.js` — BR-TENANT-010/011/012. Whitelist đúng 2 nhóm: yêu cầu nâng cấp hoặc gia hạn gói, và nộp chứng từ hóa đơn đăng ký |
| 1,5 | `middleware/audit.js` — 8 sự kiện BR-AUD-002, ghi ở server |
| 1 | `lib/status.js` — `resolveTenantStatus()` tính `TRIAL` / `OVERDUE` lúc đọc (BR-TENANT-002), không có job nền (BR-TENANT-003) |

> Kiểm tra trạng thái tài khoản phải nằm trong `middleware/session.js`, chạy **mỗi request** — BR-AUTH-022. Đặt nhầm chỗ này là lỗ hổng: tài khoản bị khóa vẫn dùng được tới khi hết phiên.

### Ngày 4 — Nối tầng đăng nhập ở frontend → **Mốc ①**

| Giờ | Việc |
|---:|---|
| 2 | `src/services/apiClient.ts` — Result type, phân biệt đủ **6 trường hợp** ở `README-MIGRATION.md` §12.4, nối vào `ToastProvider` có sẵn |
| 2 | `src/utils/authApi.ts` → `src/services/auth.ts`, bỏ hết chỗ `catch` rồi trả `null` |
| 2 | `src/components/TenantPicker.tsx` mới + bộ chuyển tiệm ở `Header.tsx` |
| 2 | `App.tsx` — session → nếu `TENANT_ADMIN` thì bắt chọn tiệm → vào portal. Gỡ `location` / `trusted` / `suspicious` / `mfaVerified` khỏi `AdminSession` |

**Mốc ① — xong là:** đăng nhập bằng 3 vai trò thật, TenantAdmin chọn được tiệm, đổi tiệm nạp lại đúng dữ liệu, tài khoản bị khóa bị đá ra ở request kế tiếp.

### Ngày 5 — BE tenant + chi nhánh

11 endpoint. Điểm cần cẩn thận:

- **BR-TENANT-004/005** — tạo tenant là **một giao dịch**: tenant + chi nhánh chính + (tài khoản chủ tiệm mới **hoặc** gán TenantAdmin đã có) + dòng `user_tenants` + hóa đơn đăng ký. Hỏng một bước phải rollback cả.
- **BR-BRANCH-005 / BR-EMP-008** — hạn mức đếm bằng `COUNT` lúc tạo. Vượt thì trả `LIMIT_EXCEEDED`.
- **BR-BRANCH-002** — chi nhánh chính không xóa, không vô hiệu hóa được.
- **BR-TENANT-020/021** — xóa tenant là `deleted_at`; chỉ gỡ liên kết `user_tenants`; tài khoản chỉ bị chặn đăng nhập khi không còn tenant nào.

### Ngày 6 — FE `TenantManagement`

Bỏ 2 state `tenants` và `tenantAdmins` khỏi `App.tsx`, thay bằng hook. Gỡ `BranchCode = 'Q1' | 'Q3'` ở 7 file — làm hôm nay vì từ ngày mai chi nhánh đã là dữ liệu động.

### Ngày 7 — BE dịch vụ + nhân viên

9 endpoint. Điểm cần cẩn thận:

- **BR-AUTH-013** — cấp tài khoản lễ tân là thao tác **trên hồ sơ nhân viên đã tồn tại**, `staff_id NOT NULL`. Không có đường tạo tài khoản lễ tân rời.
- **BR-EMP-004** — `branch_id` chỉ nằm trên `staff`; tài khoản đọc chi nhánh qua `staff_id`, tuyệt đối không lưu bản sao.
- **BR-SVC-006** — dòng hóa đơn lưu `unit_price` của chính nó, không tham chiếu ngược bảng dịch vụ.

### Ngày 8 — FE chi nhánh + dịch vụ

### Ngày 9 — FE nhân viên

Kèm việc đổi mọi khóa `localStorage` từ `tenantName` sang `tenantId`. Không cần script di trú — `README-MIGRATION.md` §13 đã chốt dữ liệu cũ bỏ được, chỉ cần xóa sạch `localStorage` trên máy dev.

### Ngày 10 — Khách hàng → **Mốc ②**

- **BR-CUS-002** — số điện thoại duy nhất **trong phạm vi một tenant**, không phải toàn hệ thống.
- **BR-CUS-007/009** — hạng khách và `total_spent` **tính lúc đọc** từ hóa đơn đã thanh toán, không lưu cột đếm.

**Mốc ② — xong là:** dựng được trọn một tiệm mới bằng dữ liệu thật: tenant → chi nhánh → dịch vụ → nhân viên → tài khoản lễ tân → khách hàng.

### Ngày 11 — BE lịch hẹn

Ngày khó nhất của backend.

- **BR-APT-010** — `thời_lượng = Σ(duration) + Σ(buffer_time)`, lấy từ `appointment_services`.
- **BR-APT-011** — chặn cứng ở API: `start_mới < end_cũ AND end_mới > start_cũ` cho cùng một kỹ thuật viên. Trả `SLOT_CONFLICT` kèm lịch hẹn đang chặn.
- **BR-APT-012** — loại `CANCELLED` và `NO_SHOW` khỏi phép kiểm tra.
- **BR-APT-013 / BR-APT-005** — ngoài ca và đặt trong quá khứ chỉ **cảnh báo**, vẫn cho lưu. Trả kèm mảng `warnings`, khác hẳn `fields` của lỗi.
- **BR-APT-022** — sơ đồ chuyển trạng thái §16.1 viết thành **một bảng**, mọi chuyển đổi ngoài bảng bị từ chối.

### Ngày 12 — Vitest đợt 1 + khung hóa đơn

Bốn giờ đầu viết ~12 test chạy thẳng vào tầng API với SQLite trong bộ nhớ. Viết hôm nay chứ không để cuối vì đây là lúc đã có đủ hai tenant và ba vai trò để thử, mà vẫn còn 8 ngày để sửa nếu lộ lỗi:

1. Tenant A không đọc được khách hàng / lịch hẹn / hóa đơn của tenant B
2. TenantAdmin không đặt được `active_tenant_id` sang tenant không có trong `user_tenants` (BR-AUTH-026)
3. Superadmin gọi API lịch hẹn / khách hàng / báo cáo doanh thu → 403 (BR-AUTH-030)
4. Lễ tân chỉ thấy lịch hẹn và nhân viên chi nhánh mình, nhưng thấy **toàn bộ** khách hàng của tenant (BR-ISO-004)
5. Tenant `OVERDUE` bị chặn mọi `POST` / `PUT` / `PATCH` / `DELETE` trừ 2 nhóm miễn trừ (BR-TENANT-011)
6. Tài khoản chuyển `SUSPENDED` → request kế tiếp bị từ chối (BR-AUTH-022)

### Ngày 13 — BE thu tiền

- **BR-PAY-003** — trạng thái hóa đơn **suy ra** từ tổng thu, không đặt tay.
- **BR-APT-026** — hóa đơn chuyển `PAID` thì lịch hẹn tự `COMPLETED`. Một giao dịch gồm 3 việc: ghi `invoice_payments`, cập nhật hóa đơn, cập nhật lịch hẹn. Cộng dòng audit `PAYMENT_RECEIVED`.
- **BR-INV-016** — số hóa đơn `HD-{yyyyMMdd}-{nnn}` theo từng tenant, reset mỗi ngày, sinh trong giao dịch qua bảng `invoice_counters`.
- **BR-PAY-006/007** — hoàn tiền là dòng `amount` âm, **chỉ TenantAdmin**.
- **BR-APT-027** — TenantAdmin được chuyển `IN_SERVICE → COMPLETED` khi hóa đơn còn `PARTIAL`, lễ tân thì không.

### Ngày 14–15 — FE `ReceptionistPortal`

5.493 dòng. **Đừng viết lại file này.** Cách làm tốn ít thời gian và ít rủi ro nhất:

1. Giữ nguyên toàn bộ cây render và mọi component con.
2. Thay các chỗ khởi tạo state ở dòng 1136–1139 (`appointments`, `payments`, `technicians`) bằng hook dữ liệu.
3. Thay các hàm ghi (`setAppointments(...)` kèm ghi storage) bằng lệnh gọi service rồi `refetch`.
4. State thuộc về giao diện — bộ lọc, tab, modal đang mở, nháp hóa đơn — **giữ nguyên ở client**, đừng đụng tới.
5. `shift`, `loyaltyPrograms`, `invoiceDrafts` nằm ngoài phạm vi 9 module → giữ `localStorage`.

### Ngày 16 — Báo cáo → **Mốc ③**

- **BR-REV-001** — doanh thu theo **tiền thực thu**: `Σ(invoice_payments.amount) − Σ(tip)`. Dòng `REFUND` âm nên tự trừ.
- **BR-REV-004** — 4 chiều bằng `GROUP BY`: ngày, chi nhánh, nhân viên, dịch vụ.
- **BR-EMP-011** — hoa hồng là phép nhân lúc hiển thị, không có bảng.

**Mốc ③ — xong là:** chạy trọn mạch demo `README-BUSINESS-RULES.md` §1 từ đầu đến cuối bằng dữ liệu thật. **Đây là điểm mà đồ án đã đủ để nộp.** Mọi ngày sau là làm dày thêm.

### Ngày 17 — Gói đăng ký *(cắt đầu tiên nếu trễ)*

Luồng 5 bước BR-SUB-008. Phần backend port được nhiều từ `scripts/sites-worker.js:359-450` đã chạy được. Sửa luôn `persistPackageUpgradeRequest` và `persistPackageUpgradeReview` đang `return true` trong nhánh `catch`, và chỗ `App.tsx:1654` gọi `persistPackageUpgradeReview` hai lần cho cùng một lần duyệt.

### Ngày 18 — Vitest đợt 2 + dọn dẹp

| Giờ | Việc |
|---:|---|
| 4 | ~8 test còn lại: chống trùng lịch, công thức tiền, chuyển trạng thái sai bị từ chối, tổng hoàn không vượt tổng đã thu |
| 2 | Bỏ USD ở 8 file, bỏ `convertMoney` và tỷ giá cứng `src/utils/money.ts:5` |
| 2 | Dải nhãn "Dữ liệu mẫu — chưa nối máy chủ" cho các màn chưa nối; bỏ `recordAuditLog()` phía client (đang giả mạo actor và IP) |

### Ngày 19 — Tổng duyệt

Xóa database, chạy lại migration + seed từ số 0, rồi diễn trọn kịch bản ba vai như lúc bảo vệ. Ghi lại mọi chỗ vấp. Sửa theo thứ tự: lỗi chặn mạch demo → lỗi hiển thị sai sự thật → còn lại.

### Ngày 20 — Đệm

Nếu ngày 19 sạch: tổng duyệt lần hai, viết `server/README.md` (cách chạy, ba tài khoản demo, cách reset database), kiểm tra `npm run build` và `npm run lint` đều xanh.

---

## 6. Đường cắt khi trễ

Kiểm tra ở ba mốc. Trễ thì cắt theo đúng thứ tự này, **không cắt tùy hứng**.

| Mốc kiểm tra | Nếu chưa đạt | Cắt gì | Thu về |
|---|---|---|---:|
| Cuối ngày 6 | Chưa xong tenant + chi nhánh | Bỏ hẳn ngày 17 (gói đăng ký) | 8h |
| Cuối ngày 10 | Chưa dựng được một tiệm trọn vẹn | Bỏ hoàn tiền và tip khỏi backend (`NICE TO HAVE`, BR §2.3); `TenantAdminReports` dùng lại `TenantAdminOverview` | 8h |
| Cuối ngày 15 | Cổng lễ tân chưa thu được tiền | Bỏ Vitest đợt 2; báo cáo chỉ còn 2 chiều ngày + chi nhánh | 6h |

**Bốn thứ tuyệt đối không cắt** — đây là những chỗ hội đồng hay vặn nhất, và cũng là chỗ đã tốn 77 quyết định để chốt:

1. Cách ly tenant (BR-ISO-001…006)
2. Chặn ghi khi tenant hết hạn (BR-TENANT-010…013)
3. Chống trùng lịch kỹ thuật viên (BR-APT-010…012)
4. Công thức tiền và suy ra trạng thái hóa đơn (BR-INV-020, BR-PAY-003)

---

## 7. Rủi ro đã biết

| # | Rủi ro | Cách phòng |
|---|---|---|
| 1 | **`ReceptionistPortal.tsx` 5.493 dòng** — sửa vào giữa file dễ vỡ chỗ khác | Chỉ thay chỗ khởi tạo state và hàm ghi, không đụng cây render. Xem ngày 14–15 |
| 2 | **Cách ly tenant** — chỗ dễ lộ dữ liệu chéo nhất, do một tài khoản quản nhiều tiệm | Ép mọi truy vấn đi qua `db/query.js`. Không endpoint nào được tự viết `WHERE tenant_id` |
| 3 | **Giao dịch lúc thu tiền** — 3 bảng phải cùng thành công | `node:sqlite` đồng bộ nên bọc `BEGIN` / `COMMIT` rất gọn. Viết test riêng cho ca này |
| 4 | **`App.tsx` chuyển quá tay** | Chỉ 5 trong 10 state lên API (`tenants`, `packages`, `invoices`, `tenantAdmins`, `upgradeRequests`). Năm state còn lại — `alerts`, `tickets`, `announcements`, `systemSettings`, `themeMode` — **giữ nguyên `localStorage`** |
| 5 | **Plugin `vite-local-auth` chặn proxy** | Gỡ ngay ngày 1 |
| 6 | **`node:sqlite` in cảnh báo experimental lúc khởi động** | Vô hại. Tắt bằng `--no-warnings` nếu thấy vướng khi demo |
| 7 | **Ngày 11 và 13 là hai ngày đặc nhất** | Nếu ngày 10 đã trễ, cắt theo bảng §6 **trước khi** bước vào ngày 11, đừng cắt giữa chừng |

---

## 8. Giả định tôi tự chốt

Những điểm còn bỏ ngỏ ở `README-BUSINESS-RULES.md` §22 mà tôi chốt theo hướng ít tốn kém nhất để không chặn tiến độ. **Nói nếu bạn muốn khác** — sửa bây giờ rẻ hơn sửa sau ngày 10.

| # | Điểm | Tôi chốt | Vì sao |
|---|---|---|---|
| 1 | Ngưỡng hạng khách (§22 mục 1) | Giữ 5tr / 20tr | Chỉ là nhãn hiển thị, đổi lúc nào cũng được |
| 2 | Số hóa đơn (§22 mục 4) | Reset mỗi ngày, theo từng tenant | Đúng như BR-INV-016 đang giả định |
| 3 | Lịch hẹn `PENDING` quá hạn (§22 mục 5) | Chỉ hiện nhãn "quá hạn" tính lúc đọc, không tự đổi trạng thái | Nhất quán với BR-TENANT-003 — không có job nền |
| 4 | Node tối thiểu (§22 mục 7) | `>=22` trong `engines` | `node:sqlite` có từ 22.5 |
| 5 | Chế độ demo | Giữ công tắc `demoMode` sẵn có, nhưng mặc định **tắt** sau khi có backend | Còn dùng để trình bày dữ liệu mẫu khi cần |
| 6 | Thư viện lấy dữ liệu ở frontend | Tự viết hook, **không** thêm React Query | 13 màn hình không đủ nhiều để bù chi phí học và thêm một dependency |
