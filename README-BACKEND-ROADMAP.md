# SalonSys — Lộ trình 20 ngày dựng backend

Tài liệu này biến `README-BUSINESS-RULES.md` thành **lịch làm việc theo ngày**. Nó không đặt ra business rule mới; mọi rule đều dẫn về mã `BR-*` của tài liệu đó.

| | |
|---|---|
| **Ngân sách** | 20 ngày × 8 giờ = **160 giờ** code. Báo cáo và slide viết ngoài 8 giờ này |
| **Backend** | **ASP.NET Core 10 + EF Core + SQL Server 2022**, solution riêng tại `C:\Users\letru\source\repos\NailManagement` |
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
| 6 | ~~**Vitest** chỉ cho phân quyền + cách ly tenant~~, không test CRUD | ~1 ngày, phủ đúng BR-ISO-006. ⚠️ **Vitest đã bị thay bằng xUnit ở ngày 12** (quyết định 53) — xem bảng thay thế bên dưới |
| 7 | Nối frontend theo **mạch demo vàng** trước | ~14 màn hình thay vì 22 |
| 8 | Màn chưa nối API **giữ `localStorage` + dải nhãn "Dữ liệu mẫu"** | Không có dữ liệu giả trình bày như thật |
| 9 | **Chỉ chạy localhost**, không deploy | Tiết kiệm 1 ngày. `npm run build` vẫn phải chạy được để phòng thân |
| 10 | **Bỏ USD, toàn hệ thống VND số nguyên** | Đúng BR-VAL-003. Bỏ `convertMoney` và tỷ giá cứng 25000 ở `src/utils/money.ts:5` |
| 11 | Phiên là **cookie + bảng `app_sessions`**, không JWT | BR-AUTH-022 bắt kiểm tra trạng thái tài khoản mỗi request; JWT không thu hồi được giữa chừng |
| 12 | **Chốt npm**, xóa `bun.lock` | Nợ kỹ thuật §21.3 |
| 13 | **Clean Architecture 4 tầng đầy đủ**: use case là class có `ExecuteAsync()`, có DTO vào/ra, có mapper và presenter riêng | Tốn thêm 3–4 ngày → **bỏ lát cắt gói đăng ký (ngày 17)**. ⚠️ Bản đầu của ô này còn ghi *"rút báo cáo doanh thu còn 2 chiều"* — **đã bỏ ý đó ngày 13**: xem ghi chú bên dưới |

> ⚠️ **Quyết định 13 từng viết như thể báo cáo doanh thu đã bị cắt còn 2 chiều. Không phải.** Việc
> cắt hẳn ngày 17 mới là đòn bẩy bù chi phí Clean Architecture; bốn chiều của BR-REV-004 vẫn giữ
> nguyên, và §6 xếp việc rút xuống 2 chiều vào **đường cắt dự phòng** chỉ dùng nếu cuối ngày 15 cổng
> lễ tân chưa thu được tiền. Lý do giữ: chiều **nhân viên** là nguồn tính hoa hồng ở BR-EMP-011
> (BR-REV-005 nói thẳng), và §9.5 đã hứa *"vẫn hiện số tiền hoa hồng trong báo cáo"* — cắt chiều đó
> là lỡ một lời hứa viết ở ba chỗ. Cả bốn chiều đều là `GROUP BY` trên dữ liệu đã có sẵn nên chiều
> thứ tư gần như không tốn thêm gì. *(soát tài liệu cuối ngày 13)*

> ⚠️ **Các quyết định 2, 3, 11, 12 ở trên đã bị thay ngày 24/08.** "vs insider" trong yêu cầu ban đầu là **Visual Studio Insiders**, không phải VS Code Insiders — tôi hiểu nhầm và đã dựng nhầm một backend Node trước khi phát hiện. Bảng dưới là quyết định thật.

| # | Quyết định (bản thay thế) | Hệ quả |
|---|---|---|
| 2′ | Backend là **solution ASP.NET Core riêng** ở `C:\Users\letru\source\repos\NailManagement`, ngoài repo frontend. Bốn project `Domain` · `Application` · `Infrastructure` · `API`, target `net10.0` | Frontend nối sang qua proxy Vite tới `http://localhost:5282` |
| 3′ | **EF Core + Migrations**, không SQL thuần | `dotnet ef migrations add` thay cho bộ chạy migration viết tay |
| 11′ | **SQL Server LocalDB**, không SQLite | ⚠️ Làm **BR-BAK-003 sai** — quy tắc đó ghi "sao lưu bằng copy tệp SQLite", nay không còn tệp để copy. Cần sửa `README-BUSINESS-RULES.md` §14. Đánh đổi đã biết: máy người chấm phải có LocalDB |
| 12′ | **Cookie auth + bảng phiên tự quản**, không dùng ASP.NET Core Identity | Giữ nguyên được BR-AUTH-013/020/022/024 mà không phải uốn theo lược đồ của Identity |
| 14′ | Băm mật khẩu bằng **PBKDF2-HMAC-SHA256, 210.000 vòng** (`Rfc2898DeriveBytes`) | Có sẵn trong .NET, không thêm gói. Thay cho SHA-256 một vòng của backend cũ — SHA-256 quá nhanh nên thuận lợi cho việc dò mật khẩu |
| 6′ | **xUnit + `WebApplicationFactory`** trên **SQL Server LocalDB riêng**, không Vitest và không SQLite. Bộ kiểm thử dùng lại `DemoDataSeeder` của máy chủ thật | Chốt ở ngày 12. Là quyết định cuối cùng của bản gốc còn sót lại sau khi đổi sang ASP.NET Core — Vitest là công cụ của JavaScript nên không chạy được ở đây. Kéo theo §5 ngày 12 nói "SQLite trong bộ nhớ" cũng đã lỗi thời từ quyết định 11′ |
| 11″ | **SQL Server 2022 Developer Edition** (instance mặc định `MSSQLSERVER`, Windows authentication), thay cho LocalDB. Chốt **03/09/2026** | Chỉ đổi chuỗi kết nối ở hai chỗ — `appsettings.json` và `SalonSysFactory.cs` — vì lược đồ không dùng tính năng riêng của phiên bản nào. Kéo theo hai việc: **BR-BAK-003** đổi công cụ từ Visual Studio sang SSMS, và **máy người chấm nay phải cài SQL Server thật** chứ không còn dùng ké bản LocalDB đi kèm Visual Studio — xem §7 rủi ro 6. Máy chủ mới dùng collation `Vietnamese_CI_AS` thay vì `SQL_Latin1_General_CP1_CI_AS`, làm đổi thứ tự sắp xếp danh mục và lộ ra một giả định ngầm trong `SalonScenario.NextSlot()` |

| 15′ | **Thu hồi phiên đăng nhập từ xa được đưa trở lại phạm vi.** Chốt **03/09/2026**, sau khi §9.4 đã liệt nó vào nhóm bỏ hẳn | Đổi ý vì chi phí hóa ra gần bằng không, chứ không phải vì phạm vi nới ra: bảng `app_sessions` đã có sẵn `revoked_at`, `ip`, `user_agent`, `last_active` từ ngày dựng nên **không cần migration**, và cơ chế cưỡng chế thì BR-AUTH-022 đã lo — thu hồi chỉ là đặt một cột. Kéo theo hai rule mới **BR-AUTH-032** và **BR-AUTH-033**, một ô quyền mới `Feature.Sessions`, hai endpoint, và bảy phép thử. Phần §9.2 từng hoãn màn này vì *"cần nghiệp vụ chưa định nghĩa"* — hai rule kia chính là phần nghiệp vụ ấy |

> **Đọc 11′ và 6′ ở trên với mốc thời gian:** cả hai chốt ngày 24/08 khi nền tảng còn là LocalDB, và quyết định 11″ đã thay phần nền tảng ấy. Phần lập luận của chúng thì vẫn nguyên giá trị — lý do chọn một SQL Server thật thay vì SQLite hay EF Core InMemory không phụ thuộc vào việc đó là LocalDB hay bản đầy đủ.

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
| xUnit phân quyền + cách ly tenant | 8 | Công cụ đổi ở quyết định 6′; ngân sách giờ giữ nguyên |
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

### 3.1 Cấu trúc thật — năm project ASP.NET Core

> Sơ đồ ở §3.2 bên dưới là bản Node đã bị bỏ. Giữ lại vì các nguyên tắc tầng vẫn đúng nguyên vẹn.
>
> ⚠️ **Sơ đồ này dựng lại từ cây thư mục thật cuối ngày 13.** Bản trước liệt kê đúng những gì tồn
> tại ở ngày 4 và không được cập nhật theo, nên nó thiếu hẳn project kiểm thử và bảy lát cắt use
> case. Con số dễ lệch nhất là số tệp trong một thư mục — chúng có ở đây để trả lời câu hỏi
> *"thư mục này đã phình tới mức phải chia chưa"*, không phải để tra cứu tên tệp.

```
NailManagement.slnx
  NailManagement.Domain/          ◄── Enterprise Business Rules — không tham chiếu project nào
    Entities/
      Auth/                         AppUser, AppSession, UserTenant
      Platform/                     Tenant, Package, SubscriptionInvoice, PackageUpgradeRequest
      Salon/                        Branch, Staff, Service, Customer, Appointment,
                                    AppointmentService, SalesInvoice, SalesInvoiceLine,
                                    InvoicePayment, InvoiceCounter
      Auditing/                     AuditLog
    Enums/                          Auth/ · Platform/ · Salon/ · Auditing/ — soi gương Entities/
    ValueObjects/                   Email, PhoneNumber, RawPassword
    Policies/         (10 tệp)      PermissionMatrix, AuthPolicy, ValidationPolicy,
                                    AppointmentLifecyclePolicy, AppointmentSchedulePolicy,
                                    AppointmentStatusText, InvoiceMoneyPolicy,
                                    SalesInvoiceStatusText, CustomerTierPolicy,
                                    FeatureCapabilityPolicy
    Repositories/     (13 cổng)     ★ PORT: IUserRepository, ITenantRepository, IBranchRepository,
                                    IAppointmentRepository, ISalesInvoiceRepository…
    Common/                         ErrorCode, AppException, DomainException, Guard,
                                    ITenantOwned, IBranchOwned

  NailManagement.Application/     ◄── tham chiếu Domain
    UseCases/         (11 lát cắt)  Auth/ · Tenants/ · Branches/ · Services/ · Staff/ ·
                                    Customers/ · Appointments/ · SalesInvoices/ ·
                                    Packages/ · Accounts/ · Audit/
    DTOs/             (13 tệp)      AuthDtos, TenantDtos, BranchDtos, ServiceDtos, StaffDtos,
                                    CustomerDtos, AppointmentDtos, SalesInvoiceDtos,
                                    PackageDtos, AccountDto, AuditLogDto, ActorContext
    Mappings/         (10 tệp)      một mapper cho mỗi lát cắt; AccountMapper chặn PasswordHash
    Abstractions/     (7 cổng)      IPasswordHasher, IPasswordGenerator, IClock, IIdGenerator,
                                    IUnitOfWork, ITenantContext, IAuditLogger
    Common/                         BranchScope (BR-ISO-004), SalonTime (múi giờ tiệm),
                                    Exceptions/
    DependencyInjection.cs          AddApplication()

  NailManagement.Infrastructure/  ◄── tham chiếu Application + Domain
    Persistence/
      NailDbContext.cs              bộ lọc theo tiệm nằm ở đây (BR-ISO-002) — 18 DbSet
      Configurations/               chia Auth/ Platform/ Salon/ Auditing/ — soi gương Entities/
      Repositories/                 bản cài đặt của các cổng ở Domain
      Migrations/                   EF Core sinh ra; không sắp xếp lại
      Seed/                         DemoAccountSeeder, DemoDataSeeder, DemoSeedCatalog, DemoIds
      TenantScope/                  AmbientTenantContext
      EfUnitOfWork.cs               ranh giới giao dịch — dùng ở lập hóa đơn và thu tiền
    Auditing/                       AuditLogger
    Security/                       Pbkdf2PasswordHasher, RandomPasswordGenerator
    SystemServices/                 SystemClock, GuidIdGenerator
    DependencyInjection.cs          AddInfrastructure() — nơi cắm cổng vào bản cài đặt

  NailManagement.API/             ◄── Frameworks & Drivers, tham chiếu Application + Infrastructure
    Controllers/      (11 tệp)      Auth, Tenants, Packages, Accounts, Branches, Services,
                                    Staff, Customers, Appointments, SalesInvoices, AuditLogs
                                    — 47 endpoint
    Security/                       RequireAuth, RequirePermission, AllowWhenTenantReadonly,
                                    RequestScope, SessionMiddleware, TenantWriteGuardMiddleware
    Common/ApiExceptionHandler.cs   ★ nơi DUY NHẤT ánh xạ mã lỗi sang HTTP status
    Common/ErrorResponse.cs
    Program.cs                      composition root + áp migration + seed

  NailManagement.Tests/           ◄── xUnit, dựng máy chủ thật trong bộ nhớ (quyết định 6′)
    Infrastructure/                 SalonSysFactory, SalonSysClient, SalonSysCollection,
                                    TestDatabase
    Isolation/                      TenantIsolationTests
    Authorization/                  SuperAdminBoundary, ReceptionistScope, ReadOnlyTenant,
                                    SessionRevalidation
    Payments/                       PaymentCollectionTests
```

**Thư mục cần để mắt.** Không thư mục nào đang vượt ngưỡng phải chia, nhưng hai chỗ đã chạm trần
tự nhiên: `UseCases/Appointments/` và `UseCases/SalesInvoices/` mỗi thư mục **7 tệp**. Cả hai vẫn
là **một nhóm trách nhiệm duy nhất** nên chia nhỏ lúc này chỉ tạo thêm tầng gián tiếp; nếu lát cắt
báo cáo doanh thu ngày 16 làm `SalesInvoices/` phình tiếp thì đó là lúc tách.

**Trục chia thư mục — ba nhóm nghiệp vụ, dùng chung cho cả ba tầng.** `Entities/`, `Enums/` và
`Configurations/` đều chia theo đúng bốn nhóm mà §3.2 dùng khi liệt kê bảng database: `Auth`
(xác thực) · `Platform` (nền tảng: tiệm, gói, hóa đơn đăng ký) · `Salon` (nghiệp vụ trong tiệm) ·
`Auditing` (nhật ký). Dùng lại đúng từ vựng đã có nghĩa là không ai phải học một cách phân loại
thứ hai, và ba thư mục soi gương nhau nên tìm `BranchConfiguration` chỉ cần biết `Branch` nằm ở đâu.

> Nhóm nhật ký tên là **`Auditing`**, không phải `System`. Đây là ràng buộc của C# chứ không phải
> sở thích: một namespace con tên `System` khiến mọi tham chiếu `System.X` bên trong nhánh đó bị
> tra vào chính nó trước, nên `System.DateTimeOffset` sẽ không biên dịch được.

Hai thư mục cố ý **không** chia: `Migrations/` do EF Core sinh và quản lý, còn `DTOs/` và
`Mappings/` chạy song song một-đối-một với `UseCases/`. Mười ba tệp DTO nghe như nhiều, nhưng
chúng đã **tự phân nhóm bằng tên tệp** — `AppointmentDtos.cs` gom trọn lát cắt lịch hẹn — nên
thêm một tầng thư mục chỉ để lặp lại thông tin đã có trong tên là chia nhỏ quá mức.

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
| 12 | xUnit đợt 1 (4h) + BE khung hóa đơn bán hàng (4h) | |
| 13 | BE thu tiền, hoàn tiền, tự `COMPLETED`, số hóa đơn | |
| 14 | FE `ReceptionistPortal` — lịch hẹn, check-in, đổi trạng thái | |
| 15 | FE `ReceptionistPortal` — thu tiền, hóa đơn | |
| 16 | BE báo cáo doanh thu 4 chiều + FE `TenantAdminReports` | **③ Trọn mạch demo** |
| 17 | ~~Lát cắt gói đăng ký~~ — **đã cắt** (§0 mục 13). Ngày đệm này dùng để **dọn số bịa**: nối màn Tổng quan chủ tiệm, doanh thu nền tảng và nhật ký kiểm toán vào dữ liệu thật | |
| 18 | xUnit đợt 2 + dọn dẹp: bỏ USD, dải nhãn "Dữ liệu mẫu", audit log | |
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

### Ngày 12 — xUnit đợt 1 + khung hóa đơn

Bốn giờ đầu viết ~12 test chạy thẳng vào tầng API **qua HTTP thật**, trên một SQL Server LocalDB riêng. *(Câu gốc ghi "SQLite trong bộ nhớ" — lỗi thời từ quyết định 11′, sửa khi soát tài liệu cuối ngày 13.)* Viết hôm nay chứ không để cuối vì đây là lúc đã có đủ hai tenant và ba vai trò để thử, mà vẫn còn 8 ngày để sửa nếu lộ lỗi:

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

### Ngày 18 — xUnit đợt 2 + dọn dẹp

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

> ⚠️ **`server/README.md` là đường dẫn của bản kế hoạch cũ**, hồi còn định đặt backend trong
> chính repo giao diện. Quyết định 2′/3′ ở §0 đã đổi sang một solution ASP.NET riêng, nên tệp
> thật nằm ở gốc solution ấy: `C:\Users\letru\source\repos\NailManagement\README.md`.
> *(ghi lại khi làm ngày 20)*

---

## 6. Đường cắt khi trễ

Kiểm tra ở ba mốc. Trễ thì cắt theo đúng thứ tự này, **không cắt tùy hứng**.

| Mốc kiểm tra | Nếu chưa đạt | Cắt gì | Thu về |
|---|---|---|---:|
| Cuối ngày 6 | Chưa xong tenant + chi nhánh | Bỏ hẳn ngày 17 (gói đăng ký) | 8h |
| Cuối ngày 10 | Chưa dựng được một tiệm trọn vẹn | Bỏ hoàn tiền và tip khỏi backend (`NICE TO HAVE`, BR §2.3); `TenantAdminReports` dùng lại `TenantAdminOverview` | 8h |
| Cuối ngày 15 | Cổng lễ tân chưa thu được tiền | Bỏ xUnit đợt 2; báo cáo chỉ còn 2 chiều ngày + chi nhánh | 6h |

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
| 3 | **Giao dịch lúc thu tiền** — 3 bảng phải cùng thành công | ✅ **Đã xử lý ngày 13** bằng `IUnitOfWork` / `EfUnitOfWork` — một giao dịch EF Core bao quanh dòng thu, hóa đơn và lịch hẹn. Có phép thử riêng cho ca này |
| 4 | **`App.tsx` chuyển quá tay** | Chỉ 5 trong 10 state lên API (`tenants`, `packages`, `invoices`, `tenantAdmins`, `upgradeRequests`). Năm state còn lại — `alerts`, `tickets`, `announcements`, `systemSettings`, `themeMode` — **giữ nguyên `localStorage`** |
| 5 | **Plugin `vite-local-auth` chặn proxy** | Gỡ ngay ngày 1 |
| 6 | ~~**`node:sqlite` in cảnh báo experimental lúc khởi động**~~ → **máy người chấm phải cài được SQL Server** | Rủi ro gốc không còn (quyết định 11′ bỏ SQLite). Rủi ro thay thế **nặng thêm từ 03/09** theo quyết định 11″: LocalDB đi kèm Visual Studio nên gần như máy nào có VS là có sẵn, còn **SQL Server 2022 là bản cài riêng vài GB**. Nếu buổi chấm diễn ra trên máy của trường, hoặc trên máy không cài được, hãy đổi chuỗi kết nối về `(localdb)\MSSQLLocalDB` — lược đồ chạy y hệt, bộ kiểm thử đã xác nhận xanh trên cả hai. `dotnet run` vẫn tự chạy migration + seed lúc khởi động ở cả hai trường hợp |
| 7 | **Ngày 11 và 13 là hai ngày đặc nhất** | Nếu ngày 10 đã trễ, cắt theo bảng §6 **trước khi** bước vào ngày 11, đừng cắt giữa chừng |

---

## 8. Giả định tôi tự chốt

Những điểm còn bỏ ngỏ ở `README-BUSINESS-RULES.md` §22 mà tôi chốt theo hướng ít tốn kém nhất để không chặn tiến độ. **Nói nếu bạn muốn khác** — sửa bây giờ rẻ hơn sửa sau ngày 10.

| # | Điểm | Tôi chốt | Vì sao |
|---|---|---|---|
| 1 | Ngưỡng hạng khách (§22 mục 1) | Giữ 5tr / 20tr | Chỉ là nhãn hiển thị, đổi lúc nào cũng được |
| 2 | Số hóa đơn (§22 mục 4) | Reset mỗi ngày, theo từng tenant | Đúng như BR-INV-016 đang giả định |
| 3 | Lịch hẹn `PENDING` quá hạn (§22 mục 5) | Chỉ hiện nhãn "quá hạn" tính lúc đọc, không tự đổi trạng thái | Nhất quán với BR-TENANT-003 — không có job nền |
| 4 | Node tối thiểu (§22 mục 7) | `>=20.19` trong `engines` | Chỉ còn là ràng buộc của **Vite 6 và công cụ frontend** — lý do cũ (`node:sqlite` có từ 22.5) đã mất hiệu lực từ quyết định 11′ |
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
| **Báo cáo doanh thu** | Theo tiền thực thu, 4 chiều: ngày, chi nhánh, nhân viên, dịch vụ; hoa hồng tính lúc hiển thị | ~~4~~ **1** | BR-REV-001…008 |
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
| Tài khoản | Đổi mật khẩu · Quên mật khẩu · Kích hoạt qua email · Xác minh email và số điện thoại · MFA · ~~Thu hồi phiên từ xa~~ *(đã làm 03/09 — xem quyết định 15′)* |
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

Theo đúng thứ tự ở §6: **gói đăng ký** (cả module) → **hoàn tiền và tip** → **xUnit đợt 2** và **hai chiều báo cáo** nhân viên + dịch vụ. Bốn thứ không bao giờ cắt: cách ly tenant, chặn ghi khi hết hạn, chống trùng lịch, công thức tiền.

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
| 2 | ~~`npm run lint:web` đang có **86 lỗi kiểu ở 5 tệp**... ba màn lễ tân quên import `PageHeader` và `Pagination` — sẽ ném lỗi lúc chạy~~ — **đã hết, xác nhận cuối ngày 13.** `npx tsc --noEmit` nay không còn lỗi nào trong `src/`. Tên lệnh cũng sai: script là `npm run lint`, không phải `lint:web` | ~~Cao~~ → Hết |
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

### Ngày 6 — xong

Tám quyết định chốt đầu ngày, tất cả đều theo phương án khuyến nghị:

| # | Quyết định | Hệ quả |
|---|---|---|
| 23 | **Một nguồn duy nhất**: cả bảy màn của Superadmin đọc tiệm từ `GET /api/tenants` | Gỡ được hai danh sách tiệm song song. Kéo theo: gỡ `monthlyRevenue` khỏi kiểu `Tenant`, và mọi khối doanh thu tiệm ở Tổng quan / Báo cáo phải đổi nguồn |
| 24 | **Kéo `GET /api/accounts` của ngày 7 lên ngày 6** | Mở được nhánh "giao tiệm cho chủ tiệm đã có" (BR-TENANT-004), và màn Quản lý chủ tiệm có danh sách thật |
| 25 | **Bỏ khỏi biểu mẫu** những ô máy chủ không lưu | Form tạo tiệm còn 12 ô thay vì 29. Nhập gì lưu nấy |
| 26 | `BranchCode` — **chỉ nới kiểu ở ranh giới**, chưa gỡ ở 9 màn mức C | Xong phần rẻ, hoãn phần đắt sang ngày 8 |
| 27 | Doanh thu ở Tổng quan / Báo cáo đổi sang **doanh thu nền tảng** từ hóa đơn đăng ký (BR-REV-008) | Nhãn đổi từ "doanh thu tiệm" sang "đã thu từ tiệm" cho đúng bản chất |
| 28 | Huy hiệu "sắp hết hạn" đếm theo `daysRemaining ≤ 7` | Ngưỡng 7 ngày là quy ước của giao diện, ghi rõ ở `EXPIRING_SOON_DAYS` trong `App.tsx` |
| 29 | Modal chi tiết **giữ tab, hiện trạng thái trống** | Tab Chi nhánh và Hoạt động nói thẳng "chưa nối máy chủ" thay vì dựng danh sách không có thật |
| 30 | **Sửa lỗi 403** bằng một phép kiểm quyền chạy sớm | Gỡ được việc treo số 3 sau ngày 5 |

**Backend — 1 endpoint mới, 2 chỗ vá:**

| Hạng mục | Kết quả |
|---|---|
| `GET /api/accounts?role=TENANT_ADMIN` — chỉ đọc, chỉ Superadmin. Use case `ListTenantAdminAccountsUseCase`, DTO `TenantAdminAccountDto`, cổng mới `IUserRepository.ListByRoleAsync` và `IUserTenantRepository.ListTenantIdsByUserAsync` | Xong, `dotnet build` 0 lỗi 0 cảnh báo |
| **Quyết định 30** — `RequirePermissionAttribute` từ chối sớm khi vai trò không có ô nào trong ma trận | Xong. Superadmin gọi `/api/branches` nay nhận `403 FORBIDDEN` thay vì "Chưa chọn tiệm để làm việc". Thứ tự bốn bước BR-TENANT-013 **không đổi** với vai trò *có* ô — chủ tiệm chưa chọn tiệm vẫn nhận đúng `TENANT_NOT_SELECTED` |
| 🔴 **Lỗi ngày 5 lộ ra khi nối giao diện** — `ListOwnersAsync` không lọc theo vai trò | Đã vá, xem mục dưới |

**Frontend — 13 tệp:**

| Hạng mục | Kết quả |
|---|---|
| `src/services/tenants.ts` — tầng gọi API cho tiệm, gói và tài khoản chủ tiệm | Mới |
| `src/hooks/useTenants.ts` — **chỗ duy nhất** chuyển `TenantDetailDto` sang `Tenant`; nạp ba danh sách song song, ghi xong nạp lại | Mới |
| `src/utils/platformRevenue.ts` — công thức doanh thu nền tảng (BR-REV-008), tách khỏi màn hình để hai màn không tính khác nhau | Mới |
| `apiClient` — thêm `apiPut`, `apiPatch`, `apiDelete` | Xong |
| `App.tsx` — **giảm 620 dòng**: gỡ state `tenants`, `packages`, `tenantAdmins`; gỡ 4 effect nghiệp vụ; gỡ 8 hàm ghi của module gói đã cắt | Xong |
| `TenantManagement.tsx` — tạo, sửa, gia hạn, khóa, xóa đều gọi API; lỗi máy chủ gắn vào đúng ô nhập | Xong |
| `tenantValidation.ts` — bản nháp viết lại đúng bằng hợp đồng `POST /api/tenants` | Xong |
| `data.ts` — xóa `INITIAL_TENANTS` và `INITIAL_PACKAGES` | Xong |
| `Overview`, `SystemReports` — doanh thu đổi nguồn, bỏ `EXPIRING` | Xong |
| `SubscriptionPackages`, `TenantAdminManagement`, `TenantDetailModal` — chuyển sang chỉ xem, nói rõ vì sao | Xong |
| `npx tsc --noEmit` trên mã ứng dụng | **0 lỗi** |

**Kiểm chứng trên trình duyệt thật — 14 phép thử, tất cả đạt:**

| # | Phép thử | Kết quả |
|---|---|---|
| 1 | Tổng quan hiện **6 tiệm thật từ database**, đúng 4 trạng thái, không còn `EXPIRING` | Đạt |
| 2 | Cột doanh thu đổi thành "Đã thu từ tiệm", số lấy từ hóa đơn đăng ký đã thu | Đạt |
| 3 | Bảng Quản lý tiệm: chủ tiệm, gói, số chi nhánh, số nhân sự, số ngày còn lại — tất cả từ máy chủ | Đạt |
| 4 | Nguyễn Văn Boss hiện là chủ của **cả Nailé Studio lẫn Muse Nail Lab** — BR-AUTH-023 nhìn thấy được | Đạt |
| 5 | Tạo tiệm mới kèm chủ tiệm mới → tiệm + chi nhánh chính + hóa đơn đăng ký | Đạt |
| 6 | **Mật khẩu máy chủ sinh hiện đúng một lần**, hộp thoại không tự đóng | Đạt |
| 7 | Đăng nhập ngay bằng mật khẩu vừa hiện | `200` |
| 8 | Email trùng một tài khoản **lễ tân** — phép kiểm ở trình duyệt bỏ lọt, máy chủ bắt được và lỗi **gắn đúng ô Email đăng nhập** | Đạt |
| 9 | Gia hạn về quá khứ → máy chủ từ chối, lỗi hiện ngay tại ô ngày | Đạt |
| 10 | Gia hạn tới 31/12/2028 → cột "Còn lại" đổi thành 859 ngày | Đạt |
| 11 | Khóa tiệm → trạng thái "Tạm ngưng", câu chữ nói rõ chủ tiệm vẫn đăng nhập được | Đạt |
| 12 | Xóa tiệm → biến khỏi danh sách; **mã tiệm vẫn bị chiếm** (`422`) | Đạt |
| 13 | **BR-TENANT-021** — chủ tiệm mất hết tiệm vẫn đăng nhập được | `200` |
| 14 | Giao tiệm mới cho chủ tiệm **đã có** → màn chọn tiệm của họ hiện 3 tiệm | Đạt |

Console sạch: chỉ còn hai lỗi `401` lúc mở trang khi chưa đăng nhập — đó là trạng thái bình thường, không phải sự cố.

#### 🔴 Lỗi ngày 5 lộ ra khi nối giao diện: danh sách chủ tiệm lẫn cả lễ tân

Màn hình vừa nối xong hiện **Lê Hoàng Nam — lễ tân** ở cột "Chủ tiệm chính" của Nailé Studio.

`ListOwnersAsync` đọc bảng `UserTenants` nhưng **không lọc theo vai trò**. Bảng ấy mang cả lễ tân — họ cũng cần một tiệm để làm việc — và tệ hơn: lễ tân được giao sớm hơn, nên câu `OrderBy(CreatedAt)` đẩy chính họ lên đầu. Hậu quả không dừng ở một dòng hiển thị sai: `TenantDetailDto.Owners[0]` là thứ giao diện dùng làm chủ tiệm chính, nên toàn bộ cột chủ tiệm của màn quản lý đều sai theo.

Ba mươi lăm phép thử của ngày 5 không bắt được vì chúng kiểm qua HTTP và chỉ đọc *có* chủ tiệm hay không, chưa ai đọc kỹ *ai* đứng đầu danh sách.

**Đã vá:** thêm điều kiện `link.User.Role == UserRole.TenantAdmin` ngay trong câu truy vấn. Sau khi vá, cả sáu tiệm đều hiện đúng một chủ tiệm, và Nguyễn Văn Boss hiện đúng ở cả hai tiệm anh quản lý.

#### 🔴 Điều kiện xóa tiệm ở frontend khiến không tiệm nào xóa được

`getTenantDeletionEligibility` chặn xóa khi tiệm còn chi nhánh, còn nhân sự, đang hoạt động, hoặc còn yêu cầu nâng gói. Cả bốn là quy ước tự đặt thời dữ liệu mẫu, không có trong `README-BUSINESS-RULES.md`.

Điều kiện đầu **bất khả thi**: BR-BRANCH-002 cấm ngừng chi nhánh chính, nên số chi nhánh hoạt động không bao giờ về 0. Nghĩa là `DELETE /api/tenants/{id}` — endpoint đã viết và đã kiểm chứng ở ngày 5 — không có đường nào gọi tới từ giao diện.

Bản cũ còn nói sai bản chất: hộp thoại ghi *"loại bỏ hoàn toàn hồ sơ, tài khoản Tenant Admin và toàn bộ lịch sử thanh toán"*, trong khi BR-TENANT-020/021 quy định xóa mềm, mã tiệm vẫn bị giữ chỗ và tài khoản chủ tiệm **không** bị xóa theo.

**Đã vá:** còn đúng một điều kiện và nó thực hiện được — tiệm đang hoạt động thì khóa trước, nút khóa nằm ngay cạnh nút xóa. Câu chữ viết lại đúng ba hệ quả thật của xóa mềm.

#### Năm điều chệch khỏi kế hoạch, có chủ đích

1. **Gói dịch vụ cũng chuyển sang đọc từ máy chủ**, không chỉ tiệm. Bắt buộc: mã gói ở dữ liệu mẫu là `PKG-1`, ở database là `PKG-BASIC`. Giữ bảng giá mẫu thì mọi tiệm thật sẽ hiện ra "gói không xác định", và tiệm mới tạo sẽ trỏ tới một mã gói không tồn tại. Hệ quả: màn Quản lý gói mất phần thêm, sửa giá, ngừng bán — đúng phạm vi module đã cắt — và nói rõ điều đó bằng một dòng "Chỉ xem" ở đầu trang.
2. **`EXPIRING` bị gỡ khỏi kiểu `TenantStatus`**, không chỉ khỏi huy hiệu. BR-TENANT-001 đã bỏ trạng thái này và máy chủ không bao giờ trả về nó; để lại trong kiểu chỉ khiến trình biên dịch im lặng ở sáu chỗ vẫn đang so sánh với nó.
3. **Cột "Doanh thu" của bảng tiệm đổi thành "Còn lại"** thay vì đổi nguồn như hai màn kia. Màn quản lý tiệm không nhận danh sách hóa đơn, và thứ người bán gói thật sự theo dõi trên bảng này là hạn dùng chứ không phải tiền.
4. **Hai màn chuyển sang chỉ xem bằng cách gỡ lối vào, không gỡ biểu mẫu.** `TenantAdminManagement` và `TenantDetailModal` giữ nguyên bộ biểu mẫu bên dưới ở dạng không có đường nào gọi tới, vì chúng sẽ dùng lại gần như nguyên vẹn khi các endpoint ghi xuất hiện. Điều bắt buộc đã làm: hai hàm ghi bị thay bằng hàm rỗng, nên không còn khả năng lặng lẽ sửa dữ liệu trong bộ nhớ rồi báo thành công.
5. **Cảnh báo "một Tenant Admin gắn cho nhiều tenant" bị gỡ.** Nó nói ngược BR-AUTH-023, và chính dữ liệu mẫu dựng sẵn một người giữ hai tiệm để demo điều đó.

