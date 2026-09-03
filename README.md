# SalonSys — Hệ thống quản lý tiệm Nail

Tài liệu này mô tả **đúng hiện trạng source code** của repo. Mọi mục đều dẫn tới file/dòng cụ thể để kiểm chứng. Phần nào chưa suy ra được từ code sẽ được đánh dấu `NEED_CONFIRMATION`.

---

## 1. Tổng quan project

**SalonSys** là console quản trị SaaS đa tenant (multi-tenant) cho chuỗi tiệm Nail / salon làm đẹp. Đây là một **ứng dụng lấy frontend làm trọng tâm, kèm một backend tối thiểu đã tồn tại** (*frontend-centric application with a minimal existing backend*), khởi nguồn từ một bản export của Google AI Studio (xem `metadata.json`).

Cần phân biệt rõ **ba lớp** đang cùng tồn tại — chúng không giống nhau và không nên gộp khi nói về trạng thái dự án:

| Lớp | Nội dung | Nơi chạy |
|---|---|---|
| **Frontend nghiệp vụ** | Toàn bộ 3 cổng, ~76.000 dòng TS/TSX | Trình duyệt |
| **Mock data + `localStorage`** | Hầu hết dữ liệu nghiệp vụ: tenant, gói, hóa đơn, lịch hẹn, khách hàng, kho, thu chi… | Trình duyệt |
| **Backend nghiệp vụ** | Xác thực, tiệm, chi nhánh, dịch vụ, nhân viên, khách hàng, lịch hẹn, hóa đơn và thu tiền, nhật ký — **ASP.NET Core + SQL Server 2022**, solution riêng | Máy chủ |

> **Backend đang được dựng theo lộ trình 20 ngày** ở [README-BACKEND-ROADMAP.md](README-BACKEND-ROADMAP.md) — không nằm trong repo này mà ở một solution ASP.NET Core riêng. Bản Cloudflare Worker + D1 mà các mục §10 và §11 mô tả là **điểm xuất phát đã bị thay**; giữ lại vì phần phân tích hiện trạng frontend quanh nó vẫn đúng.

Ứng dụng có **3 cổng (portal) theo vai trò** trong cùng một bundle:

| Cổng | Người dùng | Điểm vào |
|---|---|---|
| Superadmin | Nhà cung cấp nền tảng SalonSys | `src/App.tsx` (render trực tiếp) |
| Tenant Admin | Chủ / quản lý chuỗi salon | `src/components/NailTenantAdminPortal.tsx` |
| Receptionist | Lễ tân tại một chi nhánh | `src/components/ReceptionistPortal.tsx` |

