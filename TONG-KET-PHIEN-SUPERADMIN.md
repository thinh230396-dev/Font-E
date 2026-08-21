# Tổng kết phiên làm việc — Superadmin Console

Ngày: 2026-08-21 · Nhánh: `docs/readme-getting-started`

Phiên này bắt đầu bằng một yêu cầu đánh giá role Superadmin, sau đó chuyển thành ba đợt sửa mã. Báo cáo đánh giá đầy đủ nằm ở artifact: <https://claude.ai/code/artifact/3c8afe65-01c8-40f8-a602-9505caa016bf>

Thứ tự công việc: **đánh giá** → **T-01 khóa module theo gói** → **Đợt 1 bốn lỗi hiển thị sai** → **Đợt 2 chuẩn hóa hộp thoại**.

`npm run lint` (tsc --noEmit) sạch sau mỗi bước. Mọi thay đổi đều được kiểm chứng trên trình duyệt qua dev server, không chỉ đọc mã.

---

## 1. Đánh giá — Superadmin

### 1.1 Phạm vi và tiêu chuẩn

Người dùng chốt: chỉ role **Superadmin**, đối chiếu **chuẩn ngành SaaS tiệm nail**, soi modal ở cả ba mức (chức năng, UI/UX, tính nhất quán), và **báo cáo trước, sửa sau**.

Đã soi 14 file, 10 màn hình, 27 hộp thoại.

### 1.2 Chức năng — đã có gì

Phần tính phí và vòng đời gói được làm sâu hơn mức thường thấy ở một bản dựng đầu:

- **Gói dịch vụ**: `DRAFT`/`ACTIVE`/`DEPRECATED`/`ARCHIVED`, lịch sử giá, khai tử có lịch kèm gói thay thế.
- **Hóa đơn**: ghi nhận theo cổng thanh toán + mã giao dịch, nhắc nợ 4 cấp (`REMINDER_1` → `SUSPENSION_REVIEW`), hoàn tiền một phần, đối soát, xuất CSV.
- **Cấu hình hệ thống**: bản nháp, phát hiện thay đổi, kiểm tra hợp lệ, ghi audit — mẫu tốt nhất trong toàn dự án.
- **Yêu cầu nâng cấp gói**: đã nối backend thật (Cloudflare D1), không phải mock.

### 1.3 Chức năng — thiếu so chuẩn ngành

| Mã | Vấn đề |
|---|---|
| F-07 | Không có **truy cập hỗ trợ** vào tenant — chức năng dùng nhiều nhất của đội hỗ trợ SaaS đa tenant |
| F-08 | Hạn mức gói **được bán nhưng không được đo** |
| F-09 | Không có khuyến mãi, giá thỏa thuận, gia hạn dùng thử |
| F-10 | Không đặt lại mật khẩu hay thu hồi phiên của tenant |
| F-11 | Chỉ một vai trò nội bộ — không tách được Hỗ trợ / Kế toán / Chỉ đọc |
| F-12 | Chính sách bảo mật chỉ là con số trên màn hình; bật MFA không thêm bước xác minh nào |
| F-13 | Báo cáo là báo cáo công nợ, thiếu MRR, churn, tỉ lệ chuyển đổi dùng thử |
| F-14 | Thuế và hóa đơn điện tử chưa có — bắt buộc ở Việt Nam, chạm vào cấu trúc dữ liệu |

### 1.4 Đối chiếu ngược từ Tenant Admin

Tenant Admin có 16 màn hình; Superadmin bán gói cho đúng 16 màn đó nhưng chỉ quản được hai con số (chi nhánh, nhân sự).

| Mã | Vấn đề |
|---|---|
| T-03 | `adminUsers`, `dataRetentionDays`, custom domain, API call chỉ tồn tại trong bảng so sánh gói |
| T-04 | Superadmin **không nhìn thấy tài khoản Lễ tân** — chuỗi `RECEPTIONIST` không xuất hiện lần nào trong ba màn quản lý tenant |
| T-05 | Không có chỉ số tenant có thực sự dùng sản phẩm hay không (tín hiệu báo trước rời bỏ) |
| T-06 | Tenant mới khởi tạo với màn hình trắng — không có mẫu cấu hình mặc định |
| T-07 | Đặt lịch online không có nơi cấp tên miền |
| T-08 | Tin nhắn tự động đã có dòng hóa đơn 650.000đ nhưng không có nơi cấp |

