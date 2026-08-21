# Migration UI SalonSys — Sổ tay bàn giao

> **Tài liệu này không thay thế [`README.md`](README.md).**
> `README.md` là *đặc tả thiết kế* (26 chương quy chuẩn UI/UX) — nguồn chuẩn của dự án.
> Tài liệu này ghi lại *việc đã làm để hiện thực hóa đặc tả đó*: trạng thái, quyết định, số liệu và cách đi tiếp.

**Trạng thái: chưa commit.** Toàn bộ thay đổi đang nằm ở working tree.

---

## 1. Vấn đề gốc

Dự án đã tự viết một bộ quy chuẩn UI/UX 26 chương trong `README.md`, rồi build ngược lại nó. Hầu hết nợ kỹ thuật không phải "code xấu" — mà là code không khớp với chính tài liệu đã cam kết:

| Phát hiện ban đầu | Con số |
|---|---:|
| Class màu không dùng design token | 73% (10.150/14.046) |
| Cỡ chữ dưới 14px (README §4.3 cấm) | 3.534 |
| Overlay modal tự dựng tay | 104 |
| `!important` trong một file CSS 4.870 dòng | 423 |
| `htmlFor` nối label–input | 3 / 467 `<label>` |
| Trạng thái loading / skeleton | 0 |

Ba shell vai trò còn dùng accent **khác** với thứ code khai báo: `--role-accent` khai báo violet cho cả ba, nhưng thực tế Superadmin dùng `#7061e8`, Tenant Admin dùng **hồng** `#f43f78`, Receptionist dùng `#059669`.

---

## 2. Kế hoạch 4 giai đoạn

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| **1** | Chốt một hệ design token duy nhất | ✅ Xong |
| **2** | Dựng lớp component dùng chung | ✅ Xong |
| **3** | Migrate từng màn hình | 🔄 6/38 màn hình |
| **4** | Kiến trúc còn thiếu (dark mode login, routing, code chết) | ⛔ Chưa bắt đầu |

---

## 3. Giai đoạn 1 — Hệ token

**5 namespace → 1.** Gộp `--role-*`, `--sa-*`, `--ta-*`, `--modal-*`, `--metric-*` về hệ dựa trên `--color-brand-*`, khai báo trong `@theme static` ở [`src/index.css`](src/index.css).

Bổ sung các nhóm token README §3.1 yêu cầu nhưng chưa có:

| Nhóm | Token | Nguồn chuẩn |
|---|---|---|
| Typography | `--text-caption` … `--text-display` | README §4.2 |
| Bán kính | `--radius-control` (8px), `--radius-card` (12px), `--radius-pill` | §9.1, §10.3, §11.2 |
| Kích thước | `--size-sidebar` (260px), `--size-topbar`, `--size-control*`, `--size-row` | §7.1, §10.2, §12.1 |
| Lớp hiển thị | `--z-sticky` … `--z-toast` | §3.1 |
| Chuyển động | `--motion-fast`, `--motion-normal`, `--motion-ease` | §3.1 |
| Độ nổi | `--shadow-card`, `--shadow-floating` | §9.1 |
| Biểu đồ | `--chart-1` … `--chart-5` | *(bổ sung, xem dưới)* |

**Thang màu biểu đồ là nhóm token duy nhất được thêm ngoài README.** §5.1 chỉ định nghĩa màu *ngữ nghĩa* (trạng thái), nhưng biểu đồ nhiều chuỗi cần phân biệt 4–5 hạng mục không phải trạng thái — "Tiền mặt" hay "Khách thành viên" không được mượn tông `success`/`warning`. Thang này dẫn xuất từ `--accent` bằng `color-mix`, khai báo cạnh `--accent` trong `.role-shell`, nên tự đúng theo từng cổng và tự đổi nền ở dark mode:

```css
--chart-1: var(--accent);
--chart-2: color-mix(in srgb, var(--accent) 58%, var(--color-brand-surface));
--chart-3: color-mix(in srgb, var(--accent) 30%, var(--color-brand-surface));
--chart-4: color-mix(in srgb, var(--color-brand-text-muted) 62%, var(--color-brand-surface));
--chart-5: color-mix(in srgb, var(--color-brand-text-muted) 30%, var(--color-brand-surface));
```