### Việc còn treo sau ngày 6

| # | Việc | Mức |
|---|---|---|
| 1 | **Biểu đồ "Doanh thu đã thu" ở màn Tổng quan vẫn là số bịa** — nó nhân một tỉ lệ cố định với một mốc 128.500.000 ₫ gắn cứng, nên đang hiện 414 triệu ngay dưới ô chỉ số nói 86 triệu. Trước ngày 6 hai con số cùng sai nên không ai thấy; nay ô chỉ số đã thật, chỗ vênh lộ ra. Cần hoặc dựng biểu đồ từ `paidAt` của hóa đơn thật, hoặc bỏ biểu đồ | **Cần sửa** |
| 2 | `BranchCode = 'Q1' \| 'Q3'` vẫn còn ở **12 tệp** mức C. Đã nới `DemoAccount.branchCode` thành `string` nên chỗ ép kiểu ở `App.tsx` không còn; phần còn lại theo quyết định 26 chờ ngày 8 | Đã có lịch |
| 3 | Cấp, sửa, khóa tài khoản chủ tiệm chưa có endpoint. `GET /api/accounts` mới chỉ đọc | Đã có lịch |
| 4 | `TenantDetailModal` còn ~600 dòng biểu mẫu chi nhánh không có đường gọi tới. Dùng lại được ở ngày 8, nhưng tới đó mà không dùng thì nên xóa | Thấp |
| 5 | Database demo lẫn thêm hai tài khoản chủ tiệm mồ côi từ phiên thử: `chu@velvetnail.vn` (ngày 5) và `chu@velvetnailbar.vn` (ngày 6). Đúng theo BR-TENANT-021 — xóa tiệm không xóa tài khoản — nhưng vẫn nên dọn trước khi bảo vệ | Thấp |

### Ngày 7 — xong

Ba quyết định chốt đầu ngày, tất cả theo phương án khuyến nghị:

| # | Quyết định | Hệ quả |
|---|---|---|
| 31 | Chi nhánh của người thao tác đi qua **`ActorContext.BranchId`**, không nhét vào `ITenantContext` | Cổng mà tầng lưu trữ dùng để cách ly tiệm vẫn chỉ nói về một việc. Kéo theo: `RequestScope.ToActor()` là chỗ duy nhất dựng người thao tác, và `TenantsController` dùng lại nó |
| 32 | Nhân viên nghỉ việc thì **vô hiệu hóa luôn tài khoản đăng nhập** trong cùng giao dịch | Bịt lỗ hổng lễ tân đã nghỉ vẫn vào được quầy. Chiều ngược lại cố ý không đối xứng: nhận lại người cũ **không** tự cấp lại quyền đăng nhập |
| 33 | Giữ đúng **9 endpoint**, không tách endpoint khóa tài khoản lễ tân | Một hồ sơ một trạng thái. Không có tình trạng hồ sơ đang làm việc mà tài khoản bị khóa để giao diện phải giải thích |

Ba điểm nhỏ hơn kết luận thẳng từ source, không hỏi:

- **Danh sách trả cả bản ghi `INACTIVE`.** BR-DEL-002 để ngỏ ("tùy ngữ cảnh"), nhưng ngày 5 đã chốt hướng ở `IBranchRepository.ListAsync`. Không trả về thì màn quản lý không có đường bật lại một bản ghi đã ngừng.
- **`category` của dịch vụ là chuỗi tự do** — `Service.Create` dùng `Guard.Optional(…, 80)` và dữ liệu mẫu ghi "Sơn gel", "Combo". Sáu giá trị cố định ở `TenantAdminServices.tsx:40` là quy ước của giao diện cũ, xử lý ở ngày 8.
- **`StaffDto` mang theo thông tin tài khoản.** Không có nó thì màn nhân viên không biết nút "Cấp tài khoản đăng nhập" nên hiện ở hồ sơ nào.

**9 endpoint, đúng ngân sách §9.1:**

| Endpoint | Nhóm quyền | Ghi chú |
|---|---|---|
| `GET /api/services` | `Services` | Chủ tiệm và lễ tân cùng thấy một bảng giá — BR-SVC-001 |
| `POST /api/services` | `Services` ghi | |
| `PUT /api/services/{id}` | `Services` ghi | Đổi giá không đụng hóa đơn đã lập — BR-SVC-006 |
| `PATCH /api/services/{id}/status` | `Services` ghi | Không có động từ `DELETE`, BR-DEL-001 |
| `GET /api/staff` | `Staff` | Lễ tân chỉ thấy chi nhánh mình |
| `POST /api/staff` | `Staff` ghi | Cưỡng chế `max_staff` |
| `PUT /api/staff/{id}` | `Staff` ghi | Gồm cả chuyển chi nhánh |
| `PATCH /api/staff/{id}/status` | `Staff` ghi | Nghỉ việc kéo theo vô hiệu tài khoản |
| `POST /api/staff/{id}/account` | `ReceptionistAccounts` ghi | Đường **duy nhất** sinh ra tài khoản lễ tân |

**Mã nguồn — 16 tệp mới, 8 tệp sửa:**

| Tầng | Hạng mục |
|---|---|
| Domain | `IServiceRepository` mới; `IStaffRepository` mở rộng 5 hàm; `IUserRepository` thêm `ListByStaffIdsAsync` và `FindByStaffIdAsync`; `AppUser.Deactivate`; `Staff.ChangeRole` |
| Application | `ServiceDtos`, `StaffDtos`, `ServiceMapper`, `StaffMapper`; lát cắt `UseCases/Services/` (4 use case) và `UseCases/Staff/` (5 use case + `StaffQuotaGuard`); `ActorContext` thêm `BranchId` |
| Infrastructure | `ServiceRepository` mới; `StaffRepository` mở rộng; `UserRepository` thêm hai phép tra theo hồ sơ nhân viên |
| API | `ServicesController`, `StaffController`; `RequestScope.ToActor()` — chỗ duy nhất dựng người thao tác |
| Build | `dotnet build` — **0 lỗi, 0 cảnh báo**. Không có migration mới: hai bảng `Services` và `Staff` đã dựng đủ từ ngày 2 |

**Kiểm chứng qua HTTP thật — 49 phép thử, tất cả đạt:**

| Nhóm | Phép thử tiêu biểu | Kết quả |
|---|---|---|
| Dịch vụ | 8 dịch vụ mẫu; tạo mới; trùng tên (kể cả sau khi cắt khoảng trắng); thời lượng 999 phút; giá âm; đổi giá; ngừng bán rồi vẫn còn trong danh sách ở cuối | `201` / `422` đúng ô nhập / `200` |
| Nhân viên | 6 hồ sơ Lumiere, chỉ `STF-LUM-05` có tài khoản; ca kết thúc trước ca bắt đầu; giờ sai định dạng; hoa hồng 1,5; chi nhánh của tiệm khác | `422` gắn đúng `shiftEnd`, `shiftStart`, `commissionRate`, `branchId` |
| Phạm vi lễ tân | Lễ tân Q3 thấy đúng 3 người của Q3; tài khoản vừa cấp ở Q1 thấy đúng 4 người của Q1 | Đạt |
| Phân quyền | Lễ tân đọc được dịch vụ và nhân viên, ghi thì `403`; lễ tân cấp tài khoản `403`; **Superadmin đọc dịch vụ và nhân viên đều `403`** (BR-AUTH-030) | Đạt |
| Cách ly tiệm | Sửa dịch vụ của tiệm khác trả `404` chứ không `403` (BR-TENANT-013 bước 4); đổi tiệm sang Muse thì thấy đúng 3 dịch vụ và 2 nhân viên | Đạt |
| Hạn mức | Muse gói Basic: người thứ 6 bị `409 LIMIT_EXCEEDED`; cho một người nghỉ rồi thêm được; **nhận lại người cũ khi đã đủ 5/5 cũng bị `409`**; gửi `WORKING` cho người vốn đang làm thì `200`, không chặn oan | Đạt |
| Cấp tài khoản | Kỹ thuật viên `422`; lễ tân `201` kèm mật khẩu hiện đúng một lần; đăng nhập ngay được; cấp lần hai `422`; phiên tự nhận tiệm và đọc chi nhánh qua hồ sơ | Đạt |
| Quyết định 32 | Cho nghỉ việc → tài khoản `INACTIVE`; **phiên đang mở chết ngay request kế tiếp** (`401`); đăng nhập lại `403 ACCOUNT_NOT_ACTIVE`; nhận lại hồ sơ thì tài khoản **vẫn** `INACTIVE` | Đạt |
| Chặn ghi | Superadmin khóa tiệm Muse → chủ tiệm ghi `403 TENANT_READONLY`, đọc vẫn `200` | Đạt |
| Nhật ký | `ACCOUNT_CREATED` và `ACCOUNT_LOCKED` ghi đủ người thao tác, vai trò, IP, kèm `staffId` và `staffName` | Đạt |

#### Bốn điều chệch khỏi kế hoạch, có chủ đích

1. **Thêm `Staff.ChangeRole` và chặn đổi vai trò khi hồ sơ đã có tài khoản.** Kế hoạch không nhắc tới đổi vai trò, nhưng lệnh sửa hồ sơ phải nhận trường `role` thì mới là một `PUT` trọn vẹn. Để trống phép chặn thì một lễ tân có tài khoản đổi thành kỹ thuật viên sẽ để lại một tài khoản trỏ tới hồ sơ mà BR-AUTH-002 nói không được có tài khoản — đúng thứ `AppUser.AttachStaff` đã từ chối ngay từ lúc cấp.
2. **`StaffQuotaGuard` là một lớp riêng, không phải một hàm trong use case.** Hạn mức `max_staff` có hai đường vào — thêm mới và nhận lại người cũ — và ngày 5 đã trả giá cho việc để hai đường vào tự đếm lấy. Tách ra thì không có cách nào để chúng cho hai kết quả khác nhau.
3. **`RequestScope.ToActor()` thay cho hàm `Actor()` riêng của từng controller.** Chi nhánh của người thao tác nay quyết định lễ tân nhìn thấy ai, nên một controller quên gắn nó vào sẽ lặng lẽ nới quyền. Gom về một chỗ thì không còn chỗ để quên.
4. **`ListStaffUseCase` từ chối thẳng khi lễ tân không có chi nhánh**, thay vì mặc định cho xem cả tiệm. Đó là trạng thái dữ liệu hỏng — hồ sơ bị gỡ hoặc thuộc tiệm khác — và một lỗi dữ liệu không được biến thành một lần nới quyền.

### Việc còn treo sau ngày 7

| # | Việc | Mức |
|---|---|---|
| 1 | Ba việc treo sau ngày 6 chưa đụng tới: biểu đồ "Doanh thu đã thu" còn số bịa (**cần sửa**), `BranchCode` cứng ở 12 tệp (ngày 8), `TenantDetailModal` còn ~600 dòng biểu mẫu chết | Giữ nguyên |
| 2 | **Cấp, sửa, khóa tài khoản *chủ tiệm* vẫn chưa có endpoint.** Ngày 7 chỉ làm tài khoản *lễ tân*; `GET /api/accounts` vẫn chỉ đọc. Cấp tài khoản chủ tiệm hiện chỉ xảy ra bên trong giao dịch tạo tiệm | Chưa có lịch |
| 3 | `src/utils/authApi.ts` nay **không còn tệp nào import** — `src/services/auth.ts` đã thay thế trọn vẹn. Xóa được, chỉ cần gỡ hai dòng chú thích nhắc tên nó ở `apiClient.ts` và `auth.ts` | Thấp |
| 4 | Database demo lẫn thêm rác của phiên thử ngày 7: hồ sơ `Ngô Thị Kiểm Thử` (Lumiere) kèm tài khoản `kiemthu.ngay7@lumierehair.vn` đã vô hiệu, và bốn hồ sơ "Nhân viên hạn mức" ở Muse — tất cả đã chuyển `INACTIVE` nên không chiếm hạn mức, nhưng vẫn nên xóa database dựng lại trước khi bảo vệ | Thấp |
| 5 | §3.1 ghi "`DTOs/` chỉ có bảy tệp" — nay là chín. Vẫn dưới ngưỡng phải chia thư mục, nhưng con số trong tài liệu đã cũ | Thấp |
| 6 | `PUT /api/staff/{id}` là phép thay trọn hồ sơ: bỏ trống `email` trong thân request thì email trên hồ sơ bị xóa. Đúng ngữ nghĩa của `PUT` và giống hệt `PUT /api/branches/{id}`, nhưng ngày 9 phải nhớ gửi đủ trường | Ghi chú cho ngày 9 |

### Ngày 8 — xong

Bốn quyết định chốt đầu ngày, tất cả theo phương án khuyến nghị:

| # | Quyết định | Hệ quả |
|---|---|---|
| 34 | Thêm **`GET /api/tenants/me`** thay vì nhét thêm trường vào DTO phiên | Cổng chủ tiệm nhận đủ địa chỉ, hạn dùng và hạn mức; `TenantScopeDto` vẫn chỉ mang thứ tầng phân quyền cần ở mỗi request |
| 35 | Màn chi nhánh **giữ `BranchesPage`**, chỉ thay nguồn dữ liệu và đường ghi | Giữ được giao diện bảng và thẻ đã dựng; `branches` thành một ca đặc biệt trong hệ thống module chung |
| 36 | **Gỡ khỏi biểu mẫu và bảng** những ô máy chủ không lưu | Chi nhánh còn 5 ô thay vì 19; dịch vụ còn 6 ô thay vì 16 |
| 37 | Màn dịch vụ **sửa phẫu**, không dựng lại | Giữ bảng, thẻ, bộ lọc và ngăn chi tiết hiện có |

#### 🔴 Phát hiện quan trọng nhất: cổng chủ tiệm chưa bao giờ có tiệm thật

`App.tsx:295` gọi `useTenants(role === 'SUPERADMIN')`, còn `App.tsx:1290` lại tra `sessionTenant` **trong chính mảng của hook đó**. Chủ tiệm đăng nhập thật thì `tenants` rỗng → `targetTenant` là `undefined` → cổng rơi vào nhánh dữ liệu mẫu. Nghĩa là suốt từ ngày 4 tới hết ngày 7, **toàn bộ cổng Tenant Admin chạy bằng dữ liệu mẫu kể cả khi đã đăng nhập bằng tài khoản thật** — và không ai thấy, vì màn hình vẫn đầy số.

Kèm theo là một lỗi cụ thể: nút lưu chi nhánh gọi `onUpdateTenant(tenant.id, { branches })`, tức `PUT /api/tenants/{id}` — endpoint chỉ Superadmin có ô. Chủ tiệm bấm lưu sẽ nhận `403`.

**Backend — 1 endpoint mới:**

| Hạng mục | Kết quả |
|---|---|
| `GET /api/tenants/me` — hồ sơ tiệm của chính phiên. Use case `GetMyTenantUseCase`, dùng lại `TenantReadService.DescribeAsync` | Xong |
| Nhóm chức năng mới `Feature.OwnTenantProfile`, chỉ chủ tiệm có ô và chỉ mức đọc | Xong. Không đụng ô `Tenants` của Superadmin |
| `dotnet build` | **0 lỗi, 0 cảnh báo** |

**Frontend — 5 tệp mới, 6 tệp sửa:**

| Hạng mục | Kết quả |
|---|---|
| `src/services/branches.ts`, `src/services/salonServices.ts` — tầng gọi API cho hai nhóm endpoint | Mới |
| `src/hooks/useMyTenant.ts`, `useBranches.ts`, `useSalonServices.ts` — mỗi hook đặt cạnh màn dùng nó, nạp lại khi đổi tiệm | Mới |
| `App.tsx` — chuỗi tra tiệm theo tên và email của thời `localStorage` biến mất, kèm ba hàm nhận dạng chỉ phục vụ nó | Xong |
| `NailTenantAdminPortal` — `demoMode` mặc định tắt khi có tiệm thật; `branchDtoToNailRow` thay bản cũ; gỡ `pendingBranchChange` cùng hộp thoại "Bước xác nhận cuối" | Xong |
| `TenantAdminServices` — nguồn dữ liệu, ba đường ghi, biểu mẫu và bảng đều theo hợp đồng máy chủ | Xong |
| `npx tsc --noEmit` trên mã ứng dụng | **0 lỗi** |

**Kiểm chứng trên trình duyệt thật — tất cả đạt:**

| # | Phép thử | Kết quả |
|---|---|---|
| 1 | Cổng chủ tiệm hiện **tiệm thật** thay vì dữ liệu mẫu, ngay sau khi đăng nhập | Đạt |
| 2 | Màn chi nhánh hiện **5 chi nhánh thật** của Nailé Studio | Đạt |
| 3 | Hạn mức đếm **chỉ chi nhánh đang hoạt động** — 2/3, không phải 5/3 | Đạt |
| 4 | Thêm chi nhánh → lưu xuống máy chủ, danh sách nạp lại, huy hiệu 3/3 | Đạt |
| 5 | Thêm cái thứ tư → `409 LIMIT_EXCEEDED`, câu chữ máy chủ hiện nguyên văn, **biểu mẫu không đóng** | Đạt |
| 6 | Tên chi nhánh trùng → `422`, lỗi **gắn đúng ô "Tên chi nhánh"** | Đạt |
| 7 | Sửa tên + đổi trạng thái → `PUT` rồi `PATCH`, huy hiệu về 2/3 | Đạt |
| 8 | Màn dịch vụ hiện **9 dịch vụ thật**, nhóm là chuỗi tự do ("Sơn gel", "Combo") | Đạt |
| 9 | Thêm dịch vụ → `201`, danh sách nạp lại | Đạt |
| 10 | Tên dịch vụ trùng → lỗi máy chủ hiện trong biểu mẫu | Đạt |

#### Ba điều chệch khỏi kế hoạch, có chủ đích

1. **Phép kiểm hạn mức chi nhánh ở trình duyệt bị gỡ hẳn**, không chỉ sửa. Nó đếm cả chi nhánh đã ngừng hoạt động — thứ không chiếm hạn mức — nên chặn oan một tiệm còn chỗ. BR-BRANCH-005 đã được cưỡng chế ở máy chủ và trả `LIMIT_EXCEEDED` kèm câu chữ dùng được ngay; giữ một bản sao thứ hai chỉ là giữ một chỗ để hai bên nói khác nhau.
2. **`ServiceStatus` giữ lại `HIDDEN` và `DRAFT`** dù máy chủ không có. Ba màn mức C (`ReceptionistPortal`, `TenantAdminNailGallery`, `TenantAdminPayments`) đang import `serviceSeed` và so sánh với hai giá trị đó. Gỡ khỏi kiểu là phải sửa cả ba màn ngoài phạm vi ngày 8; đã ghi chú rõ trong kiểu rằng màn này không bao giờ sinh ra chúng nữa.
3. **`ServiceCategory` nới thành `string`.** Kéo theo `InvoiceServiceLine.category` ở `TenantAdminPayments` phải nới theo — một dòng, không đổi hành vi.

### Việc còn treo sau ngày 8

| # | Việc | Mức |
|---|---|---|
| 1 | **Biểu đồ "Doanh thu đã thu" ở màn Tổng quan vẫn là số bịa** — treo từ ngày 6, chưa đụng | **Cần sửa** |
| 2 | `BranchCode = 'Q1' \| 'Q3'` vẫn còn ở các màn mức C. Quyết định 26 hẹn ngày 8, nhưng ngày 8 đã tiêu hết thời gian cho hai màn chính | Trượt lịch |
| 3 | Cổng chủ tiệm còn nhiều màn mức C hiện số bịa cạnh dữ liệu thật: Tổng quan, Ghế & khu vực, POS, Báo cáo. Nay tiệm đã thật nên chỗ vênh dễ thấy hơn hẳn | **Cần sửa** |
| 4 | `TenantAdminServices` vẫn còn mã của thời dữ liệu mẫu ở ngăn chi tiết và bộ lọc — không hiện sai, nhưng đọc thì rối | Thấp |
| 5 | Database demo lẫn thêm rác của phiên ngày 8: chi nhánh `Chi nhánh Ngày 8 (đã sửa)` và dịch vụ `Sơn gel Nhật ngày 8`, cả hai đã chuyển sang ngừng hoạt động | Thấp |
| 6 | Cấp, sửa, khóa tài khoản **chủ tiệm** vẫn chưa có endpoint và chưa có lịch — treo từ ngày 7 | Chưa có lịch |

### Ngày 9 — xong

Bốn quyết định chốt đầu ngày, tất cả theo phương án khuyến nghị:

| # | Quyết định | Hệ quả |
|---|---|---|
| 38 | **Gỡ khỏi biểu mẫu và bảng** mười tám trường máy chủ không lưu | Màn nhân sự chỉ còn thứ tồn tại thật; kiểu `StaffMember` riêng biến mất, màn dùng thẳng `StaffDto` |
| 39 | Khóa lọc chi nhánh của cổng chủ tiệm **đổi hẳn sang mã định danh** | Gỡ luôn việc treo số 2 sau ngày 8 ở cổng chủ tiệm; ngày 10 và 11 không phải trả giá lần nữa |
| 40 | Mật khẩu lễ tân **do máy chủ sinh, hiện đúng một lần** | Không có ô mật khẩu trong biểu mẫu; có hộp thoại riêng kèm nút sao chép và lời cảnh báo |
| 41 | Đổi **trọn 16 tệp** khóa `localStorage` từ tên tiệm sang mã tiệm | Xong một lần, không còn hai quy ước đặt tên song song tới ngày 15 |

#### Vì sao tên tiệm không được làm khóa lưu trữ

Tên tiệm không phải định danh: chủ tiệm đổi tên lúc nào cũng được, và hai tiệm trùng tên là chuyện
bình thường. Hệ quả là hai lỗi chưa ai gặp nhưng chắc chắn sẽ gặp — đổi tên tiệm là mất sạch dữ liệu
cục bộ, và hai tiệm trùng tên dùng chung một ngăn ngay trên cùng một trình duyệt.

`src/utils/tenantStorage.ts` là nơi duy nhất dựng ra khóa. Phạm vi tiệm nằm ở tầng module chứ không
truyền qua prop, và đó là lựa chọn có chủ đích: phạm vi lưu trữ là một sự thật của **phiên**, giống
hệt nhau ở cả mười tám màn. Truyền xuống mười tám chỗ chỉ mở ra khả năng một màn bị quên, rồi màn đó
lặng lẽ ghi sang ngăn của tiệm khác — đúng loại lỗi mà lần đổi này đang đi vá. `App.tsx` gọi
`setTenantStorageScope` ngay trong thân hàm dựng, trước khi cổng con render lần đầu, nên không lần
render nào đọc nhầm phạm vi cũ.

**Frontend — 3 tệp mới, 22 tệp sửa:**

| Hạng mục | Kết quả |
|---|---|
| `src/services/staff.ts`, `src/hooks/useStaff.ts` — tầng gọi API và hook cho năm endpoint nhân viên của ngày 7 | Mới |
| `src/utils/tenantStorage.ts` — phạm vi và khóa `localStorage` theo mã tiệm | Mới |
| `TenantAdminStaff` — viết lại: nguồn dữ liệu, bốn đường ghi, biểu mẫu, bảng, thẻ, ngăn chi tiết, hộp cấp tài khoản | Xong |
| `NailTenantAdminPortal` — `branchDtoToNailRow` trả mã định danh; hộp chọn chi nhánh tách vai "chọn" khỏi vai "đọc"; gỡ hai phép chặn hạn mức nhân sự ở trình duyệt | Xong |
| `App.tsx` — ghi nhận phạm vi lưu trữ của phiên; xóa dữ liệu mẫu theo mã tiệm thay vì theo tên | Xong |
| 16 tệp còn lại — mọi khóa `localStorage` đi qua `tenantStorageKey` | Xong |
| `npx tsc --noEmit` trên mã ứng dụng | **0 lỗi** |

**Kiểm chứng trên trình duyệt thật — tất cả đạt:**

| # | Phép thử | Kết quả |
|---|---|---|
| 1 | Phiên cũ còn giữ chi nhánh `Q3` của thời dữ liệu mẫu → cổng tự mở lại hộp chọn chi nhánh thay vì lọc ra rỗng trong im lặng | Đạt |
| 2 | Ô chọn chi nhánh liệt kê **6 chi nhánh thật**; giá trị là `BRN-LUMIERE-Q3`, nhãn vẫn là tên chi nhánh | Đạt |
| 3 | Màn nhân sự hiện **4 hồ sơ thật** của Quận 3; đổi sang "Tất cả chi nhánh" thì thành 7 | Đạt |
| 4 | Cột "Tài khoản" phân biệt đúng ba trạng thái: *Đã cấp*, *Đã khóa*, *Chưa cấp*, và *Không áp dụng* cho kỹ thuật viên | Đạt |
| 5 | Thêm nhân viên với ca kết thúc trước ca bắt đầu → `422`, lỗi **gắn đúng ô "Kết thúc ca"**, biểu mẫu không đóng | Đạt |
| 6 | Sửa lại giờ rồi lưu → `201`, danh sách nạp lại, kỹ năng "Sơn gel" và email lưu đúng | Đạt |
| 7 | Cho nghỉ việc → `PATCH` `200`, hồ sơ chuyển sang khu "Nhân sự ngừng hoạt động" | Đạt |
| 8 | "Nhận lại" → `PATCH` `200`, hồ sơ về bảng chính ở trạng thái *Chưa vào ca* | Đạt |
| 9 | Biểu mẫu sửa mở lên đã có sẵn **đủ chín ô**, kể cả email — đúng thứ `PUT` toàn phần đòi hỏi | Đạt |
| 10 | Đổi vai trò sang lễ tân → `PUT` `200`; nút "Cấp tài khoản đăng nhập" xuất hiện ngay trong ngăn đang mở | Đạt |
| 11 | Cấp tài khoản → `201`, mật khẩu máy chủ sinh hiện đúng một lần kèm nút sao chép | Đạt |
| 12 | Sau khi cấp, nút cấp biến mất và ngăn chi tiết hiện email tài khoản kèm *Đang hoạt động* | Đạt |
| 13 | Cho người vừa cấp nghỉ việc → tài khoản chuyển sang **Đã bị vô hiệu hóa** ngay trên màn hình (quyết định 32) | Đạt |
| 14 | `localStorage` sau khi đi hết bảy màn mức C: **11 khóa, tất cả gắn `TEN-LUMIERE`**, không khóa nào còn gắn tên tiệm | Đạt |
| 15 | Tab sạch, tải lại từ đầu, đi vào màn nhân sự: **console không một lỗi nào** | Đạt |

#### Bốn điều chệch khỏi kế hoạch, có chủ đích

1. **Hai phép chặn hạn mức nhân sự ở trình duyệt bị gỡ hẳn**, giống cách ngày 8 xử hạn mức chi nhánh.
   Chúng đếm bằng `tenant.staffCount` — một con số chụp lúc nạp tiệm, không trừ người đã nghỉ việc — và
   một trong hai chặn ngay ở **cửa vào màn hình**, tức tiệm đủ người thì không xem nổi danh sách nhân
   sự của chính mình. BR-EMP-008 đã được cưỡng chế ở `POST /api/staff` và trả `LIMIT_EXCEEDED` kèm câu
   chữ dùng được ngay.
2. **Chấm công biến thành đổi trạng thái.** Hai nút "Bắt đầu ca" / "Kết thúc ca" cũ ghi một giờ vào
   `lastClockIn` / `lastClockOut` — hai trường không có cột nào ở database. Bốn trạng thái của
   BR-EMP-005 thì có thật, nên ngăn hồ sơ nay là bốn nút trạng thái, và "Cho nghỉ việc" đi qua hộp xác
   nhận riêng vì nó kéo theo vô hiệu hóa tài khoản.
3. **Hộp chọn chi nhánh tách `id` khỏi `code`.** Khi khóa lọc đổi sang mã định danh, thẻ chi nhánh hiện
   thẳng `BRN-D33DC9464FD1` ra cho người dùng — đúng giá trị, nhưng không phải thứ ai đó đọc để nhận ra
   chi nhánh của mình. Nay `id` là thứ được chọn, `code` là thứ được đọc.
4. **`inventorySync` và `tenantCustomers` bỏ hẳn tham số tên tiệm** thay vì đổi nó thành mã tiệm. Chúng
   đã có `tenantStorageKey` để hỏi, nên giữ tham số chỉ là giữ một chỗ cho người gọi truyền sai.

#### Một ghi chú về `.claude/launch.json`

Thêm cấu hình `salonsys-api` để bật backend ASP.NET Core từ trong công cụ, cạnh `salonsys-dev` đã có.
Thuần túy là tiện ích chạy máy, không đụng gì tới mã ứng dụng.

### Việc còn treo sau ngày 9

| # | Việc | Mức |
|---|---|---|
| 1 | **Biểu đồ "Doanh thu đã thu" ở màn Tổng quan vẫn là số bịa** — treo từ ngày 6, chưa đụng | **Cần sửa** |
| 2 | Cổng chủ tiệm còn nhiều màn mức C hiện số bịa cạnh dữ liệu thật: Tổng quan, Ghế & khu vực, POS, Báo cáo. Từ ngày 9 chúng còn **lọc theo mã chi nhánh thật nên trả về rỗng** khi đăng nhập thật — chỗ vênh nay lộ hẳn ra | **Cần sửa** |
| 3 | `BranchCode = 'Q1' \| 'Q3'` vẫn còn trong **kiểu** của các màn mức C. Cổng chủ tiệm đã hết phụ thuộc vào nó, nhưng cổng lễ tân thì chưa — dọn cùng ngày 14–15 | Trượt lịch |
| 4 | `TenantAdminServices` vẫn còn mã của thời dữ liệu mẫu ở ngăn chi tiết và bộ lọc | Thấp |
| 5 | Database demo lẫn rác của ba phiên thử: `Chi nhánh Ngày 8 (đã sửa)`, dịch vụ `Sơn gel Nhật ngày 8`, hồ sơ `Ngô Thị Kiểm Thử`, và hồ sơ `Lễ Tân Ngày 9` kèm tài khoản `ngay9@lumierehair.vn` — tất cả đã chuyển sang ngừng hoạt động nên không chiếm hạn mức, nhưng nên dựng lại database trước khi bảo vệ | Thấp |
| 6 | Cấp, sửa, khóa tài khoản **chủ tiệm** vẫn chưa có endpoint và chưa có lịch — treo từ ngày 7 | Chưa có lịch |

### Ngày 10 — xong → **Mốc ② đạt**

Bảy quyết định chốt đầu ngày, tất cả theo phương án khuyến nghị:

| # | Quyết định | Hệ quả |
|---|---|---|
| 42 | Tổng chi tiêu tính từ **hóa đơn đã trả đủ**, số lượt ghé là số hóa đơn ấy | Một câu `GROUP BY` cho cả danh sách. Cố ý khác công thức doanh thu ngày 16 (BR-REV-001 trừ tip) vì đây là "khách đã trả bao nhiêu", không phải "tiệm thu được bao nhiêu" |
| 43 | Endpoint thứ năm là **`GET /api/customers/{id}`**, trả hồ sơ kèm mười lần ghé gần nhất | Ngăn chi tiết có lịch sử dịch vụ **thật** ngay hôm nay thay vì chờ ngày 13 |
| 44 | **Gỡ khỏi biểu mẫu và bảng** mười lăm trường máy chủ không lưu | Biểu mẫu còn năm ô, đúng năm cột bảng `Customers` có. Dị ứng và lưu ý về móng dồn vào ô Ghi chú |
| 45 | **Bỏ hẳn chi nhánh** khỏi màn khách hàng | Chủ tiệm và lễ tân thấy đúng cùng một danh sách — BR-ISO-004, và là phép thử số 4 mà ngày 12 sẽ viết |
| 46 | Gỡ hai khối số liệu dựa vào lịch hẹn, **giữ nút "Đặt lịch"** | Nút chỉ còn truyền tên, số điện thoại và ghi chú; ngăn chi tiết dùng lịch sử hóa đơn thật thay cho khối lịch hẹn |
| 47 | Màn lịch hẹn **để nguyên, gắn dải nhãn "Dữ liệu mẫu"** | Đúng phạm vi ngày 10, và ngày 11 sẽ đụng vào chính màn đó. Dải nhãn là việc của ngày 18, kéo sớm về đây |
| 48 | `GET /api/customers` trả **toàn bộ**, lọc và phân trang ở trình duyệt | Cùng khuôn với chi nhánh, dịch vụ và nhân viên |

#### Vì sao khách hàng là module đầu tiên không có ranh giới chi nhánh

Bốn module trước đều có: chi nhánh là chính nó, dịch vụ dùng chung cả tiệm nhưng lập theo tiệm,
nhân viên thuộc đúng một chi nhánh và lễ tân chỉ xem được người của mình. Khách hàng thì khác hẳn —
BR-CUS-001 nói khách thuộc **tiệm**, và dữ liệu mẫu chứng minh vì sao: hồ sơ `CUS-LUMIERE-003` có
lịch sử trải trên cả hai chi nhánh Quận 1 và Quận 3 trong cùng một tháng. Lọc theo chi nhánh nghĩa là
lễ tân Quận 3 không tra được một khách vừa đến Quận 1 tuần trước, rồi lập cho họ một hồ sơ trùng —
đúng thứ mà ràng buộc số điện thoại duy nhất đang đi ngăn.

Đó cũng là lý do màn này là màn đầu tiên **không nhận `selectedBranch`** từ cổng, và cổng lễ tân phải
gọi nó bằng danh sách prop tường minh thay vì cụm `commonProps` dùng chung — cụm ấy mang theo
`branchLocked`, thứ mà ở đây sẽ lọc ra danh sách rỗng.