### 1.5 Đính chính quan trọng

Bản đầu của báo cáo ghi rằng **gói dịch vụ không khóa được module nào**. Điều đó **sai**.

Cơ chế khóa theo quyền đã có sẵn và chạy đúng: `utils/tenantAdminEntitlements.ts` ánh xạ màn hình sang quyền, thanh điều hướng hiện huy hiệu "Khóa" kèm `aria-disabled`, `navigate()` chặn và mở màn hình mời nâng cấp có gợi ý đúng gói cần lên.

Nguyên nhân đánh giá sai: đọc mảng `navGroups` tĩnh mà không đọc phần render, và tìm kiếm theo từ khóa `capabilit` nên không khớp tên hàm `resolvePageAccess`.

Cái thiếu là **độ phủ**, không phải cơ chế.

---

## 2. T-01 — Khóa module theo gói

### 2.1 Đã làm

**Thêm ba khóa quyền** vào `SUBSCRIPTION_CAPABILITY_CATALOG`:

| Khóa | Nhãn | Bậc gói |
|---|---|---|
| `finance` | Sổ thu & chi | Premium |
| `nail_gallery` | Thư viện màu & mẫu Nail | Premium |
| `sanitation` | Vệ sinh & an toàn | Enterprise |

Độ phủ chính sách tăng từ **8 lên 10 màn hình**.

**Tách Thu & Chi khỏi Kho vật tư.** Trước đó hai trang dùng chung khóa `inventory`, nên bán một module là mở luôn module kia.

**Gộp về một nguồn duy nhất.** Bảng phân quyền theo bậc gói trước đây chép tay ở hai file (`PACKAGE_PROFILES` trong `subscriptions.ts` và `STANDARD_PLAN_CAPABILITIES` trong `tenantAdminEntitlements.ts`) và phải tự giữ cho khớp. Nay chỉ còn `STANDARD_PLAN_CAPABILITY_TIERS`; hai nơi còn lại đọc từ đó.

**Bảy màn hình cố ý để mở cho mọi gói**, đã ghi chú lý do trong mã: Tổng quan, Gói đăng ký, Chi nhánh, POS & thanh toán, Nhân sự, Dịch vụ & giá, Cài đặt tiệm. Thiếu chúng thì tiệm không vận hành nổi và gói rẻ nhất trở nên vô dụng. Chi nhánh và Nhân sự vẫn bị chặn theo **hạn mức số lượng** chứ không theo quyền.

### 2.2 Lỗi phát hiện trong lúc làm (T-01b)

`normalizeSubscriptionPackage` giữ nguyên mảng quyền đã lưu, nên khi danh mục có thêm quyền mới thì **bản ghi gói cũ không bao giờ thấy nó**. Hệ quả: màn hình sửa gói của Superadmin không hiện quyền mới để bật, và **gói đặt tên tuỳ ý sẽ vĩnh viễn không bật được** vì nó không khớp bậc gói chuẩn nào.

Đã thêm bước chiếu lại bản ghi cũ theo danh mục hiện tại: giữ nguyên mọi lựa chọn bật/tắt đã có, quyền chưa từng được quyết định thì lấy mặc định của bậc gói, bỏ quyền không còn trong danh mục.

Trước khi sửa, thẻ gói bên Superadmin báo Premium có **8 tính năng** trong khi tenant Premium thực nhận **10** — hai bên nay đã khớp.

### 2.3 Kiểm chứng

Đăng nhập Tenant Admin gói Premium:

- Kho vật tư và Vệ sinh & an toàn: **khóa**
- Thu & Chi và Màu & mẫu Nail: **mở**
- Bấm module bị khóa → màn hình mời nâng cấp gợi ý đúng gói **Enterprise**
- Quyền theo gói: Basic 3, Premium 10, Enterprise 15

---

## 3. Đợt 1 — Bốn lỗi hiển thị sai sự thật

### F-01 · Biểu đồ doanh thu là số bịa

Năm cột "T3 → T7" được sinh bằng `current * 0.58 / 0.66 / 0.75 / 0.86 / 1.0` — đường luôn đi lên đẹp đẽ bất kể thực tế. Con số "Tăng trưởng 16,3%" ngay cạnh cũng là số cứng.