**Spacing không tạo thang thứ hai** — Tailwind v4 sinh toàn bộ từ `--spacing: 0.25rem`, ánh xạ 1:1 với `space-1…space-12` của README §6.

**Ba accent được giữ đúng giá trị thật**, mỗi shell một `--accent`:

```css
.role-shell--superadmin { --accent: #7061e8; }  /* indigo */
.role-shell--tenant     { --accent: #f43f78; }  /* hồng salon */
.role-shell--reception  { --accent: #059669; }  /* xanh ngọc */
```

> `@theme static` là bắt buộc: mặc định Tailwind tree-shake token chưa dùng, khiến component không tham chiếu được bằng `var()`.

---

## 4. Giai đoạn 2 — Component dùng chung

Đặt tại [`src/components/ui/`](src/components/ui) theo README §26, API theo §22.2.

| Component | Vai trò |
|---|---|
| `Button` | 5 variant, 3 size (36/42/48px), loading giữ nguyên chiều rộng, icon-only cảnh báo khi thiếu `aria-label` |
| `Field` | Tự sinh `htmlFor` + `aria-describedby` + `aria-invalid` + `required` — giải quyết gốc vấn đề 3/467 label |
| `Switch` | Công tắc bật/tắt có hiệu lực ngay (§11.3), nhãn ẩn được nhưng luôn còn cho trình đọc màn hình |
| `StatusBadge` | **40 trạng thái**, một nơi duy nhất ánh xạ status → nhãn/tông/icon; luôn có cả chữ lẫn icon (§5.2) |
| `DataTable` | loading / empty / error trong vùng bảng, cột số căn phải + `tabular-nums` |
| `Modal` | focus trap, focus khi mở, trả focus khi đóng, Escape, scroll lock, **ngăn xếp modal lồng nhau**, 4 size gồm `fullscreen` |

```tsx
import { Button, DataTable, Field, Modal, StatusBadge } from './ui';
```

### Trang xem trước

```bash
npm run dev
```

Mở **`/ui-preview.html`** — thư viện component + các màn hình đã migrate, không cần đăng nhập.
Bản xem trước `Lịch hẹn` đổi được giữa hai cổng (Tenant Admin / Lễ tân) để kiểm tra accent và quyền thao tác trong cùng một màn hình.
Entry riêng (`ui-preview.html` + `src/ui-preview.tsx`), **không** nằm trong bundle production, **không** được import vào `App.tsx`.

### Quy tắc dùng StatusBadge

Tone và icon **luôn** lấy từ `STATUS_MAP`. Khi màn hình có từ vựng nghiệp vụ riêng, truyền qua prop `label` — không tạo bảng mapping thứ hai:

```tsx
<StatusBadge status="CHECKED_IN" label="Đang chờ" size="small" />
```

---

## 5. Giai đoạn 3 — Màn hình đã migrate

| # | Màn hình | Dòng | Màu cứng | <14px | Overlay |
|---|---|---:|---|---|---|
| 1 | `TenantAdminStations.tsx` | 476 | 353 → **0** | 125 → **0** | 4 → **0** |
| 2 | `ReceptionistStations.tsx` | 1.807 | 314 → **0** | 113 → **0** | 4 → **0** |
| 3 | `ReceptionistPortal.tsx` | 2.298 | 410 → **0** | 141 → **0** | 2 → **1** |
| 4 | `TenantAdminSettings.tsx` | 683 | — (file mới) | — | 0 |
| 5 | `TenantAdminAppointments.tsx` | 1.079 → 1.996 | 548 → **0** | 213 → **0** | 4 → **1** |
| 6 | `TenantAdminReports.tsx` | 415 → 1.489 | 541 → **0** | 184 → **0** | 5 → **0** |

Riêng `ReceptionistPortal` còn xóa **`Modal` cục bộ** (không có focus trap, không trả focus) và **`Field` cục bộ**, 10 gradient trang trí, 2 blur orb, 2 backdrop `<button>` phủ toàn màn hình.