**Backend — 8 tệp mới, 2 tệp sửa:**

| Tầng | Hạng mục |
|---|---|
| Domain | `ICustomerRepository` mới, kèm hai bản ghi kết quả truy vấn `CustomerSpendSummary` và `CustomerVisit`. Không đụng `Customer`, `CustomerTierPolicy` hay `CustomerConfiguration` — cả ba đã dựng đủ từ ngày 2 |
| Application | `CustomerDtos`, `CustomerMapper`; lát cắt `UseCases/Customers/` (5 use case) |
| Infrastructure | `CustomerRepository` — chỗ **duy nhất** định nghĩa "khách đã chi bao nhiêu" |
| API | `CustomersController` |
| Quyền | Không thêm gì: ô `Customers` cho chủ tiệm và lễ tân đã có sẵn trong `PermissionMatrix` từ ngày 3 |
| Migration | Không có. Bảng `Customers` cùng chỉ số duy nhất `(TenantId, Phone)` đã dựng từ ngày 2 |
| Build | `dotnet build` — **0 lỗi, 0 cảnh báo** |

**5 endpoint, đúng ngân sách §9.1:**

| Endpoint | Nhóm quyền | Ghi chú |
|---|---|---|
| `GET /api/customers` | `Customers` | Chủ tiệm và lễ tân nhận **cùng một danh sách** — BR-CUS-001 |
| `GET /api/customers/{id}` | `Customers` | Kèm mười lần ghé gần nhất, đọc từ hóa đơn đã trả đủ |
| `POST /api/customers` | `Customers` ghi | BR-CUS-003 — chỉ số điện thoại là bắt buộc |
| `PUT /api/customers/{id}` | `Customers` ghi | Thay trọn hồ sơ, gồm cả đổi số điện thoại |
| `PATCH /api/customers/{id}/status` | `Customers` ghi | Không có động từ `DELETE`, BR-DEL-001 |

**Hai bẫy EF Core đã vấp và đã vá** — cả hai chỉ nổ lúc chạy, trình biên dịch im lặng:

1. `OrderBy(c => c.FullName ?? c.Phone.Value)` không dịch được. `CustomerConfiguration` đã cảnh báo
   đúng ca này từ ngày 2: không được gọi vào bên trong một value object đã đi qua bộ chuyển đổi.
   Thay bằng ba mệnh đề `ThenBy` so cả đối tượng.
2. `TotalsByCustomer(...).FirstOrDefault(row => row.CustomerId == id)` không dịch được: phép lọc nằm
   **sau** lệnh gom nhóm nên SQL Server phải lọc trên kết quả đã gom. Sửa bằng cách đẩy bộ lọc vào
   trước `GroupBy`, và để hàm gom nhận nguồn từ bên ngoài — nhờ vậy danh sách và ngăn chi tiết vẫn
   dùng chung đúng một phép gom, không thể nói hai con số khác nhau.

**Kiểm chứng qua HTTP thật — 52 phép thử, tất cả đạt:**

| Nhóm | Phép thử tiêu biểu | Kết quả |
|---|---|---|
| Danh sách | 20 khách mẫu, mỗi hồ sơ có hạng suy từ hóa đơn thật (3 Thân thiết, 17 Tiêu chuẩn) | Đạt |
| Ngăn chi tiết | Hồ sơ kèm 6 lần ghé thật, mỗi dòng có tên dịch vụ, tên chi nhánh, tên kỹ thuật viên và số hóa đơn; cắt đúng ở 10 dòng | Đạt |
| Thêm khách | Chỉ số điện thoại `201`; `0909 000 111` được chuẩn hóa thành `0909000111`; khách mới ở hạng `NEW`, 0 lượt | Đạt |
| Ràng buộc | Trùng số trong tiệm `422` gắn ô `phone`; số sai định dạng `422`; ngày sinh `03/04/1995` `422` gắn ô `birthDate`; bỏ trống số `422` | Đạt |
| Sửa hồ sơ | Lưu đủ năm ô; **bỏ trống `email` thì email bị xóa** — đúng ngữ nghĩa `PUT` toàn phần; đổi sang số của khách khác `422`; lưu lại mà không đổi số `200` | Đạt |
| Ngừng và bật lại | `PATCH` `200`; hồ sơ đã ngừng **vẫn còn trong danh sách** (BR-DEL-003); trạng thái `CARE` bị từ chối `422` (BR-CUS-005); không có động từ `DELETE` | Đạt |
| Phân quyền | **Superadmin đọc và ghi khách hàng đều `403`** (BR-AUTH-030); lễ tân đọc, thêm, sửa, ngừng đều được | Đạt |
| Cách ly tiệm | Lễ tân thấy **toàn bộ** khách của tiệm, đúng bằng số chủ tiệm thấy (BR-ISO-004); đổi sang Muse thì đọc và sửa hồ sơ của Nailé đều `404` chứ không `403` | Đạt |
| BR-CUS-002 | Cùng một số điện thoại tạo được ở **cả hai tiệm** — ràng buộc là ghép `(tiệm, số)` chứ không phải riêng số | Đạt |
| Chặn ghi | Superadmin khóa Muse → chủ tiệm ghi `403 TENANT_READONLY`, đọc vẫn `200` | Đạt |

**Frontend — 2 tệp mới, 5 tệp sửa:**

| Hạng mục | Kết quả |
|---|---|
| `src/services/customers.ts`, `src/hooks/useCustomers.ts` — tầng gọi API và hook cho năm endpoint | Mới |
| `TenantAdminCustomers` — viết lại: nguồn dữ liệu, ba đường ghi, biểu mẫu, bảng, thẻ, ngăn chi tiết kèm lịch sử hóa đơn thật | Xong |
| `NailTenantAdminPortal` — truyền `tenantId`, thôi truyền chi nhánh; `bookCustomerFromProfile` rút còn ba trường | Xong |
| `ReceptionistPortal` — màn khách hàng gọi bằng prop tường minh thay vì `commonProps`, và nhận `tenantId` từ phiên | Xong |
| `TenantAdminAppointments` — dải nhãn "Dữ liệu mẫu — chưa nối máy chủ" (quyết định 47) | Xong |
| `TenantAdminPortal` (mã chết) — bỏ hai prop chi nhánh cho khớp hợp đồng mới | Xong |
| `npx tsc --noEmit` trên mã ứng dụng | **0 lỗi** |

#### 🔴 Một vòng lặp gọi API, bắt được nhờ đọc nhật ký mạng

Ngăn chi tiết đứng mãi ở "Đang tải lịch sử...". Nhật ký mạng cho thấy hàng chục lời gọi
`GET /api/customers/CUS-LUMIERE-003` liên tiếp: hiệu ứng nạp lịch sử khai `directory` trong danh sách
phụ thuộc, mà `useCustomers` trả về một **đối tượng mới ở mỗi lần render**, nên hiệu ứng chạy lại sau
mỗi lần render — và chính nó gọi `setVisits`, nên vòng lặp tự nuôi mình.

Đáng chú ý vì màn hình **không báo lỗi gì**: nó chỉ hiện mãi dòng "đang tải", còn máy chủ vẫn trả
`200` cho từng lời gọi. Vá bằng cách khai đúng hàm `getCustomer` — thứ đã được `useCallback` giữ ổn
định — thay vì cả đối tượng. Sau khi vá: đúng **một** lời gọi cho mỗi lần mở hồ sơ.

Đây là bẫy chung của mọi hook trong dự án, không riêng hook này. Ba hook trước không vấp vì chúng chỉ
nạp trong hiệu ứng của chính mình, chưa hook nào bị một component khác đưa vào danh sách phụ thuộc.

**Kiểm chứng trên trình duyệt thật — tất cả đạt:**

| # | Phép thử | Kết quả |
|---|---|---|
| 1 | Cổng chủ tiệm: màn khách hàng hiện **24 hồ sơ thật**, kèm hạng, số lượt, tổng chi tiêu và ngày ghé gần nhất | Đạt |
| 2 | Bốn ô chỉ số đều là số thật: 20 đang hoạt động, 3 Thân thiết & VIP, 4 chưa phát sinh hóa đơn, 71.310.000 ₫ tổng chi tiêu | Đạt |
| 3 | Ngăn chi tiết hiện **10 lần ghé thật**, có dòng ở Quận 1 và dòng ở Quận 3 trong cùng một hồ sơ — bằng chứng sống cho BR-CUS-001 | Đạt |
| 4 | Thêm khách trùng số → `422`, câu chữ máy chủ **gắn đúng ô "Số điện thoại"**, biểu mẫu không đóng | Đạt |
| 5 | Thêm khách mới với số có khoảng trắng → `201`, số được chuẩn hóa, ngày sinh và ghi chú lưu đúng | Đạt |
| 6 | Biểu mẫu sửa mở lên đã có sẵn **đủ năm ô** — đúng thứ `PUT` toàn phần đòi hỏi | Đạt |
| 7 | Sửa tên và thêm email → `200`, danh sách nạp lại | Đạt |
| 8 | Ngừng hoạt động → tổng vẫn 25, số đang hoạt động về 20 (BR-DEL-003) | Đạt |
| 9 | Cổng lễ tân: thấy **đúng 25 hồ sơ**, bằng số chủ tiệm thấy, không lọc theo chi nhánh | Đạt |
| 10 | Lễ tân không có nút "Xuất danh sách"; thêm khách mới thì `201` | Đạt |
| 11 | Nút "Đặt lịch" chuyển sang màn lịch hẹn và điền sẵn **tên và số điện thoại thật** | Đạt |
| 12 | Màn lịch hẹn hiện dải nhãn "Dữ liệu mẫu — chưa nối máy chủ" | Đạt |
| 13 | Console không một lỗi JavaScript nào; chỉ có `401` của lần dò phiên trước khi đăng nhập và `422` của phép thử trùng số | Đạt |

**Mốc ② đạt:** dựng được trọn một tiệm bằng dữ liệu thật — tiệm → chi nhánh → dịch vụ → nhân viên →
tài khoản lễ tân → khách hàng.

#### Bốn điều chệch khỏi kế hoạch, có chủ đích

1. **Endpoint danh sách không có tham số `?query=`.** Quyết định 43 có nhắc tới nó, nhưng quyết định
   48 chốt lọc ở trình duyệt — giữ cả hai nghĩa là để lại một tham số không ai gọi. Việc "tra cứu
   theo số điện thoại" ở §9.1 vẫn có thật: nó nằm ở ô tìm kiếm trên danh sách đã nạp, và ở phép kiểm
   trùng số lúc tạo hồ sơ.
2. **`CustomerVisitDto` mang tên chi nhánh và tên kỹ thuật viên, không mang mã** — ngược quy ước của
   `StaffDto` ở ngày 7. Lý do: đây là bản đọc lịch sử, và bắt ngăn chi tiết nạp thêm hai danh sách chỉ
   để dịch vài dòng là ba lời gọi mạng cho một việc mà một phép nối đã làm xong.
3. **Chế độ dữ liệu mẫu thôi ghi xuống `localStorage`.** Khóa `tenant-admin-customers-v1` giữ hình
   dạng `TenantCustomer` cũ — thứ mang đủ mười lăm trường vừa bị gỡ. Giữ một đường ghi cho nó là dựng
   lại chính những trường ấy ở cửa sau. Nay chế độ mẫu giữ danh sách trong bộ nhớ của component, còn
   `src/utils/tenantCustomers.ts` ở lại nguyên vẹn cho màn lịch hẹn dùng (quyết định 47).
4. **Nhãn hạng `VIP Diamond` rút còn `VIP`.** "Diamond" là tên một chương trình khách hàng thân thiết
   không tồn tại — BR-CUS-008 nói rõ hạng khách không ảnh hưởng giá và không có điểm thưởng. Ba hạng
   còn lại giữ nguyên câu chữ cũ.

### Việc còn treo sau ngày 10

| # | Việc | Mức |
|---|---|---|
| 1 | **Biểu đồ "Doanh thu đã thu" ở màn Tổng quan vẫn là số bịa** — treo từ ngày 6, chưa đụng | **Cần sửa** |
| 2 | Cổng chủ tiệm còn các màn mức C hiện số bịa cạnh dữ liệu thật: Tổng quan, Ghế & khu vực, POS, Báo cáo. Màn Lịch hẹn nay đã có dải nhãn, bốn màn này thì chưa | **Cần sửa** |
| 3 | `BranchCode = 'Q1' \| 'Q3'` vẫn còn trong kiểu của các màn mức C, và `bookCustomerFromProfile` phải truyền cứng `'Q3'` vì hợp đồng của màn lịch hẹn còn đòi nó — dọn cùng ngày 11 và 14–15 | Trượt lịch |
| 4 | Hợp đồng `bookingRequest` của màn lịch hẹn còn khai `allergies`, `nailCondition`, `favoriteTechnician` là **bắt buộc**, nên hai cổng đang truyền chuỗi rỗng. Sửa hợp đồng ở ngày 11 khi màn ấy được nối | Thấp |
| 5 | `TenantAdminServices` vẫn còn mã của thời dữ liệu mẫu ở ngăn chi tiết và bộ lọc | Thấp |
| 6 | Database demo lẫn rác của bốn phiên thử; riêng ngày 10 thêm `Khách Ngày 10 (đã sửa)` và `Khách quầy ngày 10` ở Nailé cùng vài hồ sơ số `09xx` của bộ kiểm thử HTTP — tất cả đã chuyển sang ngừng hoạt động, nhưng nên dựng lại database trước khi bảo vệ | Thấp |
| 7 | Cấp, sửa, khóa tài khoản **chủ tiệm** vẫn chưa có endpoint và chưa có lịch — treo từ ngày 7 | Chưa có lịch |
| 8 | §3.1 ghi "`DTOs/` chỉ có bảy tệp" — nay là mười. Vẫn dưới ngưỡng phải chia thư mục, nhưng con số trong tài liệu đã cũ | Thấp |
| 9 | `saveTenantCustomers` ở `src/utils/tenantCustomers.ts` nay **không còn ai gọi** — màn khách hàng thôi ghi xuống trình duyệt. Kéo theo sự kiện `salonsys_customers_updated` mà màn lịch hẹn đang lắng nghe sẽ không bao giờ phát nữa. Vô hại, nhưng là mã chết; xóa cùng ngày 11 khi màn lịch hẹn được nối | Thấp |

### Ngày 11 — xong (phần backend)

Bốn quyết định chốt đầu ngày, tất cả theo phương án khuyến nghị:

| # | Quyết định | Hệ quả |
|---|---|---|
| 49 | Ngày 11 **chỉ làm backend**, đúng §4 và §5 | Màn lịch hẹn giữ dải nhãn "Dữ liệu mẫu" tới ngày 14. Ba việc treo số 3, 4 và 9 sau ngày 10 hẹn "sửa ở ngày 11" vì vậy trượt sang ngày 14–15 |
| 50 | Sửa lịch hẹn là phép **thay trọn** bằng `PUT`, không phải vá từng trường | Thêm `Appointment.Revise` — phương thức domain đầu tiên sinh ra ngoài ngày 2. Đổi được cả kỹ thuật viên và danh sách dịch vụ, đúng thứ biểu mẫu ở `ReceptionistPortal.tsx:1867` đang cần |
| 51 | `GET /api/appointments` nhận **khoảng ngày** `?from=&to=` | Endpoint đọc đầu tiên không trả trọn danh sách. Cố ý khác quyết định 48 của ngày 10: danh bạ khách có trần tự nhiên, lịch hẹn thì cộng dồn mãi |
| 52 | `SLOT_CONFLICT` gói đủ thông tin vào **`message`**, không mở rộng contract lỗi | Không đụng `ErrorResponse` mà cả chín module đang dùng, và không phải sửa `apiClient.ts` ở frontend |

#### Vì sao chi nhánh của lịch hẹn không nhận từ client

BR-EMP-003 cho mỗi nhân viên đúng một chi nhánh, nên chi nhánh của một lịch hẹn và chi nhánh của
người làm vốn là **một sự thật**. Nhận cả hai từ thân request là dựng ra chỗ để chúng nói khác nhau:
một lịch ghi ở Quận 1 trong khi người làm ngồi ở Quận 3, và bảng lịch của cả hai chi nhánh đều sai
theo hai hướng ngược nhau. `DemoDataSeeder` đã lấy chi nhánh theo đúng cách này từ ngày 2, nên đây
là chép lại một quyết định cũ chứ không phải một quyết định mới.

Hệ quả gọn hơn dự tính: phép thu hẹp theo chi nhánh cho lễ tân (BR-APT-002) chỉ cần chặn ở **bước
chọn kỹ thuật viên**. Lễ tân Quận 3 không chọn được người của Quận 1, nên họ cũng không tạo ra được
một lịch hẹn ở Quận 1 — kể cả bằng cách sửa một lịch cũ rồi đổi người làm.

**Backend — 14 tệp mới, 5 tệp sửa:**

| Tầng | Hạng mục |
|---|---|
| Domain | `IAppointmentRepository` mới; `AppointmentStatusText` mới; `Appointment.Revise` thêm vào entity; `AppointmentSchedulePolicy.BlockingSlot` thêm vào policy. Không đụng `AppointmentLifecyclePolicy` — bảng chuyển trạng thái dựng từ ngày 2 dùng được nguyên vẹn |
| Application | `AppointmentDtos`, `AppointmentMapper`, `SlotConflictException`; lát cắt `UseCases/Appointments/` gồm 5 use case cùng 2 khối dùng chung `AppointmentScope` và `AppointmentBookingGuard` |
| Infrastructure | `AppointmentRepository` |
| API | `AppointmentsController` |
| Quyền | Không thêm gì: ô `Appointments` cho chủ tiệm và lễ tân đã có trong `PermissionMatrix` từ ngày 3 |
| Migration | Không có. Bảng `Appointments`, `AppointmentServices` cùng bốn chỉ số đã dựng từ ngày 2 |
| Build | `dotnet build` — **0 lỗi, 0 cảnh báo** |

**6 endpoint, đúng ngân sách §9.1:**

| Endpoint | Ghi chú |
|---|---|
| `GET /api/appointments?from=&to=` | Thiếu tham số thì lấy hôm nay theo giờ Việt Nam. Trần 92 ngày một lần gọi |
| `GET /api/appointments/{id}` | Cùng hình dạng với một dòng của danh sách — lịch hẹn đã mang sẵn trọn nội dung của nó |
| `POST /api/appointments` | Trả `201` kèm `warnings` |
| `PUT /api/appointments/{id}` | Thay trọn, chạy lại đủ bộ kiểm tra của lệnh đặt mới |
| `PATCH /api/appointments/{id}/schedule` | BR-APT-025, cho thao tác kéo thả trên bảng giờ |
| `PATCH /api/appointments/{id}/status` | BR-APT-022, và cũng là đường hủy lịch (BR-APT-024) |

#### Chống trùng lịch chỉ có đúng một định nghĩa

BR-APT-011 nằm trong bốn thứ mà §6 đánh dấu tuyệt đối không cắt, nên điều kiện chồng lấn được viết
**một lần** ở tầng Domain rồi dùng lại ở cả hai nơi cần nó. Vướng mắc là EF Core không dịch được lời
gọi hàm C# nằm trong biểu thức truy vấn: `AppointmentSchedulePolicy.Overlaps(...)` chạy tốt trong bộ
nhớ nhưng không thành SQL được. Nếu để nguyên, kho dữ liệu buộc phải chép tay điều kiện ấy vào câu
LINQ của nó, và luật sẽ có hai bản ở hai tầng — bản thứ hai im lặng khi ai đó sửa bản gốc.

Cách xử: thêm `BlockingSlot(...)` trả về một **cây biểu thức** gộp cả BR-APT-011 lẫn BR-APT-012 và cả
phép loại chính lịch đang sửa. Kho dữ liệu chỉ việc đưa nó vào `Where(...)`, không viết lấy một vế
điều kiện nào. Cùng một luật, hai hình dạng, một chỗ để sửa.

**Kiểm chứng qua HTTP thật — 70 phép thử, tất cả đạt:**

| Nhóm | Phép thử tiêu biểu | Kết quả |
|---|---|---|
| Đọc | 169 lịch hẹn thật của Nailé trong 30 ngày seed; mỗi dòng có tên khách, số điện thoại, tên kỹ thuật viên, các dòng dịch vụ và `nextStatuses` tính từ sơ đồ §16.1 | Đạt |
| Khoảng ngày | Quá 92 ngày `422` gắn ô `to`; ngày kết thúc trước ngày bắt đầu `422`; múi giờ `+07:00` giữ nguyên qua database, không bị quy về UTC | Đạt |
| Mặc định hôm nay | Lúc máy chủ ở `27/08 17:59 UTC`, tức `28/08 00:59` giờ Việt Nam, lời gọi không tham số trả về đúng lịch của **ngày 28** — không phải ngày 27 như khi lấy ngày theo UTC | Đạt |
| BR-APT-010 | Hai dịch vụ 75+10 và 60+10 → lịch dài đúng 155 phút; chọn cùng một dịch vụ hai lần → 140 phút, không bị gộp làm một | Đạt |
| **BR-APT-011** | Đặt đè lên lịch có sẵn → `409 SLOT_CONFLICT`, câu chữ nói đủ **ai, mấy giờ, ngày nào, khách nào** và lỗi gắn đúng ô `startAt` | Đạt |
| So sánh nghiêm ngặt | Đặt đúng lúc lịch cũ kết thúc (11:10 sau 10:00–11:10) → `201`, hai lịch nối đuôi không bị coi là trùng | Đạt |
| **BR-APT-012** | Hủy lịch đang chiếm chỗ → đặt lại đúng khung giờ đó thì `201`. Trước khi hủy thì `409` | Đạt |
| BR-APT-005 | Đặt trong quá khứ → `201` kèm `warnings: [APPOINTMENT_IN_PAST]`, và bản ghi mang nhãn `isOverdue` | Đạt |
| BR-APT-013 | Đặt 07:00 cho người ca 09:00–18:00 → `201` kèm `OUTSIDE_SHIFT`; lịch vắt qua nửa đêm cũng bị tính là ngoài ca | Đạt |
| Hai cảnh báo | Vừa quá khứ vừa ngoài ca → cả hai cùng về trong một mảng, không cái nào nuốt cái nào | Đạt |
| Đầu vào | Không dịch vụ nào `422` gắn ô `services`; dịch vụ đã ngừng bán `422` kèm đúng tên; nguồn `FACEBOOK` `422`; cọc âm `422`; tạo thẳng ở `COMPLETED` `422` | Đạt |
| Sửa trọn | Lưu lại y nguyên `200`, **không tự báo trùng với chính mình**; đổi sang combo dài hơn thì đè lịch sau → `409`; đổi kỹ thuật viên sang Quận 1 thì chi nhánh của lịch **đi theo**; bỏ trống ghi chú và ghế thì hai trường ấy bị xóa | Đạt |
| Dòng con | Sau khi đổi từ 1 sang 2 dịch vụ, đọc lại thấy **đúng 2 dòng** — dòng cũ bị xóa hẳn, không thành rác | Đạt |
| Ghi hỏng | `PUT` bị `409` từ chối thì bản ghi giữ nguyên ghi chú và ghế cũ — không có phần nào lọt xuống database | Đạt |
| Dời lịch | Giữ nguyên 185 phút qua ba lần dời; dời lịch đang `IN_SERVICE` → `422` đúng lý do, không phải lý do trùng giờ | Đạt |
| BR-APT-022 | `PENDING → CHECKED_IN` bị từ chối; đi đúng đường `PENDING → CONFIRMED → CHECKED_IN → IN_SERVICE` thì `200`, và `nextStatuses` đổi theo từng bước | Đạt |
| BR-APT-040/041 | `IN_SERVICE → CANCELLED` `422`; `CANCELLED → CONFIRMED` `422`; sửa lịch đã hủy `422` | Đạt |
| BR-APT-026 | `IN_SERVICE → COMPLETED` `422` — "chỉ hoàn tất khi hóa đơn đã thanh toán đủ" | Đạt |
| BR-APT-024 | `DELETE /api/appointments/{id}` → `404`, không có động từ này | Đạt |
| **BR-AUTH-030** | Superadmin đọc danh sách, đọc chi tiết và đặt lịch đều `403` | Đạt |
| **BR-APT-002** | Lễ tân Quận 3 thấy 4 lịch của mình chứ không phải 10 của cả tiệm; mở lịch Quận 1 `404`; **đặt lịch cho kỹ thuật viên Quận 1 `404`**; sửa lịch Quận 1 `404`; đặt và đổi trạng thái trong chi nhánh mình thì `201`/`200` | Đạt |
| **Cách ly tiệm** | Ở Muse: đọc, sửa, đổi trạng thái lịch của Nailé đều `404` chứ không `403`; đặt lịch bằng khách của Nailé cũng `404`. Chiều ngược lại y hệt | Đạt |
| Chặn ghi | Superadmin khóa Muse → chủ tiệm đọc `200`, còn đặt lịch, đổi trạng thái và dời lịch đều `403 TENANT_READONLY` | Đạt |
| Nhật ký máy chủ | Không một lỗi nào trong suốt 70 lượt gọi | Đạt |

#### 🔴 Hai lỗi bắt được nhờ đọc kỹ câu chữ trả về

1. **Thông báo chuyển trạng thái hiện tên hằng số C#.** Lễ tân nhận được *"Không thể chuyển lịch hẹn
   từ Pending sang CheckedIn"* — vừa sai ngôn ngữ, vừa dùng những chữ không xuất hiện ở bất kỳ đâu
   trên màn hình. Trình biên dịch im lặng vì nội suy chuỗi trên một enum là hợp lệ. Vá bằng
   `AppointmentStatusText` đặt ở tầng Domain, câu chữ khớp với nhãn `StatusBadge` mà giao diện đang
   dùng, nên một lỗi từ máy chủ và một huy hiệu trên cùng màn hình không gọi một trạng thái bằng hai
   cái tên.

2. **Sửa một lịch đã hủy lại báo trùng giờ.** Phép chống trùng chạy trước phép kiểm trạng thái, nên
   câu trả lời là *"đã có lịch 09:30–10:40 với Cao Ngọc Diệp"* thay vì *"lịch đã hủy thì không sửa
   được"*. Trớ trêu ở chỗ khung giờ ấy trống ra được **chính vì** lịch này đã bị hủy. Vá bằng cách
   đưa phép kiểm trạng thái lên trước, giống thứ tự mà lệnh dời lịch đã làm sẵn từ đầu.

Cả hai đều là lỗi **câu chữ**, không phải lỗi hành vi: mã trạng thái HTTP đã đúng ngay từ lượt chạy
đầu. Chúng chỉ lộ ra khi đọc từng dòng thông báo thay vì chỉ đếm số phép thử xanh.

#### Bốn điều chệch khỏi kế hoạch, có chủ đích

1. **`PUT` bị chặn ở cả ba trạng thái cuối, không riêng `COMPLETED`.** BR-APT-023 chỉ nói tới lịch đã
   hoàn tất. Nhưng sửa một lịch đã hủy hoặc đã ghi khách không đến là dựng lại một lịch hẹn ở cửa
   sau: nó vẫn mang trạng thái cũ nên không chiếm chỗ của ai, mà nội dung thì đã thành một buổi hẹn
   khác hẳn — trong khi BR-APT-041 nói ba trạng thái ấy không quay lại được.
2. **`AppointmentDto` mang tên khách, số điện thoại và tên kỹ thuật viên**, ngược quy ước của
   `StaffDto` vốn chỉ trả mã. Cùng lý do đã dùng cho `CustomerVisitDto` ở ngày 10: đây là một bản
   đọc, và bảng lịch trong ngày phải hiện được tên khách ngay trên từng dòng. Bắt nó nạp trọn danh bạ
   khách của tiệm chỉ để dịch vài chục dòng là một lời gọi rất nặng cho việc mà một phép nối đã làm
   xong. Mã định danh vẫn trả kèm, vì đó mới là thứ dùng khi bấm vào.
3. **Các dòng dịch vụ sắp theo tên, không theo thứ tự người dùng chọn.** Bảng `AppointmentServices`
   không có cột thứ tự, nên thứ tự chèn không phải thứ mà một câu `SELECT` hứa trả lại. Sắp theo tên
   thì cùng một lịch hẹn luôn đọc ra giống nhau ở mọi màn hình.
4. **`AppointmentRepository.UpdateAsync` không gọi `db.Appointments.Update(...)`** như bốn kho dữ
   liệu trước. Hàm đó đánh dấu cả cây đối tượng là đã sửa, nên những dòng dịch vụ mà `Revise` vừa bỏ
   đi sẽ không được nhận ra là mồ côi và không bị xóa. Bản ghi đọc lên vốn đã nằm trong bộ theo dõi
   thay đổi, nên chỉ cần lưu là đủ.

#### Một khe hở đã biết và cố ý không vá

Giữa phép kiểm chống trùng và lệnh ghi còn một khoảnh khắc mà hai request đặt cùng giờ cho cùng một
kỹ thuật viên đều đi lọt. Bịt nó cần khóa hàng hoặc mức cô lập `SERIALIZABLE` — thứ mà §9.4 đã loại
mọi hạ tầng đồng thời khỏi phạm vi MVP, và một tiệm nail có đúng một quầy lễ tân. Ghi lại ở đây để
nếu hội đồng hỏi thì trả lời được rằng đây là chỗ đã cân nhắc, không phải chỗ chưa nghĩ tới.

### Việc còn treo sau ngày 11

| # | Việc | Mức |
|---|---|---|
| 1 | **Biểu đồ "Doanh thu đã thu" ở màn Tổng quan vẫn là số bịa** — treo từ ngày 6, chưa đụng | **Cần sửa** |
| 2 | Cổng chủ tiệm còn các màn mức C hiện số bịa cạnh dữ liệu thật: Tổng quan, Ghế & khu vực, POS, Báo cáo | **Cần sửa** |
| 3 | `BranchCode = 'Q1' \| 'Q3'` vẫn còn trong kiểu của các màn mức C, và `bookCustomerFromProfile` phải truyền cứng `'Q3'`. Ngày 11 chỉ làm backend (quyết định 49) nên việc này dời sang ngày 14–15 | Trượt lịch |
| 4 | Hợp đồng `bookingRequest` của màn lịch hẹn còn khai `allergies`, `nailCondition`, `favoriteTechnician` là bắt buộc. Dời sang ngày 14–15 cùng lý do trên | Thấp |
| 5 | `saveTenantCustomers` ở `src/utils/tenantCustomers.ts` không còn ai gọi — mã chết, xóa cùng ngày 14–15 | Thấp |
| 6 | `TenantAdminServices` vẫn còn mã của thời dữ liệu mẫu ở ngăn chi tiết và bộ lọc | Thấp |
| 7 | Database demo lẫn rác của năm phiên thử; riêng ngày 11 thêm mười một lịch hẹn ngày 26/08, 28/08 và 02–05/09 ở Nailé — **mười cái đã chuyển sang đã hủy**, còn `APT-46C6B5A2D0AF` kẹt ở `IN_SERVICE` vì BR-APT-040 không cho hủy và BR-APT-026 chưa có hóa đơn để hoàn tất. Nên dựng lại database trước khi bảo vệ | Thấp |
| 8 | Cấp, sửa, khóa tài khoản **chủ tiệm** vẫn chưa có endpoint và chưa có lịch — treo từ ngày 7 | Chưa có lịch |
| 9 | §3.1 ghi "`DTOs/` chỉ có bảy tệp" — nay là mười một. Vẫn dưới ngưỡng phải chia thư mục, nhưng con số trong tài liệu đã cũ | Thấp |
| 10 | `UseCases/Appointments/` có **7 tệp**, nhiều nhất trong các lát cắt. Vẫn là một nhóm trách nhiệm duy nhất nên chưa cần chia, nhưng là thư mục đầu tiên đáng để mắt | Thấp |

### Ngày 12 — xong

Bốn quyết định chốt đầu ngày, tất cả theo phương án khuyến nghị:

| # | Quyết định | Hệ quả |
|---|---|---|
| 53 | **Thay Vitest bằng xUnit + `WebApplicationFactory`** | Quyết định 6 ở §0 ghi "Vitest" — công cụ của JavaScript, không chạy được trên backend .NET, và là quyết định duy nhất của bản gốc chưa ai thay sau khi chuyển sang ASP.NET Core. Nay là **quyết định 6′** |
| 54 | Test chạy trên **LocalDB riêng, dùng lại `DemoDataSeeder`** | Đúng provider của lúc chạy thật; không phải viết bộ nạp thứ hai rồi giữ cho khớp với bộ nạp thật |
| 55 | **Kéo BR-INV-016 về ngày 12** | `SalesInvoice.Create` đòi tham số `code` bắt buộc, nên không có bộ sinh số thì không tạo được hóa đơn nào. Hai việc này không tách rời được như §5 giả định |
| 56 | **Làm khung hóa đơn trước, viết test sau** | Phép thử số 1 của §5 nhắc tới hóa đơn, mà endpoint hóa đơn phải tới nửa sau của ngày mới có. Đảo thứ tự để nó phủ đủ cả ba module ngay hôm nay |

#### Vì sao "Vitest" là quyết định duy nhất bị bỏ quên

§0 có một bảng "quyết định thay thế" liệt kê 2′, 3′, 11′, 12′ và 14′ — tất cả những gì đổi khi
backend chuyển từ Node sang ASP.NET Core. Quyết định 6 không có tên trong bảng ấy, nên nó sống sót
tới hôm nay dưới dạng một câu vô nghĩa: chạy Vitest trên một solution C#. Cùng số phận là câu
"SQLite trong bộ nhớ" ở §5 ngày 12 — SQLite đã bị quyết định 11′ thay bằng SQL Server LocalDB từ
ngày 1.

Đây là loại nợ tài liệu chỉ lộ ra khi có người thật sự làm tới ngày đó. Ghi lại vì §19 sẽ đọc lại
lộ trình một lượt, và vì hội đồng có thể hỏi tại sao tài liệu nói một đằng mã nguồn một nẻo.

