/**
 * Trang ví dụ cho thư viện component dùng chung (README §22.2 — "component phải
 * có API rõ, trạng thái tương tác đầy đủ và tài liệu ví dụ").
 *
 * Đây là entry riêng, chỉ dùng khi phát triển: mở /ui-preview.html.
 * Không được import vào App.tsx và không nằm trong bundle production.
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Trash2 } from 'lucide-react';
import './index.css';
import { Button, DataTable, Field, Modal, StatusBadge, STATUS_MAP, ToastProvider, useToast } from './components/ui';
import type { StatusKey, ToastTone } from './components/ui';
import TenantAdminStations from './components/TenantAdminStations';
import TenantAdminServices from './components/TenantAdminServices';
import TenantAdminSettings from './components/TenantAdminSettings';
import TenantAdminAppointments from './components/TenantAdminAppointments';
import TenantAdminReports from './components/TenantAdminReports';
import { nailModuleConfigs, type BrandInfo, type NailRow, type PaymentSettings } from './components/nailAdminData';
import ReceptionistStations from './components/ReceptionistStations';
import ReceptionistPortal from './components/ReceptionistPortal';
import { setTenantAdminDataMode } from './utils/mockDataReset';

const PREVIEW_TENANT = 'Preview Studio';

/** Seed lịch hẹn cho bản xem trước lễ tân. Chỉ ghi vào key riêng của preview. */
const seedPreviewAppointments = () => {
  const key = `tenant-admin-appointments-v2:${PREVIEW_TENANT}`;
  if (localStorage.getItem(key)) return;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  localStorage.setItem(key, JSON.stringify([
    { id: 'APT-9001', customer: 'Nguyễn Minh Anh', phone: '0912 884 206', date: today, start: '09:30', duration: 90, service: 'Gel Manicure', staff: 'Thảo Nguyễn', branch: 'Q3', status: 'IN_SERVICE', station: 'M-02', note: 'Khách VIP.', deposit: 0 },
    { id: 'APT-9002', customer: 'Trần Thu Hà', phone: '0908 337 912', date: today, start: '10:45', duration: 75, service: 'Pedicure Spa', staff: 'Minh Châu', branch: 'Q3', status: 'CHECKED_IN', note: 'Chờ xếp ghế.', deposit: 0 },
    { id: 'APT-9003', customer: 'Lê Phương Anh', phone: '0901 486 320', date: today, start: '13:00', duration: 60, service: 'Sơn gel Hàn Quốc', staff: 'Hà My', branch: 'Q3', status: 'CHECKED_IN', note: 'Khách mới.', deposit: 0 },
    { id: 'APT-9004', customer: 'Bùi Thanh Trúc', phone: '0938 400 176', date: today, start: '15:00', duration: 90, service: 'Combo VIP', staff: 'Quốc Bảo', branch: 'Q3', status: 'CONFIRMED', station: 'V-01', note: '', deposit: 300000 },
  ]));
};

function ReceptionPortalPreview() {
  const showToast = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (document.documentElement.dataset.theme as 'light' | 'dark') || 'light');
  seedPreviewAppointments();
  return (
    <ReceptionistPortal
      account={{
        role: 'RECEPTIONIST',
        email: 'receptionist@preview.vn',
        displayName: 'Lê Hoàng Nam',
        tenantName: PREVIEW_TENANT,
        branchCode: 'Q3',
        branchName: `${PREVIEW_TENANT} · Chi nhánh Quận 3`,
      }}
      themeMode={theme}
      onThemeChange={(mode) => { document.documentElement.dataset.theme = mode; setTheme(mode); }}
      onLogout={() => showToast('Đăng xuất (bản xem trước)', 'info')}
    />
  );
}

function ReceptionStationsPreview() {
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  seedPreviewAppointments();
  return (
    <div className="role-shell role-shell--reception reception-workspace" style={{ minHeight: '100vh' }}>
      <main className="role-main" style={{ maxWidth: '96rem', margin: '0 auto', padding: '1.5rem 1.5rem 6rem' }}>
        {toast && <p role="status" style={{ marginBottom: '1rem', color: 'var(--accent-strong)' }}>{toast}</p>}
        <ReceptionistStations
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedBranch="Q3"
          branchLocked
          tenantName={PREVIEW_TENANT}
          roleLabel="Receptionist · Lê Hoàng Nam"
          accessMode="full"
          onNotify={setToast}
        />
      </main>
    </div>
  );
}

type Shell = 'superadmin' | 'tenant' | 'reception';

interface DemoRow {
  id: string;
  name: string;
  status: StatusKey;
  revenue: number;
}

