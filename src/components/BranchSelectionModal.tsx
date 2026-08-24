import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Store,
  User,
  Users,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Modal as UiModal } from './ui';

export interface BranchSelectionItem {
  code: string;
  id: string;
  name: string;
  subtitle?: string;
  address?: string;
  phone?: string;
  manager?: string;
  stations?: string | number;
  staff?: string | number;
  hours?: string;
  revenue?: string;
  status?: string;
  badgeTone?: string;
  note?: string;
}

interface BranchSelectionModalProps {
  open: boolean;
  onClose: () => void;
  selectedBranch: string;
  onSelectBranch: (branchCode: string) => void;
  branches: BranchSelectionItem[];
  tenantName?: string;
  accountName?: string;
  canCloseWithoutSelecting?: boolean;
}

export default function BranchSelectionModal({
  open,
  onClose,
  selectedBranch,
  onSelectBranch,
  branches,
  tenantName = 'Lumière Beauty',
  accountName = 'Tenant Admin',
  canCloseWithoutSelecting = true,
}: BranchSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBranches = branches.filter((branch) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      branch.name.toLowerCase().includes(query) ||
      branch.code.toLowerCase().includes(query) ||
      (branch.address && branch.address.toLowerCase().includes(query)) ||
      (branch.manager && branch.manager.toLowerCase().includes(query))
    );
  });

  const handleSelect = (code: string) => {
    onSelectBranch(code);
    onClose();
  };

  return (
    <UiModal
      open={open}
      onClose={() => {
        if (canCloseWithoutSelecting || selectedBranch) {
          onClose();
        }
      }}
      size="large"
      title="Chọn chi nhánh làm việc"
      eyebrow="Không gian quản trị tenant"
      icon={<Store className="h-5 w-5 text-violet-600" />}
      description={
        <span>
          Chào mừng <strong>{accountName}</strong>! Vui lòng chọn chi nhánh bạn muốn quản trị để hệ thống tải toàn bộ dữ liệu vận hành, lịch hẹn, doanh thu và nhân sự của chi nhánh đó.
        </span>
      }
      showCloseButton={canCloseWithoutSelecting || Boolean(selectedBranch)}
      closeOnBackdrop={canCloseWithoutSelecting || Boolean(selectedBranch)}
      closeOnEscape={canCloseWithoutSelecting || Boolean(selectedBranch)}
    >
      <div className="space-y-4 py-1">
        {/* Search bar if multiple branches */}
        {branches.length > 2 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên chi nhánh, mã Q1/Q3, địa chỉ hoặc quản lý..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-medium outline-none transition focus:border-violet-400 focus:bg-white focus:ring-3 focus:ring-violet-100"
            />
          </div>
        )}

        {/* Branch Cards Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredBranches.map((item) => {
            const isCurrent = selectedBranch === item.code;
            return (
              <div
                key={item.id || item.code}
                onClick={() => handleSelect(item.code)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(item.code);
                  }
                }}
                className={`group relative flex flex-col justify-between rounded-2xl border p-4.5 text-left transition-all duration-200 cursor-pointer shadow-xs ${
                  isCurrent
                    ? 'border-violet-500 bg-violet-50/70 ring-2 ring-violet-400/30'
                    : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-slate-50/80 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top Header of Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm transition shadow-sm ${
                          isCurrent
                            ? 'bg-violet-600 text-white shadow-violet-200'
                            : 'bg-violet-100 text-violet-700 group-hover:bg-violet-600 group-hover:text-white'
                        }`}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-sm text-slate-900 leading-tight group-hover:text-violet-700 transition">
                            {item.name}
                          </h4>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-700 uppercase">
                            {item.code}
                          </span>
                        </div>
                        {item.subtitle && (
                          <p className="mt-0.5 text-[11px] font-medium text-slate-500 line-clamp-1">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Đang chọn
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                        {item.status || 'Hoạt động'}
                      </span>
                    )}
                  </div>

                  {/* Branch Details */}
                  <div className="mt-3.5 space-y-1.5 border-t border-slate-100/90 pt-3 text-[11.5px] text-slate-600">
                    {item.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="line-clamp-2 leading-relaxed text-slate-700">
                          {item.address}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {item.manager && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate text-slate-600">
                            QL: <strong className="text-slate-800 font-semibold">{item.manager}</strong>
                          </span>
                        </div>
                      )}
                      {item.hours && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate text-slate-600">{item.hours}</span>
                        </div>
                      )}
                      {item.staff && (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate text-slate-600">
                            Nhân sự: <strong className="text-slate-800 font-semibold">{item.staff}</strong>
                          </span>
                        </div>
                      )}
                      {item.stations && (
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate text-slate-600">
                            Quy mô: <strong className="text-slate-800 font-semibold">{item.stations}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="mt-4 pt-3 border-t border-slate-100/90 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-violet-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    {isCurrent ? 'Tiếp tục làm việc' : 'Vào chi nhánh này'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  {item.revenue && (
                    <span className="text-[11px] font-medium text-slate-400">
                      DT: {item.revenue}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Global/All Branches Option */}
        <div
          onClick={() => handleSelect('ALL')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelect('ALL');
            }
          }}
          className={`group flex items-center justify-between rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer shadow-xs ${
            selectedBranch === 'ALL'
              ? 'border-violet-500 bg-violet-50/70 ring-2 ring-violet-400/30'
              : 'border-dashed border-slate-300 bg-slate-50/60 hover:border-violet-300 hover:bg-violet-50/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                selectedBranch === 'ALL'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-200/80 text-slate-700 group-hover:bg-violet-600 group-hover:text-white'
              }`}
            >
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-violet-700 transition">
                  Toàn hệ thống (Tất cả chi nhánh)
                </h4>
                {selectedBranch === 'ALL' && (
                  <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    Đang chọn
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Xem báo cáo tổng hợp, dữ liệu hợp nhất và quản trị toàn bộ {branches.length} chi nhánh của tenant {tenantName}.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-violet-700 flex items-center gap-1 shrink-0 ml-3 group-hover:translate-x-0.5 transition-transform">
            Xem toàn bộ
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </UiModal>
  );
}