---

### Phần 1 — Khung hóa đơn bán hàng

**Backend — 10 tệp mới, 6 tệp sửa:**

| Tầng | Hạng mục |
|---|---|
| Domain | `ISalesInvoiceRepository` mới; `SalesInvoiceStatusText` mới; `IBranchOwned` mới; `SalesInvoice` thêm `ClearLines`, `AssignStaff`, `UpdateNote`. Không đụng công thức tiền — `InvoiceMoneyPolicy` và toàn bộ gốc tổng hợp đã dựng đủ từ ngày 2 |
| Application | `SalesInvoiceDtos`, `SalesInvoiceMapper`, `BranchScope`, `SalonTime`; lát cắt `UseCases/SalesInvoices/` gồm 5 use case cùng khối dùng chung `SalesInvoiceLineBuilder` |
| Infrastructure | `SalesInvoiceRepository` |
| API | `SalesInvoicesController` |
| Quyền | Không thêm gì: ô `SalesInvoices` cho chủ tiệm và lễ tân đã có trong `PermissionMatrix` từ ngày 3 |
| Migration | Không có. Bốn bảng `SalesInvoices`, `SalesInvoiceLines`, `InvoicePayments`, `InvoiceCounters` đã dựng từ ngày 2 |

**5 endpoint. Hai cái còn lại của ngân sách 7 ở §9.1 — ghi nhận thu tiền và hoàn tiền — thuộc lát cắt thu tiền:**

| Endpoint | Ghi chú |
|---|---|
| `GET /api/sales-invoices?from=&to=` | Lọc theo **giờ lập**, không theo giờ thu: một hóa đơn thu làm nhiều lần có nhiều mốc thu |
| `GET /api/sales-invoices/{id}` | Kèm dòng hàng và dòng thu tiền |
| `POST /api/sales-invoices` | Hai đường vào: từ lịch hẹn (BR-INV-010) hoặc bán lẻ (BR-INV-011) |
| `PUT /api/sales-invoices/{id}` | Thay trọn, chỉ khi chưa thu đủ (BR-INV-015) |
| `PATCH /api/sales-invoices/{id}/status` | Chỉ nhận `CANCELLED` |

#### Ba trạng thái không đặt tay được, và vì sao phải nói rõ ra

BR-PAY-003 quy định `PENDING`, `PARTIAL`, `PAID` **suy ra từ tổng thu**. Cách dễ nhất là im lặng bỏ
qua chúng, nhưng khi đó người gửi `{"status":"PAID"}` nhận về một phản hồi 200 và một hóa đơn không
đổi gì — họ sẽ tưởng mình vừa làm sai thao tác. `ParseSettableStatus` vì vậy từ chối cả bốn giá trị
không hợp lệ bằng **ba câu chữ khác nhau**: ba trạng thái suy ra được thì giải thích chúng đến từ
số tiền đã thu; `REFUNDED` thì chỉ sang đường hoàn tiền vì nó cần số tiền và lý do; còn lại là
không có thật.

#### Đường dẫn là `/api/sales-invoices` chứ không phải `/api/invoices`

BR-INV-001 mở đầu bằng cảnh báo "hai bảng hóa đơn hoàn toàn tách biệt — không được nhầm". Một đường
dẫn mơ hồ ở đây là mời người đọc mã nhầm hóa đơn khách trả cho tiệm với hóa đơn tiệm trả cho
SalonSys, mà nhầm hai thứ đó là nhầm luôn ý nghĩa của mọi con số doanh thu.

**Kiểm chứng qua HTTP thật — 30 phép thử, tất cả đạt:**

| Nhóm | Phép thử tiêu biểu | Kết quả |
|---|---|---|
| Đọc | 33 hóa đơn thật của Nailé trong tuần seed; mỗi dòng có tên chi nhánh, tên khách, tên kỹ thuật viên, các dòng hàng và các dòng thu | Đạt |
| BR-INV-020 | Hóa đơn seed có tip: hàng 850.000 + tip 60.000 = tổng 910.000, thu 910.000, còn 0 | Đạt |
| BR-INV-016 | Ba hóa đơn liên tiếp trong ngày nhận `HD-20260828-001`, `-002`, `-003` — đúng định dạng, đúng ngày theo giờ tiệm, số tăng dần | Đạt |
| BR-INV-010 | Lập từ lịch đang `IN_SERVICE` → `201`; lập cho lịch `CANCELLED` → `422` kèm nhãn tiếng Việt "Đã hủy" | Đạt |
| Bấm hai lần | Lập lần thứ hai cho cùng lịch → `422` nói rõ **số hóa đơn đã có**, thay vì tính tiền khách hai lần | Đạt |
| **BR-APT-031** | Lịch có cọc 200.000 → hóa đơn sinh ra đã mang sẵn dòng `DEPOSIT/CASH 200.000`, trạng thái tự thành `PARTIAL`, còn lại 230.000 | Đạt |
| BR-SVC-007 | Dòng lấy **giá hiện tại** của dịch vụ: 250.000 và 180.000, không phải giá lúc đặt lịch | Đạt |
| **Giá không nhận từ client** | Gửi `unitPrice: 1` cho một dịch vụ có trong danh mục → hóa đơn ghi 120.000, đúng giá máy chủ | Đạt |
| BR-INV-011/012 | Hóa đơn bán lẻ trộn một dịch vụ và một dòng nhập tay; dòng nhập tay giữ nguyên giá client gửi | Đạt |
| BR-INV-021 | Giảm giá vượt tổng tiền hàng `422` gắn ô `discount`; công thức 675.000 − 50.000 + 30.000 = 655.000 | Đạt |
| Đầu vào | Không dòng nào `422`; không khách `422`; dòng nhập tay thiếu tên `422`; chủ tiệm không chọn chi nhánh `422` | Đạt |
| Sửa trọn | Đổi bộ dòng → tổng tính lại; **dòng cũ bị xóa hẳn, không thành rác**; bỏ trống ghi chú và kỹ thuật viên thì cả hai bị gỡ | Đạt |
| BR-INV-014/015 | Sửa hóa đơn `PARTIAL` được; sửa hóa đơn đã hủy `422` kèm nhãn "Đã hủy" | Đạt |
| **BR-PAY-003** | Đặt tay `PAID` `422`, `REFUNDED` `422`, `FAILED` `422` — ba câu chữ khác nhau | Đạt |
| BR-DEL-001 | `DELETE /api/sales-invoices/{id}` → `404`, không có động từ này | Đạt |
| **BR-AUTH-030** | Superadmin đọc và lập hóa đơn đều `403` | Đạt |
| **BR-ISO-004** | Lễ tân Quận 3 thấy 2 hóa đơn của mình chứ không phải 5 của cả tiệm; mở và sửa hóa đơn Quận 1 đều `404` | Đạt |
| Chi nhánh từ phiên | Lễ tân gửi `branchId` của Quận 1 → hóa đơn vẫn lập ở Quận 3, đúng chi nhánh trong phiên | Đạt |

---

### Phần 2 — Bộ kiểm thử tự động

**Project thứ năm: `NailManagement.Tests`, chia ba thư mục theo trách nhiệm.**

| Thư mục | Nội dung |
|---|---|
| `Infrastructure/` | `SalonSysFactory` dựng máy chủ thật trong bộ nhớ; `SalonSysClient` giữ cookie phiên; `SalonSysCollection` gom mọi lớp vào một bộ; `TestDatabase` là cửa sau cho đúng hai trạng thái API không dựng ra được |
| `Isolation/` | `TenantIsolationTests` — 6 phép thử |
| `Authorization/` | `SuperAdminBoundaryTests` (7), `ReceptionistScopeTests` (8), `ReadOnlyTenantTests` (3), `SessionRevalidationTests` (5) |

**`dotnet test` — 29 phép thử, 29 đạt, 3 giây.** *(Kết quả thật, nhưng chạy trên database demo chứ
không phải database riêng — xem ghi chú đỏ bên dưới. Các phép khẳng định vẫn có giá trị; thứ sai là
câu "chạy lại từ số 0".)*

#### Vì sao đi qua HTTP chứ không gọi thẳng use case

Bốn trong sáu kịch bản mà §5 liệt kê nằm ở **tầng HTTP**: `RequirePermission` là bộ lọc của MVC,
`TenantWriteGuardMiddleware` và `SessionMiddleware` là middleware. Gọi thẳng `ExecuteAsync` thì cả
ba đều không chạy, và bộ kiểm thử sẽ xanh trong khi hệ thống thật vẫn hở — đúng loại test tệ nhất,
loại tạo ra cảm giác an toàn sai. Chuỗi bốn bước của BR-TENANT-013 chỉ tồn tại khi request đi trọn
đường ống.

Cái giá phải trả: mỗi lần chạy tốn 3 giây thay vì vài phần trăm giây. Với 29 phép thử thì đó là
cái giá rẻ.

#### Vì sao LocalDB chứ không phải EF Core InMemory

*(Chữ "LocalDB" trong mục này là tên nền tảng lúc viết, ngày 13. Quyết định 11″ ngày 03/09 đã đổi sang SQL Server 2022 — lập luận bên dưới không đổi một chữ nào, vì nó so một **SQL Server thật** với InMemory chứ không so LocalDB với bản đầy đủ.)*

EF Core InMemory **không cưỡng chế chỉ số duy nhất và không có giao dịch thật**. Bộ kiểm thử sẽ
xanh ở đúng những chỗ đáng lẽ phải đỏ — ràng buộc số điện thoại duy nhất trong tiệm (BR-CUS-002),
số hóa đơn duy nhất (BR-INV-016), và giao dịch cấp số. Chính Microsoft khuyến cáo không dùng nó cho
test có tính thật.

Đổi lại, dùng LocalDB thì bộ kiểm thử **dùng lại được `DemoDataSeeder`**: máy chủ tự chạy migration
và nạp dữ liệu ngay lúc khởi động, đúng đoạn mã ở `Program.cs` mà lần chạy thật dùng. Bộ kiểm thử vì
vậy có sẵn hai tiệm và ba vai trò mà không cần một bộ nạp thứ hai để phải giữ cho khớp — thứ chắc
chắn sẽ lệch sau vài lát cắt.

Database test tên `NailManagementTests`, khác hẳn database chạy thật, và **bị xóa trước mỗi lần
chạy** nên kết quả không phụ thuộc vào lần chạy trước.

> 🔴 **Đoạn trên đúng về ý định nhưng SAI về thực tế, suốt từ ngày 12 tới cuối ngày 13.** Phép ghi
> đè chuỗi kết nối trong `SalonSysFactory` không bao giờ có tác dụng, nên bộ kiểm thử chạy thẳng
> vào **database demo**: `NailManagementTests` chưa từng được tạo ra. Xem "Lỗi bắt được lúc soát
> tài liệu" ở cuối ngày 13. Đã vá; câu trên nay mới thật.

#### 🔴 Một lỗ hổng thật, bắt được ngay ở lần chạy đầu tiên

Tài khoản bị khóa giữa phiên nhận về `401 UNAUTHENTICATED` thay vì `403 ACCOUNT_NOT_ACTIVE`. Sai
một dòng ở `GetCurrentAccountUseCase`:

```csharp
if (!user.IsActive())
    throw new UnauthenticatedException("Tài khoản đã bị khóa hoặc vô hiệu hóa.");
```

Nghe như chuyện nhỏ, nhưng nó **phá đúng cái vòng lặp mà ba chỗ khác trong mã nguồn đã viết ra để
ngăn**. Chú thích ở `ErrorCode` nói rõ: gặp `UNAUTHENTICATED` thì frontend đưa người dùng về màn
đăng nhập, còn `403` thì cố ý không. Chú thích ở `RequestScope.Rejection` và ở `SessionMiddleware`
đều nói lý do giữ lại nguyên nhân từ chối là để người bị khóa tài khoản *"không loay hoay đăng nhập
lại mãi không hiểu vì sao"*.

Hệ quả thật: người vừa bị khóa bị đá về màn đăng nhập → đăng nhập lại → `LoginUseCase` trả đúng
`403 ACCOUNT_NOT_ACTIVE` → nhưng frontend đã ở màn đăng nhập rồi, và họ chỉ thấy một thông báo lỗi
mà không hiểu vì sao vừa bị đá ra. Hai đường vào hệ thống trả lời **mâu thuẫn nhau** cho cùng một
tình huống.

Đáng chú ý ở chỗ: lỗi này **không thể phát hiện bằng cách bấm thử**, vì không có endpoint nào khóa
tài khoản chủ tiệm — đó là việc còn treo từ lát cắt nhân viên. Nó chỉ lộ ra khi có một phép thử
chạm được vào database. Đây chính là loại lỗi mà §0 mục 6 mua bộ kiểm thử này về để bắt.

Đã vá bằng `AccountNotActiveException`, và phép thử phủ cả hai trạng thái `SUSPENDED` lẫn
`INACTIVE`.

#### Ba điều chệch khỏi kế hoạch, có chủ đích

1. **Luật thu hẹp theo chi nhánh gom về `BranchScope`.** Trước hôm nay nó có hai bản chép ở
   `ListStaffUseCase` và `AppointmentScope`, và hóa đơn sắp thành bản thứ ba trong khi báo cáo doanh
   thu còn cần bản thứ tư. Kèm theo là `IBranchOwned` ở tầng Domain — em ruột của `ITenantOwned`,
   đánh dấu đúng ba dòng cuối của bảng BR-ISO-004. Khách hàng và dịch vụ cố ý không mang nó.
2. **Múi giờ tiệm gom về `SalonTime`.** Cũng sắp thành bản chép thứ hai. Dùng UTC ở đây là lỗi
   **im lặng và chỉ sai trong bảy tiếng mỗi ngày**: từ 0 giờ tới 7 giờ sáng giờ Việt Nam, UTC còn ở
   ngày hôm trước, nên bảng lịch hiện lịch hôm qua và số hóa đơn mang ngày hôm qua.
3. **Phép thử miễn trừ đổi mục tiêu.** §5 nêu hai nhóm miễn trừ là yêu cầu nâng gói và nộp chứng từ
   hóa đơn đăng ký — cả hai chưa có endpoint nào vì lát cắt gói đăng ký đã bị cắt (§0 mục 13). Phép
   miễn trừ **có thật** hôm nay nằm ở `AuthController`: đăng nhập, chọn tiệm, đăng xuất. Thiếu dấu
   miễn trừ ở đó thì chủ tiệm hết hạn không chọn được tiệm của mình, nên không vào nổi màn hình để
   đọc lý do bị khóa — hệ thống tự nhốt người dùng ở ngoài cửa đúng lúc họ cần vào nhất.

### Việc còn treo sau ngày 12

| # | Việc | Mức |
|---|---|---|
| 1 | **Biểu đồ "Doanh thu đã thu" ở màn Tổng quan vẫn là số bịa** — treo từ ngày 6 | **Cần sửa** |
| 2 | Cổng chủ tiệm còn các màn mức C hiện số bịa cạnh dữ liệu thật: Tổng quan, Ghế & khu vực, POS, Báo cáo | **Cần sửa** |
| 3 | `BranchCode = 'Q1' \| 'Q3'`, hợp đồng `bookingRequest`, và `saveTenantCustomers` chết — cả ba nằm ở frontend, dọn cùng ngày 14–15 | Trượt lịch |
| 4 | **Lịch hẹn không lưu khách đặt cọc bằng phương thức nào** — BR-APT-030 chỉ có một cột số tiền, nên dòng `DEPOSIT` sinh ra luôn ghi `CASH`. Sửa đúng thì phải thêm cột vào bảng lịch hẹn | Thấp |
| 5 | Endpoint **khóa tài khoản chủ tiệm** vẫn chưa có — treo từ ngày 7. Nay có thêm hệ quả: phép thử BR-AUTH-022 phải đi cửa sau vào database vì không có đường nào qua API | Chưa có lịch |
| 6 | `TenantAdminServices` vẫn còn mã của thời dữ liệu mẫu ở ngăn chi tiết và bộ lọc | Thấp |
| 7 | Database demo lẫn rác của sáu phiên thử; riêng ngày 12 thêm năm hóa đơn `HD-20260828-00x` và một lịch hẹn có cọc ở Nailé. Nên dựng lại database trước khi bảo vệ | Thấp |
| 8 | §5 ngày 12 vẫn ghi "SQLite trong bộ nhớ" trong phần mô tả công việc. §0 đã cập nhật bằng quyết định 6′, nhưng câu ở §5 thì chưa | Thấp |
| 9 | §3.1 ghi "`DTOs/` chỉ có bảy tệp" — nay là mười hai, và solution nay có **năm** project chứ không phải bốn | Thấp |

### Ngày 13 — xong

Hai quyết định chốt đầu ngày, cả hai theo phương án khuyến nghị. Khác mọi ngày trước, hai câu hỏi
này **không phải chuyện kỹ thuật** — chúng là hai chỗ tài liệu nghiệp vụ tự mâu thuẫn, và không
đọc mã nguồn nào trả lời được:

| # | Quyết định | Hệ quả |
|---|---|---|
| 57 | **Lịch hẹn `CHECKED_IN` thu đủ tiền cũng tự hoàn tất**, không riêng `IN_SERVICE` | BR-INV-010 cho lập hóa đơn từ cả lịch `CHECKED_IN`, nhưng sơ đồ §16.1 chỉ vẽ một mũi tên tới `COMPLETED` và nó xuất phát từ `IN_SERVICE`. Bám sơ đồ thì **lần thu tiền thất bại** với khách trả trước rồi mới làm. ⚠️ `README-BUSINESS-RULES.md` §16.1 cần thêm một hàng |
| 58 | **Chủ tiệm đóng được lịch `IN_SERVICE` kể cả khi chưa có hóa đơn nào** | BR-APT-027 chỉ nói tới ca hóa đơn còn `PARTIAL`. Ca tệ hơn hẳn là khách bỏ về không trả đồng nào: lịch chưa có hóa đơn, mà BR-APT-040 lại cấm hủy lịch đang phục vụ — không có đường này thì nó kẹt vĩnh viễn trên bảng lịch |

#### Vì sao hai điểm này chỉ lộ ra ở ngày 13

Cả hai đều là chỗ **hai luật viết ở hai mục khác nhau chạm nhau**. BR-INV-010 nằm ở mục 10 nói về
hóa đơn; sơ đồ §16.1 nằm ở mục 16 nói về vòng đời lịch hẹn. Mỗi mục tự nó nhất quán, và người đọc
từng mục một sẽ không thấy gì sai. Chúng chỉ chọi nhau khi có người viết đúng cái đoạn mã nối hai
mục ấy lại — mà đoạn mã đó chính là lát cắt thu tiền.

Đây cũng là lý do §7 của lộ trình xếp ngày 11 và ngày 13 vào loại "hai ngày đặc nhất".

---

### Phần 1 — Hai endpoint thu tiền

**Backend — 3 tệp mới, 7 tệp sửa. Không có migration:** bốn bảng `SalesInvoices`,
`SalesInvoiceLines`, `InvoicePayments`, `InvoiceCounters` đã dựng từ ngày 2, và ba cột mà ngày
hôm nay dùng tới — `InvoicePayments.Reason`, `Appointments.CompletedWithUnpaidBalance`,
`Appointments.Deposit` — đều đã có sẵn.

| Tầng | Hạng mục |
|---|---|
| Domain | `AppointmentLifecyclePolicy` thêm `CanCompleteFromPayment` và `CanForceComplete`; `Appointment.CompleteFromPaidInvoice` và `CompleteWithUnpaidBalance` hỏi hai luật đó thay vì hỏi bảng chuyển trạng thái chung. Không đụng `SalesInvoice` — `RegisterPayment` và `IssueRefund` đã dựng đủ từ ngày 12 |
| Application | `RecordPaymentUseCase` và `IssueRefundUseCase` mới; `SalesInvoiceDtos` thêm hai lệnh; `ChangeAppointmentStatusUseCase` viết lại để nhận `COMPLETED` |
| Infrastructure | **Không sửa gì.** `SalesInvoiceRepository` và `AppointmentRepository` đã có đủ hàm |
| API | `SalesInvoicesController` thêm hai endpoint và hai record request |
| Quyền | **Không thêm gì.** Hai ô `Refunds` và `ForceCompleteAppointment` đã nằm trong `PermissionMatrix` từ ngày 3, cố ý vắng mặt ở hàng lễ tân |

**Hai endpoint, cộng lại đúng ngân sách 7 ở §9.1:**

| Endpoint | Quyền | Ghi chú |
|---|---|---|
| `POST /api/sales-invoices/{id}/payments` | `SalesInvoices` | Ba việc trong một giao dịch: dòng thu, hóa đơn tính lại, lịch hẹn tự đóng |
| `POST /api/sales-invoices/{id}/refunds` | **`Refunds`** | Endpoint **duy nhất** trên tài nguyên này mà lễ tân nhận `403` |

#### Ba việc trong một giao dịch, và vì sao không tách ra được

Một lần bấm "Thu tiền" ở quầy kéo theo ba thay đổi: thêm dòng vào `InvoicePayments`, hóa đơn suy
lại trạng thái từ tổng thu (BR-PAY-003), và nếu vừa đủ tiền thì lịch hẹn tự `COMPLETED`
(BR-APT-026). Hỏng ở giữa thì hoặc tiền khách đưa biến mất khỏi hệ thống, hoặc hóa đơn ghi đã thu
đủ trong khi lịch hẹn vẫn treo ở "đang phục vụ" và ca sau tưởng khách còn ngồi đó. Rủi ro số 3 ở
§7 chỉ đúng chỗ này.

#### Ba thứ cố ý không nhận từ client

| Không nhận | Vì sao |
|---|---|
| `type` | Đường này luôn sinh dòng `PAYMENT`. `DEPOSIT` do tiền cọc chuyển sang lúc lập hóa đơn (BR-APT-031), `REFUND` đi đường riêng vì cần lý do và cần quyền khác |
| `paidAt` | Doanh thu ở BR-REV-001 đếm theo **tiền thực thu**, nên nhận mốc thời gian từ client là cho phép dời một khoản thu sang tháng khác — và người ở quầy sẽ không bao giờ biết con số báo cáo đã bị dời |
| `status` của hóa đơn | BR-PAY-003 — đã chặn từ ngày 12, hôm nay không mở lại |

#### Thu tiền cho một buổi hẹn đã hủy vẫn phải chạy

Lịch ở trạng thái cuối — đã hủy, hoặc khách không đến — thì `RecordPaymentUseCase` **bỏ qua bước
đóng lịch trong im lặng** thay vì ném lỗi. Hai lý do, và lý do thứ hai mới là lý do thật:

1. BR-APT-041 nói ba trạng thái cuối không quay lại được, nên ép một lịch đã hủy thành "hoàn tất"
   là ghi đè một quyết định người ở quầy đã chủ động đưa ra.
2. **Một lần thu tiền không được thất bại vì lịch hẹn nằm ở đâu.** Khách hủy buổi hẹn rồi vẫn trả
   tiền cho phần đã làm là chuyện có thật, và tiền họ đưa là có thật.

#### `POST .../refunds` chứ không phải `PATCH .../status` với `REFUNDED`

Hoàn tiền sinh ra một **chứng từ mới** — một dòng tiền có số tiền, phương thức và lý do — chứ
không phải đổi một ô trạng thái. `REFUNDED` chỉ là hệ quả. Đây cũng là câu trả lời cho câu chữ mà
`ParseSettableStatus` đã viết sẵn từ ngày 12: *"Hoàn tiền phải đi qua lệnh hoàn tiền để ghi nhận
số tiền và lý do."*

---

### Phần 2 — BR-APT-027, và một phép kiểm quyền không đặt được ở bộ lọc

Ngoại lệ của chủ tiệm đi vào **endpoint đã có** `PATCH /api/appointments/{id}/status`, không thêm
đường mới: §9.1 chốt module lịch hẹn đúng 6 endpoint và cả 6 đã dùng hết ở ngày 11.

Nhưng cùng một đường dẫn ấy còn là **đường hủy lịch mà lễ tân dùng cả ngày**. Gắn nhóm
`ForceCompleteAppointment` lên endpoint bằng thuộc tính `RequirePermission` sẽ khóa luôn đường hủy
lịch của họ — bộ lọc chạy *trước* khi thân request được đọc nên nó không phân biệt được hai việc.

Vì vậy phép kiểm quyền này nằm **trong use case**, là chỗ duy nhất trong toàn hệ thống mà
`PermissionMatrix` được hỏi ngoài tầng API. Đó là một ngoại lệ có giá, nên nó được ghi rõ ở cả hai
đầu: chú thích trong `ChangeAppointmentStatusUseCase` và chú thích ở `AppointmentsController`.

Phép thử `Le_tan_khong_dong_duoc_lich_hen_chua_thu_du` khẳng định **cả hai vế**: lễ tân gửi
`COMPLETED` nhận `403`, rồi cùng người đó gửi `CANCELLED` lên cùng đường dẫn phải nhận `422` của
luật vòng đời (BR-APT-040) chứ không phải `403` của phân quyền. Thiếu vế thứ hai thì một lần khóa
nhầm cả endpoint vẫn qua được bộ kiểm thử.

Câu chữ khi từ chối nói ra **đường đúng**, không chỉ nói không:

> Lịch hẹn tự hoàn tất khi hóa đơn thu đủ tiền. Đóng lịch khi chưa thu đủ là quyền của chủ tiệm.

---

### Phần 3 — Kiểm chứng

**`dotnet test` — 44 phép thử, 44 đạt, 5 giây** *(kết quả này chạy trên database demo; chạy lại lần
hai thì đỏ 6 — đó chính là cách lỗi cấu hình lộ ra, xem cuối ngày 13. Sau khi vá: xanh cả hai lần
liên tiếp trên database riêng)*. 15 phép thử mới nằm ở
`NailManagement.Tests/Payments/PaymentCollectionTests.cs`, thư mục thứ tư của project kiểm thử.

Mọi phép thử ở đó **tự dựng dữ liệu của mình** thay vì mượn bản ghi mẫu: thu tiền là thao tác một
chiều, hóa đơn đã thanh toán thì không sửa và không hủy được nữa (BR-INV-014). Mượn bản ghi mẫu là
để lần chạy thứ hai gặp một hóa đơn đã đóng và đỏ vì lý do không liên quan.

| Nhóm | Phép thử tiêu biểu | Kết quả |
|---|---|---|
| **BR-PAY-003 · BR-APT-026** | Thu hai lần: `PENDING → PARTIAL` (lịch **chưa** đóng) `→ PAID` (lịch tự `COMPLETED`). Kiểm cả ranh giới giữa hai bước, không chỉ trạng thái cuối | Đạt |
| **Quyết định 57** | Khách còn ở `CHECKED_IN` trả đủ tiền → thu được, lịch đóng lại | Đạt |
| BR-PAY-004 | Nửa tiền mặt nửa chuyển khoản → hai dòng `CASH` và `BANK`, đúng thứ tự | Đạt |
| BR-INV-011 | Hóa đơn bán lẻ không lịch hẹn → thu bình thường, không có gì để đóng | Đạt |
| Đầu vào | `PAYPAL` gắn ô `method`; số 0 và số âm gắn ô `amount`; hóa đơn đã hủy `422` | Đạt |
| **BR-PAY-007** | Lễ tân **thu được** 400.000 rồi **hoàn `403`** trên chính hóa đơn đó | Đạt |
| **BR-PAY-006** | Hoàn 200.000 → dòng `REFUND` mang `-200000` kèm lý do; `collected` còn 300.000 | Đạt |
| BR-PAY-008 | Hoàn khi chưa thu đủ gắn ô `status`; hoàn quá số đã thu gắn ô `amount`; thiếu lý do gắn ô `reason` | Đạt |
| §16.2 | `REFUNDED` là điểm cuối → hoàn lần hai `422` | Đạt |
| **BR-APT-027** | Lễ tân đóng lịch `403`, nhưng hủy lịch vẫn ra `422` của vòng đời; chủ tiệm đóng được, cờ `completedWithUnpaidBalance` bật | Đạt |
| **Quyết định 58** | Lịch chưa có hóa đơn nào vẫn đóng tay được | Đạt |
| Ranh giới | Chủ tiệm **không** đóng tắt được lịch mới `CHECKED_IN` — ngoại lệ chỉ dành cho buổi đã bắt đầu | Đạt |

**Kiểm chứng thêm qua HTTP thật trên database chạy thật — 9 phép thử, tất cả đạt.** Đây là những
thứ bộ kiểm thử tự động chưa chạm tới:

| Phép thử | Kết quả |
|---|---|
| **BR-AUTH-030** — Superadmin gọi cả hai endpoint mới | `403` cả hai |
| **BR-ISO-004** — lễ tân Quận 3 thu tiền hóa đơn Quận 1 | `404`, không phải `403` |
| **BR-ISO-002** — chủ tiệm đang ở Muse thu tiền hóa đơn của Nailé | `404` |
| Cùng chi nhánh | Lễ tân Quận 3 thu tiền hóa đơn Quận 3 → `201`, đúng như phải thế |
| **BR-AUD-002** — nhật ký `PAYMENT_RECEIVED` | Có, kèm `invoiceCode`, `method`, `amount`, `collected`, `remaining`, `invoiceStatus` |
| **BR-AUD-002** — nhật ký `REFUND_ISSUED` | Có, `amount` ghi **trị tuyệt đối** kèm lý do và `collected` sau khi hoàn |
| **BR-APT-031 + quyết định 57** | Lịch có cọc 200.000, hóa đơn 260.000 sinh ra đã `PARTIAL` còn 60.000; thu nốt bằng MoMo khi lịch còn `CHECKED_IN` → `PAID` và lịch `COMPLETED` |
| **Buổi hẹn đã hủy** | Hủy lịch rồi vẫn thu đủ tiền → hóa đơn `PAID`, lịch **giữ nguyên** `CANCELLED` |
| **BR-APT-027** | Lễ tân `403` kèm đúng câu chữ; chủ tiệm `200`, cờ `completedWithUnpaidBalance` bật |

#### Nhật ký ghi sau khi giao dịch chốt

Cùng khuôn đã dùng ở lát cắt nhân viên: `audit.RecordAsync` nằm **ngoài** khối giao dịch. Nằm
trong thì nó bị cuộn ngược theo khi có lỗi, và một dòng "đã thu tiền" cho khoản tiền chưa vào sổ
còn tệ hơn không có dòng nào.

Dòng `REFUND_ISSUED` ghi **trị tuyệt đối** chứ không ghi dấu âm của dòng tiền: người đọc nhật ký
hỏi "hoàn bao nhiêu", còn dấu âm là quy ước của bảng thu tiền để công thức doanh thu cộng dồn
được — không phải thứ cần lặp lại ở nhật ký.

### Việc còn treo sau ngày 13

| # | Việc | Mức |
|---|---|---|
| 1 | **Biểu đồ "Doanh thu đã thu" ở màn Tổng quan vẫn là số bịa** — treo từ ngày 6 | **Cần sửa** |
| 2 | Cổng chủ tiệm còn các màn mức C hiện số bịa cạnh dữ liệu thật: Tổng quan, Ghế & khu vực, POS, Báo cáo | **Cần sửa** |
| 3 | `BranchCode = 'Q1' \| 'Q3'`, hợp đồng `bookingRequest`, và `saveTenantCustomers` chết — cả ba nằm ở frontend, dọn cùng ngày 14–15 | Trượt lịch |
| 4 | **Lịch hẹn không lưu khách đặt cọc bằng phương thức nào** — BR-APT-030 chỉ có một cột số tiền, nên dòng `DEPOSIT` sinh ra luôn ghi `CASH`. Sửa đúng thì phải thêm cột vào bảng lịch hẹn | Thấp |
| 5 | Endpoint **khóa tài khoản chủ tiệm** vẫn chưa có — treo từ ngày 7 | Chưa có lịch |
| 6 | `TenantAdminServices` vẫn còn mã của thời dữ liệu mẫu ở ngăn chi tiết và bộ lọc | Thấp |
| 7 | Database demo lẫn rác của bảy phiên thử; riêng ngày 13 thêm bốn hóa đơn `HD-20260828-019…022` và bốn lịch hẹn thử ở Nailé, một trong số đó đặt ở tháng 3/2027. Nên dựng lại database trước khi bảo vệ | Thấp |
| 8 | `UseCases/SalesInvoices/` nay có **7 tệp**, ngang `UseCases/Appointments/`. Vẫn là một nhóm trách nhiệm duy nhất nên chưa cần chia, nhưng là thư mục thứ hai đáng để mắt | Thấp |
| 9 | `README-MIGRATION.md` vẫn mô tả Cloudflare Worker + D1 ở §8.1 và §11.2. Phần lớn là chủ đích — nó là tài liệu "điểm xuất phát" — nhưng câu "Đã có bảng trong D1" thì sai thẳng. Chưa sửa vì tài liệu này sắp hết vai trò sau ngày 15 | Thấp |

---

## Soát tài liệu — cuối ngày 13

Trước khi sửa BR-APT-027 ở §9.3, soát cả bốn tài liệu đối chiếu với mã nguồn thật. Tìm ra **12 chỗ
lệch**, đã sửa hết trong cùng phiên.

**Vì sao đáng ghi lại:** phần lớn không phải lỗi mới. Chúng là **hệ quả trễ của bốn quyết định thay
thế 2′, 3′, 11′, 12′** — cú đổi Node sang ASP.NET Core ngày 24/08. Mỗi ngày sau đó chỉ ghi nhận
đúng những con số mình vừa làm lệch (`DTOs/` bảy tệp, "SQLite trong bộ nhớ"), nên phần còn lại
trôi âm thầm suốt mười hai ngày. Đây chính là loại nợ mà §19 dự định phát hiện — bắt sớm hơn sáu
ngày.