**Đã sửa**: dựng từ hóa đơn đã thanh toán thật, trừ phần đã hoàn, quy đổi về tiền tệ báo cáo, mốc lấy theo `paidAt` (lùi về `createdAt` cho hóa đơn cũ). Tỷ lệ tăng trưởng so với mốc liền trước; không có mốc trước để so thì hiện tổng đã thu. Thêm trạng thái trống khi trong kỳ chưa thu được đồng nào.

### F-02 · Bộ lọc thời gian không lọc gì

Ô chọn "30 ngày qua / Tháng này / Quý này / Năm nay" chỉ đổi state rồi dừng ở đó.

**Đã sửa**: điều khiển biểu đồ, mỗi khoảng có cách chia mốc riêng để mỗi cột là một quãng có thật — 30 ngày qua chia 5 cột 6 ngày, Tháng này theo tuần, Quý này và Năm nay theo tháng.

### F-03 · "In hóa đơn" in cả trang quản trị

Nút gọi thẳng `window.print()` nhưng dự án **không có một quy tắc `@media print` nào**.

**Đã sửa**: thêm bảng kiểu in vào `index.css`, đánh dấu hộp thoại hóa đơn là vùng in, loại nút đóng / dải tab / thanh hành động khỏi giấy, mở khóa chiều cao phần thân vốn tự cuộn để nội dung dài tràn sang trang sau. Bấm In chuyển về tab Chi tiết trước — hai tab kia là dữ liệu nội bộ.

### F-04 · Tạo hóa đơn phải gõ tay mã tenant

Ba ô nhập tự do cho mã tenant, tên tenant và email nhận hóa đơn, trong khi hệ thống đã có sẵn danh sách tenant.

**Đã sửa**: gộp thành một ô chọn tenant; chọn xong tự điền tên, email, gói và tiền tệ theo hồ sơ. Bỏ bước viết hoa toàn bộ mã tenant — bước đó sinh ra vì người dùng gõ tay, giữ lại thì nay sẽ làm hỏng mã thật.

### Kiểm chứng Đợt 1

Biểu đồ hiện số thật (0 · 0 · 1.975.000 · 6.225.000 · 77.653.000 ₫ cho 30 ngày qua); đổi sang "Năm nay" cho 8 cột T1–T8 tổng 85.853.000 ₫ và tự chuyển nhãn sang "Tổng đã thu"; trạng thái trống đã thử bằng cách tạm bỏ trạng thái đã thanh toán rồi khôi phục nguyên vẹn 10 hóa đơn; chọn tenant Muse Nail Lab tự điền `linh.do@musenail.vn`, gói Basic, tiền tệ VND.

---

## 4. Đợt 2 — Chuẩn hóa hộp thoại

### 4.1 Vấn đề

Dự án **đã có** `src/components/ui/Modal.tsx` xử lý sẵn bẫy focus, trả focus về nút đã bấm, Escape theo ngăn xếp hộp thoại lồng nhau, khóa cuộn nền, portal ra `body`, thang kích thước theo đặc tả. **Không màn hình Superadmin nào gọi tới nó.**

Hệ quả đo được trước khi sửa: 26/27 hộp thoại không đóng bằng Escape, 24/27 nền vẫn cuộn phía sau, **0/27** giữ được focus bàn phím, z-index chạy từ `z-50` tới `z-[100]` trong khi `--z-overlay` nằm sẵn trong CSS không ai dùng.

### 4.2 Đã chuyển — 26/27 hộp thoại

| File | Số hộp thoại |
|---|---|
| `PackageUpgradeRequests.tsx` | 1 |
| `SystemSettings.tsx` | 1 |
| `SecurityAndLogs.tsx` | 1 |
| `HelpAndSupport.tsx` | 1 |
| `DataBackup.tsx` | 3 |
| `SubscriptionPackages.tsx` | 5 |
| `BillingAndInvoices.tsx` | 4 |
| `TenantAdminManagement.tsx` | 3 |
| `TenantManagement.tsx` | 2 |
| `TenantDetailModal.tsx` | 5 |