Vai trò được quyết định bởi `session.account.role` trả về từ API xác thực, tại [src/App.tsx:250](src/App.tsx#L250).

**Trạng thái dữ liệu:** đang chuyển dần sang API thật. Đã nối: đăng nhập và chọn tiệm, quản lý tiệm, chi nhánh, dịch vụ, nhân viên, khách hàng. Các màn còn lại vẫn chạy **mock data + `localStorage`** và mang dải nhãn "Dữ liệu mẫu — chưa nối máy chủ". Xem [README-BACKEND-ROADMAP.md](README-BACKEND-ROADMAP.md) §9 để biết màn nào ở mức nào.

Ngôn ngữ giao diện: **tiếng Việt** là gốc, có lớp dịch sang tiếng Anh (`src/i18n/`), chưa dịch đủ (chuỗi thiếu sẽ rơi về tiếng Việt và cảnh báo trong dev — [src/i18n/translate.ts:43](src/i18n/translate.ts#L43)).

---

## 2. Mục tiêu của hệ thống

Suy ra từ các màn hình và model dữ liệu đang tồn tại trong code:

**Ở tầng nền tảng (Superadmin)** — vận hành một SaaS bán theo gói đăng ký:
- Quản lý vòng đời tenant: tạo, cấu hình, tạm ngưng, xóa ([src/App.tsx:669](src/App.tsx#L669) trở đi).
- Quản lý catalog gói dịch vụ: giá theo tháng/năm, quyền tính năng (`capabilities`), hạn mức (`limits`), versioning giá, lịch ngừng bán gói kèm chuyển tenant tự động ([src/App.tsx:1197](src/App.tsx#L1197) trở đi).
- Quản lý hóa đơn đăng ký: phát hành, đối soát, thu tiền, hoàn tiền, theo dõi nợ ([src/types.ts](src/types.ts) — `Invoice`).
- Duyệt yêu cầu nâng cấp gói từ Tenant Admin ([src/App.tsx:1549](src/App.tsx#L1549)).
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
| TypeScript | `~5.8.2` | `noEmit`, `strict` **không** bật (xem `tsconfig.json`) |
| Vite | `^6.2.3` | Bundler + dev server |
| Tailwind CSS | `^4.1.14` | Qua plugin `@tailwindcss/vite`, **không** có `tailwind.config.js` |
| lucide-react | `^0.546.0` | Toàn bộ icon |
| recharts | `^3.10.1` | Biểu đồ trong các màn hình báo cáo |
| @vitejs/plugin-react | `^5.0.4` | |
| tsx | `^4.21.0` (dev) | Cho phép Vite nạp plugin auth viết bằng TS |
| autoprefixer, esbuild | (dev) | |

**Không có trong project:** react-router, thư viện state management (Redux/Zustand/Jotai), thư viện form, thư viện data-fetching (React Query/SWR), ORM đang hoạt động, test runner, ESLint.

Design system nằm trong **`src/index.css` (~5.600 dòng)** dùng khối `@theme static` của Tailwind v4 — token typography, spacing, radius, shadow, z-index, motion, và một `--accent` cho từng cổng.

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

**Lưu ý về lockfile:** repo hiện có `bun.lock` nhưng file **rỗng (0 byte)** và **chưa được commit** (đang ở trạng thái untracked). **Không có `package-lock.json`.** Nghĩa là hiện tại **project không có lockfile hợp lệ nào** — mỗi lần cài lại có thể ra cây phụ thuộc khác nhau. Nên chọn một trình quản lý gói và commit lockfile của nó.

---

## 5. Cách chạy project local

```bash
npm run dev
```

- Mở `http://localhost:3000` (Vite bind `0.0.0.0`, `allowedHosts: true` — xem `vite.config.ts`).
- Dev server đồng thời phục vụ **API auth giả lập** qua plugin `scripts/vite-local-auth.ts` (chi tiết §11).

### Tài khoản đăng nhập khi chạy local

Hard-code trong [scripts/vite-local-auth.ts:19](scripts/vite-local-auth.ts#L19):

| Vai trò | Email / username | Mật khẩu |
|---|---|---|
| Superadmin | `superadmin@salonsys.vn` / `superadmin` | `Super@2026` |
| Tenant Admin | `tenantadmin@lumierehair.vn` / `nguyenvanboss` | `Lumiere@2026` |
| Receptionist | `receptionist@nailestudio.vn` / `receptionist` | `Reception@2026` |

> Đây là tài khoản demo dùng cho phát triển, không phải bí mật production.

### Cửa đăng nhập nhanh (tắt mặc định)

Nếu đặt `SALONSYS_DEV_LOGIN=1`, dev server mở thêm `GET /api/auth/dev-login?role=SUPERADMIN|TENANT_ADMIN|RECEPTIONIST` để cấp phiên **không cần mật khẩu** ([scripts/vite-local-auth.ts:229](scripts/vite-local-auth.ts#L229)). Plugin khai `apply: 'serve'` nên không tồn tại trong bản build.

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
| `dev` | `vite --port=3000 --host=0.0.0.0` | Dev server + API auth local |
| `build` | `vite build && node scripts/prepare-sites-build.mjs` | Build SPA, rồi copy `scripts/sites-worker.js` → `dist/server/index.js` và `.openai/hosting.json` → `dist/.openai/hosting.json` |
| `preview` | `vite preview` | Phục vụ bản build tĩnh (**không có API** — worker không chạy ở đây) |
| `lint` | `tsc --noEmit` | **Bước kiểm tra duy nhất** của project. Hiện đang **pass** (exit 0) |
| `clean` | `rm -rf dist server.js` | Lệnh Unix; trên Windows cần Git Bash |

**Không có test runner** (không Jest, không Vitest, không script `test`). Cách xác minh thay đổi: chạy `npm run lint` và chạy thử app.

---

## 7. Cấu trúc thư mục chính

```
.
├── index.html                    # Entry SPA chính
├── ui-preview.html               # Entry harness xem component (chỉ dev)
├── vite.config.ts                # Vite + plugin auth local + alias @ → gốc repo
├── tsconfig.json                 # target ES2022, alias "@/*": ["./*"], noEmit
├── metadata.json                 # Metadata bản export AI Studio
├── .openai/hosting.json          # Cấu hình binding D1 khi deploy
│
├── src/
│   ├── main.tsx                  # createRoot + LanguageProvider + ToastProvider
│   ├── App.tsx                   # ~2.100 dòng — state tree + business logic toàn hệ thống
│   ├── types.ts                  # Model dữ liệu tầng nền tảng (Tenant, Invoice, Package…)
│   ├── data.ts                   # Mock seed cấp hệ thống + helper localStorage
│   ├── index.css                 # ~5.600 dòng — toàn bộ design token & class
│   │
│   ├── auth/demoAccounts.ts      # PortalRole + danh sách account demo phía client
│   ├── mockData/supportTickets.ts# Seed ticket hỗ trợ
│   ├── hooks/useGlobalModalGuard.ts
│   ├── i18n/                     # LanguageProvider, translate, bảng dịch EN
│   │
│   ├── components/
│   │   ├── ui/                   # Thư viện dùng chung: Button, Field, Switch,
│   │   │                         # StatusBadge, DataTable, PageHeader, Modal,
│   │   │                         # Pagination, Toast
│   │   ├── (Superadmin)          # Overview, TenantManagement, TenantAdminManagement,
│   │   │                         # SubscriptionPackages, BillingAndInvoices,
│   │   │                         # SystemReports, SystemSettings,
│   │   │                         # SuperAdminAnnouncements, SecurityAndLogs,
│   │   │                         # HelpAndSupport, DataBackup, AccountPreferences
│   │   ├── (Tenant Admin)        # NailTenantAdminPortal + TenantAdmin*.tsx
│   │   ├── (Receptionist)        # ReceptionistPortal + Receptionist*.tsx
│   │   └── nailAdminData.ts      # Cấu hình + dữ liệu demo cho các trang Tenant Admin
│   │
│   └── utils/                    # Lớp logic thuần & truy cập dữ liệu (xem §11)
│
├── scripts/
│   ├── vite-local-auth.ts        # API auth giả lập cho `npm run dev`
│   ├── sites-worker.js           # Cloudflare Worker + D1 cho production
│   └── prepare-sites-build.mjs   # Hậu xử lý sau `vite build`
│
├── db/schema.ts                  # SQL schema dạng chuỗi (tài liệu, không chạy)
└── drizzle/*.sql                 # Migration SQL (tài liệu, không chạy)
```

### Ba file cần biết trước tiên

1. **`src/App.tsx`** — nguồn sự thật duy nhất cho gần như toàn bộ state cấp hệ thống: `tenants`, `packages`, `alerts`, `invoices`, `tenantAdmins`, `upgradeRequests`, `tickets`, `announcements`. Kèm rất nhiều `useEffect` vừa đồng bộ xuống `localStorage`, vừa **chạy nghiệp vụ đáng lẽ thuộc backend** (tự hết hạn subscription, tự sinh hóa đơn, migrate schema bản ghi cũ, ghi audit log).
2. **`src/types.ts`** — model dữ liệu tầng nền tảng.
3. **`src/index.css`** — mọi token thiết kế.

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

- `TenantAdminRole = 'Owner' | 'Manager' | 'Staff'` ([src/types.ts:159](src/types.ts#L159)) — chỉ là trường hiển thị trên màn hình Tenant Admin, **không** ảnh hưởng quyền truy cập.
- `SystemLog.actorRole` có thêm `'SUPPORT'`, `AdminSession.role` có `'SUPERADMIN' | 'SUPPORT'` — vai trò SUPPORT xuất hiện trong dữ liệu nhật ký nhưng **không có** trong `PortalRole`, tức chưa đăng nhập được. `NEED_CONFIRMATION`: SUPPORT có phải một vai trò đăng nhập thật trong kế hoạch không?
- `StaffRole = 'RECEPTIONIST' | 'TECHNICIAN'` trong `TenantAdminStaff.tsx` là **dữ liệu nhân sự của tiệm**, không phải tài khoản đăng nhập.

### Quan hệ tài khoản ↔ tenant: **một Tenant Admin quản lý được nhiều tenant** (đã chốt)

Đây là quyết định nghiệp vụ đã được chốt. Frontend hiện đang đi đúng hướng này, backend thì chưa:

| Nơi | Hiện trạng |
|---|---|
| `TenantAdminAccount.tenantIds: string[]` + `tenantCount` — [src/types.ts:170](src/types.ts#L170) | Hỗ trợ nhiều tenant ✅ |
| Màn hình gán tiệm "Tiệm đang quản lí" — [TenantAdminManagement.tsx:410](src/components/TenantAdminManagement.tsx#L410) | Cho phép gán nhiều tenant cho một admin ✅ |
| `app_users.tenant_id TEXT` — [db/schema.ts:41](db/schema.ts#L41) | **Chỉ chứa được một tenant** ❌ |

**Hệ quả đang là lỗi thật trong code:** khi đồng bộ tài khoản đăng nhập, [App.tsx:660](src/App.tsx#L660) chỉ gửi `admin.tenantIds[0]` lên backend — các tenant còn lại bị rơi mất. Và vì `sites-worker.js` lọc dữ liệu bằng `tenant_id = session.tenantId`, một admin được gán 3 tiệm khi đăng nhập **chỉ thấy được tiệm đầu tiên**.

**Hướng xử lý đã chốt** (chi tiết ở [README-MIGRATION.md](README-MIGRATION.md) §11):
- Backend cần **bảng nối** giữa tài khoản và tenant, thay cho cột `app_users.tenant_id` đơn lẻ.
- **Tiệm đang làm việc được lưu trong phiên đăng nhập** (`active_tenant_id` trong session), đổi tiệm bằng một lời gọi API đổi session — chứ không phải frontend đính kèm tenant vào từng request.
- Frontend cần thêm **bộ chuyển tiệm** cho tài khoản quản lý nhiều tenant (hiện chưa có).

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

Điều hướng: `activePage: NailPageId` trong `NailTenantAdminPortal.tsx`; nhóm menu tại [src/components/NailTenantAdminPortal.tsx:155](src/components/NailTenantAdminPortal.tsx#L155).

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

Điều hướng: `page: ReceptionPage`, `navItems` tại [src/components/ReceptionistPortal.tsx:855](src/components/ReceptionistPortal.tsx#L855).

| Trang | Component |
|---|---|
| Bàn lễ tân (`desk`) | trong `ReceptionistPortal.tsx` |
| Lịch hẹn | trong `ReceptionistPortal.tsx` |
| Khách hàng | trong `ReceptionistPortal.tsx` |
| Sản phẩm quầy | `ReceptionistProducts.tsx` |
| Ghế & phòng | `ReceptionistStations.tsx` |
| Kỹ thuật viên | `ReceptionistTechnicians.tsx` |
| Thanh toán & POS | trong `ReceptionistPortal.tsx` |

---

## 10. Cách project đang quản lý mock data

Có **ba cơ chế khác nhau** cùng tồn tại. Cần nắm rõ cả ba.

### Cơ chế 1 — Seed cấp hệ thống, "gieo một lần" (Superadmin)

Seed nằm trong `src/data.ts`: `INITIAL_TENANTS`, `INITIAL_PACKAGES`, `INITIAL_ALERTS`, `INITIAL_INVOICES`, `INITIAL_BACKUPS`, `INITIAL_BACKUP_POLICY`, `INITIAL_RESTORE_JOBS`. Thêm `INITIAL_ANNOUNCEMENTS` trong `src/utils/systemAnnouncements.ts` và `SUPPORT_MOCK_TICKETS` trong `src/mockData/supportTickets.ts`.

Đọc/ghi qua hai helper tại [src/data.ts:377](src/data.ts#L377) — chúng tự thêm tiền tố `salonsys_`:

```ts
loadLocalStorageData<T>(key, defaultValue)  // đọc localStorage[`salonsys_${key}`]
saveLocalStorageData<T>(key, value)         // ghi localStorage[`salonsys_${key}`]
```

Với `tenants` và `alerts`, có thêm **cờ gieo một lần** để mock chỉ được trộn vào đúng một lần rồi thôi (nếu người dùng xóa hết tenant, mock không mọc lại):
- `loadTenantsWithOneTimeMocks()` — [src/App.tsx:111](src/App.tsx#L111), cờ `salonsys_tenants_mock_seed_v1`
- `loadAlertsWithOneTimeMocks()` — [src/App.tsx:87](src/App.tsx#L87), cờ `salonsys_alerts_mock_seed_v2`

Ngoài ra `App.tsx` còn lọc bỏ một danh sách **ID mock cũ** đã bị khai tử (`LEGACY_MOCK_SUPPORT_TICKET_IDS` tại [src/App.tsx:157](src/App.tsx#L157); tương tự trong `utils/auditLogs.ts` và `SecurityAndLogs.tsx`).

### Cơ chế 2 — Seed theo tenant, có công tắc demo/live (Tenant Admin & Receptionist)

Mỗi màn hình Tenant Admin tự chứa mảng seed của mình rồi trộn với dữ liệu đã lưu qua `getTenantAdminInitialData()` ([src/utils/mockDataReset.ts:33](src/utils/mockDataReset.ts#L33)) — hàm này giữ lại bản ghi người dùng đã tạo và **chỉ thêm những seed chưa có ID trùng**.

Khóa `localStorage` gắn theo **tên tenant**, dạng `<module>-v<N>:<tenantName>` (danh sách đầy đủ ở §10.4).

Có một **cờ toàn cục demo/live**: `setTenantAdminDataMode('demo' | 'live')` trong cùng file, được bật/tắt từ `NailTenantAdminPortal` ([src/components/NailTenantAdminPortal.tsx:1441](src/components/NailTenantAdminPortal.tsx#L1441)). Nút "nạp dữ liệu demo" / "tắt chế độ kiểm thử" nằm trong portal; trạng thái lưu ở `tenant-admin-demo-mode:<tenantName>`.

Khi Superadmin xóa một tenant, `resetTenantMockStorage(tenantName)` xóa toàn bộ khóa của tenant đó ([src/App.tsx:911](src/App.tsx#L911)).

### Cơ chế 3 — Mock cấu hình trang (không phải bản ghi)

`src/components/nailAdminData.ts` (730 dòng) chứa `nailModuleConfigs` — cấu hình *và* dữ liệu hiển thị mẫu (`stats`, `rows`, `insights`, `checklist`, `formFields`) cho từng trang Tenant Admin. Đây vừa là **cấu trúc UI** vừa là **dữ liệu demo**, hai thứ trộn vào nhau.

### 10.4 Toàn bộ khóa `localStorage` đang dùng

**Cấp hệ thống (tiền tố `salonsys_`):**

| Khóa | Nội dung | Nơi ghi |
|---|---|---|
| `salonsys_tenants` | Danh sách tenant | `App.tsx` |
| `salonsys_tenants_mock_seed_v1` | Cờ đã gieo mock tenant | `App.tsx` |
| `salonsys_packages` | Gói dịch vụ | `App.tsx` |
| `salonsys_alerts` | Cảnh báo hệ thống | `App.tsx` |
| `salonsys_alerts_mock_seed_v2` | Cờ đã gieo mock cảnh báo | `App.tsx` |
| `salonsys_invoices`, `salonsys_invoices_v2` | Hóa đơn (ghi trùng vào cả hai) | `App.tsx` |
| `salonsys_tenant_admins` | Tài khoản Tenant Admin | `App.tsx` |
| `salonsys_support_tickets` | Ticket hỗ trợ | `App.tsx` |
| `salonsys_package_upgrade_requests` | Yêu cầu nâng cấp gói (cache của API) | `utils/packageUpgradeRequests.ts` |
| `salonsys_audit_logs` | Nhật ký kiểm toán (giới hạn 2.000 bản ghi) | `utils/auditLogs.ts` |
| `salonsys_system_settings` | Cấu hình hệ thống | `utils/systemSettings.ts` |
| `salonsys_admin_sessions` | Phiên quản trị | `SecurityAndLogs.tsx` |
| `salonsys_backups_v2`, `salonsys_backup_policy_v2`, `salonsys_restore_jobs_v2` | Sao lưu | `DataBackup.tsx` |
| `salonsys_theme` | light / dark | `App.tsx` |
| `salonsys_interface_language` | vi / en | `i18n/LanguageProvider.tsx` |

**Bản tin (không có tiền tố `salonsys_`):** `system_announcements_v1`, và bốn khóa gắn tenantId: `dismissed_announcement_banners_v1_<tenantId>`, `read_announcements_by_tenant_v1_<tenantId>`, `archived_announcements_by_tenant_v1_<tenantId>`, `deleted_announcements_by_tenant_v1_<tenantId>`.

**Theo tenant (`<khóa>:<tenantName>`):**

`tenant-admin-appointments-v2`, `tenant-admin-payments-v1`, `tenant-admin-customers-v1`, `tenant-admin-stations-v2`, `tenant-admin-station-areas-v1`, `tenant-admin-staff-v2`, `tenant-admin-services-v2`, `tenant-admin-services-v1`, `tenant-admin-inventory-v1`, `tenant-admin-loyalty-v1`, `tenant-admin-tiers-v1`, `tenant-admin-customer-care-v1`, `tenant-admin-expenses-v1`, `tenant-admin-nail-designs-v1`, `tenant-admin-nail-colors-v1`, `tenant-admin-demo-mode`, `mobile-app-bookings-v2`, `receptionist-technicians-v1`, `receptionist-products-v1`, `receptionist-product-reports-v1`, `receptionist-stations-v1`.

Có khóa nhiều tầng: `tenant-admin-finance-v1:<tenant>:transactions|cashbooks|debts|budgets`, `tenant-admin-online-booking-v1:<tenant>:channels|services`, `tenant-admin-sanitation-v1:<tenant>:checklists|batches|incidents|certificates`, `receptionist-invoice-drafts-v1:<tenant>:<branchCode>`.

Khóa gắn theo tài khoản: `receptionist-shift-v1:<email>`.

**Giao diện:** `sidebar_collapsed`, `tenant-admin-sidebar-collapsed`, `receptionist_sidebar_collapsed`, `dismissed_tasks_<tenantId>`.

**Bất nhất đã tồn tại (cần dọn khi migrate):**
- `TenantAdminPayments.tsx:401` dùng `` `${tenantName}_nail_colors` `` trong khi mọi nơi khác dùng `tenant-admin-nail-colors-v1:<tenant>`.
- Tồn tại song song cả `tenant-admin-services-v1` và `-v2`.
- Danh sách reset trong `mockDataReset.ts` **không đầy đủ**: thiếu `tenant-admin-tiers-v1`, `tenant-admin-station-areas-v1`, `tenant-admin-expenses-v1`, `mobile-app-bookings-v2`, `receptionist-invoice-drafts-v1`, `receptionist-shift-v1` — nên "reset dữ liệu tenant" hiện chưa xóa hết.

---

## 11. Service / API abstraction hiện có

### 11.1 Hai backend đã tồn tại, nhưng chỉ phủ auth + một endpoint nghiệp vụ

| Môi trường | File | Cơ chế |
|---|---|---|
| Dev (`npm run dev`) | `scripts/vite-local-auth.ts` | Vite plugin (`apply: 'serve'`), tài khoản hard-code, session lưu trong RAM (mất khi restart) |
| Production | `scripts/sites-worker.js` | Cloudflare Worker + D1 (SQLite): hash mật khẩu SHA-256 + salt, session cookie HttpOnly/SameSite=Strict, khóa tài khoản sau 5 lần sai trong 15 phút, phân quyền theo role |

Endpoint có thật:

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

Chỉ có **hai module** thực sự gọi `fetch`:

**`src/utils/authApi.ts`** — `fetchAuthenticatedAccount()`, `loginAccount()`, `logoutAccount()`, `persistManagedAuthAccount()`, `deleteManagedAuthAccount()`.

**`src/utils/packageUpgradeRequests.ts`** — `fetchPackageUpgradeRequests()`, `persistPackageUpgradeRequest()`, `persistPackageUpgradeReview()`, `deletePackageUpgradeRequest()`, cộng hai hàm cache `loadPackageUpgradeRequests()` / `savePackageUpgradeRequests()`.

**Phần đáng học từ khuôn mẫu này:** gom `fetch` vào một module riêng, khai kiểu trả về rõ ràng, giữ component sạch khỏi chi tiết `fetch`, dùng `credentials: 'same-origin'`.

**Phần KHÔNG được chép lại:** cách hai module này xử lý lỗi. Chúng nuốt lỗi — `catch` rồi trả `null` / `false` / mảng rỗng, khiến tầng gọi không phân biệt được "không có dữ liệu" với "gọi thất bại". Nặng hơn, `persistPackageUpgradeRequest` và `persistPackageUpgradeReview` `return true` **ngay trong nhánh `catch`**, tức **báo thành công kể cả khi server lỗi**.

Cần tách bạch hai việc khác nhau:

| Đúng | Sai |
|---|---|
| Không để lỗi kỹ thuật thô (stack trace, `TypeError: Failed to fetch`) hiện lên UI | Giấu luôn việc thao tác đã thất bại và coi như thành công |

**Hướng dẫn cho service mới:** trả về một contract nói rõ kết quả — về mặt ý tưởng là `{ data, error }` hoặc một Result type tương đương — sao cho tầng gọi phân biệt được ít nhất các trường hợp sau, vì mỗi trường hợp cần một cách hiển thị khác nhau:

| Trường hợp | UI nên làm gì |
|---|---|
| Thành công | Cập nhật dữ liệu |
| Lỗi validation | Gắn thông báo vào đúng ô nhập sai |
| Chưa đăng nhập (401) | Đưa về màn hình đăng nhập |
| Không đủ quyền (403) | Báo không có quyền, **không** đưa về đăng nhập |
| Lỗi mạng | Báo mất kết nối, cho thử lại |
| Lỗi máy chủ (5xx) | Báo lỗi hệ thống, cho thử lại |

Chi tiết và checklist ở [README-MIGRATION.md](README-MIGRATION.md) §12.2 và Giai đoạn 7.

### 11.3 Các module `utils/` khác (logic thuần, không gọi mạng)

| File | Vai trò |
|---|---|
| `subscriptions.ts` | Catalog quyền (`SUBSCRIPTION_CAPABILITY_CATALOG`), bậc gói chuẩn (`STANDARD_PLAN_CAPABILITY_TIERS`), tính giá, chuẩn hóa gói |
| `tenantAdminEntitlements.ts` | Ánh xạ trang → quyền gói; tính hạn mức chi nhánh/nhân sự |
| `tenantValidation.ts` | Validate biểu mẫu tenant, điều kiện xóa tenant |
| `branches.ts` | Validate & chuẩn hóa chi nhánh, sinh mã chi nhánh |
| `money.ts` | Định dạng & quy đổi tiền. **Tỷ giá USD→VND cứng = 25.000** |
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
- **tsx** — cần thiết để `vite.config.ts` import được `scripts/vite-local-auth.ts`.

---

## 14. Trạng thái hiện tại của project

### 14.1 Đã hoàn thiện

- **Toàn bộ 3 cổng giao diện dựng xong** với ~76.000 dòng TypeScript/TSX.
- **Xác thực thật, hai môi trường** — session cookie HttpOnly, hash mật khẩu, khóa tài khoản sau nhiều lần sai, phân quyền theo role ở server.
- **Một endpoint nghiệp vụ hoàn chỉnh đầu-cuối** — yêu cầu nâng cấp gói (`package_upgrade_requests`) có DB, RBAC, và giao diện cả hai phía.
- **Design system** — token đầy đủ trong `index.css`, thư viện component dùng chung `src/components/ui/` (Button, Field, Switch, StatusBadge, DataTable, PageHeader, Modal, Pagination, Toast) kèm harness xem trước `/ui-preview.html`.
- **Nghiệp vụ subscription mô phỏng khá sâu** — khóa giá theo phiên bản gói, đổi gói hiệu lực ngay hoặc từ chu kỳ sau, tự chuyển tenant khi gói bị ngừng bán, tự sinh hóa đơn.
- **Lớp i18n** vi/en có fallback an toàn.
- **Dark mode** hoạt động.
- `npm run lint` (`tsc --noEmit`) **đang pass**.

### 14.2 Chưa triển khai

**Backend nghiệp vụ — phần lớn nhất.** Backend tối thiểu hiện có chỉ phủ xác thực, phiên, một phần quản lý tài khoản và yêu cầu nâng cấp gói. **Ngoài bốn thứ đó, không có API nào cho nghiệp vụ.** Tenant, gói, hóa đơn, lịch hẹn, khách hàng, nhân sự, kho, thu chi, báo cáo… đều sống trong `localStorage` của trình duyệt. Cụ thể:
- Không có persistence server-side → xóa cache trình duyệt là mất sạch dữ liệu.
- Không đa người dùng → hai máy khác nhau thấy hai bộ dữ liệu khác nhau.
- Không có cách ly tenant thật → `localStorage` phân tách bằng **tên tenant trong chuỗi khóa**, không phải bằng ràng buộc bảo mật.
- Nghiệp vụ nằm ở client → mọi luật (hết hạn, sinh hóa đơn, hạn mức gói) đều có thể bị bỏ qua bằng DevTools.

**Chưa có ở backend tối thiểu hiện tại** (dù đã có phần auth):
- Bảng nối tài khoản ↔ nhiều tenant, và `active_tenant_id` trong phiên — xem §8.
- Đổi mật khẩu, quên mật khẩu, kích hoạt tài khoản, xác minh email/SĐT.
- Áp `security.sessionTimeout` / `maxLoginAttempts` / `passwordMinLength` từ cấu hình hệ thống (worker đang dùng hằng số riêng).
- Metadata phiên (`ip`, `user_agent`, `last_active`) để màn hình "Bảo mật & nhật ký" có dữ liệu thật.

**Chưa có, ở cả frontend lẫn backend:**
- Gửi email / SMS / Zalo (chỉ có màn hình cấu hình SMTP, không có hành vi gửi).
- Sao lưu & khôi phục thật (`DataBackup.tsx` mô phỏng hoàn toàn).
- MFA / thu hồi phiên từ xa (`SecurityAndLogs.tsx` chỉ thao tác trên dữ liệu cục bộ).
- Upload tệp thật (logo, chứng từ thanh toán, ảnh mẫu nail).
- Cổng thanh toán thật (MoMo/VNPay/Stripe chỉ là nhãn dữ liệu).
- Hóa đơn điện tử / thuế theo quy định Việt Nam.
- Deep-link / URL routing.
- Test tự động.

**Chưa xong ở frontend:**
- Bản dịch tiếng Anh còn thiếu nhiều (`src/i18n/translations.ts` chỉ 303 dòng cho toàn bộ app).
- Một số màn hình còn dùng dữ liệu demo cứng thay vì dữ liệu tenant thật (xem cờ demo/live §10.2).

### 14.3 Vấn đề cấu trúc đã biết

- **Component quá lớn, không tách UI khỏi dữ liệu:** `ReceptionistPortal.tsx` 5.493 dòng, `TenantAdminOnlineBooking.tsx` 3.920, `TenantAdminInventory.tsx` 3.328, `TenantAdminAppointments.tsx` 3.212, `TenantAdminFinanceCompact.tsx` 2.837, `TenantAdminStaff.tsx` 2.686, `TenantAdminPayments.tsx` 2.595, `TenantDetailModal.tsx` 2.494.
- **Code chết đã xác nhận** (không file nào import):
  - `src/components/TenantAdminPortal.tsx` (393 dòng) — `App.tsx` dùng `NailTenantAdminPortal`.
  - `src/components/TenantAdminCustomerCare.tsx` (1.859 dòng).
  - `src/components/TenantAdminFinance.tsx` (4 dòng, shim re-export `TenantAdminFinanceCompact`).
- **Không có lockfile hợp lệ** — `bun.lock` rỗng và chưa commit, không có `package-lock.json`.
- **`settings-naile-studio.csv` ở thư mục gốc** là tệp do chính app xuất ra (hàm export CSV của Tenant Admin, [src/components/NailTenantAdminPortal.tsx:1430](src/components/NailTenantAdminPortal.tsx#L1430)), bị commit nhầm.
- **`skills/` ở thư mục gốc là một git repo riêng biệt**, không thuộc ứng dụng.
- Model dữ liệu rải rác: `types.ts` giữ model tầng nền tảng, còn model tầng salon (`StaffMember`, `TenantStation`, `TenantAppointment`, `InventoryItem`, `SalonService`…) nằm rải trong các component và `utils/`.

---

## 15. Lưu ý quan trọng cho developer tiếp tục phát triển

1. **Nghiệp vụ nằm trong `App.tsx`, không nằm trong màn hình.** Muốn sửa luật tenant/gói/hóa đơn, tìm trong các `useEffect` của `App.tsx` trước, đừng tìm trong component đang render màn hình đó.

2. **Không có router.** `activeTab` là state. Nút Back của trình duyệt và bookmark không hoạt động như SPA thông thường. Nếu thêm routing, đây là thay đổi kiến trúc lớn chạm vào cả ba portal.

3. **Alias `@/*` trỏ tới gốc repo**, không phải `src/` (xem `tsconfig.json` và `vite.config.ts`).

4. **Sửa design token trong `src/index.css`**, không tạo `tailwind.config.js`. Kiểm tra `src/components/ui/` trước khi viết primitive mới. `StatusBadge`'s `STATUS_MAP` là **nơi duy nhất** ánh xạ status → nhãn/tone/icon; đừng tạo bảng ánh xạ thứ hai trong màn hình.

5. **Khi thêm domain gọi API thật**, chép **cách tổ chức** của `src/utils/authApi.ts` (gom `fetch` vào một module, kiểu trả về rõ ràng, component sạch khỏi `fetch`) nhưng **đừng chép cách xử lý lỗi** của nó. Service mới phải trả về kết quả nói rõ thành công hay thất bại và thất bại vì lý do gì — xem §11.2.

6. **Đổi `tenant.name` sẽ làm mất dữ liệu.** Khóa `localStorage` của Tenant Admin nhúng **tên tenant**, không phải ID. Đổi tên tenant = mọi màn hình đọc sang khóa mới và thấy trống. Đây là lý do phải chuyển sang khóa theo `tenantId` khi migrate (xem `README-MIGRATION.md`).

7. **Chạy `npm run lint` trước khi commit.** Đây là cổng kiểm tra duy nhất và hiện đang xanh — đừng để nó đỏ.

8. **Hai backend phải sửa song song.** Thêm endpoint thì phải cập nhật cả `scripts/vite-local-auth.ts` (dev) và `scripts/sites-worker.js` (production), cộng `db/schema.ts` + `drizzle/*.sql` cho khớp. Không có công cụ nào ép ba chỗ này đồng bộ.

9. **Một tài khoản Tenant Admin quản lý được nhiều tiệm** (đã chốt) — nhưng backend hiện chỉ lưu được một. Đừng dựa vào `session.tenantId` như nguồn sự thật khi viết code mới; xem §8.

10. **Dữ liệu trong `localStorage` hiện tại là mock/demo, bỏ được** (đã chốt). Không cần giữ gìn nó khi migrate — cứ xóa và seed lại từ fixture.

11. **Trước khi bắt tay nối backend, đọc `README-MIGRATION.md`** — nó liệt kê chi tiết mock data đang ở đâu, cái gì cần API thật, và thứ tự migrate đề xuất.