`TenantAdminSettings` **không phải file cũ được migrate** mà tách ra từ hàm `ModulePage` dùng chung trong `NailTenantAdminPortal`: sau khi 15 trang khác đã có component riêng, `settings` là consumer cuối cùng của hàm đó, nên hàm được gỡ hẳn. Hai tab “Thông tin tiệm” và “Thanh toán” chuyển từ dòng bảng sang biểu mẫu thật (`Field`, `Switch`).

`TenantAdminAppointments` là màn hình lớn nhất đã migrate, đồng thời là màn hình **chạy trong cả hai shell** (Tenant Admin và Lễ tân). Ngoài số liệu trên còn:

- xóa **48 dòng JSX chết** — panel `<aside className="hidden">` dựng song song với hộp thoại chi tiết, không bao giờ hiển thị;
- xóa bảng `statusMeta` (7 trạng thái × badge/card/dot) — đây là bảng ánh xạ trạng thái thứ hai, đúng thứ §11 cấm;
- gỡ effect tự xử lý Escape + khoá cuộn nền cho 3 hộp thoại, vì `Modal` đã lo sẵn;
- bỏ nhánh `isReceptionist ? emerald : violet` ở 6 chỗ — accent giờ lấy từ `var(--accent)` của shell, nên màu tự đúng theo cổng.

Số dòng **tăng** 1.079 → 1.996 nhưng số ký tự gần như không đổi (109.664 → 110.177): bản cũ dồn JSX vào những dòng dài hàng nghìn ký tự. Đây đúng cái bẫy đã ghi ở mục 7 — so bằng ký tự công bằng hơn.

`TenantAdminReports` là lần đầu **thiết kế lại bố cục**, không chỉ đổi token. Yêu cầu là "dashboard SaaS hiện đại, bớt cảm giác mọi thứ bị đóng khung":

- **43 khung bo góc → 8.** Bỏ card bọc ngoài vùng tab (trước là card→card→card, ba tầng viền), KPI và các dải chỉ số chuyển sang chia bằng đường kẻ (`gap-px` trên nền `--color-brand-outline`), các khối phân tích thành danh sách có đường phân cách.
- **Gộp bộ lọc và tab làm một cụm**, thêm chip phạm vi chi nhánh (chi nhánh vẫn do topbar điều khiển — chỉ hiển thị lại để người dùng thấy đủ phạm vi dữ liệu ở một chỗ).
- **Bỏ 2 khối nền đen `bg-slate-950`** và 2 gradient trang trí; điểm neo thị giác giờ là bốn KPI cỡ `--text-display`.
- **Bảng thật thay bảng giả:** bảng nhân sự trước dựng bằng `grid` div (trình đọc màn hình không đọc được quan hệ hàng/cột), bảng cohort không có `<th>`. Cả ba bảng giờ dùng `DataTable` hoặc `<table>` có `<caption>`/`scope`.
- **Ba thẻ cuối trang** (chất lượng dữ liệu, quyền, gợi ý phân tích) cô đọng thành một dòng meta chân trang; ba gợi ý chuyển vào khối "Điểm cần chú ý" ở tab Điều hành. Không mất nội dung nào.
- **Khôi phục tab "Xuất & lịch gửi"** (xem mục 9).

Trang này trước đây hardcode **violet** trong khi accent của cổng Tenant Admin là **hồng** — tức là nó lệch màu so với phần còn lại của portal. Sau khi token hoá, accent tự đúng.

### Số liệu toàn dự án

| Chỉ số | Gốc | Sau màn 1–3 | Hiện tại |
|---|---:|---:|---:|
| Màu cứng (`.tsx`) | 10.150 | 9.135 | **8.128** |
| Typography <14px | 3.534 | 3.155 | **2.816** |
| Overlay tự dựng | 104 | 95 | **87** |
| `!important` | 423 | 405 | **405** |
| `index.css` (dòng) | 4.870 | 5.606 | **5.699** |