| Mức | Chỗ | Đã sửa thành |
|---|---|---|
| 🔴 | `README-BUSINESS-RULES.md` bảng đầu: *"Node + Express + SQLite (Q1A)"* | ASP.NET Core 10 + EF Core + LocalDB, kèm ghi chú vì sao Q1A không còn hiệu lực |
| 🔴 | §20 hàng 15 vẫn ghi *"Copy tệp SQLite thủ công"* trong khi §14 đã sửa | `BACKUP DATABASE` trên LocalDB — hai mục nay khớp nhau |
| 🔴 | §3.4 thiếu hàng thứ 17 của ma trận | Thêm hàng **"Hồ sơ tiệm mình"** (`Feature.OwnTenantProfile`) kèm giải thích vì sao nó tách khỏi hàng "Tenant" |
| 🔴 | BR-APT-027 hẹp hơn §16.1 vừa sửa | Mở rộng cho cả ba ca chưa thu đủ; §16.1 sửa lại câu dẫn để hai mục không đá nhau |
| 🔴 | **Báo cáo doanh thu: 2 hay 4 chiều** — §0 nói đã cắt, bốn chỗ khác nói 4, §6 nói cắt là dự phòng | **Chốt giữ 4 chiều**, sửa §0 quyết định 13. Lý do: chiều nhân viên là nguồn hoa hồng BR-EMP-011, cắt nó là lỡ lời hứa ở ba chỗ |
| 🟡 | §3.1 liệt kê đúng những gì tồn tại ở ngày 4 | Dựng lại từ cây thư mục thật: **năm** project, 11 lát cắt use case, 11 controller, 47 endpoint, và project kiểm thử vốn thiếu hẳn |
| 🟡 | §7 rủi ro 3 khuyên bọc `BEGIN`/`COMMIT` của `node:sqlite` | Ghi đúng thứ đã làm: `IUnitOfWork` / `EfUnitOfWork` |
| 🟡 | §7 rủi ro 6 cảnh báo `node:sqlite` in cảnh báo experimental | Rủi ro không còn tồn tại; thay bằng rủi ro thật là máy người chấm phải có LocalDB |
| 🟡 | §8 giả định 4 buộc Node `>=22` vì `node:sqlite` | Còn `>=20.19`, và chỉ là ràng buộc của Vite 6 |
| 🟡 | Năm chỗ ở §1, §4, §5, §6, §9.6 vẫn ghi **Vitest** | Đổi sang **xUnit**. Các chỗ nhắc Vitest còn lại đều là lịch sử có chủ đích |
| 🟢 | Việc treo ngày 1 số 2: *"86 lỗi kiểu... ba màn lễ tân quên import — sẽ ném lỗi lúc chạy"*, mức **Cao**, chĩa vào ngày 14–15 | **Đã hết từ lúc nào không ai ghi.** `npx tsc --noEmit` nay sạch. Gỡ khỏi danh sách — một cảnh báo Cao sai sự thật chĩa vào ngày mai tệ hơn là không có |
| 🟢 | `CLAUDE.md` mô tả một kiến trúc **không còn tồn tại**: hai backend Cloudflare + Vite plugin, *"chỉ phủ auth"*, `bun.lock` còn đó | Viết lại phần backend cho đúng solution ASP.NET Core, thêm lệnh chạy máy chủ, và chỉ đúng khuôn `src/services/` + `src/hooks/` thay cho `src/utils/authApi.ts` |

### Một lỗi thật, không phải lệch tài liệu

`npm run lint` **không xanh**: `tsconfig.json` không khai `exclude` nên `tsc` quét cả
`claude-skills/` — một thư mục công cụ ngoài, đã gitignore — và báo 3 lỗi module. §5 ngày 20 đòi
lệnh này xanh. Đã thêm `exclude` cho `node_modules`, `dist`, `claude-skills`; **`npx tsc --noEmit`
nay trả về 0 lỗi.**

Kèm theo: danh sách treo ngày 1 gọi lệnh là `npm run lint:web`, script đó chưa bao giờ tồn tại.

### 🔴 Lỗi bắt được lúc soát tài liệu — bộ kiểm thử chạy vào database thật

Lượt soát tài liệu ở trên chỉ định sửa chữ. Nhưng lúc chạy lại `dotnet test` để xác nhận không làm
vỡ gì, **6 phép thử đỏ** — chính 6 phép thử vừa xanh vài giờ trước. Lỗi là `409 SLOT_CONFLICT`.

**Chẩn đoán, ba bằng chứng độc lập:**

| Kiểm tra | Kết quả |
|---|---|
| `sys.databases` trên LocalDB | Chỉ có `NailManagement`. **`NailManagementTests` chưa từng tồn tại** |
| Lịch hẹn tháng 12/2026 trong database **demo** | 6 — đúng số lịch hẹn mà bộ kiểm thử tạo |
| Dấu thời gian của 41 hóa đơn `HD-20260828-*` | Ba cụm cách nhau **vài giây**: `06:53:12–14`, `07:19:49–50`, `07:20:17–18` — vân tay của ba lần chạy `dotnet test` |

**Nguyên nhân — hai dòng, ở hai project khác nhau:**

`Program.cs` gọi `AddInfrastructure(builder.Configuration)` ngay dòng thứ hai, và
`Infrastructure/DependencyInjection.cs` đọc `GetConnectionString("Default")` **ngay lúc đăng ký
service**, giữ luôn chuỗi ấy trong closure của `UseSqlServer`. Trong khi `SalonSysFactory` ghi đè
bằng `ConfigureAppConfiguration` — một callback **bị hoãn tới `builder.Build()`**, tức chạy *sau*
khi giá trị đã bị đọc xong.

Chú thích ngay tại chỗ ghi đè viết *"Nguồn cấu hình thêm ở đây chạy SAU appsettings.json nên nó
thắng"*. Câu đó **đúng về thứ tự nguồn và sai về thời điểm** — và chính nó là lý do không ai nghĩ
tới việc kiểm lại.

**Cách vá:** đặt biến môi trường `ConnectionStrings__Default` trong hàm khởi tạo của factory, tức
trước cả khi host được dựng. `WebApplication.CreateBuilder` luôn nạp sẵn nguồn biến môi trường và
nguồn đó xếp trên `appsettings.json`, nên giá trị sẵn sàng đúng lúc dòng đọc kia chạy. Phép ghi đè
cũ giữ nguyên để phủ nốt những chỗ đọc cấu hình muộn hơn.

**Kiểm chứng, hai chiều:**

| Phép thử | Trước khi vá | Sau khi vá |
|---|---|---|
| `dotnet test` chạy **hai lần liên tiếp** | Lần một 44/44, lần hai **đỏ 6** | **44/44 cả hai lần** |
| `NailManagementTests` trong `sys.databases` | Không có | **Có** |
| Hóa đơn `HD-20260828-*` trong database demo | +9 sau mỗi lần chạy | **Đứng yên ở 41** sau hai lần chạy |

#### Vì sao đáng ghi lại

Đây đúng loại lỗi mà §0 mục 6 mua bộ kiểm thử về để bắt, chỉ khác là **lần này nạn nhân chính là bộ
kiểm thử**. Nó xanh 44/44 nên không ai nghi ngờ, trong khi hai điều nó tự nhận đều sai: chạy trên
database riêng, và không phụ thuộc lần chạy trước.

Nó cũng cho thấy vì sao **chạy một lần rồi kết luận là chưa đủ**. Một bộ kiểm thử ghi vào database
dùng chung vẫn xanh ở lần đầu tiên sau mỗi lần dữ liệu được dựng lại — và ngày 19 theo kế hoạch sẽ
dựng lại database, nên lỗi này có thể đã sống sót tới tận hôm bảo vệ, ẩn sau một dòng "44/44 đạt".

Cuối cùng, nó giải thích một việc treo đã ghi nhầm nguyên nhân: *"database demo lẫn rác của bảy
phiên thử"* — phần lớn không phải do bấm tay thử, mà là sản phẩm của chính `dotnet test`.

> **Rác đã sinh ra thì để nguyên**, không xóa tay: ngày 19 vốn là "xóa database, chạy lại migration
> + seed từ số 0" nên nó dọn sạch toàn bộ. Xóa tay bây giờ là làm trước một việc đã có lịch, và
> phải viết `DELETE` đụng vào bảng nhật ký — thứ BR-AUD-004 nói thẳng là không được sửa. Từ nay rác
> ngừng sinh thêm, và 6 lịch hẹn tháng 12/2026 không còn ảnh hưởng tới bộ kiểm thử nữa.

### Ngày 14 — xong (nửa đầu cổng lễ tân)

`ReceptionistPortal.tsx` — 5.476 dòng — nay chạy **lịch hẹn, nhân viên và bảng giá bằng dữ liệu
thật**. Màn thu tiền vẫn ở dữ liệu mẫu, đúng như §5 chia việc: ngày 15 mới tới lượt nó.

Làm đúng theo bốn bước mà §5 ngày 14–15 dặn: giữ nguyên cây render, thay chỗ khởi tạo state bằng
hook, thay hàm ghi bằng lệnh gọi service, và để yên state thuộc về giao diện.

**Frontend — 2 tệp mới, 9 tệp sửa:**

| Tầng | Hạng mục |
|---|---|
| Service | `services/appointments.ts` — 6 endpoint của ngày 11, là tầng đầu tiên có **khoảng ngày** và có **`warnings` bên cạnh `error`** |
| Hook | `hooks/useAppointments.ts` — bảng lịch của một ngày, bốn thao tác ghi, tất cả `reload()` sau khi thành công |
| Màn hình | `ReceptionistPortal` nối `useAppointments`, `useStaff`, `useSalonServices`, `useCustomers`; `ReceptionistTechnicians` đổi hai prop |
| Phiên | `DemoAccount` thêm `branchId`; `App.tsx` truyền `session.branch?.id` |
| Kiểu | `BranchCode` mở ở **8 tệp** — việc treo từ ngày 6 |

#### Lớp chuyển đổi, thay vì viết lại 5.476 dòng

Cây render đọc `appointment.start`, `appointment.duration`, `appointment.staff` ở hàng trăm chỗ.
Đổi nó theo hình dạng DTO là sửa từng chỗ ấy — dài, rủi ro cao, và không mua lại gì cho người
dùng. Nên có `toReceptionAppointment(dto, price, extras)`: một hàm mặc lại hình dạng cũ cho dữ
liệu mới, và toàn bộ giao diện không biết gì đã đổi.

Đi kèm là **`AppointmentExtras`** — tám trường mà máy chủ không có chỗ lưu: giờ bắt đầu thật, số
phút gia hạn, dị ứng, nhãn phân loại, nhắc lịch, người tạo. Không phải sơ suất của lược đồ: §9.4
bỏ hẳn nhắc lịch và ràng buộc dị ứng, còn giờ bắt đầu thật là khái niệm chỉ sống trong một ca làm
việc. Chúng ở lại `localStorage` theo mã lịch hẹn, thay vì bị nhét vào ô `note` của máy chủ — nhét
vào đó là biến một ô ghi chú cho người đọc thành một định dạng dữ liệu không ai khai báo.

Kỹ thuật viên đi theo cùng khuôn: **danh sách** từ API (bắt buộc, vì phân công cần mã nhân viên
thật), **chấm công** ở client (bảy trạng thái của quầy là chấm công, thứ §9.4 bỏ khỏi MVP).

#### Bỏ hẳn `setAppointments` — không còn vá mảng tại chỗ

Mười hai chỗ ghi cũ đều gọi API rồi để hook nạp lại. Đây là màn hình mà **hai máy ở quầy cùng mở
một lúc** là chuyện thường; vá tại chỗ thì máy này không bao giờ thấy lịch máy kia vừa đặt, và hai
người sẽ xếp hai khách vào cùng một giờ mà đều tin mình đúng.

Bỏ luôn state cũng biến trình biên dịch thành danh sách việc: `tsc` chỉ thẳng cả mười hai chỗ,
không sót chỗ nào.

---

### 🔴 Năm lỗi mà chỉ dữ liệu thật mới làm lộ ra

Đây là phần đáng giá nhất của ngày 14. Cả năm đều **xanh trên dữ liệu mẫu** và hỏng ngay khi dữ
liệu thật về — bốn trong số đó hỏng **trong im lặng**, không báo gì cả.

| # | Lỗi | Vì sao dữ liệu mẫu giấu được nó |
|---|---|---|
| 1 | **Vòng lặp vô hạn gọi API** — hơn 15 request giống hệt nhau trong chưa tới một giây | Một effect cũ ghi lịch hẹn xuống `localStorage` rồi phát sự kiện; chỗ nghe gọi `reload()`; nạp xong mảng có danh tính mới → effect chạy lại. Vòng này chỉ khép lại khi có một lần nạp mạng ở giữa |
| 2 | **Lọc chi nhánh bằng nhãn, dữ liệu mang khóa** — lọc `=== 'Q3'` trong khi DTO mang `BRN-LUMIERE-Q3` | Dữ liệu mẫu ghi thẳng `'Q3'` vào bản ghi nên luôn khớp. Hậu quả: bảng lịch và danh sách kỹ thuật viên **rỗng trơn, không báo lỗi** — trông hệt như "hôm nay không có khách" |
| 3 | **Lọc kỹ thuật viên theo kỹ năng khớp đúng tên dịch vụ** | Dữ liệu mẫu ghi kỹ năng trùng nguyên văn tên dịch vụ; hồ sơ thật ghi theo nhóm ("Gel", "Nail Art"). Ô chọn kỹ thuật viên rỗng, quầy không tiếp nhận được ai. ⚠️ Còn **trái BR-EMP-010** — kỹ năng chỉ để hiển thị, hệ thống không cưỡng chế |
| 4 | **Chặn cứng lịch ngoài ca** | ⚠️ Trái BR-APT-013 — ngoài ca là **cảnh báo, vẫn cho lưu**. Máy chủ đã trả `warnings` đúng như vậy. Khách quen nhờ làm nốt cuối ca là chuyện thường, mà quầy không có cách nào bỏ qua |
| 5 | **Dịch vụ mặc định của biểu mẫu là tên bịa** (`'Gel Manicure'`) | Thẻ `<select>` vẫn *hiển thị* mục đầu tiên vì không có gì khác để vẽ. Người dùng thấy "Chăm sóc da chân" đang chọn, bấm gửi, nhận về "dịch vụ không còn trong bảng giá" — một câu vô lý với thứ họ đang nhìn |

**Ba trong năm lỗi là luật nghiệp vụ bị chép ra client rồi chép sai** (số 3, 4, và bảng chuyển
trạng thái cũ). Cách chữa giống nhau: hỏi máy chủ thay vì chép. Sơ đồ trạng thái nay đọc từ
`nextStatuses` mà API gửi kèm từng lịch hẹn — tính từ đúng bảng BR-APT-022 ở tầng Domain — thay
cho một bảng ba dòng chép tay vốn đã sai với cả hủy lịch lẫn khách không đến.

---

### Kiểm chứng — chạy thật trong trình duyệt

| Phép thử | Kết quả |
|---|---|
| Bảng lịch nạp từ API | Lịch hẹn thật của Nailé hiện trên bàn lễ tân, kèm tên khách, tên kỹ thuật viên, tiền cọc |
| Vòng lặp gọi API | **2 request lúc tải, 0 request thêm trong 3 giây** — trước khi sửa là hơn 15 |
| Bảng giá | Tám dịch vụ thật của Nailé thay cho tám cái tên bịa |
| Kỹ thuật viên | "Nguyễn Thu Trang", "Trần Thị Mai" — hồ sơ thật, kèm trạng thái chấm công |
| **Tiếp nhận khách trọn luồng** | `POST /api/customers` (khách mới) → `POST /api/appointments` → `PATCH /{id}/status` CHECKED_IN → nạp lại. Hộp thoại đóng, không lỗi |
| **BR-APT-010** | Thẻ hiện **55 phút** cho dịch vụ 50 phút — máy chủ đã cộng 5 phút buffer, không phải con số "60 phút" người dùng chọn trên biểu mẫu |
| Đổi trạng thái | "Bắt đầu làm" → `PATCH /{id}/status` → thẻ chuyển sang "Đang phục vụ" |
| Guard "phải xếp ghế" | Chặn trước khi gọi API, đúng như thiết kế cũ — **không** có request nào bị bắn đi |
| Đối chiếu database | `APT-8B4BD13A3E54` · Khách Ngày 14 · Trần Thị Mai · `InService` · ghế M-05 · 18:50 |

`npm run lint` xanh, `dotnet test` giữ nguyên 44/44.

### Việc còn treo sau ngày 14

| # | Việc | Mức |
|---|---|---|
| 1 | **Màn thu tiền vẫn ở dữ liệu mẫu** — và tạm thời **không đóng lịch hẹn** sau khi thu. Cố ý: BR-APT-026 nói lịch chỉ hoàn tất khi hóa đơn THẬT chuyển `PAID`, còn lễ tân không có quyền đặt tay (BR-APT-027). Đánh dấu ở client trong khi máy chủ thấy khác là đúng loại nói dối lát cắt này đi sửa | Ngày 15 |
| 2 | Giá hiển thị trên thẻ lịch hẹn là **ước tính** cộng từ bảng giá hiện tại. Máy chủ không lưu giá trên lịch hẹn — BR-SVC-006 chốt giá lúc lập hóa đơn — nên con số thật chỉ có ở hóa đơn | Ngày 15 |
| 3 | Một lịch hẹn hiện chỉ mang **một dịch vụ** khi tạo từ quầy, dù API nhận nhiều. Biểu mẫu cũ chỉ có một ô chọn | Thấp |
| 4 | **Biểu đồ "Doanh thu đã thu" ở màn Tổng quan vẫn là số bịa** — treo từ ngày 6 | **Cần sửa** |
| 5 | Cổng chủ tiệm còn các màn mức C hiện số bịa cạnh dữ liệu thật: Tổng quan, Ghế & khu vực, POS, Báo cáo | **Cần sửa** |
| 6 | **Lịch hẹn không lưu khách đặt cọc bằng phương thức nào** — BR-APT-030 chỉ có một cột số tiền | Thấp |
| 7 | Endpoint **khóa tài khoản chủ tiệm** vẫn chưa có — treo từ ngày 7 | Chưa có lịch |
| 8 | `TenantAdminServices` vẫn còn mã của thời dữ liệu mẫu ở ngăn chi tiết và bộ lọc | Thấp |
| 9 | Database demo lẫn rác của các phiên thử; ngày 14 thêm khách `0977000014` và một lịch hẹn ở Nailé. Ngày 19 dựng lại từ số 0 | Thấp |
| 10 | `README-MIGRATION.md` vẫn mô tả Cloudflare Worker + D1 ở §8.1 và §11.2 | Thấp |

### Ngày 15 — xong → **Mốc ② mở rộng: quầy thu được tiền thật**

Nửa sau của cổng lễ tân. Màn thu tiền và sổ hóa đơn nay chạy bằng dữ liệu thật, và **chỗ ngày 14
cố ý để dở đã khép lại**: thu đủ tiền thì lịch hẹn tự hoàn tất, do máy chủ làm, trong cùng một
giao dịch với lần thu cuối.

**Frontend — 2 tệp mới, 1 tệp sửa:**

| Tầng | Hạng mục |
|---|---|
| Service | `services/salesInvoices.ts` — bảy endpoint của ngày 12 và 13 |
| Hook | `hooks/useSalesInvoices.ts` — sổ hóa đơn một ngày, bốn thao tác ghi |
| Màn hình | `ReceptionistPortal` nối `useSalesInvoices`; `toReceptionPayment` mặc lại hình dạng cũ; `executeFinalPayment` viết lại |

#### Ba lời gọi, và vì sao thứ tự có ý nghĩa

Một lần bấm "Xác nhận & Hoàn tất" ở quầy nay là ba lời gọi:

1. **`POST /api/sales-invoices` kèm `appointmentId`** — BR-INV-010. Gửi kèm mã lịch hẹn chứ không
   lập hóa đơn bán lẻ, vì chính mối nối ấy là điều kiện để BR-APT-026 đóng lịch khi thu đủ, và
   cũng là cách tiền cọc tự thành một dòng `DEPOSIT` (BR-APT-031).
2. **`PUT /api/sales-invoices/{id}`** — BR-INV-015. Bước này **bắt buộc** vì máy chủ dựng hóa đơn
   từ dịch vụ của lịch hẹn và **cố ý bỏ qua** `lines` mà client gửi kèm lệnh lập — để một hóa đơn
   không thể ghi tên dịch vụ khác với thứ khách đã đặt. Nhưng POS ở quầy còn thêm sản phẩm, phụ
   thu mẫu vẽ và các dòng gộp từ khách khác, nên chúng vào ở bước sửa.
3. **`POST /{id}/payments`**, một lời gọi cho mỗi phương thức — BR-PAY-004.

**Số tiền phải thu không do màn hình tự tính.** Sau bước 2, máy chủ trả `remaining` đã trừ sẵn
tiền cọc. Đây là điểm khác hẳn bản cũ, vốn tự cộng `subtotal − discount + tip − deposit` ở trình
duyệt: giữ phép tính ấy là dựng ra một công thức thứ hai cho cùng một con số, và ngày nó lệch với
máy chủ thì người ở quầy phát hiện ngay trước mặt khách.

#### Bấm hai lần không tạo hai hóa đơn

Trước khi lập, màn hình tìm hóa đơn đang mở của chính lịch hẹn đó và dùng lại. Máy chủ đã chặn hóa
đơn thứ hai bằng `422`, nhưng dùng lại thì người ở quầy không phải nhìn thấy lỗi nào cả — họ chỉ
thấy đúng hóa đơn cũ với phần còn thiếu. Đây cũng là đường đi khi khách trả làm nhiều lần.

#### `cashier` để trống, có chủ đích

DTO hóa đơn không mang tên người lập: máy chủ có lưu `CreatedByUserId` nhưng không gửi ra, và tên
người thu nằm ở nhật ký kiểm toán (BR-AUD-001). Điền tên người đang đăng nhập vào đó sẽ ghi sai
người cho mọi hóa đơn do ca trước lập — một lời nói dối im lặng trên chứng từ.

---

### 🔴 Một lỗi có sẵn chặn hẳn BR-PAY-004

Ô "Mã GD / Tên" của mỗi phần chia tiền ghi vào `payerName`, trong khi phép kiểm ở `submitPayment`
đọc `reference`:

```
if (item.method !== 'CASH' && !item.reference?.trim()) → "cần nhập mã giao dịch để đối soát"
```

Hai trường khác nhau, nên **chia tiền với bất kỳ phương thức nào không phải tiền mặt đều bất khả
thi**: gõ mã xong vẫn nhận đúng câu báo lỗi ấy, và không có cách nào qua được. BR-PAY-004 bị chặn
hẳn ở giao diện dù máy chủ hỗ trợ đầy đủ từ ngày 13.

Lỗi này **không phải do lát cắt hôm nay gây ra** — nó có từ trước, và chỉ lộ ra khi có người thật
sự bấm hết một luồng chia tiền. Bản dữ liệu mẫu không bao giờ chạm tới nó vì nó không gọi API nào,
nên không ai có lý do đi tới bước cuối.

Đã sửa: ô này nay ghi vào `reference` với mọi phương thức không phải tiền mặt, và giữ `payerName`
cho tiền mặt. Tên người trả **cố ý không gửi lên máy chủ** — cột `reference` ở đó dùng để đối
soát với sao kê ngân hàng (BR-PAY-005), nhét tên người vào là làm bẩn nó.

---

### Kiểm chứng — chạy thật, đối chiếu tới tận database

**Ca 1 — hóa đơn có tiền cọc, lịch còn `CHECKED_IN`** *(phủ BR-APT-031 và quyết định 57)*

| Bước | Kết quả |
|---|---|
| Bấm "Tạo HĐ" trên lịch của khách có cọc 200.000đ | Màn POS mở, hai dòng dịch vụ 250.000 + 180.000 |
| Xác nhận thu 230.000đ | `PUT /{id}` → `POST /{id}/payments` |
| Database | `HD-20260828-002` · `Paid` · tổng 430.000 |
| Dòng thu | `Deposit/Cash 200.000` (máy chủ tự sinh lúc lập) + `Payment/Cash 230.000` |
| **Lịch hẹn** | **`Completed`** — tự hoàn tất từ `CHECKED_IN`, đúng quyết định 57 |
| Cờ `CompletedWithUnpaidBalance` | `0` — không gắn nhầm nợ cho một hóa đơn đã trả đủ |
| Hóa đơn dùng lại | Lịch này đã có hóa đơn `PARTIAL` từ phiên thử ngày 12; màn hình **dùng lại nó** thay vì lập cái thứ hai |

**Ca 2 — chia tiền hai phương thức** *(phủ BR-PAY-004)*

| Bước | Kết quả |
|---|---|
| Chia 2 (50/50), tiền mặt + chuyển khoản, mã `FT-NGAY15-001` | Phép kiểm qua được — **trước khi sửa thì không** |
| Lời gọi | **Hai** `POST /{id}/payments` liên tiếp |
| Database | `HD-20260828-042` · `Paid` · tổng 260.000 |
| Dòng thu | `Payment/Cash 130.000` và `Payment/Bank 130.000` kèm mã giao dịch |
| **Lịch hẹn** | **`Completed`** — lần này từ `IN_SERVICE` |
| Giao diện | "Hôm nay: 3 lịch (2 xong)", doanh thu ca cộng đúng |

`npm run lint` xanh, `dotnet test` 44/44.

### Việc còn treo sau ngày 15

| # | Việc | Mức |
|---|---|---|
| 1 | **Biểu đồ "Doanh thu đã thu" ở màn Tổng quan vẫn là số bịa** — treo từ ngày 6 | **Cần sửa** |
| 2 | Cổng chủ tiệm còn các màn mức C hiện số bịa cạnh dữ liệu thật: Tổng quan, Ghế & khu vực, POS, Báo cáo | **Cần sửa** |
| 3 | `seedPayments()` và một phần `seedAppointments()` nay là **mã chết** — đã gắn nhãn, dọn ở ngày 18 | Thấp |
| 4 | Tên thu ngân trên hóa đơn hiện để trống; muốn hiện đúng thì DTO phải mang `createdBy`, hoặc màn hình đọc nhật ký kiểm toán | Thấp |
| 5 | Gộp hóa đơn nhiều khách (`mergedAppointmentIds`) chỉ còn là **nhãn hiển thị**: mọi dòng gộp vào một hóa đơn của khách chính, vì BR-CUS-004 buộc mỗi hóa đơn gắn đúng một hồ sơ khách | Thấp |
| 6 | **Lịch hẹn không lưu khách đặt cọc bằng phương thức nào** — BR-APT-030 chỉ có một cột số tiền | Thấp |
| 7 | Endpoint **khóa tài khoản chủ tiệm** vẫn chưa có — treo từ ngày 7 | Chưa có lịch |
| 8 | `TenantAdminServices` vẫn còn mã của thời dữ liệu mẫu ở ngăn chi tiết và bộ lọc | Thấp |
| 9 | Database demo lẫn rác của các phiên thử. Ngày 19 dựng lại từ số 0 | Thấp |
| 10 | `README-MIGRATION.md` vẫn mô tả Cloudflare Worker + D1 ở §8.1 và §11.2 | Thấp |

### Ngày 16 — xong → **Mốc ③ đạt: mạch demo chạy trọn bằng dữ liệu thật**

Đây là điểm mà lộ trình đánh dấu *"đồ án đã đủ để nộp"*. Từ Superadmin tạo tiệm, tới chủ tiệm dựng
chi nhánh — dịch vụ — nhân viên — khách, tới lễ tân đặt lịch, check-in, thu tiền, tới chủ tiệm mở
báo cáo doanh thu: **không còn khâu nào chạy dữ liệu mẫu.**

Hai quyết định chốt đầu ngày, cả hai theo phương án khuyến nghị:

| # | Quyết định | Hệ quả |
|---|---|---|
| 59 | **Chiều "dịch vụ" phân bổ theo tỉ lệ giá trị dòng** | Ba chiều đầu gắn thẳng vào dòng thu tiền, chiều thứ tư thì không: dịch vụ nằm ở dòng hàng còn tiền vào theo cả hóa đơn. Phân bổ theo tỉ lệ khiến **cộng bảng nào lại cũng ra đúng một con số** |
| 60 | **Một endpoint trả cả bốn chiều** | §9.1 dự trù 4. Nhưng bốn lời gọi là bốn lần quét cùng một khoảng dữ liệu, và tệ hơn — chúng có thể rơi vào hai phía của một lần thu tiền ở quầy, khiến bốn bảng trên cùng màn hình cộng ra bốn con số khác nhau |

#### Vì sao chiều thứ tư cần một quyết định riêng

BR-REV-001 chốt doanh thu theo **tiền thực thu**, và BR-REV-004 đòi bốn chiều. Ba chiều đầu —
ngày, chi nhánh, nhân viên — đều là thuộc tính của hóa đơn nên gắn thẳng được vào từng dòng thu.
Chiều "dịch vụ" thì không: một hóa đơn 430.000đ gồm hai dịch vụ mới thu 230.000đ thì mỗi dịch vụ
đã mang về bao nhiêu — **không rule nào trả lời**.

Ba cách đều có giá. Chỉ tính hóa đơn đã thu đủ thì tổng của bảng này thấp hơn ba bảng kia; tính
trọn dòng hàng thì cao hơn. Cả hai đều tạo ra đúng một câu hỏi mà không ai muốn nghe khi bảo vệ:
*"sao bốn bảng không khớp nhau?"*. Phân bổ theo tỉ lệ thì tổng các tỉ lệ bằng 1, nên **bốn bảng
luôn cộng lại ra cùng một con số** — và đó là tính chất đáng nêu chứ không phải một tình cờ.

---

### Backend — 5 tệp mới, 2 tệp sửa, không có migration

| Tầng | Hạng mục |
|---|---|
| Domain | `RevenuePolicy` — công thức BR-REV-001 thành hàm thuần; `IRevenueRepository` |
| Application | `RevenueDtos`; `UseCases/Reports/GetRevenueReportUseCase` |
| Infrastructure | `RevenueRepository` |
| API | `ReportsController` — một endpoint `GET /api/reports/revenue` |
| Quyền | Không thêm gì: ô `RevenueReports` cho chủ tiệm đã có trong `PermissionMatrix` từ ngày 3 |

#### Vì sao tách `IRevenueRepository` khỏi `ISalesInvoiceRepository`

Cùng đọc một bảng, nhưng trả lời hai câu hỏi khác hẳn. Cổng cũ phục vụ **sổ hóa đơn**: lấy theo
**giờ lập**, để quầy mở một hóa đơn ra thu tiền. Cổng mới phục vụ **báo cáo**: lấy theo **giờ
thu**, vì BR-REV-001 ghi nhận trên cơ sở tiền mặt và BR-REV-003 bắt hoàn tiền làm giảm doanh thu
tại ngày hoàn chứ không sửa lại ngày cũ.

Hai mốc ấy khác nhau thật: hóa đơn lập cuối tháng trước mà khách trả nốt đầu tháng này thuộc sổ
hóa đơn tháng trước và doanh thu tháng này. Gộp vào một cổng là mời người viết sau chọn nhầm mốc.

#### Cách trừ tip: theo tỉ lệ, không theo cục

BR-REV-001 viết *"trừ đi tip của các hóa đơn liên quan"*. Trừ nguyên cục thì phải chọn **một
ngày** để gánh toàn bộ tip của một hóa đơn thu làm nhiều lần — và ngày đó có thể ra doanh thu
**âm** trong khi tiệm vẫn thu được tiền. Trừ theo tỉ lệ cho ra đúng con số của BR-REV-001 khi hóa
đơn đã thu đủ (`Total × (Total − Tip) / Total = Total − Tip`), và mỗi ngày gánh đúng phần của
mình khi chưa.

---

### Frontend — 2 tệp mới, 2 tệp sửa

`services/reports.ts` và `hooks/useRevenueReport.ts` — hook **chỉ đọc** duy nhất của dự án, vì
doanh thu không phải thứ ai nhập vào mà là thứ suy ra từ tiền đã thu.

#### Màn báo cáo: bỏ hẳn phần bịa, không gắn nhãn cho nó

Trước ngày 16, chế độ dữ liệu thật **chặn toàn bộ** màn báo cáo bằng một khung trống — đúng lúc
đó, vì mọi con số trên trang đều dựng từ hằng số nhân với nhau: doanh thu gộp là `revenue / 0.967`,
hoàn tiền là phần dư của một phép trừ, tỉ trọng phương thức thanh toán là bốn số cố định
`42/28/18/12`.

Nay chế độ dữ liệu thật có **một trang riêng**: chỉ báo cáo doanh thu, bốn bảng phân rã, một dải
nhãn nói rõ template và lịch gửi định kỳ nằm ngoài phạm vi (BR-REV-006). Trang cũ giữ nguyên cho
chế độ trình diễn, nơi đã nói rõ là dữ liệu mẫu.

Vì sao không giữ phần đầu trang rồi gắn nhãn: mục tiêu kỳ, tỉ lệ tăng trưởng, công suất ghế và dự
báo chi phí vật tư đều cần dữ liệu mà hệ thống **cố ý không thu thập** — BR-REV-007 bỏ hẳn module
chi phí. Một con số bịa nằm cạnh một con số thật thì **cả hai cùng mất giá trị**, và người đọc
không có cách nào phân biệt.

---

### 🔴 Một lỗi cùng họ với ngày 14

Màn báo cáo gửi `branchId=Q3` lên API — **mã hiển thị**, trong khi API cần mã định danh chi nhánh
(`BRN-LUMIERE-Q3`). Kết quả: báo cáo trống trơn, và trông y hệt *"kỳ này không thu được đồng nào"*.

Đây đúng là lỗi số 2 của ngày 14 lặp lại ở một màn khác: ô chọn trên giao diện giữ mã hiển thị của
thời dữ liệu mẫu, còn dữ liệu thật mang khóa. Đã sửa bằng một prop riêng `activeBranchId`, và cổng
chủ tiệm chỉ truyền xuống khi mã ấy **thật sự có trong danh sách chi nhánh** — sai thì lùi về "cả
tiệm" thay vì trả rỗng.

