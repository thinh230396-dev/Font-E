# SalonSys — Business Rules (MVP)

Tài liệu này là **nguồn sự thật duy nhất** về nghiệp vụ để thiết kế database, viết API và nối frontend.

Mọi rule ở đây được chốt qua 77 quyết định trong phiên phỏng vấn ngày 24/08/2026. Mỗi rule có mã `BR-{MODULE}-{SỐ}` và ghi nguồn quyết định (`Q##`) để truy ngược.

| | |
|---|---|
| **Bối cảnh** | Đồ án cá nhân, làm một mình, **còn 20 ngày** |
| **Mục tiêu** | MVP chạy end-to-end, demo được, nộp được — **không phải** hệ thống production |
| **Backend** | **ASP.NET Core 10 + EF Core + SQL Server 2022**, solution riêng tại `C:\Users\letru\source\repos\NailManagement` |
| **Tài liệu liên quan** | [README-BACKEND-ROADMAP.md](README-BACKEND-ROADMAP.md) — lịch dựng backend theo ngày · [README.md](README.md) — đặc tả giao diện · [README-MIGRATION.md](README-MIGRATION.md) — hiện trạng frontend |

> ⚠️ **Ô "Backend" từng ghi "Node + Express + SQLite (Q1A)".** Q1A chốt như vậy trong phiên phỏng
> vấn ngày 24/08, nhưng cùng ngày hôm đó đã đổi: xem `README-BACKEND-ROADMAP.md` §0, các quyết định
> thay thế 2′, 3′ và 11′. Hai chỗ chịu ảnh hưởng trực tiếp — BR-BAK-003 ở §14 và hàng 15 của bảng
> §20 — đều đã sửa theo. *(soát tài liệu cuối ngày 13)*

---

## Mục lục

