# SalonSys — Hệ thống quản lý tiệm Nail

Tài liệu này mô tả **đúng hiện trạng source code** của repo. Mọi mục đều dẫn tới file/dòng cụ thể để kiểm chứng. Phần nào chưa suy ra được từ code sẽ được đánh dấu `NEED_CONFIRMATION`.

---

## 1. Tổng quan project

**SalonSys** là console quản trị SaaS đa tenant (multi-tenant) cho chuỗi tiệm Nail / salon làm đẹp. Đây là một **ứng dụng lấy frontend làm trọng tâm, kèm một backend tối thiểu đã tồn tại** (*frontend-centric application with a minimal existing backend*), khởi nguồn từ một bản export của Google AI Studio (xem `metadata.json`).

Cần phân biệt rõ **ba lớp** đang cùng tồn tại — chúng không giống nhau và không nên gộp khi nói về trạng thái dự án:

| Lớp | Nội dung | Nơi chạy |
|---|---|---|
| **Frontend nghiệp vụ** | Toàn bộ 3 cổng, ~80.000 dòng TS/TSX | Trình duyệt |
| **Mock data + `localStorage`** | Phần nghiệp vụ **chưa** nối: gói đăng ký, ticket, bản tin, kho, sản phẩm quầy, ghế, đặt lịch online, thu chi, loyalty | Trình duyệt |
| **Backend nghiệp vụ** | Xác thực và phiên, tiệm, chi nhánh, dịch vụ, nhân viên, khách hàng, lịch hẹn, hóa đơn bán hàng và thu tiền, báo cáo doanh thu, nhật ký kiểm toán — **ASP.NET Core 10 + SQL Server 2022**, solution riêng | Máy chủ |

> **Backend không nằm trong repo này** mà ở một solution ASP.NET Core riêng (`C:\Users\letru\source\repos\NailManagement`); nhật ký dựng nó theo từng ngày ở [README-BACKEND-ROADMAP.md](README-BACKEND-ROADMAP.md). Bản Cloudflare Worker + D1 mà **§10 và §11.1** mô tả là **điểm xuất phát đã bị thay**; giữ lại làm lịch sử, đừng đọc như hiện trạng.

Ứng dụng có **3 cổng (portal) theo vai trò** trong cùng một bundle:

| Cổng | Người dùng | Điểm vào |
|---|---|---|
| Superadmin | Nhà cung cấp nền tảng SalonSys | `src/App.tsx` (render trực tiếp) |
| Tenant Admin | Chủ / quản lý chuỗi salon | `src/components/NailTenantAdminPortal.tsx` |
| Receptionist | Lễ tân tại một chi nhánh | `src/components/ReceptionistPortal.tsx` |