---

### Kiểm chứng

**Backend qua HTTP thật:**

| Phép thử | Kết quả |
|---|---|
| **Bốn chiều cộng lại bằng nhau** | Tổng 8.590.000 · theo ngày 8.590.000 · chi nhánh 8.590.000 · nhân viên 8.590.000 · dịch vụ 8.590.000 — khớp tuyệt đối |
| **BR-REV-002** — loại tip | Tiền qua két 80.375.000 − doanh thu 77.734.999 = tip 2.640.001, đúng bằng con số báo cáo trả về |
| **BR-REV-003** — hoàn tiền | 1.200.000 đã tự trừ vào doanh thu, ghi riêng để đọc |
| **BR-EMP-011** — hoa hồng | Mỗi người một tỉ lệ riêng: 15%, 18%, 12% — nhân lúc hiển thị, không có bảng |
| **Ma trận mục 3.4** | Lễ tân `403`, Superadmin `403` (BR-AUTH-030) |
| Trần khoảng ngày | 366 ngày, vượt thì `422` gắn ô `to` |
| Lọc chi nhánh | Quận 1 riêng: 34.049.999 |

**Giao diện, tài khoản chủ tiệm Nailé, kỳ 01/07 – 28/08:**

Doanh thu 77.734.999₫ · 169 hóa đơn · 32 ngày · hai chi nhánh (43.685.000 + 34.049.999 = đúng
tổng) · năm dòng nhân viên kèm hoa hồng · bảng dịch vụ xếp theo doanh thu. Mọi con số khớp với
phản hồi API và với database.

`npm run lint` xanh, `dotnet build` 0 lỗi 0 cảnh báo, `dotnet test` 44/44.

### Việc còn treo sau ngày 16

| # | Việc | Mức |
|---|---|---|
| 1 | **Màn Tổng quan của chủ tiệm vẫn hiện số bịa** — biểu đồ "Doanh thu đã thu", thẻ KPI, "Dịch vụ được yêu thích". Nay đã có `GET /api/reports/revenue` để nối, nên việc này rẻ hơn hẳn trước | **Cần sửa** |
| 2 | Ba màn mức C khác của cổng chủ tiệm còn số bịa: Ghế & khu vực, POS, và tab Vận hành/Khách hàng/Nhân sự của Báo cáo | **Cần sửa** |
| 3 | `seedPayments()` và phần lớn `seedAppointments()` là mã chết — dọn ở ngày 18 | Thấp |
| 4 | Tên thu ngân trên hóa đơn để trống; DTO không mang `createdBy` | Thấp |
| 5 | **Lịch hẹn không lưu khách đặt cọc bằng phương thức nào** — BR-APT-030 chỉ có một cột số tiền | Thấp |
| 6 | Endpoint **khóa tài khoản chủ tiệm** vẫn chưa có — treo từ ngày 7 | Chưa có lịch |
| 7 | Sai số làm tròn của phép phân bổ: tối đa 1đ mỗi dòng, không tích lũy. Thấy được ở con số lẻ như 77.734.999 | Thấp |
| 8 | §9.1 ghi báo cáo doanh thu **4 endpoint**, thực tế là **1** — quyết định 60 | Thấp |
| 9 | Database demo lẫn rác của các phiên thử. Ngày 19 dựng lại từ số 0 | Thấp |
| 10 | `README-MIGRATION.md` vẫn mô tả Cloudflare Worker + D1 ở §8.1 và §11.2 | Thấp |

### Ngày 17 — xong: dọn số bịa

Ngày 17 vốn là **ngày đệm** sau khi lát cắt gói đăng ký bị cắt (§0 mục 13). Nó được dùng để đóng
việc treo số 1 và 2 — những màn hiện số bịa cạnh số thật — sau một lượt soát trước đó tìm ra chín
chỗ như vậy.

Việc này đáng làm ngay ở đây chứ không để tới ngày 19: từ ngày 16, các màn đã nối dữ liệu thật
khiến số bịa **mâu thuẫn ra mặt** trong cùng một cổng. Trước đó chúng chỉ là số bịa; nay chúng là
hai câu trả lời khác nhau cho một câu hỏi, và người xem không có cách nào biết câu nào đúng.

| Đã sửa | Trước | Sau |
|---|---|---|
| Chủ tiệm · Tổng quan · doanh thu | `128.450.000₫` ↑18,6% | **`67.581.666₫`** — thật, 30 ngày qua |
| Chủ tiệm · Tổng quan · lịch hẹn hôm nay | Trần Thu Hà, Lê Phương Anh… | Bùi Thu Hà, Khách Ngày 14 — lịch thật |
| Chủ tiệm · Tổng quan · nhân viên xuất sắc | Kim Ngân `32.450.000₫` | Trần Thị Mai `18.400.000₫` — từ `byStaff` |
| Chủ tiệm · Tổng quan · biểu đồ doanh thu | đọc sổ Thu–Chi ở `localStorage` | `byDay` của báo cáo doanh thu |
| Chủ tiệm · Tổng quan · hai khối dịch vụ | khung trống "không dùng số liệu mẫu" | `byService` thật, cả lượt lẫn doanh thu |
| Chủ tiệm · hạn mức chi nhánh | `6 / 3` — báo vượt hạn mức sai | **`2 / 3`** |
| Superadmin · doanh thu nền tảng | `86.353.000₫` | **`11.100.000₫`** — khớp database |
| Superadmin · nhật ký kiểm toán | `0` | **`300`** bản ghi thật do máy chủ ghi |
| Chủ tiệm · POS và Ghế & khu vực | số tiền không nhãn | dải nhãn "Dữ liệu mẫu" |
| Superadmin · phiên đăng nhập | `0` không nhãn | dải nhãn, nói rõ máy chủ vẫn quản phiên thật |

#### Backend — một endpoint đọc, không có migration

`GET /api/subscription-invoices`. Lát cắt gói đăng ký đã bị cắt nên đây **chỉ là phép đọc**:
không có lệnh nộp chứng từ, không có lệnh xác nhận thanh toán, không có luồng nâng cấp năm bước.
Nó tồn tại vì thiếu nó thì màn Tổng quan của Superadmin phải bịa ra con số doanh thu nền tảng — và
BR-REV-008 đã cảnh báo sẵn điều đó bằng đúng câu chữ: *"Dữ liệu mẫu hiện tại đang sai ngữ cảnh
này. Phải sửa khi seed database."*

**49 endpoint, 13 controller.**

#### 🔴 Một lỗi bắt được ngay khi kiểm chứng endpoint mới

Phép `Include(invoice => invoice.Tenant)` sinh ra INNER JOIN với bảng tiệm, mà bảng tiệm có bộ lọc
xóa mềm toàn cục — nên endpoint **đánh rơi 6 trên 11 hóa đơn**, đúng những hóa đơn của tiệm đã xóa
mềm. BR-INV-031 nói thẳng hóa đơn đăng ký **không bao giờ xóa được** vì nó là chứng từ tài chính;
giấu nó đi vì tiệm bị gỡ là làm mất đúng phần lịch sử mà rule ấy đi giữ.

Bỏ phép nối không mất gì: hóa đơn đã lưu sẵn `TenantName` và `PackageName`, chốt tại thời điểm lập
(BR-SUB-004) — và đó mới là thứ đúng để hiển thị trên một chứng từ.

#### Hóa đơn đăng ký: đổi nguồn, giữ nguyên đường ghi

`App.tsx` không còn khởi tạo `invoices` từ `INITIAL_INVOICES`, và **không còn ghi chúng xuống
`localStorage`** — giữ lại thì lần tải sau đọc bản chụp cũ đè lên dữ liệu máy chủ, và con số bịa
quay lại theo đúng con đường vừa đi chặn.

Bảy thao tác ghi của module gói đăng ký vẫn sửa mảng trong bộ nhớ như cũ. Module ấy đã bị cắt và
màn hình của nó đã mang dải nhãn dữ liệu mẫu; tải lại trang thì sửa đổi biến mất và sự thật của
máy chủ quay về — hành vi đúng cho một module chỉ để trình diễn.

#### Nhật ký kiểm toán: nối trước, gỡ sau

Màn "Bảo mật & nhật ký" nay đọc `GET /api/audit-logs`. Việc gỡ 19 lời gọi `recordAuditLog()` phía
trình duyệt vẫn để ở ngày 18, và **đúng thứ tự đó**: gỡ trước là để lại một màn trống trong khi
máy chủ vẫn đang ghi.

Bảng dịch mười loại sự kiện sang từ vựng của giao diện (`severity`, `status`, `category`) nằm gọn
trong `useAuditLogs`. Ba cột ấy là khái niệm **của riêng giao diện** — BR-AUD-002 chốt danh sách
sự kiện chứ không phân loại chúng — nên có đúng một chỗ dịch, thay vì rải phép đoán khắp màn hình.

---

### 🟡 Một chỗ tôi báo sai ở lượt soát

Tôi đã ghi *"badge Quản lý Tenant hiện 1 trong khi có 6 tenant"*. **Sai** — badge ấy là
`pendingUpgrades + expiringSalons`, tức badge **cảnh báo**, không phải phép đếm tenant. Nó đang
chạy đúng. Không sửa gì, và ghi lại đây để §19 không đi tìm một lỗi không tồn tại.

### Kiểm chứng

| Phép thử | Kết quả |
|---|---|
| `npm run lint` · `npm run build` | Xanh |
| `dotnet build` · `dotnet test` | 0 lỗi · 44/44 |
| Endpoint mới | 11/11 hóa đơn, 4 đã thu = `11.100.000₫` — khớp truy vấn SQL trực tiếp |
| Màn Tổng quan chủ tiệm | Bốn thẻ, biểu đồ, hai khối dịch vụ, hai danh sách đều là dữ liệu thật |
| Doanh thu nền tảng | `11.100.000₫` trên giao diện, khớp database |
| Nhật ký kiểm toán | 300 bản ghi (trần của endpoint), thay cho 0 |
| Hạn mức chi nhánh | `2 / 3`, khớp thanh bên |

#### Một chuyện đáng ghi về công cụ

Sau vài lần sửa nhanh liên tiếp vào cùng một tệp, **Vite phục vụ bản dịch cũ của đúng một dòng**
trong khi các dòng khác của cùng tệp đã mới. Nhãn "Tỷ trọng trong tháng hiện tại" vẫn hiện dù mã
nguồn trên đĩa đã đổi, và `location.reload()` không chữa được. Chỉ khởi động lại dev server mới
dứt điểm. Đáng nhớ khi kiểm chứng bằng mắt: **một thay đổi không thấy trên màn hình chưa chắc là
một thay đổi sai**.

### Việc còn treo sau ngày 17

| # | Việc | Mức |
|---|---|---|
| 1 | Gỡ 19 lời gọi `recordAuditLog()` ở `App.tsx` và 1 ở `DataBackup.tsx` — nay đã nối màn đọc nên gỡ được | Ngày 18 |
| 2 | `seedPayments()`, `seedAppointments()`, `INITIAL_INVOICES` là mã chết | Ngày 18 |
| 3 | Bỏ USD: `convertMoney` và tỷ giá cứng ở `src/utils/money.ts:5` | Ngày 18 |
| 4 | §3.1 của lộ trình lệch một lát cắt sau mỗi ngày làm. **Đề xuất bỏ hẳn các con số đếm** khỏi mục ấy | Thấp |
| 5 | `ReceptionistPortal.tsx` nay **6.178 dòng**, tài liệu ghi ~5.400 | Thấp |
| 6 | Tab Vận hành / Khách hàng / Nhân sự của Báo cáo vẫn là dữ liệu mẫu — đã có dải nhãn ở trang dữ liệu thật | Thấp |
| 7 | Endpoint **khóa tài khoản chủ tiệm** vẫn chưa có — treo từ ngày 7 | Chưa có lịch |
| 8 | Tên thu ngân trên hóa đơn để trống; phương thức đặt cọc; sai số làm tròn 1đ | Thấp |
| 9 | Database demo lẫn rác của các phiên thử. Ngày 19 dựng lại từ số 0 | Thấp |
| 10 | `README-MIGRATION.md` vẫn mô tả Cloudflare Worker + D1 | Thấp |

---

### Ngày 18 — xong: bộ kiểm thử đợt 2, bỏ USD, gỡ nhật ký giả, dải nhãn dữ liệu mẫu

Bốn việc của ngày 18 không liên quan nhau về kỹ thuật nhưng cùng trả lời một câu hỏi: **những
gì hệ thống nói ra có đúng không.** Bộ kiểm thử giữ cho luật đừng lặng lẽ sai; bỏ USD gỡ đi một
tỷ giá bịa; gỡ `recordAuditLog()` bỏ những bản ghi kiểm toán do trình duyệt tự khai; dải nhãn
nói ra màn nào đang chạy số thật.

#### xUnit đợt 2 — **44 → 74 phép thử**, ba lớp mới

| Lớp | Giữ điều gì |
|---|---|
| `Appointments/BookingConflictTests` | BR-APT-010/011/012 — chống trùng lịch kỹ thuật viên |
| `Appointments/AppointmentLifecycleTests` | BR-APT-020/022/023/025/040/041 — sơ đồ chuyển trạng thái §16.1 |
| `Invoices/InvoiceMoneyTests` | BR-INV-020/021/022, BR-SVC-007, BR-APT-031, BR-PAY-003/008 |

Ba ranh giới đáng nói, vì mỗi cái đều là chỗ một lỗi **không tự lộ ra**:

- **Hai lịch nối đuôi nhau không phải là trùng.** Đổi `<` thành `<=` trong phép chồng lấn vẫn
  qua được mọi phép thử ném hai lịch chồng hẳn lên nhau, nhưng nó khóa mất khung giờ liền kề và
  kỹ thuật viên mất một suất khách mỗi lần.
- **Khoảng chiếm chỗ gồm cả thời gian dọn dẹp.** Quên phần này thì hệ thống vẫn nhận lịch, vẫn
  chống trùng, và chỉ sai đúng khoảng thời gian người làm cần để lau dọn giữa hai khách.
- **Hoàn đúng bằng tổng đã thu thì vẫn được.** Lát cắt thu tiền đã kiểm vế vượt trần một đồng;
  thiếu vế này thì một phép so `>=` viết nhầm chỗ `>` vẫn xanh, và tiệm mất khả năng hoàn trọn
  tiền cho khách khiếu nại — đúng tình huống mà việc hoàn tiền sinh ra để xử lý.

Mỗi phép thử từ chối đều khẳng định thêm rằng **bản ghi không đổi** sau khi bị từ chối. Một lỗi
ném ra *sau* khi đã ghi vẫn trả về đúng mã lỗi ấy, nên chỉ nhìn mã thì không phân biệt được.

##### `Scenarios/SalonScenario` — một bộ đếm khung giờ, không phải bốn

Phần dựng dữ liệu được tách khỏi `PaymentCollectionTests` thành thư mục riêng. Không phải để cho
đẹp: BR-APT-011 chặn cứng hai lịch chồng giờ của cùng kỹ thuật viên, và **mọi** lớp kiểm thử đều
chọn cùng một người đầu danh sách chi nhánh Quận 3. Bốn lớp giữ bốn bộ đếm riêng thì cả bốn cùng
xin khung giờ thứ nhất, thứ hai… và lớp chạy sau đỏ vì đụng lịch của lớp chạy trước — một phép
thử đỏ vì lý do không liên quan gì tới thứ nó kiểm. Bộ đếm phải là **một**.

Đặt ở `Scenarios/` chứ không nhét vào `Infrastructure/`: thư mục đó trả lời "làm sao nói chuyện
được với máy chủ", còn đây là "một buổi làm ở tiệm trông như thế nào".

#### Bỏ USD — bắt đầu từ kiểu, không phải từ tìm-thay

`CurrencyCode` thu về đúng một giá trị VND, và `tsc` trở thành danh sách kiểm: mọi chữ USD còn
sót lại đều thành lỗi biên dịch. Cách này bắt được cả những chỗ mà một lần tìm-thay sẽ bỏ qua —
ví dụ nhánh `if (currency === ...)` trong hàm rút gọn số của biểu đồ Tổng quan.

| Đã gỡ | |
|---|---|
| `convertMoney` và tỷ giá cứng `USD_TO_VND_RATE = 25000` | Xóa hẳn khỏi `src/utils/money.ts` |
| Ba ô chọn tiền tệ | Cấu hình hệ thống, Cài đặt tiệm, Hồ sơ tenant — nay là một dòng chỉ đọc |
| Ô chọn tiền tệ khi lập hóa đơn và khi soạn gói | Cùng với bước nhảy `0.01` của nhánh USD |
| Khối chú thích *"mỗi gói vẫn có thể dùng VND hoặc USD riêng"* | Câu này đã thành sai |
| Tham số `reportCurrency` của `platformRevenue` | Không còn gì để quy đổi |

**Giá dự phòng của gói chép từ máy chủ**, không tự đặt: `1.200.000 / 2.500.000 / 6.200.000 ₫`,
đúng bộ số ở `DemoSeedCatalog.cs`. Trước đó là `49 / 99 / 249` USD — giữ nguyên là để một màn
rơi về giá dự phòng hiện `49 ₫` cạnh một màn khác hiện `1.200.000 ₫` cho cùng một gói.

`formatMoney(amount, currency?)` **giữ tham số thứ hai** dù chỉ còn một đơn vị: 86 chỗ gọi đang
truyền cột tiền tệ của bản ghi vào đó, và sửa hết cho một thay đổi không đổi gì trên màn hình là
đổi rủi ro lấy sự gọn gàng. Kiểu đã hẹp lại nên không ai truyền được đơn vị khác vào nữa.

#### Nhật ký kiểm toán — gỡ **28** lời gọi, không phải 19

Lộ trình ghi *"19 chỗ ở `App.tsx` và 1 ở `DataBackup.tsx`"*. Đếm thực tế: **28 lời gọi ở 7 tệp**
(`App.tsx` 5, `DataBackup` 8, `HelpAndSupport` 6, `SecurityAndLogs` 4, `SuperAdminAnnouncements`
2, `SystemSettings` 1, `TenantAdminHelpAndSupport` 2). `src/utils/auditLogs.ts` nay xóa hẳn.

##### 🔴 Lỗi ghi đè bảng nhật ký — bắt được khi soát phạm vi

`SecurityAndLogs` đăng ký listener `AUDIT_LOGS_UPDATED_EVENT`, và handler gọi `setLogs` với mảng
đọc từ `localStorage`. Nghĩa là **bấm "Xuất CSV" ngay trên chính màn nhật ký** sẽ thay 300 bản
ghi thật của máy chủ bằng một dòng do trình duyệt vừa ghi. Ngày 17 nối màn đọc đã tạo ra đường
này mà không ai thấy: trước đó cả hai đầu đều là `localStorage` nên ghi đè là chuyện bình thường.

Chữa bằng cách bỏ bản sao trong state — danh sách đọc thẳng từ `useAuditLogs`, không còn chỗ cho
ai ghi đè. Kiểm chứng bằng cách phát lại đúng sự kiện cũ: **300 → 300**, trước đây sẽ còn 1.

##### Nút "Dọn log hết hạn" — bỏ hẳn

Nó **đếm** trên danh sách đang hiển thị (nay là dữ liệu máy chủ) nhưng **xóa** trên
`localStorage`, nên sau ngày 17 nó báo "đã dọn N bản ghi" rồi không dọn được gì mà người dùng
nhìn thấy. Bỏ chứ không sửa: BR-DEL-001 không cho xóa cứng, nhật ký kiểm toán là thứ ít được
phép xóa nhất, và máy chủ chưa có endpoint dọn theo chính sách lưu trữ — nút này không có đường
nào đi tới sự thật.

#### Dải nhãn "Dữ liệu mẫu" — một bảng ở nơi định tuyến, không rải vào từng màn

Ba cổng, ba bảng `MOCK_DATA_REASONS` đặt cạnh chỗ chọn màn hình: `App.tsx` (8 màn),
`NailTenantAdminPortal` (11 màn), `ReceptionistPortal` (2 màn). Lý do không rải
`<MockDataNotice />` vào từng tệp: dải nhãn phải xuất hiện ở **cùng một chỗ** trên mọi màn, và
"màn nào chưa nối" là sự thật của cả cổng chứ không của riêng từng tệp — nối xong một màn thì
xóa đúng một dòng, không phải đi tìm dải nhãn nằm lẫn trong một tệp vài nghìn dòng.

Bốn màn **giữ nhãn riêng** vì nhãn của chúng nói về một phần chứ không cả trang: `stations`,
`pos`, `reports` (chỉ tab Vận hành / Khách hàng / Nhân sự là mẫu, tab Doanh thu là thật), và tab
Phiên đăng nhập của màn Bảo mật. `PackageUpgradeRequests` nhận thêm `showMockDataNotice` để
không chồng nhãn khi nó nằm trong màn Hóa đơn đã có nhãn của trang.

Dải nhãn cũ viết tay trong `TenantAdminAppointments` được dời lên bảng, giữ nguyên ý câu chữ.

### Kiểm chứng

| Phép thử | Kết quả |
|---|---|
| `dotnet build` · `dotnet test` | 0 lỗi · **74/74**, chạy hai lượt liên tiếp cùng kết quả |
| `npm run lint` · `npm run build` | Xanh |
| Superadmin — 11 tab | 8 tab có nhãn, 3 tab dữ liệu thật không có nhãn, **0 chữ USD** |
| Chủ tiệm — 19 màn | 8 màn nhãn đúng nội dung của chính màn đó, màn đã nối không có nhãn |
| Lễ tân — 7 màn | Đúng 3 màn có nhãn (Sản phẩm quầy, Ghế & phòng, đối soát POS) |
| Nhật ký kiểm toán | 300 bản ghi thật; phát lại sự kiện ghi đè cũ → vẫn 300 |
| Console trình duyệt | Không lỗi |

### Việc còn treo sau ngày 18

| # | Việc | Mức |
|---|---|---|
| 1 | **Giảm giá âm lúc LẬP hóa đơn bị bỏ qua trong im lặng** — `CreateSalesInvoiceUseCase` chỉ gọi `ApplyDiscount` khi số tiền lớn hơn 0, nên `discount: -50000` cho ra hóa đơn đúng tiền nhưng người gửi không được báo là gõ sai. Đường **sửa** hóa đơn thì chặn đúng, và đã có phép thử. Cùng dạng với `SetTip` | Trung bình |
| 2 | Tham số `reportCurrency` vẫn được truyền qua 7 tệp dù chỉ còn một đơn vị tiền. Vô hại nhưng là ống dẫn chết | Thấp |
| 3 | `general.currency` và `BrandInfo.currency` vẫn nằm trong mô hình cài đặt dù không còn ô chọn | Thấp |
| 4 | Hai màn khóa theo gói (Kho vật tư, Vệ sinh & an toàn) chưa xem được dải nhãn bằng tài khoản Premium — cùng cơ chế với 8 màn đã kiểm | Thấp |
| 5 | §3.1 của lộ trình lệch một lát cắt sau mỗi ngày làm. **Đề xuất bỏ hẳn các con số đếm** khỏi mục ấy | Thấp |
| 6 | Tab Vận hành / Khách hàng / Nhân sự của Báo cáo vẫn là dữ liệu mẫu — đã có dải nhãn | Thấp |
| 7 | Endpoint **khóa tài khoản chủ tiệm** vẫn chưa có — treo từ ngày 7 | Chưa có lịch |
| 8 | Tên thu ngân trên hóa đơn để trống; phương thức đặt cọc; sai số làm tròn 1đ | Thấp |
| 9 | Database demo lẫn rác của các phiên thử. Ngày 19 dựng lại từ số 0 | Thấp |
| 10 | `README-MIGRATION.md` vẫn mô tả Cloudflare Worker + D1 | Thấp |

### Ngày 19 — xong: tổng duyệt trên database dựng lại từ số 0

Xóa `NailManagement`, chạy lại migration + seed, rồi diễn trọn kịch bản ba vai — một lượt gọi
thẳng API, một lượt bấm tay trong trình duyệt. Năm chỗ vấp, **bốn cái là lỗi hiển thị sai sự
thật** và không cái nào lộ ra ở mười tám ngày trước, vì cả bốn chỉ sai khi màn hình chạy bằng
dữ liệu thật.

#### Database trước và sau

| | Trước | Sau khi seed lại |
|---|---:|---:|
| Tenants | 12 | 6 |
| AppUsers | 12 | 7 |
| AppSessions | 327 | 0 |
| AuditLogs | 442 | 6 |
| SalesInvoices | 193 | 151 |
| Appointments | 198 | 176 |

Sáu tháng "lịch sử" của tiệm Nailé và Muse là do bộ nạp dựng lùi từ hôm nay, nên mỗi lần seed
lại là một bộ số khác — đó là lý do phải tổng duyệt **sau** khi dựng lại chứ không phải trước.

#### 🔴 Chỗ vấp 1 — báo cáo doanh thu mở ra là trống, ngay ở bước cuối của mạch demo

`TenantAdminReports` khởi tạo khoảng ngày bằng hai hằng số `2026-07-01` – `2026-07-20`. Chúng
được viết khi trang còn chạy bằng dữ liệu mẫu nằm trọn trong tháng 7; từ ngày 16 tab Doanh thu
đọc tiền thật, mà tiền thật thì luôn ở những ngày gần nhất. Kết quả: chủ tiệm bấm "Báo cáo" và
nhận đúng câu *"Chưa có khoản thu nào trong kỳ này"* — trong khi thẻ Tổng quan ngay màn trước
đang ghi 69.985.928 ₫.

Một kỳ báo cáo cố định trong quá khứ không nói sai về con số, nhưng nó nói sai về việc **tiệm có
thu được tiền hay không**. Nay mặc định là 30 ngày gần nhất, khớp thẻ "Doanh thu 30 ngày qua" ở
Tổng quan: hai màn cùng trả lời một câu hỏi thì phải mở ra cùng một kỳ.

#### 🔴 Chỗ vấp 2 — hộp chọn chi nhánh đọc sai bốn ô, sai cả bốn

Màn hình đầu tiên chủ tiệm nhìn thấy sau khi đăng nhập ghi:

```
QL: 95 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh      ← nhãn "quản lý", giá trị là địa chỉ
Nhân sự: 0283930001                             ← nhãn "nhân sự", giá trị là số điện thoại
DT: Chi nhánh chính                             ← nhãn "doanh thu", giá trị là vai trò
```

`branchSelectionList` lấy `cells[0..3]` làm giờ mở cửa, quản lý, nhân sự, doanh thu — đúng thứ
tự của thời dữ liệu mẫu. Ngày 8 `branchDtoToNailRow` dựng lại `cells` thành
`[mã, địa chỉ, điện thoại, vai trò]` cho khớp sáu cột của bảng chi nhánh, còn chỗ này không đổi
theo. Đây là cùng một họ lỗi với ngày 14 và ngày 16: **giao diện giữ hình dạng của thời dữ liệu
mẫu, còn dữ liệu thật thì đã đổi hình.**

Cách sửa không phải tìm lại đúng ô. Quản lý phụ trách, sĩ số, doanh thu và giờ mở cửa của một
chi nhánh **không có cột nào ở database** — chúng nằm trong mười một trường mà quyết định 36 đã
gỡ. Nên bốn trường ấy bị xóa khỏi `BranchSelectionItem`, chỗ gọi đọc theo **nhãn** thay vì theo
vị trí, và thẻ hiện đủ ba thứ hệ thống biết thật: địa chỉ, số điện thoại, vai trò. Một ô không
có nguồn sự thật thì bỏ đi, đừng để trống chờ ai đó lấp bằng thứ gần nhất.

#### 🔴 Chỗ vấp 3 — thanh trên cùng in mã định danh bản ghi

Huy hiệu cạnh tên chi nhánh in thẳng khóa lọc, mà từ ngày 9 khóa lọc là `branch.id`. Với dữ liệu
mẫu nó ra `Q3` nên không ai thấy gì; với tiệm thật nó ra `BRN-LUMIERE-Q3`, và với một chi nhánh
vừa lập qua giao diện thì ra `BRN-64FDDBE766AE` nằm giữa thanh công cụ.

Cùng nguyên nhân, `OverviewPage` tự dựng lại tên chi nhánh từ khóa lọc với hai nhánh cứng `'Q1'`
và `'Q3'`, nên tiêu đề biểu đồ ghi *"Doanh thu thực nhận · Chi nhánh BRN-LUMIERE-Q3"*. Cổng đã
có sẵn câu trả lời đúng ở `currentActiveBranchTitle`; hai chỗ cùng trả lời một câu hỏi thì chỗ
chép lại sẽ là chỗ sai trước. Nay tên truyền xuống bằng prop, và huy hiệu dùng mã ngắn do tiệm
tự đặt.

#### 🔴 Chỗ vấp 4 — hai màn chạy bằng số thật vẫn đeo nhãn "Dữ liệu mẫu"

Dải nhãn của ngày 18 làm đúng việc của nó ở 21 màn, nhưng đặt nhầm ở hai màn **đã nối máy chủ**:

| Màn | Nhãn cũ | Sự thật |
|---|---|---|
| Báo cáo hệ thống (Superadmin) | "dựng trên hóa đơn đăng ký **trong trình duyệt**" | Đọc cùng mảng `invoices` và cùng danh sách tiệm với màn Thanh toán — cả hai từ `useSubscriptionInvoices` và `useTenants` |
| Báo cáo doanh thu (chủ tiệm) | "Dữ liệu mẫu — chưa nối máy chủ" | Chính là trang doanh thu thật của ngày 16 |

Nói sai theo hướng **hạ thấp** cũng là nói sai. Người xem không có cách nào biết chỗ nào còn tin
được nữa, và ở buổi bảo vệ thì đây đúng là hai màn hội đồng nhìn vào.

`MockDataNotice` nhận thêm prop `title` để một màn nói được **phạm vi** thay vì phủ nhận chính
con số mình vừa hiện ra. Mặc định giữ nguyên, nên 21 màn còn lại không đổi một chữ.

#### 🔴 Chỗ vấp 5 — thu tiền vượt số còn thiếu không bị chặn

Thu đúng 280.000 ₫ cho hóa đơn 280.000 ₫ → `PAID`, còn thiếu 0 ₫. Thu thêm 1.000 ₫ → **`201
Created`**, `remaining` thành **−1.000 ₫**. Thu thẳng 780.000 ₫ cho hóa đơn 260.000 ₫ cũng qua,
`remaining` = −520.000 ₫. Và vì báo cáo trừ tip **theo tỉ lệ trên tiền đã thu**, phần dư ấy đi
thẳng vào doanh thu: một hóa đơn 320.000 ₫ thu 350.000 ₫ cho ra doanh thu 328.125 ₫.

`IssueRefund` có trần đúng theo BR-PAY-008, `RegisterPayment` thì không — hai chiều đối xứng mà
chỉ một chiều có rào. Bản cũ ghi rõ đây là chủ ý: *"khách đưa dư rồi lấy lại tiền thừa là chuyện
thường ở quầy"*. **Quyết định ngày 19 đảo lại chủ ý đó:** tiền thối lại cho khách không phải
doanh thu, nên nó cũng không được vào sổ. BR-PAY-003 viết `PAID nếu đã_thu ≥ total`, dấu `≥` ấy
nay chỉ còn để mô tả trạng thái, không còn là giấy phép thu vượt.

Rào đặt ở **đúng một loại dòng tiền**: `PaymentType.Payment`. Dòng `Deposit` do
`CreateSalesInvoiceUseCase` sinh từ tiền cọc của lịch hẹn, mà BR-APT-032 không buộc cọc phải nhỏ
hơn hóa đơn — khách cọc 500.000 ₫ rồi đổi sang dịch vụ 300.000 ₫ là hợp lệ, chặn ở đó sẽ làm
hỏng cả việc lập hóa đơn. Dòng `Refund` đã có trần riêng.

Giao diện lễ tân **không** tạo ra tình huống này: đường thu một phương thức gửi đúng `remaining`
của máy chủ, đường chia nhiều phương thức bắt tổng khớp `invoiceTotal` đã trừ cọc. Nghĩa là suốt
mười tám ngày, thứ giữ cho con số trung thực là **phép tính ở trình duyệt** — đúng chỗ mà ngày
14 và ngày 16 đã chứng minh là không nên tin.

#### Không phải lỗi, dù thoạt nhìn giống

- **Oasis hiện "Quá hạn"** chứ không phải "Hết hạn" — BR-TENANT-001 chỉ có bốn trạng thái hiển
  thị, `OVERDUE` là một trong bốn, và nó được tính lúc đọc chứ không lưu (BR-TENANT-002).
- **"Bắt đầu làm" bấm không ăn** — lịch hẹn chưa xếp ghế. Máy chủ không lưu ghế (§9.4), nên nó
  nằm ở `AppointmentExtras` của trình duyệt và mất khi xóa `localStorage`. Hộp thoại phân công
  mở ra kèm lời nhắc; đúng như thiết kế.
- **`commissionRate` nhận 0…1 chứ không phải phần trăm** — `TenantAdminStaff.tsx:488` chia 100
  trước khi gửi. Lỗi nằm ở kịch bản kiểm thử tôi viết, không ở hệ thống.

### Kiểm chứng

| Phép thử | Kết quả |
|---|---|
| Kịch bản ba vai gọi thẳng API, 50 bước | **50/50** sau khi sửa (46/50 trước) |
| `dotnet test` | **75/75** (thêm 1 phép thử thu vượt), chạy hai lượt liên tiếp cùng kết quả |
| `npm run lint` · `npm run build` | Xanh |
| Thu vượt qua API thật | `422 VALIDATION_FAILED`, lỗi gắn vào ô `amount`, bản ghi không đổi |
| Hộp chọn chi nhánh | Ba dòng, ba nhãn khớp giá trị, không in địa chỉ hai lần |
| Thanh trên cùng · tiêu đề biểu đồ | `Q3` · "Chi nhánh Quận 3" |
| Báo cáo doanh thu mở lần đầu | 01/08–30/08, doanh thu 35.840.929 ₫ / 77 hóa đơn |
| Thu tiền bấm tay ở cổng lễ tân | `PUT` + `POST payments` → két 1.061.000 → 1.511.000 ₫ |
| Console trình duyệt | Chỉ hai lần `401` của phép dò phiên trước khi đăng nhập |
| Database sau cùng | Dựng lại lần hai từ số 0 — 6 tiệm, 7 tài khoản, 0 phiên, 6 dòng nhật ký |