1. [Project Scope](#1-project-scope) · 2. [MVP Scope](#2-mvp-scope) · 3. [Roles & Permissions](#3-roles--permissions) · 4. [Tenant Rules](#4-tenant-rules) · 5. [Branch Rules](#5-branch-rules) · 6. [Employee Rules](#6-employee-rules) · 7. [Customer Rules](#7-customer-rules) · 8. [Service Rules](#8-service-rules) · 9. [Appointment Rules](#9-appointment-rules) · 10. [Payment & Invoice Rules](#10-payment--invoice-rules) · 11. [Revenue & Expense Rules](#11-revenue--expense-rules) · 12. [Subscription Rules](#12-subscription-rules) · 13. [Notification Rules](#13-notification-rules) · 14. [Backup & Restore Rules](#14-backup--restore-rules) · 15. [Audit Log Rules](#15-audit-log-rules) · 16. [Status Transition Rules](#16-status-transition-rules) · 17. [Validation Rules](#17-validation-rules) · 18. [Delete / Soft Delete Rules](#18-delete--soft-delete-rules) · 19. [Data Ownership & Tenant Isolation](#19-data-ownership--tenant-isolation) · 20. [MVP Simplifications](#20-mvp-simplifications) · 21. [Out of Scope / Post-MVP](#21-out-of-scope--post-mvp) · 22. [Open Questions](#22-open-questions)

---

## 1. Project Scope

**SalonSys** là hệ thống SaaS đa tenant quản lý chuỗi tiệm nail / salon làm đẹp. Một đơn vị vận hành (`tenant`) thuê hệ thống theo gói đăng ký, có nhiều chi nhánh, nhân viên, khách hàng, và vận hành lịch hẹn + thu tiền tại quầy.

**Ba tầng nghiệp vụ:**

| Tầng | Ai dùng | Làm gì |
|---|---|---|
| Nền tảng | Superadmin | Bán và quản lý gói đăng ký cho các tenant |
| Thương hiệu | Tenant Admin | Điều hành chuỗi: chi nhánh, nhân sự, dịch vụ, khách, báo cáo |
| Quầy | Receptionist | Tác nghiệp trong ca: lịch hẹn, check-in, thu tiền |

**Vòng nghiệp vụ chính (mạch demo):**

```
Superadmin tạo tenant + cấp tài khoản chủ tiệm
        ↓
Chủ tiệm lập chi nhánh, dịch vụ, nhân viên, cấp tài khoản lễ tân
        ↓
Lễ tân tạo lịch hẹn cho khách  →  check-in  →  phục vụ
        ↓
Lễ tân thu tiền  →  hóa đơn PAID  →  lịch hẹn tự COMPLETED
        ↓
Chủ tiệm xem báo cáo doanh thu theo ngày / chi nhánh / nhân viên / dịch vụ
```

---

## 2. MVP Scope

### 2.1 Trong phạm vi — có API thật + database

| # | Module | Ghi chú |
|---|---|---|
| 1 | **Auth** | Đăng nhập, phiên, phân quyền, `user_tenants`, `active_tenant_id` |
| 2 | **Tenant** | Vòng đời tenant, hạn sử dụng |
| 3 | **Subscription Package** | Gói, quyền tính năng, hạn mức, yêu cầu nâng cấp |
| 4 | **Branch** | Chi nhánh |
| 5 | **Service** | Dịch vụ & giá |
| 6 | **Staff** | Nhân viên (kỹ thuật viên + lễ tân) |
| 7 | **Customer** | Hồ sơ khách hàng của tiệm |
| 8 | **Appointment** | Lịch hẹn |
| 9 | **Invoice** | **Hai loại**: hóa đơn đăng ký + hóa đơn bán hàng |
| 10 | **Audit Log** | Nhật ký 8 loại sự kiện |

Ước lượng **~20 bảng database**.

### 2.2 Ngoài phạm vi — giữ nguyên `localStorage`

Đặt lịch online · Kho vật tư · Thu & Chi · Vệ sinh & an toàn · Thư viện màu & mẫu nail · Loyalty · Ghế & khu vực · Bản tin & thông báo · Trung tâm hỗ trợ · Cấu hình hệ thống · Sao lưu · Báo cáo nâng cao · **Vai trò Khách hàng**

> Đây là **quyết định thiết kế có chủ đích**, không phải thiếu sót. Các màn hình này đã dựng xong và vẫn chạy được bằng dữ liệu cục bộ khi demo.

### 2.3 Phân loại mức độ

| Mức | Nội dung |
|---|---|
| **MUST HAVE** | Auth · Tenant · Branch · Service · Staff · Customer · Appointment · Sales Invoice · Tenant Isolation |
| **SHOULD HAVE** | Subscription Package · Entitlement theo gói · Subscription Invoice · Audit Log · Báo cáo doanh thu |
| **NICE TO HAVE** | Hoàn tiền · Tip · Cọc · Chia nhiều phương thức thanh toán · Hoa hồng |
| **POST-MVP** | Toàn bộ mục 2.2 · Xem §21 |

---

## 3. Roles & Permissions

### 3.1 Vai trò

**BR-AUTH-001** — Hệ thống có **đúng 3 vai trò đăng nhập**: `SUPERADMIN`, `TENANT_ADMIN`, `RECEPTIONIST`. *(Q7A)*

**BR-AUTH-002** — Kỹ thuật viên **không có tài khoản đăng nhập**. Họ tồn tại như dữ liệu nhân sự (`staff.role = TECHNICIAN`). *(Q7A)*

**BR-AUTH-003** — Không có vai trò `CUSTOMER`. Khách hàng không đăng nhập vào hệ thống. *(Q3C)*

**BR-AUTH-004** — Không có vai trò `SUPPORT`, và **không có** phân cấp `Owner`/`Manager`/`Staff` trong tenant. *(Q12A, Q13A)*

### 3.2 Tạo tài khoản

**BR-AUTH-010** — Chỉ `SUPERADMIN` tạo được tài khoản `TENANT_ADMIN`. *(Q8A)*

**BR-AUTH-011** — Chỉ `TENANT_ADMIN` tạo được tài khoản `RECEPTIONIST`, và chỉ trong tenant đang active của phiên mình. *(Q8A, Q5B)*

**BR-AUTH-012** — Không có chức năng tự đăng ký. Mọi tài khoản do cấp trên tạo. *(Q8A)*

**BR-AUTH-013** — Tài khoản `RECEPTIONIST` **bắt buộc** phải gắn với một hồ sơ nhân viên đã tồn tại (`staff_id NOT NULL`). Quy trình: tạo hồ sơ nhân viên trước → bấm "Cấp tài khoản đăng nhập" trên hồ sơ đó. *(Q31B)*

**BR-AUTH-014** — Tài khoản `SUPERADMIN` và `TENANT_ADMIN` có `staff_id = NULL`, do đó **không thuộc chi nhánh nào**. *(Q31B)*

### 3.3 Phiên đăng nhập & khóa tài khoản

**BR-AUTH-020** — Tài khoản có 3 trạng thái: `ACTIVE` (bình thường), `SUSPENDED` (khóa tạm, mở lại được), `INACTIVE` (đã vô hiệu vĩnh viễn — kết quả của thao tác "xóa"). *(Q11A, Q15A)*

**BR-AUTH-021** — Tài khoản `SUSPENDED` hoặc `INACTIVE` **không đăng nhập được**. *(Q11A)*

**BR-AUTH-022** — Khi tài khoản bị chuyển khỏi `ACTIVE`, **phiên đang mở bị vô hiệu ngay ở request kế tiếp**. Trạng thái tài khoản phải được kiểm tra ở mỗi lần đọc phiên, không chỉ lúc đăng nhập. *(Q11A)*

**BR-AUTH-023** — Một tài khoản `TENANT_ADMIN` **có thể quản lý nhiều tenant**, lưu qua bảng nối `user_tenants`. *(Q5B)*

**BR-AUTH-024** — Phiên đăng nhập lưu `active_tenant_id` — tenant đang làm việc. Mọi truy vấn dữ liệu tenant dùng giá trị này. *(Q3-scope A)*

**BR-AUTH-025** — Đổi tenant đang làm việc thực hiện qua **một endpoint đổi phiên**, không phải bằng cách gửi kèm tenant vào từng request. *(Q3-scope A)*

**BR-AUTH-026** — Khi đặt `active_tenant_id`, server **bắt buộc** kiểm tra tenant đó có trong `user_tenants` của user. *(Q5B)*

> ⚠️ **Đánh đổi đã chấp nhận:** vì tenant đang chọn nằm trong phiên, mở 2 tab xem 2 tenant khác nhau sẽ đá nhau. Chấp nhận được ở MVP.

### 3.4 Ma trận phân quyền

`✅` toàn quyền · `👁` chỉ xem · `❌` không truy cập

| Chức năng | Superadmin | TenantAdmin | Receptionist |
|---|:--:|:--:|:--:|
| Tenant: tạo / sửa / khóa / xóa mềm | ✅ | ❌ | ❌ |
| Gói dịch vụ: tạo / sửa / ngừng bán | ✅ | ❌ | ❌ |
| Hóa đơn **đăng ký** | ✅ | 👁 + nộp chứng từ | ❌ |
| Yêu cầu nâng cấp gói | ✅ duyệt | ✅ gửi / hủy | ❌ |
| Tài khoản TenantAdmin | ✅ | ❌ | ❌ |
| Tài khoản Receptionist | ❌ | ✅ | ❌ |
| **Hồ sơ tiệm mình** | ❌ | 👁 | ❌ |
| Chi nhánh | ❌ | ✅ | 👁 |
| Nhân viên | ❌ | ✅ | 👁 *chi nhánh mình* |
| Dịch vụ | ❌ | ✅ | 👁 |
| Khách hàng | ❌ | ✅ | ✅ *toàn tenant* |
| Lịch hẹn | ❌ | ✅ *toàn tenant* | ✅ *chi nhánh mình* |
| Hóa đơn **bán hàng**: tạo + thu tiền | ❌ | ✅ | ✅ *chi nhánh mình* |
| Hoàn tiền | ❌ | ✅ | ❌ |
| Hoàn tất lịch khi chưa thu đủ | ❌ | ✅ | ❌ |
| Báo cáo doanh thu tiệm | ❌ | ✅ | ❌ |
| Nhật ký kiểm toán | ✅ | 👁 *tenant mình* | ❌ |

> **Hàng "Hồ sơ tiệm mình" bổ sung khi soát tài liệu cuối ngày 13.** Nó cố ý **tách khỏi hàng
> "Tenant"** ở đầu bảng: hàng đó nói về việc quản lý tiệm *của người khác* — tạo, sửa, khóa, xóa
> mềm — và vẫn là ô riêng của Superadmin. Đọc hồ sơ tiệm mình đang làm việc (tên tiệm, gói, hạn
> dùng) là chuyện khác hẳn, và phiên phỏng vấn không có hàng nào cho nó vì màn hình cũ đọc thẳng
> từ `localStorage`. Lễ tân **không** có ô này: hồ sơ tiệm mang theo danh sách chủ tiệm kèm email,
> giá gói và hạn dùng — thông tin hợp đồng, không phải thứ cần ở quầy. Trong mã nguồn đây là
> `Feature.OwnTenantProfile`.

**BR-AUTH-030** — `SUPERADMIN` **không truy cập được** dữ liệu nghiệp vụ bên trong tenant: lịch hẹn, khách hàng, nhân viên, hóa đơn bán hàng, báo cáo doanh thu tiệm. *(Q14A)*

**BR-AUTH-031** — Không có chức năng đăng nhập thay tenant (impersonate). *(Q14A)*

---

## 4. Tenant Rules

**BR-TENANT-001** — Tenant có 4 trạng thái hiển thị: `TRIAL`, `ACTIVE`, `OVERDUE`, `SUSPENDED`. Bỏ `EXPIRING`. *(Q16A)*

**BR-TENANT-002** — Database **chỉ lưu 2 trạng thái do người đặt**: `ACTIVE` và `SUSPENDED`, cộng cột `expires_at` và `is_trial`. `TRIAL` và `OVERDUE` được **tính lúc đọc**: *(Q26A)*

```
status_hiển_thị =
    SUSPENDED            nếu status = 'SUSPENDED'
    OVERDUE              nếu expires_at < hôm nay
    TRIAL                nếu is_trial = true
    ACTIVE               còn lại
```

**BR-TENANT-003** — **Không có job chạy nền nào** trong hệ thống. Mọi trạng thái phụ thuộc thời gian đều tính lúc đọc. *(Q18B, Q26A)*

**BR-TENANT-004** — Khi tạo tenant, Superadmin chọn một trong hai: **tạo tài khoản chủ tiệm mới**, hoặc **gán một TenantAdmin đã tồn tại**. *(Q17B)*

**BR-TENANT-005** — Tạo tenant **luôn tự tạo kèm một chi nhánh chính mặc định**. Tenant không bao giờ ở trạng thái không có chi nhánh nào. *(Q27A)*

**BR-TENANT-006** — Superadmin **nhập tay** `expires_at` khi tạo và khi gia hạn tenant. *(Q18B)*

**BR-TENANT-007** — **Không có thời gian ân hạn.** Quá `expires_at` là tenant chuyển sang chế độ chỉ-đọc ngay. *(Q20B)*

### 4.1 Tenant hết hạn — chế độ chỉ-đọc

**BR-TENANT-010** — Tenant `OVERDUE` hoặc `SUSPENDED`: mọi tài khoản của tenant **vẫn đăng nhập và xem được toàn bộ dữ liệu**, nhưng **mọi thao tác ghi bị chặn**. *(Q19B)*

**BR-TENANT-011** — Danh sách **miễn trừ** khỏi BR-TENANT-010 — vẫn ghi được để tenant tự thoát khỏi tình trạng bị khóa: *(Q19B)*
- Gửi / hủy yêu cầu nâng cấp hoặc gia hạn gói
- Nộp chứng từ thanh toán cho hóa đơn đăng ký

**BR-TENANT-012** — Chặn ghi cài đặt ở **một middleware duy nhất** ở tầng API: từ chối mọi `POST/PUT/PATCH/DELETE` trừ 2 nhóm endpoint ở BR-TENANT-011. Frontend không cần biết về rule này. *(Q19B)*

**BR-TENANT-013** — Thứ tự kiểm tra quyền **không được đảo**: *(Q19B + Q22A)*

```
1. Tenant còn hạn không?     → không thì chỉ-đọc, bất kể gói gì
2. Gói có mở tính năng này?  → không thì 403
3. Vai trò có quyền không?   → không thì 403
4. Dữ liệu có thuộc tenant?  → không thì 404
```

### 4.2 Xóa tenant

**BR-TENANT-020** — "Xóa tenant" = **xóa mềm** (`deleted_at`). Dữ liệu ở lại database. *(Q25A)*

**BR-TENANT-021** — Xóa mềm tenant chỉ gỡ liên kết trong `user_tenants`. Tài khoản chỉ bị chặn đăng nhập **khi không còn tenant nào**. *(Q5B + Q25A)*

**BR-TENANT-022** — Hóa đơn đăng ký của tenant đã xóa mềm **vẫn giữ nguyên** và vẫn tính vào doanh thu nền tảng. *(Q25A)*

---

## 5. Branch Rules

**BR-BRANCH-001** — Mỗi tenant có **đúng một chi nhánh chính** (`is_primary = true`), tạo tự động cùng tenant. *(Q27A)*

**BR-BRANCH-002** — Chi nhánh chính **không xóa được, không vô hiệu hóa được**. *(Q27A)*

**BR-BRANCH-003** — Chi nhánh có 2 trạng thái dùng thật: `ACTIVE`, `INACTIVE`. *(Q28A)*

**BR-BRANCH-004** — "Xóa chi nhánh" = `status = INACTIVE`. Chi nhánh `INACTIVE`: **không tạo lịch hẹn mới được**, dữ liệu cũ vẫn xem và báo cáo bình thường. *(Q28A)*

**BR-BRANCH-005** — Số chi nhánh `ACTIVE` của tenant **không được vượt** `package.max_salons`. Kiểm tra bằng `COUNT` tại thời điểm tạo. *(Q21A)*

**BR-BRANCH-006** — **Dữ liệu dùng chung toàn tenant** (không chia theo chi nhánh): khách hàng, dịch vụ. *(Q29A, Q30A)*

**BR-BRANCH-007** — **Dữ liệu thuộc riêng chi nhánh**: lịch hẹn, nhân viên, hóa đơn bán hàng. *(Q9A)*

**BR-BRANCH-008** — Trường `service.branches` chỉ là **thông tin tham khảo hiển thị**, không cưỡng chế. Mọi dịch vụ dùng được ở mọi chi nhánh. *(Q30A)*

---

## 6. Employee Rules

**BR-EMP-001** — `staff` là bảng chính chứa hồ sơ nhân viên. Tài khoản đăng nhập tham chiếu tới nó qua `staff_id` (nullable). *(Q31B)*

**BR-EMP-002** — Nhân viên có 2 vai trò nghiệp vụ: `TECHNICIAN` (kỹ thuật viên) và `RECEPTIONIST` (lễ tân). Chỉ lễ tân được cấp tài khoản đăng nhập. *(Q7A, Q31B)*

**BR-EMP-003** — Mỗi nhân viên gắn **đúng một chi nhánh** (`branch_id`). Chuyển chi nhánh = sửa trường này. *(Q32A)*

**BR-EMP-004** — `branch_id` **chỉ lưu trên `staff`**. Tài khoản đăng nhập đọc chi nhánh qua `staff_id`, không lưu bản sao. *(Q31B + Q32A)*

**BR-EMP-005** — Nhân viên có 4 trạng thái: `WORKING`, `OFF_SHIFT`, `LEAVE`, `INACTIVE`. *(Q33A)*

**BR-EMP-006** — "Nhân viên nghỉ việc" = `status = INACTIVE`. Không xóa. Tên nhân viên vẫn hiện đúng trong lịch hẹn và hóa đơn cũ. *(Q33A)*

**BR-EMP-007** — Nhân viên `INACTIVE` **không được gán vào lịch hẹn mới**. *(suy ra từ Q33A)*

**BR-EMP-008** — Số nhân viên `status != INACTIVE` của tenant **không được vượt** `package.max_staff`. *(Q21A)*

**BR-EMP-009** — Mỗi nhân viên có **một ca cố định**: `shift_start`, `shift_end`. Không có lịch theo tuần, không có nghỉ phép, không có chấm công. *(Q34B)*

**BR-EMP-010** — Không cưỡng chế kỹ năng: **bất kỳ kỹ thuật viên nào cũng gán được cho bất kỳ dịch vụ nào**. Trường `skills` chỉ để hiển thị. *(Q43A)*

**BR-EMP-011** — Hoa hồng: lưu `commission_rate` trên nhân viên, **tính ra lúc hiển thị báo cáo** (`doanh thu nhân viên × commission_rate`). Không có bảng hoa hồng, không có chốt kỳ, không có duyệt chi. *(Q35B)*

---

## 7. Customer Rules

**BR-CUS-001** — Khách hàng thuộc **tenant**, dùng chung cho mọi chi nhánh. Lễ tân chi nhánh nào cũng tra cứu được toàn bộ khách của tenant. *(Q29A)*

**BR-CUS-002** — Số điện thoại khách **duy nhất trong phạm vi một tenant**. Hai tenant khác nhau được có cùng số điện thoại. *(Q37A)*

**BR-CUS-003** — Form tạo khách **chỉ bắt buộc số điện thoại**. Tên, email, ngày sinh, ghi chú đều tùy chọn. *(Q36A)*

**BR-CUS-004** — Mọi lịch hẹn và mọi hóa đơn bán hàng **bắt buộc gắn một hồ sơ khách**. Không có khách vãng lai ẩn danh. *(Q36A)*

**BR-CUS-005** — Khách hàng có 2 trạng thái: `ACTIVE`, `INACTIVE`. Bỏ `CARE`. *(Q40A)*

**BR-CUS-006** — "Xóa khách hàng" = `status = INACTIVE`. Lịch sử dịch vụ và hóa đơn **giữ nguyên**. *(Q40A)*

**BR-CUS-007** — Hạng khách (`tier`) **suy ra từ `total_spent`**, không lưu cột riêng, không có nghiệp vụ nâng/hạ hạng. *(Q38A)*

| Hạng | Điều kiện |
|---|---|
| `NEW` | Chưa có hóa đơn nào |
| `STANDARD` | `total_spent` < 5.000.000₫ |
| `LOYAL` | 5.000.000₫ ≤ `total_spent` < 20.000.000₫ |
| `VIP` | `total_spent` ≥ 20.000.000₫ |

> Ngưỡng trên là **đề xuất**, chưa được chốt — xem §22.

**BR-CUS-008** — **Không có điểm thưởng** (`points`). Hạng khách **không ảnh hưởng giá**. Nó chỉ là thông tin hiển thị để lễ tân nhận biết khách quen. *(Q38A, Q39A)*

**BR-CUS-009** — `total_spent` và `visits` **tính từ hóa đơn đã thanh toán**, không lưu sẵn dưới dạng cột đếm. *(suy ra từ Q38A + Q69A)*

---

## 8. Service Rules

**BR-SVC-001** — Dịch vụ thuộc tenant, dùng chung cho mọi chi nhánh. *(Q30A)*

**BR-SVC-002** — Mỗi dịch vụ có **đúng một giá**. Bỏ `member_price`. *(Q39A)*

**BR-SVC-003** — Mỗi dịch vụ có `duration` (phút) và `buffer_time` (phút, mặc định 0). *(Q48B)*

**BR-SVC-004** — Dịch vụ có 2 trạng thái: `ACTIVE`, `INACTIVE`. *(Q42A)*

**BR-SVC-005** — "Ngừng dịch vụ" = `status = INACTIVE`. Không đặt lịch mới được. Lịch hẹn và hóa đơn cũ **giữ nguyên**. *(Q42A)*

**BR-SVC-006** — **Đổi giá dịch vụ không ảnh hưởng hóa đơn đã lập.** Dòng hóa đơn lưu `unit_price` của chính nó tại thời điểm lập, không tham chiếu ngược sang bảng dịch vụ. *(Q41A)*

**BR-SVC-007** — Lịch hẹn **chưa hoàn tất** lấy giá hiện tại của dịch vụ khi lập hóa đơn. *(Q41A)*

**BR-SVC-008** — **Không có cấu trúc combo.** Một "combo" chỉ là một bản ghi dịch vụ thông thường có giá riêng. Không có dịch vụ con, không tự tính giá gộp. *(Q44A)*

**BR-SVC-009** — Không có thuế theo dịch vụ. `tax_rate` bỏ khỏi model. *(Q64A)*

---

## 9. Appointment Rules

### 9.1 Tạo và sửa

**BR-APT-001** — `RECEPTIONIST` và `TENANT_ADMIN` được tạo lịch hẹn. `SUPERADMIN` **không**. *(Q45A, Q14A)*

**BR-APT-002** — `RECEPTIONIST` chỉ thao tác lịch hẹn **thuộc chi nhánh mình**. `TENANT_ADMIN` thao tác toàn tenant. *(Q9A)*

**BR-APT-003** — Một lịch hẹn chứa **nhiều dịch vụ**, lưu ở bảng con `appointment_services`. Bắt buộc **ít nhất 1 dòng**. *(Q50A)*

**BR-APT-004** — Một lịch hẹn có **đúng một kỹ thuật viên** phụ trách toàn bộ. *(Q51A)*

**BR-APT-005** — Cho phép **đặt lịch trong quá khứ**, hệ thống chỉ cảnh báo, không chặn. Lễ tân cần ghi bù cho khách vừa làm xong. *(Q46C)*

**BR-APT-006** — Trường `station` (ghế/phòng) là **ô chữ tự do, không bắt buộc**, không tham chiếu bảng nào. *(quyết định bổ sung c)*

**BR-APT-007** — Trường `source` (`ONLINE`/`RECEPTION`/`PHONE`/`ZALO`) do lễ tân **chọn tay**. Không có hệ thống nào tự sinh lịch hẹn `ONLINE` vì vai trò Khách hàng nằm ngoài phạm vi. *(Q3C, Q2B)*

### 9.2 Chống trùng lịch — rule cốt lõi

**BR-APT-010** — Khoảng thời gian một lịch hẹn chiếm chỗ: *(Q47A, Q48B, Q50A)*

```
thời_lượng = Σ(service.duration) + Σ(service.buffer_time)
khoảng     = [start_at, start_at + thời_lượng)
```

**BR-APT-011** — **Một kỹ thuật viên không được có hai lịch hẹn chồng lấn thời gian.** Chặn cứng ở tầng API, không phải chỉ cảnh báo ở giao diện. *(Q47A)*

```
Trùng khi:  start_mới < end_cũ  AND  end_mới > start_cũ
```

**BR-APT-012** — Lịch hẹn ở trạng thái `CANCELLED` hoặc `NO_SHOW` **không chiếm chỗ**, bị loại khỏi phép kiểm tra ở BR-APT-011. *(Q47A)*

**BR-APT-013** — Đặt lịch ngoài ca của kỹ thuật viên (`shift_start`–`shift_end`) → **cảnh báo, vẫn cho lưu**. *(Q49B)*

**BR-APT-014** — Không kiểm tra giờ mở cửa chi nhánh, không kiểm tra ngày nghỉ lễ. *(Q49B)*

### 9.3 Vòng đời

**BR-APT-020** — Lịch hẹn có **7 trạng thái**: `PENDING`, `CONFIRMED`, `CHECKED_IN`, `IN_SERVICE`, `COMPLETED`, `CANCELLED`, `NO_SHOW`. **Bỏ `REFUNDED`** — hoàn tiền là chuyện của hóa đơn. *(Q52A)*

**BR-APT-021** — Trạng thái khởi tạo là `PENDING`. Lễ tân tạo trực tiếp tại quầy được phép tạo thẳng ở `CONFIRMED`. *(Q52A)*

**BR-APT-022** — Sơ đồ chuyển trạng thái ở §16.1. Mọi chuyển đổi không có trong sơ đồ đều bị từ chối. *(Q52A)*

**BR-APT-023** — Lịch hẹn `COMPLETED` **không sửa được bất kỳ trường nào**. Muốn điều chỉnh phải xử lý qua hóa đơn. *(Q53A)*

**BR-APT-024** — **Không có chức năng xóa lịch hẹn.** Chỉ có `CANCELLED`. *(Q54A)*

**BR-APT-025** — Dời lịch = **sửa `start_at`** trên chính lịch hẹn đó, giữ nguyên trạng thái. Chỉ cho dời khi đang `PENDING` hoặc `CONFIRMED`. Phải chạy lại BR-APT-011. *(Q55A)*

**BR-APT-026** — Chuyển sang `COMPLETED` **chỉ xảy ra tự động** khi hóa đơn gắn với lịch hẹn chuyển `PAID`. *(Q58A)*

**BR-APT-027** — **Ngoại lệ:** `TENANT_ADMIN` được chuyển tay `IN_SERVICE → COMPLETED` khi hóa đơn **chưa thu đủ** — gồm cả ba trường hợp: hóa đơn còn `PARTIAL`, hóa đơn còn `PENDING`, và **lịch chưa có hóa đơn nào**. Hệ thống ghi chú *"hoàn tất khi chưa thu đủ"* trong cả ba. `RECEPTIONIST` **không** có quyền này. *(Q72A, mở rộng bởi quyết định 58 ngày 13)*

> **Vì sao mở rộng khỏi mỗi ca `PARTIAL`.** Ca đáng lo nhất không phải khách trả thiếu, mà là khách bỏ về giữa chừng **không trả đồng nào**: lúc đó lịch thường chưa có hóa đơn, mà BR-APT-040 lại cấm hủy một lịch đang phục vụ. Bó ngoại lệ này vào đúng chữ `PARTIAL` nghĩa là lịch ấy **kẹt vĩnh viễn** ở `IN_SERVICE`, không vai trò nào đóng được, và bảng lịch của tiệm mang theo một dòng chết. Xem `README-BACKEND-ROADMAP.md` §5 ngày 13.

### 9.4 Tiền đặt cọc

**BR-APT-030** — Lịch hẹn có trường `deposit` — số tiền khách đã trả trước. *(Q56B)*

**BR-APT-031** — Khi tạo hóa đơn từ lịch hẹn, tiền cọc trở thành **một dòng `invoice_payments` loại `DEPOSIT`** đã ghi nhận. *(Q65A)*

**BR-APT-032** — **Không có luật hoàn cọc, không có luật mất cọc.** Hủy lịch hoặc `NO_SHOW` có cọc: hệ thống **chỉ ghi chú**, không tự động xử lý tiền. Việc thỏa thuận với khách nằm ngoài phần mềm. *(Q56B, Q65A)*

---

## 10. Payment & Invoice Rules

### 10.1 Hai loại hóa đơn — không được nhầm

**BR-INV-001** — Hệ thống có **hai bảng hóa đơn hoàn toàn tách biệt**: *(Q57A)*

| Bảng | Ai trả cho ai | Ai quản lý |
|---|---|---|
| `subscription_invoices` | Tenant → SalonSys | Superadmin |
| `sales_invoices` | Khách → Tiệm | TenantAdmin + Receptionist |

### 10.2 Hóa đơn bán hàng — tạo và vòng đời

**BR-INV-010** — Hóa đơn bán hàng được tạo khi lễ tân bấm **"Thanh toán"** trên một lịch hẹn đang ở `CHECKED_IN` hoặc `IN_SERVICE`. Các dòng hóa đơn lấy từ `appointment_services`. *(Q58A)*

**BR-INV-011** — Cho phép tạo hóa đơn **không gắn lịch hẹn** (khách mua lẻ). `appointment_id` là nullable. *(Q58A)*

**BR-INV-012** — Dòng hóa đơn có `service_id` **nullable**. Dòng không gắn dịch vụ = mục nhập tay tự do (`name` + `unit_price`). Không cần bảng sản phẩm. *(quyết định bổ sung a)*

**BR-INV-013** — Hóa đơn bán hàng có **5 trạng thái**: `PENDING`, `PARTIAL`, `PAID`, `REFUNDED`, `CANCELLED`. **Bỏ `FAILED`** — không có cổng thanh toán thật nên không có giao dịch thất bại. *(Q61A)*

**BR-INV-014** — Hóa đơn `PAID` **không sửa được, không hủy được**. Sai sót xử lý bằng hoàn tiền. *(Q67A)*

**BR-INV-015** — Hóa đơn `PENDING` hoặc `PARTIAL` sửa và hủy được bình thường. *(Q67A)*

**BR-INV-016** — Số hóa đơn theo định dạng `HD-{yyyyMMdd}-{nnn}`, đánh số theo **từng tenant, reset mỗi ngày**. Sinh trong transaction để tránh trùng. *(Q68A)*

### 10.3 Công thức tiền

**BR-INV-020** — Công thức bắt buộc: *(Q41A, Q62A, Q63A, Q65A)*

```
subtotal   = Σ (unit_price × quantity)        ← giá chốt lúc lập hóa đơn
total      = subtotal − discount + tip
đã_thu     = Σ invoice_payments.amount        ← gồm cả dòng DEPOSIT
còn_lại    = total − đã_thu
```

**BR-INV-021** — Giảm giá là **số tiền nhập tay** kèm ô lý do. Không có mã voucher, không có phần trăm. Ràng buộc `0 ≤ discount ≤ subtotal`. *(Q62A)*

**BR-INV-022** — Tip cộng vào `total` (khách trả) nhưng **không tính vào doanh thu tiệm**. *(Q63A)*

**BR-INV-023** — **Không có VAT.** `tax = 0`, giá niêm yết đã bao gồm thuế. *(Q64A)*

### 10.4 Thanh toán

**BR-PAY-001** — Mỗi lần thu tiền tạo **một dòng `invoice_payments`**: `method`, `amount`, `paid_at`, `reference`, `type`. *(Q59A)*

**BR-PAY-002** — `invoice_payments.type` có 3 giá trị: `DEPOSIT` (cọc), `PAYMENT` (thu thường), `REFUND` (hoàn tiền, `amount` âm). *(Q59A, Q65A, Q66A)*

**BR-PAY-003** — Trạng thái hóa đơn suy ra từ tổng thu: *(Q59A)*

```
PAID     nếu đã_thu ≥ total
PARTIAL  nếu 0 < đã_thu < total
PENDING  nếu đã_thu = 0
```

> Dấu `≥` ở dòng đầu chỉ mô tả trạng thái, **không phải giấy phép thu vượt** — xem BR-PAY-009.
> Nó cần thiết vì tiền cọc có thể lớn hơn tổng hóa đơn cuối cùng. *(làm rõ ở ngày 19)*

**BR-PAY-004** — **Chia nhiều phương thức trong một lần thu** được hỗ trợ tự nhiên: mỗi phương thức là một dòng `invoice_payments`. *(Q60A)*

**BR-PAY-005** — 5 phương thức thanh toán: `CASH`, `BANK`, `CARD`, `MOMO`, `ZALOPAY`. Đây **chỉ là nhãn ghi nhận thủ công**, không tích hợp cổng thanh toán thật. *(Q61A)*

**BR-PAY-006** — Hoàn tiền tạo **một dòng `invoice_payments` với `amount` âm**, kèm lý do bắt buộc. *(Q66A)*

**BR-PAY-007** — **Chỉ `TENANT_ADMIN` được hoàn tiền.** `RECEPTIONIST` thu tiền được nhưng **không** hoàn tiền được. *(Q66A)*

**BR-PAY-008** — Tổng hoàn không được vượt tổng đã thu. *(suy ra từ Q66A)*

**BR-PAY-009** — **Một lần thu không được vượt số tiền hóa đơn còn thiếu**, và hóa đơn đã thu đủ
thì không thu thêm được. Áp dụng cho dòng `PAYMENT`; dòng `DEPOSIT` không chịu ràng buộc này vì
BR-APT-032 không buộc tiền cọc phải nhỏ hơn hóa đơn, còn dòng `REFUND` đã có trần riêng ở
BR-PAY-008. *(quyết định ngày 19 — buổi tổng duyệt)*

> Rule này **đảo lại một chủ ý cũ**. Trước ngày 19 hệ thống cố ý cho thu vượt, với lý do khách đưa
> dư rồi lấy lại tiền thừa là chuyện thường ở quầy. Buổi tổng duyệt cho thấy cái giá: `remaining`
> thành số âm, và vì BR-REV-001 trừ tip theo tỉ lệ trên tiền đã thu, phần dư đi thẳng vào doanh
> thu — một hóa đơn 320.000 ₫ thu 350.000 ₫ báo doanh thu 328.125 ₫. Tiền thối lại cho khách không
> phải doanh thu, nên số ghi vào sổ là số **phải thu**, không phải số tiền khách đưa ra.

### 10.5 Hóa đơn đăng ký

**BR-INV-030** — Hóa đơn đăng ký được sinh tự động khi: tạo tenant mới, duyệt yêu cầu nâng cấp gói, gia hạn. *(Q23A)*

**BR-INV-031** — Hóa đơn đăng ký **không bao giờ xóa được** — là chứng từ tài chính. *(Q75A)*

**BR-INV-032** — TenantAdmin **nộp chứng từ thanh toán** (mã giao dịch + ghi chú); Superadmin **xác nhận** hóa đơn `PAID`. *(Q23A, Q19B)*

**BR-INV-033** — Hóa đơn đăng ký `PAID` sẽ kích hoạt gói và **gia hạn `expires_at`** của tenant. *(Q23A)*

---

## 11. Revenue & Expense Rules

**BR-REV-001** — Doanh thu tiệm ghi nhận **theo tiền thực thu** (cơ sở tiền mặt), không theo lịch hẹn hoàn tất: *(Q69A)*

```
doanh_thu = Σ(invoice_payments.amount)  −  Σ(tip của các hóa đơn liên quan)
            ↑ dòng REFUND âm nên đã tự trừ hoàn tiền
```

**BR-REV-002** — Tip **không** thuộc doanh thu tiệm. *(Q63A)*

**BR-REV-003** — Hoàn tiền **làm giảm** doanh thu tại ngày hoàn, không sửa lại doanh thu ngày cũ. *(Q66A, Q69A)*

**BR-REV-004** — Báo cáo doanh thu có **4 chiều**, tất cả tính bằng `GROUP BY` trên hóa đơn và dòng hóa đơn: theo **ngày**, **chi nhánh**, **nhân viên**, **dịch vụ**. *(Q71A)*

**BR-REV-005** — Doanh thu theo nhân viên là nguồn tính hoa hồng ở BR-EMP-011. *(Q35B)*

**BR-REV-006** — API chỉ cung cấp **endpoint tổng hợp doanh thu**. Màn hình báo cáo nâng cao (template, lịch gửi định kỳ, xuất file) nằm ngoài phạm vi. *(Q71A, Q2B)*

**BR-REV-007** — **Không có module chi phí (Expense).** Sổ Thu–Chi giữ nguyên ở `localStorage`. Hệ thống **không tính lợi nhuận**. *(Q70A)*

**BR-REV-008** — Doanh thu nền tảng (`tenant.monthly_revenue` hiển thị cho Superadmin) là **tiền tenant trả cho SalonSys**, tính từ `subscription_invoices` — **không phải** doanh thu bán hàng của tiệm. *(Q24A)*

> ⚠️ Dữ liệu mẫu hiện tại (`INITIAL_TENANTS` có `monthlyRevenue: 128.000.000₫`) đang sai ngữ cảnh này. Phải sửa khi seed database.

---

## 12. Subscription Rules

**BR-SUB-001** — Gói dịch vụ có 4 trạng thái: `DRAFT`, `ACTIVE`, `DEPRECATED`, `ARCHIVED`. *(giữ từ code hiện có)*

**BR-SUB-002** — Gói `DEPRECATED` **không nhận đăng ký mới**, tenant đang dùng vẫn giữ nguyên. *(code hiện có)*

**BR-SUB-003** — Gói **không xóa được** khi còn tenant sử dụng. *(Q75A)*

**BR-SUB-004** — Giá gói được **khóa theo phiên bản** tại thời điểm tenant đăng ký (`subscription_price`, `subscription_package_version`). Đổi bảng giá **không** ảnh hưởng tenant đang dùng. *(code hiện có, giữ nguyên)*

**BR-SUB-005** — Hạn mức **được cưỡng chế thật** chỉ gồm 2 loại: `max_salons` (BR-BRANCH-005) và `max_staff` (BR-EMP-008). *(Q21A)*

**BR-SUB-006** — Các hạn mức còn lại (`appointmentsPerMonth`, `storageGb`, `messagesPerMonth`, `apiCallsPerMonth`, `customDomains`, `dataRetentionDays`) **chỉ hiển thị trên bảng giá**, không đo lường, không cưỡng chế. *(Q21A)*

**BR-SUB-007** — Khóa tính năng theo gói dùng **nguyên bảng ánh xạ hiện có** trong `src/utils/tenantAdminEntitlements.ts`, chuyển xuống server. Gói chuẩn cộng dồn: Basic ⊂ Premium ⊂ Enterprise. *(Q22A)*

**BR-SUB-008** — Luồng nâng cấp gói giữ nguyên **5 bước**: *(Q23A)*

```
TenantAdmin gửi yêu cầu
      ↓
Superadmin duyệt (chọn hiệu lực: ngay / từ chu kỳ sau)
      ↓
Hệ thống sinh hóa đơn đăng ký
      ↓
Tenant thanh toán, Superadmin xác nhận
      ↓
Gói mới kích hoạt, expires_at gia hạn
```

**BR-SUB-009** — Mỗi tenant chỉ có **tối đa một yêu cầu nâng cấp đang `PENDING`**. *(code hiện có)*

**BR-SUB-010** — Yêu cầu nâng cấp **không xóa được**, chỉ chuyển `APPROVED` hoặc `REJECTED`. *(Q75A)*

**BR-SUB-011** — Trial: `is_trial = true` + `expires_at` do Superadmin nhập tay. Hết hạn trial xử lý y hệt hết hạn thường (BR-TENANT-010). *(Q18B)*

---

## 13. Notification Rules

**BR-NOTI-001** — **MVP không có hệ thống thông báo.** Không có bảng `notifications`, không có endpoint. *(Q73A)*

**BR-NOTI-002** — Màn hình chuông thông báo, bản tin hệ thống (`SystemAnnouncement`) và cảnh báo (`SystemAlert`) **giữ nguyên hoạt động bằng `localStorage`** như hiện tại. *(Q73A)*

**BR-NOTI-003** — Không gửi email, SMS, Zalo hay push notification. Màn hình cấu hình SMTP giữ nguyên là **giao diện không có hành vi**. *(Q73A)*

---

## 14. Backup & Restore Rules

**BR-BAK-001** — **MVP không có chức năng sao lưu / khôi phục thật.** *(Q6A, Q77A)*

**BR-BAK-002** — Màn hình `DataBackup.tsx` giữ nguyên là **mô phỏng hoàn toàn**, không có bảng và không có endpoint nào phía sau. *(Q6A)*

**BR-BAK-003** — Việc sao lưu ở MVP thực hiện **thủ công, nằm ngoài phần mềm**: sao lưu database `NailManagement` trên SQL Server bằng câu lệnh `BACKUP DATABASE`, hoặc bằng chức năng Backup trong SQL Server Management Studio (chuột phải database → Tasks → Back Up). *(hệ quả của Q6A + quyết định chọn SQL Server ngày 24/08)*

> Rule này đã được sửa hai lần, và cả hai lần đều vì nền tảng lưu trữ đổi chứ không phải vì nghiệp vụ đổi. Bản đầu ghi "copy tệp SQLite thủ công" — sai kể từ khi backend chuyển sang **ASP.NET Core + SQL Server** (`README-BACKEND-ROADMAP.md` §0 quyết định 11′), vì SQL Server không phải một tệp đơn để copy khi database đang được gắn. Bản thứ hai ghi cụ thể là LocalDB và chỉ tới Visual Studio — sai kể từ **03/09/2026**, khi dự án chuyển sang **SQL Server 2022 Developer Edition** với SSMS làm công cụ quản trị. Bản thân cách sao lưu thì không đổi qua cả hai lần: vẫn là `BACKUP DATABASE` chạy tay.

---

## 15. Audit Log Rules

**BR-AUD-001** — Audit log ghi ở **server**, trong middleware. Bỏ hoàn toàn `recordAuditLog()` phía client — hàm này đang **giả mạo** người thao tác (`user` và `ip` cứng). *(Q74A)*

**BR-AUD-002** — Chỉ ghi **8 loại sự kiện**: *(Q74A)*

| Mã sự kiện | Khi nào |
|---|---|
| `LOGIN` | Đăng nhập thành công |
| `LOGIN_FAILED` | Đăng nhập sai |
| `TENANT_CREATED` / `TENANT_UPDATED` / `TENANT_DELETED` | Thao tác tenant |
| `ACCOUNT_CREATED` / `ACCOUNT_LOCKED` | Thao tác tài khoản |
| `PAYMENT_RECEIVED` | Thu tiền hóa đơn |
| `REFUND_ISSUED` | Hoàn tiền |
| `PACKAGE_CHANGED` | Đổi gói của tenant |

**BR-AUD-003** — Mỗi bản ghi lưu: `actor_user_id`, `actor_role`, `tenant_id`, `event`, `target_type`, `target_id`, `ip`, `created_at`, `metadata` (JSON).

**BR-AUD-004** — Audit log **không sửa được, không xóa được**. Chỉ có thao tác đọc. *(Q74A, Q75A)*

**BR-AUD-005** — `SUPERADMIN` xem toàn bộ. `TENANT_ADMIN` chỉ xem log thuộc tenant mình. `RECEPTIONIST` **không** xem được. *(ma trận §3.4)*

---

## 16. Status Transition Rules

### 16.1 Appointment

```
                    ┌──────────────► CANCELLED
                    │
PENDING ──► CONFIRMED ──► CHECKED_IN ──► IN_SERVICE ──► COMPLETED
   │            │              │                            ▲
   │            └──► NO_SHOW   ├──► CANCELLED               │
   │                           ├──► NO_SHOW                 │
   └──► CANCELLED              └────────────────────────────┘
                                    hóa đơn thu đủ tiền
```

| Từ | Được chuyển sang | Ai được phép |
|---|---|---|
| `PENDING` | `CONFIRMED`, `CANCELLED` | Receptionist, TenantAdmin |
| `CONFIRMED` | `CHECKED_IN`, `CANCELLED`, `NO_SHOW` | Receptionist, TenantAdmin |
| `CHECKED_IN` | `IN_SERVICE`, `CANCELLED`, `NO_SHOW` | Receptionist, TenantAdmin |
| `CHECKED_IN` | `COMPLETED` | **Tự động** khi hóa đơn `PAID` — **không ai bấm tay được** |
| `IN_SERVICE` | `COMPLETED` | **Tự động** khi hóa đơn `PAID` |
| `IN_SERVICE` | `COMPLETED` *(khi hóa đơn **chưa thu đủ**, kể cả khi **chưa có hóa đơn nào**)* | **Chỉ TenantAdmin** |
| `COMPLETED` | — | Điểm cuối |
| `CANCELLED` | — | Điểm cuối |
| `NO_SHOW` | — | Điểm cuối |

**Hai hàng cần đọc kỹ, vì chúng là chỗ sơ đồ này từng thiếu.** Cả hai chốt ngày 28/08/2026 khi viết lát cắt thu tiền — xem `README-BACKEND-ROADMAP.md` §5 ngày 13, quyết định 57 và 58:

**`CHECKED_IN` → `COMPLETED`** *(quyết định 57)* — BR-INV-010 cho lập hóa đơn từ lịch đang `CHECKED_IN` **hoặc** `IN_SERVICE`, còn BR-APT-026 nói lịch tự hoàn tất khi hóa đơn `PAID`. Ghép hai rule ấy lại thì một lịch mới check-in mà khách trả đủ tiền luôn — chuyện thường ở quầy tiệm nail, khách trả trước rồi mới làm — cũng phải hoàn tất được. Sơ đồ cũ chỉ vẽ mũi tên từ `IN_SERVICE`, nên bám nguyên nó thì **hệ thống từ chối nhận tiền của khách**. Đây là đường **tự động**: không vai trò nào bấm tay chuyển `CHECKED_IN` → `COMPLETED` được, và giao diện cũng không được hiện nút cho nó.

**`IN_SERVICE` → `COMPLETED` khi chưa có hóa đơn** *(quyết định 58)* — bản đầu của BR-APT-027 chỉ nói tới ca hóa đơn còn `PARTIAL`. Nhưng ca đáng lo hơn là khách bỏ về giữa chừng không trả đồng nào: lịch chưa có hóa đơn, mà BR-APT-040 lại cấm hủy lịch đang phục vụ, nên nó kẹt vĩnh viễn trên bảng lịch không ai đóng được. Ngoại lệ của chủ tiệm vì vậy áp cho **mọi lịch chưa thu đủ**. BR-APT-027 ở §9.3 đã được mở rộng theo, nên hai mục nay nói cùng một điều.

**BR-APT-040** — `IN_SERVICE` **không hủy được**. Đang phục vụ dở thì phải kết thúc. *(Q52A)*

**BR-APT-041** — `COMPLETED`, `CANCELLED`, `NO_SHOW` là **điểm cuối, không quay lại được**. *(Q52A)*

### 16.2 Sales Invoice

```
PENDING ──► PARTIAL ──► PAID ──► REFUNDED
   │            │
   └────────────┴──► CANCELLED
```

| Từ | Được chuyển sang | Ai được phép |
|---|---|---|
| `PENDING` | `PARTIAL`, `PAID`, `CANCELLED` | Receptionist, TenantAdmin |
| `PARTIAL` | `PAID`, `CANCELLED` | Receptionist, TenantAdmin |
| `PAID` | `REFUNDED` | **Chỉ TenantAdmin** |
| `REFUNDED` | — | Điểm cuối |
| `CANCELLED` | — | Điểm cuối |

> `PENDING` / `PARTIAL` / `PAID` **không đặt tay** — chúng suy ra từ tổng thu theo BR-PAY-003.

### 16.3 Tenant

```
ACTIVE ⇄ SUSPENDED          (Superadmin đặt tay)
   +
OVERDUE / TRIAL             (tính từ expires_at và is_trial, không lưu)
```

### 16.4 Các thực thể chỉ có bật/tắt

| Thực thể | Trạng thái | Ai đổi |
|---|---|---|
| Tài khoản | `ACTIVE` ⇄ `SUSPENDED` → `INACTIVE` | Superadmin / TenantAdmin |
| Chi nhánh | `ACTIVE` ⇄ `INACTIVE` | TenantAdmin |
| Nhân viên | `WORKING` ⇄ `OFF_SHIFT` ⇄ `LEAVE` → `INACTIVE` | TenantAdmin |
| Khách hàng | `ACTIVE` ⇄ `INACTIVE` | TenantAdmin |
| Dịch vụ | `ACTIVE` ⇄ `INACTIVE` | TenantAdmin |

---

## 17. Validation Rules

**BR-VAL-001** — Toàn bộ ràng buộc bắt buộc: *(Q76A)*

| Trường | Ràng buộc |
|---|---|
| Email tài khoản | Duy nhất **toàn hệ thống**, đúng định dạng email |
| Username | Duy nhất **toàn hệ thống**, nếu có |
| Mật khẩu | Tối thiểu **8 ký tự** (giá trị cố định, không cấu hình được) |
| Mã tenant | Duy nhất toàn hệ thống, chữ HOA + số |
| Tên chi nhánh | Duy nhất **trong một tenant**, 3–80 ký tự |
| SĐT khách hàng | Duy nhất **trong một tenant**, `^(\+84\|0)\d{9,10}$` |
| Tên dịch vụ | Duy nhất **trong một tenant** |
| Giá dịch vụ | `≥ 0` |
| Thời lượng dịch vụ | `> 0`, tối đa **480 phút** |
| Buffer | `≥ 0`, tối đa **60 phút** |
| Giảm giá hóa đơn | `0 ≤ discount ≤ subtotal` |
| Tip | `≥ 0` |
| Tổng hoàn tiền | `≤ tổng đã thu` |
| Lịch hẹn — bắt buộc | khách, kỹ thuật viên, chi nhánh, `start_at`, **≥ 1 dịch vụ** |
| Số chi nhánh `ACTIVE` | `≤ package.max_salons` |
| Số nhân viên `≠ INACTIVE` | `≤ package.max_staff` |
| `expires_at` của tenant | Bắt buộc, phải sau ngày bắt đầu |

**BR-VAL-002** — Mọi validation phải chạy **ở server**. Validation ở frontend chỉ để trải nghiệm, không được coi là hàng rào. *(nguyên tắc chung)*

**BR-VAL-003** — Tiền tệ: **VND**, số nguyên, không có phần thập phân. *(hệ quả Q64A)*

---

## 18. Delete / Soft Delete Rules

**BR-DEL-001** — **Nguyên tắc xuyên suốt: không có gì bị xóa cứng khỏi database trong toàn hệ thống.** *(Q75A)*

| Thực thể | "Xóa" nghĩa là | Cơ chế |
|---|---|---|
| **Tenant** | Xóa mềm | `deleted_at` |
| **Chi nhánh** | Vô hiệu hóa | `status = INACTIVE`; chi nhánh chính **không xóa được** |
| **Tài khoản đăng nhập** | Vô hiệu hóa | `status = INACTIVE` |
| **Nhân viên** | Vô hiệu hóa | `status = INACTIVE` |
| **Khách hàng** | Vô hiệu hóa | `status = INACTIVE` |
| **Dịch vụ** | Vô hiệu hóa | `status = INACTIVE` |
| **Lịch hẹn** | **Không có nút xóa** | Chỉ `CANCELLED` |
| **Hóa đơn bán hàng** | `PENDING`/`PARTIAL` → `CANCELLED`; `PAID` → **không được** | — |
| **Hóa đơn đăng ký** | **Không xóa được bao giờ** | Chứng từ tài chính |
| **Gói dịch vụ** | Không xóa nếu còn tenant dùng | `DEPRECATED` → `ARCHIVED` |
| **Yêu cầu nâng cấp gói** | **Không xóa được** | `APPROVED` / `REJECTED` |
| **Audit log** | **Không xóa được** | — |

**BR-DEL-002** — Mọi truy vấn danh sách phải lọc `deleted_at IS NULL` và (tùy ngữ cảnh) `status != 'INACTIVE'`. Đặt điều kiện này ở **một lớp truy vấn dùng chung**, không lặp lại ở từng endpoint. *(Q75A)*

**BR-DEL-003** — Bản ghi `INACTIVE` vẫn **hiển thị đúng tên** trong dữ liệu lịch sử (lịch hẹn, hóa đơn cũ), chỉ không chọn được cho bản ghi mới. *(Q33A, Q40A, Q42A)*

---

## 19. Data Ownership & Tenant Isolation

**BR-ISO-001** — Mọi bảng nghiệp vụ tầng salon **bắt buộc có `tenant_id NOT NULL` + index**. *(nguyên tắc multi-tenant)*

**BR-ISO-002** — Phép lọc theo tenant phải nằm ở **một hàm truy vấn dùng chung duy nhất**, không được để mỗi endpoint tự viết. Đây là chỗ dễ mắc lỗi lộ dữ liệu chéo tenant nhất. *(rủi ro của Q5B)*

**BR-ISO-003** — Vì một tài khoản quản lý được nhiều tenant (BR-AUTH-023), **không được** so sánh trực tiếp `resource.tenant_id = session.tenant_id`. Trình tự bắt buộc: *(Q5B)*

```
1. Lấy active_tenant_id từ phiên
2. Xác thực user có quyền với tenant đó qua user_tenants
3. Mới lọc dữ liệu theo tenant_id
```

Bỏ bước 2 là mở đường truy cập chéo tenant.

**BR-ISO-004** — Phạm vi dữ liệu theo vai trò:

| Dữ liệu | Superadmin | TenantAdmin | Receptionist |
|---|---|---|---|
| Tenant, gói, hóa đơn đăng ký | Toàn hệ thống | Tenant mình | — |
| Khách hàng, dịch vụ | — | Toàn tenant | **Toàn tenant** |
| Lịch hẹn, nhân viên, hóa đơn bán hàng | — | Toàn tenant | **Chỉ chi nhánh mình** |

**BR-ISO-005** — Ranh giới cứng: **Superadmin không đọc được dữ liệu nghiệp vụ trong tenant** (BR-AUTH-030). Điều này phải được cưỡng chế ở tầng API, không chỉ ở giao diện.

**BR-ISO-006** — Test cách ly tenant là **hạng mục kiểm thử bắt buộc**: tenant A không đọc/ghi được dữ liệu tenant B; tài khoản nhiều tenant chỉ truy cập được các tenant có trong `user_tenants`.

---

## 20. MVP Simplifications

Bảng này ghi lại **những gì đã cố ý đơn giản hóa** và lý do — để người đọc sau không tưởng là thiếu sót.

| # | Bản đầy đủ | Bản MVP | Lý do |
|---|---|---|---|
| 1 | Vai trò Khách hàng có app riêng, tự đặt lịch | **Không có vai trò Khách hàng** | Phải dựng từ số 0, tốn 4–6/20 ngày *(Q3C)* |
| 2 | Trạng thái tenant cập nhật bằng job nền | Tính lúc đọc, **không có job nền nào** | Tránh hạ tầng chạy nền *(Q26A)* |
| 3 | Ân hạn nhiều mốc trước khi khóa | **Không ân hạn** | Bớt một trạng thái trung gian *(Q20B)* |
| 4 | Cưỡng chế 9 hạn mức gói | **Chỉ 2**: chi nhánh + nhân viên | 7 hạn mức còn lại không có gì để đo *(Q21A)* |
| 5 | Lịch làm việc theo tuần, nghỉ phép, chấm công | **Một ca cố định** mỗi nhân viên | Cả một module riêng *(Q34B)* |
| 6 | Bảng hoa hồng, chốt kỳ, duyệt chi | **Một phép nhân lúc hiển thị** | Module lương *(Q35B)* |
| 7 | Chương trình loyalty, tích/tiêu điểm | **Hạng khách suy ra từ tổng chi tiêu** | Loyalty ngoài phạm vi *(Q38A)* |
| 8 | Ràng buộc kỹ năng KTV theo dịch vụ | **Không cưỡng chế** | Cần bảng nối + màn hình quản lý kỹ năng *(Q43A)* |
| 9 | Combo có cấu trúc, tự tính giá | **Combo là một dịch vụ có giá riêng** | Không cần cấu trúc gì *(Q44A)* |
| 10 | Cọc có luật hoàn / mất khi hủy | **Cọc chỉ là khoản đã trả trước** | Cả một nhánh nghiệp vụ *(Q56B, Q65A)* |
| 11 | Mã voucher, hạn dùng, giới hạn lượt | **Số tiền giảm nhập tay + lý do** | Thuộc module Loyalty *(Q62A)* |
| 12 | VAT theo dịch vụ, hóa đơn điện tử VN | **Không có thuế**, giá đã gồm thuế | Cần nhà cung cấp được cấp phép *(Q64A)* |
| 13 | Tích hợp cổng thanh toán thật | **Phương thức chỉ là nhãn ghi nhận thủ công** | Cần tài khoản merchant *(Q61A)* |
| 14 | Hệ thống thông báo + email/SMS | **Không có** | Cần dịch vụ ngoài *(Q73A)* |
| 15 | Sao lưu / khôi phục có lịch, mã hóa, đa vùng | **`BACKUP DATABASE` thủ công trên SQL Server** | Không phải nghiệp vụ cốt lõi *(Q6A)* — xem BR-BAK-003 |
| 16 | Module chi phí, tính lợi nhuận | **Chỉ có doanh thu** | Module kế toán *(Q70A)* |

---

## 21. Out of Scope / Post-MVP

### 21.1 Module giữ nguyên `localStorage`, không có API

Đặt lịch online · Kho vật tư · Thu & Chi · Vệ sinh & an toàn · Thư viện màu & mẫu nail · Loyalty · Ghế & khu vực · Bản tin & thông báo · Trung tâm hỗ trợ · Cấu hình hệ thống · Sao lưu · Báo cáo nâng cao

> Các màn hình này **đã dựng xong và vẫn chạy được** khi demo. Chúng nằm ngoài phạm vi API một cách có chủ đích.

### 21.2 Chức năng chưa làm ở cả frontend lẫn backend

| Nhóm | Nội dung |
|---|---|
| **Tài khoản** | Đổi mật khẩu · Quên mật khẩu · Kích hoạt qua email · Xác minh email/SĐT · MFA · Thu hồi phiên từ xa |
| **Khách hàng** | Toàn bộ vai trò Customer: đăng nhập, chọn tiệm, tự đặt lịch, xem lịch sử |
| **Lịch hẹn** | Giờ mở cửa chi nhánh · Ngày nghỉ lễ · Nhắc lịch tự động · Nhiều KTV cho một lịch |
| **Tiền** | Cổng thanh toán thật · VAT · Hóa đơn điện tử VN · Hoàn cọc / mất cọc · Chi phí và lợi nhuận |
| **Nhân sự** | Lịch tuần · Nghỉ phép · Chấm công · Bảng lương và hoa hồng có chốt kỳ |
| **Hệ thống** | Thông báo · Email/SMS/Zalo · Sao lưu thật · Upload tệp · Deep-link/URL routing · Test tự động |

### 21.3 Nợ kỹ thuật đã biết, cần xử lý khi làm backend

| # | Việc |
|---|---|
| 1 | Đổi khóa `localStorage` từ `tenantName` sang `tenantId` — hiện đổi tên tenant làm mất sạch dữ liệu |
| 2 | Bỏ `BranchCode = 'Q1' \| 'Q3'` cứng ở 7 file |
| 3 | Xóa code chết: `TenantAdminPortal.tsx`, `TenantAdminCustomerCare.tsx`, `TenantAdminFinance.tsx` |
| 4 | Sửa `persistPackageUpgradeRequest` / `persistPackageUpgradeReview` đang `return true` trong nhánh `catch` |
| 5 | Gỡ `TenantAdminRole` và `SUPPORT` khỏi type và giao diện *(Q12A, Q13A)* |
| 6 | Gỡ `location`/`trusted`/`suspicious`/`mfaVerified` khỏi `AdminSession` |
| 7 | Sửa dữ liệu mẫu `monthlyRevenue` cho khớp nghĩa mới *(BR-REV-008)* |
| 8 | Bỏ `tax_rate`, `member_price`, `points` khỏi model |

*(Chi tiết đầy đủ ở [README-MIGRATION.md](README-MIGRATION.md))*

---

## 22. Open Questions

Những điểm **chưa chốt**. Không được tự suy đoán khi cài đặt — hỏi lại trước.

| # | Câu hỏi | Ảnh hưởng | Mức |
|---|---|---|---|
| 1 | **Ngưỡng phân hạng khách hàng** ở BR-CUS-007 (5tr / 20tr) là đề xuất của tôi, chưa được duyệt | Chỉ ảnh hưởng nhãn hiển thị, đổi lúc nào cũng được | Thấp |
| 2 | **Tenant mặc định sau khi đăng nhập** khi user có nhiều tenant: tenant dùng gần nhất / tenant đầu danh sách / bắt người dùng chọn? | Luồng đăng nhập, `active_tenant_id` | **Cao** |
| 3 | **Hình dạng contract lỗi của API** — cần mã lỗi + tên trường lỗi để frontend gắn thông báo vào đúng ô nhập | Toàn bộ tầng service ở frontend | **Cao** |
| 4 | **Số hóa đơn reset mỗi ngày hay chạy liên tục** trong năm? BR-INV-016 đang giả định reset mỗi ngày | Định dạng số hóa đơn | Trung bình |
| 5 | **Lịch hẹn `PENDING` quá hạn** (qua ngày mà không ai đụng tới) xử lý thế nào? Hiện không có rule | Báo cáo tỷ lệ hủy | Trung bình |
| 6 | **Đơn vị tiền** — chốt là VND số nguyên (BR-VAL-003). Có cần hỗ trợ USD như code hiện tại không? | Model tiền tệ | Trung bình |
| 7 | **Node.js phiên bản tối thiểu** — repo chưa khai `engines` | Môi trường chạy | Thấp |
| 8 | **Test runner** — chưa chọn (Vitest?) | Giai đoạn kiểm thử | Thấp |

---

## Phụ lục — Tra cứu nhanh mã rule

| Tiền tố | Module | Số rule |
|---|---|---|
| `BR-AUTH` | Xác thực, vai trò, phân quyền | 001–031 |
| `BR-TENANT` | Tenant | 001–022 |
| `BR-BRANCH` | Chi nhánh | 001–008 |
| `BR-EMP` | Nhân viên | 001–011 |
| `BR-CUS` | Khách hàng | 001–009 |
| `BR-SVC` | Dịch vụ | 001–009 |
| `BR-APT` | Lịch hẹn | 001–041 |
| `BR-INV` | Hóa đơn | 001–033 |
| `BR-PAY` | Thanh toán | 001–008 |
| `BR-REV` | Doanh thu | 001–008 |
| `BR-SUB` | Gói đăng ký | 001–011 |
| `BR-NOTI` | Thông báo | 001–003 |
| `BR-BAK` | Sao lưu | 001–003 |
| `BR-AUD` | Nhật ký kiểm toán | 001–005 |
| `BR-VAL` | Validation | 001–003 |
| `BR-DEL` | Xóa dữ liệu | 001–003 |
| `BR-ISO` | Cách ly tenant | 001–006 |