Vai trò được quyết định bởi `session.account.role` trả về từ API xác thực, tại [src/App.tsx:235](src/App.tsx#L235).

**Trạng thái dữ liệu:** đang chuyển dần sang API thật. **Đã nối:** đăng nhập và chọn tiệm · quản lý tiệm · chi nhánh · dịch vụ · nhân viên · khách hàng · cổng lễ tân (lịch hẹn, kỹ thuật viên, bảng giá, hóa đơn và thu tiền) · báo cáo doanh thu · tổng quan chủ tiệm · doanh thu nền tảng của Superadmin · nhật ký kiểm toán và tab Phiên đăng nhập. Các màn còn lại vẫn chạy **mock data + `localStorage`** và mang dải nhãn "Dữ liệu mẫu — chưa nối máy chủ". Xem §9 và §14.2.

Ngôn ngữ giao diện: **tiếng Việt** là gốc, có lớp dịch sang tiếng Anh (`src/i18n/`), chưa dịch đủ (chuỗi thiếu sẽ rơi về tiếng Việt và cảnh báo trong dev — [src/i18n/translate.ts:43](src/i18n/translate.ts#L43)).

---

## 2. Mục tiêu của hệ thống

Suy ra từ các màn hình và model dữ liệu đang tồn tại trong code:

**Ở tầng nền tảng (Superadmin)** — vận hành một SaaS bán theo gói đăng ký:
- Quản lý vòng đời tiệm: tạo, cấu hình, gia hạn, xóa — **qua API thật** ([src/App.tsx:647](src/App.tsx#L647) trở đi, dùng `useTenants`).
- Quản lý catalog gói dịch vụ: giá theo tháng/năm, quyền tính năng (`capabilities`), hạn mức (`limits`), versioning giá, lịch ngừng bán gói kèm chuyển tenant tự động ([src/App.tsx:1194](src/App.tsx#L1194)). Bảng giá đọc từ `GET /api/packages`; phần còn lại vẫn ở `localStorage`.
- Quản lý hóa đơn đăng ký: phát hành, đối soát, thu tiền, hoàn tiền, theo dõi nợ ([src/types.ts](src/types.ts) — `Invoice`).
- Duyệt yêu cầu nâng cấp gói từ Tenant Admin ([src/App.tsx:984](src/App.tsx#L984)) — vẫn là dữ liệu mẫu.
- Bản tin hệ thống, hỗ trợ (ticket), nhật ký kiểm toán, sao lưu.

**Ở tầng salon (Tenant Admin)** — điều hành chuỗi tiệm:
- Chi nhánh, lịch hẹn, ghế/khu vực, POS, khách hàng, loyalty, nhân sự, dịch vụ & giá, kho vật tư, thư viện màu & mẫu nail, đặt lịch online, thu chi, vệ sinh & an toàn, báo cáo.

**Ở tầng quầy (Receptionist)** — tác nghiệp trong ca:
- Bàn lễ tân, lịch hẹn, khách hàng, sản phẩm quầy, ghế & phòng, kỹ thuật viên, thanh toán & POS.

---

## 3. Tech stack frontend

| Thành phần | Phiên bản (package.json) | Ghi chú |
|---|---|---|
| React | `^19.0.1` | Dùng `lazy` + `Suspense` để chia code theo màn hình |
| React DOM | `^19.0.1` | |
| TypeScript | `~5.8.2` | `noEmit`. **`strictNullChecks` đã bật** (từ ngày 26 — DTO viết tay dễ lệch nhất ở chỗ một trường có thể vắng mặt, và đó đúng là thứ cờ này bắt). `strict` đầy đủ thì còn ~20 lỗi hình thức, để sau MVP |
| Vite | `^6.2.3` | Bundler + dev server + proxy `/api` sang backend .NET |
| Tailwind CSS | `^4.1.14` | Qua plugin `@tailwindcss/vite`, **không** có `tailwind.config.js` |
| lucide-react | `^0.546.0` | Toàn bộ icon |
| recharts | `^3.10.1` | Biểu đồ trong các màn hình báo cáo |
| @vitejs/plugin-react | `^5.0.4` | |
| tsx | `^4.21.0` (dev) | Di tích của plugin auth cũ, nay không còn chỗ dùng bắt buộc |
| autoprefixer, esbuild | (dev) | |

**Không có trong project:** react-router, thư viện state management (Redux/Zustand/Jotai), thư viện form, thư viện data-fetching (React Query/SWR), ORM đang hoạt động, test runner ở frontend, ESLint. Backend ở solution riêng thì **có** bộ kiểm thử xUnit (115 phép thử).

Design system nằm trong **`src/index.css` (~7.700 dòng)** dùng khối `@theme static` của Tailwind v4 — token typography, spacing, radius, shadow, z-index, motion, và một `--accent` cho từng cổng.

---

## 4. Cài đặt dependencies

**Môi trường phát triển khuyến nghị: Node.js 20.19+ hoặc 22.12+.**

Đây là **khuyến nghị**, không phải requirement do project khai báo. Project **không** khai `engines` trong `package.json`, cũng không có `.nvmrc` hay `.node-version`. Con số trên suy ra từ `engines` của các dependency đang cài:

| Dependency (bản đang cài) | `engines.node` |
|---|---|
| `@vitejs/plugin-react` 5.2.0 | `^20.19.0 \|\| >=22.12.0` ← **ràng buộc chặt nhất** |
| `vite` 6.4.3 | `^18.0.0 \|\| ^20.0.0 \|\| >=22.0.0` |
| `esbuild` 0.25.12, `tsx` 4.23.1 | `>=18` |
| `typescript` 5.8.3 | `>=14.17` |
| `react` 19.2.8 | `>=0.10.0` |
| `tailwindcss` 4.3.3 | (không khai) |

Lưu ý: `package.json` chỉ ghi `@vitejs/plugin-react: ^5.0.4`, nên bản thực cài có thể đổi và kéo theo ràng buộc Node đổi. Đây thêm một lý do nên chốt lockfile (xem bên dưới).

`NEED_CONFIRMATION`: **phiên bản Node tối thiểu chính thức** của project chưa được chốt. Khi chốt, nên khai vào `engines` của `package.json` và thêm `.nvmrc` để CI và máy dev dùng chung một mốc.

```bash
npm install
```

**Lưu ý về lockfile:** repo dùng **npm**, và `package-lock.json` đã được commit. `bun.lock` từng tồn tại ở dạng file rỗng và đã bị xóa có chủ ý — đừng đưa lại, hai lockfile cạnh nhau là hai cây phụ thuộc có thể lệch nhau mà không ai để ý.

---

## 5. Cách chạy project local

Có **hai cách chạy**, và chúng dành cho hai tình huống khác nhau.

### Cách 1 — Phát triển: hai tiến trình, hai cổng

```bash
# Cửa sổ 1 — backend, phải chạy TRƯỚC
dotnet run --project C:/Users/letru/source/repos/NailManagement/NailManagement.API --launch-profile http

# Cửa sổ 2 — giao diện
npm run dev
```

- Mở `http://localhost:3000` (Vite bind `0.0.0.0`, `allowedHosts: true` — xem `vite.config.ts`).
- Dev server **chỉ proxy `/api` sang `http://localhost:5282`**, nó KHÔNG tự phục vụ API. Chạy Vite mà quên backend thì mọi lời gọi trả 502. Đổi đích bằng biến `API_ORIGIN`.
- Đổi lại sự phiền phức hai cửa sổ là có HMR: sửa file `.tsx` thì trình duyệt cập nhật ngay.

### Cách 2 — Trình bày: một tiến trình, một cổng

```bash
npm run build:server
dotnet run --project C:/Users/letru/source/repos/NailManagement/NailManagement.API --launch-profile http
# → http://localhost:5282  (cả giao diện lẫn API)
```

`build:server` build giao diện rồi chép vào `wwwroot/` của backend; từ đó `dotnet run` phục vụ cả hai và **không cần Node**. Máy chủ chỉ phục vụ file tĩnh khi `wwwroot/index.html` có thật, nên máy chưa build thì hành vi không đổi. Chép xong không tự cập nhật — **sửa giao diện thì phải chạy lại `build:server`**.

> Đường dẫn tới solution backend lấy từ biến `SERVER_WWWROOT`; mặc định là chỗ solution đang nằm trên máy phát triển hiện tại. Solution nằm chỗ khác thì đặt biến ấy, đừng sửa script.

### Tài khoản đăng nhập khi chạy local

Do backend nạp khi database còn trống — `DemoAccountSeeder` trong solution `NailManagement`, và **chỉ nạp ở môi trường Development khi cờ `DemoSeed:Enabled` được bật** (xem `DemoSeedPolicy`):

| Vai trò | Email / username | Mật khẩu |
|---|---|---|
| Superadmin | `superadmin@salonsys.vn` / `superadmin` | `Super@2026` |
| Tenant Admin | `tenantadmin@lumierehair.vn` / `nguyenvanboss` | `Lumiere@2026` |
| Receptionist | `receptionist@nailestudio.vn` / `receptionist` | `Reception@2026` |

> Đây là tài khoản demo dùng cho phát triển, không phải bí mật production. Ngoài Development, backend không nạp gì cả và tài khoản quản trị đầu tiên đọc từ biến môi trường `Bootstrap__AdminEmail` / `Bootstrap__AdminPassword`.

> `scripts/vite-local-auth.ts` — plugin xác thực giả lập của thời chưa có backend — đã bị gỡ khỏi `vite.config.ts` vì nó chặn `/api/auth/*` trước khi proxy kịp chạy. File còn nằm đó chỉ như một mẩu lịch sử; cả cửa đăng nhập nhanh `SALONSYS_DEV_LOGIN` của nó cũng không còn tác dụng.

### Xem thư viện component riêng lẻ

```bash
npm run dev
# rồi mở http://localhost:3000/ui-preview.html
```

Entry `src/ui-preview.tsx`, không cần đăng nhập. Vite chỉ build `index.html` mặc định nên trang này **không** vào bundle production.

---

## 6. Các script trong `package.json`

| Script | Lệnh | Mục đích |
|---|---|---|
| `dev` | `vite --port=3000 --host=0.0.0.0` | Dev server, proxy `/api` sang backend .NET ở cổng 5282 |
| `build` | `vite build` | Build SPA vào `dist/` |
| `build:server` | `npm run build && node scripts/copy-build-to-server.mjs` | Build rồi chép sang `wwwroot/` của backend — một cổng, một lệnh |
| `build:legacy` | `vite build && node scripts/prepare-sites-build.mjs` | Bản build cho Cloudflare Worker đã bị thay thế. Xem ghi chú ngay dưới |
| `preview` | `vite preview` | Phục vụ bản build tĩnh (**không có API**) |
| `lint` | `tsc --noEmit` | **Bước kiểm tra duy nhất** của repo này. Hiện đang **pass** (exit 0) |
| `rehearsal` | `node scripts/rehearsal.mjs` | 174 bước tổng duyệt qua HTTP trên backend **đang chạy** với dữ liệu demo thật |
| `clean` | `rm -rf dist server.js` | Lệnh Unix; trên Windows cần Git Bash |

**Vì sao `build` và `build:legacy` tách đôi:** trước ngày 26 chỉ có một lệnh `build`, và nó luôn đóng gói `scripts/sites-worker.js` thành `dist/server/index.js`. Worker ấy chỉ xử lý `/api/auth/*` và `/api/package-upgrade-requests`, trong khi giao diện gọi hàng chục endpoint .NET khác — nên một bản deploy dựng từ nó đăng nhập được nhưng gần như mọi màn còn lại trả 404. Nó cũng băm mật khẩu bằng SHA-256 một vòng, yếu hơn hẳn PBKDF2 210.000 vòng của backend thật. Giữ lại dưới tên `build:legacy` để tra cứu, còn `build` nay chỉ dựng SPA.

**Repo này không có test runner** (không Jest, không Vitest, không script `test`). Xác minh thay đổi giao diện bằng `npm run lint` và chạy thử app. Backend là solution riêng và **có** bộ kiểm thử: `dotnet test` chạy 115 test xUnit đi qua HTTP trên một database dùng một lần.

---

## 7. Cấu trúc thư mục chính

```
.
├── index.html                    # Entry SPA chính
├── ui-preview.html               # Entry harness xem component (chỉ dev)
├── vite.config.ts                # Vite + proxy /api sang backend .NET + alias @ → gốc repo
├── tsconfig.json                 # target ES2022, strictNullChecks, alias "@/*": ["./*"], noEmit
├── metadata.json                 # Metadata bản export AI Studio
│
├── src/
│   ├── main.tsx                  # createRoot + LanguageProvider + ToastProvider
│   ├── App.tsx                   # ~1.500 dòng — state tree + nghiệp vụ của các domain CHƯA nối API
│   ├── types.ts                  # Model dữ liệu tầng nền tảng (Tenant, Invoice, Package…)
│   ├── data.ts                   # Mock seed cấp hệ thống + helper localStorage
│   ├── index.css                 # ~7.700 dòng — toàn bộ design token & class
│   │
│   ├── services/                 # 13 file — bọc fetch có kiểu trên nền apiClient.ts (§11.2)
│   ├── hooks/                    # 13 file — mỗi domain một hook, giữ trạng thái nạp/nạp lại
│   │
│   ├── features/
│   │   └── reception/            # Cổng lễ tân đã tách khỏi ReceptionistPortal.tsx
│   │       ├── types.ts          #   Hình dạng mà JSX đang đọc (KHÔNG phải DTO máy chủ)
│   │       ├── adapters.ts       #   DTO máy chủ → các hình dạng trên
│   │       ├── constants.ts      #   navItems, nhãn trạng thái, nhãn phương thức thanh toán
│   │       ├── catalogs.ts       #   Mẫu vẽ, màu sơn, bậc độ khó
│   │       ├── format.ts         #   Tiền, giờ, giờ mở/đóng cửa
│   │       ├── storage.ts        #   Đọc localStorage an toàn
│   │       ├── mockSeed.ts       #   Hai mock còn lại: sản phẩm quầy, ghế
│   │       ├── useReceptionDesk.ts  # Toàn bộ phần ĐỌC của quầy, một hook
│   │       ├── screens/          #   DeskScreen
│   │       ├── dialogs/          #   8 hộp thoại
│   │       └── shell/            #   Thanh bên (+ lớp phủ mobile) và thanh trên
│   │
│   ├── auth/demoAccounts.ts      # PortalRole + danh sách account demo phía client
│   ├── mockData/supportTickets.ts# Seed ticket hỗ trợ
│   ├── i18n/                     # LanguageProvider, translate, bảng dịch EN
│   │
│   ├── components/
│   │   ├── ui/                   # Thư viện dùng chung: Button, Field, Switch,
│   │   │                         # StatusBadge, DataTable, PageHeader, Modal,
│   │   │                         # Pagination, Toast, MockDataNotice
│   │   ├── (Superadmin)          # Overview, TenantManagement, TenantAdminManagement,
│   │   │                         # SubscriptionPackages, BillingAndInvoices,
│   │   │                         # SystemReports, SystemSettings,
│   │   │                         # SuperAdminAnnouncements, SecurityAndLogs,
│   │   │                         # HelpAndSupport, DataBackup, AccountPreferences
│   │   ├── (Tenant Admin)        # NailTenantAdminPortal + TenantAdmin*.tsx
│   │   ├── (Receptionist)        # ReceptionistPortal + Receptionist*.tsx
│   │   └── nailAdminData.ts      # Cấu hình + dữ liệu demo cho các trang Tenant Admin
│   │
│   └── utils/                    # Lớp logic thuần & truy cập dữ liệu (xem §11.3)
│
├── scripts/
│   ├── copy-build-to-server.mjs  # Chép dist/ vào wwwroot của backend — `build:server` dùng
│   ├── rehearsal.mjs             # Kịch bản tổng duyệt 174 bước qua HTTP
│   ├── vite-local-auth.ts        # DI TÍCH — plugin đã gỡ, chỉ còn để tra tài khoản demo
│   ├── sites-worker.js           # DI TÍCH — Cloudflare Worker + D1, chỉ `build:legacy` dùng
│   └── prepare-sites-build.mjs   # Hậu xử lý của `build:legacy`
│
├── db/schema.ts                  # DI TÍCH — schema của bản Worker, không chạy
└── drizzle/*.sql                 # DI TÍCH — migration SQL của bản Worker, không chạy
```

**Backend thật không nằm trong cây này** — nó ở `C:\Users\letru\source\repos\NailManagement`, một solution ASP.NET Core riêng. Xem §11.

### Bốn file cần biết trước tiên

1. **`src/App.tsx`** — state cấp hệ thống của những domain **chưa** nối API: `packages`, `alerts`, `tickets`, `announcements`, `upgradeRequests`. Kèm các `useEffect` vừa đồng bộ xuống `localStorage`, vừa **chạy nghiệp vụ đáng lẽ thuộc backend** (tự hết hạn subscription, tự sinh hóa đơn, ghi audit log). Danh sách này đang co lại: tiệm đã chuyển sang `useTenants` / `useMyTenant`.
2. **`src/services/apiClient.ts`** — chỗ duy nhất biết contract lỗi JSON của máy chủ. Mọi service khác đứng trên nó.
3. **`src/types.ts`** — model dữ liệu tầng nền tảng.
4. **`src/index.css`** — mọi token thiết kế.

---

## 8. Các role đang tồn tại

Định nghĩa tại [src/auth/demoAccounts.ts:1](src/auth/demoAccounts.ts#L1):

```ts
export type PortalRole = 'SUPERADMIN' | 'TENANT_ADMIN' | 'RECEPTIONIST';
```

Ba vai trò này được **backend công nhận** trong `scripts/sites-worker.js` (cột `app_users.role`) và dùng để phân quyền endpoint:
- `PUT /api/auth/accounts`, `DELETE /api/auth/accounts/:id` → chỉ `SUPERADMIN`.
- `POST /api/package-upgrade-requests` → chỉ `TENANT_ADMIN`.
- `PATCH|DELETE /api/package-upgrade-requests/:id` → chỉ `SUPERADMIN`.
- `GET /api/package-upgrade-requests` → `SUPERADMIN` thấy tất cả; `TENANT_ADMIN` chỉ thấy của tenant mình.

### Các "vai trò" khác chỉ tồn tại như dữ liệu, chưa gắn vào phân quyền

- `TenantAdminRole = 'Owner' | 'Manager' | 'Staff'` ([src/types.ts:204](src/types.ts#L204)) — chỉ là trường hiển thị trên màn hình Tenant Admin, **không** ảnh hưởng quyền truy cập.
- `SystemLog.actorRole` có thêm `'SUPPORT'`, `AdminSession.role` có `'SUPERADMIN' | 'SUPPORT'` — vai trò SUPPORT xuất hiện trong dữ liệu nhật ký nhưng **không có** trong `PortalRole`, tức chưa đăng nhập được. `NEED_CONFIRMATION`: SUPPORT có phải một vai trò đăng nhập thật trong kế hoạch không?
- `StaffRole = 'RECEPTIONIST' | 'TECHNICIAN'` trong `TenantAdminStaff.tsx` là **dữ liệu nhân sự của tiệm**, không phải tài khoản đăng nhập.

### Quan hệ tài khoản ↔ tenant: **một Tenant Admin quản lý được nhiều tenant** (đã chốt)

Đây là quyết định nghiệp vụ đã được chốt, và **backend .NET đã làm xong** — bảng nối `UserTenants` giữ quan hệ nhiều–nhiều, tiệm đang làm việc nằm trong phiên đăng nhập (BR-AUTH-024), và đổi tiệm là một thao tác trên phiên chứ không phải một tham số gửi kèm từng request (BR-AUTH-025).

| Nơi | Hiện trạng |
|---|---|
| `TenantAdminAccount.tenantIds: string[]` + `tenantCount` — [src/types.ts:224](src/types.ts#L224) | Hỗ trợ nhiều tiệm ✅ |
| Màn hình gán tiệm "Tiệm đang quản lí" — [TenantAdminManagement.tsx:415](src/components/TenantAdminManagement.tsx#L415) | Cho phép gán nhiều tiệm cho một admin ✅ |
| Bảng `UserTenants` + `AppSessions.ActiveTenantId` trong solution `NailManagement` | Hỗ trợ nhiều tiệm, có màn chọn tiệm ✅ |
| `app_users.tenant_id TEXT` — [db/schema.ts:41](db/schema.ts#L41) | Chỉ chứa được một tiệm — nhưng đây là schema của bản Cloudflare Worker **đã bị thay thế**, giữ làm lịch sử |

**Phần dưới đây đã được giải quyết, giữ lại để thấy vấn đề từng là gì.**

Bản Worker cũ lọc dữ liệu bằng `tenant_id = session.tenantId`, nên một admin được gán 3 tiệm khi đăng nhập **chỉ thấy được tiệm đầu tiên** — và chỗ đồng bộ tài khoản ở `App.tsx` cũng chỉ gửi được một tenant lên.

**Cách đã làm** (chi tiết ở [README-BACKEND-ROADMAP.md](README-BACKEND-ROADMAP.md)):
- Backend có **bảng nối** `UserTenants` giữa tài khoản và tiệm, thay cho cột `app_users.tenant_id` đơn lẻ. ✅
- **Tiệm đang làm việc lưu trong phiên** (`AppSessions.ActiveTenantId`), đổi tiệm bằng một lời gọi API đổi phiên — frontend **không** đính tenant vào từng request. ✅
- Frontend có **màn chọn tiệm** cho tài khoản quản lý nhiều tiệm. ✅
- Mọi truy vấn phải đi đủ **bốn bước BR-TENANT-013** — lấy tiệm đang làm việc từ phiên, kiểm quyền của người dùng với tiệm đó qua `UserTenants`, rồi mới lọc dữ liệu. Bỏ bước kiểm quyền là mở đường truy cập chéo tiệm.

### Phân quyền theo gói (entitlement), không phải theo vai trò

`src/utils/tenantAdminEntitlements.ts` khóa từng trang Tenant Admin theo `capabilities` của gói đăng ký. Bảng ánh xạ trang → quyền ở [src/utils/tenantAdminEntitlements.ts:22](src/utils/tenantAdminEntitlements.ts#L22). Các trang **luôn mở với mọi gói**: `overview`, `branches`, `pos`, `staff`, `services`, `settings`, `subscription`.

---

## 9. Module / màn hình chính theo từng role

### 9.1 Superadmin

Điều hướng: `activeTab` trong `App.tsx`, sidebar tại `src/components/Sidebar.tsx`.

| Tab | Component | Nội dung |
|---|---|---|
| `overview` | `Overview.tsx` | Bảng điều khiển: tenant, hóa đơn, cảnh báo, ticket |
| `salons` | `TenantManagement.tsx` (+ `TenantDetailModal.tsx`, `PackageUpgradeRequests.tsx`) | CRUD tenant, chi nhánh, gói, yêu cầu nâng cấp |
| `admins` | `TenantAdminManagement.tsx` | Tài khoản Tenant Admin, mời/liên kết tenant |
| `packages` | `SubscriptionPackages.tsx` | Catalog gói, giá, quyền, hạn mức, ngừng bán |
| `billing` | `BillingAndInvoices.tsx` | Hóa đơn, thanh toán, đối soát, hoàn tiền |
| `reports` | `SystemReports.tsx` | Báo cáo doanh thu / tenant / gói toàn hệ thống |
| `announcements` | `SuperAdminAnnouncements.tsx` | Soạn & phát bản tin tới tenant |
| `settings` | `SystemSettings.tsx` | Cấu hình hệ thống (general/billing/email/security) |
| `security` | `SecurityAndLogs.tsx` | Nhật ký kiểm toán, phiên quản trị |
| `support` | `HelpAndSupport.tsx` | Ticket hỗ trợ |
| `backup` | `DataBackup.tsx` | Snapshot sao lưu, chính sách, restore job |
| `account-preferences` | `AccountPreferences.tsx` | Theme + ngôn ngữ (mở từ Header, không có trên sidebar) |

### 9.2 Tenant Admin

Điều hướng: `activePage: NailPageId` trong `NailTenantAdminPortal.tsx`; nhóm menu tại [src/components/NailTenantAdminPortal.tsx:183](src/components/NailTenantAdminPortal.tsx#L183).

| Nhóm | Trang | Component |
|---|---|---|
| Vận hành | Tổng quan | `TenantAdminOverview.tsx` |
| | Chi nhánh | render nội bộ trong portal (dữ liệu từ `tenant.branches`) |
| | Lịch hẹn | `TenantAdminAppointments.tsx` |
| | Ghế & khu vực | `TenantAdminStations.tsx` |
| | POS & thanh toán | `TenantAdminPayments.tsx` |
| Khách hàng | Hồ sơ khách hàng | `TenantAdminCustomers.tsx` |
| | Thành viên & ưu đãi | `TenantAdminLoyalty.tsx` |
| Danh mục | Nhân sự | `TenantAdminStaff.tsx` |
| | Dịch vụ & giá | `TenantAdminServices.tsx` |
| | Kho vật tư | `TenantAdminInventory.tsx` |
| | Màu & mẫu Nail | `TenantAdminNailGallery.tsx` |
| Quản trị | Bản tin hệ thống | `TenantAdminAnnouncements.tsx` |
| | Đặt lịch online | `TenantAdminOnlineBooking.tsx` |
| | Thu & Chi | `TenantAdminFinanceCompact.tsx` |
| | Vệ sinh & an toàn | `TenantAdminSanitation.tsx` |
| | Báo cáo | `TenantAdminReports.tsx` |
| | Gói đăng ký | `TenantAdminSubscription.tsx` |
| | Trung tâm trợ giúp | `TenantAdminHelpAndSupport.tsx` |
| | Cài đặt tiệm | `TenantAdminSettings.tsx` |

### 9.3 Receptionist

Điều hướng: `page: ReceptionPage`, `navItems` tại [src/features/reception/constants.ts:70](src/features/reception/constants.ts#L70).

| Trang | Component |
|---|---|
| Bàn lễ tân (`desk`) | `features/reception/screens/DeskScreen.tsx` |
| Lịch hẹn | `TenantAdminAppointments.tsx` (dùng lại, khóa theo chi nhánh) |
| Khách hàng | `TenantAdminCustomers.tsx` (dùng lại, **không** khóa theo chi nhánh — BR-CUS-001: khách thuộc tiệm, không thuộc chi nhánh) |
| Sản phẩm quầy | `ReceptionistProducts.tsx` |
| Ghế & phòng | `ReceptionistStations.tsx` |
| Kỹ thuật viên | `ReceptionistTechnicians.tsx` |
| Thanh toán & POS | `TenantAdminPayments.tsx` (dùng lại) |

`ReceptionistPortal.tsx` nay chỉ giữ state, nối hành động và chọn màn. Tám hộp thoại của quầy — lập hóa đơn, xác nhận thu tiền, tùy chỉnh mẫu vẽ, tiếp nhận khách vãng lai (đầy đủ và cấp tốc), sửa lịch, hủy lịch, mở/chốt ca — cùng thanh bên và thanh trên đều nằm trong `src/features/reception/` (xem §7).

---

## 10. Cách project đang quản lý mock data

Có **ba cơ chế khác nhau** cùng tồn tại. Cần nắm rõ cả ba.

### Cơ chế 1 — Seed cấp hệ thống, "gieo một lần" (Superadmin)

Seed nằm trong `src/data.ts`: `INITIAL_ALERTS`, `INITIAL_INVOICES`, `INITIAL_BACKUPS`, `INITIAL_BACKUP_POLICY`, `INITIAL_RESTORE_JOBS`. Thêm `INITIAL_ANNOUNCEMENTS` trong `src/utils/systemAnnouncements.ts` và `SUPPORT_MOCK_TICKETS` trong `src/mockData/supportTickets.ts`.

> `INITIAL_TENANTS` và `INITIAL_PACKAGES` **đã bị gỡ khỏi `data.ts`** ở ngày 6: danh sách tiệm đọc từ `GET /api/tenants`, bảng giá đọc từ `GET /api/packages`.

Đọc/ghi qua hai helper tại [src/data.ts:277](src/data.ts#L277) — chúng tự thêm tiền tố `salonsys_`:

```ts
loadLocalStorageData<T>(key, defaultValue)  // đọc localStorage[`salonsys_${key}`]
saveLocalStorageData<T>(key, value)         // ghi localStorage[`salonsys_${key}`]
```

Với `alerts` còn một **cờ gieo một lần** để mock chỉ được trộn vào đúng một lần rồi thôi: `loadAlertsWithOneTimeMocks()` — [src/App.tsx:77](src/App.tsx#L77), cờ `salonsys_alerts_mock_seed_v2`. Cơ chế tương tự cho `tenants` **không còn**, vì tiệm nay đọc từ máy chủ.

Ngoài ra `App.tsx` còn lọc bỏ một danh sách **ID mock cũ** đã bị khai tử (`LEGACY_MOCK_SUPPORT_TICKET_IDS` tại [src/App.tsx:130](src/App.tsx#L130); tương tự trong `utils/auditLogs.ts` và `SecurityAndLogs.tsx`).

### Cơ chế 2 — Seed theo tiệm, có công tắc demo/live (Tenant Admin & Receptionist)

Mỗi màn hình Tenant Admin tự chứa mảng seed của mình rồi trộn với dữ liệu đã lưu qua `getTenantAdminInitialData()` ([src/utils/mockDataReset.ts:33](src/utils/mockDataReset.ts#L33)) — hàm này giữ lại bản ghi người dùng đã tạo và **chỉ thêm những seed chưa có ID trùng**.

Khóa `localStorage` gắn theo **mã tiệm**, dạng `<module>-v<N>:<tenantId>` (danh sách đầy đủ ở §10.4). Trước ngày 9 nó gắn theo **tên** tiệm, và điều đó hỏng theo hai cách: đổi tên tiệm là mất sạch dữ liệu cục bộ, còn hai tiệm trùng tên thì dùng chung một ngăn. `src/utils/tenantStorage.ts` nay là **con đường duy nhất** dựng ra khóa, để không màn nào quên.

Có một **cờ toàn cục demo/live**: `setTenantAdminDataMode('demo' | 'live')` trong `mockDataReset.ts`, được bật/tắt từ `NailTenantAdminPortal`. Nút "nạp dữ liệu demo" / "tắt chế độ kiểm thử" nằm trong portal; trạng thái lưu ở `tenant-admin-demo-mode:<tenantId>`.

Khi Superadmin xóa một tiệm, `resetTenantMockStorage(target.id)` xóa toàn bộ khóa của tiệm đó ([src/App.tsx:717](src/App.tsx#L717)) — truyền **mã tiệm**, không phải tên.

### Cơ chế 3 — Mock cấu hình trang (không phải bản ghi)

`src/components/nailAdminData.ts` (735 dòng) chứa `nailModuleConfigs` — cấu hình *và* dữ liệu hiển thị mẫu (`stats`, `rows`, `insights`, `checklist`, `formFields`) cho từng trang Tenant Admin. Đây vừa là **cấu trúc UI** vừa là **dữ liệu demo**, hai thứ trộn vào nhau.

### 10.4 Toàn bộ khóa `localStorage` đang dùng

**Cấp hệ thống (tiền tố `salonsys_`):**

| Khóa | Nội dung | Nơi ghi |
|---|---|---|
| `salonsys_alerts` | Cảnh báo hệ thống | `App.tsx` |
| `salonsys_alerts_mock_seed_v2` | Cờ đã gieo mock cảnh báo | `App.tsx` |
| `salonsys_support_tickets` | Ticket hỗ trợ | `App.tsx` |
| `salonsys_package_upgrade_requests` | Yêu cầu nâng cấp gói (cache của API cũ) | `utils/packageUpgradeRequests.ts` |
| `salonsys_audit_logs` | Nhật ký kiểm toán cục bộ (giới hạn 2.000 bản ghi) — **nhật ký thật nay ở máy chủ**, đây là phần của các domain chưa nối | `utils/auditLogs.ts` |
| `salonsys_system_settings` | Cấu hình hệ thống | `utils/systemSettings.ts` |
| `salonsys_admin_sessions` | Phiên quản trị mô phỏng — **tab Phiên đăng nhập thật nay đọc từ máy chủ** | `SecurityAndLogs.tsx` |
| `salonsys_backups_v2`, `salonsys_backup_policy_v2`, `salonsys_restore_jobs_v2` | Sao lưu | `DataBackup.tsx` |
| `salonsys_theme` | light / dark | `App.tsx` |
| `salonsys_interface_language` | vi / en | `i18n/LanguageProvider.tsx` |

**Khóa đã chết nhưng vẫn nằm trong danh sách xóa của `mockDataReset.ts`:** `salonsys_tenants`, `salonsys_tenants_mock_seed_v1`, `salonsys_packages`, `salonsys_invoices`, `salonsys_invoices_v2`, `salonsys_tenant_admins`. Không còn đường ghi nào tạo ra chúng — tiệm, gói, hóa đơn đăng ký và tài khoản chủ tiệm đều đọc từ máy chủ. Chúng được giữ trong danh sách xóa để dọn nốt dữ liệu của những phiên trước.

**Bản tin (không có tiền tố `salonsys_`):** `system_announcements_v1`, và bốn khóa gắn tenantId: `dismissed_announcement_banners_v1_<tenantId>`, `read_announcements_by_tenant_v1_<tenantId>`, `archived_announcements_by_tenant_v1_<tenantId>`, `deleted_announcements_by_tenant_v1_<tenantId>`.

**Theo tiệm (`<khóa>:<tenantId>`) — gắn theo MÃ tiệm, không phải tên:**

`tenant-admin-appointments-v2`, `tenant-admin-payments-v1`, `tenant-admin-customers-v1`, `tenant-admin-stations-v2`, `tenant-admin-station-areas-v1`, `tenant-admin-staff-v2`, `tenant-admin-services-v2`, `tenant-admin-services-v1`, `tenant-admin-inventory-v1`, `tenant-admin-loyalty-v1`, `tenant-admin-tiers-v1`, `tenant-admin-customer-care-v1`, `tenant-admin-expenses-v1`, `tenant-admin-nail-designs-v1`, `tenant-admin-nail-colors-v1`, `tenant-admin-demo-mode`, `mobile-app-bookings-v2`, `receptionist-technicians-v1`, `receptionist-products-v1`, `receptionist-product-reports-v1`, `receptionist-stations-v1`.

Có khóa nhiều tầng: `tenant-admin-finance-v1:<tenantId>:transactions|cashbooks|debts|budgets`, `tenant-admin-online-booking-v1:<tenantId>:channels|services`, `tenant-admin-sanitation-v1:<tenantId>:checklists|batches|incidents|certificates`, `receptionist-invoice-drafts-v1:<tenantId>:<branchCode>`.

Khóa gắn theo tài khoản: `receptionist-shift-v1:<email>`.

**Giao diện:** `sidebar_collapsed`, `tenant-admin-sidebar-collapsed`, `receptionist_sidebar_collapsed`, `dismissed_tasks_<tenantId>`.

**Bất nhất đã tồn tại (cần dọn khi migrate):**
- `TenantAdminPayments.tsx:401` dùng `` `${tenantName}_nail_colors` `` trong khi mọi nơi khác dùng `tenant-admin-nail-colors-v1:<tenant>`.
- Tồn tại song song cả `tenant-admin-services-v1` và `-v2`.
- Danh sách reset trong `mockDataReset.ts` **không đầy đủ**: thiếu `tenant-admin-tiers-v1`, `tenant-admin-station-areas-v1`, `tenant-admin-expenses-v1`, `mobile-app-bookings-v2`, `receptionist-invoice-drafts-v1`, `receptionist-shift-v1` — nên "reset dữ liệu tenant" hiện chưa xóa hết.

---

## 11. Service / API abstraction hiện có

Backend thật là **một solution ASP.NET Core riêng, không nằm trong repo này**: `C:\Users\letru\source\repos\NailManagement` — 14 controller, EF Core + SQL Server 2022, phiên là cookie cộng bảng `AppSessions` chứ không phải JWT. `vite.config.ts` proxy `/api` sang `http://localhost:5282` (đổi bằng biến `API_ORIGIN` — [vite.config.ts:8](vite.config.ts#L8)). Proxy **cùng origin** là cố ý: nó giữ cho cookie `SameSite=Strict` chạy được, và nhờ vậy backend không phải mở CORS cho ai cả. Chi tiết từng endpoint và lý do từng quyết định nằm ở [README-BACKEND-ROADMAP.md](README-BACKEND-ROADMAP.md).

§11.1 ngay dưới mô tả **bản tiền nhiệm đã bị thay**. Giữ lại vì nó giải thích vì sao `scripts/` và `db/` còn những file trông như backend — **đừng đọc nó như hiện trạng**.

### 11.1 Di tích: Cloudflare Worker + D1, và plugin auth của Vite

Cả hai **đã ngừng phục vụ**. `scripts/vite-local-auth.ts` bị gỡ khỏi `vite.config.ts` vì nó chặn `/api/auth/*` **trước** khi proxy kịp chạy; nó chỉ còn được dùng để tra ba tài khoản demo. `scripts/sites-worker.js` chỉ còn được `npm run build:legacy` đóng gói. **Đừng thêm nghiệp vụ vào một trong hai, cũng đừng thêm vào `db/schema.ts`.**

| Môi trường (cũ) | File | Cơ chế |
|---|---|---|
| Dev (`npm run dev`) | `scripts/vite-local-auth.ts` | Vite plugin (`apply: 'serve'`), tài khoản hard-code, session lưu trong RAM (mất khi restart) |
| Production (cũ) | `scripts/sites-worker.js` | Cloudflare Worker + D1 (SQLite): hash mật khẩu SHA-256 + salt, session cookie HttpOnly/SameSite=Strict, khóa tài khoản sau 5 lần sai trong 15 phút, phân quyền theo role |

Endpoint mà bản Worker ấy phủ:

```
POST   /api/auth/login
GET    /api/auth/session
POST   /api/auth/logout
PUT    /api/auth/accounts              (chỉ SUPERADMIN)
DELETE /api/auth/accounts/:identifier  (chỉ SUPERADMIN)
GET    /api/package-upgrade-requests
POST   /api/package-upgrade-requests   (chỉ TENANT_ADMIN)
PATCH  /api/package-upgrade-requests/:id  (chỉ SUPERADMIN)
DELETE /api/package-upgrade-requests/:id  (chỉ SUPERADMIN)
GET    /api/auth/dev-login             (chỉ dev, mặc định tắt)
```

Worker tự tạo bảng và seed 3 tài khoản demo ở lần gọi đầu (`ensureSchema` — [scripts/sites-worker.js:157](scripts/sites-worker.js#L157)), sau đó phục vụ tệp tĩnh với fallback SPA.

### 11.2 Lớp gọi API ở frontend

Hai tầng, mỗi tầng một việc, và **cả hai đều đã có sẵn để chép theo**:

| Tầng | Ở đâu | Việc |
|---|---|---|
| Service | `src/services/*.ts` — 13 file, trên nền `apiClient.ts` | Bọc `fetch` có kiểu, khai rõ kết quả. **Không nuốt lỗi bao giờ** |
| Hook | `src/hooks/use*.ts` — 13 file, mỗi domain một hook | Giữ trạng thái nạp/nạp lại, để màn hình sạch khỏi chi tiết `fetch` |

`apiClient.ts` là chỗ duy nhất biết về contract lỗi JSON của máy chủ; service đọc `error.code` từ đó chứ không tự đoán theo mã HTTP.

**Khuôn mẫu cũ — `src/utils/authApi.ts` — nay là code chết, đừng chép.** Không file nào import nó nữa. Nó `catch` rồi trả `null` cho **cả** "chưa đăng nhập" **lẫn** "máy chủ chết", nên tầng gọi không phân biệt được hai thứ đó — và đó chính là lý do `src/services/auth.ts` ra đời thay nó. `src/utils/packageUpgradeRequests.ts` thì vẫn đang được `App.tsx` dùng và vẫn mang đúng khuyết tật ấy: `persistPackageUpgradeRequest` và `persistPackageUpgradeReview` `return true` **ngay trong nhánh `catch`**, tức **báo thành công kể cả khi máy chủ lỗi**. Nó nằm trong danh sách phải viết lại khi domain gói đăng ký được nối.

Cần tách bạch hai việc khác nhau:

| Đúng | Sai |
|---|---|
| Không để lỗi kỹ thuật thô (stack trace, `TypeError: Failed to fetch`) hiện lên UI | Giấu luôn việc thao tác đã thất bại và coi như thành công |

**Hợp đồng mà service mới phải giữ** — tầng gọi phải phân biệt được ít nhất các trường hợp sau, vì mỗi trường hợp cần một cách hiển thị khác nhau:

| Trường hợp | UI nên làm gì |
|---|---|
| Thành công | Cập nhật dữ liệu |
| Lỗi validation | Gắn thông báo vào đúng ô nhập sai |
| Chưa đăng nhập (401) | Đưa về màn hình đăng nhập |
| Không đủ quyền (403) | Báo không có quyền, **không** đưa về đăng nhập |
| Lỗi mạng | Báo mất kết nối, cho thử lại |
| Lỗi máy chủ (5xx) | Báo lỗi hệ thống, cho thử lại |
| Quá nhiều lần thử (429) | Báo cần chờ — máy chủ trả mã `TOO_MANY_REQUESTS` kèm thân JSON, không phải thân rỗng |

### 11.3 Các module `utils/` khác (logic thuần, không gọi mạng)

| File | Vai trò |
|---|---|
| `subscriptions.ts` | Catalog quyền (`SUBSCRIPTION_CAPABILITY_CATALOG`), bậc gói chuẩn (`STANDARD_PLAN_CAPABILITY_TIERS`), tính giá, chuẩn hóa gói |
| `tenantAdminEntitlements.ts` | Ánh xạ trang → quyền gói; tính hạn mức chi nhánh/nhân sự |
| `tenantValidation.ts` | Validate biểu mẫu tenant, điều kiện xóa tenant |
| `branches.ts` | Validate & chuẩn hóa chi nhánh, sinh mã chi nhánh |
| `money.ts` | Định dạng tiền VND. **Chỉ còn VND** (BR-VAL-003) — không có `convertMoney`, không có tỷ giá. `normalizeCurrency` tồn tại để chặn bản ghi cũ mang `currency: 'USD'` còn sót trong `localStorage` |
| `invoicePayments.ts` | Suy ra cổng thanh toán, chuẩn hóa dữ liệu thanh toán hóa đơn |
| `auditLogs.ts` | Ghi/đọc nhật ký kiểm toán trong `localStorage` |
| `systemSettings.ts` | Load/save/validate cấu hình hệ thống, phát `CustomEvent` cho các tab khác |
| `systemAnnouncements.ts` | Bản tin + trạng thái đọc/ẩn/lưu trữ theo tenant |
| `mockDataReset.ts` | Cờ demo/live, trộn seed, reset khóa localStorage |
| `tenantCustomers.ts` | Model + seed khách hàng của tenant |
| `inventorySync.ts` | Đồng bộ màu sơn ↔ kho vật tư |
| `promotionUtils.ts` | Model chương trình khuyến mãi + tính giảm giá |
| `alerts.ts` | Định dạng thời gian cảnh báo |

### 11.4 `db/` và `drizzle/` chưa được nối vào công cụ nào

`db/schema.ts` và `drizzle/0001_*.sql`, `drizzle/0002_*.sql` mô tả **đúng các bảng** mà `sites-worker.js` tạo, nhưng project **không cài `drizzle-orm` hay `drizzle-kit`**. Đây là tài liệu chép tay giữ đồng bộ thủ công, **không phải đường migration đang chạy**.

---

## 12. Cấu hình environment

`.env.example`:

```
HOST=
SALONSYS_DEV_LOGIN=
```

| Biến | Đọc ở đâu | Ý nghĩa |
|---|---|---|
| `SALONSYS_DEV_LOGIN` | [scripts/vite-local-auth.ts:128](scripts/vite-local-auth.ts#L128) | `1`/`true` → bật `/api/auth/dev-login`. Mặc định tắt |
| `DISABLE_HMR` | [vite.config.ts:21](vite.config.ts#L21) | `true` → tắt HMR và tắt file watching (dùng khi agent sửa file) |
| `HOST` | — | Có trong `.env.example` nhưng **không được đọc ở bất kỳ đâu trong code**. Vite đã hard-code `host: '0.0.0.0'` |

**Không có biến `VITE_*` nào** — frontend hiện không nhận cấu hình runtime qua env. API base URL là đường dẫn tương đối (`/api/...`), tức backend phải cùng origin.

`.gitignore` bỏ qua mọi `.env*` trừ `.env.example`.

**Cấu hình deploy:** `.openai/hosting.json` khai `project_id` và binding D1 tên `DB`. Worker đọc `env.DB` và `env.ASSETS`.

---

## 13. Các dependency quan trọng

- **React 19** — dùng `lazy`/`Suspense`. Chưa dùng các API mới của 19 (Actions, `use`).
- **Tailwind v4 qua `@tailwindcss/vite`** — cấu hình nằm trong CSS (`@theme static` ở `src/index.css`), **không có** `tailwind.config.js`. Đừng tạo file config JS; sửa token trong `index.css`.
- **lucide-react** — icon set duy nhất, đừng thêm bộ icon khác.
- **recharts** — biểu đồ.
- **tsx** — còn trong `devDependencies` từ thời `vite.config.ts` phải import `scripts/vite-local-auth.ts`. Plugin ấy đã bị gỡ, nên hôm nay tsx không còn chỗ dùng nào bắt buộc.

---

## 14. Trạng thái hiện tại của project

### 14.1 Đã hoàn thiện

- **Toàn bộ 3 cổng giao diện dựng xong** với ~80.000 dòng TypeScript/TSX trong `src/`.
- **Backend nghiệp vụ thật, ở một solution riêng** — ASP.NET Core 10 + EF Core + SQL Server 2022, bốn tầng Domain/Application/Infrastructure/API, **14 controller** phủ xác thực và phiên, tiệm, chi nhánh, dịch vụ, nhân viên, khách hàng, lịch hẹn, hóa đơn bán hàng và thu tiền, báo cáo doanh thu, nhật ký kiểm toán, quản trị phiên đăng nhập.
- **Phiên là cookie + bảng `AppSessions`, không phải JWT** — nên trạng thái tài khoản được đọc lại ở **mỗi** request, và khóa tài khoản hay thu hồi phiên có hiệu lực ngay.
- **Bộ kiểm thử tự động: 115 phép thử xUnit, xanh** (`dotnet test`, ~13 giây), chạy máy chủ thật trong bộ nhớ qua HTTP trên một database dùng-rồi-bỏ.
- **Kịch bản tổng duyệt 174 bước** (`npm run rehearsal`) chạy qua HTTP trên máy chủ **đang chạy** với dữ liệu demo thật, đi hết cả ba vai và ép vào từng ranh giới luật.
- **Các màn đã nối API thật:** đăng nhập và chọn tiệm · quản lý tiệm · chi nhánh · dịch vụ · nhân viên · khách hàng · cổng lễ tân (lịch hẹn, kỹ thuật viên, bảng giá, hóa đơn và thu tiền) · báo cáo doanh thu · tổng quan chủ tiệm · doanh thu nền tảng của Superadmin · nhật ký kiểm toán và tab Phiên đăng nhập.
- **Design system** — token đầy đủ trong `index.css`, thư viện component dùng chung `src/components/ui/` (Button, Field, Switch, StatusBadge, DataTable, PageHeader, Modal, Pagination, Toast) kèm harness xem trước `/ui-preview.html`.
- **Lớp i18n** vi/en có fallback an toàn. **Dark mode** hoạt động.
- `npm run lint` (`tsc --noEmit`) **đang pass**, và `strictNullChecks` đã bật.

### 14.2 Chưa triển khai

**Các màn còn chạy `localStorage`.** Đây là phần lớn nhất còn lại, và nó **không đồng nghĩa với "chưa có backend"** như trước: gói đăng ký, hóa đơn đăng ký, ticket hỗ trợ, bản tin, sao lưu, kho vật tư, sản phẩm quầy, ghế & phòng, đặt lịch online, thu chi, loyalty, vệ sinh & an toàn vẫn sống trong trình duyệt. Hệ quả của riêng những màn đó:

- Xóa cache trình duyệt là mất dữ liệu của chúng.
- Hai máy khác nhau thấy hai bộ dữ liệu khác nhau.
- Luật của chúng chạy ở client nên bỏ qua được bằng DevTools.

Mỗi màn như vậy mang dải nhãn **"Dữ liệu mẫu — chưa nối máy chủ"**, khai ở bảng `MOCK_DATA_REASONS` cạnh chỗ chọn màn (§9).

**Đã biết và cố ý chưa làm ở backend** (không phải sơ suất — xem §9.4 của `README-BACKEND-ROADMAP.md`):
- Không có token chống CSRF; chỉ dựa vào `SameSite=Strict`.
- Không có đường đổi mật khẩu, quên mật khẩu, kích hoạt tài khoản, xác minh email/SĐT.
- Không giới hạn số phiên đồng thời, không xác thực lại cho thao tác nhạy cảm.
- Chấm công, ca làm việc, dị ứng/nhãn khách và nhắc lịch **không có cột nào** — cổng lễ tân giữ chúng trong một bản đồ phụ ở client.

**Chưa có, ở cả frontend lẫn backend:**
- Gửi email / SMS / Zalo (chỉ có màn hình cấu hình SMTP, không có hành vi gửi).
- Sao lưu & khôi phục thật (`DataBackup.tsx` mô phỏng hoàn toàn).
- Upload tệp thật (logo, chứng từ thanh toán, ảnh mẫu nail).
- Cổng thanh toán thật (MoMo/VNPay/Stripe chỉ là nhãn dữ liệu).
- Hóa đơn điện tử / thuế theo quy định Việt Nam.
- Deep-link / URL routing.
- Test tự động **ở frontend** (backend đã có xUnit; repo này chỉ có `tsc` và kịch bản tổng duyệt).

**Chưa xong ở frontend:**
- Bản dịch tiếng Anh còn thiếu nhiều (`src/i18n/translations.ts` chỉ 303 dòng cho toàn bộ app).

### 14.3 Vấn đề cấu trúc đã biết

- **Component quá lớn, không tách UI khỏi dữ liệu:** `TenantAdminOnlineBooking.tsx` 3.921 dòng, `TenantAdminAppointments.tsx` 3.790, `TenantAdminInventory.tsx` 3.329, `TenantAdminFinanceCompact.tsx` 2.838, `NailTenantAdminPortal.tsx` 2.763, `TenantDetailModal.tsx` 2.363, `TenantAdminPayments.tsx` 2.285.
- **`ReceptionistPortal.tsx` đã ra khỏi danh sách trên**: 6.213 → 2.237 dòng, phần còn lại nằm ở `src/features/reception/` (xem §7). Đây là khuôn mẫu để tách các file còn lại — mỗi lần tách **dời JSX nguyên văn từng dòng**, vì `tsc` cộng với thân JSX không đổi là lưới an toàn duy nhất của repo này.
- **Code chết đã xác nhận** (không file nào import):
  - `src/components/TenantAdminPortal.tsx` (391 dòng) — `App.tsx` dùng `NailTenantAdminPortal`.
  - `src/components/TenantAdminCustomerCare.tsx` (1.860 dòng).
  - `src/components/TenantAdminFinance.tsx` (4 dòng, shim re-export `TenantAdminFinanceCompact`).
  - `src/utils/authApi.ts` — đã bị `src/services/auth.ts` thay, chỉ còn được nhắc trong chú thích.
- **`settings-naile-studio.csv` ở thư mục gốc** là tệp do chính app xuất ra (hàm export CSV của Tenant Admin), bị commit nhầm.
- **`skills/` và `claude-skills/` ở thư mục gốc** là checkout công cụ riêng, không thuộc ứng dụng. `tsconfig.json` loại trừ `claude-skills/` — giữ nguyên dòng loại trừ ấy.
- Model dữ liệu rải rác: `types.ts` giữ model tầng nền tảng, còn model tầng salon nằm rải trong các component và `utils/`. Riêng cổng lễ tân đã gom xong vào `src/features/reception/types.ts`.

---

## 15. Lưu ý quan trọng cho developer tiếp tục phát triển

1. **Nghiệp vụ của các domain CHƯA nối API nằm trong `App.tsx`, không nằm trong màn hình.** Muốn sửa luật gói/hóa đơn đăng ký/bản tin, tìm trong các `useEffect` của `App.tsx` trước. Nhưng **đừng thêm logic mới vào đó** cho một domain đã có service và hook — tiệm, chi nhánh, dịch vụ, nhân viên, khách hàng, lịch hẹn, hóa đơn bán hàng đều đã có, và luật của chúng thuộc về máy chủ.

2. **Không có router.** `activeTab` là state. Nút Back của trình duyệt và bookmark không hoạt động như SPA thông thường. Nếu thêm routing, đây là thay đổi kiến trúc lớn chạm vào cả ba portal.

3. **Alias `@/*` trỏ tới gốc repo**, không phải `src/` (xem `tsconfig.json` và `vite.config.ts`).

4. **Sửa design token trong `src/index.css`**, không tạo `tailwind.config.js`. Kiểm tra `src/components/ui/` trước khi viết primitive mới. `StatusBadge`'s `STATUS_MAP` là **nơi duy nhất** ánh xạ status → nhãn/tone/icon; đừng tạo bảng ánh xạ thứ hai trong màn hình.

5. **Khi thêm domain gọi API thật, chép `src/services/` + `src/hooks/`, đừng chép `src/utils/authApi.ts`.** `authApi.ts` vẫn nằm trong repo nhưng **không file nào import nữa** — nó là hình mẫu cũ `catch` rồi trả `null` cho cả "chưa đăng nhập" lẫn "máy chủ chết", và `src/services/auth.ts` ra đời chính vì tầng gọi không phân biệt được hai thứ đó. Xem §11.2.

6. **Đổi `tenant.name` sẽ làm mất dữ liệu localStorage.** Khóa `localStorage` của Tenant Admin nhúng **tên tenant**, không phải ID — với những domain còn chạy mock. Các domain đã nối API không còn phụ thuộc vào điều này.

7. **Chạy `npm run lint` trước khi commit.** Đây là cổng kiểm tra duy nhất của repo này và hiện đang xanh — đừng để nó đỏ. Backend có bộ xUnit riêng ở solution của nó.

8. **Backend nằm ở repo khác.** Thêm endpoint là sửa `C:\Users\letru\source\repos\NailManagement`, không phải `scripts/`. `scripts/sites-worker.js`, `scripts/vite-local-auth.ts` và `db/schema.ts` là **di tích của bản Cloudflare Worker đã bị thay** — đừng thêm nghiệp vụ vào chúng. `vite-local-auth.ts` chỉ còn dùng để tra ba tài khoản demo.

9. **Một tài khoản Tenant Admin quản lý được nhiều tiệm** — và backend nay lưu được: quyền nằm ở bảng nối, tiệm đang làm việc nằm trong phiên, và mọi truy vấn phải kiểm quyền với tiệm đó trước khi lọc dữ liệu (BR-TENANT-013, bốn bước, không được đảo).

10. **Dữ liệu `localStorage` còn lại là mock/demo, bỏ được.** Không cần giữ gìn khi migrate — cứ xóa và seed lại. Dữ liệu thật nằm ở SQL Server.

11. **Trước khi động vào hành vi phía máy chủ, đọc `README-BACKEND-ROADMAP.md`** (nhật ký ngày-qua-ngày, kèm lý do của từng quyết định) và `README-BUSINESS-RULES.md` (nguồn sự thật ràng buộc của các mã `BR-*`). `README-MIGRATION.md` là việc khác: nó nói về dọn giao diện theo design system, và §11 của nó cấm đụng vào nghiệp vụ/API/phân quyền trong lúc dọn.