const ROWS: DemoRow[] = [
  { id: 'TEN-AURORA', name: 'Aurora Beauty & Spa', status: 'ACTIVE', revenue: 128_000_000 },
  { id: 'TEN-SORA', name: 'Sora Japanese Salon', status: 'EXPIRING', revenue: 73_900_000 },
  { id: 'TEN-OASIS', name: 'Oasis Wellness', status: 'OVERDUE', revenue: 44_800_000 },
  { id: 'TEN-MORNING', name: 'Morning Dew Spa', status: 'SUSPENDED', revenue: 18_600_000 },
];

const dong = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

/**
 * Xem trước màn hình đã migrate mà không cần đăng nhập.
 * Dùng tenantName riêng để không ghi đè dữ liệu demo trong localStorage.
 */
function StationsPreview() {
  // Bật dữ liệu mẫu để xem trước có nội dung. Ứng dụng thật chạy ở chế độ live.
  setTenantAdminDataMode('demo');
  const [searchQuery, setSearchQuery] = useState('');
  const [branch, setBranch] = useState('ALL');
  const [toast, setToast] = useState('');
  return (
    <div className="role-shell role-shell--tenant" style={{ minHeight: '100vh' }}>
      <main className="role-main" style={{ maxWidth: '96rem', margin: '0 auto', padding: '1.5rem 1.5rem 6rem' }}>
        {toast && <p role="status" style={{ marginBottom: '1rem', color: 'var(--accent-strong)' }}>{toast}</p>}
        <TenantAdminStations
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedBranch={branch}
          onSelectedBranchChange={setBranch}
          tenantName="Preview Studio"
          roleLabel="Owner · Tenant Admin"
          accessMode="full"
          onNotify={setToast}
        />
      </main>
    </div>
  );
}

/** Xem trước trang Dịch vụ & giá (bao gồm hộp thoại chi tiết dịch vụ). */
function ServicesPreview() {
  setTenantAdminDataMode('demo');
  const [searchQuery, setSearchQuery] = useState('');
  const [branch, setBranch] = useState('ALL');
  const [toast, setToast] = useState('');
  return (
    <div className="role-shell role-shell--tenant nail-admin" style={{ minHeight: '100vh' }}>
      {/* Dựng đúng thuộc tính của <main> trong cổng thật: nhiều quy tắc CSS bám
          vào data-page và data-compact-access nên thiếu chúng là xem trước sai môi trường. */}
      <main className="role-main tenant-admin-main mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8" data-page="services" data-compact-access="true">
        {toast && <p role="status" style={{ marginBottom: '1rem', color: 'var(--accent-strong)' }}>{toast}</p>}
        <TenantAdminServices
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedBranch={branch}
          onSelectedBranchChange={setBranch}
          tenantName="Preview Studio"
          roleLabel="Owner · Tenant Admin"
          accessMode="full"
          onNotify={setToast}
        />
      </main>
    </div>
  );
}

/**
 * Xem trước trang Cài đặt tiệm. Tái tạo đúng môi trường CSS của trang thật
 * (`.role-shell--tenant` + `.role-main.tenant-admin-main[data-page="settings"]`)
 * để kiểm tra được cả các luật ghi đè cấp shell.
 */