Một lần chuyển giải quyết **tám mục** trong báo cáo mà không phải làm riêng: M-01 Escape, M-02 khóa cuộn nền, M-03 bẫy focus và trả focus, M-05 `role="dialog"`, M-06 z-index, M-07 bấm ra nền, M-08 ngăn xếp hộp thoại lồng nhau, M-09 bo góc và chân hộp thoại.

Đã xóa các đoạn tự xử lý Escape và khóa cuộn trong `SecurityAndLogs.tsx` và `HelpAndSupport.tsx`, cùng component `ModalHeader` chết trong `SubscriptionPackages.tsx`.

### 4.3 Ba điểm kỹ thuật đáng nhớ

**Nút gửi ở chân hộp thoại.** Chân hộp thoại của `ui/Modal` nằm ngoài thẻ `<form>`, nên nút submit phải trỏ ngược về form bằng thuộc tính `form="<id>"`. Áp dụng cho mọi hộp thoại dạng biểu mẫu.

**Vùng in.** `ui/Modal` không nhận thuộc tính tùy ý nên `data-print-region` không truyền qua được. Đã thêm selector `.ui-print-region` song song trong bảng kiểu in và truyền qua `className`. Bảng kiểu in cũng vô hiệu `.ui-modal-layer` và `.ui-modal-backdrop` khi in.

**Chống mất dữ liệu.** Những form dài — tạo tenant, sửa Tenant Admin, cấu hình gói, ghi chú duyệt nâng cấp — đặt `closeOnBackdrop={false}` để bấm nhầm ra nền không xoá sạch nội dung đang nhập.

### 4.4 Kiểm chứng Đợt 2

- Escape đóng đúng lớp trên cùng và giữ nguyên lớp dưới — thử với hộp đổi gói lồng trong hồ sơ tenant: hộp trong đóng, hồ sơ vẫn mở
- Khóa cuộn nền được nhả đúng khi đóng
- Form tạo tenant 27 trường cuộn trong thân, chân hộp thoại vẫn ghim
- Bảng so sánh gói 27 dòng hiển thị đủ
- Tạo thật một bản sao lưu từ nút ở chân hộp thoại để xác nhận `form="..."` hoạt động end-to-end

---

## 5. Danh sách tệp đã đổi

**Logic quyền gói**

- `src/utils/subscriptions.ts` — thêm 3 khóa quyền, `STANDARD_PLAN_CAPABILITY_TIERS`, `getCumulativePlanCapabilityKeys`, bước chiếu lại quyền trong `normalizeSubscriptionPackage`
- `src/utils/tenantAdminEntitlements.ts` — thêm chính sách cho `gallery` và `sanitation`, trỏ `finance` sang khóa riêng, xóa bảng phân quyền chép tay

**Màn hình Superadmin**

- `src/components/Overview.tsx` — F-01, F-02: `buildRevenueBuckets`, dữ liệu thật, trạng thái trống
- `src/components/BillingAndInvoices.tsx` — F-03, F-04 và 4 hộp thoại
- `src/components/TenantManagement.tsx` — 2 hộp thoại
- `src/components/TenantDetailModal.tsx` — 5 hộp thoại
- `src/components/TenantAdminManagement.tsx` — 3 hộp thoại
- `src/components/SubscriptionPackages.tsx` — 5 hộp thoại, xóa `ModalHeader`
- `src/components/DataBackup.tsx` — 3 hộp thoại
- `src/components/SecurityAndLogs.tsx` — 1 hộp thoại, xóa effect Escape/khóa cuộn thủ công
- `src/components/HelpAndSupport.tsx` — 1 hộp thoại, xóa effect khóa cuộn thủ công
- `src/components/SystemSettings.tsx` — 1 hộp thoại
- `src/components/PackageUpgradeRequests.tsx` — 1 hộp thoại

**Khác**

- `src/components/NailTenantAdminPortal.tsx` — hiện 3 quyền mới trên trang Gói đăng ký
- `src/App.tsx` — truyền prop `tenants` cho `BillingAndInvoices`
- `src/index.css` — `.sa-chart-empty`, khối `@media print`, selector `.ui-print-region`

---

## 6. Còn lại

### 6.1 Hai phần chưa làm của Đợt 2