> `index.css` vẫn **tăng** vì Giai đoạn 1–2 *thêm* từ vựng token và lớp component, còn override cũ chưa tháo được. Phần giảm chỉ đến khi consumer cuối cùng biến mất — xem mục 6.
>
> **Cách đếm:** dùng script `.js` tách token, không dùng regex qua shell. Riêng số dòng `index.css` phải đếm bằng `split('\n')`; `Get-Content | Measure-Object -Line` của PowerShell **bỏ qua dòng trống** nên trả về 4.940 — thấp hơn thực tế 748 dòng.

---

## 6. Bài học quan trọng nhất: CSS giảm theo bậc thang

Một khối override chỉ xóa được khi màn hình **cuối cùng** dùng nó đã migrate. Không giảm tuyến tính theo số màn hình.

Ví dụ cụ thể — khối CSS Receptionist (**637 dòng / 134 `!important`**, ~32% tổng `!important` dự án) nhắm 169 class. Sau khi migrate 2 màn lễ tân:

| Consumer | Class đang dùng | Class độc quyền |
|---|---:|---:|
| `TenantAdminAppointments` ✅ | 91 → **0** | 30 → **0** |
| `TenantAdminReports` ✅ | 67 → **0** | 1 → **0** |
| `TenantAdminPayments` | 66 | 8 |
| `TenantAdminCustomers` | 60 | 4 |
| `ReceptionistProducts` | 50 | 3 |
| `ReceptionistTechnicians` | 41 | 1 |
| `BeautifulSelect` | 17 | 0 |
| `ReceptionistPortal` ✅ | 4 | 1 |
| `ReceptionistStations` ✅ | **0** | 0 |

**Cần 7 file để tháo trọn, không phải 3.** Lý do: `ReceptionistPortal` là shell + router, nó lazy-load 3 màn Tenant Admin — chúng render *bên trong* `.reception-workspace` nên cũng là consumer.

Consumer lớn nhất — `TenantAdminAppointments`, 30 class độc quyền — **đã tháo xong**. Ba màn đã migrate giờ chỉ còn khớp các class token chung (`border`, `bg-brand-surface`, `sticky`) mà khối này cũng nhắm tới; không còn class palette nào.

**Còn 4 consumer chặn việc xóa khối:** `TenantAdminPayments` (8 class độc quyền), `TenantAdminCustomers` (4), `ReceptionistProducts` (3), `ReceptionistTechnicians` (1). Xong 4 file này thì khối 637 dòng / 134 `!important` mới xóa được.

### CSS đã xóa được (chứng minh an toàn)

10 luật nhắm `.reception-sidebar nav button[class*="bg-emerald-400"]` + 2 khối `html[data-theme="dark"] .reception-sidebar`, sau khi sidebar chuyển sang `aria-current="page"`. → `index.css` −54 dòng, `!important` 423 → 405.

**Điều kiện xóa CSS:** (1) chứng minh consumer đã biến mất, (2) không màn hình nào khác phụ thuộc, (3) kiểm tra trình duyệt xác nhận không hồi quy — gồm cả dark mode.

---

## 7. Playbook migrate màn hình tiếp theo

```
Bước 1  Audit      → đọc toàn bộ; đếm màu cứng / <14px / overlay / button / label / table
Bước 2  Định hướng → dựa trên design system hiện có, KHÔNG phát minh hệ mới
Bước 3  Implement  → token → shared component → hoàn thiện UI/UX → a11y → responsive → states
Bước 4  Browser    → light, dark, 375px, 768px, desktop, bàn phím, từng modal
Bước 5  Regression → business logic không đổi; các màn hình khác không vỡ
Bước 6  Metric     → Before/After + số class CSS đã chết
```

**Audit riêng từng overlay trước khi thay.** Không phải overlay nào cũng là dialog.

**Kiểm tra nhanh sau migrate:**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

### Bẫy đã gặp — kiểm tra trước

