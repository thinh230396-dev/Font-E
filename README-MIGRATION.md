# Migration: Frontend + Mock Data → Frontend + Backend API + Database

Tài liệu chuẩn bị cho việc thay `localStorage` bằng backend thật. Mọi mục dưới đây **đọc ra từ source code hiện tại**, không phải kế hoạch tưởng tượng. Chỗ nào chưa suy ra được từ code sẽ đánh dấu `NEED_CONFIRMATION`.

Đọc `README.md` trước để nắm kiến trúc tổng thể.

**Phạm vi tài liệu này:** phân tích và lập kế hoạch. Không sửa logic frontend, không viết backend, không đặt ra business rule mới. Danh sách bảng ở §8 là **ứng viên**, không phải schema chính thức.

**Điểm xuất phát:** project không phải frontend thuần — đã có sẵn một **backend tối thiểu** (xác thực, phiên, một phần quản lý tài khoản, yêu cầu nâng cấp gói) trên Cloudflare Worker + D1. Tài liệu này nói về việc xây **backend nghiệp vụ** còn thiếu, và về việc sửa những chỗ backend tối thiểu hiện tại đang làm chưa đúng.

### Bốn quyết định đã chốt

Bốn điểm dưới đây đã được chốt và đã được phản ánh vào tài liệu. Chi tiết ở [Phụ lục A](#phụ-lục-a--quyết-định-đã-chốt).

| # | Quyết định |
|---|---|
| 1 | Một tài khoản Tenant Admin quản lý được **nhiều tenant** → cần bảng nối `user_tenants` |
| 2 | Tiệm đang làm việc **lưu trong phiên** (`active_tenant_id`), không đính kèm theo từng request |
| 3 | `localStorage` hiện tại **toàn bộ là mock/demo, bỏ được** → không có migration production |
| 4 | **Mở rộng `app_sessions`** với cột tối thiểu, **không** tạo bảng `admin_sessions` |

---

## Mục lục

1. [Mock data đang nằm ở đâu](#1-mock-data-đang-nằm-ở-đâu)
2. [Component / page đang dùng mock data](#2-component--page-đang-dùng-mock-data)
3. [Entity / data model đang xuất hiện trong frontend](#3-entity--data-model-đang-xuất-hiện-trong-frontend)
4. [Service / data-access layer hiện có](#4-service--data-access-layer-hiện-có)
5. [Những nơi đang thao tác CRUD giả lập](#5-những-nơi-đang-thao-tác-crud-giả-lập)
6. [State đang đóng vai trò dữ liệu backend](#6-state-đang-đóng-vai-trò-dữ-liệu-backend)
7. [Chức năng cần API thật](#7-chức-năng-cần-api-thật)
8. [Dữ liệu cần lưu database](#8-dữ-liệu-cần-lưu-database)
9. [Chức năng cần Authentication](#9-chức-năng-cần-authentication)
10. [Chức năng cần Authorization / RBAC](#10-chức-năng-cần-authorization--rbac)
11. [Những phần liên quan Multi-tenant](#11-những-phần-liên-quan-multi-tenant)
12. [Frontend cần thay đổi ở đâu khi nối API](#12-frontend-cần-thay-đổi-ở-đâu-khi-nối-api)
13. [Mock data: xóa được và nên giữ](#13-mock-data-xóa-được-và-nên-giữ)
14. [Rủi ro khi migration](#14-rủi-ro-khi-migration)
15. [Thứ tự migrate từng module](#15-thứ-tự-migrate-từng-module)
16. [Checklist migration theo 10 giai đoạn](#16-checklist-migration-theo-10-giai-đoạn)
- [Phụ lục A — Quyết định đã chốt](#phụ-lục-a--quyết-định-đã-chốt)
- [Phụ lục B — `NEED_CONFIRMATION` còn lại](#phụ-lục-b--danh-sách-need_confirmation-còn-lại)

---

## 1. Mock data đang nằm ở đâu

### 1.1 File seed tập trung

| File | Nội dung | Dòng |
|---|---|---|
| `src/data.ts` | `INITIAL_TENANTS`, `INITIAL_PACKAGES`, `INITIAL_ALERTS`, `INITIAL_INVOICES`, `INITIAL_BACKUPS`, `INITIAL_BACKUP_POLICY`, `INITIAL_RESTORE_JOBS` + 2 helper localStorage | 394 |
| `src/mockData/supportTickets.ts` | `SUPPORT_MOCK_TICKETS` | 243 |
| `src/utils/systemAnnouncements.ts` | `INITIAL_ANNOUNCEMENTS` | 552 |
| `src/utils/tenantCustomers.ts` | `defaultCustomerSeed` (khách hàng của tenant) | 371 |
| `src/auth/demoAccounts.ts` | `DEMO_ACCOUNTS` (3 tài khoản demo, mirror phía client) | 39 |
| `src/components/nailAdminData.ts` | `nailModuleConfigs` — cấu hình **trộn lẫn** dữ liệu demo cho 16 trang Tenant Admin | 730 |

### 1.2 Seed nằm rải rác **bên trong component**

Đây là phần khó gỡ nhất: mỗi màn hình lớn tự chứa mảng seed của riêng mình.

| Component | Seed | Dòng file |
|---|---|---|
| `ReceptionistPortal.tsx` | Lịch hẹn, kỹ thuật viên, mẫu nail, màu sơn, phụ kiện, ghi chú dị ứng, bậc độ khó | 5.493 |
| `TenantAdminOnlineBooking.tsx` | Booking từ app/web, kênh đặt lịch, lịch rảnh KTV | 3.920 |
| `TenantAdminInventory.tsx` | Vật tư kho | 3.328 |
| `TenantAdminAppointments.tsx` | `generateAppointmentSeed()` | 3.212 |
| `TenantAdminFinanceCompact.tsx` | `INITIAL_TRANSACTIONS` (export) | 2.837 |
| `TenantAdminStaff.tsx` | Nhân sự, ca làm, preset quyền | 2.686 |
| `TenantAdminPayments.tsx` | Bản ghi POS, chi phí | 2.595 |
| `TenantDetailModal.tsx` | Dữ liệu hiển thị chi tiết tenant | 2.494 |
| `TenantAdminNailGallery.tsx` | Mẫu nail, màu sơn | 2.040 |
| `TenantAdminHelpAndSupport.tsx` | Ticket phía tenant | 1.910 |
| `TenantAdminCustomerCare.tsx` | Chiến dịch chăm sóc — **file này là code chết, không ai import** | 1.859 |
| `TenantAdminManagement.tsx` | — | 1.786 |
| `DataBackup.tsx` | Dùng seed từ `data.ts` | 1.809 |
| `ReceptionistStations.tsx` | Ghế & phòng | 1.698 |
| `ReceptionistTechnicians.tsx` | Kỹ thuật viên | 1.664 |
| `TenantAdminReports.tsx` | `scheduleSeed`, template báo cáo | 1.600 |
| `ReceptionistProducts.tsx` | Sản phẩm quầy, phiếu báo nhập | 1.595 |
| `TenantAdminServices.tsx` | Dịch vụ & giá | 1.593 |
| `TenantAdminSettings.tsx` | Cấu hình tiệm | 1.501 |
| `TenantAdminStations.tsx` | Ghế, khu vực | 1.163 |
| `TenantAdminSanitation.tsx` | Checklist, mẻ tiệt trùng, sự cố, chứng chỉ | 991 |
| `TenantAdminLoyalty.tsx` | Chương trình loyalty, bậc thành viên | 661 |
| `SuperAdminAnnouncements.tsx` | — | 1.312 |
| `HelpAndSupport.tsx` | Dùng `SUPPORT_MOCK_TICKETS` | 1.311 |

### 1.3 Nơi mock data thực sự "sống": `localStorage`

Seed chỉ chạy một lần. Sau đó **`localStorage` là cơ sở dữ liệu thật của ứng dụng**. Danh sách khóa đầy đủ ở `README.md` §10.4.

Ba lớp helper:

```ts
// src/data.ts:377 — cấp hệ thống, tự thêm tiền tố "salonsys_"
loadLocalStorageData<T>(key, defaultValue)
saveLocalStorageData<T>(key, value)

// src/utils/mockDataReset.ts:33 — cấp tenant, trộn seed với dữ liệu đã lưu
getTenantAdminInitialData<T>(stored, mockSeed)

// src/components/ReceptionistPortal.tsx:865 — helper cục bộ của portal lễ tân
readStorage<T>(key, fallback)
```

### 1.4 Công tắc demo / live

`src/utils/mockDataReset.ts` giữ một biến module-level:

```ts
let tenantAdminDataMode: 'demo' | 'live' = 'demo';
setTenantAdminDataMode(mode)
isTenantAdminLiveDataMode()
```

Bật/tắt từ `NailTenantAdminPortal` ([dòng 1441, 1453](src/components/NailTenantAdminPortal.tsx#L1441)), lưu trạng thái ở `tenant-admin-demo-mode:<tenantName>`. Ở chế độ `live`, các trang render **rỗng** thay vì render seed.

> Đây là đòn bẩy quan trọng khi migrate: cơ chế "trạng thái rỗng" đã tồn tại sẵn, không phải xây mới.

---

## 2. Component / page đang dùng mock data

### 2.1 Superadmin — dùng mock **hoàn toàn**

| Màn hình | Nguồn dữ liệu | Còn dùng mock sau migrate? |
|---|---|---|
| `Overview.tsx` | props từ `App.tsx` (tenants/invoices/alerts/tickets) | Không |
| `TenantManagement.tsx` | props `tenants`, `packages`, `tenantAdmins` | Không |
| `TenantDetailModal.tsx` | prop `tenant` + seed nội bộ | Không |
| `TenantAdminManagement.tsx` | props `tenants`, `invitedAdmins` | Không |
| `SubscriptionPackages.tsx` | props `packages`, `invoices`, `tenants` | Không |
| `BillingAndInvoices.tsx` | props `invoices`, `tenants`, `upgradeRequests` | Không |
| `SystemReports.tsx` | props (tổng hợp tại chỗ) | Không |
| `SuperAdminAnnouncements.tsx` | `announcements` từ `App.tsx` | Không |
| `SystemSettings.tsx` | `utils/systemSettings.ts` → localStorage | Không |
| `SecurityAndLogs.tsx` | `salonsys_audit_logs` + `salonsys_admin_sessions` | Không |
| `HelpAndSupport.tsx` | `SUPPORT_MOCK_TICKETS` + localStorage | Không |
| `DataBackup.tsx` | `INITIAL_BACKUPS/POLICY/RESTORE_JOBS` | **Toàn bộ màn hình là mô phỏng** — xem §7.4 |
| `PackageUpgradeRequests.tsx` | props từ API thật | **Đã nối API** |

### 2.2 Tenant Admin — mock theo tenant

Mọi trang trong bảng ở `README.md` §9.2 đều đọc/ghi `localStorage` theo khóa `<module>-v<N>:<tenantName>`, **trừ**:
- `TenantAdminSubscription.tsx` — nhận `tenant`, `subscriptionPackage`, `invoices`, `upgradeRequests` từ `App.tsx`; hành động gửi yêu cầu nâng cấp **đi qua API thật**.
- `TenantAdminAnnouncements.tsx` — nhận `announcements` từ `App.tsx` (vẫn là localStorage).
- Trang **Chi nhánh** — render từ `tenant.branches` (state của `App.tsx`), không có khóa localStorage riêng.

### 2.3 Receptionist — mock theo tenant + theo chi nhánh + theo tài khoản

`ReceptionistPortal.tsx` **đọc chung khóa với Tenant Admin** — đó là cách hai cổng "đồng bộ" dữ liệu hiện nay:

```
tenant-admin-appointments-v2:<tenant>    ← chia sẻ với TenantAdminAppointments
tenant-admin-payments-v1:<tenant>        ← chia sẻ với TenantAdminPayments
tenant-admin-services-v2:<tenant>        ← chia sẻ với TenantAdminServices
tenant-admin-nail-designs-v1:<tenant>    ← chia sẻ với TenantAdminNailGallery
tenant-admin-nail-colors-v1:<tenant>     ← chia sẻ với TenantAdminNailGallery
tenant-admin-loyalty-v1:<tenant>         ← chia sẻ với TenantAdminLoyalty
```

Riêng của lễ tân: `receptionist-technicians-v1:<tenant>`, `receptionist-products-v1:<tenant>`, `receptionist-product-reports-v1:<tenant>`, `receptionist-stations-v1:<tenant>`, `receptionist-invoice-drafts-v1:<tenant>:<branchCode>`, `receptionist-shift-v1:<email>`.

> Hệ quả khi migrate: **không thể migrate riêng cổng Receptionist**. Mỗi domain phải migrate đồng thời cho cả hai cổng, nếu không một bên đọc API còn một bên đọc localStorage sẽ lệch dữ liệu.

---

## 3. Entity / data model đang xuất hiện trong frontend

### 3.1 Tầng nền tảng — `src/types.ts` (551 dòng)

| Interface | Ghi chú cho việc thiết kế DB |
|---|---|
| `Tenant` | **~70 trường**, trong đó có mảng lồng `branches`, `customActivities`, `customInvoices`. Trùng lặp nặng: `packageName` / `plan` / `subscriptionPlan` cùng lưu tên gói |
| `Branch` | Chi nhánh, lồng trong `Tenant.branches` — cần tách thành bảng riêng |
| `TenantAdminAccount` | Có `tenantIds: string[]` → quan hệ **nhiều-nhiều** với tenant. **Đã chốt: giữ hướng nhiều tenant**, cần bảng nối. Xem §11.2 |
| `SubscriptionPackage` | Kèm `capabilities[]`, `limits`, `priceHistory[]`, `retirementRequest`, `version` |
| `SubscriptionCapability`, `SubscriptionLimits`, `SubscriptionPriceHistoryEntry`, `SubscriptionRetirementRequest` | Các con của `SubscriptionPackage` |
| `Invoice` | **~50 trường** + mảng lồng `lineItems`, `paymentAttempts`, `activities`. Có cả `billingPeriod` (legacy) lẫn `servicePeriod` |
| `InvoiceLineItem`, `InvoicePaymentAttempt`, `InvoiceActivity` | Con của `Invoice` |
| `PackageUpgradeRequest` | **Đã có bảng thật** trong D1 |
| `SystemAlert` | Cảnh báo hệ thống |
| `SystemAnnouncement` | Bản tin. Có 4 mảng `*ByTenantIds` → thực chất là **4 bảng quan hệ** (đã đọc / đã ẩn banner / đã lưu trữ / đã xóa) |
| `SystemLog` | Nhật ký kiểm toán, có `changes[]` và `metadata` |
| `AdminSession` | Phiên quản trị. **Không phải domain riêng** — chỉ là `app_sessions` cộng metadata thiết bị để hiển thị. Đã chốt: mở rộng `app_sessions`, xem §8.5 |
| `BackupSnapshot`, `BackupComponent`, `BackupPolicy`, `RestoreJob` | Sao lưu — hiện là mô phỏng |
| `Ticket`, `TicketMessage`, `TicketHistoryEntry` | Hỗ trợ |

### 3.2 Tầng salon — nằm rải trong component và `utils/`

| Model | Định nghĩa tại | Đã export? |
|---|---|---|
| `TenantCustomer`, `ServiceVisit` | `utils/tenantCustomers.ts` | Có |
| `SalonService` | `components/TenantAdminServices.tsx:52` | Có |
| `InventoryItem`, `InventoryCategory` | `components/TenantAdminInventory.tsx:61` | Có |
| `PolishColor`, `ColorStatus` | `utils/inventorySync.ts:6` | Có |
| `NailDesign`, `DesignStatus` | `components/TenantAdminNailGallery.tsx:52` | Có |
| `FinanceTransaction`, `AuditTrailItem` | `components/TenantAdminFinanceCompact.tsx:69` | Có |
| `ExpenseRecord`, `ExpenseCategory` | `components/TenantAdminPayments.tsx:38` | Có |
| `LoyaltyProgram` | `utils/promotionUtils.ts:8` | Có |
| `MemberTier` | `components/TenantAdminLoyalty.tsx:30` | Có |
| `MobileAppBooking`, `DepositHistoryLog`, `TechnicianAvailability` | `components/TenantAdminOnlineBooking.tsx` | Có |
| `TenantAppointment` | `components/TenantAdminAppointments.tsx:50` | **Không** |
| `StaffMember`, `ScheduleDay`, `RolePermissionPreset` | `components/TenantAdminStaff.tsx:57` | **Không** |
| `TenantStation`, `TenantArea`, `StationAppointment` | `components/TenantAdminStations.tsx:24` | **Không** |
| `ChecklistItem`, `SterilizationBatch`, `SafetyIncident`, `Certificate` | `components/TenantAdminSanitation.tsx:47` | **Không** |
| `CareCampaign` | `components/TenantAdminCustomerCare.tsx:39` | **Không** (và file là code chết) |
| `ReportTemplate`, `ReportSchedule` | `components/TenantAdminReports.tsx:39` | **Không** |
| `Station`, `LinkedAppointment` | `components/ReceptionistStations.tsx:33` | **Không** |
| `Technician`, `Appointment`, `ProfileMeta` | `components/ReceptionistTechnicians.tsx:53` | **Không** |
| `ReceptionProduct`, `StockMovement`, `RestockReport`, `RestockReportItem` | `components/ReceptionistProducts.tsx:42` | **Không** |
| `SplitPaymentEntry`, `NailArtTemplate`, `PolishColorOption`, `AttachedAccessoryOption`, `AllergyOrSpecialNoteOption`, `ArtDifficultyPreset` | `components/ReceptionistPortal.tsx` | Có |

### 3.3 Model **trùng lặp** giữa các file — phải hợp nhất trước khi thiết kế DB

Đây là danh sách phải xử lý ở Giai đoạn 1:

| Khái niệm | Các bản định nghĩa khác nhau |
|---|---|
| Lịch hẹn | `TenantAppointment` (TenantAdminAppointments), `Appointment` (ReceptionistTechnicians), `StationAppointment` (TenantAdminStations), `LinkedAppointment` (ReceptionistStations), lịch hẹn nội bộ trong `ReceptionistPortal` |
| Ghế / vị trí | `TenantStation` (TenantAdminStations) vs `Station` (ReceptionistStations) — enum `StationArea` cũng khác nhau: `string` tự do vs `'MANICURE'\|'PEDICURE'\|'VIP'` |
| Kỹ thuật viên / nhân sự | `StaffMember` (TenantAdminStaff) vs `Technician` (ReceptionistTechnicians) |
| Sản phẩm / vật tư | `InventoryItem` (TenantAdminInventory) vs `ReceptionProduct` (ReceptionistProducts) |
| Màu sơn | `PolishColor` (`utils/inventorySync.ts`) vs `PolishColorOption` (ReceptionistPortal) |
| Phương thức thanh toán | `PaymentMethod = 'CASH'\|'BANK'\|'CARD'\|'EWALLET'` (Finance) vs `'CASH'\|'BANK'\|'CARD'\|'MOMO'\|'ZALOPAY'` (ReceptionistPortal) vs `paymentGateway = 'MOMO'\|'VNPAY'\|'STRIPE'\|'BANK_TRANSFER'\|'MANUAL'` (Invoice) |
| Trạng thái lịch hẹn | `AppointmentStatus` khai lại **3 lần** ở 3 file, thứ tự giá trị khác nhau |
| `BranchCode` | Khai lại ở **7 file** khác nhau, đều cứng thành `'Q1' \| 'Q3'` |

### 3.4 Ràng buộc cứng đang tồn tại trong model

- `BranchCode` cứng `'Q1' | 'Q3'` — hệ thống **chỉ hỗ trợ đúng 2 chi nhánh** ở tầng type, dù `Branch` là mảng động. Đây là mâu thuẫn phải giải quyết trước khi thiết kế DB.
- Tỷ giá `USD_TO_VND_RATE = 25000` hard-code tại [src/utils/money.ts:5](src/utils/money.ts#L5).
- `CurrencyCode` chỉ `'USD' | 'VND'`.
- `tenantName` mặc định `'Nailé Studio'` xuất hiện rải rác làm fallback.

---

## 4. Service / data-access layer hiện có

### 4.1 Đã gọi API thật (khuôn mẫu cần nhân rộng)

| Module | Hàm | Endpoint |
|---|---|---|
| `src/utils/authApi.ts` | `fetchAuthenticatedAccount` | `GET /api/auth/session` |
| | `loginAccount` | `POST /api/auth/login` |
| | `logoutAccount` | `POST /api/auth/logout` |
| | `persistManagedAuthAccount` | `PUT /api/auth/accounts` |
| | `deleteManagedAuthAccount` | `DELETE /api/auth/accounts/:id` |
| `src/utils/packageUpgradeRequests.ts` | `fetchPackageUpgradeRequests` | `GET /api/package-upgrade-requests` |
| | `persistPackageUpgradeRequest` | `POST /api/package-upgrade-requests` |
| | `persistPackageUpgradeReview` | `PATCH /api/package-upgrade-requests/:id` |
| | `deletePackageUpgradeRequest` | `DELETE /api/package-upgrade-requests/:id` |

Đặc điểm của khuôn mẫu này:
- `credentials: 'same-origin'` (cookie phiên).
- Không ném lỗi ra ngoài — trả `null` / `false` / mảng rỗng.
- Component gọi hàm không cần biết gì về `fetch`.

### 4.2 Lớp truy cập localStorage (sẽ bị thay thế)

| Module | Vai trò |
|---|---|
| `src/data.ts` | `loadLocalStorageData` / `saveLocalStorageData` — cấp hệ thống |
| `src/utils/mockDataReset.ts` | Trộn seed, cờ demo/live, reset khóa |
| `src/utils/systemSettings.ts` | Load/save/validate cấu hình + phát `CustomEvent` |
| `src/utils/auditLogs.ts` | Ghi/đọc nhật ký kiểm toán |
| `src/utils/systemAnnouncements.ts` | Bản tin + trạng thái theo tenant |
| `src/utils/tenantCustomers.ts` | `getTenantCustomers()`, `getTenantCustomerStorageKey()` |
| `src/utils/inventorySync.ts` | `loadInventoryItems()`, `loadPolishColors()` |
| `readStorage()` trong `ReceptionistPortal.tsx` | Helper cục bộ |

### 4.3 Logic thuần — **giữ nguyên**, không phải data layer

`subscriptions.ts`, `tenantAdminEntitlements.ts`, `tenantValidation.ts`, `branches.ts`, `money.ts`, `invoicePayments.ts`, `promotionUtils.ts`, `alerts.ts`.

> Các file này là **tài sản quý** khi migrate: chúng đã tách khỏi UI và tách khỏi storage. Chúng chính là bản đặc tả business rule sẵn có để backend dùng lại (nếu backend chạy Node/TypeScript thì dùng chung được luôn).

---

## 5. Những nơi đang thao tác CRUD giả lập

### 5.1 CRUD tầng nền tảng — tập trung ở `App.tsx`

| Handler | Dòng | Việc nó làm ngoài cập nhật state |
|---|---|---|
| `handleAddTenant` | 669 | Sinh ID, khóa giá gói, **tự tạo hóa đơn đầu tiên**, sync tài khoản auth, ghi audit log |
| `handleUpdateTenant` | 735 | Đồng bộ 2 chiều tenant ↔ tenant-admin, đồng bộ trạng thái sang các tenant cùng admin, chuẩn hóa `customInvoices` thành `Invoice`, ghi audit |
| `handleDeleteTenant` | 885 | Xóa **theo tầng**: invoices, upgradeRequests, alerts, tickets, tenantAdmins, khóa localStorage của tenant, tài khoản auth |
| `handleUpdateInvoiceStatus` | 985 | Khi `PAID`: kích hoạt gói, gia hạn subscription, đổi trạng thái tenant, **tự duyệt** upgrade request liên quan |
| `handleUpdateInvoice` / `handleCreateInvoice` | 1151 / 1180 | Chống trùng mã, ghi audit |
| `handleAddPackage` / `handleUpdatePackage` | 1284 / 1197 | Chống trùng tên, **tăng version**, ghi `priceHistory`, chặn archive khi còn tenant, đổi tên gói thì cập nhật lan sang tenant & invoice |
| `handleDeprecatePackage`, `handleSchedulePackageRetirement`, `handleCancelPackageRetirement`, `handleReactivatePackage`, `handleDeletePackage` | 1320–1420 | Vòng đời gói |
| `handleTenantAdminsChange` | 1422 | Diff added/updated/removed, sync tài khoản auth tương ứng, ghi audit |
| `handleRequestPackageUpgrade` | 1464 | Chặn trùng yêu cầu PENDING, tạo request, đặt `pendingSubscriptionChange`, tạo alert, **gọi API** |
| `handleReviewUpgradeRequest` | 1549 | **Gọi API trước**, chỉ đổi state khi API xác nhận; tạo hóa đơn nâng cấp |
| `handleCancelUpgradeRequest` | 1686 | Hủy yêu cầu, gỡ pending change |
| `handleSubmitInvoicePaymentProof` | 1712 | Ghi chứng từ vào invoice + tenant.customInvoices, tạo alert cho Superadmin |
| Nhóm `handle*Alert*` | 959–983 | CRUD cảnh báo |

### 5.2 CRUD tầng salon — trong từng component

Mẫu lặp lại ở mọi màn hình Tenant Admin / Receptionist:

```ts
const [items, setItems] = useState<T[]>(() =>
  getTenantAdminInitialData(JSON.parse(localStorage.getItem(storageKey) ?? 'null'), seed)
);
useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(items)); }, [items]);
// create/update/delete = setItems([...]) thuần trong bộ nhớ
```

Không có optimistic update, không có trạng thái loading, không có xử lý lỗi, không có phân trang phía server, không có tìm kiếm phía server. **Toàn bộ lọc / sắp xếp / phân trang đang chạy trên mảng trong RAM.**

### 5.3 Ba nơi tự động ghi dữ liệu (đáng lẽ là cron job của backend)

| `useEffect` | Dòng | Việc |
|---|---|---|
| Áp dụng `pendingSubscriptionChange` khi tới hạn | [App.tsx:489](src/App.tsx#L489) | Đổi gói, gia hạn, ghi activity |
| Chuyển tenant khỏi gói bị ngừng bán khi hết hạn | [App.tsx:531](src/App.tsx#L531) | Đổi gói **và tự sinh hóa đơn** `INV-AUTO-*` |
| Tự archive gói khi không còn tenant | [App.tsx:622](src/App.tsx#L622) | Đổi status → `ARCHIVED` |

### 5.4 Ba `useEffect` migrate schema tại chỗ (di sản, sẽ bỏ)

| Vị trí | Việc |
|---|---|
| [App.tsx:417](src/App.tsx#L417) | Chuyển tenant từ liên kết theo **tên gói** sang **id gói**, điền giá đã khóa |
| [App.tsx:453](src/App.tsx#L453) | Điền `packageId`/`packageVersion` cho hóa đơn cũ |
| [App.tsx:475](src/App.tsx#L475) | Đếm lại `activeTenants` của từng gói |

Cộng thêm `normalizeInvoiceDueDate()`, `normalizeInvoicePaymentData()`, `normalizeTenantStatusSync()` — đều là logic vá dữ liệu cũ. **Sau migration, DB migration sẽ thay thế toàn bộ nhóm này.**

---

## 6. State đang đóng vai trò dữ liệu backend

### 6.1 Trong `App.tsx` — 8 state là "bảng dữ liệu"

```ts
const [tenants, setTenants]                 // → bảng tenants + branches
const [packages, setPackages]               // → bảng subscription_packages (+ capabilities, limits, price_history)
const [alerts, setAlerts]                   // → bảng system_alerts
const [invoices, setInvoices]               // → bảng invoices (+ line_items, payment_attempts, activities)
const [tenantAdmins, setTenantAdmins]       // → bảng tenant_admins + bảng nối user_tenants (§11.2)
const [upgradeRequests, setUpgradeRequests] // → ĐÃ CÓ bảng package_upgrade_requests
const [tickets, setTickets]                 // → bảng tickets (+ messages, history)
const [announcements, setAnnouncements]     // → bảng announcements (+ 4 bảng trạng thái theo tenant)
```

### 6.2 Ngoài `App.tsx`

| Nơi giữ | Đóng vai bảng |
|---|---|
| `SecurityAndLogs.tsx` | `audit_logs`, và **phần metadata của `app_sessions`** (không phải một bảng session thứ hai — xem §8.5) |
| `DataBackup.tsx` | `backups`, `backup_policy`, `restore_jobs` |
| `utils/systemSettings.ts` | `system_settings` (bản ghi đơn, có `version: 2`) |
| Mỗi component Tenant Admin / Receptionist | Một bảng tầng salon tương ứng |

### 6.3 State **không** phải dữ liệu backend (giữ ở client)

`themeMode`, `interfaceLanguage`, `sidebarOpen`/`isCollapsed`, `activeTab`/`activePage`, `searchQuery`, `confirmDialog`, `toast`, `selectedRow`, các bộ lọc màn hình, `demoMode`.

`NEED_CONFIRMATION`: theme và ngôn ngữ có cần đồng bộ theo tài khoản (lưu server) hay giữ theo thiết bị?

---

## 7. Chức năng cần API thật

### 7.1 Đã có API — chỉ cần mở rộng

- Xác thực (login / session / logout).
- Quản lý tài khoản đăng nhập (`PUT`/`DELETE /api/auth/accounts`).
- Yêu cầu nâng cấp gói.

### 7.2 Cần API mới — nghiệp vụ cốt lõi

| Nhóm | Tài nguyên |
|---|---|
| Tenant | `tenants`, `branches`, hoạt động tenant, tài khoản Tenant Admin & liên kết tenant |
| Subscription | `packages`, `capabilities`, `limits`, `price_history`, lịch ngừng bán, gán gói cho tenant |
| Billing | `invoices`, `line_items`, `payment_attempts`, `activities`, chứng từ thanh toán, đối soát, hoàn tiền |
| Salon | `appointments`, `stations`, `areas`, `customers`, `loyalty_programs`, `member_tiers`, `staff`, `shifts`, `services`, `inventory`, `nail_designs`, `polish_colors`, `finance_transactions`, `expenses`, `online_bookings`, `sanitation_*` |
| Hệ thống | `alerts`, `announcements` (+ trạng thái đọc/ẩn theo tenant), `tickets` (+ messages), `audit_logs`, quản lý phiên đăng nhập (mở rộng `app_sessions`, §8.5), `system_settings` |
| Báo cáo | Tổng hợp phía server (hiện đang tính trên mảng trong RAM) |

### 7.3 Cần API **và** tác vụ nền (cron / queue)

Ba `useEffect` ở §5.3 phải chuyển thành job phía server, vì hiện tại **chúng chỉ chạy khi có người mở trình duyệt**:
- Áp dụng thay đổi gói đã lên lịch.
- Chuyển tenant khỏi gói ngừng bán + sinh hóa đơn.
- Tự archive gói rỗng.

Cộng thêm những thứ `SystemSettings` đã có ô cấu hình nhưng chưa có hành vi: nhắc gia hạn (`renewalReminderDays`), cảnh báo quá hạn (`warnDays`), tự khóa tenant (`autoLock`, `lockDays`), dọn nhật ký theo `auditRetentionDays`.

### 7.4 Cần dịch vụ ngoài — hiện **hoàn toàn là mô phỏng**

| Chức năng | Hiện trạng |
|---|---|
| Email / SMTP | `SystemSettings` có đủ ô cấu hình. **Không có code gửi email nào** |
| SMS / Zalo OA | Chỉ là nhãn trong `promotionUtils` và `TenantAdminCustomerCare` (file chết) |
| Cổng thanh toán MoMo/VNPay/Stripe | Chỉ là giá trị enum `paymentGateway`. Không có tích hợp |
| Upload tệp | Logo tenant, chứng từ thanh toán, ảnh mẫu nail — hiện chỉ là chuỗi URL |
| Sao lưu & khôi phục | `DataBackup.tsx` mô phỏng đầy đủ checksum, KMS key, cross-region replication, tiến độ restore. **Không có gì thật đằng sau** |
| MFA | `security.requireMfaForSuperadmin` là toggle, không có luồng MFA |
| Thu hồi phiên | `SecurityAndLogs` xóa bản ghi localStorage, **không thu hồi phiên thật** |
| Xuất hóa đơn điện tử / thuế VN | Chưa có. Cần chốt sớm vì ảnh hưởng model `Invoice` |

---

## 8. Dữ liệu cần lưu database

### 8.1 Đã có bảng trong D1

`app_users`, `app_sessions`, `package_upgrade_requests` — xem `db/schema.ts` và `drizzle/*.sql`.

### 8.2 Bảng cần tạo — tầng nền tảng

> Đây là **danh sách bảng ứng viên**, suy ra từ dữ liệu frontend đang giữ — **không phải schema chính thức**. Tên bảng, tên cột và ranh giới giữa các bảng chỉ chốt được sau khi nghiệp vụ tương ứng được chốt ở Giai đoạn 2.

```
tenants                       branches
tenant_activities             tenant_admins
user_tenants (nối)            subscription_packages
package_capabilities          package_limits
package_price_history         package_retirements
invoices                      invoice_line_items
invoice_payment_attempts      invoice_activities
system_alerts                 announcements
announcement_tenant_states    tickets
ticket_messages               ticket_history
audit_logs                    system_settings
backups                       backup_components
backup_policies               restore_jobs
```

Hai bảng cần giải thích thêm:

- **`user_tenants`** — bảng nối giữa tài khoản đăng nhập và tenant, thay cho cột `app_users.tenant_id` hiện tại. Bắt buộc phải có vì đã chốt "một Tenant Admin quản lý nhiều tenant" (§11.2).
- **`announcement_tenant_states`** — gộp 4 mảng `readByTenantIds` / `dismissedBannerTenantIds` / `archivedByTenantIds` / `deletedByTenantIds` thành một bảng `(announcement_id, tenant_id, state)`.

**Không có bảng `admin_sessions`.** Xem §8.5.

### 8.3 Bảng cần tạo — tầng salon (mọi bảng đều có `tenant_id`)

```
customers                customer_visits
appointments             appointment_services
stations                 station_areas
staff                    staff_schedules
services                 service_categories
inventory_items          inventory_movements
polish_colors            nail_designs
loyalty_programs         member_tiers
finance_transactions     expenses
online_bookings          booking_deposit_logs
sanitation_checklists    sterilization_batches
safety_incidents         safety_certificates
report_schedules         pos_invoices / pos_invoice_lines
reception_products       restock_reports
reception_shifts
```

### 8.4 Quyết định thiết kế cần chốt trước khi viết schema

| Vấn đề | Ghi chú |
|---|---|
| **Khóa theo `tenantId`, không phải `tenantName`** | Bắt buộc. Hiện `localStorage` khóa theo tên → đổi tên tenant là mất dữ liệu |
| **`branchCode` phải động** | Bỏ ràng buộc `'Q1' \| 'Q3'` cứng trong 7 file |
| Tiền tệ | Lưu **số nguyên đơn vị nhỏ nhất** hay số thực? VND không có phần lẻ, USD có. Tỷ giá `25000` phải chuyển thành bảng/API |
| Thuế & hóa đơn điện tử VN | Ảnh hưởng trực tiếp `Invoice`. Nên chốt sớm để không phải sửa model về sau |
| Ngày giờ | Frontend đang trộn ISO string (`2026-07-01`), ISO datetime, và chuỗi hiển thị `dd/MM/yyyy HH:mm`. DB nên dùng một chuẩn duy nhất |
| Xóa mềm | `handleDeleteTenant` hiện xóa cứng theo tầng. Với dữ liệu tài chính, nên cân nhắc soft delete |
| `Invoice.billingPeriod` vs `servicePeriod` | Trường legacy — `getPeriodEndIsoDate()` đang **parse chuỗi tiếng Việt** `"Đến dd/MM/yyyy"` để lấy ngày. Phải bỏ, thay bằng cột ngày thật |
| Lưu `capabilities`/`limits` | Bảng quan hệ hay cột JSON? |
| Version gói & giá đã khóa | Đã có `subscriptionPackageVersion` + `subscriptionPrice` trên tenant. DB phải giữ được ngữ nghĩa "giá khóa tại thời điểm ký" |

### 8.5 Session: mở rộng `app_sessions`, **không** tạo bảng session thứ hai (đã chốt)

**Bằng chứng từ source — hai khái niệm này không tách biệt:**

| | `app_sessions` (backend, đã có) | `AdminSession` (frontend, [types.ts:394](src/types.ts#L394)) |
|---|---|---|
| Cột | `id`, `user_id`, `created_at`, `expires_at` | `user`, `role`, `device`, `browser`, `os`, `ip`, `location`, `createdAt`, `lastActive`, `expiresAt`, `isCurrent`, `trusted`, `suspicious`, `mfaVerified`, `status` |
| Phạm vi | Phiên đăng nhập thật, mọi vai trò | Chỉ dùng ở `SecurityAndLogs.tsx`; `role` chỉ có `SUPERADMIN \| SUPPORT` |
| Ai tạo dữ liệu | Worker tạo khi login | **Không nơi nào cả.** `loadSessions()` trả mảng rỗng nếu localStorage trống ([SecurityAndLogs.tsx:133](src/components/SecurityAndLogs.tsx#L133)); chỉ có hành động thu hồi, không có hành động sinh → **màn hình này hiện luôn rỗng** |

Kết luận: `AdminSession` không phải một domain riêng, nó là `app_sessions` **cộng thêm metadata thiết bị để hiển thị**.

**Quyết định đã chốt — chỉ thêm cột tối thiểu vào `app_sessions`:**

| Thêm | Lý do |
|---|---|
| `ip` | Đủ để người dùng nhận ra phiên lạ |
| `user_agent` | Frontend tự tách ra `device` / `browser` / `os` khi hiển thị |
| `last_active` | Phân biệt phiên đang dùng với phiên bỏ quên |
| `revoked_at` | Phục vụ nút thu hồi phiên đã có sẵn ở UI |
| `active_tenant_id` | Do quyết định "một admin nhiều tenant" — xem §11.2 |

**Cố ý KHÔNG đưa vào:**

| Bỏ | Lý do |
|---|---|
| `location` | Cần dịch vụ tra vị trí từ IP (GeoIP), thường mất phí |
| `trusted`, `suspicious` | Đòi hỏi định nghĩa nghiệp vụ mới ("thế nào là phiên đáng ngờ?") — chưa có |
| `mfaVerified` | Chỉ có nghĩa sau khi MFA được triển khai (Giai đoạn 4) |

→ Frontend phải **bỏ bớt các cột này khỏi `AdminSession`** và khỏi màn hình "Bảo mật & nhật ký", thay vì hiển thị dữ liệu không có thật.

---

## 9. Chức năng cần Authentication

### 9.1 Đã có

Login / session / logout với cookie HttpOnly, `SameSite=Strict`, `Secure` khi HTTPS. Session 8 giờ, hoặc 30 ngày nếu "ghi nhớ". Hash SHA-256 + salt. Khóa tài khoản 15 phút sau 5 lần sai.

### 9.2 Cần bổ sung

| Chức năng | Ghi chú |
|---|---|
| **Mọi endpoint nghiệp vụ mới** | Hiện chỉ 2 nhóm endpoint có kiểm tra phiên |
| Đổi mật khẩu / quên mật khẩu | Không tồn tại ở bất kỳ đâu |
| Kích hoạt tài khoản qua email | `Tenant.adminSendActivationEmail`, `TenantAdminAccount.sendActivationEmail` là toggle không có hành vi |
| Xác minh email / số điện thoại | `adminEmailVerified`, `adminPhoneVerified` là cờ dữ liệu, không có luồng xác minh |
| MFA cho Superadmin | `security.requireMfaForSuperadmin` chỉ là toggle |
| Áp dụng `security.sessionTimeout` | Cấu hình có, server dùng hằng số riêng (`SESSION_HOURS = 8`) |
| Áp dụng `security.maxLoginAttempts`, `passwordMinLength` | Cấu hình có, server dùng hằng số riêng (`MAX_LOGIN_ATTEMPTS = 5`) |
| Thu hồi phiên từ xa | Bảng `app_sessions` đã có, chỉ thiếu endpoint xóa theo `user_id` và cột `revoked_at` (§8.5) |
| **Chọn tenant sau khi đăng nhập** | Do quyết định "một admin nhiều tenant": cần đặt `active_tenant_id` cho phiên, và một endpoint đổi tenant đang active (§11.2) |
| **Metadata phiên** | Thêm `ip`, `user_agent`, `last_active` để màn hình "Bảo mật & nhật ký" có dữ liệu thật thay vì luôn rỗng (§8.5) |

### 9.3 Vấn đề bảo mật cần xử lý khi migrate

- **Mật khẩu tạm đang nằm trong dữ liệu client.** `Tenant.adminTempPassword` và `TenantAdminAccount.tempPassword` được lưu **plaintext trong `localStorage`** và gửi lên `PUT /api/auth/accounts`. `App.tsx` có `AUDIT_SENSITIVE_FIELDS` để loại chúng khỏi audit log, nhưng chúng vẫn nằm trong state và storage.
- **Hash SHA-256 một vòng, salt cố định theo user id** (`salonsys:<id>` với tài khoản seed) — không phải hàm dẫn xuất khóa chậm. Nên chuyển sang PBKDF2/scrypt/Argon2 khi làm auth thật.
- `recordAuditLog()` hard-code `user: 'superadmin@salonsys.vn'`, `ip: '127.0.0.1'` ([utils/auditLogs.ts:50](src/utils/auditLogs.ts#L50)) — audit log hiện **không phản ánh người thao tác thật**. Phải chuyển sang ghi ở server.

---

## 10. Chức năng cần Authorization / RBAC

### 10.1 RBAC đã có ở server

Trong `scripts/sites-worker.js`, qua `requireSession(request, db, roles)`:

| Endpoint | Vai trò |
|---|---|
| `PUT/DELETE /api/auth/accounts*` | `SUPERADMIN` |
| `GET /api/package-upgrade-requests` | `SUPERADMIN` (tất cả) / `TENANT_ADMIN` (chỉ tenant mình) |
| `POST /api/package-upgrade-requests` | `TENANT_ADMIN`, và **kiểm tra `body.tenantId === session.tenantId`** |
| `PATCH/DELETE /api/package-upgrade-requests/:id` | `SUPERADMIN` |

Đây là khuôn mẫu đúng về **cách kiểm tra vai trò**, cần áp cho mọi endpoint mới.

**Nhưng cách kiểm tra tenant thì không dùng lại được.** Hai chỗ đang so sánh trực tiếp với `session.tenantId` — `GET` lọc theo `tenant_id = session.tenantId`, `POST` yêu cầu `body.tenantId === session.tenantId`. Do quyết định "một admin nhiều tenant" (§11.2), cả hai phải đổi thành: lấy `active_tenant_id` từ phiên **và** xác thực quyền qua bảng nối `user_tenants` trước khi lọc.

### 10.2 Phân quyền hiện **chỉ có ở client**, phải chuyển xuống server

| Cơ chế | File | Rủi ro hiện tại |
|---|---|---|
| Khóa trang theo `capabilities` của gói | `utils/tenantAdminEntitlements.ts` | Người dùng bypass được bằng DevTools |
| Hạn mức chi nhánh / nhân sự | `getTenantUsagePercent`, `validateBranchDraft` | Chặn ở UI, không chặn ở dữ liệu |
| Hạn mức trong `SubscriptionLimits` (`appointmentsPerMonth`, `storageGb`, `messagesPerMonth`, `adminUsers`, `apiCallsPerMonth`, `customDomains`, `dataRetentionDays`) | `types.ts`, `subscriptions.ts` | **Chỉ hiển thị, chưa đo lường thật ở bất cứ đâu** |
| Chọn portal theo `role` | `App.tsx:1988, 2018` | Client tự quyết định render portal nào |

### 10.3 Chưa có RBAC — cần thiết kế

- **`TenantAdminRole = 'Owner' | 'Manager' | 'Staff'`** hiện **không ảnh hưởng gì**. `NEED_CONFIRMATION`: ba vai trò này khác nhau ở quyền nào?
- **Vai trò `SUPPORT`** xuất hiện trong `SystemLog.actorRole` và `AdminSession.role` nhưng không có trong `PortalRole`. `NEED_CONFIRMATION`: có phải vai trò đăng nhập thật không?
- **Phân quyền theo chi nhánh.** Receptionist có `branchCode` trong session, và các màn hình có bộ lọc chi nhánh — nhưng chưa có luật "lễ tân chi nhánh Q3 không được xem dữ liệu Q1". `NEED_CONFIRMATION`.
- **`RolePermissionPreset` trong `TenantAdminStaff.tsx`** định nghĩa preset quyền cho nhân sự. `NEED_CONFIRMATION`: đây là quyền đăng nhập thật hay chỉ là mô tả công việc?

---

## 11. Những phần liên quan Multi-tenant

### 11.1 Cách phân tách tenant hiện nay

| Tầng | Cơ chế | Có an toàn không |
|---|---|---|
| Auth | `app_users.tenant_id` trong D1 | Có, **nhưng chỉ đúng một tenant** — xem §11.2 |
| Upgrade request | `WHERE tenant_id = session.tenantId` | Có, với cùng giới hạn trên |
| Dữ liệu Superadmin | Một mảng chung, lọc bằng `invoice.tenantId === tenant.id` trong RAM | Không — chỉ là lọc hiển thị |
| Dữ liệu Tenant Admin / Receptionist | **Tên tenant nhúng trong chuỗi khóa `localStorage`** | Không — chỉ là quy ước đặt tên |

### 11.2 Quan hệ tài khoản ↔ tenant: **nhiều tenant** (đã chốt)

**Mâu thuẫn hiện tại giữa frontend và backend:**

| Nơi | Hiện trạng |
|---|---|
| `TenantAdminAccount.tenantIds: string[]` + `tenantCount` — [types.ts:170](src/types.ts#L170) | Nhiều tenant ✅ |
| UI "Tiệm đang quản lí" — [TenantAdminManagement.tsx:410](src/components/TenantAdminManagement.tsx#L410) | Gán được nhiều tenant cho một admin ✅ |
| `app_users.tenant_id TEXT` — [db/schema.ts:41](db/schema.ts#L41) | Một tenant ❌ |
| Cầu nối — [App.tsx:660](src/App.tsx#L660) | Chỉ gửi `admin.tenantIds[0]`, **các tenant còn lại rơi mất** ❌ |

Hệ quả đang chạy trong code: một admin được gán 3 tiệm, khi đăng nhập **chỉ thấy tiệm đầu tiên**, vì `sites-worker.js` lọc bằng `tenant_id` lấy thẳng từ session.

**Quyết định đã chốt — giữ hướng nhiều tenant.** Kéo theo:

| Tầng | Phải làm gì |
|---|---|
| **Database** | Bỏ vai trò "tenant duy nhất" của `app_users.tenant_id`; thêm bảng nối `user_tenants (user_id, tenant_id, …)` |
| **Session** | Thêm `active_tenant_id` vào `app_sessions` — **tiệm đang làm việc được lưu trong phiên**, không phải frontend đính kèm theo từng request. Đổi tiệm = một lời gọi API đổi session |
| **Authorization** | Không còn dùng được `WHERE tenant_id = session.tenant_id`. Mọi truy vấn phải: (1) lấy `active_tenant_id` từ phiên, (2) **kiểm tra user thật sự có quyền với tenant đó** qua `user_tenants`, rồi mới (3) lọc dữ liệu. Bỏ bước 2 là mở đường cho truy cập chéo tenant |
| **Authentication** | Đăng nhập xong phải quyết định tenant mặc định khi user có nhiều tenant — `NEED_CONFIRMATION`: lấy tenant gần nhất, tenant đầu danh sách, hay bắt người dùng chọn? |
| **Frontend** | Cần **bộ chuyển tiệm** (chưa có). `NailTenantAdminPortal` nhận đúng một prop `tenant`, nên đổi tiệm sẽ phải nạp lại toàn bộ dữ liệu portal |
| **Đánh đổi đã biết** | Vì tiệm đang chọn nằm trong session (dùng chung cho cả trình duyệt), **mở 2 tab xem 2 tiệm cùng lúc sẽ đá nhau**. Chấp nhận được với người dùng thật; nếu sau này cần thì chuyển sang gửi tenant theo từng request |

### 11.3 Điểm phải xử lý

1. **Chuyển từ `tenantName` sang `tenantId` ở mọi nơi.** Đây là thay đổi lan rộng nhất: ~21 khóa localStorage và mọi component đọc chúng. Rủi ro kèm theo: đổi tên tenant hiện làm mất toàn bộ dữ liệu của tenant đó.

2. **Ràng buộc `tenant_id` phải ở tầng dữ liệu**, không phải tầng lọc. Mọi bảng tầng salon cần `tenant_id NOT NULL` + index, và mọi truy vấn phải bị ép lọc theo tenant đang active của phiên **sau khi** đã xác thực quyền qua `user_tenants`.

3. **Phạm vi chi nhánh (`branchCode`)** — cần quyết định là chiều dữ liệu (`branch_id` trên bảng) hay chiều phân quyền (giới hạn truy cập), hoặc cả hai.

4. **Dữ liệu chia sẻ giữa Tenant Admin và Receptionist** (§2.3) phải cùng một nguồn API, migrate đồng thời.

5. **Resolve tenant từ session ở `App.tsx:1950–1986`** hiện dùng một chuỗi fallback dài: `sessionAccount.tenantId` → khớp email → khớp tên admin đã chuẩn hóa bỏ dấu → fallback về `'NguyenVanBoss'`. Sau khi có API thật, phải rút gọn thành: `session.active_tenant_id` → `GET /api/tenants/:id`. Chuỗi fallback này là nguồn lỗi tiềm tàng.

6. **Cross-tenant leak đã tồn tại theo thiết kế hiện tại:** hai tenant cùng tên sẽ dùng chung khóa `localStorage`. Không có gì chặn điều đó.

7. **`resetTenantMockStorage()` chưa xóa hết khóa** (xem `README.md` §10.4) — nếu dùng nó làm cơ sở cho "xóa dữ liệu tenant", sẽ sót dữ liệu.

---

## 12. Frontend cần thay đổi ở đâu khi nối API

### 12.1 Thay đổi cấu trúc bắt buộc

| Việc | Ảnh hưởng |
|---|---|
| **Thêm trạng thái async** | Hiện **không màn hình nào** có loading / error / retry. Cần bổ sung cho từng màn hình |
| **`App.tsx` phải bỏ vai trò "database"** | 8 state + ~20 `useEffect` đồng bộ storage phải chuyển thành lệnh gọi API. Đây là thay đổi lớn nhất |
| **Xóa các `useEffect` migrate schema** | §5.4 — thay bằng DB migration |
| **Chuyển 3 job tự động sang server** | §5.3 |
| **Đổi khóa từ `tenantName` sang `tenantId`** | Mọi component Tenant Admin / Receptionist |
| **Chuyển lọc / sắp xếp / phân trang sang server** | Component `ui/Pagination` đã có, nhưng đang phân trang mảng trong RAM |
| **Ghi audit log ở server** | Bỏ `recordAuditLog()` phía client (đang giả mạo actor và IP) |
| **Xử lý lỗi thật** | `authApi.ts` và `packageUpgradeRequests.ts` hiện nuốt lỗi. Component cần biết khi nào thao tác thất bại — xem §12.4 |
| **Thêm bộ chuyển tiệm** | Do quyết định "một admin nhiều tenant" (§11.2). `NailTenantAdminPortal` nhận đúng một prop `tenant`, nên đổi tiệm phải nạp lại toàn bộ dữ liệu portal |
| **Gỡ bớt trường của `AdminSession`** | Bỏ `location`, `trusted`, `suspicious`, `mfaVerified` khỏi type và khỏi màn hình "Bảo mật & nhật ký" — backend sẽ không cung cấp (§8.5) |

### 12.2 Điểm cần sửa cụ thể

| Vị trí | Vấn đề |
|---|---|
| [utils/packageUpgradeRequests.ts:50, 75](src/utils/packageUpgradeRequests.ts#L50) | `persistPackageUpgradeRequest` và `persistPackageUpgradeReview` **`return true` trong nhánh `catch`** → báo thành công dù server lỗi. `handleReviewUpgradeRequest` dựa vào giá trị này để quyết định có đổi state hay không, nên lỗi mạng sẽ dẫn tới frontend và server lệch nhau |
| [App.tsx:1654](src/App.tsx#L1654) | `persistPackageUpgradeReview(reviewedRequest)` được gọi **hai lần** cho cùng một lần duyệt |
| [App.tsx:383](src/App.tsx#L383) | Ghi hóa đơn vào **cả hai** khóa `salonsys_invoices` và `salonsys_invoices_v2` |
| [App.tsx:202](src/App.tsx#L202) | `getPeriodEndIsoDate()` parse chuỗi tiếng Việt `"Đến dd/MM/yyyy"` để suy ra ngày |
| [components/TenantAdminPayments.tsx:401](src/components/TenantAdminPayments.tsx#L401) | Dùng khóa `` `${tenantName}_nail_colors` `` lệch quy ước với mọi nơi khác |
| `tenant-admin-services-v1` và `-v2` | Hai khóa cùng tồn tại cho cùng một domain |
| [utils/money.ts:5](src/utils/money.ts#L5) | Tỷ giá cứng `25000` |
| `BranchCode = 'Q1' \| 'Q3'` ở 7 file | Chặn việc hỗ trợ số chi nhánh động |

### 12.3 Thứ tự thao tác đề xuất cho mỗi module

```
1. Định nghĩa type dùng chung  → src/types.ts (hoặc src/models/)
2. Viết module service         → src/services/<domain>.ts (cách tổ chức theo authApi.ts,
                                  nhưng xử lý lỗi theo §12.4)
3. Thêm hook dữ liệu           → src/hooks/use<Domain>.ts (loading / error / refetch)
4. Đổi component sang dùng hook, bỏ useState + useEffect localStorage
5. Xóa seed của module đó, chuyển thành fixture dùng để seed DB dev/test
6. Xóa khóa localStorage khỏi mockDataReset.ts
```

`NEED_CONFIRMATION`: có dùng thư viện data-fetching (React Query / SWR) hay tự viết hook? Hiện project không có thư viện nào.

### 12.4 Hướng dẫn xử lý lỗi cho service mới

**Không được chép cách xử lý lỗi của `authApi.ts` / `packageUpgradeRequests.ts`.** Hai module đó `catch` rồi trả `null` / `false` / mảng rỗng, khiến tầng gọi không phân biệt được "không có dữ liệu" với "gọi thất bại". Nặng hơn, hai hàm `persist*` còn `return true` **ngay trong nhánh `catch`** — báo thành công dù server lỗi.

Phải tách bạch hai việc **khác nhau**, đừng gộp làm một:

| Đúng | Sai |
|---|---|
| Không để lỗi kỹ thuật thô (stack trace, `TypeError: Failed to fetch`) hiện lên UI | Giấu luôn việc thao tác đã thất bại và coi như thành công |

**Contract đề xuất:** service trả về một cấu trúc nói rõ kết quả — về mặt ý tưởng là `{ data, error }`, hoặc một Result type tương đương (`{ ok: true, data } | { ok: false, error }`). Điểm cốt lõi không phải là hình dạng cụ thể, mà là **tầng gọi luôn phân biệt được thành công với thất bại, và biết thất bại vì lý do gì**.

Tối thiểu phải phân biệt được sáu trường hợp sau, vì mỗi trường hợp cần một cách hiển thị khác nhau:

| Trường hợp | Nguồn | UI nên làm gì |
|---|---|---|
| Thành công | 2xx | Cập nhật dữ liệu |
| Lỗi validation | 400 / 422 | Gắn thông báo vào **đúng ô nhập sai**, không phải toast chung |
| Chưa đăng nhập | 401 | Đưa về màn hình đăng nhập |
| Không đủ quyền | 403 | Báo không có quyền — **không** được đưa về đăng nhập |
| Lỗi mạng | `fetch` ném lỗi | Báo mất kết nối, cho thử lại |
| Lỗi máy chủ | 5xx | Báo lỗi hệ thống, cho thử lại |

Hai ghi chú kèm theo:
- Backend hiện chỉ trả `{ error: string }` (một chuỗi tiếng Việt). Muốn frontend phân biệt được lỗi validation theo từng trường thì **contract lỗi phải được thiết kế lại ở Giai đoạn 3**, ví dụ thêm mã lỗi và tên trường bị lỗi.
- Đã có sẵn `ToastProvider` (`src/components/ui/Toast.tsx`) để hiển thị lỗi ở tầng chung — dùng lại, đừng tự dựng cơ chế thông báo mới.

---

## 13. Mock data: xóa được và nên giữ

> **Đã chốt: dữ liệu trong `localStorage` hiện tại toàn bộ là mock/demo, bỏ được.**
>
> Nghĩa là **không có quy trình migration production** trong dự án này. Hướng đi là:
>
> ```
> Mock fixtures  →  seed database  →  môi trường development/test
> ```
>
> chứ **không phải**:
>
> ```
> Export  →  Transform  →  Validate  →  Import  →  Verify
> ```
>
> Việc cần làm với dữ liệu cũ chỉ là **xóa sạch `localStorage`** trên máy dev và seed lại DB từ fixture. Nếu về sau có tiệm thật chạy trên hệ thống trước khi backend hoàn thiện, quyết định này phải được xem xét lại.

### 13.1 Xóa được sau khi module tương ứng đã lên API

| Mục | Điều kiện xóa |
|---|---|
| `INITIAL_TENANTS`, `INITIAL_PACKAGES`, `INITIAL_ALERTS`, `INITIAL_INVOICES` trong `data.ts` | Sau Giai đoạn 6 (tenant/package/billing) |
| `INITIAL_BACKUPS`, `INITIAL_BACKUP_POLICY`, `INITIAL_RESTORE_JOBS` | Sau khi có backup thật |
| `SUPPORT_MOCK_TICKETS` | Sau khi có API ticket |
| `INITIAL_ANNOUNCEMENTS` | Sau khi có API bản tin |
| `loadTenantsWithOneTimeMocks`, `loadAlertsWithOneTimeMocks` + hai cờ seed | Cùng lúc |
| `LEGACY_MOCK_SUPPORT_TICKET_IDS`, `LEGACY_MOCK_LOG_IDS`, `LEGACY_MOCK_SESSION_IDS` | Cùng lúc — đây là bộ lọc mock cũ, không còn nghĩa khi dữ liệu về DB |
| Ba `useEffect` migrate schema (§5.4) | Sau khi DB migration làm thay |
| `loadLocalStorageData` / `saveLocalStorageData` | Khi state cuối cùng rời khỏi localStorage |
| `getTenantAdminInitialData`, `setTenantAdminDataMode`, `resetTenantMockStorage`, `resetSystemMockStorage` | Cuối cùng, ở Giai đoạn 10 |
| Seed nội bộ trong từng component | Theo từng module |

**Xóa được ngay, không cần đợi migration** (code chết đã xác nhận):
- `src/components/TenantAdminPortal.tsx` (393 dòng)
- `src/components/TenantAdminCustomerCare.tsx` (1.859 dòng)
- `src/components/TenantAdminFinance.tsx` (4 dòng shim)
- `settings-naile-studio.csv` ở thư mục gốc (tệp app xuất ra, commit nhầm)

### 13.2 Nên giữ

| Mục | Lý do |
|---|---|
| `DEMO_ACCOUNTS` + `DEMO_USERS` trong worker | Cần để đăng nhập khi dev và khi seed môi trường mới |
| `nailModuleConfigs` — **phần cấu hình** (`columns`, `tabs`, `formFields`, `eyebrow`, `title`) | Đây là **cấu trúc UI**, không phải dữ liệu. Chỉ xóa phần `rows`, `stats`, `insights`, `checklist` |
| Cơ chế demo/live (`setTenantAdminDataMode`) | Đổi vai: từ "bật/tắt mock" thành "chế độ demo cho khách xem thử". `NEED_CONFIRMATION`: có giữ chế độ demo cho sales không? |
| Toàn bộ seed, chuyển thành **fixture** | Đưa vào `src/mockData/` hoặc `seeds/` để: seed DB dev, seed môi trường test, làm dữ liệu demo cho khách. **Đừng xóa — hãy di chuyển** |
| `src/ui-preview.tsx` + `ui-preview.html` | Harness component, không liên quan dữ liệu nghiệp vụ |
| Các module logic thuần (`subscriptions.ts`, `tenantAdminEntitlements.ts`, `tenantValidation.ts`, `branches.ts`, `promotionUtils.ts`, `money.ts`, `invoicePayments.ts`) | **Là đặc tả business rule sẵn có.** Backend nên dùng lại chính chúng |

---

## 14. Rủi ro khi migration

### 14.1 Rủi ro cao

| Rủi ro | Vì sao | Giảm thiểu |
|---|---|---|
| ~~Mất dữ liệu người dùng đang có~~ | **Đã loại bỏ.** Đã xác nhận: `localStorage` hiện chỉ chứa mock/demo, bỏ được. Không cần quy trình migration production, không cần script export/import/verify | Chỉ cần xóa `localStorage` và seed lại DB dev từ fixture (§13.2) |
| **`App.tsx` quá lớn để migrate một lần** | 2.100 dòng, 8 state đan xen nhau qua ~20 `useEffect` | Migrate từng state một, giữ localStorage làm fallback trong lúc chuyển tiếp |
| **Business rule nằm trong `useEffect`, khó chuyển sang server** | Ví dụ `handleUpdateInvoiceStatus` (§5.1) làm 5 việc trong một lần gọi | Viết đặc tả từng handler thành API contract **trước khi** code |
| **Không có test** | Không có lưới an toàn nào để phát hiện hồi quy | Thêm test cho các module logic thuần trước — chúng dễ test nhất và chứa nhiều rule nhất |
| **Tenant Admin và Receptionist chia sẻ khóa storage** | Migrate lệch một bên là dữ liệu hai cổng lệch nhau | Migrate theo domain, không theo cổng |
| **Đổi `tenantName` → `tenantId`** | Chạm ~21 khóa và mọi component tầng salon | Làm ở Giai đoạn 1, **trước khi** nối API. Vì dữ liệu chỉ là mock, **không cần script di trú khóa cũ** — cứ xóa và seed lại |
| **Truy cập chéo tenant khi làm "một admin nhiều tenant"** | Không còn dùng được `WHERE tenant_id = session.tenant_id`. Nếu quên bước xác thực quyền qua `user_tenants`, một admin sẽ đọc được tenant không thuộc về mình | Bọc phép kiểm tra vào **một chỗ dùng chung** ở tầng truy vấn, đừng để mỗi endpoint tự viết. Test cách ly tenant là bắt buộc (Giai đoạn 9) |

### 14.2 Rủi ro trung bình

| Rủi ro | Ghi chú |
|---|---|
| Model trùng lặp (§3.3) sinh ra API contract mâu thuẫn | Hợp nhất model trước khi thiết kế DB |
| Hạn mức gói chưa từng được đo thật | Khi backend bắt đầu áp hạn mức thật, tenant hiện tại có thể **vượt hạn mức ngay lập tức**. Cần chính sách xử lý |
| Nghiệp vụ client cho phép trạng thái mà server sẽ từ chối | Ví dụ: sửa hóa đơn đã thanh toán. Cần đối chiếu từng handler |
| Thiếu trạng thái loading khắp nơi | Người dùng sẽ thấy màn hình "đơ" khi API chậm |
| Không có phân trang phía server | Danh sách lớn sẽ chậm khi dữ liệu thật vào |
| Audit log client ghi sai actor | Log lịch sử hiện có **không đáng tin**; cần quyết định giữ hay bỏ |
| Hai backend phải sửa song song | `vite-local-auth.ts` + `sites-worker.js` + `db/schema.ts` + `drizzle/*.sql`, không có gì ép đồng bộ |
| Không có lockfile hợp lệ | Nên cố định phụ thuộc trước khi bắt đầu công việc dài |

### 14.3 Rủi ro thấp nhưng dễ quên

- Tỷ giá cứng `25000` sẽ sai lệch số liệu tài chính khi có dữ liệu thật.
- `getPeriodEndIsoDate()` parse chuỗi tiếng Việt — hỏng ngay nếu API trả tiếng Anh.
- `crypto.randomUUID()` trong `sites-worker.js` cần HTTPS ở một số môi trường.
- Bản dịch tiếng Anh còn thiếu; thông báo lỗi API mới sẽ cần dịch.
- `NEED_CONFIRMATION`: dự án có tiếp tục deploy trên Cloudflare Workers + D1, hay đổi sang backend khác? Điều này quyết định toàn bộ Giai đoạn 2–6.

---

## 15. Thứ tự migrate từng module

Nguyên tắc xếp thứ tự: **cái gì nhiều thứ khác phụ thuộc vào thì làm trước**; trong cùng một bậc thì làm cái ít rủi ro trước.

### Bậc 0 — Dọn dẹp (không cần backend)

1. Xóa code chết: `TenantAdminPortal.tsx`, `TenantAdminCustomerCare.tsx`, `TenantAdminFinance.tsx`, `settings-naile-studio.csv`.
2. Cố định lockfile.
3. Hợp nhất model trùng lặp (§3.3) vào `src/types.ts` hoặc `src/models/`.
4. **Đổi mọi khóa `localStorage` từ `tenantName` sang `tenantId`** (kèm script di trú khóa cũ).
5. Bỏ ràng buộc `BranchCode = 'Q1' | 'Q3'`.
6. Thống nhất khóa lệch: `${tenantName}_nail_colors`, `tenant-admin-services-v1` vs `-v2`.
7. Bổ sung khóa còn thiếu vào `getTenantMockStorageKeys()`.

### Bậc 1 — Nền móng

8. **Tenant + Branch** — mọi thứ khác đều tham chiếu tới.
9. **Subscription Package** (+ capabilities, limits, price history) — billing và entitlement phụ thuộc.
10. **Tenant Admin account + liên kết tenant** — đã có `app_users`, chỉ cần nối phần hồ sơ.

### Bậc 2 — Tài chính nền tảng

11. **Invoice** (+ line items, payment attempts, activities).
12. **Job nền subscription** (§5.3) — chỉ chạy được sau khi có 8, 9, 11.
13. **Entitlement thật ở server** — chặn theo `capabilities` và `limits` ở API.

### Bậc 3 — Hệ thống

14. **Audit log** (ghi ở server) + **quản lý phiên** (mở rộng `app_sessions` theo §8.5, không tạo bảng mới).
15. **System settings**.
16. **Announcement** + trạng thái theo tenant.
17. **Alert**.
18. **Ticket** (+ messages, history).

### Bậc 4 — Danh mục tầng salon (ít phụ thuộc, dễ làm, migrate được sớm)

19. **Service & giá** — nhiều màn hình đọc.
20. **Staff**.
21. **Station & Area**.
22. **Inventory** + **Polish Color** (đã có `inventorySync.ts` gắn hai cái với nhau).
23. **Nail Design**.

### Bậc 5 — Nghiệp vụ tầng salon

24. **Customer** (+ lịch sử dịch vụ).
25. **Appointment** — phụ thuộc 19, 20, 21, 24. Đây là domain phức tạp nhất vì cả 3 cổng đều dùng.
26. **POS / Payment** — phụ thuộc 19, 22, 24.
27. **Loyalty** + **Member tier** — phụ thuộc 24, 26.
28. **Finance transaction** + **Expense**.
29. **Online booking** — phụ thuộc 25.
30. **Sanitation**.
31. **Reception products** + **restock report** + **shift**.

### Bậc 6 — Tổng hợp & dịch vụ ngoài

32. **Báo cáo** (tổng hợp phía server) — cần hầu hết dữ liệu đã lên DB.
33. **Email / SMS / Zalo**.
34. **Cổng thanh toán**.
35. **Upload tệp**.
36. **Backup & restore thật**.
37. **MFA + thu hồi phiên**.

---

## 16. Checklist migration theo 10 giai đoạn

### Giai đoạn 1 — Chuẩn hóa model frontend

- [ ] Xóa `TenantAdminPortal.tsx`, `TenantAdminCustomerCare.tsx`, `TenantAdminFinance.tsx`
- [ ] Xóa `settings-naile-studio.csv` khỏi repo, thêm pattern vào `.gitignore`
- [ ] Chọn npm hoặc bun, commit lockfile hợp lệ
- [ ] Tạo `src/models/` (hoặc mở rộng `src/types.ts`) làm nơi duy nhất khai model
- [ ] Hợp nhất `TenantAppointment` / `Appointment` / `StationAppointment` / `LinkedAppointment` → một model
- [ ] Hợp nhất `TenantStation` / `Station`; thống nhất enum `StationArea`
- [ ] Hợp nhất `StaffMember` / `Technician`
- [ ] Hợp nhất `InventoryItem` / `ReceptionProduct`
- [ ] Hợp nhất `PolishColor` / `PolishColorOption`
- [ ] Thống nhất `AppointmentStatus` (đang khai 3 lần)
- [ ] Thống nhất `PaymentMethod` / `paymentGateway`
- [ ] Bỏ `BranchCode = 'Q1' | 'Q3'` cứng ở 7 file, chuyển sang `branchId: string`
- [ ] **Đổi mọi khóa `localStorage` từ `tenantName` sang `tenantId`** — dữ liệu chỉ là mock nên **không cần script di trú**, cứ xóa localStorage và seed lại
- [ ] Sửa khóa lệch `${tenantName}_nail_colors`; gộp `tenant-admin-services-v1`/`-v2`
- [ ] Bổ sung khóa còn thiếu vào `getTenantMockStorageKeys()`
- [ ] Gỡ trường trùng lặp trên `Tenant`: `packageName` / `plan` / `subscriptionPlan`
- [ ] Đưa `Invoice.billingPeriod` (legacy) về một cột ngày thật, bỏ `getPeriodEndIsoDate()`
- [ ] Chuyển tỷ giá `USD_TO_VND_RATE` thành giá trị cấu hình
- [ ] `npm run lint` xanh sau mỗi bước

### Giai đoạn 2 — Thiết kế database

- [ ] Chốt nền tảng backend (`NEED_CONFIRMATION`: giữ Cloudflare Workers + D1?)
- [ ] Chốt công cụ migration (kích hoạt Drizzle thật, hay dùng SQL thuần?)
- [ ] Chốt chiến lược multi-tenant: `tenant_id` trên mọi bảng + index bắt buộc
- [ ] Thiết kế bảng nối **`user_tenants`** thay cột `app_users.tenant_id` (quyết định "một admin nhiều tenant" — §11.2)
- [ ] Thêm `active_tenant_id` vào `app_sessions` (§11.2)
- [ ] Thêm cột metadata phiên vào `app_sessions`: `ip`, `user_agent`, `last_active`, `revoked_at` (§8.5) — **không** tạo bảng `admin_sessions` riêng
- [ ] `NEED_CONFIRMATION`: khi user có nhiều tenant, tenant mặc định sau đăng nhập chọn thế nào?
- [ ] Chốt cách lưu tiền (số nguyên đơn vị nhỏ nhất?) và đa tiền tệ
- [ ] Chốt chuẩn ngày giờ (UTC ISO-8601 ở DB, quy đổi múi giờ ở tầng hiển thị)
- [ ] Chốt thuế & hóa đơn điện tử VN — ảnh hưởng model `Invoice`
- [ ] Chốt soft delete cho dữ liệu tài chính
- [ ] Thiết kế bảng tầng nền tảng (§8.2)
- [ ] Thiết kế bảng tầng salon (§8.3)
- [ ] Thiết kế `announcement_tenant_states` thay 4 mảng ID
- [ ] Rà lại toàn bộ §8.2/§8.3 — đây là **danh sách ứng viên**, chỉ chốt thành schema sau khi nghiệp vụ tương ứng được chốt
- [ ] Thiết kế bảng lưu vết version gói + giá đã khóa
- [ ] Viết migration cho các bảng đã có (`app_users`, `app_sessions`, `package_upgrade_requests`)
- [ ] **Viết script seed DB dev/test từ mock fixtures** (§13.2) — KHÔNG cần script export/import dữ liệu production, xem §13

### Giai đoạn 3 — Thiết kế API contract

- [ ] Chốt quy ước: REST hay RPC, cách đặt tên, mã lỗi, định dạng lỗi
- [ ] Chốt cách phân trang / lọc / sắp xếp (mọi danh sách hiện đang xử lý client-side)
- [ ] Viết contract cho từng handler trong §5.1 — **nêu rõ mỗi API làm những gì**, đặc biệt `handleUpdateInvoiceStatus` (5 tác dụng phụ) và `handleDeleteTenant` (xóa theo tầng)
- [ ] Chốt hành vi 3 job nền (§5.3): lịch chạy, tính idempotent
- [ ] **Thiết kế lại contract lỗi** — hiện backend chỉ trả `{ error: string }`, không đủ để frontend phân biệt validation / 401 / 403 / 5xx và không chỉ ra được ô nhập nào sai. Cần mã lỗi + tên trường lỗi (§12.4)
- [ ] Chốt versioning API
- [ ] Chốt endpoint đổi tenant đang active, và cách API biết tenant hiện tại của phiên (§11.2)
- [ ] Sinh type dùng chung giữa FE và BE nếu backend dùng TypeScript
- [ ] Viết tài liệu contract (OpenAPI hoặc markdown)

### Giai đoạn 4 — Xây Authentication

- [ ] Chuyển hash mật khẩu sang PBKDF2 / scrypt / Argon2
- [ ] **Bỏ `adminTempPassword` / `tempPassword` khỏi state và `localStorage` phía client**
- [ ] Luồng đặt mật khẩu lần đầu / kích hoạt tài khoản qua email
- [ ] Luồng đổi mật khẩu
- [ ] Luồng quên mật khẩu
- [ ] Xác minh email / số điện thoại (thay hai cờ `*Verified` hiện tại)
- [ ] Áp `security.sessionTimeout`, `maxLoginAttempts`, `passwordMinLength` từ `system_settings` thay vì hằng số trong worker
- [ ] Endpoint liệt kê + thu hồi phiên (mở rộng `app_sessions` theo §8.5, không tạo bảng mới)
- [ ] Đặt `active_tenant_id` khi đăng nhập + endpoint đổi tenant đang active (§11.2)
- [ ] MFA cho Superadmin (`security.requireMfaForSuperadmin`)
- [ ] Middleware xác thực áp cho **mọi** endpoint nghiệp vụ

### Giai đoạn 5 — Xây Authorization

- [ ] Áp `requireSession(request, db, roles)` cho mọi endpoint mới
- [ ] Ép lọc tenant ở tầng truy vấn, không ở tầng ứng dụng
- [ ] **Xác thực quyền qua `user_tenants` trước khi lọc** — không được so sánh trực tiếp với `session.tenantId` như hai endpoint hiện tại (§10.1)
- [ ] Bọc phép kiểm tra tenant vào **một chỗ dùng chung**, đừng để mỗi endpoint tự viết
- [ ] Chuyển entitlement theo `capabilities` xuống server (`tenantAdminEntitlements.ts` là đặc tả sẵn có)
- [ ] **Áp hạn mức thật** (`SubscriptionLimits`) — kèm chính sách cho tenant đang vượt hạn mức
- [ ] Chốt & cài đặt `TenantAdminRole` (`Owner`/`Manager`/`Staff`) — `NEED_CONFIRMATION`
- [ ] Chốt vai trò `SUPPORT` — `NEED_CONFIRMATION`
- [ ] Chốt phân quyền theo chi nhánh cho Receptionist — `NEED_CONFIRMATION`
- [ ] Chuyển ghi audit log sang server (bỏ actor/IP giả ở client)
- [ ] Kiểm thử cross-tenant: tenant A không đọc/ghi được dữ liệu tenant B
- [ ] Kiểm thử riêng cho tài khoản nhiều tenant: chỉ truy cập được các tenant có trong `user_tenants`

### Giai đoạn 6 — Xây backend theo module

Theo thứ tự §15:

- [ ] Bậc 1: Tenant + Branch → Subscription Package → Tenant Admin
- [ ] Bậc 2: Invoice → Job nền subscription → Entitlement server-side
- [ ] Bậc 3: Audit log, quản lý phiên (§8.5), System settings, Announcement, Alert, Ticket
- [ ] Bậc 4: Service, Staff, Station/Area, Inventory + Polish Color, Nail Design
- [ ] Bậc 5: Customer, Appointment, POS/Payment, Loyalty, Finance, Online booking, Sanitation, Reception products
- [ ] Bậc 6: Báo cáo tổng hợp server-side
- [ ] Cập nhật `scripts/vite-local-auth.ts` song song cho mỗi endpoint mới
- [ ] Cập nhật `db/schema.ts` + `drizzle/*.sql` cho mỗi bảng mới

### Giai đoạn 7 — Thay mock service bằng API service

- [ ] Tạo `src/services/` — chép **cách tổ chức** của `authApi.ts`, **không** chép cách xử lý lỗi (§12.4)
- [ ] Chốt Result type dùng chung (`{ data, error }` hoặc tương đương) trước khi viết service đầu tiên
- [ ] Đảm bảo tầng gọi phân biệt được 6 trường hợp ở §12.4: thành công / validation / 401 / 403 / lỗi mạng / 5xx
- [ ] **Sửa `persistPackageUpgradeRequest` / `persistPackageUpgradeReview` đang `return true` trong `catch`**
- [ ] Bỏ lệnh gọi `persistPackageUpgradeReview` bị lặp ở [App.tsx:1654](src/App.tsx#L1654)
- [ ] Một service module cho mỗi domain ở Giai đoạn 6
- [ ] Tạo `src/hooks/use<Domain>.ts` với `data` / `loading` / `error` / `refetch`
- [ ] Chốt có dùng React Query / SWR hay không — `NEED_CONFIRMATION`
- [ ] Chuẩn hóa cách hiển thị lỗi (dùng `ToastProvider` sẵn có); lỗi validation gắn vào đúng ô nhập, không dùng toast chung
- [ ] Bỏ ghi hóa đơn vào cả `salonsys_invoices` lẫn `salonsys_invoices_v2`

### Giai đoạn 8 — Kết nối frontend

- [ ] Chuyển 8 state của `App.tsx` sang service, từng cái một
- [ ] Xóa các `useEffect` đồng bộ localStorage tương ứng
- [ ] Xóa 3 `useEffect` migrate schema (§5.4) sau khi DB migration đảm nhiệm
- [ ] Xóa 3 `useEffect` job tự động (§5.3) sau khi server đảm nhiệm
- [ ] Rút gọn chuỗi resolve tenant ở [App.tsx:1950](src/App.tsx#L1950) còn `session.active_tenant_id`
- [ ] Thêm **bộ chuyển tiệm** cho tài khoản quản lý nhiều tenant (§11.2) — chưa tồn tại
- [ ] Gỡ `location` / `trusted` / `suspicious` / `mfaVerified` khỏi `AdminSession` và màn hình Bảo mật (§8.5)
- [ ] Chuyển từng màn hình Tenant Admin sang hook dữ liệu
- [ ] Chuyển `ReceptionistPortal` **cùng lúc** với các domain nó chia sẻ (§2.3)
- [ ] Thêm loading / error / empty state cho mọi màn hình
- [ ] Chuyển phân trang, lọc, sắp xếp, tìm kiếm sang server
- [ ] `npm run lint` xanh

### Giai đoạn 9 — Kiểm thử

- [ ] **Chọn và cài test runner** (project hiện chưa có) — `NEED_CONFIRMATION`
- [ ] Unit test cho các module logic thuần trước: `subscriptions.ts`, `tenantAdminEntitlements.ts`, `tenantValidation.ts`, `branches.ts`, `promotionUtils.ts`, `money.ts`, `invoicePayments.ts`
- [ ] Test API contract cho từng endpoint
- [ ] **Test cách ly tenant** (bắt buộc): tenant A không truy cập được dữ liệu tenant B
- [ ] Test RBAC cho từng vai trò × từng endpoint
- [ ] Test luồng nghiệp vụ: tạo tenant → sinh hóa đơn → thanh toán → kích hoạt gói
- [ ] Test luồng nâng cấp gói: gửi → duyệt → tạo hóa đơn → thanh toán → áp dụng
- [ ] Test job nền: hết hạn subscription, chuyển gói ngừng bán, archive gói
- [ ] Test cưỡng chế hạn mức gói
- [ ] Test script seed DB dev/test từ fixture (không có script di trú production — xem §13)
- [ ] Test luồng đổi tenant đang active: đổi xong dữ liệu portal phải nạp lại đúng tenant mới
- [ ] Test hồi quy 3 cổng bằng dữ liệu seed
- [ ] Kiểm tra bảo mật: SQL injection, phân quyền, session fixation, rò rỉ mật khẩu tạm

### Giai đoạn 10 — Xóa mock data không còn cần

- [ ] Xóa sạch `localStorage` trên máy dev và seed lại DB từ fixture (không có bước di trú production — xem §13)
- [ ] Xóa seed đã lên DB khỏi `data.ts`, `mockData/`, `systemAnnouncements.ts`, `tenantCustomers.ts`
- [ ] Xóa seed nội bộ trong từng component
- [ ] Tách `nailModuleConfigs`: **giữ** phần cấu hình UI, **xóa** phần dữ liệu (`rows`, `stats`, `insights`, `checklist`)
- [ ] Xóa `loadTenantsWithOneTimeMocks`, `loadAlertsWithOneTimeMocks` + hai cờ seed
- [ ] Xóa `LEGACY_MOCK_*` (ticket, log, session)
- [ ] Xóa `loadLocalStorageData` / `saveLocalStorageData` khỏi `data.ts`
- [ ] Xóa `readStorage()` trong `ReceptionistPortal.tsx`
- [ ] Xóa hoặc đổi vai `mockDataReset.ts` (`getTenantAdminInitialData`, `setTenantAdminDataMode`, `resetTenantMockStorage`, `resetSystemMockStorage`)
- [ ] **Di chuyển** (không xóa) seed sang `seeds/` để dùng cho DB dev/test và demo cho khách
- [ ] Giữ `DEMO_ACCOUNTS` / `DEMO_USERS` cho môi trường dev
- [ ] Giữ `ui-preview.tsx` + `ui-preview.html`
- [ ] Viết đoạn dọn `localStorage` cũ chạy một lần khi app khởi động, để máy dev không còn khóa rác
- [ ] Cập nhật `README.md`, `CLAUDE.md` cho kiến trúc mới
- [ ] `npm run lint` xanh, toàn bộ test xanh

---

## Phụ lục A — Quyết định đã chốt

| # | Quyết định | Ảnh hưởng tới |
|---|---|---|
| 1 | **Một tài khoản Tenant Admin quản lý được NHIỀU tenant** | §3.1, §8.2, §9.2, §10.1, §11.2, §12.1, Giai đoạn 2/4/5/8/9 |
| 2 | **Tiệm đang làm việc được lưu trong phiên** (`active_tenant_id` trong `app_sessions`), không đính kèm theo từng request | §8.5, §11.2, §12.1, Giai đoạn 3/4/8 |
| 3 | **Dữ liệu `localStorage` hiện tại toàn bộ là mock/demo, bỏ được** — không có migration production, chỉ có *fixtures → seed DB dev/test* | §13, §14.1, Giai đoạn 1/2/9/10 |
| 4 | **Mở rộng `app_sessions` với cột tối thiểu** (`ip`, `user_agent`, `last_active`, `revoked_at`), **không** tạo bảng `admin_sessions`; bỏ `location`/`trusted`/`suspicious`/`mfaVerified` | §3.1, §6.2, §8.2, §8.5, §9.2, §12.1, Giai đoạn 2/4/8 |

## Phụ lục B — Danh sách `NEED_CONFIRMATION` còn lại

| # | Cần xác nhận |
|---|---|
| 1 | **Node.js phiên bản tối thiểu chính thức** — repo không khai `engines`, không có `.nvmrc`. Khuyến nghị hiện tại (20.19+ / 22.12+) suy ra từ `engines` của dependency, xem `README.md` §4 |
| 2 | Vai trò `SUPPORT` có phải vai trò đăng nhập thật không? |
| 3 | `TenantAdminRole` (`Owner`/`Manager`/`Staff`) khác nhau ở quyền gì? |
| 4 | `RolePermissionPreset` trong `TenantAdminStaff.tsx` là quyền đăng nhập hay mô tả công việc? |
| 5 | Receptionist có bị giới hạn xem dữ liệu theo chi nhánh không? |
| 6 | Theme + ngôn ngữ lưu theo tài khoản (server) hay theo thiết bị? |
| 7 | Tiếp tục dùng Cloudflare Workers + D1 hay đổi nền tảng backend? |
| 8 | Kích hoạt Drizzle thật hay dùng SQL thuần cho migration? |
| 9 | Dùng React Query / SWR hay tự viết hook dữ liệu? |
| 10 | Chọn test runner nào (Vitest?) |
| 11 | Có giữ chế độ demo (dữ liệu mẫu cho sales / khách xem thử) sau migration? |
| 12 | Yêu cầu hóa đơn điện tử & thuế Việt Nam — ảnh hưởng trực tiếp model `Invoice` |
| 13 | Tiền tệ: lưu số nguyên đơn vị nhỏ nhất hay số thực? Tỷ giá lấy từ đâu? |
| 14 | Chính sách xử lý tenant đang **vượt hạn mức** khi backend bắt đầu cưỡng chế thật |
| 15 | **Khi user có nhiều tenant, tenant mặc định sau khi đăng nhập chọn thế nào?** (tenant dùng gần nhất / tenant đầu danh sách / bắt người dùng chọn) — phát sinh từ quyết định A1 |
| 16 | **Hình dạng cụ thể của contract lỗi** — backend hiện chỉ trả `{ error: string }`, chưa đủ để frontend phân biệt validation/401/403/5xx và chỉ ra ô nhập sai (§12.4) |