### Việc còn treo sau ngày 19

| # | Việc | Mức |
|---|---|---|
| 1 | **Giảm giá âm lúc LẬP hóa đơn bị bỏ qua trong im lặng** — `CreateSalesInvoiceUseCase` chỉ gọi `ApplyDiscount` khi số tiền lớn hơn 0. Cùng dạng với `SetTip`. Đường **sửa** hóa đơn thì chặn đúng | Trung bình |
| 2 | Tham số `reportCurrency` vẫn được truyền qua 7 tệp dù chỉ còn một đơn vị tiền | Thấp |
| 3 | `general.currency` và `BrandInfo.currency` vẫn nằm trong mô hình cài đặt dù không còn ô chọn | Thấp |
| 4 | Bốn tiệm phụ (Aurora, Bloom, Morning, Oasis) seed ra **không có chi nhánh, nhân sự hay khách** — mọi màn của chúng đều trống. Đủ để demo cách ly và chặn ghi, nhưng đừng mở chúng ra khi trình bày | Thấp |
| 5 | §3.1 của lộ trình lệch một lát cắt sau mỗi ngày làm. **Đề xuất bỏ hẳn các con số đếm** khỏi mục ấy | Thấp |
| 6 | Tab Vận hành / Khách hàng / Nhân sự của Báo cáo vẫn là dữ liệu mẫu — đã có dải nhãn | Thấp |
| 7 | Endpoint **khóa tài khoản chủ tiệm** vẫn chưa có — treo từ ngày 7 | Chưa có lịch |
| 8 | Phương thức đặt cọc; sai số làm tròn 1đ. *(Tên thu ngân đã hiện đúng — "Thu ngân: Lê Hoàng Nam")* | Thấp |
| 9 | Màn Lịch hẹn của chủ tiệm hiện "Không tìm thấy nhân viên — thử tên khác hoặc xóa tìm kiếm" khi ô tìm đang trống. Màn dữ liệu mẫu | Thấp |
| 10 | `README-MIGRATION.md` vẫn mô tả Cloudflare Worker + D1 | Thấp |

### Ngày 19 (lượt hai) — tổng duyệt kỹ: 174 phép kiểm API + quét trọn 37 màn

Lượt một đi hết mạch demo. Lượt này **ấn vào từng ranh giới**, và quét giao diện bằng máy thay
vì bằng mắt. Hai chỗ vấp mới, cả hai đều thuộc loại một buổi bấm tay không bắt được.

#### Kịch bản kiểm chứng — 174 bước, 14 nhóm

| Nhóm | Bước | Giữ điều gì |
|---|---:|---|
| Phiên và phân quyền | 11 | Sai mật khẩu và email không tồn tại trả **cùng** một mã lỗi; đăng xuất giết phiên thật |
| Tầng nền tảng không đọc dữ liệu tiệm | 7 | BR-AUTH-030 trên cả bảy endpoint nghiệp vụ |
| Gói và danh sách tiệm | 10 | Bốn trạng thái hiển thị của BR-TENANT-001 trên đúng bốn tiệm mẫu |
| Lập tiệm mới | 8 | Hạn quá khứ, gói lạ, tên rỗng, email trùng, mã trùng — năm đường bị chặn |
| Chủ tiệm dựng tiệm | 29 | Hạn mức gói, chi nhánh chính không ngừng được, KTV không có tài khoản |
| Lễ tân đặt lịch | 17 | Chống trùng ở **bốn** vị trí tương đối, hai cảnh báo không chặn |
| Sơ đồ chuyển trạng thái | 10 | Nhảy cóc bị chặn, hai điểm cuối không quay lại, dời lịch chạy lại phép chống trùng |
| Hóa đơn và tiền | 27 | Công thức tiền, thu nhiều lần, thu vượt, hoàn tiền — cả bốn chiều |
| Báo cáo doanh thu | 10 | `revenue + tips = collected`; bốn chiều cộng lại bằng nhau; lọc chi nhánh không rò tiệm khác |
| Cách ly tiệm | 9 | Đọc **và** ghi chéo tiệm; đổi tiệm trong cùng phiên |
| Chặn ghi khi hết hạn / tạm ngưng | 12 | Cả hai trạng thái, cả hai đường ghi |
| Vòng đời tiệm | 6 | Khóa tiệm chặn ghi **ngay trên phiên đang mở**, mở khóa thì ghi lại được ngay |
| Nhật ký kiểm toán | 4 | Bảy loại sự kiện, gắn đúng mã tiệm |
| Sửa và ngừng hoạt động | 14 | Xóa mềm, và giá dịch vụ đổi **không** làm đổi hóa đơn cũ |

**174/174 đạt** trên database vừa dựng lại từ số 0.

Kịch bản nằm ở `scripts/rehearsal.mjs`, chạy bằng `npm run rehearsal`. Nó vào repo chứ không ở
lại thư mục tạm vì ngày 20 còn một lượt tổng duyệt nữa, và vì thứ đáng giữ không phải kết quả
lần chạy này mà là **174 câu hỏi** — chép tay lại chúng ở lượt sau là chép thiếu. Đọc `API_ORIGIN`
như `vite.config.ts`, thoát mã 1 khi có bước hỏng, và nói thẳng "máy chủ đã chạy chưa" thay vì
để nguyên câu `fetch failed` của Node.

Ba ranh giới đáng ghi lại, vì mỗi cái là chỗ một lỗi sẽ không tự lộ:

- **Ngừng một chi nhánh thì mở lại được chỗ trong hạn mức.** BR-BRANCH-005 đếm chi nhánh
  `ACTIVE`, không đếm cả danh sách. Một phép đếm sai vẫn qua được mọi phép thử chỉ thêm chi nhánh.
- **Đổi giá dịch vụ không làm đổi hóa đơn đã lập.** BR-SVC-007 chốt giá lúc lập; nếu hóa đơn đọc
  giá hiện hành thì sổ sách tháng trước tự viết lại mỗi lần tiệm tăng giá.
- **Khóa tiệm có hiệu lực ngay trên phiên đang mở.** Máy chủ kiểm tra ở mỗi request chứ không
  đọc một lần lúc đăng nhập — đó là lý do phiên là cookie + bảng `AppSessions` chứ không phải JWT.

#### 🔴 Chỗ vấp 6 — màn Bảo mật báo "0 đăng nhập thất bại" trong khi database giữ 2

`useAuditLogs` tra bảng `EVENT_META` bằng khóa viết theo tên enum của C# — `Login`,
`LoginFailed`, `TenantCreated`. Máy chủ gửi trên dây `LOGIN`, `LOGIN_FAILED`, `TENANT_CREATED`
(`AuditLogMapper.ToWireFormat`). **Mười khóa, trượt cả mười, mọi lúc.** `event` khai kiểu
`string` nên `tsc` không có gì để bắt, và `AuditEventCode` trong tầng service cũng viết theo tên
enum — kiểu sai xác nhận cho bảng sai.

Hậu quả không dừng ở nhãn. Mọi bản ghi rơi vào nhánh dự phòng, tức là **`severity: 'low'`,
`status: 'success'`, `category: 'SYSTEM'`** cho tất cả:

| | Trước | Sau |
|---|---|---|
| Nhãn sự kiện | `TENANT_UPDATED` | "Cập nhật hồ sơ tiệm" |
| Ô "rủi ro 24 giờ" | 0 yêu cầu xác thực thất bại | **2** — đúng số dòng `LOGIN_FAILED` trong database |
| Lọc theo kết quả "Thất bại" | 0 dòng | 2 dòng, tô "Cảnh báo" |
| Lọc theo danh mục "Xác thực" | 0/30 | **13/30** |
| Lọc theo mức độ | chỉ có "Thông tin" | ba mức đều có dòng |

Đây là chỗ vấp nặng nhất của cả hai lượt: một màn **giám sát bảo mật** báo yên trong khi hệ
thống vừa ghi nhận hai lần đăng nhập sai. Nó cũng là loại lỗi mà nhìn màn hình không thấy —
"0 sự cố" trông y hệt một hệ thống lành mạnh. Chỉ có đối chiếu con số trên màn hình với con số
trong database mới lộ ra.

Sửa bằng cách khóa bảng theo **chuỗi trên dây**, và ràng `EVENT_META` thành
`Record<AuditEventCode, …>` với `AuditEventCode` là union của chính mười chuỗi ấy — lần lệch sau
sẽ là lỗi biên dịch chứ không phải một màn hình nói dối.

#### 🔴 Chỗ vấp 7 — "Chi nhánh undefined" ở chân bảng giá dịch vụ

`ServiceDto` **không có cột chi nhánh** — chú thích ở `services/salonServices.ts` nói thẳng điều
đó, vì bảng giá là của cả tiệm. Nhưng màn Dịch vụ & giá vẫn giữ hai thứ của thời dữ liệu mẫu:

- Ô chọn chi nhánh với ba tùy chọn cứng `Q3` / `Q1` / `ALL`. Ở chế độ thật, giá trị là
  `BRN-LUMIERE-Q3` — **không khớp tùy chọn nào**, nên trình duyệt vẽ đại mục đầu tiên. Ô ấy ghi
  "Chi nhánh Quận 3" bất kể đang làm ở đâu, và bấm vào nó không lọc gì (bộ lọc đã bị bỏ qua ở
  chế độ thật vì không có gì để lọc).
- Dòng chân trang tra `branchLabels[selectedBranch]` bằng khóa thật → in ra **"Chi nhánh
  undefined"**.

Cùng họ với chỗ vấp 2 và 3 của lượt một. Nay ở chế độ thật ô chọn biến mất và dòng chân trang
ghi "Áp dụng cho toàn tiệm"; chế độ dữ liệu mẫu giữ nguyên.

#### Quét 37 màn bằng máy, không bằng mắt

Một hàm chạy trong trình duyệt bấm qua từng mục điều hướng của cả ba cổng rồi soi nội dung tìm
sáu dấu hiệu: mã định danh thô lọt ra màn hình, `undefined`, `NaN`, `Invalid Date`,
`[object Object]`, và chữ USD còn sót.

| Cổng | Màn | Kết quả |
|---|---:|---|
| Superadmin | 11 | Sạch sau khi sửa nhật ký. Dải nhãn đúng ở 8 màn mẫu, không có ở 3 màn thật |
| Chủ tiệm | 19 | Một `undefined` — chỗ vấp 7. Còn lại sạch |
| Lễ tân | 7 | Sạch |

Lý do làm bằng máy: bấm tay 37 màn thì `undefined` nằm ở dòng chân trang cỡ chữ nhỏ nhất trang,
sau bảng phân trang, và mắt trượt qua nó ba lượt liền — nó chỉ hiện ra khi có thứ đọc từng ký tự.

#### ⚠️ Một cái bẫy khi bảo vệ: dữ liệu mẫu dựng lùi từ **giờ chạy seed**

`DemoDataSeeder` sinh lịch hẹn bằng `now.AddDays(-dayOffset)` — chỉ lùi về quá khứ, không có gì
ở tương lai. Buổi tổng duyệt lượt hai chạy sang ngày hôm sau và bắt được hệ quả:

```
Lịch hẹn ngày seed        : 2 lịch
Lịch hẹn ngày hôm sau     : 0 lịch
→ Bàn lễ tân: 0 khách · 0 ca · 0 lịch · doanh thu ca 0đ
```

Màn hình xử lý đúng cách — "Tất cả lịch hẹn hiện tại đã được xử lý xong", không lỗi, không màn
trắng. Nhưng cổng lễ tân là **trung tâm của buổi demo**, và nó trống trơn nếu database được dựng
từ hôm trước. **Phải dựng lại database vào đúng buổi sáng hôm bảo vệ.**

### Kiểm chứng

| Phép thử | Kết quả |
|---|---|
| Kịch bản API 174 bước, 14 nhóm | **174/174** trên database vừa dựng lại |
| `dotnet test` | **75/75** |
| `npm run lint` · `npm run build` | Xanh |
| Quét 37 màn của ba cổng | 0 mã định danh thô · 0 `undefined` · 0 `NaN` · 0 chữ USD |
| Nhật ký: lọc "Thất bại" | 2 dòng "Đăng nhập thất bại", tô Cảnh báo — khớp database |
| Nhật ký: lọc danh mục "Xác thực" | 13/30 bản ghi |
| Bảng giá dịch vụ | "Áp dụng cho toàn tiệm", không còn ô chọn chi nhánh vô nghĩa |
| Báo cáo doanh thu sang ngày mới | Tự trượt sang 02/08–31/08, 34.575.000 ₫ / 75 hóa đơn |
| Console trình duyệt qua trọn buổi quét | Chỉ `401` của phép dò phiên trước khi đăng nhập |
| Database sau cùng | 6 tiệm · 7 tài khoản · 0 phiên · 6 dòng nhật ký |

### Việc còn treo sau ngày 19 (lượt hai)

| # | Việc | Mức |
|---|---|---|
| 1 | **Giảm giá âm lúc LẬP hóa đơn bị bỏ qua trong im lặng** — `CreateSalesInvoiceUseCase` chỉ gọi `ApplyDiscount` khi số tiền lớn hơn 0. Cùng dạng với `SetTip` | Trung bình |
| 2 | **Bộ nạp dữ liệu mẫu chỉ dựng lịch hẹn về quá khứ.** Cân nhắc thêm vài lịch ở tương lai gần để cổng lễ tân không phụ thuộc vào việc seed đúng hôm demo | Trung bình |
| 3 | Ô "Rủi ro 24 giờ" hiện số sự kiện **mức cao**, còn dòng chú thích dưới nó đếm **đăng nhập thất bại** — hai phép đếm khác nhau nằm chồng nhau, nên thẻ đọc ra "0" màu xanh bên trên "2 yêu cầu xác thực thất bại" | Thấp |
| 4 | Nhật ký hiện `USR-SUPERADMIN` thay cho tên người. Máy chủ cố ý chỉ lưu mã (tên đổi được, mã thì không); muốn hiện tên thì cần API trả kèm | Thấp |
| 5 | Tham số `reportCurrency` vẫn được truyền qua 7 tệp dù chỉ còn một đơn vị tiền | Thấp |
| 6 | `general.currency` và `BrandInfo.currency` vẫn nằm trong mô hình cài đặt dù không còn ô chọn | Thấp |
| 7 | Bốn tiệm phụ (Aurora, Bloom, Morning, Oasis) seed ra không có chi nhánh, nhân sự hay khách — đủ để demo cách ly và chặn ghi, nhưng đừng mở ra khi trình bày | Thấp |
| 8 | §3.1 của lộ trình lệch một lát cắt sau mỗi ngày làm. **Đề xuất bỏ hẳn các con số đếm** khỏi mục ấy | Thấp |
| 9 | Endpoint **khóa tài khoản chủ tiệm** vẫn chưa có — treo từ ngày 7 | Chưa có lịch |
| 10 | Phương thức đặt cọc; sai số làm tròn 1đ | Thấp |
| 11 | Màn Lịch hẹn của chủ tiệm hiện "Không tìm thấy nhân viên — thử tên khác" khi ô tìm đang trống. Màn dữ liệu mẫu | Thấp |
| 12 | `README-MIGRATION.md` vẫn mô tả Cloudflare Worker + D1 | Thấp |

### Ngày 20 — xong: tổng duyệt lần hai, README vận hành, và ba con số bịa cuối cùng

Kế hoạch ngày 20 viết ba việc: *"tổng duyệt lần hai, viết `server/README.md`, kiểm tra
`npm run build` và `npm run lint` đều xanh"*. Làm đủ cả ba. Lượt duyệt lần này diễn **trên giao
diện** chứ không gọi API — và đó là lý do nó bắt được ba thứ mà 174 phép kiểm API không thấy:
cả ba đều là con số hiện ra cho người dùng, không phải dữ liệu máy chủ trả về.

#### Đường đi của lượt duyệt — bấm tay đúng như lúc bảo vệ

| Vai | Làm gì | Kết quả |
|---|---|---|
| Superadmin | Lập tiệm mới qua biểu mẫu, gói Premium, kèm tài khoản chủ tiệm | Mã tiệm tự sinh `TDN2-645`; hộp thoại mật khẩu tạm hiện đúng một lần, nói rõ "không gửi email, cũng không có cách xem lại" |
| Chủ tiệm mới | Đăng nhập bằng mật khẩu tạm, chọn tiệm, vào chi nhánh chính | Hộp chọn chi nhánh hiện đúng ba dòng đã sửa ở ngày 19 |
| Lễ tân | Thu tiền lịch hẹn 15:00, giảm 50.000 ₫, tip 20.000 ₫ | 450.000 − 50.000 + 20.000 = **420.000 ₫**; két 0 → 420.000 ₫; "2 lịch (1 xong)" |
| Chủ tiệm | Mở Báo cáo doanh thu | 35.270.000 ₫ · 76 hóa đơn; `revenue + tips = collected` khớp |

#### 🔴 Chỗ vấp 8 — thanh bên nói tiệm có 5 nhân viên, kể cả tiệm chưa có ai

```
const [staffUsage, setStaffUsage] = useState(tenant?.staffCount ?? nailModuleConfigs.staff.rows.length);
```

`useState` chỉ chạy hàm khởi tạo **một lần**, và lần đó thì `tenant` còn đang tải — nên
`tenant?.staffCount` là `undefined`, ô hạn mức rơi về `nailModuleConfigs.staff.rows.length`, tức
con số **5** của dữ liệu mẫu, rồi nằm lại đó vĩnh viễn. Không có `useEffect` nào đồng bộ lại.

Tiệm vừa lập, chưa có ai: thanh bên ghi "Nhân sự 5/∞". Tiệm Nailé có 6 người: cũng ghi 5.

Nặng hơn chuyện nhìn sai. Gói Basic cho tối đa **5** nhân viên, nên một tiệm Basic trống trơn sẽ
thấy **"5/5"** kèm ô cảnh báo màu hổ phách — hệ thống tự nói với chủ tiệm rằng họ đã hết chỗ
tuyển người trong khi chưa tuyển ai. Nay có `useEffect` đồng bộ theo `tenant`, và thanh bên đọc
"Nhân sự 0/∞" cho tiệm mới.

#### 🔴 Chỗ vấp 9 — năm huy hiệu hằng số đi theo người dùng khắp cổng

`navGroups` viết cứng năm con số: Lịch hẹn `32`, Ghế & khu vực `7/14`, POS `5`, Kho vật tư `18`,
Vệ sinh `4`. Thanh bên hiện ở **mọi màn**, nên năm con số ấy theo người dùng đi khắp cổng và tự
giới thiệu mình là số liệu của tiệm đang mở. Một tiệm vừa lập, chưa có lịch hẹn nào, vẫn được
thanh bên báo "Lịch hẹn 32".

Không sửa bằng cách tìm số thật: bốn trong năm màn ấy **không có gì ở máy chủ để đếm** (§9.3).
Đã bỏ cả năm. Trường `badge` giữ lại vì màn Lịch hẹn của chủ tiệm sẽ nối trong tương lai và lúc
đó có số thật để điền — còn bây giờ thì bỏ trống, đừng để một con số bịa đứng thay.

#### 🔴 Chỗ vấp 10 — chuông thông báo cộng cứng `+ 4`

```
{unreadAnnouncementsCount + 4 > 0 && ( … {unreadAnnouncementsCount + 4} )}
```

Chuông không bao giờ về 0. Đọc hết bản tin, dọn hết việc — nó vẫn đỏ và vẫn ghi 4. Huy hiệu trên
tab "Việc cần xử lý" cũng là số `4` viết thẳng, không đổi khi người dùng dọn bớt.

Nay cả hai đếm đúng `operationalTasks.length`, nên **số trên chuông bằng đúng số thứ mở ra thấy
được**: dọn hết việc thì chuông tụt từ 8 xuống 4 (chỉ còn bản tin chưa đọc), tab hết huy hiệu.

Bốn "việc cần xử lý" ấy vẫn là hằng số viết sẵn — không có bảng nào ở máy chủ sinh ra chúng. Ở
mọi màn khác, nội dung mẫu đều phải tự khai bằng `MockDataNotice`; hộp thả xuống không có chỗ
cho một dải nhãn đầy đủ nên nay nói gọn ngay trên đầu danh sách. Không nói thì bốn dòng ấy đọc
như việc thật của tiệm — kể cả với một tiệm chưa có lịch hẹn nào.

> Ba chỗ vấp này cùng một hình dạng, và cùng một lý do khiến chúng sống sót qua mười chín ngày:
> **hằng số nằm ở tầng khung giao diện, không ở màn nào cả.** Bộ quét 37 màn của ngày 19 tìm
> `undefined`, `NaN`, mã định danh thô — nó không có cách nào biết "32" là số bịa còn "1/3" là
> số thật. Chỉ có lập một tiệm rỗng rồi nhìn xem hệ thống nói gì về nó mới lộ ra.

#### `README.md` cho máy chủ — không phải `server/README.md`

Lộ trình viết `server/README.md` từ hồi còn định đặt backend trong repo giao diện. Quyết định
2′/3′ ở §0 đã đổi sang solution ASP.NET riêng, nên tệp nằm ở gốc solution:
`C:\Users\letru\source\repos\NailManagement\README.md`.

Sáu mục, viết cho người phải chạy hệ thống chứ không cho người đọc mã: chạy lên trong ba bước ·
ba tài khoản demo (kèm bốn tiệm phụ và mỗi tiệm demo được luật nào) · dựng lại database từ số 0 ·
kiểm thử · bố cục năm project · cấu hình.

Ba chỗ ghi thẳng cái bẫy thay vì để người sau tự vấp:

- **Đừng bật hồ sơ `https` khi chạy dev** — proxy của Vite đi HTTP, một lần chuyển hướng 307 sẽ
  làm cookie phiên `Secure=false` bị bỏ rơi.
- **Dừng máy chủ trước khi `dotnet test`** — tiến trình đang chạy khóa DLL, và `dotnet test` đỏ
  ngay ở bước build với `MSB3027`, trông y như hỏng mã nguồn.
- **Dựng lại database vào đúng buổi sáng hôm demo** — bộ nạp lùi từ giờ chạy seed và không đặt
  gì ở tương lai.

Toàn bộ số liệu trong README được kiểm bằng cách **làm đúng theo nó**: dừng máy chủ → `dotnet
test` → `dotnet ef database drop` → chạy lại → đối chiếu. Hai dòng log seed đúng như đã hứa, cả
mười bảng khớp bảng số dòng, và **cả mười lối đăng nhập** (bảy tài khoản, ba trong số đó vào
được cả bằng tên đăng nhập) đều thật.

### Kiểm chứng

| Phép thử | Kết quả |
|---|---|
| Kịch bản ba vai bấm tay trên giao diện | Chạy trọn: lập tiệm → cấp tài khoản → thu tiền → báo cáo |
| `npm run rehearsal` | **174/174**, mã thoát 0, trên database vừa dựng lại |
| `dotnet test` | **75/75** |
| `npm run lint` · `npm run build` | Xanh |
| README đối chiếu thực tế | 2 dòng log seed · 10/10 bảng đúng số dòng · 10/10 lối đăng nhập |
| Thanh bên tiệm mới | "Nhân sự 0/∞" — trước là "5/∞" |
| Chuông thông báo | 8 → 4 sau khi dọn hết việc; trước luôn kẹt ở 8 |
| Công thức tiền qua giao diện | 450.000 − 50.000 + 20.000 = 420.000 ₫ |

### Việc còn treo sau ngày 20

| # | Việc | Mức |
|---|---|---|
| 1 | **Giảm giá âm lúc LẬP hóa đơn bị bỏ qua trong im lặng** — `CreateSalesInvoiceUseCase` chỉ gọi `ApplyDiscount` khi số tiền lớn hơn 0. Cùng dạng với `SetTip` | Trung bình |
| 2 | **Bộ nạp chỉ dựng lịch hẹn về quá khứ.** Cân nhắc thêm vài lịch ở tương lai gần để cổng lễ tân không phụ thuộc vào việc seed đúng hôm demo | Trung bình |
| 3 | **Biểu mẫu lập tiệm không có ô mã chi nhánh chính**, dù `CreateTenantInput.primaryBranchCode` có nhận. Mọi tiệm lập qua giao diện đều có chi nhánh không mã, và huy hiệu đọc "CHƯA ĐẶT" | Thấp |
| 4 | Bốn "việc cần xử lý" trong hộp thông báo vẫn là hằng số — nay đã có nhãn dữ liệu mẫu, nhưng bỏ hẳn thì sạch hơn | Thấp |
| 5 | Ô "Rủi ro 24 giờ" đếm sự kiện **mức cao**, còn dòng chú thích dưới nó đếm **đăng nhập thất bại** — hai phép đếm khác nhau chồng lên nhau | Thấp |
| 6 | Nhật ký hiện `USR-SUPERADMIN` thay cho tên người. Máy chủ cố ý chỉ lưu mã; muốn hiện tên thì API phải trả kèm | Thấp |
| 7 | Tham số `reportCurrency` vẫn được truyền qua 7 tệp dù chỉ còn một đơn vị tiền | Thấp |
| 8 | `general.currency` và `BrandInfo.currency` vẫn nằm trong mô hình cài đặt dù không còn ô chọn | Thấp |
| 9 | Bốn tiệm phụ seed ra không có chi nhánh, nhân sự hay khách — đủ để demo cách ly và chặn ghi, nhưng đừng mở ra khi trình bày | Thấp |
| 10 | §3.1 của lộ trình lệch một lát cắt sau mỗi ngày làm. **Đề xuất bỏ hẳn các con số đếm** khỏi mục ấy | Thấp |
| 11 | Endpoint **khóa tài khoản chủ tiệm** vẫn chưa có — treo từ ngày 7 | Chưa có lịch |
| 12 | `README-MIGRATION.md` vẫn mô tả Cloudflare Worker + D1 | Thấp |

### Soát toàn hệ thống sau ngày 20 — bốn lỗi, một trong đó là lỗi nặng nhất của cả dự án

Lượt soát này không đi theo kịch bản mà đi theo **những chỗ chưa ai đăng nhập vào bao giờ**: một
tiệm gói Basic, một tiệm gói Enterprise, và một tiệm không có chi nhánh nào. Cả bốn lỗi đều nằm
ở đó — 174 phép kiểm API và ba lượt quét 37 màn trước đó đều chạy trên tiệm Nailé, mà Nailé
tình cờ là tiệm **Premium**.

#### 🔴 Lỗi 1 — cổng chủ tiệm luôn tưởng mọi tiệm đều là gói Premium

`GET /api/packages` chỉ mở cho Superadmin. Đó là chủ ý và ghi rõ trong `PackagesController`:
module quản lý gói đã bị cắt khỏi MVP, endpoint ấy tồn tại chỉ để màn lập tiệm có bảng giá thật.

Nhưng cổng chủ tiệm lại đi tra gói **trong chính bảng giá đó**:

```
getSubscriptionPackageForTenant(packages, targetTenant)   // packages = [] ở phiên chủ tiệm
  → undefined → FALLBACK_SUBSCRIPTION_PACKAGE             // một hằng số Premium viết sẵn
```

Phép tra ấy **chưa bao giờ thành công** ở cổng chủ tiệm. Nailé là Premium nên không ai thấy gì
suốt mười tám ngày. Đăng nhập bằng hai tiệm còn lại thì lộ ngay:

| | Aurora (Enterprise) | Muse (Basic) |
|---|---|---|
| Nhãn gói | "Gói **Premium**" | "Gói **Premium**" |
| Hạn mức chi nhánh | 3 — máy chủ cho **99** | 3 — máy chủ chỉ cho **1** |
| Hạn mức nhân sự | 999 — máy chủ cho **9999** | 999 — máy chủ chỉ cho **5** |
| Tính năng | Kho vật tư và Vệ sinh **bị khóa** dù đã trả tiền | Năm màn Premium **mở toang** dù chưa mua |

Chiều nào cũng sai, và chiều Basic sai theo kiểu tệ nhất: cổng mời chủ tiệm mở chi nhánh thứ hai
rồi để máy chủ từ chối — BR-BRANCH-005 chặn đúng, nhưng người dùng chỉ biết sau khi đã gõ xong
biểu mẫu.

Máy chủ **đã gửi đủ** mọi thứ cần thiết trên `GET /api/tenants/me`: `packageName`, `packageId`,
`subscriptionPrice`, `maxSalons`, `maxStaff`. Nay có `buildSubscriptionPackageFromTenant` dựng
gói từ chính hồ sơ tiệm, và danh sách quyền suy ra từ tên gói qua `PACKAGE_PROFILES` — đúng bậc
quyền mà `session.tenant.capabilities` của máy chủ trả về.

Lấy hạn mức từ **hồ sơ tiệm** chứ không từ bậc gói đoán ra, vì BR-SUB-004 chốt gói theo phiên bản
tại thời điểm ký: một tiệm cũ có thể mang hạn mức khác bảng giá hôm nay.

Sau khi sửa:

| | Aurora | Muse | Nailé |
|---|---|---|---|
| Gói | Enterprise | Basic | Premium |
| Chi nhánh | 0/∞ | 1/1 | 2/3 |
| Nhân sự | 0/∞ | 2/5 | 6/∞ |
| Màn bị khóa | không | 5 màn | 2 màn |

#### 🔴 Lỗi 2 — màn Lịch hẹn của chủ tiệm luôn rỗng, và nó nói dối về chính bộ dữ liệu mẫu của mình

Màn này chạy hoàn toàn bằng dữ liệu mẫu, và mọi dòng mẫu mang mã chi nhánh `'Q1'` hoặc `'Q3'`.
Cổng thì truyền xuống `branch` — từ ngày 9 là **mã định danh bản ghi** kiểu `BRN-LUMIERE-Q3`.
Không mã nào khớp, nên sáu phép lọc trong màn loại sạch mọi thứ:

```
Trước:  THỨ 2 | 0 lịch · THỨ 3 | 0 lịch · … cả bảy ngày đều 0
Sau:    THỨ 2 | 1 lịch · THỨ 3 | 14 lịch · Tất cả 14 · Chờ xác nhận 3 · Đã xác nhận 4
```

Đây cũng là lời giải cho việc còn treo số 11 của ngày 19: *"hiện 'Không tìm thấy nhân viên — thử
tên khác' khi ô tìm đang trống"* — danh sách kỹ thuật viên lọc theo cùng khóa ấy.

Dải nhãn đầu trang đã nói rõ đây là dữ liệu mẫu, nên vấn đề không phải nguồn dữ liệu mà là **màn
hình nói dối về chính bộ mẫu của nó**: bộ mẫu có lịch, trang thì bảo không có. Nay `branchFilter`
quy về `'ALL'` khi mã chi nhánh không thuộc bộ mẫu — không biết lọc theo một chi nhánh thì hiện
tất cả, đừng hiện rỗng. Ô chọn chi nhánh cũng đọc `branchFilter`, nên nó thôi hiện "Chi nhánh
Quận 3" khi thật ra không lọc theo chi nhánh nào.

Cùng lúc vá một lỗi **tiềm ẩn**: dòng tóm tắt in `branchLabels[selectedBranch]`, tức là sẽ ra
`undefined` ngay khi có một lịch hẹn mẫu nào rơi vào tuần đang xem.

#### 🔴 Lỗi 3 — tiệm không có chi nhánh nào vẫn hiện "Chi nhánh Q3"

Phép canh "chi nhánh đang chọn phải có thật" thoát sớm ở điều kiện `!branches.length`, nên với
một tiệm chưa có chi nhánh, khóa lọc nằm lại ở giá trị khởi tạo `'Q3'` của thời dữ liệu mẫu.
Thanh trên cùng và tiêu đề biểu đồ cùng đi ghi "Chi nhánh Quận 3" cho một tiệm không có chi nhánh
nào tên như vậy.

Nay quy về `'ALL'`: mở hộp chọn ra cũng chỉ có đúng mục "Toàn hệ thống", nên hỏi lại là vô ích —
chọn hộ rồi nói đúng tên còn hơn.

#### 🟡 Lỗi 4 — danh sách tiệm hiện mã định danh, không phải mã tiệm

`TenantManagement` in `tenant.id` dưới tên tiệm, trong khi `TenantPicker` và `TenantSwitcher`
đều in `tenant.code`. Với tiệm seed thì đọc tạm được (`TEN-AURORA`), với tiệm lập qua giao diện
thì ra `TEN-RS552840` — dù chính chủ tiệm đã gõ mã `RS552840` ở biểu mẫu, dưới ô có chú thích
"Mã tiệm không đổi lại sau khi lập".

Nay in `code`, và ô tìm kiếm nhận **cả hai**: mã ngắn là thứ hiện trên màn hình, mã định danh là
thứ xuất hiện trong URL, log và thông báo lỗi.

#### Vì sao ba lượt soát trước không thấy

Bộ quét 37 màn tìm được `undefined`, `NaN`, mã định danh thô — nhưng nó **không có cách nào biết
"Gói Premium" là sai** khi tiệm đang mở thật sự là Premium. Cả ba lượt trước đều đăng nhập bằng
Nailé, và Nailé là tiệm duy nhất mà con số dự phòng tình cờ đúng.

Bài học lặp lại lần thứ tư trong dự án: **một giá trị dự phòng là một lời nói dối chờ đúng hoàn
cảnh để phát ra.** Trước đó là `nailModuleConfigs.staff.rows.length` (ngày 20), `branchLabels`
khóa theo `Q1`/`Q3` (ngày 19 và hôm nay), và `EVENT_META` khóa theo tên enum C# (ngày 19).