function SettingsPreview() {
  const config = nailModuleConfigs.settings;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(config.tabs[0]);
  const [selectedRow, setSelectedRow] = useState<NailRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const [brandInfo, setBrandInfo] = useState<BrandInfo>(() => ({ ...config.brandInfo!, displayName: PREVIEW_TENANT }));
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() => ({
    ...config.paymentSettings!,
    methods: config.paymentSettings!.methods.map((method) => ({ ...method }))
  }));
  return (
    <div className="role-shell role-shell--tenant nail-admin" style={{ minHeight: '100vh' }}>
      <main
        className="role-main tenant-admin-main"
        data-page="settings"
        style={{ maxWidth: '93.75rem', margin: '0 auto', padding: '1.5rem 1.5rem 6rem' }}
      >
        {toast && <p role="status" style={{ marginBottom: '1rem', color: 'var(--accent-strong)' }}>{toast}</p>}
        <TenantAdminSettings
          config={config}
          rows={config.rows}
          searchQuery={searchQuery}
          activeTab={activeTab}
          onSearch={setSearchQuery}
          onTab={setActiveTab}
          scopeLabel="Toàn tenant"
          tenantName={PREVIEW_TENANT}
          onCreate={() => { setFormValues({}); setFormOpen(true); }}
          onExport={() => setToast('Đã xuất dữ liệu Cài đặt tiệm (bản xem trước).')}
          selectedRow={selectedRow}
          onSelectRow={setSelectedRow}
          onEditSelected={() => {
            if (!selectedRow) return;
            const next: Record<string, string> = {};
            config.formFields.forEach((field, index) => {
              next[field.key] = index === 0 ? selectedRow.title : selectedRow.details[index]?.value || '';
            });
            setFormValues(next);
            setSelectedRow(null);
            setFormOpen(true);
          }}
          onConfirmSelected={() => { setToast(`Đã cập nhật trạng thái “${selectedRow?.title}”.`); setSelectedRow(null); }}
          formOpen={formOpen}
          formValues={formValues}
          onFormChange={(key, value) => setFormValues((current) => ({ ...current, [key]: value }))}
          onFormClose={() => setFormOpen(false)}
          onFormSubmit={(event) => { event.preventDefault(); setFormOpen(false); setToast('Đã lưu cấu hình (bản xem trước).'); }}
          brandInfo={brandInfo}
          onBrandInfoChange={(key, value) => setBrandInfo((current) => ({ ...current, [key]: value }))}
          onBrandInfoSubmit={(event) => { event.preventDefault(); setToast('Đã lưu thông tin thương hiệu (bản xem trước).'); }}
          paymentSettings={paymentSettings}
          onPaymentMethodToggle={(key, enabled) => {
            setPaymentSettings((current) => ({
              ...current,
              methods: current.methods.map((method) => (method.key === key ? { ...method, enabled } : method))
            }));
            setToast(`Đã ${enabled ? 'bật' : 'tắt'} một phương thức thanh toán (bản xem trước).`);
          }}
          onRefundApprovalChange={(value) => {
            setPaymentSettings((current) => ({ ...current, refundApproval: value }));
            setToast(`Đã đổi cấp duyệt hoàn tiền (bản xem trước).`);
          }}
          branchRows={nailModuleConfigs.branches.rows}
          onNavigateToBranches={() => setToast('Mở trang Chi nhánh (bản xem trước).')}
        />
      </main>
    </div>
  );
}

/**
 * Xem trước màn hình Lịch hẹn ở cả hai cổng dùng chung nó — Tenant Admin
 * (accent hồng) và Lễ tân (accent xanh) — để kiểm tra accent, quyền thao tác
 * và các hộp thoại trong đúng môi trường shell của từng cổng.
 *
 * Dùng tenant riêng: khoá localStorage của bản xem trước lễ tân chỉ chứa các
 * trường mà màn hình Bàn lễ tân cần, thiếu `price`/`source` mà màn hình này đọc.
 */