- **`grid` không khai báo cột ở mobile** → track ngầm co giãn theo nội dung, tràn cả trang. Luôn thêm `grid-cols-1`. (Gặp ở 2/3 màn hình.)
- **Luật bảng cũ cướp quyền `DataTable`** → các luật `.role-main thead th { !important }` đã được loại trừ bằng `:not(.ui-table)`.
- **JSX bị dồn dòng** → `TenantAdminStations` có dòng dài 7.769 ký tự; số dòng sẽ tăng mạnh sau khi format lại dù tổng ký tự gần như không đổi. So sánh bằng ký tự công bằng hơn.
- **Đừng đo class chết bằng regex qua shell** — escaping hỏng cho kết quả sai (từng báo `shadow-sm` là chết). Dùng script `.js` tách token.
- **Đừng đếm dòng bằng `Get-Content | Measure-Object -Line`** — lệnh này bỏ qua dòng trống. Với `index.css` nó trả 4.940 trong khi file có 5.688 dòng, đủ để báo nhầm là CSS đã giảm.
- **Cửa sổ Chrome có thể không thu nhỏ được** để thử responsive. Cách thay thế đã dùng: nhúng chính `/ui-preview.html` vào `<iframe>` rộng 375px và 768px ngay trong trang — media query dùng viewport của iframe, và vì cùng origin nên vẫn bấm được vào bên trong bằng `contentWindow`.
- **Ngưỡng hiển thị trên thẻ lịch phải tính lại khi cỡ chữ tăng.** Sàn 13–14px làm mỗi dòng chiếm ~20px; các mốc `isCompact` / `showService` / `showOperationalMeta` và chiều cao mỗi giờ đều phải nâng theo, nếu không nội dung bị cắt.
- **Nhãn trục biểu đồ đặt bằng margin âm sẽ tràn ra ngoài khối cha.** Nhớ chừa chỗ cho chúng (`ml-11` trên vùng vẽ), nếu không nhãn dính mép trang.
- **Số thô trong JSX không tự định dạng theo locale.** `{74.2}%` in ra `74.2%` giữa một trang toàn `74,2%`. Luôn qua `toLocaleString('vi-VN')`.
- **Chữ trên nền pha `color-mix` cần chọn một màu duy nhất cho mọi mức.** Đổi màu chữ theo ngưỡng giá trị dễ rơi vào vùng tương phản kém ở đúng ngưỡng đó; nếu nền đậm nhất vẫn đủ tương phản cho chữ tối thì dùng chữ tối cho tất cả.

---

## 8. Vấn đề đã biết

### Bug Chromium: `<button>` + custom property + dark mode

Chromium **không tính lại** `background-color` của `<button>` khi custom property của tổ tiên đổi. `<div>` cùng điều kiện thì đúng.

- **Ảnh hưởng:** chỉ khi bật/tắt dark mode *lúc đang ở màn hình đó*. Lần tải trang đầu luôn đúng.
- **Đã thử:** khai báo lại dưới selector theme (không hiệu quả, đã gỡ).
- **Workaround:** điều hướng sang màn khác rồi quay lại, hoặc reload.

### Trả focus sau khi đóng modal — 1/4 trong ReceptionistPortal

Trang Bàn lễ tân dựng lại cây DOM sau khi state đổi, xóa focus vừa đặt (nút mở vẫn tồn tại nhưng bị blur). Đã thử 3 cách trong `Modal` (microtask, retry theo khung hình, chốt chặn) và **hoàn nguyên tất cả** vì không cách nào triệt để mà lại làm phức tạp component dùng chung.

Escape, focus trap, scroll lock, focus-khi-mở đều đạt ở cả 6 modal. Sửa đúng cần ổn định hóa cây render của trang Bàn lễ tân — việc riêng.

### Đã sửa: modal lồng nhau không trả focus

`Modal` chỉ ghi nhớ nút mở khi nút đó nằm ngoài **mọi** `[role="dialog"]` — một chốt chặn cho React StrictMode. Hệ quả: hộp thoại mở từ nút *bên trong* hộp thoại cha (ví dụ “Hủy lịch hẹn” trong chi tiết lịch) không có đích trả focus, đóng xong focus rơi về `<body>`.