### Kiểm chứng

| Phép thử | Kết quả |
|---|---|
| `dotnet build -warnaserror` | 0 warning · 0 error |
| `dotnet test` | **75/75** |
| `npm run lint` · `npm run build` | Xanh |
| `npm run rehearsal` | **174/174**, mã thoát 0 |
| Quét 37 màn ba cổng | 0 mã thô · 0 `undefined` · 0 `NaN` · 0 chữ USD |
| Ba gói khác nhau | Enterprise · Basic · Premium — nhãn, hạn mức và khóa tính năng đều khớp máy chủ |
| Tiệm không có chi nhánh | "Chi nhánh: Tất cả chi nhánh" |
| Màn Lịch hẹn chủ tiệm | 14 lịch mẫu hiện ra, trước là 0 |
| Danh sách tiệm | AURORA · BLOOM · MORNING · MUSE · LUMIERE · OASIS |
| Mạng khi chạy cổng chủ tiệm | Không có request nào 403 — cổng thôi hỏi bảng giá |

### Soát lại toàn bộ dải nhãn — bốn màn thật đang bị dán nhãn "dữ liệu mẫu"

Ngày 18 dựng dải nhãn cho 21 màn. Ngày 19 phát hiện hai màn **chạy số thật** vẫn đeo nhãn ấy và
sửa chúng. Lượt này soát nốt: **thêm bốn màn nữa cùng lỗi**, và một cái trong đó tự mâu thuẫn
ngay trên màn hình — người dùng nhìn thấy trước tôi.

#### Cái tôi bỏ sót ở ba lượt quét trước

Bộ quét 37 màn kiểm **"có dải nhãn hay không"**, không kiểm **"dải nhãn nói có đúng không"**.
Nó không có cách nào biết câu "chưa nối máy chủ" là sai khi màn hình bên dưới đang hiện đúng
những con số của database.

Lượt này dùng một phép dò khác, nhắm thẳng vào chính hình dạng của lỗi:

> Màn nào **đồng thời** đeo nhãn "Dữ liệu mẫu — chưa nối máy chủ" **và** tự nói trong thân trang
> rằng nó "đọc từ máy chủ" → dải nhãn nói sai.

Đó đúng là cách người dùng bắt được màn Quản lí Tenant Admin: dải nhãn vàng ghi *"chưa nối máy
chủ"*, còn dòng mô tả ngay dưới tiêu đề ghi *"Danh sách đọc trực tiếp từ máy chủ"*. Hai câu cách
nhau ba dòng và phủ định nhau.

#### Bốn màn đã sửa

| Màn | Sự thật, có bằng chứng | Nhãn cũ |
|---|---|---|
| **Tenant Admin** (Superadmin) | `GET /api/accounts?role=TENANT_ADMIN` — năm tài khoản seed, kèm chi tiết "2 tenant" của Nguyễn Văn Boss suy từ bảng `UserTenants` | "là dữ liệu mẫu" |
| **Gói dịch vụ** (Superadmin) | Màn hình hiện `PKG-BASIC · v1 · 1.200.000 ₫` — đúng mã và giá `GET /api/packages` trả về | "nằm ngoài phạm vi backend MVP" |
| **Thanh toán & hóa đơn** (Superadmin) | "Tổng hợp **5** hóa đơn" — đúng 5 hóa đơn của `GET /api/subscription-invoices` | Thân nhãn đã ghi đúng "đọc thật từ máy chủ", nhưng **câu in đậm phía trên vẫn phủ nhận nó** |
| **Gói đăng ký** (Chủ tiệm) | Hiện "Premium · 2.500.000 ₫" — khớp `packageName` và `subscriptionPrice` của `GET /api/tenants/me` | "đã bị cắt khỏi MVP" |

Cả bốn nay dùng câu mở đầu **"Phạm vi trang này."** thay vì lời cảnh báo dữ liệu mẫu, và nội dung
nói rõ ranh giới thật: **đọc là thật, ghi là cục bộ**. Prop `title` của `MockDataNotice` đã có
sẵn từ ngày 19 cho đúng tình huống này; cổng chủ tiệm nay cũng có bảng `MOCK_DATA_TITLES` riêng.

Ba màn trong số đó thuộc một dạng đáng ghi lại: **đọc thật nhưng ghi cục bộ.** Dán nhãn "chưa nối
máy chủ" lên chúng là nói sai về vế đọc để cảnh báo đúng về vế ghi — trả giá bằng việc phủ nhận
những con số thật mà hội đồng đang nhìn.

#### Mười bảy màn còn lại: nhãn đúng

Soát ở tầng mã nguồn — màn nào nhận dữ liệu từ hook hay service của máy chủ — rồi đối chiếu lại
bằng phép dò trên trình duyệt:

| Cổng | Màn giữ nhãn "dữ liệu mẫu" | Kiểm |
|---|---:|---|
| Superadmin | 4 (Bản tin, Cấu hình, Trung tâm hỗ trợ, Sao lưu) | Chỉ `localStorage`, nhãn đúng |
| Chủ tiệm | 10 (Lịch hẹn, Thành viên, Kho, Màu & mẫu, Đặt lịch online, Thu & Chi, Vệ sinh, Bản tin, Trợ giúp, Cài đặt) | Chỉ dữ liệu mẫu, nhãn đúng |
| Lễ tân | 3 (Sản phẩm quầy, Ghế & phòng, POS) | Chỉ dữ liệu mẫu, nhãn đúng |

Hai dải nhãn viết tay cũng đúng: tab Phiên đăng nhập của màn Bảo mật nói rõ *"máy chủ vẫn quản
phiên thật trong bảng `AppSessions`; chỉ là chưa có màn đọc"*, và màn Báo cáo doanh thu của chủ
tiệm đã mang câu phạm vi từ ngày 19.

Hai màn nhận `tenant` nhưng **không hiển thị** dữ liệu ấy — Bản tin hệ thống dùng nó để lọc thông
báo theo tiệm — nên nhãn "nội dung chỉ lưu trên trình duyệt" vẫn đúng.

### Kiểm chứng

| Phép thử | Kết quả |
|---|---|
| Phép dò mâu thuẫn, 28 màn ba cổng | **0 màn** vừa đeo nhãn mẫu vừa tự nói đọc từ máy chủ |
| Bốn màn đã sửa | Đều mang câu "Phạm vi trang này", nội dung khớp số máy chủ |
| Mười bảy màn còn lại | Giữ nguyên nhãn cảnh báo, không đổi một chữ |
| `npm run lint` · `npm run build` | Xanh |
| `npm run rehearsal` | **174/174** |

### Ngày 21 (lát cắt đầu) — xong: màn Lịch hẹn chủ tiệm chạy dữ liệu thật

Màn cuối cùng trong nhóm *"có API nhưng chưa nối"* của §9.2. **Không thêm endpoint nào**: sáu
endpoint lịch hẹn viết ngày 11 đã đủ, chỉ là cổng chủ tiệm chưa bao giờ dùng tới chúng. Ba tệp,
+650 −66 dòng, và không dòng nào ở phía máy chủ.

Mục này viết bù sau lát cắt thu hồi phiên. Nội dung dựng lại từ commit `a7e9a5d` và diff của nó,
nên phần kiểm chứng ở cuối ghi lại lượt kiểm lúc làm chứ không phải lượt chạy mới.

#### Nạp theo tuần, không theo ngày — và vì sao phải tách hook thay vì chép

`useAppointments` trước đây nạp đúng **một ngày**, vì nó sinh ra cho cổng lễ tân và quầy chỉ bao
giờ nhìn ca hôm nay. Màn của chủ tiệm thì khác: dải chọn ngày ở đầu bảng vẽ vạch mật độ cho **cả
bảy ngày** trong tuần, nên nạp một ngày thì sáu ngày còn lại luôn hiện "0 lịch" — trang nói sai
về chính nó.

Phần lõi tách thành `useAppointmentRange` nhận khoảng bất kỳ; hook cũ còn lại là một lớp mỏng
gọi vào đó qua `dayRange`, nên **cổng lễ tân không phải sửa một dòng**. Chia như vậy chứ không
chép thành hook thứ hai vì bốn hàm ghi bên dưới đều phải `reload()` sau khi thành công, và hai
bản sao của quy tắc ấy sẽ lệch nhau ngay lần sửa đầu tiên. Tầng service vốn đã nhận khoảng bất
kỳ — `listAppointments(from, to)` — nên đây là mở đúng thứ đã có sẵn ở dưới.

Một cái lợi không định trước: bấm qua lại giữa các ngày trong cùng một tuần không gọi mạng lần
nào.

#### `toTenantAppointment` — bộ chuyển đổi thứ hai, cùng khuôn với ngày 14

File này hơn ba nghìn dòng và đọc `appointment.start`, `appointment.duration`,
`appointment.staff` ở hàng trăm chỗ. Đổi hình dạng nghĩa là sửa từng chỗ ấy — dài, rủi ro, và
không mua lại được gì cho người dùng. Nên `AppointmentDto` được mặc lại đúng bộ tên trường mà
cây render đang đọc, y như `toReceptionAppointment` đã làm cho cổng lễ tân.

Hai con số trong bộ chuyển đổi không lấy thẳng từ lịch hẹn được:

| Con số | Lấy từ đâu | Vì sao |
|---|---|---|
| Giá | Tra bảng giá dịch vụ hiện hành | Lịch hẹn ở máy chủ **không lưu giá**: BR-SVC-009 chốt giá tại thời điểm lập hóa đơn. Con số hiện ra là **giá dự kiến**, không phải tiền đã thu |
| Thời lượng | `durationMinutes + bufferMinutes` | BR-SVC-003 và BR-APT-010 — đúng con số phép chống trùng lịch ở máy chủ tính trên. Lấy thiếu vế sau thì giao diện vẽ buổi hẹn ngắn hơn chỗ nó thật sự chiếm, và người xếp lịch tưởng còn trống |

#### Mười ba trường máy chủ cố ý không có

Giữ trong một bản đồ riêng theo mã lịch hẹn, ghi xuống `localStorage` qua `tenantStorageKey`.
Ba nhóm, ba lý do khác nhau, và không nhóm nào là sơ suất của lược đồ:

| Nhóm | Trường | Vì sao máy chủ không có |
|---|---|---|
| Nhắc lịch và nhãn hiển thị | `reminderSent`, `firstVisit`, `createdBy` | Nhắc lịch nằm ở mức D của §9.4. Hai cái sau suy được từ hồ sơ khách, không phải thuộc tính của buổi hẹn |
| Hủy lịch | 4 trường `cancellation*` | `PATCH /status` chỉ nhận trạng thái. BR-APT-024 định nghĩa **việc hủy**, không định nghĩa việc khai vì sao hủy |
| Hoàn tiền | 9 trường `refund*` cộng cờ `refunded` | **Hoàn tiền là chuyện của hóa đơn.** `REFUNDED` đã bị gỡ khỏi bảy trạng thái của lịch hẹn; đường hoàn tiền thật nằm ở `IssueRefundUseCase` của hóa đơn bán hàng |

Không nhét chúng vào ô `note` của máy chủ: nhét vào đó là biến một ô ghi chú cho người đọc thành
một định dạng dữ liệu mà không ai khai báo ở đâu cả.

Nhóm thứ ba đáng nói nhất, vì nó là chỗ duy nhất trong màn có thể làm người dùng tin sai về
tiền. Khối hoàn tiền được giữ lại nguyên vẹn, nhưng ở **chế độ dữ liệu thật** nó mang thêm một
câu phạm vi nói thẳng: số nhập ở đây chỉ lưu trên máy này và **không vào báo cáo doanh thu**,
muốn có sổ sách thì làm ở hóa đơn. Ở chế độ trình bày thì câu ấy không hiện, vì cả trang đã đeo
nhãn dữ liệu mẫu rồi.

Trạng thái `REFUNDED` cũng dựng lại bằng chính cờ ấy: bộ chuyển đổi đè nó lên trạng thái thật
lúc đọc, và đường ghi chặn nó trước khi gửi lên vì máy chủ sẽ từ chối.

#### `live` là một biến, không phải hai màn

`live = Boolean(activeTenantId)`. Chế độ trình bày và chế độ chưa chọn tiệm đi chung một đường,
giống `TenantAdminReports`. Mỗi danh mục có một bảng thật và một bảng mẫu — dịch vụ, kỹ thuật
viên, khách, chi nhánh, ghế — và cây render không biết mình đang đọc bảng nào.

Hai hiệu ứng của bộ mẫu — ghi lịch xuống `localStorage` và phát sự kiện cho tab khác — nay
**dừng ngay ở chế độ thật**. Giữ lại thì đó là một bản sao thứ hai của sự thật, và bản sao ấy
già đi ngay khi có người đặt lịch ở máy khác. Việc đồng bộ do `board.reload()` lo: mỗi lần ghi
thành công là một lần nạp lại cả tuần.

Cùng lý do ấy, ngăn chi tiết được đồng bộ lại sau mỗi lượt nạp. `endAt`, `totalMinutes` và
`nextStatuses` đều do máy chủ suy ra, nên bản vừa nạp mới là bản đúng — không đồng bộ thì ngăn
chi tiết giữ ảnh chụp lúc bấm, và nếu máy chủ **từ chối** bước chuyển trạng thái thì nó vẫn hiện
trạng thái mà người dùng tưởng đã đổi được.

#### Bốn chỗ vỡ khi chạy thử, và cả bốn cùng một hình dạng

##### 🔴 Đầu cột kỹ thuật viên in `BRN-LUMIERE-Q1` và đẩy mất tên người

Bộ mẫu dùng mã hai ký tự `Q1`/`Q3` nên con chip vừa vặn. Chi nhánh thật mang mã bản ghi kiểu
`BRN-LUMIERE-Q3`: đặt nguyên vào chip thì chip chiếm hết bề ngang và **tên kỹ thuật viên bên
cạnh bị cắt sạch**. Nay có hai bảng nhãn — `branchNames` đầy đủ cho những chỗ rộng,
`branchShortNames` ưu tiên mã do tiệm tự đặt, rồi mới tới tên, cuối cùng mới tới mã bản ghi.

Phép lọc chi nhánh cũng hỏng vì cùng gốc ấy: bộ mẫu khóa theo `Q1`/`Q3`, cổng truyền xuống mã
bản ghi, không mã nào khớp nên bộ lọc loại sạch. Nay mỗi chế độ có bảng nhãn riêng và
`branchFilter` hỏi đúng bảng của chế độ đang chạy.

##### 🔴 Ô ghế bắt buộc trong khi không có ghế nào để chọn — không đặt được lịch nào

Sơ đồ ghế nằm ở mức C của §9.3: không bảng, không endpoint. Máy chủ vốn nhận `station` như một
trường **tùy chọn**, nhưng biểu mẫu thì bắt buộc — nên ở chế độ dữ liệu thật ô này không bao giờ
điền được và phép kiểm chặn mọi lượt lưu. Nay dấu bắt buộc đi theo việc chi nhánh có ghế hay
không, và ô mang dòng phụ nói rõ vì sao đang trống.

`stationsFor` trả mảng rỗng chứ không để `undefined` chạy tiếp: chỗ gọi cũ lấy thẳng phần tử
`[0]` và sẽ ném lỗi ngay giữa lúc mở biểu mẫu.

##### 🔴 `emptyForm` chép cứng danh mục của bộ mẫu

Ở chế độ thật không cái nào trong đó tồn tại: ô dịch vụ hiện "1 đã chọn" mà không ô nào được
tick, ô kỹ thuật viên rỗng, chi nhánh trỏ vào một mã không có trong danh sách. Nay biểu mẫu
trống được điền bằng phần tử đầu của từng danh mục **đang thật sự có**. Đổi chi nhánh cũng đổi
luôn kỹ thuật viên, vì BR-EMP-003 buộc nhân viên thuộc đúng một chi nhánh nên người đang chọn có
thể không còn hợp lệ.

##### 🟡 Dòng "Tạo lúc" in chuỗi ISO thô

`2026-09-03T07:22:43.933369+00:00` — đúng dữ liệu, sai chỗ đọc. Bộ mẫu vốn chứa sẵn chuỗi đã
định dạng nên cây render in thẳng ra màn hình.

> Cả bốn là **cùng một lỗi**: một hằng số mang hình dạng của bộ dữ liệu mẫu gặp mã định danh
> thật. Đây là lần thứ năm hình dạng ấy xuất hiện, sau `nailModuleConfigs.staff.rows.length`
> (ngày 20), `branchLabels` khóa theo `Q1`/`Q3` (ngày 19), `EVENT_META` khóa theo tên enum C#
> (ngày 19), và năm huy hiệu của thanh bên (ngày 20). Không lượt quét tự động nào bắt được
> chúng, vì mỗi giá trị tự nó đều hợp lệ — chỉ sai khi đứng cạnh dữ liệu thật.

#### Biểu mẫu giữ tên, API nhận mã — ba phép dịch trước khi gửi

Tên khách → mã hồ sơ, tên kỹ thuật viên → mã nhân viên, tên dịch vụ → mã dịch vụ. Tên trùng nhau
thì lấy người đầu tiên khớp: chấp nhận được ở quy mô một tiệm, và là cái giá để **không phải
viết lại biểu mẫu** ở hàng chục chỗ.

Phép dịch đầu tiên không phải tra bảng mà có thể là một lần ghi: đặt lịch cho khách mới chạy
`POST /api/customers` trước, rồi mới `POST /api/appointments`. BR-CUS-002 làm số điện thoại
thành khóa tra cứu, còn BR-CUS-007 đọc ngược hạng khách và tổng chi tiêu từ hóa đơn — nên một
lượt khách không có hồ sơ là một lượt **biến mất khỏi mọi con số về sau**.

Hai điều nữa trên đường ghi:

- `warnings` hiện như một lời nhắc chứ không phải lỗi. BR-APT-005 và BR-APT-013 **cho phép** đặt
  ngoài ca hoặc đặt lùi giờ, chỉ nói cho người đặt biết.
- Đổi trạng thái **cố ý không vá lạc quan** vào ngăn chi tiết. Vá rồi để hiệu ứng đồng bộ kéo bản
  cũ về trước khi lượt nạp lại kịp tới thì người dùng thấy trạng thái nhảy ba lần — mới, cũ, rồi
  mới lại. Máy chủ trả lời trong khoảng trăm mili-giây; một lần đổi vẫn nhanh hơn ba lần nhấp
  nháy.

Ở ngăn chi tiết, điểm tích lũy chỉ hiện khi lớn hơn 0. Loyalty nằm ngoài phạm vi (§9.3) nên ở
chế độ thật mọi khách đều 0 điểm — in ra "0 điểm tích luỹ" là nói rằng hệ thống đã tính và khách
chưa có điểm, trong khi thật ra chưa có gì tính cả. Bảy trường cùng loại — sở thích, dị ứng,
tình trạng móng, thẻ, lịch sử — cũng để trống thay vì bịa, để cây render tự ẩn các khối ấy bằng
chính phép kiểm nó đã có.

#### Kiểm chứng

Ghi lại từ lượt kiểm lúc làm, trên SQL Server 2022 với cả ba vai:

| Phép thử | Kết quả |
|---|---|
| Đặt lịch cho khách mới | `POST /api/customers` rồi `POST /api/appointments`, bản ghi có mặt trong bảng `Appointments` |
| Đổi trạng thái · hủy lịch | `PATCH` trả `200` cả hai |
| Chống trùng lịch · so ca · giờ đóng cửa | Chặn đúng bằng dữ liệu thật |
| Cổng lễ tân sau khi tách hook | Không sửa một dòng, hành vi không đổi |

`npm run lint` và `npm run build` xanh — chạy lại ở cuối lát cắt hai, phủ cả hai lát cắt.

Dải nhãn của màn này biến mất bằng cách xóa **đúng một dòng** trong `MOCK_DATA_REASONS` của
`NailTenantAdminPortal` — đúng thứ mà bảng ấy được dựng ra để làm ở ngày 18.

### Ngày 21 (lát cắt hai) — xong: thu hồi phiên đăng nhập từ xa, thứ đầu tiên quay lại từ nhóm "bỏ hẳn"

Lát cắt thứ hai của ngày 03/09, sau màn Lịch hẹn chủ tiệm. Khác mọi ngày trước ở một điểm: đây
không phải nối một màn có sẵn vào một API có sẵn, mà là **lấy lại một tính năng đã bị gạch khỏi
phạm vi** — §9.4 xếp "thu hồi phiên từ xa" vào nhóm bỏ hẳn, §20 của `README-BUSINESS-RULES.md`
cũng vậy. Quyết định 15′ ở §0 ghi lý do đổi ý.

Tổng cộng: **2 endpoint · 1 ô quyền · 2 rule mới · 7 phép thử · 0 migration.**

#### Vì sao một thứ đã "bỏ hẳn" lại quay lại được trong một ngày

Ba thứ vốn tưởng phải làm, hóa ra đã có sẵn:

| Tưởng phải làm | Thật ra | Có từ |
|---|---|---|
| Migration thêm `revoked_at`, `ip`, `user_agent`, `last_active` | Bảng `AppSessions` đã có đủ bốn cột | Ngày dựng bảng |
| Cơ chế cưỡng chế: làm sao phiên bị đóng mất hiệu lực ngay | `SessionMiddleware` đã đọc lại phiên ở **mọi** request (BR-AUTH-022); thu hồi chỉ là đặt một cột | Ngày dựng tầng phiên |
| Hạ tầng quản lý thiết bị | Không cần: `User-Agent` vẫn được lưu, chỉ thiếu chỗ rút gọn cho người đọc | — |

Phần thật sự còn thiếu không phải mã nguồn mà là **nghiệp vụ**: §9.2 hoãn màn này với đúng câu
*"cần nghiệp vụ chưa định nghĩa"*. BR-AUTH-032 và BR-AUTH-033 chính là phần ấy — ai thấy được
phiên của ai, và ai đóng được phiên của ai.

> Bài học cho phần còn lại của bảng §9.4: **danh sách "bỏ hẳn" được lập bằng cách ước lượng chi
> phí, không phải bằng cách đo.** Mục này nằm trong đó vì lúc lập bảng ai cũng tưởng nó kéo theo
> hạ tầng quản lý thiết bị. Trước khi bỏ tiếp thứ gì trong bảng ấy, nên mở lược đồ database ra
> xem trước — có thể nửa việc đã nằm sẵn ở đó.

#### Backend — hai endpoint, và một controller riêng

| Endpoint | Vai gọi được | Trả về |
|---|---|---|
| `GET /api/sessions?take=` | Superadmin · chủ tiệm | Danh sách phiên, đã thu hẹp theo vai |
| `POST /api/sessions/{id}/revoke` | Superadmin · chủ tiệm | Phiên sau khi đóng |

Tách `SessionsController` khỏi `AuthController` dù cả hai làm việc trên cùng bảng `AppSessions`.
Ranh giới không nằm ở bảng mà ở **chủ thể**: `AuthController` nói về phiên *của chính người gọi*
— đăng nhập, đọc phiên mình, đổi tiệm, đăng xuất — ai cũng gọi được; controller mới nói về phiên
*của người khác* và đứng sau ô quyền `Feature.Sessions`. Gộp chung thì một controller mang hai
mức quyền, và đó là chỗ dễ gắn nhầm attribute nhất.

`Feature.Sessions = 18` cũng cố ý tách khỏi `Feature.AuditLogs` dù hai thứ nằm chung một màn:
nhật ký là dữ liệu **chỉ đọc và không sửa được** (BR-AUD-002), còn ô mới mang một thao tác ghi
có hậu quả tức thì. Gộp lại thì cho quyền đọc nhật ký hóa ra cũng là cho quyền đá người đang làm
việc ra ngoài. Lễ tân không có ô này: danh sách phiên mang theo email và địa chỉ IP của mọi tài
khoản, không phải thứ cần ở quầy.

`RequiresTenant = false` ở cả hai endpoint, vì Superadmin không có tiệm đang làm việc. Việc chủ
tiệm bắt buộc phải chọn tiệm do use case tự đòi — cùng lối đã dùng cho nhật ký kiểm toán.

#### Phần khó không nằm ở việc thu hồi, mà ở việc ai thu hồi được phiên của ai

`RevokeSessionUseCase` đặt đúng một cột. Toàn bộ phần còn lại của lớp ấy là ba phép chặn:

| Tình huống | Trả về | Vì sao |
|---|---|---|
| Tự thu hồi phiên mình đang dùng | `403` | Việc đó là của nút Đăng xuất, đường ấy còn dọn cookie tử tế. Cho phép ở đây thì người dùng tự đá mình ra giữa lúc thao tác và không hiểu vì sao |
| Chủ tiệm đóng phiên của người ngoài tiệm | `404` | **Không phải `403`.** Trả `403` là xác nhận phiên đó tồn tại, tức rò rỉ một mẩu thông tin về tiệm khác — cùng lối BR-ISO-003 đặt cho mọi tài nguyên xuyên tiệm |
| Thu hồi lần thứ hai | `200`, trạng thái hiện có | Màn hình đã ẩn nút với phiên đã đóng, nên lần gọi lặp gần như chắc chắn là cú bấm đúp hoặc một tab cũ. Ném lỗi thì người dùng tưởng mình vừa làm sai |

Use case tự kiểm vai một lần nữa dù ma trận quyền ở tầng ngoài đã chặn lễ tân — để nó đứng vững
kể cả khi về sau có người gọi nó từ một đường khác.

**Phép thu hẹp của chủ tiệm đi theo chủ tài khoản, không theo phiên.** Bộ lọc hỏi bảng
`UserTenants` chứ không hỏi `ActiveTenantId` của phiên, và đây là chỗ dễ làm sai nhất trong cả
lát cắt: một tài khoản quản nhiều tiệm (BR-AUTH-023) có thể đang mở phiên trỏ sang tiệm khác,
nhưng người đó vẫn là người của tiệm này và chủ tiệm vẫn phải thấy để đóng được. Lọc theo
`ActiveTenantId` sẽ giấu mất **đúng những phiên đáng lo nhất**.

#### Ba trạng thái tính lúc đọc, và thứ tự kiểm là bắt buộc

`ACTIVE · EXPIRED · REVOKED` không phải cột được lưu mà tính ở `SessionMapper`. Lý do là
BR-TENANT-003: toàn hệ thống không có job chạy nền, nên một phiên hết hạn vẫn nằm nguyên trong
bảng cho tới khi có người hỏi tới nó.

Thứ tự hỏi thì **thu hồi thắng hết hạn**. Một phiên bị đóng rồi để quá ngày sẽ đúng cả hai điều
kiện; hỏi hết hạn trước thì màn hình báo "hết hạn" cho một phiên mà người quản trị đã chủ động
đóng — xóa mất dấu vết của một thao tác có chủ ý, đúng thứ mà màn Bảo mật sinh ra để hiển thị.

#### Rút gọn `User-Agent` — chỗ duy nhất có logic thật trong mapper, và ba cái bẫy thứ tự

Không kéo thêm thư viện phân tích User-Agent: chuỗi này chỉ để người quản trị nhận ra máy nào là
máy nào trước khi bấm thu hồi, không phải để thống kê. Nhưng các phép hỏi phải đúng thứ tự:

- **Chrome hỏi sau Edge, Brave và Opera.** Cả ba dựng trên Chromium nên chuỗi của chúng đều chứa
  `Chrome`; hỏi trước thì mọi trình duyệt hóa ra Chrome. Brave có mặt trong danh sách vì đó là
  trình duyệt dùng để kiểm chứng dự án này.
- **Safari hỏi sau cùng**, vì mọi trình duyệt Chromium cũng mang chữ `Safari`.
- **iPhone và iPad hỏi trước Mac**, vì chuỗi của iOS cũng chứa `like Mac OS X`.

Nhận không ra thì trả **nguyên chuỗi gốc**, không phải chữ "Không rõ". Ngày 19 và 20 rút ra bài
học rằng một giá trị dự phòng là một lời nói dối chờ đúng hoàn cảnh; ở đây là vế ngược của cùng
nguyên tắc — nói "Không rõ" trong khi vẫn còn thông tin trong tay là giấu mất manh mối duy nhất
người quản trị có.

Một cái bẫy nữa, tránh được chứ chưa kịp vấp: vai trò phải đi qua `AccountMapper.ToWireFormat`
chứ không được `ToString().ToUpperInvariant()`. Phép ấy biến `TenantAdmin` thành `TENANTADMIN`
trong khi frontend đọc `TENANT_ADMIN` — và **hai vai kia trùng nhau một cách tình cờ**, nên lỗi
này chỉ lộ ra ở đúng một vai trong ba.

#### Frontend — tab Phiên đăng nhập bỏ được dải nhãn dữ liệu mẫu

Hai lớp quen thuộc, `services/sessions.ts` và `hooks/useSessions.ts`. Ba điểm đáng ghi:

**Hàm gọi API không có tham số phạm vi nào cả.** Máy chủ tự quyết người gọi thấy được gì; thêm
một tham số kiểu `?tenantId=` là mời trình duyệt tự khai mình được xem gì.

**Nạp lại sau khi ghi là bắt buộc, không phải tối ưu.** Thu hồi làm đổi trạng thái của đúng một
bản ghi, nhưng nó cũng làm đổi thứ tự cả danh sách — phiên đã đóng tụt xuống dưới. Vá tại chỗ
thì hàng vẫn nằm nguyên vị trí cũ và người dùng tưởng thao tác chưa ăn.

**`toAdminSession` là bộ chuyển đổi thứ ba của dự án**, cùng khuôn với `toReceptionAppointment`
(ngày 14) và `toTenantAppointment` (màn Lịch hẹn). Hai trường máy chủ có mà kiểu cũ không có —
`userEmail` và `activeTenantId` — cố ý **bỏ qua** thay vì nhét thêm vào `AdminSession`: cây
render không hiện chúng, và một trường không ai đọc là một trường sẽ lệch trong im lặng.

Kiểu `AdminSession` lộ ra hai chỗ sai khi đối chiếu với máy chủ:

| Trường | Trước | Sau |
|---|---|---|
| `role` | `'SUPERADMIN' \| 'SUPPORT'` | `'SUPERADMIN' \| 'TENANT_ADMIN' \| 'RECEPTIONIST'` |
| `status` | `'active' \| 'revoked'` | thêm `'expired'` |

`SUPPORT` là một vai **chưa bao giờ tồn tại** trong hệ thống, còn hai vai có thật thì thiếu. Bộ
dữ liệu mẫu cũ chỉ dựng phiên của Superadmin, nên không có gì lộ ra điều đó suốt hai mươi ngày.

Ba thứ nữa sửa cùng lượt:

- Câu mô tả cũ hứa "vị trí" và "xác thực MFA" — thực thể `AppSession` ghi rõ **cố ý không lưu**
  `Location`, `Trusted`, `Suspicious`, `MfaVerified` vì chúng không có nguồn dữ liệu thật. Nay
  tiêu đề nói đúng những gì hiện ra: thiết bị, địa chỉ IP, lần hoạt động cuối.
- Nút "Đăng xuất thiết bị khác" gửi **tuần tự từng request**. Máy chủ không có endpoint thu hồi
  hàng loạt và cố ý không có: mỗi lần thu hồi là một quyết định về một người cụ thể. Tuần tự chứ
  không song song để thứ tự lỗi khớp thứ tự trên màn hình; báo kết quả dạng "thu hồi được 3/4".
- Bỏ dòng đồng bộ qua `localStorage` giữa các tab: nguồn sự thật nay là máy chủ.

Đây là dải nhãn nội tuyến thứ tư, và cũng là cái cuối cùng thuộc dạng "cả tab là dữ liệu mẫu" —
`CLAUDE.md` nay ghi ba màn giữ nhãn riêng thay vì bốn.

#### Kiểm chứng

| Phép thử | Kết quả |
|---|---|
| `dotnet test` | **82/82**, 10 giây — trước lát cắt này là 75 |
| `dotnet build -warnaserror` | 0 warning · 0 error |
| `npm run lint` | Xanh |
| `npm run build` | Xanh, 4,92 giây |
| Bảy phép thử mới | Superadmin thấy cả ba vai · chủ tiệm không thấy phiên Superadmin · lễ tân `403` · tự thu hồi `403` · thu hồi xuyên tiệm `404` · **người bị thu hồi nhận `401` ngay ở request kế tiếp** · thu hồi hai lần đều `200` |
| Migration | Không có cái nào |

Phép thử đáng giá nhất là cái thứ sáu: nó chứng minh thu hồi **thật sự có hiệu lực** chứ không
chỉ đổi một cột. Lễ tân gọi `GET /api/appointments` được `200`, bị đóng phiên, gọi lại đúng
endpoint ấy nhận `401`. Nếu `SessionMiddleware` ngừng đọc lại phiên ở mỗi request thì phép thử
này đỏ — và đó đúng là thứ BR-AUTH-022 hứa.

> **Chưa kiểm chứng trên trình duyệt.** Những phép trên đều là kiểm ở tầng mã nguồn và API. Lượt
> bấm tay trên giao diện — mở hai trình duyệt, đóng phiên bên này, xem bên kia bị đá ra ở thao
> tác kế tiếp — vẫn còn nợ.

#### Việc còn treo sau ngày 21

Mười hai việc treo sau ngày 20 giữ nguyên. Lát cắt này thêm hai:

| # | Việc | Mức |
|---|---|---|
| 13 | **Thu hồi một phiên không ghi nhật ký kiểm toán.** `AuditEvent` không có mục nào cho việc này, trong khi nó là thao tác bảo mật có hậu quả tức thì — và nó nằm ngay cạnh danh sách nhật ký, trên cùng một màn | Trung bình |
| 14 | **Chủ tiệm có quyền nhưng chưa có màn.** Ma trận cho `TenantAdmin` ô `Feature.Sessions`, máy chủ thu hẹp đúng theo tiệm và đã có phép thử che, nhưng `SecurityAndLogs` chỉ nằm trong cổng Superadmin — chưa cổng nào của chủ tiệm gọi tới `useSessions` | Thấp |
