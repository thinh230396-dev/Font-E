# SalonSys — Lộ trình 20 ngày dựng backend

Tài liệu này biến `README-BUSINESS-RULES.md` thành **lịch làm việc theo ngày**. Nó không đặt ra business rule mới; mọi rule đều dẫn về mã `BR-*` của tài liệu đó.

| | |
|---|---|
| **Ngân sách** | 20 ngày × 8 giờ = **160 giờ** code. Báo cáo và slide viết ngoài 8 giờ này |
| **Backend** | **ASP.NET Core 10 + EF Core + SQL Server LocalDB**, solution riêng tại `C:\Users\letru\source\repos\NailManagement` |
| **Đầu ra bắt buộc** | Chạy trọn mạch demo ở `README-BUSINESS-RULES.md` §1 bằng dữ liệu thật trong database |
| **Đọc trước** | [README-BUSINESS-RULES.md](README-BUSINESS-RULES.md) — nguồn sự thật nghiệp vụ · [README-MIGRATION.md](README-MIGRATION.md) §8, §12 — hiện trạng frontend |

---

## Mục lục

0. [Quyết định chốt ngày 24/08](#0-quyết-định-chốt-ngày-2408) · 1. [Phép tính thời gian](#1-phép-tính-thời-gian--tại-sao-phải-cắt) · 2. [Cách chia ngày](#2-cách-chia-ngày) · 3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục-server) · 4. [Lịch 20 ngày](#4-lịch-20-ngày) · 5. [Chi tiết từng ngày](#5-chi-tiết-từng-ngày) · 6. [Đường cắt khi trễ](#6-đường-cắt-khi-trễ) · 7. [Rủi ro](#7-rủi-ro-đã-biết) · 8. [Giả định tự chốt](#8-giả-định-tôi-tự-chốt) · 9. [Bảng chức năng: làm gì, bỏ gì](#9-bảng-chức-năng-làm-gì-bỏ-gì)

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
| 7 | Nối frontend theo **mạch demo vàng** trước | ~14 màn hình thay vì 22 |
| 8 | Màn chưa nối API **giữ `localStorage` + dải nhãn "Dữ liệu mẫu"** | Không có dữ liệu giả trình bày như thật |
| 9 | **Chỉ chạy localhost**, không deploy | Tiết kiệm 1 ngày. `npm run build` vẫn phải chạy được để phòng thân |
| 10 | **Bỏ USD, toàn hệ thống VND số nguyên** | Đúng BR-VAL-003. Bỏ `convertMoney` và tỷ giá cứng 25000 ở `src/utils/money.ts:5` |
| 11 | Phiên là **cookie + bảng `app_sessions`**, không JWT | BR-AUTH-022 bắt kiểm tra trạng thái tài khoản mỗi request; JWT không thu hồi được giữa chừng |
| 12 | **Chốt npm**, xóa `bun.lock` | Nợ kỹ thuật §21.3 |
| 13 | **Clean Architecture 4 tầng đầy đủ**: use case là class có `ExecuteAsync()`, có DTO vào/ra, có mapper và presenter riêng | Tốn thêm 3–4 ngày → **bỏ lát cắt gói đăng ký (ngày 17)** và **rút báo cáo doanh thu còn 2 chiều** (ngày, chi nhánh) |

> ⚠️ **Các quyết định 2, 3, 11, 12 ở trên đã bị thay ngày 24/08.** "vs insider" trong yêu cầu ban đầu là **Visual Studio Insiders**, không phải VS Code Insiders — tôi hiểu nhầm và đã dựng nhầm một backend Node trước khi phát hiện. Bảng dưới là quyết định thật.

| # | Quyết định (bản thay thế) | Hệ quả |
|---|---|---|
| 2′ | Backend là **solution ASP.NET Core riêng** ở `C:\Users\letru\source\repos\NailManagement`, ngoài repo frontend. Bốn project `Domain` · `Application` · `Infrastructure` · `API`, target `net10.0` | Frontend nối sang qua proxy Vite tới `http://localhost:5282` |
| 3′ | **EF Core + Migrations**, không SQL thuần | `dotnet ef migrations add` thay cho bộ chạy migration viết tay |
| 11′ | **SQL Server LocalDB**, không SQLite | ⚠️ Làm **BR-BAK-003 sai** — quy tắc đó ghi "sao lưu bằng copy tệp SQLite", nay không còn tệp để copy. Cần sửa `README-BUSINESS-RULES.md` §14. Đánh đổi đã biết: máy người chấm phải có LocalDB |
| 12′ | **Cookie auth + bảng phiên tự quản**, không dùng ASP.NET Core Identity | Giữ nguyên được BR-AUTH-013/020/022/024 mà không phải uốn theo lược đồ của Identity |
| 14′ | Băm mật khẩu bằng **PBKDF2-HMAC-SHA256, 210.000 vòng** (`Rfc2898DeriveBytes`) | Có sẵn trong .NET, không thêm gói. Thay cho SHA-256 một vòng của backend cũ — SHA-256 quá nhanh nên thuận lợi cho việc dò mật khẩu |

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
| Frontend — **chỉ mạch demo vàng**, 14 màn | 58 | Xem bảng dưới |
| Vitest phân quyền + cách ly tenant | 8 | |
| Dọn dẹp (bỏ USD, nhãn dữ liệu mẫu, code chết) | 4 | |
| Tổng duyệt + sửa lỗi + seed lại | 12 | |
| **Đệm** | **10** | 1,25 ngày cho sự cố |
| **Cộng** | **160** | |

**14 màn hình được nối API:**

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
| 13 | `SecurityAndLogs` — phần danh sách nhật ký | 826 | 2 | Server đã ghi log, không có màn đọc thì log thành vô hình |
| 14 | Hạ tầng: `apiClient` + services + hooks + dải nhãn | — | 8 | Dùng chung |

**Màn hình của 9 module nhưng KHÔNG nối** (giữ `localStorage` + dải nhãn): `TenantAdminAppointments` (3.212 dòng — cổng lễ tân đã demo lịch hẹn rồi), `TenantDetailModal` phần nâng cao, `Overview`, `SystemReports`, `TenantAdminOverview`, và phần thu hồi phiên + chính sách lưu trữ của `SecurityAndLogs`.

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
```

> ⚠️ **Sơ đồ trên đã lỗi thời từ ngày 1.** Sau khi chốt Clean Architecture 4 tầng đầy đủ (§0 mục 13) và TypeScript (§0 mục 14), cấu trúc thật là sơ đồ bên dưới. Giữ lại sơ đồ cũ để thấy vì sao đổi.

### 3.1 Cấu trúc thật — bốn project ASP.NET Core

> Sơ đồ ở §3.2 bên dưới là bản Node đã bị bỏ. Giữ lại vì các nguyên tắc tầng vẫn đúng nguyên vẹn.

```
NailManagement.slnx
  NailManagement.Domain/          ◄── Enterprise Business Rules — không tham chiếu project nào
    Entities/                       AppUser, AppSession
    ValueObjects/                   Email, RawPassword
    Enums/                          UserRole, AccountStatus
    Policies/                       AuthPolicy (5 lần sai, khóa 15 phút, phiên 8h/30 ngày)
    Repositories/                   ★ PORT: IUserRepository, ISessionRepository
    Common/                         ErrorCode, AppException, DomainException

  NailManagement.Application/     ◄── tham chiếu Domain
    UseCases/Auth/                  LoginUseCase, GetCurrentAccountUseCase, LogoutUseCase
    DTOs/                           AccountDto, LoginCommand, LoginResult…
    Mappings/                       AccountMapper — chặn PasswordHash lọt ra ngoài
    Abstractions/                   IPasswordHasher, IClock, IIdGenerator
    Common/Exceptions/              InvalidCredentials, AccountLocked, Unauthenticated…
    DependencyInjection.cs          AddApplication()

  NailManagement.Infrastructure/  ◄── tham chiếu Application + Domain
    Persistence/                    NailDbContext, Configurations/, Repositories/,
                                    Migrations/, Seed/
    Security/                       Pbkdf2PasswordHasher
    SystemServices/                 SystemClock, GuidIdGenerator
    DependencyInjection.cs          AddInfrastructure() — nơi cắm cổng vào bản cài đặt

  NailManagement.API/             ◄── Frameworks & Drivers, tham chiếu Application + Infrastructure
    Controllers/AuthController.cs   mỏng: đọc HTTP, gọi use case, đặt cookie
    Common/ApiExceptionHandler.cs   ★ nơi DUY NHẤT ánh xạ mã lỗi sang HTTP status
    Common/ErrorResponse.cs
    Program.cs                      composition root + áp migration + seed
```

**Ba chỗ then chốt, để tra nhanh khi viết báo cáo:**

| Nguyên tắc | Chứng minh bằng đâu |
|---|---|
| Đảo ngược phụ thuộc | `Domain/Repositories/IUserRepository.cs` đặt ra interface; `Infrastructure/Persistence/Repositories/UserRepository.cs` cài đặt; `Infrastructure/DependencyInjection.cs` ráp lại |
| Domain sạch khỏi công nghệ | `NailManagement.Domain.csproj` **không có `PackageReference` nào** và không tham chiếu project nào. EF Core chỉ xuất hiện ở Infrastructure |
| Domain không biết HTTP | `AppException` không có thuộc tính status; toàn bộ ánh xạ nằm ở `API/Common/ApiExceptionHandler.cs` |

### 3.2 Bản Node đã bỏ — giữ để đối chiếu nguyên tắc tầng

Bốn thư mục dưới `server/src/` ứng đúng bốn vòng tròn. **Chiều phụ thuộc chỉ đi vào trong**: `infrastructure → adapters → application → domain`. Không mũi tên nào đi ngược.

```
server/
  tsconfig.json
  src/
    domain/                 ◄── Enterprise Business Rules — không import gì từ ngoài
      entities/               User, Session — quy tắc luôn đúng về một thực thể
      value-objects/          Email, RawPassword — dữ liệu tự kiểm tra chính mình
      policies/               AuthPolicy — hằng số nghiệp vụ (5 lần sai, khóa 15 phút)
      repositories/           ★ PORT: interface do domain đặt ra, tầng ngoài phải theo
      errors/                 DomainError

    application/            ◄── Application Business Rules
      use-cases/              class có execute() — mỗi tình huống sử dụng một tệp
      dto/                    hình dạng dữ liệu vào và ra, tách khỏi entity
      mappers/                entity → DTO, chặn password_hash lọt ra ngoài
      ports/                  PasswordHasher, Clock, IdGenerator, DatabaseClient
      errors/                 ApplicationError và các lỗi con

    adapters/               ◄── Interface Adapters — không biết Express, không biết SQLite
      controllers/            đọc HttpRequest → gọi use case → trả HttpResponse
      presenters/             ★ nơi DUY NHẤT ánh xạ mã lỗi sang HTTP status
      persistence/            bản cài đặt repository, viết SQL qua cổng DatabaseClient
      http/                   HttpRequest / HttpResponse độc lập framework

    infrastructure/         ◄── Frameworks & Drivers — vòng ngoài cùng
      database/               NodeSqliteClient (nơi DUY NHẤT import node:sqlite),
                              Migrator, migrations/*.sql
      http/                   Express, route, middleware, expressAdapter
      security/               ScryptPasswordHasher
      system/                 SystemClock, CryptoIdGenerator
      config/                 env.ts
      di/                     Container.ts — composition root
      seed/                   tài khoản demo
    main.ts                   khởi động: migration → container → seed → mở cổng

    shared/                   AppError, ErrorCode — dùng chung mọi tầng
  data/
    salonsys.db               tệp SQLite — đã thêm vào .gitignore
```

**Migration thêm dần theo ngày:** `0001_auth.sql` (xong ngày 1) · `0002_platform.sql` + `0003_salon.sql` (ngày 2) · `0004_user_tenants.sql` (ngày 3) · `0005_audit.sql`.

Lớp truy vấn dùng chung ở BR-ISO-002 trong kiến trúc này **không phải một tệp `query.js`** mà là lớp cơ sở của các repository trong `adapters/persistence/` — bộ lọc tenant đặt ở đó, không endpoint nào tự viết `WHERE tenant_id`.

**Ba chỗ then chốt, để tra nhanh khi viết báo cáo:**

| Nguyên tắc | Chứng minh bằng tệp nào |
|---|---|
| Đảo ngược phụ thuộc | `domain/repositories/UserRepository.ts` đặt ra interface; `adapters/persistence/SqlUserRepository.ts` cài đặt nó; `infrastructure/di/Container.ts` ráp hai thứ lại |
| Domain không biết framework | Tìm `node:sqlite` trong cả backend chỉ ra đúng một tệp: `infrastructure/database/NodeSqliteClient.ts` |
| Domain không biết HTTP | `AppError` không có `httpStatus`; toàn bộ ánh xạ nằm ở `adapters/presenters/HttpErrorPresenter.ts` |

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
| 17 | ~~Lát cắt gói đăng ký~~ — **đã cắt** để bù chi phí Clean Architecture 4 tầng (§0 mục 13). Ngày này chuyển thành đệm cho các lát cắt trước | |
| 18 | Vitest đợt 2 + dọn dẹp: bỏ USD, dải nhãn "Dữ liệu mẫu", audit log | |
| 19 | Tổng duyệt: seed lại, chạy trọn kịch bản 3 vai, sửa lỗi | |
| 20 | Đệm + tổng duyệt lần hai + đóng gói hướng dẫn chạy | |

---

## 5. Chi tiết từng ngày

### Ngày 1 — Khung server

| Giờ | Việc |
|---:|---|
| 1 | `server/` + Express + `npm i express`; thêm `dev:api` vào `package.json`; proxy `/api` trong `vite.config.ts`; **gỡ `viteLocalAuth()`** — kéo theo hồi quy: `/api/package-upgrade-requests` mất chỗ phục vụ, xem §10 |
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
| 2 | Nối `SecurityAndLogs` vào `GET /api/audit-logs`, **rồi mới** bỏ `recordAuditLog()` ở 19 chỗ trong `App.tsx` và 1 chỗ trong `DataBackup.tsx`. Đúng thứ tự này — gỡ trước khi nối là để lại một màn trống, dù server vẫn đang ghi log |
| 2 | Dải nhãn "Dữ liệu mẫu — chưa nối máy chủ" cho các màn chưa nối |

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
| 6 | Thư viện lấy dữ liệu ở frontend | Tự viết hook, **không** thêm React Query | 14 màn hình không đủ nhiều để bù chi phí học và thêm một dependency |

---

## 9. Bảng chức năng: làm gì, bỏ gì

Bảng tra cứu để trả lời nhanh câu "cái này có làm không". Bốn mức, từ đầy đủ nhất xuống không có gì.

### 9.1 Mức A — API thật + database + màn hình đã nối

Đây là phần chạy bằng dữ liệu thật, có thể vặn hỏi thoải mái khi bảo vệ.

| Module | Chức năng cụ thể | Endpoint | Rule |
|---|---|---:|---|
| **Xác thực** | Đăng nhập, phiên cookie, đăng xuất, khóa 15 phút sau 5 lần sai, chọn tiệm đang làm việc, một tài khoản quản nhiều tiệm, Superadmin cấp tài khoản chủ tiệm, chủ tiệm cấp tài khoản lễ tân, khóa và vô hiệu tài khoản | 8 | BR-AUTH-001…031 |
| **Tenant** | Tạo tenant kèm chi nhánh chính và tài khoản chủ tiệm trong một giao dịch, sửa, khóa, gia hạn hạn dùng, xóa mềm, tính `TRIAL`/`OVERDUE` lúc đọc, chặn ghi khi hết hạn | 7 | BR-TENANT-001…022 |
| **Chi nhánh** | Thêm, sửa, vô hiệu hóa, chặn xóa chi nhánh chính, cưỡng chế `max_salons` | 4 | BR-BRANCH-001…008 |
| **Dịch vụ** | Thêm, sửa, ngừng bán, giá chốt tại thời điểm lập hóa đơn | 4 | BR-SVC-001…009 |
| **Nhân viên** | Hồ sơ kỹ thuật viên và lễ tân, gán chi nhánh, ca cố định, nghỉ việc, cấp tài khoản đăng nhập cho lễ tân, cưỡng chế `max_staff` | 5 | BR-EMP-001…011 |
| **Khách hàng** | Thêm, sửa, vô hiệu, tra cứu theo số điện thoại duy nhất trong tenant, hạng khách suy từ tổng chi tiêu | 5 | BR-CUS-001…009 |
| **Lịch hẹn** | Tạo nhiều dịch vụ một lịch, **chống trùng giờ kỹ thuật viên**, dời lịch, 7 trạng thái với sơ đồ chuyển cố định, cảnh báo ngoài ca và đặt trong quá khứ, tiền cọc | 6 | BR-APT-001…041 |
| **Hóa đơn bán hàng** | Tạo từ lịch hẹn hoặc bán lẻ, dòng nhập tay, giảm giá kèm lý do, tip, **thu nhiều lần nhiều phương thức**, hoàn tiền, số hóa đơn theo tenant reset mỗi ngày, tự hoàn tất lịch hẹn khi đủ tiền | 7 | BR-INV-001…033 · BR-PAY-001…008 |
| **Báo cáo doanh thu** | Theo tiền thực thu, 4 chiều: ngày, chi nhánh, nhân viên, dịch vụ; hoa hồng tính lúc hiển thị | 4 | BR-REV-001…008 |
| **Nhật ký kiểm toán** | Ghi 8 loại sự kiện **ở server**, không sửa không xóa, Superadmin xem tất cả, chủ tiệm xem tenant mình | 1 | BR-AUD-001…005 |
| **Gói đăng ký** *(ngày 17)* | Bảng gói, quyền tính năng theo gói, yêu cầu nâng cấp 5 bước, hóa đơn đăng ký, nộp chứng từ và xác nhận | 10 | BR-SUB-001…011 |

Cộng khoảng **61 endpoint**. Riêng dòng cuối là thứ bị cắt đầu tiên nếu trễ.

### 9.2 Mức B — có API, nhưng màn hình giữ `localStorage`

Backend đã có dữ liệu, chỉ là màn hình chưa kịp nối. Mỗi màn mang một dải nhãn "Dữ liệu mẫu — chưa nối máy chủ".

| Màn hình | Dòng | Vì sao hoãn |
|---|---:|---|
| `TenantAdminAppointments` | 3.212 | Cổng lễ tân đã demo trọn nghiệp vụ lịch hẹn; màn này là bản xem của chủ tiệm |
| `TenantDetailModal` phần nâng cao | 2.494 | Phần tạo và sửa tenant đã nối ở `TenantManagement`; các tab thống kê sâu thì chưa |
| `Overview`, `SystemReports` | — | Bảng điều khiển tổng hợp của Superadmin, không nằm trong mạch demo |
| `TenantAdminOverview` | — | Tương tự, phía chủ tiệm |
| `SecurityAndLogs` phần thu hồi phiên và chính sách lưu trữ | 826 | Phần danh sách nhật ký **có nối**; hai phần này cần nghiệp vụ chưa định nghĩa |

### 9.3 Mức C — không có API, giữ `localStorage` vĩnh viễn ở MVP

Mười ba nhóm dưới đây **đã dựng xong giao diện và vẫn chạy được khi demo**, nhưng cố ý nằm ngoài phạm vi backend theo `README-BUSINESS-RULES.md` §2.2. Đây là quyết định thiết kế, không phải thiếu sót — khi báo cáo nên nói đúng như vậy.

Đặt lịch online · Kho vật tư · Sổ Thu & Chi · Vệ sinh & an toàn · Thư viện màu và mẫu nail · Loyalty và điểm thưởng · Ghế và khu vực · Bản tin & thông báo · Trung tâm hỗ trợ · Cấu hình hệ thống · Sao lưu & khôi phục · Báo cáo nâng cao · **Vai trò Khách hàng**

Ba điểm dễ bị hỏi:

- **Sao lưu** — `DataBackup.tsx` là mô phỏng hoàn toàn, không có bảng và không có endpoint (BR-BAK-001/002). Ở MVP, sao lưu là copy tệp `salonsys.db`.
- **Thông báo** — không có bảng `notifications`, không gửi email, SMS, Zalo hay push. Màn cấu hình SMTP là giao diện không có hành vi (BR-NOTI-001…003).
- **Vai trò Khách hàng** — bỏ hoàn toàn. Hệ thống chỉ có 3 vai trò đăng nhập, và lịch hẹn `source = ONLINE` là do lễ tân chọn tay chứ không có ai tự đặt (BR-AUTH-003, BR-APT-007).

### 9.4 Mức D — bỏ hẳn, không có ở cả frontend lẫn backend

| Nhóm | Bỏ những gì |
|---|---|
| Tài khoản | Đổi mật khẩu · Quên mật khẩu · Kích hoạt qua email · Xác minh email và số điện thoại · MFA · Thu hồi phiên từ xa |
| Khách hàng | Toàn bộ app khách: đăng nhập, chọn tiệm, tự đặt lịch, xem lịch sử |
| Lịch hẹn | Giờ mở cửa chi nhánh · Ngày nghỉ lễ · Nhắc lịch tự động · Nhiều kỹ thuật viên cho một lịch · Ràng buộc kỹ năng |
| Tiền | Cổng thanh toán thật · VAT · Hóa đơn điện tử Việt Nam · Luật hoàn cọc và mất cọc · Mã voucher · Module chi phí và lợi nhuận |
| Nhân sự | Lịch làm việc theo tuần · Nghỉ phép · Chấm công · Bảng lương và hoa hồng có chốt kỳ |
| Hệ thống | Hệ thống thông báo · Email/SMS/Zalo · Sao lưu thật · Upload tệp · Định tuyến theo URL · **Mọi job chạy nền** |

> **Không có job chạy nền nào trong toàn hệ thống** (BR-TENANT-003). Mọi trạng thái phụ thuộc thời gian — tenant hết hạn, lịch hẹn quá giờ — đều tính lúc đọc dữ liệu. Đây là điểm nên chủ động nêu khi bảo vệ, vì nó giải thích luôn vì sao không cần hạ tầng chạy nền.

### 9.5 Có làm, nhưng ở dạng đơn giản hóa

Mười sáu chỗ ở `README-BUSINESS-RULES.md` §20 là **có chức năng nhưng rút gọn**, khác hẳn với "bỏ". Ba chỗ hay bị hiểu nhầm nhất:

| Nghe như bỏ | Thực ra là |
|---|---|
| "Không có loyalty" | Vẫn có **hạng khách** `NEW`/`STANDARD`/`LOYAL`/`VIP`, suy ra từ tổng chi tiêu. Chỉ là không có điểm thưởng và hạng không ảnh hưởng giá |
| "Không có hoa hồng" | Vẫn có `commission_rate` trên nhân viên và **vẫn hiện số tiền hoa hồng** trong báo cáo. Chỉ là không có bảng riêng, không chốt kỳ, không duyệt chi |
| "Không có combo" | Vẫn bán được combo — nó là một bản ghi dịch vụ có giá riêng. Chỉ là không có cấu trúc dịch vụ con và không tự tính giá gộp |

### 9.6 Nếu trễ thì mất thêm gì

Theo đúng thứ tự ở §6: **gói đăng ký** (cả module) → **hoàn tiền và tip** → **Vitest đợt 2** và **hai chiều báo cáo** nhân viên + dịch vụ. Bốn thứ không bao giờ cắt: cách ly tenant, chặn ghi khi hết hạn, chống trùng lịch, công thức tiền.

---

## 10. Nhật ký thực hiện

### Ngày 1 — xong (làm hai lần)

Lần đầu tôi dựng bằng Node + Express vì hiểu nhầm "vs insider" là VS Code Insiders. Sau khi
biết là Visual Studio và backend là ASP.NET Core, toàn bộ đã được dựng lại bằng C#. Thư mục
`server/` trong repo frontend **đã bị xóa**. Bảng dưới là kết quả bản .NET.

| Hạng mục | Kết quả |
|---|---|
| 4 project Clean Architecture, 40 tệp C# (Domain 12 · Application 11 · Infrastructure 13 · API 4; trong đó 3 tệp do EF sinh) | Xong, `dotnet build` 0 lỗi |
| Ranh giới tầng kiểm chứng bằng grep: `Domain.csproj` không có tham chiếu nào · `EntityFrameworkCore` vắng mặt ở Domain và Application · `Microsoft.AspNetCore` chỉ có ở project API | Xong |
| `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`, `GET /api/health` | Xong, **11/11 phép thử đạt** |
| Migration `InitialAuth` — bảng `AppUsers`, `AppSessions` + 5 index | Xong, tự áp lúc khởi động |
| Seed 3 tài khoản demo | Xong, chỉ nạp khi bảng trống — khởi động lần 2 không nạp lại |
| Proxy Vite `/api` → `http://localhost:5282` | Xong, đăng nhập qua giao diện thật vào được cổng Tenant Admin |
| Cookie `HttpOnly; SameSite=Strict; Max-Age=28800` | Xong, `document.cookie` không đọc được |

Chạy backend:

```
dotnet run --project NailManagement.API --launch-profile http
```

<details>
<summary>Kết quả bản Node đã bỏ (giữ để tra lại quyết định)</summary>

### Ngày 1 — bản Node, đã xóa

| Hạng mục | Kết quả |
|---|---|
| Khung `server/` 4 tầng, 42 tệp TypeScript (domain 9 · application 12 · adapters 6 · infrastructure 12 · shared 2 · `main.ts`) | Xong |
| Ranh giới tầng kiểm chứng bằng grep: `node:sqlite` chỉ ở 1 tệp, `express` chỉ ở `infrastructure/http/`, domain không import ra ngoài | Xong |
| `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout` | Xong, 11/11 phép thử đạt |
| Migration runner + `0001_auth.sql` (`app_users`, `app_sessions`) | Xong, chạy lại không nhân đôi |
| Seed 3 tài khoản demo | Xong, chỉ nạp khi bảng trống |
| Proxy Vite `/api` → cổng 4000 | Xong, đăng nhập qua giao diện thật chạy được |
| Xóa code chết, bỏ `bun.lock`, khai `engines` | Xong |
| `npm run lint:api` | Sạch |

**Ba điều chệch khỏi kế hoạch ban đầu, có chủ đích:**

1. **Băm mật khẩu đổi từ SHA-256 sang scrypt.** Backend cũ dùng SHA-256 vì Cloudflare Workers chỉ có WebCrypto. Trên Node thì scrypt nằm sẵn trong `node:crypto`, không phải cài gì, và cố ý chậm nên chống dò mật khẩu hàng loạt. Chưa có dữ liệu thật nên đổi bây giờ rẻ hơn đổi sau.
2. **`PUT /api/auth/accounts` và `DELETE /api/auth/accounts/:id` dời sang ngày 3**, nơi quy tắc tạo tài khoản (BR-AUTH-010…014) được cài đặt.
3. **Đăng xuất là thu hồi phiên (`revoked_at`), không xóa bản ghi** — nhất quán với BR-DEL-001.

</details>

### Việc còn treo sau ngày 1

| # | Việc | Mức |
|---|---|---|
| 1 | **Hồi quy:** gỡ `viteLocalAuth()` làm `/api/package-upgrade-requests` mất chỗ phục vụ → 404 ở mỗi lần tải trang. Frontend nuốt lỗi và lùi về `localStorage` nên không vỡ, nhưng console đầy 404. Ngày 17 đã bị cắt nên endpoint này sẽ không quay lại | **Cần quyết** |
| 2 | `npm run lint:web` đang có **86 lỗi kiểu ở 5 tệp**, có từ trước ngày 1. Nặng nhất: `TenantAdminAnnouncements.tsx` bị lặp nguyên khối nội dung từ dòng 578; ba màn lễ tân dùng `PageHeader` và `Pagination` mà **quên import** — sẽ ném lỗi lúc chạy | **Cao** — ba màn lễ tân nằm đúng đường ngày 14–15 |
| 3 | `Header.tsx:428` gắn cứng `alt="letruongthinhcr145@gmail.com"` thay vì email tài khoản đang đăng nhập | Thấp — sửa ở ngày 4 |

### Ngày 2 — xong

Ba quyết định chốt đầu ngày, đều theo phương án khuyến nghị:

| # | Quyết định | Hệ quả |
|---|---|---|
| 15 | Cách ly tenant cài bằng **bộ lọc toàn cục của EF Core**, không phải lớp repository cơ sở | Điều kiện lọc khai báo một lần trên `NailDbContext`; endpoint không viết được và cũng không quên được |
| 16 | Entity viết **đầy đủ ràng buộc BR-VAL-001 ngay** | Ngày 5–13 chỉ còn ráp use case |
| 17 | Seed **6 tiệm** thay vì 2, đủ bốn trạng thái hiển thị | Chứng minh được BR-TENANT-002 tính lúc đọc mà không cần job nền |

| Hạng mục | Kết quả |
|---|---|
| **16 bảng mới** trong migration `SalonSchema` — tổng 18 bảng nghiệp vụ + `__EFMigrationsHistory` | Xong, `dotnet ef database update` chạy sạch |
| 16 entity giàu hành vi + 17 enum + value object `PhoneNumber` + 5 policy thuần (`ValidationPolicy`, `CustomerTierPolicy`, `AppointmentSchedulePolicy`, `AppointmentLifecyclePolicy`, `InvoiceMoneyPolicy`) | Xong, `dotnet build` 0 lỗi 0 cảnh báo |
| **Lớp truy vấn dùng chung** (BR-ISO-002): `NailDbContext` duyệt mọi entity mang `ITenantOwned` và gắn bộ lọc theo `ITenantContext.ActiveTenantId` | Xong |
| Bộ lọc **đóng khi không rõ phạm vi** — chưa đặt tiệm thì đọc được 0 dòng, thay vì đọc được tất cả | Đã kiểm chứng: `customers=0, appointments=0, invoices=0, staff=0` |
| Khóa ngoại còn treo từ ngày 1: `AppUsers.StaffId → Staff` (BR-AUTH-013), `AppSessions.ActiveTenantId → Tenants` (BR-AUTH-024) | Xong |
| Seed: 3 gói · 6 tiệm · 7 tài khoản · 3 chi nhánh · 8 nhân viên · 11 dịch vụ · 23 khách · **176 lịch hẹn · 151 hóa đơn · 207 dòng thu tiền** · 5 hóa đơn đăng ký · 1 yêu cầu nâng gói · 6 dòng nhật ký | Xong, hạt giống ngẫu nhiên cố định nên hai máy ra cùng số liệu |

**Kiểm chứng bằng truy vấn thẳng vào database** — sáu phép đếm, tất cả bằng 0:

| Phép kiểm tra | Kết quả |
|---|:--:|
| BR-APT-011 — hai lịch hẹn chồng giờ của cùng kỹ thuật viên | 0 |
| BR-APT-010 — giờ kết thúc lệch tổng thời lượng cộng thời gian dọn dẹp | 0 |
| BR-INV-020 — tổng tiền lệch so với các dòng hóa đơn | 0 |
| BR-PAY-003 — trạng thái hóa đơn lệch so với tổng đã thu | 0 |
| BR-INV-016 — số hóa đơn sai định dạng `HD-yyyyMMdd-nnn` | 0 |
| BR-ISO-001 — bảng nghiệp vụ thiếu `TenantId` | 0 |

Cách ly tenant kiểm chứng riêng bằng một chương trình dùng thẳng `NailDbContext`:

| Phạm vi phiên | Khách | Lịch hẹn | Hóa đơn | Nhân viên |
|---|--:|--:|--:|--:|
| Chưa đặt tiệm | 0 | 0 | 0 | 0 |
| `TEN-LUMIERE` | 20 | 169 | 145 | 6 |
| `TEN-MUSE` | 3 | 7 | 6 | 2 |
| Tiệm không tồn tại | 0 | 0 | 0 | 0 |

Tài khoản `tenantadmin@lumierehair.vn` nối với **hai tiệm** trong `UserTenants` (BR-AUTH-023), và số điện thoại `0911000001` tồn tại ở **cả hai tiệm, mỗi tiệm một bản ghi** (BR-CUS-002).

**Bốn điều chệch khỏi kế hoạch, có chủ đích:**

1. **Không có tệp `db/query.js` và `db/seed.js`** như bảng ngày 2 mô tả — đó là tên của bản Node đã bỏ. Vai trò của chúng nay do `NailDbContext` (lọc theo tiệm) và `DemoDataSeeder` đảm nhiệm.
2. **Bảng `schema_migrations` không tồn tại**; EF Core tự quản bằng `__EFMigrationsHistory`.
3. **Bộ lọc dùng chung chỉ lọc theo tiệm**, không lọc `status != 'INACTIVE'`. BR-DEL-003 bắt bản ghi đã ngừng hoạt động vẫn hiện đúng tên trong lịch hẹn và hóa đơn cũ, nên điều kiện đó phụ thuộc ngữ cảnh và thuộc về từng use case.
4. **Ba cảnh báo EF Core 10622 bị tắt có chủ đích** trong `DependencyInjection.cs`: `SubscriptionInvoices`, `PackageUpgradeRequests`, `UserTenants` trỏ tới tiệm có thể đã xóa mềm. BR-TENANT-022 muốn đúng như vậy, và đó cũng là lý do các bảng này chép sẵn tên tiệm thành cột riêng.

### Việc còn treo sau ngày 2

| # | Việc | Mức |
|---|---|---|
| 1 | `Packages.Name` đang có ràng buộc **duy nhất** dù BR-SUB không yêu cầu. Lý do: `getStandardTenantPlanRank` ở frontend tra bậc gói theo tên, hai gói trùng tên sẽ làm quyền tính năng nhảy lung tung. Gỡ ràng buộc này nếu về sau cần gói riêng trùng tên | Thấp |
| 2 | Không truy vấn được value object trong LINQ bằng `customer.Phone.Value` — EF Core không dịch được sang SQL. Phải dựng `PhoneNumber.FromPersistence(...)` trước rồi so sánh cả đối tượng, y như `UserRepository` đang làm với `Email`. Nhớ điều này khi viết tra cứu khách theo số điện thoại ở **ngày 10** | Trung bình |
| 3 | Bốn cột tạm `TenantId`, `TenantName`, `BranchCode`, `BranchName` trên `AppUsers` vẫn còn. Bảng `UserTenants` đã sẵn sàng thay thế; gỡ ở **ngày 3** đúng kế hoạch | ⏩ **Dời sang ngày 4** — xem quyết định 18 |

### Ngày 3 — xong

Hai quyết định chốt đầu ngày:

| # | Quyết định | Hệ quả |
|---|---|---|
| 18 | **Giữ bốn cột tạm trên `AppUsers` tới ngày 4**, gỡ cùng lúc nối frontend | Đăng nhập qua giao diện chạy suốt ngày 3; dừng lúc nào cũng có bản demo được |
| 19 | **Chỉ chủ tiệm qua màn chọn tiệm**; lễ tân được máy chủ đặt tiệm ngay lúc đăng nhập | Lễ tân — người dùng thường xuyên nhất — đỡ một lần bấm vô nghĩa mỗi ca làm |

| Hạng mục | Kết quả |
|---|---|
| `SessionMiddleware` đọc phiên ở **mỗi request**, gọi lại `GetCurrentAccountUseCase` chứ không chép lại phép kiểm tra (BR-AUTH-022) | Xong |
| `GET /api/auth/my-tenants`, `POST /api/auth/session/tenant` — bắt buộc kiểm tra `UserTenants` trước khi đổi tiệm (BR-AUTH-026) | Xong |
| Ma trận mục 3.4 viết thành **bảng dữ liệu** `PermissionMatrix` — 16 nhóm chức năng × 3 vai trò, không rải `if` theo endpoint | Xong |
| `FeatureCapabilityPolicy` — khóa tính năng theo gói (BR-SUB-007) | Xong |
| `TenantWriteGuardMiddleware` — chặn ghi khi tiệm hết hạn ở **một chỗ duy nhất** (BR-TENANT-012) | Xong |
| `IAuditLogger` + `AuditLogger` + `GET /api/audit-logs` — nhật ký ghi ở **máy chủ** (BR-AUD-001), phạm vi đọc theo vai trò (BR-AUD-005) | Xong |
| Thứ tự 4 bước BR-TENANT-013 ráp ở `Program.cs`, mỗi bước một chỗ | Xong |

**Chuỗi kiểm tra quyền, đúng thứ tự không đảo:**

| Bước | Câu hỏi | Cài đặt ở đâu |
|:--:|---|---|
| 1 | Tiệm còn hạn không? | `TenantWriteGuardMiddleware` |
| 2 | Gói có mở tính năng này? | `RequirePermissionAttribute` → `FeatureCapabilityPolicy` |
| 3 | Vai trò có quyền không? | `RequirePermissionAttribute` → `PermissionMatrix` |
| 4 | Dữ liệu có thuộc tiệm? | Bộ lọc toàn cục ở `NailDbContext` |

**Kiểm chứng qua HTTP thật** — 12 phép thử, tất cả đạt:

| # | Phép thử | Kết quả |
|---|---|---|
| 1 | Chủ tiệm quản 2 tiệm đăng nhập → `mustSelectTenant: true` | Đạt |
| 2 | `GET /api/auth/my-tenants` trả đúng 2 tiệm kèm trạng thái tính lúc đọc | Đạt |
| 3 | Chọn tiệm **không** được giao (`TEN-AURORA`) | `403 FORBIDDEN` |
| 4 | Chọn tiệm được giao → phiên mang tiệm và 10 quyền của gói Premium | Đạt |
| 5 | Lễ tân đăng nhập → máy chủ tự đặt `TEN-LUMIERE`, không phải chọn | Đạt |
| 6 | Chọn tiệm quá hạn → `displayStatus: OVERDUE`, `isReadOnly: true` | Đạt |
| 7 | Ghi khi tiệm quá hạn (endpoint không miễn trừ) | `403 TENANT_READONLY` |
| 8 | Đọc khi tiệm quá hạn | `200` — BR-TENANT-010 giữ nguyên quyền xem |
| 9 | Lễ tân đọc nhật ký kiểm toán | `403 FORBIDDEN` |
| 10 | Chủ tiệm chưa chọn tiệm đọc nhật ký | `403` kèm thông điệp mời chọn tiệm |
| 11 | Chủ tiệm đã chọn tiệm → nhật ký **chỉ có tiệm mình** | Đạt |
| 12 | Sai mật khẩu 5 lần → khóa tạm; lần 6 dù đúng mật khẩu vẫn `ACCOUNT_LOCKED` | Đạt |

**BR-AUTH-022 kiểm riêng:** đang có phiên hợp lệ, chuyển tài khoản sang `Suspended` thẳng trong database → request kế tiếp trả `401` kèm đúng câu *"Tài khoản đã bị khóa hoặc vô hiệu hóa."*; mở lại thì phiên cũ dùng tiếp được ngay.

**Ma trận quyền và khóa gói kiểm bằng chương trình riêng** — 12 mệnh đề, tất cả đạt: Superadmin không chạm được vào 7 nhóm dữ liệu trong tiệm (BR-AUTH-030); lễ tân không hoàn tiền, không đóng lịch khi chưa thu đủ, không xem nhật ký; chủ tiệm chỉ *xem* nhật ký; chi nhánh/nhân viên/dịch vụ không khóa theo gói mà theo hạn mức số lượng.

**Ba điều chệch khỏi kế hoạch, có chủ đích:**

1. **Nhật ký chưa đủ 8 loại sự kiện.** Ba loại đã ghi thật: `LOGIN`, `LOGIN_FAILED`, `ACCOUNT_LOCKED`. Bảy loại còn lại — `TENANT_*`, `ACCOUNT_CREATED`, `PAYMENT_RECEIVED`, `REFUND_ISSUED`, `PACKAGE_CHANGED` — là sự kiện **nghiệp vụ**, không phải sự kiện HTTP, nên middleware không biết chúng xảy ra. Chúng sẽ được gọi từ chính use case tương ứng ở ngày 5–13. Cổng `IAuditLogger` đã sẵn sàng.
2. **Hai nhóm endpoint miễn trừ ở BR-TENANT-011 chưa tồn tại** (yêu cầu nâng gói, nộp chứng từ hóa đơn đăng ký — thuộc module đã cắt ở ngày 17). Thuộc tính `AllowWhenTenantReadonly` hiện gắn cho ba endpoint thao tác trên *phiên*: đăng nhập, đăng xuất, đổi tiệm.
3. **Bước 2 (khóa tính năng theo gói) chưa có endpoint nào chạy qua**, vì `GET /api/audit-logs` không khóa theo gói. Nó được kiểm bằng hàm thuần, và sẽ chạy thật từ ngày 10–11 khi có endpoint khách hàng và lịch hẹn.

**Một lỗi bắt được lúc thử tay:** lệnh chặn ghi ban đầu chặn luôn `POST /api/auth/login` và `POST /api/auth/logout`. Hậu quả thật: người dùng còn cookie trỏ vào tiệm hết hạn sẽ **không đăng nhập lại được và cũng không đăng xuất được** — kẹt cứng. Đã tách phép miễn trừ thành thuộc tính riêng và gắn cho ba endpoint thao tác trên phiên.

### Việc còn treo sau ngày 3

| # | Việc | Mức |
|---|---|---|
| 1 | Bốn cột tạm trên `AppUsers` — gỡ ở **ngày 4** cùng lúc nối frontend (quyết định 18) | Đã có lịch |
| 2 | `sqlcmd` cần `SET QUOTED_IDENTIFIER ON` mới `UPDATE` được `AppUsers`, vì bảng có filtered index trên `Username`. Thiếu dòng đó thì lệnh **im lặng thất bại** và tưởng nhầm là code sai — đã mất một lượt vì chuyện này | Thấp — nhớ khi sửa dữ liệu tay |
| 3 | Bảy loại sự kiện nhật ký còn lại, nối dần theo từng use case ở ngày 5–13 | Đã có lịch |

### Ngày 4 — xong → **Mốc ① đạt**

| Hạng mục | Kết quả |
|---|---|
| **Backend** — `BranchScopeDto` đọc chi nhánh qua hồ sơ nhân viên (BR-EMP-004), thay cho hai cột chép sẵn | Xong |
| **Backend** — migration `DropLegacyAccountScope` gỡ bốn cột `TenantId`, `TenantName`, `BranchCode`, `BranchName` khỏi `AppUsers` | Xong, bảng còn 13 cột |
| `src/services/apiClient.ts` — kiểu kết quả phân biệt đủ **sáu trường hợp** ở §12.4, cộng 404 và 409 | Xong |
| `src/services/auth.ts` thay `src/utils/authApi.ts` cho phần phiên đăng nhập — **không hàm nào `catch` rồi trả `null`** | Xong |
| `src/components/TenantPicker.tsx` — màn chọn tiệm, có đủ trạng thái tải / lỗi / trống | Xong |
| `src/components/TenantSwitcher.tsx` + chỗ đặt trên thanh trên cùng của cổng chủ tiệm | Xong, chỉ hiện khi quản từ 2 tiệm |
| `App.tsx` — phiên thật, gác cổng bằng màn chọn tiệm, đổi tiệm nạp lại dữ liệu | Xong |
| `AdminSession` — gỡ `location`, `trusted`, `suspicious`, `mfaVerified` | Xong |
| `npx tsc --noEmit` trên mã của ứng dụng | **0 lỗi** |

**Hợp đồng phiên sau ngày 4** — `GET /api/auth/session`:

```
{ account: { id, email, role, displayName },
  activeTenantId, tenant: { … capabilities[] }, branch: { id, code, name },
  mustSelectTenant }
```

Tài khoản nay chỉ còn **danh tính**; phạm vi làm việc thuộc về phiên. Đó là hệ quả trực tiếp của BR-AUTH-023: cùng một tài khoản chủ tiệm làm việc cho tiệm nào là chuyện của từng phiên, không phải thuộc tính của con người đó.

**Kiểm chứng trên trình duyệt thật** (Vite proxy → ASP.NET Core), cả năm mục của Mốc ①:

| # | Kịch bản | Kết quả |
|---|---|---|
| 1 | Superadmin đăng nhập | Vào thẳng trung tâm điều hành, không qua màn chọn tiệm |
| 2 | Chủ tiệm đăng nhập | Ra màn chọn tiệm, hiện 2 tiệm thật kèm mã, hạn dùng và trạng thái |
| 3 | Chọn *Nailé Studio* | Vào cổng chủ tiệm, gói hiện đúng **Premium** |
| 4 | Đổi sang *Muse Nail Lab* bằng bộ đổi tiệm | Portal nạp lại, gói đổi đúng thành **Basic** |
| 5 | Lễ tân đăng nhập | Vào thẳng bàn tiếp tân, chi nhánh hiện *Chi nhánh Quận 3* — đọc từ hồ sơ nhân viên |
| 6 | Khóa tài khoản trong database rồi tải lại trang | Bị đưa về màn đăng nhập ngay |

**Hai điều chệch khỏi kế hoạch, có chủ đích:**

1. **Kiểu kết quả dùng khóa phân biệt dạng chuỗi `status: 'ok' | 'error'`**, không phải `ok: boolean` như §12.4 gợi ý. Lý do là ràng buộc kỹ thuật chứ không phải sở thích: `tsconfig.json` của dự án **không bật `strictNullChecks`**, và ở chế độ đó TypeScript không thu hẹp được kiểu theo khóa phân biệt kiểu boolean — viết `if (!result.ok)` rồi đọc `result.error` sẽ báo lỗi biên dịch. Đã kiểm chứng bằng một tệp thử riêng: cùng đoạn mã, bật `strictNullChecks` thì hết lỗi. §12.4 vốn nói rõ "điểm cốt lõi không phải là hình dạng cụ thể".
2. **Cổng chủ tiệm và cổng lễ tân vẫn nhận `DemoAccount`** như cũ, qua một lớp chuyển đổi nhỏ trong `App.tsx`. Sửa thẳng hai tệp hơn 5.000 dòng trong hôm nay là rủi ro không cần thiết; chúng sẽ đọc trực tiếp từ phiên khi được nối API ở ngày 14–15.

### Việc còn treo sau ngày 4

| # | Việc | Mức |
|---|---|---|
| 1 | `/api/package-upgrade-requests` vẫn **404 ở mỗi lần tải trang** — endpoint thuộc module gói đăng ký đã bị cắt ở ngày 17. Frontend nuốt lỗi và lùi về `localStorage` nên không vỡ, nhưng console đầy lỗi lúc demo. Cách rẻ nhất: bỏ lời gọi ở `src/utils/packageUpgradeRequests.ts` và gắn dải nhãn "Dữ liệu mẫu" theo quyết định 8 | **Cần quyết** |
| 2 | Số liệu trên bảng điều khiển của cả hai cổng vẫn là dữ liệu `localStorage`. Đúng kế hoạch — tenant và chi nhánh lên API ở ngày 5–6, lịch hẹn và hóa đơn ở ngày 11–16 | Đã có lịch |
| 3 | `src/utils/authApi.ts` chỉ còn hai hàm quản lý tài khoản (`persistManagedAuthAccount`, `deleteManagedAuthAccount`) gọi vào `/api/auth/accounts` — endpoint chưa tồn tại. Sẽ viết ở **ngày 7** cùng phần cấp tài khoản lễ tân | Đã có lịch |

### Ngày 5 — xong (phần backend)

Ba quyết định chốt đầu ngày, đều theo phương án khuyến nghị:

| # | Quyết định | Hệ quả |
|---|---|---|
| 20 | `/api/package-upgrade-requests` — **bỏ lời gọi** ở frontend và gắn dải nhãn "Dữ liệu mẫu" | Gỡ được việc treo số 1 sau ngày 4. Màn yêu cầu nâng gói ở lại mức C vĩnh viễn trong MVP |
| 21 | Danh sách tiệm của Superadmin **chỉ hiện số đếm, bỏ doanh thu tiệm** | `staffCount` và `branchCount` đếm thật từ database để cưỡng chế `max_staff` / `max_salons` (BR-SUB-005); `monthlyRevenue` bị gỡ khỏi API và khỏi form tạo tiệm vì BR-AUTH-030 |
| 22 | Mật khẩu tạm của chủ tiệm mới do **máy chủ sinh, trả về đúng một lần** | Giữ nguyên được form hiện tại. Hệ thống không gửi email nên không trả về nghĩa là tài khoản vừa tạo không ai đăng nhập được |

| Hạng mục | Kết quả |
|---|---|
| **12 endpoint** — 7 tiệm, 4 chi nhánh, 1 bảng giá | Xong, `dotnet build` 0 lỗi 0 cảnh báo |
| 11 use case mới + `TenantReadService` dùng chung cho sáu use case của module tiệm | Xong |
| 4 cổng mới ở tầng Domain: `IBranchRepository`, `IPackageRepository`, `ISubscriptionInvoiceRepository`, `IUnitOfWork` | Xong |
| **Giao dịch tạo tiệm** — BR-TENANT-004/005, năm bảng trong một lần: tiệm, chi nhánh chính, tài khoản chủ tiệm, dòng `UserTenants`, hóa đơn đăng ký | Xong, đã kiểm chứng cuộn ngược |
| BR-BRANCH-005 — hạn mức `max_salons` đếm lúc tạo | Xong, trả `LIMIT_EXCEEDED` / HTTP 409 |
| BR-TENANT-020/021 — xóa mềm tiệm, gỡ liên kết `UserTenants`, tài khoản vẫn đăng nhập được | Xong |
| Bốn loại sự kiện nhật ký còn treo từ ngày 3 nay ghi thật: `TENANT_CREATED`, `TENANT_UPDATED`, `TENANT_DELETED`, `ACCOUNT_CREATED` | Xong, còn 3 loại thuộc ngày 13 |

**Kiểm chứng qua HTTP thật — 35 phép thử, tất cả đạt:**

| # | Phép thử | Kết quả |
|---|---|---|
| 1 | `GET /api/tenants` — 6 tiệm mẫu kèm số đếm thật, **không có trường doanh thu** | Đạt |
| 2 | Số đếm khớp dữ liệu ngày 2: `TEN-MUSE` có 1 chi nhánh, 2 nhân viên | Đạt |
| 3 | `GET /api/packages` — 3 gói, quyền tính năng đọc đúng từ cột JSON | Đạt |
| 4 | Tạo tiệm kèm chủ tiệm mới → tiệm + chi nhánh chính (`activeBranches: 1`) + hóa đơn đăng ký | Đạt |
| 5 | Mật khẩu máy chủ sinh trả về một lần, **đăng nhập được ngay bằng nó** | Đạt |
| 6 | Chủ tiệm mới ra màn chọn tiệm và thấy đúng tiệm vừa lập | Đạt |
| 7 | Mã tiệm trùng (nhập chữ thường) | `422` kèm `fields.code` |
| 8 | Email đã có người dùng | `422` kèm `fields.adminEmail` |
| 9 | Hạn dùng đặt vào quá khứ | `422` kèm `fields.expiresAt` |
| 10 | Tạo tiệm gán chủ tiệm **đã có** (`mode: existing`) | Đạt |
| 11–13 | Sửa hồ sơ · gia hạn (tắt luôn cờ dùng thử) · gia hạn về quá khứ bị từ chối | Đạt |
| 14–16 | Khóa tiệm → `SUSPENDED` + `isReadOnly` · đặt `OVERDUE` bằng tay bị từ chối · mở lại | Đạt |
| 17 | Tiệm không tồn tại | `404` |
| 18–19 | Chủ tiệm chọn `TEN-MUSE` (gói Basic) → đọc được 1 chi nhánh | Đạt |
| 20 | Thêm chi nhánh thứ 2 trên gói Basic (`max_salons = 1`) | `409 LIMIT_EXCEEDED` |
| 21–22 | Đổi sang `TEN-LUMIERE` (Premium, `max_salons = 3`) → thêm chi nhánh thứ 3 thành công | Đạt |
| 23 | Thêm chi nhánh thứ 4 | `409 LIMIT_EXCEEDED` |
| 24 | Trùng tên chi nhánh trong cùng tiệm | `422` kèm `fields.name` |
| 25–26 | Sửa chi nhánh · ngừng hoạt động chi nhánh phụ | Đạt |
| 27 | **BR-BRANCH-002** — ngừng chi nhánh chính | `422`, chặn ở entity |
| 28 | **BR-TENANT-013 bước 4** — sửa chi nhánh của tiệm khác | `404`, không phải `403` |
| 29 | **BR-AUTH-030** — Superadmin gọi `/api/branches` | `403` |
| 30 | Lễ tân đọc chi nhánh `200`, ghi chi nhánh `403` | Đạt |
| 31 | Lễ tân gọi `/api/tenants` | `403` |
| 32 | **BR-TENANT-010** — tiệm bị khóa: đọc `200`, ghi `403 TENANT_READONLY`, đổi tiệm vẫn `200` | Đạt |
| 33 | **BR-TENANT-020** — xóa mềm: tiệm biến khỏi danh sách nhưng **mã tiệm vẫn bị chiếm** | Đạt |
| 34 | **BR-TENANT-021** — chủ tiệm mất hết tiệm **vẫn đăng nhập được**, danh sách tiệm rỗng | Đạt |
| 35 | Nhật ký ghi ở máy chủ đủ `TENANT_CREATED` / `TENANT_UPDATED` / `TENANT_DELETED` / `ACCOUNT_CREATED` | Đạt |
| 36 | **BR-BRANCH-005 ở đường bật lại** — hạn mức đầy (3/3) rồi bật lại một chi nhánh đã ngừng | `409 LIMIT_EXCEEDED` |
| 37 | Ngừng một chi nhánh khác rồi bật lại chi nhánh kia | Đạt |
| 38 | Gửi `ACTIVE` cho chi nhánh vốn đã hoạt động — không được từ chối oan | `200` |

Ba phép thử cuối cùng là hệ quả của một lỗ hổng phát hiện khi rà soát — xem [Rà soát ngày 5](#rà-soát-ngày-5--một-lỗ-hổng-đã-vá) bên dưới.

**Một lỗi bắt được lúc thử tay:** số hóa đơn đăng ký ban đầu đếm theo **từng tiệm**, nhưng cột `Code` mang chỉ số duy nhất **toàn hệ thống** — nên tiệm mới đầu tiên đã đụng số `DK-202608-001` của dữ liệu mẫu và cả giao dịch bị cuộn lại với lỗi 500. Đã đổi sang một dãy số chung, đúng bản chất: hóa đơn đăng ký do SalonSys phát hành với tư cách người bán, khác hẳn số hóa đơn *bán hàng* ở BR-INV-016 vốn đếm theo từng tiệm và reset mỗi ngày. Lần hỏng này cũng là phép kiểm chứng không định trước cho `IUnitOfWork`: sau khi lỗi, database **không** còn lại tiệm mồ côi nào.

**Bốn điều chệch khỏi kế hoạch, có chủ đích:**

1. **12 endpoint thay vì 11.** Thêm `GET /api/packages` chỉ đọc. Không có nó thì màn tạo tiệm vẫn phải chọn gói từ dữ liệu mẫu, và tiệm mới sẽ trỏ tới một mã gói không tồn tại trong database. Phần quản lý gói (tạo, sửa giá, ngừng bán) vẫn nằm ngoài phạm vi như đã cắt.
2. **`IUnitOfWork` chỉ mở ranh giới giao dịch, không gom lệnh lưu.** Các repository vẫn tự gọi `SaveChangesAsync` như từ ngày 1; cổng mới chỉ bọc một giao dịch quanh chúng. Nhờ vậy không phải viết lại tầng lưu trữ, và những lệnh ghi cần độc lập — bản ghi nhật ký khi thao tác nghiệp vụ thất bại — vẫn giữ được tính độc lập ấy.
3. **`ReadUsageAsync` là chỗ thứ hai trong hệ thống dùng `IgnoreQueryFilters`.** Bắt buộc, vì Superadmin không thuộc tiệm nào nên bộ lọc luôn đóng và mọi phép đếm sẽ ra 0. Phép cách ly được giữ bằng hai cách: chỉ **con số** rời khỏi hàm đó, và danh sách tiệm cần đếm do người gọi truyền vào nên không có đường quét cả database.
4. **Nhật ký ghi SAU khi giao dịch chốt**, không nằm trong giao dịch. Nằm trong thì nó bị cuộn ngược theo khi có lỗi, và một dòng "đã tạo tiệm" cho tiệm chưa từng tồn tại còn tệ hơn là không có dòng nào.

**Một chỗ sửa nằm ngoài phạm vi ngày 5, làm luôn vì phát hiện lúc thử:** thông điệp của `TENANT_READONLY` trước đây luôn nói *"Tiệm đã hết hạn sử dụng… Gia hạn gói để tiếp tục."* Nhưng BR-TENANT-010 gộp hai tình huống vào cùng chế độ chỉ đọc — quá hạn, và bị Superadmin khóa tay — nên một tiệm bị khóa tay sẽ được mời đi chuyển khoản, rồi phát hiện tiền không mở lại được gì. Endpoint khóa tiệm viết hôm nay chính là thứ tạo ra tình huống đó, nên câu chữ được sửa lại để không đoán nguyên nhân.

### Việc còn treo sau ngày 5

| # | Việc | Mức |
|---|---|---|
| 1 | **Frontend chưa nối** — 12 endpoint đã chạy nhưng `TenantManagement.tsx` vẫn đọc `localStorage`. Đó là nội dung **ngày 6**, kèm việc gỡ `BranchCode = 'Q1' \| 'Q3'` ở 7 tệp và bỏ hai ô nhập tay `monthlyRevenue` / `staffCount` theo quyết định 21 | Đã có lịch |
| 2 | ~~Quyết định 20 chưa thi hành~~ — **đã xong**: gỡ 4 lời gọi `fetch` khỏi `src/utils/packageUpgradeRequests.ts`, bỏ effect nạp từ máy chủ ở `App.tsx`, và thêm component dùng chung `src/components/ui/MockDataNotice.tsx` gắn lên màn yêu cầu nâng gói. Kiểm chứng trên trình duyệt: không còn lời gọi `/api/package-upgrade-requests` nào, console sạch | Xong |
| 3 | Superadmin gọi một endpoint thuộc phạm vi tiệm nhận `403` **kèm thông điệp "Chưa chọn tiệm để làm việc"**, trong khi họ không bao giờ chọn được tiệm nào (BR-AUTH-031). Mã trạng thái đúng, câu chữ sai. Sửa được bằng cách để `RequirePermissionAttribute` từ chối sớm khi vai trò không có ô nào trong ma trận — nhưng đó là đảo thứ tự bước 2 và bước 3 của BR-TENANT-013, nên **cần quyết** trước khi động vào | **Cần quyết** |
| 4 | Database demo đang lẫn dữ liệu thử: `TEN-VELVET`, `TEN-ORCHID` (phiên viết ngày 5) và `TEN-RVNEW`, `TEN-RVOLD` (phiên rà soát) — tất cả đã xóa mềm. Còn lại hai chi nhánh ngừng hoạt động của Nailé Studio và một tài khoản `chu@ravsoat.vn` đã vô hiệu hóa. Bộ nạp dữ liệu mẫu chỉ chạy khi bảng trống, nên muốn sạch phải xóa database rồi khởi động lại | Trung bình |
| 5 | Ba loại sự kiện nhật ký còn lại — `PAYMENT_RECEIVED`, `REFUND_ISSUED`, `PACKAGE_CHANGED` — nối ở ngày 13 | Đã có lịch |

### Rà soát ngày 5 — một lỗ hổng đã vá

Rà lại toàn bộ 12 use case và 3 controller, đối chiếu BR-TENANT-004/005/010, BR-BRANCH-001/002/005 và BR-SUB-005, rồi thử **16 kịch bản qua HTTP thật**. Mười lăm kịch bản đạt ngay. Một kịch bản lộ ra lỗ hổng dưới đây.

#### 🔴 BR-BRANCH-005 — bật lại chi nhánh vượt được hạn mức

`ChangeBranchStatusUseCase` bản đầu **cố ý** không kiểm hạn mức khi bật lại một chi nhánh đã ngừng, với lý do ghi trong chú thích: sợ tiệm vừa hạ gói bị kẹt.

Hậu quả tái hiện được: Nailé Studio (gói Premium, hạn mức 3) chạy được **4 chi nhánh hoạt động** chỉ bằng cách ngừng rồi bật lại. Rule viết rõ vế đầu là một bất biến — *"Số chi nhánh ACTIVE của tenant **không được vượt** `package.max_salons`"* — nên đây là vi phạm, không phải cách hiểu khác.

Lý do biện hộ ban đầu cũng không đứng vững: kiểm hạn mức **lúc bật lại** không làm kẹt ai, vì những chi nhánh *đang* hoạt động không bị đụng tới; tiệm chỉ không bật thêm được cái mới — đúng như khi họ muốn tạo mới.

**Đã vá:** dùng lại chính `CountActiveAsync` mà `CreateBranchUseCase` dùng, để hai đường vào cùng một hạn mức không cho ra hai kết quả khác nhau. Phép kiểm chỉ chạy khi đây thật sự là một lần bật lại — gửi `ACTIVE` cho chi nhánh vốn đã hoạt động thì bỏ qua, nếu không tiệm dùng vừa đủ hạn mức sẽ bị từ chối một việc họ không hề làm.

| Sau khi vá | Kết quả |
|---|---|
| Bật lại khi còn chỗ (2/3) | `200` |
| Bật lại khi đã đủ (3/3) | `409 LIMIT_EXCEEDED` |
| Gửi `ACTIVE` cho chi nhánh đã hoạt động, đang ở 3/3 | `200` — không chặn oan |

#### ⚠️ Một bẫy khiến phép thử nói dối

Lần chạy đầu, phép thử hạn mức **báo hỏng oan**: tiến trình `NailManagement.API` đang chạy là bản build **cũ hơn code trên đĩa**. Truy vấn trong repository đúng, nhưng máy chủ trả về kết quả của bản cũ.

`dotnet run` **không** tự nạp lại khi mã nguồn đổi. Từ nay, mỗi lần sửa backend rồi thử qua HTTP:

```
taskkill /F /IM NailManagement.API.exe ; dotnet run --project NailManagement.API --launch-profile http
```

#### Chỗ thiếu cần biết trước khi làm ngày 6

**Chưa có endpoint liệt kê tài khoản chủ tiệm.** Chế độ `owner.mode = "existing"` của BR-TENANT-004 đòi `existingUserId`, nhưng không API nào trả về danh sách tài khoản chủ tiệm để màn hình Superadmin cho chọn. Ngày 6 hoặc chỉ nối được nhánh "tạo tài khoản mới", hoặc phải kéo phần liệt kê tài khoản của ngày 7 lên sớm.