Điều kiện đã đổi thành “ngoài hộp thoại **này**” (`!dialogRef.current?.contains(opener)`). Chốt chặn StrictMode vẫn còn tác dụng vì lúc gắn lại effect, phần tử đang focus nằm trong chính hộp thoại đó. Đã kiểm tra trên trình duyệt: cả trường hợp thường lẫn lồng nhau đều trả focus đúng, không hồi quy ở các màn đã migrate trước.

### Đánh đổi: lịch hẹn mất một phần khác biệt màu

Bảng tông ngữ nghĩa chỉ có 5 giá trị (`success` / `info` / `warning` / `danger` / `neutral`), nên ba trạng thái `CONFIRMED`, `CHECKED_IN`, `IN_SERVICE` đều là `info` và **cùng một màu** trên lưới lịch. Bản cũ cho chúng ba màu riêng (xanh dương / cyan / tím) nên liếc là phân biệt được.

Giữ nguyên đánh đổi này là cố ý: §11 cấm tạo bảng ánh xạ trạng thái thứ hai, và §5.2 vốn đã yêu cầu không bao giờ dùng màu làm tín hiệu duy nhất. Phần phân biệt được chuyển sang icon (`CheckCircle2` / `DoorOpen` / `PlayCircle`) và nhãn trạng thái trên thẻ đủ cao.

**Nếu vận hành phản hồi rằng vẫn cần phân biệt bằng màu**, cách đúng là mở rộng bảng tông trong `STATUS_MAP` cho toàn hệ thống — không phải thêm bảng riêng cho màn hình lịch.

### Trang Báo cáo: doanh thu thuần hiện hai lần

Ở tab Doanh thu, "Doanh thu thuần" xuất hiện cả ở dải KPI toàn trang lẫn ở dải tóm tắt đầu tab. Đây là cấu trúc sẵn có của dữ liệu (tab vốn có khối hero riêng mang thêm tiến độ mục tiêu kỳ), nên **giữ nguyên chứ không xóa** — nhưng nếu sau này gộp được tiến độ mục tiêu lên dải KPI thì bỏ được một lần lặp.

### Va chạm tên `.ui-modal-layer`

Class này **đã tồn tại từ trước** trong "desktop overlay contract" (`src/index.css`, khối `@media (min-width: 1024px)`), và lớp phủ của shared `Modal` trùng tên. Hiện **chưa gây lỗi** vì Modal portal ra `document.body` nên không khớp bộ chọn con của shell. Cần biết trước khi ai đó render Modal *bên trong* shell.

### Khác

- `TenantAdminStations.tsx` còn 2 chỗ `autoFocus` là no-op (Modal ghi đè focus). Vô hại.
- `recharts` khai báo trong `package.json` nhưng chưa cài — build hỏng từ trước khi bắt đầu. Đã chạy `npm install` (vì vậy `package-lock.json` thay đổi).

---

## 9. Code chết đã xác nhận (Giai đoạn 4)

- `src/components/TenantAdminPortal.tsx` — 392 dòng, **không được import ở đâu**. `App.tsx` import `NailTenantAdminPortal` rồi đặt bí danh trùng tên.
- `src/components/TenantAdminFinance.tsx` — shim 4 dòng re-export `TenantAdminFinanceCompact`.

Chưa xóa vì Giai đoạn 4 chưa bắt đầu.

### Đã khôi phục: tab "Xuất & lịch gửi" của trang Báo cáo

Kiểu `ReportTab` khai báo 6 giá trị kể cả `'EXPORTS'`, nhưng mảng `tabs` chỉ liệt kê 5 và không chỗ nào gọi `setTab('EXPORTS')`. Hệ quả: toàn bộ **thư viện 6 mẫu báo cáo, 4 lịch gửi tự động, hộp thoại tạo lịch gửi** và cả prop `searchQuery` (chỉ dùng trong nhánh đó) là UI không truy cập được.

Đã thêm `EXPORTS` vào mảng `tabs` và migrate luôn phần này. **Bài học:** khi một union type có nhiều giá trị hơn mảng điều hướng render nó, hãy kiểm tra — chênh lệch đó thường là cả một màn hình bị mất.