**M-04 — hơn 40 chỗ `window.alert()`.** Toàn bộ kiểm tra hợp lệ ở `TenantManagement.tsx`, `TenantDetailModal.tsx` và `TenantAdminManagement.tsx` bắn ra hộp thoại xám của trình duyệt; lỗi không gắn vào trường bị sai, và một chỗ còn dùng `alert()` để báo **thành công** (`TenantAdminManagement.tsx:556`). Đây là thay đổi khác loại — phải gắn lỗi vào từng trường và thêm dải thông báo, chạm vào logic kiểm tra hợp lệ ở ba file — nên tách khỏi đợt chuyển hộp thoại.

**Vỏ ngoài của `TenantDetailModal`.** Hộp thoại thứ 27, là khu làm việc toàn màn hình với header riêng: logo, tên, mã tenant, huy hiệu trạng thái, gói, số ngày còn lại, tình trạng thanh toán, và bộ chuyển Xem nhanh / Xem đầy đủ. `ui/Modal` không có chỗ cho bộ chuyển đó, ép vào sẽ phải bỏ bớt nội dung. Năm hộp thoại bên trong nó thì đã chuyển hết. **Cần người dùng quyết trước khi làm.**

### 6.2 Lộ trình còn lại

**Nhóm A — làm được ngay, không cần backend**

- M-04 và vỏ ngoài `TenantDetailModal` (mục 6.1)
- T-06 mẫu cấu hình mặc định cho tenant mới
- F-06 áp `passwordMinLength` từ cấu hình vào mọi form đặt mật khẩu (hiện cấu hình mặc định là 10 nhưng form vẫn chấp nhận 6)

**Nhóm B — chốt trên giấy trước khi viết backend**

- Mô hình tài khoản ba vai: Lễ tân thuộc tenant hay chi nhánh, ai tạo, tính vào hạn mức nào
- Bảng đếm mức sử dụng: đếm gì, theo chu kỳ nào, vượt thì chặn hay chỉ cảnh báo
- Thuế và hóa đơn điện tử — chạm vào cấu trúc hóa đơn, chốt sớm thì rẻ
- Vòng đời xóa tenant: ẩn mềm bao lâu, xuất dữ liệu định dạng gì

**Nhóm C — xếp lại, chờ backend**

Truy cập hỗ trợ, đặt lại mật khẩu, thu hồi phiên, MFA thật, đo hạn mức thật, cấp tên miền, cấp tin nhắn, chỉ số SaaS, sao lưu thật, vai trò nội bộ, khuyến mãi.

*Đừng dựng giao diện cho nhóm C lúc này — backend sẽ định hình lại và công sức phần lớn sẽ phải làm lại.*

### 6.3 Cần người dùng quyết

**Xếp bậc cho ba khóa quyền mới.** Tôi xếp theo phán đoán: Thu & Chi và Màu & mẫu Nail vào Premium, Vệ sinh & an toàn vào Enterprise. Đổi lại chỉ là dời tên khóa giữa các dòng của `STANDARD_PLAN_CAPABILITY_TIERS` trong `src/utils/subscriptions.ts`.

**Tỷ lệ tăng trưởng trên Tổng quan** hiện ra "1.147,4%" trên dữ liệu mẫu — đúng về mặt số học vì mốc trước rất nhỏ, nhưng trông lạ. Có thể ẩn tỷ lệ khi mốc trước dưới một ngưỡng và chỉ hiện tổng đã thu.

---

## 7. Ghi chú kỹ thuật

**Lỗi console sẵn có, không phải do phiên này.** `GET /api/package-upgrade-requests → 404` xuất hiện liên tục ở dev. Nguyên nhân: plugin auth của dev server (`scripts/vite-local-auth.ts`) chỉ phục vụ `/api/auth/*`; endpoint kia chỉ tồn tại trong Cloudflare Worker của production (`scripts/sites-worker.js`). Hệ quả phụ: **không thử được hộp thoại duyệt yêu cầu nâng cấp end-to-end ở dev** vì danh sách luôn rỗng — hộp thoại đó đã chuyển sang `ui/Modal` và qua typecheck, nhưng chưa mở được trên trình duyệt.

**Bản ghi gói trong `localStorage` không tự làm mới.** Chúng được seed một lần rồi giữ nguyên; bước chiếu lại quyền ở mục 2.2 chạy khi đọc vào state và ghi ngược lại. Nếu cần thử lại từ trạng thái sạch, xóa khóa `salonsys_packages` rồi tải lại trang.
