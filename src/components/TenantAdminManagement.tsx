import BeautifulSelect from './BeautifulSelect';
import React, { useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  CreditCard,
  Edit,
  Eye,
  Key,
  Lock,
  Mail,
  MapPin,
  MinusCircle,
  Search,
  Settings,
  Shield,
  Store,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { SubscriptionPackage, Tenant, TenantAdminAccount } from '../types';
import {
  getSubscriptionBranchLimit,
  getSubscriptionStaffLimit,
  isUnlimitedBranches,
  isUnlimitedStaff
} from '../utils/subscriptions';
import { Modal, useToast } from './ui';

interface TenantAdminManagementProps {
  tenants: Tenant[];
  packages: SubscriptionPackage[];
  invitedAdmins: TenantAdminAccount[];
  onInvitedAdminsChange: (admins: TenantAdminAccount[]) => void;
  onUpdateTenant: (id: string, updated: Partial<Tenant>) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

type AdminRole = 'Owner' | 'Manager' | 'Staff';
type AdminStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

interface AdminUser extends TenantAdminAccount {}

const permissionsByRole: Record<AdminRole, string[]> = {
  Owner: [
    'Quản lý nhân viên',
    'Quản lý lịch hẹn',
    'Quản lý dịch vụ',
    'Quản lý khách hàng',
    'Xem báo cáo',
    'Cấu hình tenant'
  ],
  Manager: [
    'Quản lý nhân viên',
    'Quản lý lịch hẹn',
    'Quản lý dịch vụ',
    'Quản lý khách hàng',
    'Xem báo cáo'
  ],
  Staff: [
    'Quản lý lịch hẹn',
    'Quản lý khách hàng'
  ]
};

const getDefaultStatus = (tenant: Tenant): AdminStatus => {
  if (tenant.adminStatus) return tenant.adminStatus;
  if (tenant.status === 'SUSPENDED') return 'SUSPENDED';
  return 'ACTIVE';
};

const getTenantLimits = (tenant: Tenant, packages: SubscriptionPackage[]) => {
  const staffLimit = getSubscriptionStaffLimit(packages, tenant.packageName);
  const branchLimit = getSubscriptionBranchLimit(packages, tenant.packageName);

  return { staffLimit, branchLimit };
};

const formatLimit = (limit: number, unlimitedThreshold: number) => (
  limit >= unlimitedThreshold ? 'Không giới hạn' : `${limit}`
);

const getAggregateLimitLabel = (used: number, limits: number[], unlimitedThreshold: number) => {
  if (limits.some((limit) => limit >= unlimitedThreshold)) {
    return `${used} / Không giới hạn`;
  }

  return `${used} / ${limits.reduce((sum, limit) => sum + limit, 0)}`;
};

const getPackageNamesLabel = (tenants: Tenant[]) => {
  const packages = Array.from(new Set(tenants.map((tenant) => tenant.packageName).filter(Boolean)));
  if (packages.length === 0) return 'Chưa có gói';
  return packages.join(', ');
};

const areSameIds = (left: string[], right: string[]) => (
  left.length === right.length && [...left].sort().every((id, index) => id === [...right].sort()[index])
);

const getTenantExpiryLabel = (tenant: Tenant) => {
  if (tenant.daysRemaining === undefined) return 'Chưa có dữ liệu';
  const date = new Date();
  date.setDate(date.getDate() + tenant.daysRemaining);
  return date.toLocaleDateString('vi-VN');
};

const getStatusLabel = (status: AdminStatus) => {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'INACTIVE':
      return 'Inactive';
    case 'SUSPENDED':
      return 'Suspended';
    case 'PENDING_VERIFICATION':
      return 'Pending verification';
    default:
      return status;
  }
};

const buildTenantAdmins = (tenants: Tenant[], statusOverrides: Record<string, AdminStatus>): AdminUser[] => {
  const grouped = tenants.reduce<Record<string, AdminUser>>((acc, tenant) => {
    const email = tenant.adminEmail.trim().toLowerCase();
    if (!email) return acc;

    const id = tenant.tenantAdminId || `ADM-${email.replace(/[^a-z0-9]/g, '').slice(0, 10)}`;
    const existing = acc[email];

    if (existing) {
      existing.tenantName = `${existing.tenantName}, ${tenant.name}`;
      existing.tenantCount += 1;
      existing.tenantIds.push(tenant.id);
      existing.lastActive = tenant.lastLogin || existing.lastActive;
      if (!statusOverrides[existing.id] && (tenant.adminStatus === 'SUSPENDED' || tenant.status === 'SUSPENDED')) {
        existing.status = 'SUSPENDED';
      }
      return acc;
    }

    const fallbackUsername = tenant.adminEmail.split('@')[0] || tenant.adminEmail;

    acc[email] = {
      id,
      adminCode: id,
      name: tenant.adminName || 'Chưa cập nhật',
      email: tenant.adminEmail,
      username: tenant.adminUsername || fallbackUsername,
      tenantName: tenant.name,
      tenantCount: 1,
      tenantIds: [tenant.id],
      role: 'Owner',
      status: statusOverrides[id] || getDefaultStatus(tenant),
      lastActive: tenant.lastLogin || 'Chưa hoạt động',
      phone: tenant.adminPhone || tenant.phone || 'Chưa cập nhật',
      avatarUrl: tenant.adminAvatarUrl || tenant.logoUrl,
      country: tenant.adminCountry || tenant.country || 'Vietnam',
      timezone: tenant.adminTimezone || tenant.timezone || 'Asia/Ho_Chi_Minh',
      address: tenant.adminAddress || tenant.address,
      note: tenant.internalNotes,
      tempPassword: tenant.adminTempPassword,
      sendActivationEmail: tenant.adminSendActivationEmail,
      createdAt: tenant.createdAt,
      emailVerified: tenant.adminEmailVerified ?? tenant.adminCreationMode !== 'new',
      phoneVerified: tenant.adminPhoneVerified ?? (tenant.adminCreationMode !== 'new' && !!(tenant.adminPhone || tenant.phone)),
      source: 'TENANT'
    };

    return acc;
  }, {});

  return Object.values(grouped);
};

const StatusBadge = ({ status }: { status: AdminStatus }) => {
  const cls = status === 'ACTIVE'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : status === 'PENDING_VERIFICATION'
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    : 'bg-brand-error/10 text-brand-error border-brand-error/20';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-semibold border ${cls}`}>
      {status === 'ACTIVE' ? <CheckCircle className="w-3 h-3" /> : <MinusCircle className="w-3 h-3" />}
      {getStatusLabel(status)}
    </span>
  );
};

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="bg-brand-surface-lowest border border-brand-outline/30 rounded-lg p-3 min-w-0">
    <p className="text-caption uppercase font-bold text-brand-text-muted">{label}</p>
    <div className="text-sm font-semibold text-brand-text mt-1 break-words">{value}</div>
  </div>
);

const SectionTitle = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2">
    <Icon className="w-4 h-4 text-brand-primary" />
    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted">{title}</h3>
  </div>
);

const generateAdminCode = () => `TA-${Math.floor(1000 + Math.random() * 9000)}`;

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const getDefaultTimezoneForCountry = (country: string) => {
  switch (country) {
    case 'Vietnam':
      return 'Asia/Ho_Chi_Minh';
    case 'United States':
      return 'America/New_York';
    case 'Canada':
      return 'America/Toronto';
    case 'Australia':
      return 'Australia/Sydney';
    case 'Japan':
      return 'Asia/Tokyo';
    case 'Korea':
      return 'Asia/Seoul';
    default:
      return 'Asia/Ho_Chi_Minh';
  }
};

export default function TenantAdminManagement({ tenants, packages, invitedAdmins, onInvitedAdminsChange, onUpdateTenant, showConfirm }: TenantAdminManagementProps) {
  const showToast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminRole>('ALL');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [expandedBranchTenantIds, setExpandedBranchTenantIds] = useState<string[]>([]);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AdminStatus>>({});
  const setInvitedAdmins = onInvitedAdminsChange;

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteAdminCode, setInviteAdminCode] = useState(generateAdminCode);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteAvatar, setInviteAvatar] = useState('');
  const [inviteCountry, setInviteCountry] = useState('Vietnam');
  const [inviteTimezone, setInviteTimezone] = useState('Asia/Ho_Chi_Minh');
  const [inviteAddress, setInviteAddress] = useState('');
  const [inviteTempPassword, setInviteTempPassword] = useState(generateTempPassword);
  const [inviteSendActivationEmail, setInviteSendActivationEmail] = useState(true);
  const [inviteNote, setInviteNote] = useState('');

  const [editAdminCode, setEditAdminCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editCountry, setEditCountry] = useState('Vietnam');
  const [editTimezone, setEditTimezone] = useState('Asia/Ho_Chi_Minh');
  const [editAddress, setEditAddress] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editSendActivationEmail, setEditSendActivationEmail] = useState(false);
  const [editEmailVerified, setEditEmailVerified] = useState(false);
  const [editPhoneVerified, setEditPhoneVerified] = useState(false);
  const [editTenantIds, setEditTenantIds] = useState<string[]>([]);
  const [editTenantScopeEnabled, setEditTenantScopeEnabled] = useState(false);

  const tenantAdmins = useMemo(
    () => buildTenantAdmins(tenants, statusOverrides),
    [tenants, statusOverrides]
  );

  const admins = useMemo(() => {
    const tenantAdminEmails = new Set(tenantAdmins.map((admin) => admin.email.toLowerCase()));
    const visibleInvitedAdmins = invitedAdmins.filter((admin) => !tenantAdminEmails.has(admin.email.toLowerCase()));
    return [...tenantAdmins, ...visibleInvitedAdmins];
  }, [tenantAdmins, invitedAdmins]);

  const updateAdminStatus = (admin: AdminUser, nextStatus: AdminStatus) => {
    setStatusOverrides((prev) => ({ ...prev, [admin.id]: nextStatus }));

    // Đồng bộ trạng thái admin xuống các tenant thuộc quyền quản lý của admin này
    admin.tenantIds.forEach((tenantId) => {
      onUpdateTenant(tenantId, { adminStatus: nextStatus });
    });

    if (
      admin.source === 'INVITED' ||
      invitedAdmins.some((item) => item.id === admin.id || item.email.toLowerCase() === admin.email.toLowerCase())
    ) {
      setInvitedAdmins(
        invitedAdmins.map((item) =>
          item.id === admin.id || item.email.toLowerCase() === admin.email.toLowerCase()
            ? { ...item, status: nextStatus }
            : item
        )
      );
    }

    setSelectedAdmin((current) => current?.id === admin.id ? { ...current, status: nextStatus } : current);
  };

  const resetInviteForm = () => {
    setInviteName('');
    setInviteEmail('');
    setInvitePhone('');
    setInviteAdminCode(generateAdminCode());
    setInviteUsername('');
    setInviteAvatar('');
    setInviteCountry('Vietnam');
    setInviteTimezone('Asia/Ho_Chi_Minh');
    setInviteAddress('');
    setInviteTempPassword(generateTempPassword());
    setInviteSendActivationEmail(true);
    setInviteNote('');
  };

  const handleInviteCountryChange = (country: string) => {
    setInviteCountry(country);
    setInviteTimezone(getDefaultTimezoneForCountry(country));
  };

  const handleInviteAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setInviteAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const openEditAdmin = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditAdminCode(admin.adminCode || admin.id);
    setEditName(admin.name);
    setEditEmail(admin.email);
    setEditUsername(admin.username || admin.email.split('@')[0] || admin.email);
    setEditPhone(admin.phone === 'Chưa cập nhật' ? '' : admin.phone);
    setEditAvatar(admin.avatarUrl || '');
    setEditCountry(admin.country || 'Vietnam');
    setEditTimezone(admin.timezone || 'Asia/Ho_Chi_Minh');
    setEditAddress(admin.address || '');
    setEditPassword('');
    setEditNote(admin.note || '');
    setEditSendActivationEmail(admin.sendActivationEmail === true);
    setEditEmailVerified(admin.emailVerified === true);
    setEditPhoneVerified(admin.phoneVerified === true);
    setEditTenantIds(admin.tenantIds);
    setEditTenantScopeEnabled(false);
  };

  const handleEditCountryChange = (country: string) => {
    setEditCountry(country);
    setEditTimezone(getDefaultTimezoneForCountry(country));
  };

  const handleEditAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setEditAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleEditTenant = (tenantId: string) => {
    if (!editingAdmin) return;
    const tenant = tenants.find((item) => item.id === tenantId);
    const isManagedByCurrentAdmin = editingAdmin.tenantIds.includes(tenantId);
    const isManagedByOtherAdmin = Boolean(tenant?.adminEmail?.trim()) && !isManagedByCurrentAdmin;
    if (isManagedByOtherAdmin) {
      showToast(`Tiệm "${tenant?.name}" đã có Tenant Admin quản lí. Vui lòng gỡ/chuyển admin hiện tại trước khi gán cho admin khác.`, 'error');
      return;
    }

    setEditTenantIds((current) => (
      current.includes(tenantId)
        ? current.filter((id) => id !== tenantId)
        : [...current, tenantId]
    ));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    const nextName = editName.trim();
    const nextEmail = editEmail.trim();
    const nextUsername = editUsername.trim();
    const nextPhone = editPhone.trim();
    const nextAdminCode = editAdminCode.trim() || editingAdmin.id;
    const nextPassword = editPassword.trim();
    const nextTenantIds = editTenantScopeEnabled ? editTenantIds : editingAdmin.tenantIds;
    const originalPhone = editingAdmin.phone === 'Chưa cập nhật' ? '' : editingAdmin.phone;
    const originalAddress = editingAdmin.address || '';
    const originalNote = editingAdmin.note || '';

    if (!nextName || !nextEmail || !nextUsername || !nextPhone) {
      showToast('Vui lòng điền đầy đủ Tên, Gmail, Username và SĐT của Tenant Admin.', 'error');
      return;
    }

    if (nextUsername.includes('@')) {
      showToast('Username đăng nhập không dùng định dạng Gmail. Vui lòng nhập username riêng.', 'error');
      return;
    }

    if (nextPassword && nextPassword.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự.', 'error');
      return;
    }

    if (editingAdmin.source === 'TENANT' && nextTenantIds.length === 0) {
      showToast('Tenant Admin đang hoạt động phải quản lý ít nhất 1 tiệm.', 'error');
      return;
    }

    const tenantOwnedByOther = tenants.find((tenant) => (
      nextTenantIds.includes(tenant.id) &&
      !editingAdmin.tenantIds.includes(tenant.id) &&
      Boolean(tenant.adminEmail?.trim())
    ));
    if (tenantOwnedByOther) {
      showToast(`Không thể gán tiệm "${tenantOwnedByOther.name}" vì tiệm này đã có Tenant Admin quản lí (${tenantOwnedByOther.adminEmail}).`, 'error');
      return;
    }

    const emailExists = admins.some((admin) => (
      admin.id !== editingAdmin.id &&
      admin.email.trim().toLowerCase() === nextEmail.toLowerCase()
    ));
    if (emailExists) {
      showToast('Gmail của Tenant Admin đã tồn tại trên hệ thống.', 'error');
      return;
    }

    const adminCodeExists = admins.some((admin) => (
      admin.id !== editingAdmin.id &&
      (admin.adminCode || admin.id).trim().toLowerCase() === nextAdminCode.toLowerCase()
    ));
    if (adminCodeExists) {
      showToast('Mã Tenant Admin đã tồn tại trên hệ thống.', 'error');
      return;
    }

    const changedFields: string[] = [];
    if (nextAdminCode !== (editingAdmin.adminCode || editingAdmin.id)) changedFields.push('Mã Tenant Admin');
    if (nextName !== editingAdmin.name) changedFields.push('Họ tên');
    if (nextEmail.toLowerCase() !== editingAdmin.email.toLowerCase()) changedFields.push('Gmail');
    if (nextUsername !== (editingAdmin.username || '')) changedFields.push('Username');
    if (nextPhone !== originalPhone) changedFields.push('Số điện thoại');
    if ((editAvatar || '') !== (editingAdmin.avatarUrl || '')) changedFields.push('Ảnh đại diện');
    if (editCountry !== (editingAdmin.country || 'Vietnam')) changedFields.push('Quốc gia');
    if (editTimezone !== (editingAdmin.timezone || 'Asia/Ho_Chi_Minh')) changedFields.push('Timezone');
    if ((editAddress.trim() || '') !== originalAddress) changedFields.push('Địa chỉ liên hệ');
    if (nextPassword) changedFields.push('Mật khẩu');
    if ((editNote.trim() || '') !== originalNote) changedFields.push('Ghi chú nội bộ');
    if (editTenantScopeEnabled && !areSameIds(nextTenantIds, editingAdmin.tenantIds)) changedFields.push('Tiệm đang quản lí');

    if (changedFields.length === 0) {
      showToast('Chưa có thông tin nào thay đổi.', 'info');
      return;
    }

    const nextEmailVerified = nextEmail.toLowerCase() === editingAdmin.email.toLowerCase()
      ? editEmailVerified
      : false;
    const nextPhoneVerified = nextPhone === (editingAdmin.phone === 'Chưa cập nhật' ? '' : editingAdmin.phone)
      ? editPhoneVerified
      : false;
    const nextTempPassword = nextPassword || editingAdmin.tempPassword;

    const updatedAdmin: AdminUser = {
      ...editingAdmin,
      id: nextAdminCode,
      adminCode: nextAdminCode,
      name: nextName,
      email: nextEmail,
      username: nextUsername,
      tenantName: tenants
        .filter((tenant) => nextTenantIds.includes(tenant.id))
        .map((tenant) => tenant.name)
        .join(', ') || 'Chưa liên kết tiệm',
      tenantCount: nextTenantIds.length,
      tenantIds: nextTenantIds,
      phone: nextPhone,
      avatarUrl: editAvatar || undefined,
      country: editCountry,
      timezone: editTimezone,
      address: editAddress.trim() || 'Chưa cập nhật',
      note: editNote.trim() || undefined,
      tempPassword: nextTempPassword,
      sendActivationEmail: editSendActivationEmail || Boolean(nextPassword),
      emailVerified: nextEmailVerified,
      phoneVerified: nextPhoneVerified
    };

    const applyEditChanges = () => {
      if (editingAdmin.source === 'INVITED') {
      setInvitedAdmins(invitedAdmins.map((admin) => admin.id === editingAdmin.id ? updatedAdmin : admin));
      nextTenantIds.forEach((tenantId) => {
        onUpdateTenant(tenantId, {
          tenantAdminId: nextAdminCode,
          adminName: nextName,
          adminEmail: nextEmail,
          adminUsername: nextUsername,
          adminPhone: nextPhone,
          adminAvatarUrl: editAvatar || undefined,
          adminCountry: editCountry,
          adminTimezone: editTimezone,
          adminAddress: editAddress.trim() || 'Chưa cập nhật',
          adminTempPassword: nextTempPassword,
          adminSendActivationEmail: editSendActivationEmail || Boolean(nextPassword),
          adminEmailVerified: nextEmailVerified,
          adminPhoneVerified: nextPhoneVerified,
          internalNotes: editNote.trim() || undefined
        });
      });
      } else {
      editingAdmin.tenantIds
        .filter((tenantId) => !nextTenantIds.includes(tenantId))
        .forEach((tenantId) => {
          onUpdateTenant(tenantId, {
            tenantAdminId: undefined,
            adminName: 'Chưa gán Owner',
            adminEmail: '',
            adminUsername: undefined,
            adminPhone: undefined,
            adminAvatarUrl: undefined,
            adminCountry: undefined,
            adminTimezone: undefined,
            adminAddress: undefined,
            adminTempPassword: undefined,
            adminSendActivationEmail: false,
            adminEmailVerified: false,
            adminPhoneVerified: false
          });
        });

      nextTenantIds.forEach((tenantId) => {
        onUpdateTenant(tenantId, {
          tenantAdminId: nextAdminCode,
          adminName: nextName,
          adminEmail: nextEmail,
          adminUsername: nextUsername,
          adminPhone: nextPhone,
          adminAvatarUrl: editAvatar || undefined,
          adminCountry: editCountry,
          adminTimezone: editTimezone,
          adminAddress: editAddress.trim() || 'Chưa cập nhật',
          adminTempPassword: nextTempPassword,
          adminSendActivationEmail: editSendActivationEmail || Boolean(nextPassword),
          adminEmailVerified: nextEmailVerified,
          adminPhoneVerified: nextPhoneVerified,
          internalNotes: editNote.trim() || undefined
        });
      });
      }

      setSelectedAdmin((current) => current?.id === editingAdmin.id ? updatedAdmin : current);
      setEditingAdmin(null);
      showToast(`Đã cập nhật Tenant Admin "${nextName}".`);
    };

    showConfirm(
      'Xác nhận cập nhật Tenant Admin',
      `Bạn có chắc chắn muốn lưu thay đổi cho "${editingAdmin.name}" không? Thay đổi: ${changedFields.join(', ')}.`,
      applyEditChanges
    );
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      showToast('Vui lòng điền tên và email.', 'error');
      return;
    }

    const emailExists = admins.some((admin) => admin.email.trim().toLowerCase() === inviteEmail.trim().toLowerCase());
    if (emailExists) {
      showToast('Email Tenant Admin này đã tồn tại.', 'error');
      return;
    }

    const normalizedAdminCode = inviteAdminCode.trim() || `ADM-INV-${Date.now()}`;
    const adminCodeExists = admins.some((admin) => (
      (admin.adminCode || admin.id).trim().toLowerCase() === normalizedAdminCode.toLowerCase()
    ));
    if (adminCodeExists) {
      showToast('Mã Tenant Admin này đã tồn tại.', 'error');
      return;
    }

    if (inviteTempPassword.trim() && inviteTempPassword.trim().length < 6) {
      showToast('Mật khẩu tạm phải có ít nhất 6 ký tự.', 'error');
      return;
    }

    const normalizedUsername = inviteUsername.trim() || inviteEmail.trim().split('@')[0];
    if (normalizedUsername.includes('@')) {
      showToast('Username đăng nhập không dùng định dạng email.', 'error');
      return;
    }

    const newAdmin: AdminUser = {
      id: normalizedAdminCode,
      adminCode: normalizedAdminCode,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      username: normalizedUsername,
      tenantName: 'Chưa liên kết tiệm',
      tenantCount: 0,
      tenantIds: [],
      role: 'Owner',
      status: 'PENDING_VERIFICATION',
      lastActive: 'Chưa hoạt động',
      phone: invitePhone.trim() || 'Chưa cập nhật',
      avatarUrl: inviteAvatar || undefined,
      country: inviteCountry,
      timezone: inviteTimezone,
      address: inviteAddress.trim() || 'Chưa cập nhật',
      note: inviteNote.trim() || undefined,
      tempPassword: inviteTempPassword.trim() || undefined,
      sendActivationEmail: inviteSendActivationEmail,
      createdAt: new Date().toISOString().slice(0, 10),
      emailVerified: false,
      phoneVerified: false,
      source: 'INVITED'
    };

    setInvitedAdmins([newAdmin, ...invitedAdmins]);
    resetInviteForm();
    setShowInviteModal(false);
    showToast(`Đã thêm Tenant Admin "${newAdmin.name}". Admin này chưa liên kết tiệm; hãy gán khi tạo hoặc cập nhật tenant.`);
  };

  const toggleAdminStatus = (admin: AdminUser) => {
    if (admin.status === 'ACTIVE' || admin.status === 'PENDING_VERIFICATION') {
      const tenantCount = admin.tenantCount || admin.tenantIds.length;
      const tenantDesc = tenantCount > 0
        ? `Tài khoản này đang quản lý ${tenantCount} tenant (${admin.tenantName || 'tiệm liên kết'}). Khi bị khóa, quyền đăng nhập quản trị của Admin này sẽ bị tạm dừng và các tenant trực thuộc sẽ hiển thị làm mờ kèm nhãn cảnh báo "Admin đã bị khóa".`
        : `Tài khoản này sẽ bị đình chỉ quyền truy cập vào hệ thống.`;

      showConfirm(
        'Xác nhận khóa Tenant Admin',
        `Bạn có chắc chắn muốn khóa tài khoản Tenant Admin "${admin.name}" (${admin.email})?\n\n${tenantDesc}`,
        () => {
          updateAdminStatus(admin, 'SUSPENDED');
          showToast(`Đã khóa tạm thời tài khoản Tenant Admin "${admin.name}". Các tenant trực thuộc đã được cập nhật trạng thái làm mờ và gắn cờ cảnh báo.`);
        }
      );
    } else {
      showConfirm(
        'Xác nhận mở khóa Tenant Admin',
        `Bạn có chắc chắn muốn mở khóa cho Tenant Admin "${admin.name}" (${admin.email})? Quyền đăng nhập và quản lý các tenant (${admin.tenantName || 'tiệm liên kết'}) sẽ được khôi phục.`,
        () => {
          updateAdminStatus(admin, 'ACTIVE');
          showToast(`Đã kích hoạt lại tài khoản Tenant Admin "${admin.name}".`);
        }
      );
    }
  };

  const deleteAdmin = (admin: AdminUser) => {
    const isTenantAdmin = admin.source === 'TENANT';
    showConfirm(
      isTenantAdmin ? 'Không xóa trực tiếp Tenant Admin' : 'Gỡ quyền quản trị',
      isTenantAdmin
        ? `Admin ${admin.name} đang được liên kết với ${admin.tenantCount} tenant. Muốn xóa hoàn toàn, hãy đổi admin trong các tenant liên quan trước. Bạn có muốn khóa tài khoản này tạm thời không?`
        : `Bạn chắc chắn muốn gỡ quyền quản trị của ${admin.name}?`,
      () => {
        if (isTenantAdmin) {
          updateAdminStatus(admin, 'SUSPENDED');
          showToast('Đã khóa tạm thời Tenant Admin.');
          return;
        }
        setInvitedAdmins(invitedAdmins.filter((item) => item.id !== admin.id));
        if (selectedAdmin?.id === admin.id) setSelectedAdmin(null);
        showToast('Đã gỡ quyền quản trị viên.');
      }
    );
  };

  const filteredAdmins = admins.filter((admin) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      admin.name.toLowerCase().includes(query) ||
      admin.email.toLowerCase().includes(query) ||
      admin.tenantName.toLowerCase().includes(query);

    const matchesRole = roleFilter === 'ALL' || admin.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const selectedAdminTenants = selectedAdmin
    ? tenants.filter((tenant) => {
        if (selectedAdmin.source === 'TENANT') {
          return tenant.adminEmail.trim().toLowerCase() === selectedAdmin.email.trim().toLowerCase();
        }
        return tenant.name === selectedAdmin.tenantName;
      })
    : [];

  const toggleTenantBranches = (tenantId: string) => {
    setExpandedBranchTenantIds((current) => (
      current.includes(tenantId)
        ? current.filter((id) => id !== tenantId)
        : [...current, tenantId]
    ));
  };

  const getVisibleBranches = (tenant: Tenant) => {
    if (tenant.branches?.length) return tenant.branches;

    const limits = getTenantLimits(tenant, packages);
    return [{
      id: `${tenant.id}-main-branch`,
      name: `${tenant.name} - Chi nhánh chính`,
      address: tenant.address || 'Chưa cập nhật',
      staffUsed: tenant.staffCount || 0,
      staffLimit: limits.staffLimit,
      status: tenant.status === 'SUSPENDED' ? 'INACTIVE' as const : 'ACTIVE' as const,
      staffCount: tenant.staffCount || 0
    }];
  };

  const primaryTenant = selectedAdminTenants[0];
  const permissions = selectedAdmin ? permissionsByRole[selectedAdmin.role] : [];
  const totalBranches = selectedAdminTenants.reduce((sum, tenant) => sum + (tenant.branches?.length || 1), 0);
  const totalStaffUsed = selectedAdminTenants.reduce((sum, tenant) => sum + Number(tenant.staffCount || 0), 0);
  const selectedTenantLimits = selectedAdminTenants.map((tenant) => getTenantLimits(tenant, packages));
  const packageScopeLabel = getPackageNamesLabel(selectedAdminTenants);
  const branchScopeLabel = selectedAdminTenants.length === 1
    ? `Đang dùng ${totalBranches} chi nhánh, giới hạn ${formatLimit(selectedTenantLimits[0]?.branchLimit || 0, 99)}`
    : `Đang dùng ${totalBranches} chi nhánh, tổng giới hạn ${getAggregateLimitLabel(totalBranches, selectedTenantLimits.map((limits) => limits.branchLimit), 99).split(' / ')[1] || '0'}`;
  const staffScopeLabel = selectedAdminTenants.length === 1
    ? `${totalStaffUsed} / ${formatLimit(selectedTenantLimits[0]?.staffLimit || 0, 999)} người dùng`
    : `${getAggregateLimitLabel(totalStaffUsed, selectedTenantLimits.map((limits) => limits.staffLimit), 999)} người dùng`;
  const accessScopeLabel = selectedAdminTenants.length === 0
    ? 'Chưa gán tenant'
    : selectedAdmin?.role === 'Owner'
      ? `Owner theo gói ${packageScopeLabel}`
      : `${permissions.length} quyền theo gói ${packageScopeLabel}`
  const selectedAdminActions = selectedAdmin ? (
    <>
              <button
                type="button"
                onClick={() => toggleAdminStatus(selectedAdmin)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedAdmin.status === 'ACTIVE'
                    ? 'bg-brand-error/10 text-brand-error border border-brand-error/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                {selectedAdmin.status === 'ACTIVE' ? 'Khóa tạm thời' : 'Mở khóa'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedAdmin(null)}
                className="bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary px-5 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
    </>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-text tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-primary" />
            <span>Quản lí Tenant Admin</span>
          </h1>
          <p className="text-xs text-brand-text-muted mt-1">
            Dữ liệu được đồng bộ trực tiếp từ danh sách tenant. Khi tạo hoặc sửa tenant, admin sẽ tự cập nhật tại đây.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary text-sm font-bold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-md self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm Admin</span>
        </button>
      </div>

      <div className="bg-brand-surface border border-brand-outline/35 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, tiệm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-brand-surface-lowest border border-brand-outline/45 rounded-lg pl-9 pr-4 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-primary placeholder:text-brand-text-muted/60"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-brand-text-muted">Chức vụ:</span>
          <div className="flex rounded-lg border border-brand-outline/35 overflow-hidden">
            {(['ALL', 'Owner', 'Manager', 'Staff'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`
                  px-3 py-1 text-body font-medium transition-colors cursor-pointer
                  ${roleFilter === role
                    ? 'bg-brand-primary text-brand-on-primary'
                    : 'bg-brand-surface hover:bg-brand-surface-high text-brand-text-muted'
                  }
                `}
              >
                {role === 'ALL' ? 'Tất cả' : role}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-brand-surface border border-brand-outline/40 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-outline/35 bg-brand-surface-lowest/40 text-caption font-bold text-brand-text-muted uppercase tracking-wider">
                <th className="py-3 px-5">Quản trị viên</th>
                <th className="py-3 px-5">Tiệm liên kết</th>
                <th className="py-3 px-5">Vai trò hệ thống</th>
                <th className="py-3 px-5">Hoạt động cuối</th>
                <th className="py-3 px-5">Trạng thái</th>
                <th className="py-3 px-5 text-center w-40 min-w-[150px] whitespace-nowrap">Hành động</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-brand-outline/25">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-brand-text-muted">
                    Không tìm thấy tài khoản quản trị nào
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isSuspended = admin.status === 'SUSPENDED';
                  return (
                  <tr
                    key={admin.id}
                    className={`transition-colors group ${
                      isSuspended
                        ? 'opacity-75 bg-rose-500/[0.04] dark:bg-rose-950/[0.12] hover:opacity-100 border-l-2 border-l-rose-500'
                        : 'hover:bg-brand-surface-high/25'
                    }`}
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold ${
                          isSuspended
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                            : 'bg-brand-surface-high border-brand-outline/30 text-brand-primary'
                        }`}>
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${isSuspended ? 'text-brand-text/90 line-through' : 'text-brand-text'}`}>
                              {admin.name}
                            </span>
                            {isSuspended && (
                              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[9px] border border-rose-500/25">
                                <Lock className="w-2.5 h-2.5" /> Bị khóa
                              </span>
                            )}
                          </div>
                          <span className="text-caption text-brand-text-muted flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {admin.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-brand-text-muted font-semibold flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-brand-primary/80" />
                        <span className="max-w-[260px] truncate" title={admin.tenantName}>
                          {admin.tenantName}
                        </span>
                      </span>
                      {admin.tenantCount > 1 && (
                        <span className="text-caption text-brand-text-muted/70 mt-1 block">{admin.tenantCount} tenant liên kết</span>
                      )}
                      {admin.tenantCount > 0 && isSuspended && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25 mt-1">
                          <Lock className="w-2.5 h-2.5" /> Tiệm trực thuộc bị giới hạn
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2 py-0.5 rounded text-caption font-bold ${
                        admin.role === 'Owner'
                          ? 'bg-brand-tertiary/10 text-brand-tertiary border border-brand-tertiary/20'
                          : admin.role === 'Manager'
                          ? 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20'
                          : 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                      }`}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-brand-text-muted font-medium tabular-nums">
                      {admin.lastActive}
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={admin.status} />
                    </td>
                    <td className="py-3.5 px-5 text-center w-40 min-w-[150px] whitespace-nowrap">
                      <div className="sa-row-actions inline-flex items-center justify-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelectedAdmin(admin)}
                          title="Xem chi tiết Tenant Admin"
                          className="p-1 rounded text-brand-text-muted hover:text-brand-primary hover:bg-brand-surface-high transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditAdmin(admin)}
                          title="Chỉnh sửa Tenant Admin"
                          className="p-1 rounded text-brand-text-muted hover:text-brand-secondary hover:bg-brand-surface-high transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleAdminStatus(admin)}
                          title={admin.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                          className={`p-1 rounded hover:bg-brand-surface-high transition-colors cursor-pointer ${
                            admin.status === 'ACTIVE' ? 'text-brand-text-muted hover:text-brand-error' : 'text-brand-text-muted hover:text-emerald-400'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteAdmin(admin)}
                          title={admin.source === 'TENANT' ? 'Khóa Tenant Admin' : 'Gỡ quyền quản trị'}
                          className="p-1 rounded text-brand-text-muted hover:text-brand-error hover:bg-brand-surface-high transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAdmin && (
        <Modal
          open
          onClose={() => setSelectedAdmin(null)}
          title="Chi tiết Tenant Admin"
          description="Hồ sơ quản trị, quyền hạn, tenant liên kết, bảo mật và lịch sử thao tác"
          size="fullscreen"
          footer={selectedAdminActions}
        >
            <div className="space-y-6">
              <section className="flex flex-col lg:flex-row gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-2xl font-black text-brand-primary shrink-0 overflow-hidden">
                  {selectedAdmin.avatarUrl ? (
                    <img src={selectedAdmin.avatarUrl} alt={selectedAdmin.name} className="w-full h-full object-cover" />
                  ) : (
                    selectedAdmin.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-brand-text truncate">{selectedAdmin.name}</h2>
                    <StatusBadge status={selectedAdmin.status} />
                  </div>
                  <p className="text-xs text-brand-text-muted mt-1">
                    {selectedAdmin.source === 'TENANT' ? 'Admin đồng bộ từ tenant' : 'Admin thêm thủ công'} · ID {selectedAdmin.adminCode || selectedAdmin.id}
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={UserCheck} title="Thông tin tài khoản" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <DetailItem label="Mã Tenant Admin" value={selectedAdmin.adminCode || selectedAdmin.id} />
                  <DetailItem label="Họ tên" value={selectedAdmin.name} />
                  <DetailItem label="Email" value={selectedAdmin.email} />
                  <DetailItem label="Số điện thoại" value={selectedAdmin.phone} />
                  <DetailItem label="Quốc gia" value={selectedAdmin.country || primaryTenant?.country || 'Vietnam'} />
                  <DetailItem label="Timezone" value={selectedAdmin.timezone || primaryTenant?.timezone || 'Asia/Ho_Chi_Minh'} />
                  <DetailItem label="Địa chỉ" value={selectedAdmin.address || 'Chưa cập nhật'} />
                  <DetailItem label="Ngày tạo" value={selectedAdmin.createdAt || primaryTenant?.createdAt || 'Chưa ghi nhận'} />
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Key} title="Thông tin đăng nhập" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <DetailItem label="Username / email đăng nhập" value={selectedAdmin.username || selectedAdmin.email} />
                  <DetailItem label="Lần đăng nhập gần nhất" value={selectedAdmin.lastActive} />
                  <DetailItem label="Xác thực email" value={selectedAdmin.emailVerified ? 'Đã xác thực' : 'Chờ xác thực'} />
                  <DetailItem label="Xác thực số điện thoại" value={selectedAdmin.phoneVerified ? 'Đã xác thực' : 'Chưa xác thực'} />
                  <DetailItem label="Mật khẩu tạm" value={selectedAdmin.tempPassword ? 'Đã tạo' : 'Không tạo'} />
                  <DetailItem label="Email kích hoạt" value={selectedAdmin.sendActivationEmail === false ? 'Không gửi' : 'Có gửi'} />
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Store} title="Tenant đang quản lí" />
                <div className="border border-brand-outline/35 rounded-xl overflow-hidden">
                  {selectedAdminTenants.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-brand-text-muted">
                      Chưa có tenant thật nào liên kết với admin này.
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-brand-surface-lowest/50 border-b border-brand-outline/30">
                        <tr className="text-caption uppercase font-bold text-brand-text-muted">
                          <th className="px-4 py-2.5">Tên tiệm / tenant code</th>
                          <th className="px-4 py-2.5">Địa chỉ</th>
                          <th className="px-4 py-2.5">Chi nhánh</th>
                          <th className="px-4 py-2.5">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-outline/25 text-xs">
                        {selectedAdminTenants.map((tenant) => {
                          const branches = getVisibleBranches(tenant);
                          const limits = getTenantLimits(tenant, packages);
                          const isBranchListOpen = expandedBranchTenantIds.includes(tenant.id);
                          const isCurrentAdminSuspended = selectedAdmin.status === 'SUSPENDED';

                          return (
                            <React.Fragment key={tenant.id}>
                              <tr className={`transition-colors ${
                                isCurrentAdminSuspended
                                  ? 'opacity-75 bg-rose-500/[0.03] hover:opacity-100'
                                  : 'hover:bg-brand-surface-high/25'
                              }`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-brand-text">{tenant.name}</span>
                                    {isCurrentAdminSuspended && (
                                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[9px] border border-amber-500/25">
                                        <Lock className="w-2.5 h-2.5" /> Bị ảnh hưởng
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-caption text-brand-text-muted mt-0.5">{tenant.id} · {tenant.phone}</div>
                                </td>
                                <td className="px-4 py-3 text-brand-text-muted">
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {tenant.address}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleTenantBranches(tenant.id)}
                                    className="inline-flex items-center gap-1.5 text-brand-primary hover:text-brand-primary-light font-bold transition-colors cursor-pointer"
                                    aria-expanded={isBranchListOpen}
                                  >
                                    <span>{branches.length} chi nhánh</span>
                                    {isBranchListOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                  <div className="text-caption text-brand-text-muted mt-1">
                                    Giới hạn gói: {isUnlimitedBranches(limits.branchLimit) ? 'Không giới hạn' : `${limits.branchLimit} chi nhánh`}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1">
                                    <span className={`w-fit px-2 py-0.5 rounded-full text-caption font-bold ${
                                      tenant.status === 'ACTIVE'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : tenant.status === 'OVERDUE'
                                        ? 'bg-brand-error/10 text-brand-error border border-brand-error/20'
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                      {tenant.status === 'ACTIVE' ? 'Đang hoạt động' : tenant.status === 'OVERDUE' ? 'Quá hạn' : tenant.status}
                                    </span>
                                    {isCurrentAdminSuspended && (
                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                        <Lock className="w-2.5 h-2.5" /> Admin bị khóa
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {isBranchListOpen && (
                                <tr className="bg-brand-surface-lowest/45">
                                  <td colSpan={4} className="px-4 pb-4">
                                    <div className="rounded-lg border border-brand-outline/25 bg-brand-surface/70 p-3 space-y-2">
                                      <div className="flex items-center justify-between gap-3 text-caption uppercase font-bold text-brand-text-muted">
                                        <span>Danh sách chi nhánh thuộc {tenant.name}</span>
                                        <span>{branches.length} / {isUnlimitedBranches(limits.branchLimit) ? 'Không giới hạn' : limits.branchLimit}</span>
                                      </div>
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                                        {branches.map((branch) => {
                                          const staffUsed = branch.staffUsed ?? branch.staffCount ?? 0;
                                          const isActive = branch.status === 'ACTIVE';

                                          return (
                                            <div key={branch.id} className="rounded-lg border border-brand-outline/25 bg-brand-surface-lowest px-3 py-2">
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                  <p className="font-bold text-brand-text truncate">{branch.name}</p>
                                                  <p className="mt-1 text-body text-brand-text-muted flex items-start gap-1">
                                                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                                                    <span className="line-clamp-2">{branch.address || 'Chưa cập nhật địa chỉ'}</span>
                                                  </p>
                                                </div>
                                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-caption font-bold border ${
                                                  isActive
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                  {isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                                                </span>
                                              </div>
                                              <div className="mt-2 flex items-center justify-between gap-3 border-t border-brand-outline/20 pt-2 text-body">
                                                <span className="text-brand-text-muted">Nhân viên / Thợ</span>
                                                <span className="font-bold text-brand-text">{staffUsed} thợ</span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Shield} title="Vai trò & quyền hạn" />
                <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3">
                  <DetailItem label="Role Tenant Admin" value={selectedAdmin.role} />
                  <div className="bg-brand-surface-lowest border border-brand-outline/30 rounded-lg p-3">
                    <p className="text-caption uppercase font-bold text-brand-text-muted mb-2">Danh sách quyền được cấp</p>
                    <div className="flex flex-wrap gap-2">
                      {permissions.map((permission) => (
                        <span key={permission} className="px-2 py-1 rounded-md bg-brand-primary/10 border border-brand-primary/20 text-caption font-bold text-brand-primary">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={CreditCard} title="Gói dịch vụ" />
                {selectedAdminTenants.length === 0 ? (
                  <div className="text-xs text-brand-text-muted border border-brand-outline/30 rounded-lg p-4">Chưa có dữ liệu gói dịch vụ.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedAdminTenants.map((tenant) => {
                      const limits = getTenantLimits(tenant, packages);
                      return (
                        <div key={tenant.id} className="bg-brand-surface-lowest border border-brand-outline/30 rounded-lg p-3">
                          <p className="text-sm font-bold text-brand-text">{tenant.name}</p>
                          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                            <DetailItem label="Plan đang dùng" value={tenant.packageName} />
                            <DetailItem label="Ngày bắt đầu" value={tenant.planStartDate || tenant.createdAt} />
                            <DetailItem label="Ngày hết hạn" value={getTenantExpiryLabel(tenant)} />
                            <DetailItem label="Thanh toán" value={tenant.paymentStatus || tenant.status} />
                            <DetailItem label="Giới hạn người dùng" value={`${tenant.staffCount} / ${isUnlimitedStaff(limits.staffLimit) ? 'Không giới hạn' : limits.staffLimit}`} />
                            <DetailItem label="Chi nhánh đang dùng" value={`${tenant.branches?.length || 1} chi nhánh`} />
                            <DetailItem label="Giới hạn gói" value={isUnlimitedBranches(limits.branchLimit) ? 'Không giới hạn' : `${limits.branchLimit} chi nhánh`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Activity} title="Phạm vi quyền của Tenant Admin" />
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <DetailItem label="Tenant được gán" value={`${selectedAdminTenants.length} tenant`} />
                  <DetailItem label="Gói áp dụng" value={packageScopeLabel} />
                  <DetailItem label="Phạm vi chi nhánh" value={selectedAdminTenants.length === 0 ? 'Chưa gán tenant' : branchScopeLabel} />
                  <DetailItem label="Phạm vi người dùng" value={selectedAdminTenants.length === 0 ? 'Chưa gán tenant' : staffScopeLabel} />
                  <DetailItem label="Mức quyền truy cập" value={accessScopeLabel} />
                  <DetailItem label="Trạng thái tài khoản" value={getStatusLabel(selectedAdmin.status)} />
                </div>
                <p className="text-body text-brand-text-muted leading-relaxed">
                  Phạm vi quyền được đồng bộ theo gói dịch vụ của tenant. Owner có toàn quyền thao tác trong tenant, nhưng số chi nhánh và số người dùng vẫn bị giới hạn theo gói đang sử dụng.
                </p>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Settings} title="Cấu hình tenant" />
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <DetailItem label="Timezone" value={selectedAdmin.timezone || primaryTenant?.timezone || 'Asia/Ho_Chi_Minh'} />
                  <DetailItem label="Currency" value={primaryTenant?.currency || 'VND'} />
                  <DetailItem label="Ngôn ngữ" value={primaryTenant?.defaultLanguage || 'Vietnamese'} />
                  <DetailItem label="Online booking" value={primaryTenant?.allowOnlineBooking === false ? 'Đã tắt' : 'Đang bật'} />
                  <DetailItem label="Thuế / phí" value="Chưa cấu hình" />
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Lock} title="Bảo mật" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <DetailItem label="2FA" value={selectedAdmin.role === 'Owner' ? 'Đã bật' : 'Chưa bật'} />
                  <DetailItem label="Đăng nhập sai" value={selectedAdmin.status === 'SUSPENDED' ? '3 lần' : '0 lần'} />
                  <DetailItem label="Thiết bị gần nhất" value="Chrome / Windows" />
                  <DetailItem label="IP gần nhất" value={selectedAdmin.source === 'TENANT' ? '192.168.10.24' : 'Chưa ghi nhận'} />
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Calendar} title="Lịch sử thao tác" />
                <div className="border border-brand-outline/35 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-brand-outline/25">
                      <tr>
                        <td className="px-4 py-3 text-brand-text-muted font-bold">Ai tạo tài khoản</td>
                        <td className="px-4 py-3 text-brand-text">{selectedAdmin.source === 'TENANT' ? 'Superadmin / hệ thống tenant' : 'Superadmin'}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-brand-text-muted font-bold">Ngày tạo</td>
                        <td className="px-4 py-3 text-brand-text">{primaryTenant?.createdAt || 'Chưa ghi nhận'}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-brand-text-muted font-bold">Ngày cập nhật</td>
                        <td className="px-4 py-3 text-brand-text">{selectedAdmin.lastActive}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-brand-text-muted font-bold">Thay đổi quan trọng</td>
                        <td className="px-4 py-3 text-brand-text">Đồng bộ tenant, cập nhật trạng thái tài khoản, thay đổi quyền quản trị nếu có.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Mail} title="Ghi chú nội bộ" />
                <div className="bg-brand-surface-lowest border border-brand-outline/30 rounded-lg p-4 text-xs text-brand-text-muted leading-relaxed">
                  {selectedAdmin.note || primaryTenant?.internalNotes || 'Chưa có ghi chú nội bộ từ Superadmin.'}
                  {selectedAdmin.status === 'SUSPENDED' && (
                    <p className="mt-2 text-brand-error font-semibold">Lý do khóa: tài khoản đang bị khóa tạm thời bởi Superadmin hoặc tenant liên quan đã tạm ngưng.</p>
                  )}
                </div>
              </section>
            </div>
        </Modal>
      )}

      {editingAdmin && (
        <Modal
          open
          onClose={() => setEditingAdmin(null)}
          title="Chỉnh sửa Tenant Admin"
          description="Cập nhật hồ sơ, đăng nhập và trạng thái xác thực"
          size="large"
          closeOnBackdrop={false}
          footer={
            <>
              <button type="button" onClick={() => setEditingAdmin(null)} className="bg-brand-surface-highest hover:bg-brand-surface-highest/80 text-brand-text-muted px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer">Hủy</button>
              <button type="submit" form="edit-tenant-admin-form" className="bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary px-5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-2"><Edit className="w-3.5 h-3.5" /><span>Lưu chỉnh sửa</span></button>
            </>
          }
        >
          <form id="edit-tenant-admin-form" onSubmit={handleEditSubmit} noValidate>
            <div className="space-y-5">
              <section className="flex flex-col sm:flex-row gap-4">
                <div className="w-20 h-20 rounded-2xl bg-brand-surface-lowest border border-brand-outline/45 overflow-hidden flex items-center justify-center text-2xl font-black text-brand-primary shrink-0">
                  {editAvatar ? (
                    <img src={editAvatar} alt="Avatar Tenant Admin" className="w-full h-full object-cover" />
                  ) : (
                    editName.trim().charAt(0).toUpperCase() || 'A'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Ảnh đại diện</label>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 bg-brand-surface-highest hover:bg-brand-surface-highest/80 text-brand-text px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border border-brand-outline/35">
                      <Upload className="w-3.5 h-3.5" />
                      Chọn ảnh
                      <input type="file" accept="image/*" onChange={handleEditAvatarChange} className="hidden" />
                    </label>
                    {editAvatar && (
                      <button
                        type="button"
                        onClick={() => setEditAvatar('')}
                        className="bg-brand-error/10 text-brand-error border border-brand-error/20 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={UserCheck} title="Thông tin Tenant Admin" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Mã Tenant Admin</label>
                    <input
                      type="text"
                      value={editAdminCode}
                      onChange={(e) => setEditAdminCode(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Vai trò</label>
                    <div className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs font-bold text-brand-text">
                      Owner (Chủ tiệm)
                    </div>
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Họ và tên *</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Gmail của Owner *</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Username đăng nhập *</label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    />
                    <span className="text-caption text-brand-text-muted/60 mt-1 block">Username không dùng định dạng Gmail.</span>
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Mật khẩu mới</label>
                    <input
                      type="text"
                      placeholder="Để trống nếu không đổi"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    />
                    <span className="text-caption text-brand-text-muted/60 mt-1 block">Nhập tối thiểu 6 ký tự nếu muốn đổi mật khẩu.</span>
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Số điện thoại *</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Quốc gia</label>
                    <BeautifulSelect
                      value={editCountry}
                      onChange={(e) => handleEditCountryChange(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    >
                      <option value="Vietnam">Vietnam</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Japan">Japan</option>
                      <option value="Korea">Korea</option>
                    </BeautifulSelect>
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Timezone</label>
                    <input
                      type="text"
                      value={editTimezone}
                      onChange={(e) => setEditTimezone(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Địa chỉ liên hệ</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Key} title="Trạng thái hệ thống" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <DetailItem label="Xác thực Gmail" value={editEmailVerified ? 'Đã xác thực' : 'Chờ xác thực'} />
                  <DetailItem label="Xác thực SĐT" value={editPhoneVerified ? 'Đã xác thực' : 'Chờ xác thực'} />
                  <DetailItem label="Email kích hoạt" value={(editSendActivationEmail || editPassword.trim()) ? 'Hệ thống sẽ gửi' : 'Không gửi'} />
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <SectionTitle icon={Store} title="Tiệm đang quản lí" />
                  <button
                    type="button"
                    onClick={() => {
                      const nextEnabled = !editTenantScopeEnabled;
                      setEditTenantScopeEnabled(nextEnabled);
                      if (!nextEnabled) {
                        setEditTenantIds(editingAdmin.tenantIds);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      editTenantScopeEnabled
                        ? 'bg-brand-error/10 text-brand-error border-brand-error/20'
                        : 'bg-brand-surface-highest text-brand-text border-brand-outline/40 hover:border-brand-primary/40'
                    }`}
                  >
                    {editTenantScopeEnabled ? 'Hủy chỉnh tiệm' : 'Chỉnh sửa tiệm quản lí'}
                  </button>
                </div>
                {!editTenantScopeEnabled ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {tenants.filter((tenant) => editingAdmin.tenantIds.includes(tenant.id)).map((tenant) => (
                      <div key={tenant.id} className="bg-brand-surface-lowest border border-brand-outline/40 rounded-lg p-3">
                        <p className="text-xs font-bold text-brand-text">{tenant.name}</p>
                        <p className="text-caption text-brand-text-muted mt-1">{tenant.packageName} · Owner hiện tại: {tenant.adminEmail || 'Chưa gán Owner'}</p>
                      </div>
                    ))}
                    {editingAdmin.tenantIds.length === 0 && (
                      <div className="sm:col-span-2 bg-brand-surface-lowest border border-brand-outline/40 rounded-lg p-3 text-xs text-brand-text-muted">
                        Tenant Admin này chưa quản lí tiệm nào.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-brand-warning/10 border border-brand-warning/20 text-brand-warning rounded-lg px-3 py-2 text-body font-semibold">
                      Chỉ thay đổi danh sách tiệm khi bạn thật sự muốn chuyển Owner/quyền quản lí. Khi lưu, hệ thống sẽ hỏi xác nhận lần nữa.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tenants.map((tenant) => {
                        const checked = editTenantIds.includes(tenant.id);
                        const currentOwner = tenant.adminEmail || 'Chưa gán Owner';
                        const isManagedByCurrentAdmin = editingAdmin.tenantIds.includes(tenant.id);
                        const isManagedByOtherAdmin = Boolean(tenant.adminEmail?.trim()) && !isManagedByCurrentAdmin;
                        return (
                          <label
                            key={tenant.id}
                            className={`flex items-start gap-3 border rounded-lg p-3 transition-colors ${
                              isManagedByOtherAdmin
                                ? 'bg-brand-surface border-brand-outline/25 opacity-60 cursor-not-allowed'
                                : checked
                                ? 'bg-brand-primary/10 border-brand-primary/35'
                                : 'bg-brand-surface-lowest border-brand-outline/40 hover:border-brand-primary/30 cursor-pointer'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleEditTenant(tenant.id)}
                              disabled={isManagedByOtherAdmin}
                              className="mt-0.5 w-4 h-4 accent-brand-primary"
                            />
                            <span className="min-w-0">
                              <span className="block text-xs font-bold text-brand-text truncate">{tenant.name}</span>
                              <span className="block text-caption text-brand-text-muted mt-0.5 truncate">
                                {tenant.packageName} · Owner hiện tại: {currentOwner}
                              </span>
                              {isManagedByOtherAdmin && (
                                <span className="block text-caption text-brand-error mt-1">
                                  Không thể chọn vì đã có Tenant Admin quản lí
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Mail} title="Ghi chú nội bộ" />
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary resize-none"
                />
              </section>
            </div>
          </form>
        </Modal>
      )}

      {showInviteModal && (
        <Modal
          open
          onClose={() => setShowInviteModal(false)}
          title="Thêm Tenant Admin"
          size="large"
          closeOnBackdrop={false}
          footer={
            <>
              <button type="button" onClick={() => setShowInviteModal(false)} className="bg-brand-surface-highest hover:bg-brand-surface-highest/80 text-brand-text-muted px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer">Hủy</button>
              <button type="submit" form="invite-tenant-admin-form" className="bg-brand-primary hover:bg-brand-primary/90 text-brand-on-primary px-5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-2"><UserCheck className="w-3.5 h-3.5" /><span>Thêm quản trị viên</span></button>
            </>
          }
        >
          <form id="invite-tenant-admin-form" onSubmit={handleInviteSubmit}>
            <div className="space-y-5">
              <section className="flex flex-col sm:flex-row gap-4">
                <div className="w-20 h-20 rounded-2xl bg-brand-surface-lowest border border-brand-outline/45 overflow-hidden flex items-center justify-center text-2xl font-black text-brand-primary shrink-0">
                  {inviteAvatar ? (
                    <img src={inviteAvatar} alt="Avatar Tenant Admin" className="w-full h-full object-cover" />
                  ) : (
                    inviteName.trim().charAt(0).toUpperCase() || 'A'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Ảnh đại diện</label>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 bg-brand-surface-highest hover:bg-brand-surface-highest/80 text-brand-text px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border border-brand-outline/35">
                      <Upload className="w-3.5 h-3.5" />
                      Chọn ảnh
                      <input type="file" accept="image/*" onChange={handleInviteAvatarChange} className="hidden" />
                    </label>
                    {inviteAvatar && (
                      <button
                        type="button"
                        onClick={() => setInviteAvatar('')}
                        className="bg-brand-error/10 text-brand-error border border-brand-error/20 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={UserCheck} title="Hồ sơ Tenant Admin" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Mã Tenant Admin</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inviteAdminCode}
                        onChange={(e) => setInviteAdminCode(e.target.value)}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setInviteAdminCode(generateAdminCode())}
                        className="bg-brand-surface-highest hover:bg-brand-surface-highest/80 text-brand-text px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Tạo
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Họ và tên Admin *</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Nguyễn Văn Hải"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Địa chỉ Email *</label>
                    <input
                      type="email"
                      placeholder="name@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Username đăng nhập</label>
                    <input
                      type="text"
                      placeholder="Để trống sẽ dùng email"
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Số điện thoại liên hệ</label>
                    <input
                      type="text"
                      placeholder="+84..."
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Quốc gia</label>
                    <BeautifulSelect
                      value={inviteCountry}
                      onChange={(e) => handleInviteCountryChange(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    >
                      <option value="Vietnam">Vietnam</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Japan">Japan</option>
                      <option value="Korea">Korea</option>
                    </BeautifulSelect>
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Timezone</label>
                    <input
                      type="text"
                      value={inviteTimezone}
                      onChange={(e) => setInviteTimezone(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Địa chỉ liên hệ</label>
                    <input
                      type="text"
                      placeholder="Số nhà, đường, thành phố..."
                      value={inviteAddress}
                      onChange={(e) => setInviteAddress(e.target.value)}
                      className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Key} title="Truy cập ban đầu" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Mật khẩu tạm</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inviteTempPassword}
                        onChange={(e) => setInviteTempPassword(e.target.value)}
                        className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setInviteTempPassword(generateTempPassword())}
                        className="bg-brand-surface-highest hover:bg-brand-surface-highest/80 text-brand-text px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Tạo
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 cursor-pointer min-h-[38px]">
                    <input
                      type="checkbox"
                      checked={inviteSendActivationEmail}
                      onChange={(e) => setInviteSendActivationEmail(e.target.checked)}
                      className="w-4 h-4 accent-brand-primary"
                    />
                    <span className="text-xs font-semibold text-brand-text">Gửi email kích hoạt</span>
                  </label>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Tiệm liên kết</label>
                    <div className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text-muted">
                      Chưa liên kết tiệm
                    </div>
                  </div>

                  <div>
                    <label className="block text-caption uppercase font-bold text-brand-text-muted mb-1.5">Vai trò</label>
                    <div className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs font-bold text-brand-text">
                      Owner (Chủ tiệm)
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Mail} title="Ghi chú nội bộ" />
                <textarea
                  rows={3}
                  placeholder="Ghi chú riêng về Tenant Admin này..."
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  className="w-full bg-brand-surface-lowest border border-brand-outline/40 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-primary resize-none"
                />
              </section>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