### JSX chết đã xóa

- `TenantAdminAppointments` — 48 dòng panel `<aside className="hidden">` dựng song song với hộp thoại chi tiết.
- `NailTenantAdminPortal` — hàm `ModulePage` dùng chung, sau khi `settings` là consumer cuối cùng được tách ra.

---

## 10. File đã thay đổi

```
M  src/index.css                             hệ token, lớp component, CSS shell lễ tân, xóa 10 luật chết
M  src/components/TenantAdminStations.tsx    migrate (màn hình pilot)
M  src/components/ReceptionistStations.tsx   migrate
M  src/components/ReceptionistPortal.tsx     migrate shell + router
M  src/components/TenantAdminAppointments.tsx  migrate (màn hình lớn nhất, chạy ở cả 2 shell)
M  src/components/TenantAdminReports.tsx     thiết kế lại bố cục + khôi phục tab Xuất & lịch gửi
M  src/components/NailTenantAdminPortal.tsx  gỡ ModulePage dùng chung, nối TenantAdminSettings
M  src/components/nailAdminData.ts           thêm BrandInfo / PaymentSettings cho trang Cài đặt
M  package-lock.json                         npm install (recharts)
?? src/components/TenantAdminSettings.tsx    trang Cài đặt tiệm tách khỏi ModulePage
?? src/components/ui/                        Button, DataTable, Field, Switch, Modal, StatusBadge, index.ts
?? ui-preview.html
?? src/ui-preview.tsx                        harness dev, ngoài bundle production
```

Thư viện dùng chung có một thay đổi hành vi: `src/components/ui/Modal.tsx` sửa điều kiện ghi nhớ nút mở để hộp thoại lồng nhau trả focus đúng (mục 8).

---

## 11. Nguyên tắc bắt buộc khi đi tiếp

**Thứ tự ưu tiên:** lời của người dùng → `README.md` → token trong `src/index.css` → lựa chọn của người thực hiện.

**Không được:**

- phát minh design system mới
- đổi font (Inter + JetBrains Mono), đổi hệ icon (Lucide), đổi role accent
- thêm gradient trang trí, blur orb, glassmorphism, hero kiểu landing page
- card hóa mọi thứ
- tạo mapping status thứ hai ngoài `STATUS_MAP`
- tạo token mới nếu token hiện tại đã đáp ứng
- thay đổi business logic, API, database, data model, authentication, permission
- backdrop `<button>` phủ toàn màn hình

**Ưu tiên** (đây là công cụ vận hành dùng nhiều giờ mỗi ca): quét nhanh, thao tác nhanh, hierarchy rõ, density hợp lý, ít trang trí, trạng thái dễ nhận biết, accessibility, maintainability.

---

## 12. Đề xuất bước tiếp theo

| Ưu tiên | Mục tiêu | Lý do |
|---|---|---|
| **A** | `TenantAdminPayments` + `TenantAdminCustomers` | 12 class độc quyền còn lại nhiều nhất; POS và hồ sơ khách là màn dùng hằng ngày |
| B | `ReceptionistProducts` + `ReceptionistTechnicians` | 4 class độc quyền cuối; xong nhóm này thì **xóa được** khối CSS 637 dòng / 134 `!important` |
| C | Giai đoạn 4 | Dark mode `LoginPage` (0 biến thể `dark:`), xóa 2 file chết, đánh giá routing |

Sau A + B, khối CSS lễ tân tháo được trọn vẹn — đây là lần đầu con số `!important` toàn dự án giảm đáng kể (405 → khoảng 271).

Cách nhanh nhất để bắt đầu A: mở `/ui-preview.html`, so các màn đã xong (`Báo cáo`, `Lịch hẹn`, `Cài đặt tiệm`) với màn sắp làm, rồi bám playbook mục 7. Riêng màn nhiều biểu đồ thì lấy `TenantAdminReports` làm mẫu — đó là màn đầu tiên dùng thang `--chart-*` và bỏ hẳn lối "mọi khối đều là card".