function AppointmentsPreview() {
  // Bật dữ liệu mẫu để bản xem trước có nội dung. Ứng dụng thật chạy chế độ live.
  setTenantAdminDataMode('demo');
  const [asReceptionist, setAsReceptionist] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [branch, setBranch] = useState('Q3');
  const [toast, setToast] = useState('');
  return (
    <div
      className={`role-shell ${asReceptionist ? 'role-shell--reception reception-workspace' : 'role-shell--tenant'}`}
      style={{ minHeight: '100vh' }}
    >
      <main className="role-main" style={{ maxWidth: '96rem', margin: '0 auto', padding: '1.5rem 1.5rem 6rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button size="small" variant={asReceptionist ? 'secondary' : 'primary'} onClick={() => setAsReceptionist(false)}>
            Cổng Tenant Admin
          </Button>
          <Button size="small" variant={asReceptionist ? 'primary' : 'secondary'} onClick={() => setAsReceptionist(true)}>
            Cổng Lễ tân
          </Button>
          {toast && <p role="status" style={{ margin: 0, color: 'var(--accent-strong)' }}>{toast}</p>}
        </div>
        <TenantAdminAppointments
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedBranch={branch}
          onSelectedBranchChange={setBranch}
          branchLocked={asReceptionist}
          tenantName="Preview Lịch hẹn"
          roleLabel={asReceptionist ? 'Receptionist · Lê Hoàng Nam' : 'Owner · Tenant Admin'}
          accessMode="full"
          onNotify={setToast}
        />
      </main>
    </div>
  );
}

/** Xem trước trang Báo cáo của Tenant Admin (accent hồng). */
function ReportsPreview() {
  // Bật dữ liệu mẫu; ở chế độ live trang này hiển thị trạng thái rỗng.
  setTenantAdminDataMode('demo');
  const [searchQuery, setSearchQuery] = useState('');
  const [branch, setBranch] = useState('ALL');
  const [toast, setToast] = useState('');
  return (
    <div className="role-shell role-shell--tenant" style={{ minHeight: '100vh' }}>
      <main className="role-main" style={{ maxWidth: '93.75rem', margin: '0 auto', padding: '1.5rem 1.5rem 6rem' }}>
        {toast && <p role="status" style={{ marginBottom: '1rem', color: 'var(--accent-strong)' }}>{toast}</p>}
        <TenantAdminReports
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedBranch={branch}
          onSelectedBranchChange={setBranch}
          branches={[{ code: 'Q3', name: 'Chi nhánh Quận 3' }, { code: 'Q1', name: 'Chi nhánh Quận 1' }]}
          tenantName={PREVIEW_TENANT}
          roleLabel="Owner · Tenant Admin"
          accessMode="full"
          onNotify={setToast}
        />
      </main>
    </div>
  );
}

const TOAST_SAMPLES: Record<ToastTone, string> = {
  success: 'Đã lưu thay đổi.',
  info: 'Đang tải xuống báo cáo doanh thu...',
  warning: 'Gói Basic chỉ hỗ trợ tối đa 1 chi nhánh.',
  error: 'Mã tenant "TEN-AURORA" đã tồn tại.'
};

function Preview() {
  const showToast = useToast();
  const [tab, setTab] = useState<'library' | 'stations' | 'services' | 'settings' | 'appointments' | 'reports' | 'reception' | 'portal'>('library');
  const [shell, setShell] = useState<Shell>('superadmin');
  const [modalOpen, setModalOpen] = useState(false);
  const [tableState, setTableState] = useState<'data' | 'loading' | 'empty' | 'error'>('data');
  const [salonName, setSalonName] = useState('');
  const [saving, setSaving] = useState(false);

  const nameError = salonName.trim().length > 0 && salonName.trim().length < 3
    ? 'Tên tiệm phải có ít nhất 3 ký tự.'
    : undefined;

  if (tab !== 'library') {
    return (
      <>
        <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 20000 }}>
          <Button size="small" variant="secondary" onClick={() => setTab('library')}>← Thư viện</Button>
        </div>
        {tab === 'stations' ? <StationsPreview />
          : tab === 'services' ? <ServicesPreview />
          : tab === 'settings' ? <SettingsPreview />
            : tab === 'appointments' ? <AppointmentsPreview />
              : tab === 'reports' ? <ReportsPreview />
                : tab === 'reception' ? <ReceptionStationsPreview />
                  : <ReceptionPortalPreview />}
      </>
    );
  }

  return (
    <div className={`role-shell role-shell--${shell}`} style={{ minHeight: '100vh' }}>
      <main className="role-main" style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>
        <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button size="small" variant="primary" onClick={() => setTab('stations')}>
            Tenant · Ghế &amp; khu vực →
          </Button>
          <Button size="small" variant="primary" onClick={() => setTab('services')}>
            Tenant · Dịch vụ &amp; giá →
          </Button>
          <Button size="small" variant="primary" onClick={() => setTab('settings')}>
            Tenant · Cài đặt tiệm →
          </Button>
          <Button size="small" variant="primary" onClick={() => setTab('appointments')}>
            Tenant &amp; Lễ tân · Lịch hẹn →
          </Button>
          <Button size="small" variant="primary" onClick={() => setTab('reports')}>
            Tenant · Báo cáo →
          </Button>
          <Button size="small" variant="primary" onClick={() => setTab('reception')}>
            Lễ tân · Ghế &amp; phòng →
          </Button>
          <Button size="small" variant="primary" onClick={() => setTab('portal')}>
            Lễ tân · Toàn bộ cổng (shell) →
          </Button>
        </div>
        <h1 style={{ marginBottom: '0.5rem' }}>Thư viện component dùng chung</h1>
        <p style={{ color: 'var(--color-brand-text-muted)', marginBottom: '2rem' }}>
          Đổi vai trò để kiểm tra accent của từng cổng. Mọi component dưới đây chỉ dùng design token.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          {(['superadmin', 'tenant', 'reception'] as Shell[]).map((value) => (
            <Button
              key={value}
              variant={shell === value ? 'primary' : 'secondary'}
              size="small"
              onClick={() => setShell(value)}
            >
              {value}
            </Button>
          ))}
        </div>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Button</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Button variant="primary">Lưu thay đổi</Button>
            <Button variant="secondary">Hủy</Button>
            <Button variant="ghost">Xem chi tiết</Button>
            <Button variant="danger" iconLeading={<Trash2 />}>Xóa tenant</Button>
            <Button variant="link">Tài liệu hướng dẫn</Button>
            <Button variant="primary" loading>Đang lưu</Button>
            <Button variant="primary" disabled>Không khả dụng</Button>
            <Button variant="secondary" iconOnly aria-label="Thêm tenant"><Plus /></Button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.75rem' }}>
            <Button size="small">Small</Button>
            <Button size="medium">Medium</Button>
            <Button size="large">Large</Button>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>StatusBadge</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(Object.keys(STATUS_MAP) as StatusKey[]).map((key) => (
              <StatusBadge key={key} status={key} />
            ))}
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem', maxWidth: '28rem' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Field</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <Field
              label="Tên tiệm"
              required
              helper="Tên hiển thị cho khách khi đặt lịch online."
              error={nameError}
            >
              <input
                type="text"
                value={salonName}
                onChange={(event) => setSalonName(event.target.value)}
                placeholder="Ví dụ: Nailé Studio"
              />
            </Field>

            <Field label="Ghi chú nội bộ" helper="Chỉ nhân sự của tiệm nhìn thấy.">
              <textarea rows={3} />
            </Field>

            <Field label="Không dùng được" disabled helper="Cần quyền quản trị để chỉnh.">
              <input type="text" defaultValue="Khóa bởi superadmin" />
            </Field>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>DataTable</h2>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {(['data', 'loading', 'empty', 'error'] as const).map((s) => (
              <Button key={s} size="small" variant={tableState === s ? 'primary' : 'secondary'} onClick={() => setTableState(s)}>
                {s}
              </Button>
            ))}
          </div>
          <DataTable<DemoRow>
            rows={tableState === 'data' ? ROWS : []}
            rowKey={(row) => row.id}
            loading={tableState === 'loading'}
            error={tableState === 'error' ? 'Máy chủ không phản hồi.' : undefined}
            onRetry={() => setTableState('data')}
            emptyTitle="Chưa có tenant nào"
            emptyDescription="Thêm tenant đầu tiên để bắt đầu theo dõi doanh thu."
            emptyAction={<Button size="small" variant="primary" iconLeading={<Plus />}>Thêm tenant</Button>}
            footer="Hiển thị 4 trên tổng 8 tenant"
            columns={[
              { key: 'name', header: 'Tenant', cell: (row) => row.name },
              { key: 'id', header: 'Mã', cell: (row) => row.id, hideBelow: 'md' },
              { key: 'status', header: 'Trạng thái', cell: (row) => <StatusBadge status={row.status} size="small" /> },
              { key: 'revenue', header: 'Doanh thu tháng', numeric: true, cell: (row) => dong(row.revenue) },
              {
                key: 'actions',
                header: 'Thao tác',
                actions: true,
                headerSrOnly: true,
                cell: () => <Button size="small" variant="ghost">Xem</Button>,
              },
            ]}
          />
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Toast</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['success', 'info', 'warning', 'error'] as ToastTone[]).map((tone) => (
              <Button key={tone} size="small" variant="secondary" onClick={() => showToast(TOAST_SAMPLES[tone], tone)}>
                {tone}
              </Button>
            ))}
            <Button
              size="small"
              variant="secondary"
              onClick={() => showToast('Không lưu được gói dịch vụ', 'error', {
                description: 'Máy chủ chưa xác nhận thao tác. Vui lòng thử lại sau ít phút.'
              })}
            >
              kèm mô tả
            </Button>
          </div>
        </section>

        <section>
          <h2 style={{ marginBottom: '0.75rem' }}>Modal</h2>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Mở hộp thoại
          </Button>

          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            eyebrow="Tenant"
            title="Tạm ngưng Aurora Beauty & Spa"
            description="Tenant sẽ mất quyền truy cập cho tới khi được kích hoạt lại."
            headerAside={<StatusBadge status="ACTIVE" size="small" />}
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Hủy
                </Button>
                <Button
                  variant="danger"
                  loading={saving}
                  onClick={() => {
                    setSaving(true);
                    window.setTimeout(() => {
                      setSaving(false);
                      setModalOpen(false);
                    }, 900);
                  }}
                >
                  Tạm ngưng tenant
                </Button>
              </>
            }
          >
            <div style={{ display: 'grid', gap: '1rem' }}>
              <p style={{ margin: 0 }}>
                Nhấn Tab để kiểm tra focus có bị giữ trong hộp thoại không. Nhấn Escape để đóng và
                kiểm tra focus có quay lại nút mở không.
              </p>
              <Field label="Lý do tạm ngưng" required helper="Lý do được ghi vào nhật ký hệ thống.">
                <input type="text" placeholder="Ví dụ: quá hạn thanh toán 30 ngày" />
              </Field>
            </div>
          </Modal>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <Preview />
    </ToastProvider>
  </StrictMode>
);
