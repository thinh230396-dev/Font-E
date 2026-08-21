import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from './ui';
import { getTenantAdminInitialData } from '../utils/mockDataReset';
import {
  syncColorsWithInventory,
  loadInventoryItems,
  PolishColor,
  ColorStatus,
} from '../utils/inventorySync';
import { inventorySeed, InventoryItem } from './TenantAdminInventory';
import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  EyeOff,
  Filter,
  Image,
  Layers3,
  LayoutGrid,
  LayoutList,
  Link2,
  PackageCheck,
  Palette,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  UploadCloud,
  UserRoundCheck,
  X
} from 'lucide-react';
import BeautifulSelect from './BeautifulSelect';
import { formatMoney as money } from '../utils/money';
import { SalonService, serviceSeed } from './TenantAdminServices';

type BranchCode = 'Q1' | 'Q3';
type LibraryTab = 'DESIGNS' | 'COLORS';
type ViewMode = 'GRID' | 'LIST';
export type DesignStatus = 'TRENDING' | 'ACTIVE' | 'DRAFT' | 'HIDDEN';
export type { PolishColor };

export interface NailDesign {
  id: string;
  name: string;
  collection: string;
  baseServiceId: string;
  styles: string[];
  level: number;
  duration: number;
  surcharge: number;
  status: DesignStatus;
  branches: BranchCode[];
  colors: Array<{ name: string; hex: string; code: string }>;
  materials: string[];
  technicians: string[];
  bookings: number;
  rating: number;
  online: boolean;
  updatedAt: string;
  notes: string;
  preview: number;
  imageUrl?: string;
}

interface TenantAdminNailGalleryProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedBranch: string;
  onSelectedBranchChange: (value: string) => void;
  tenantName?: string;
  roleLabel?: string;
  accessMode?: 'full' | 'limited' | 'locked';
  readOnlyReason?: string;
  onNotify?: (message: string) => void;
}

export const designSeed: NailDesign[] = [
  { id: 'NAIL-184', name: 'Crystal French Chrome', collection: 'Summer Light 2026', baseServiceId: 'SVC-001', styles: ['French', 'Chrome', 'Đính đá'], level: 3, duration: 75, surcharge: 680000, status: 'TRENDING', branches: ['Q1', 'Q3'], colors: [{ name: 'Bubble Bath', hex: '#e9c9c2', code: 'OPI-S86' }, { name: 'Aurora Pearl', hex: '#d9d4ea', code: 'AP-03' }, { name: 'Silver Veil', hex: '#b9bec8', code: 'SV-12' }], materials: ['Crystal Mix SS3', 'Chrome Aurora', 'Top Coat No Wipe'], technicians: ['Thảo Nguyễn', 'Hà My'], bookings: 68, rating: 4.9, online: true, updatedAt: '18/07/2026 · 14:32', notes: 'Áp dụng giá phụ thu cho bộ 10 móng. Cần xác nhận độ dài móng trước khi đặt lịch.', preview: 0 },
  { id: 'NAIL-176', name: 'Milky Ombre Blossom', collection: 'Spring Minimal', baseServiceId: 'SVC-001', styles: ['Ombre', 'Vẽ hoa', 'Minimal'], level: 2, duration: 45, surcharge: 420000, status: 'ACTIVE', branches: ['Q1', 'Q3'], colors: [{ name: 'Milky White', hex: '#f5eee8', code: 'DND-MW01' }, { name: 'Blush Petal', hex: '#efb7c0', code: 'BP-08' }, { name: 'Sage Leaf', hex: '#aebca3', code: 'SL-04' }], materials: ['Art Gel Pastel 02', 'Cọ nét 7mm', 'Matte Top'], technicians: ['Minh Châu', 'Hà My', 'Thuỳ Dương', 'Bảo Ngọc', 'Thảo Nguyễn'], bookings: 46, rating: 4.8, online: true, updatedAt: '17/07/2026 · 09:18', notes: 'Mẫu phù hợp móng ngắn đến trung bình. Có thể đổi tông hoa theo yêu cầu khách.', preview: 1 },
  { id: 'NAIL-169', name: 'Red Wine Velvet', collection: 'Evening Glam', baseServiceId: 'SVC-006', styles: ['Velvet', 'Cat Eye'], level: 2, duration: 30, surcharge: 350000, status: 'ACTIVE', branches: ['Q1', 'Q3'], colors: [{ name: 'Merlot', hex: '#681c2c', code: 'DND-751' }, { name: 'Ruby Beam', hex: '#9f253f', code: 'RB-05' }, { name: 'Gold Line', hex: '#cba45d', code: 'GL-02' }], materials: ['Cat Eye Magnet 05', 'Gold Line Gel', 'Glossy Top'], technicians: ['Minh Châu', 'Thảo Nguyễn', 'Hà My', 'Bảo Ngọc', 'Thuỳ Dương', 'Kim Anh'], bookings: 52, rating: 4.9, online: true, updatedAt: '16/07/2026 · 18:05', notes: 'Hiệu ứng đẹp nhất trên form almond. Chụp ảnh dưới ánh sáng nghiêng để thấy rõ vệt mắt mèo.', preview: 2 },
  { id: 'NAIL-192', name: 'Ocean Glass 3D', collection: 'August Preview', baseServiceId: 'SVC-004', styles: ['3D Gel', 'Glass', 'Ocean'], level: 4, duration: 120, surcharge: 1100000, status: 'TRENDING', branches: ['Q3'], colors: [{ name: 'Glass Blue', hex: '#7bc5d9', code: 'GB-02' }, { name: 'Deep Ocean', hex: '#135a78', code: 'DO-09' }, { name: 'Shell Pearl', hex: '#eadfd0', code: 'SP-11' }], materials: ['3D Clear Gel', 'Shell Flake', 'Silver Foil', 'Builder Gel'], technicians: ['Thảo Nguyễn'], bookings: 12, rating: 4.9, online: true, updatedAt: '19/07/2026 · 10:12', notes: 'Mẫu gel 3D cao cấp hiệu ứng đại dương.', preview: 3 },
  { id: 'NAIL-158', name: 'Soft Aura Nude', collection: 'Everyday Signature', baseServiceId: 'SVC-002', styles: ['Aura', 'Nude', 'Minimal'], level: 2, duration: 40, surcharge: 320000, status: 'ACTIVE', branches: ['Q1'], colors: [{ name: 'Warm Nude', hex: '#d7aa93', code: 'WN-14' }, { name: 'Soft Peach', hex: '#eac0aa', code: 'SP-07' }, { name: 'Milk Veil', hex: '#f1e5da', code: 'MV-01' }], materials: ['Airbrush White', 'Blooming Gel', 'Glossy Top'], technicians: ['Minh Châu', 'Thuỳ Dương', 'Kim Anh'], bookings: 39, rating: 4.7, online: true, updatedAt: '14/07/2026 · 16:40', notes: 'Mẫu bán chạy cho khách văn phòng. Cho phép chọn nền nude theo tông da.', preview: 4 },
  { id: 'NAIL-147', name: 'Black Gold Geometry', collection: 'Editorial 2026', baseServiceId: 'SVC-004', styles: ['Geometric', 'Metallic'], level: 3, duration: 65, surcharge: 590000, status: 'ACTIVE', branches: ['Q3'], colors: [{ name: 'Onyx', hex: '#171719', code: 'OX-01' }, { name: 'Liquid Gold', hex: '#c99b42', code: 'LG-08' }], materials: ['Foil Gold', 'Line Art Gel', 'Matte Top'], technicians: ['Thảo Nguyễn', 'Hà My'], bookings: 21, rating: 4.8, online: true, updatedAt: '10/07/2026 · 11:28', notes: 'Mẫu hình học cá tính phối hợp kim loại vàng.', preview: 5 },
  { id: 'NAIL-201', name: 'Pastel Blooming Art', collection: 'Summer Light 2026', baseServiceId: 'SVC-006', styles: ['Blooming', 'Pastel'], level: 2, duration: 45, surcharge: 280000, status: 'ACTIVE', branches: ['Q1', 'Q3'], colors: [{ name: 'Bubble Bath', hex: '#e9c9c2', code: 'OPI-S86' }, { name: 'Sage Leaf', hex: '#aebca3', code: 'SG-04' }], materials: ['Blooming Gel', 'Pastel Paint'], technicians: ['Thảo Nguyễn', 'Hà My'], bookings: 34, rating: 4.8, online: true, updatedAt: '20/07/2026 · 09:30', notes: 'Mẫu loang hoa pastel nhẹ nhàng phù hợp sơn gel Hàn Quốc.', preview: 1 },
  { id: 'NAIL-202', name: 'Bridal Pearl Shell', collection: 'Bridal Collection', baseServiceId: 'SVC-008', styles: ['Bridal', 'Pearl', 'Charm'], level: 4, duration: 90, surcharge: 750000, status: 'TRENDING', branches: ['Q1'], colors: [{ name: 'Milky White', hex: '#f5eee8', code: 'DND-MW01' }, { name: 'Aurora Pearl', hex: '#d9d4ea', code: 'AP-03' }], materials: ['Swarovski Crystal', 'Shell Flake', 'Builder Gel'], technicians: ['Hà My'], bookings: 25, rating: 5.0, online: true, updatedAt: '21/07/2026 · 11:15', notes: 'Mẫu đính xà cừ và ngọc trai sang trọng cho ngày cưới.', preview: 0 }
];

export const colorSeed: PolishColor[] = [
  { id: 'CLR-OPI-S86', name: 'Bubble Bath', brand: 'OPI', code: 'NL S86', hex: '#e9c9c2', finish: 'Sheer · Nude', stock: 5, minimumStock: 12, monthlyUsage: 86, linkedDesigns: 42, status: 'LOW', branches: ['Q1', 'Q3'], collection: 'Classic', location: 'Kệ G-01', updatedAt: '18/07/2026', inventoryItemId: 'SKU-OPI-BB', capacityMl: 15, dosagePerServiceMl: 5 },
  { id: 'CLR-DND-751', name: 'Merlot', brand: 'DND', code: '751', hex: '#681c2c', finish: 'Cream · Opaque', stock: 3, minimumStock: 12, monthlyUsage: 64, linkedDesigns: 28, status: 'LOW', branches: ['Q1', 'Q3'], collection: 'Diva Duo', location: 'Kệ G-02', updatedAt: '18/07/2026', inventoryItemId: 'SKU-DND-751', capacityMl: 18, dosagePerServiceMl: 5 },
  { id: 'CLR-AP-03', name: 'Aurora Pearl', brand: 'NailPro', code: 'AP-03', hex: '#d9d4ea', finish: 'Chrome · Pearl', stock: 8, minimumStock: 5, monthlyUsage: 42, linkedDesigns: 31, status: 'ACTIVE', branches: ['Q1', 'Q3'], collection: 'Aurora', location: 'Kệ C-04', updatedAt: '17/07/2026', inventoryItemId: 'SKU-AP-03', capacityMl: 15, dosagePerServiceMl: 5 },
  { id: 'CLR-GB-02', name: 'Glass Blue', brand: 'Jello Jello', code: 'GB-02', hex: '#7bc5d9', finish: 'Jelly · Translucent', stock: 7, minimumStock: 6, monthlyUsage: 18, linkedDesigns: 12, status: 'ACTIVE', branches: ['Q3'], collection: 'Ocean Glass', location: 'Kệ G-06', updatedAt: '16/07/2026', inventoryItemId: 'SKU-GB-02', capacityMl: 15, dosagePerServiceMl: 5 },
  { id: 'CLR-MW-01', name: 'Milky White', brand: 'DND', code: 'MW-01', hex: '#f5eee8', finish: 'Milky · Semi sheer', stock: 0, minimumStock: 10, monthlyUsage: 72, linkedDesigns: 36, status: 'OUT', branches: ['Q1', 'Q3'], collection: 'Milky Base', location: 'Kệ G-01', updatedAt: '19/07/2026', inventoryItemId: 'SKU-MW-01', capacityMl: 18, dosagePerServiceMl: 5 },
  { id: 'CLR-OX-01', name: 'Onyx Black', brand: 'The GelBottle', code: 'OX-01', hex: '#171719', finish: 'Cream · Opaque', stock: 11, minimumStock: 6, monthlyUsage: 26, linkedDesigns: 19, status: 'ACTIVE', branches: ['Q3'], collection: 'Core Colors', location: 'Kệ G-03', updatedAt: '12/07/2026', inventoryItemId: 'SKU-OX-01', capacityMl: 20, dosagePerServiceMl: 5 },
  { id: 'CLR-SG-04', name: 'Sage Leaf', brand: 'Kokoist', code: 'SG-04', hex: '#aebca3', finish: 'Cream · Muted', stock: 9, minimumStock: 6, monthlyUsage: 31, linkedDesigns: 17, status: 'ACTIVE', branches: ['Q1'], collection: 'Nature Edit', location: 'Kệ G-05', updatedAt: '15/07/2026', inventoryItemId: 'SKU-SG-04', capacityMl: 15, dosagePerServiceMl: 5 },
  { id: 'CLR-LG-08', name: 'Liquid Gold', brand: 'Presto', code: 'LG-08', hex: '#c99b42', finish: 'Metallic · Foil', stock: 2, minimumStock: 5, monthlyUsage: 22, linkedDesigns: 14, status: 'LOW', branches: ['Q3'], collection: 'Metallic Art', location: 'Kệ C-03', updatedAt: '19/07/2026', inventoryItemId: 'SKU-LG-08', capacityMl: 15, dosagePerServiceMl: 5 }
];

const designStatusMeta: Record<DesignStatus, { label: string; badge: string }> = {
  TRENDING: { label: 'Đang thịnh hành', badge: 'bg-violet-50 text-violet-700 ring-violet-200' },
  ACTIVE: { label: 'Đang mở bán', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  DRAFT: { label: 'Bản nháp', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  HIDDEN: { label: 'Đang ẩn', badge: 'bg-slate-100 text-slate-600 ring-slate-200' }
};

const colorStatusMeta: Record<ColorStatus, { label: string; badge: string; dot: string }> = {
  ACTIVE: { label: 'Sẵn sàng', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  LOW: { label: 'Sắp hết', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  OUT: { label: 'Hết hàng', badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' }
};

const previewBackgrounds = [
  ['#f3e5e2', '#d9d4ea', '#ffffff'],
  ['#f5eee8', '#efb7c0', '#aebca3'],
  ['#681c2c', '#9f253f', '#cba45d'],
  ['#7bc5d9', '#135a78', '#eadfd0'],
  ['#d7aa93', '#eac0aa', '#f1e5da'],
  ['#171719', '#c99b42', '#f5f0e6']
];

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100';
const branchLabel = (code: BranchCode) => code === 'Q1' ? 'Quận 1' : 'Quận 3';

function NailPreview({ design, compact = false }: { design: NailDesign; compact?: boolean }) {
  if (design.imageUrl) {
    return (
      <div className={`relative overflow-hidden bg-slate-100 ${compact ? 'h-24' : 'h-48 sm:h-52'}`}>
        <img
          src={design.imageUrl}
          alt={design.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/50 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-caption font-black text-slate-700 shadow-sm backdrop-blur">
          {design.collection}
        </span>
      </div>
    );
  }
  const palette = previewBackgrounds[design.preview % previewBackgrounds.length];
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-slate-100 via-white to-violet-50 ${compact ? 'h-24' : 'h-44'}`}>
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-900/10 to-transparent" />
      <div className="absolute inset-0 flex items-end justify-center gap-1.5 px-4 pb-3">
        {[0, 1, 2, 3, 4].map((index) => {
          const base = palette[index % palette.length];
          const accent = palette[(index + 1) % palette.length];
          return <span key={index} className={`${compact ? 'h-14 w-7' : 'h-24 w-11'} relative block origin-bottom rounded-[55%_55%_28%_28%] border border-white/70 shadow-[0_8px_18px_rgba(15,23,42,0.14)]`} style={{ background: design.preview === 5 ? `linear-gradient(${125 + index * 9}deg, ${base} 0 58%, ${accent} 59% 66%, ${base} 67%)` : design.preview === 3 ? `radial-gradient(circle at ${25 + index * 12}% 28%, ${accent} 0 9%, transparent 10%), linear-gradient(145deg, ${base}, ${accent})` : `linear-gradient(${140 + index * 7}deg, ${base} 0 55%, ${accent} 56% 72%, ${palette[2]} 73%)`, transform: `rotate(${(index - 2) * 4}deg) translateY(${Math.abs(index - 2) * 4}px)` }} />;
        })}
      </div>
      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-caption font-black text-slate-700 shadow-sm backdrop-blur">{design.collection}</span>
    </div>
  );
}

export default function TenantAdminNailGallery({
  searchQuery,
  onSearchQueryChange,
  selectedBranch,
  tenantName = 'Lumière Nail Studio',
  roleLabel = 'Owner · Tenant Admin',
  accessMode = 'full',
  readOnlyReason,
  onNotify
}: TenantAdminNailGalleryProps) {
  const designStorageKey = `tenant-admin-nail-designs-v1:${tenantName}`;
  const colorStorageKey = `tenant-admin-nail-colors-v1:${tenantName}`;
  const serviceStorageKey = `tenant-admin-services-v1:${tenantName}`;

  const [baseServices] = useState<SalonService[]>(() => {
    if (typeof window === 'undefined') return serviceSeed;
    try {
      const value = localStorage.getItem(serviceStorageKey);
      return value ? (JSON.parse(value) as SalonService[]) : serviceSeed;
    } catch {
      return serviceSeed;
    }
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => loadInventoryItems(tenantName, inventorySeed));

  const [designs, setDesigns] = useState<NailDesign[]>(() => {
    try {
      const value = localStorage.getItem(designStorageKey);
      return getTenantAdminInitialData(value ? JSON.parse(value) : null, designSeed);
    } catch {
      return getTenantAdminInitialData(null, designSeed);
    }
  });

  const [colors, setColors] = useState<PolishColor[]>(() => {
    let rawColors: PolishColor[] = colorSeed;
    try {
      const value = localStorage.getItem(colorStorageKey);
      rawColors = getTenantAdminInitialData(value ? JSON.parse(value) : null, colorSeed);
    } catch {
      rawColors = getTenantAdminInitialData(null, colorSeed);
    }
    const currentInv = loadInventoryItems(tenantName, inventorySeed);
    return syncColorsWithInventory(rawColors, currentInv);
  });

  const [tab, setTab] = useState<LibraryTab>('DESIGNS');
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');
  const [styleFilter, setStyleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('POPULAR');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<NailDesign | null>(null);
  const [selectedColor, setSelectedColor] = useState<PolishColor | null>(null);
  const [formMode, setFormMode] = useState<'DESIGN' | 'COLOR' | null>(null);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  const [designForm, setDesignForm] = useState({
    name: '',
    collection: '',
    baseServiceId: 'SVC-006',
    style: 'French',
    level: '2',
    duration: '45',
    surcharge: '350000',
    status: 'DRAFT' as DesignStatus,
    colors: '',
    materials: '',
    technicians: '',
    notes: '',
    branchQ1: true,
    branchQ3: true,
    online: false,
    imageUrl: ''
  });

  const [designImageError, setDesignImageError] = useState('');
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  const processImageFile = (file: File) => {
    setDesignImageError('');
    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      setDesignImageError('Định dạng tệp không hợp lệ. Chỉ chấp nhận định dạng ảnh: JPG, JPEG, PNG, WEBP.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setDesignImageError(`Dung lượng ảnh (${sizeMb}MB) vượt quá giới hạn 5MB. Vui lòng chọn tệp nhỏ hơn.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setDesignForm((current) => ({ ...current, imageUrl: result }));
        setDesignImageError('');
      }
    };
    reader.onerror = () => {
      setDesignImageError('Không thể đọc tệp hình ảnh. Vui lòng thử lại.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingImage(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingImage(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingImage(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  const handleRemoveImage = () => {
    setDesignForm((current) => ({ ...current, imageUrl: '' }));
    setDesignImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [colorForm, setColorForm] = useState({
    name: '',
    brand: '',
    code: '',
    hex: '#d8b4b4',
    finish: 'Cream · Opaque',
    stock: '0',
    minimumStock: '5',
    collection: '',
    location: '',
    inventoryItemId: 'SKU-OPI-BB',
    capacityMl: '15',
    dosagePerServiceMl: '5',
    branchQ1: true,
    branchQ3: true
  });

  const canManage = accessMode === 'full';

  useEffect(() => { try { localStorage.setItem(designStorageKey, JSON.stringify(designs)); } catch { /* optional */ } }, [designStorageKey, designs]);
  useEffect(() => { try { localStorage.setItem(colorStorageKey, JSON.stringify(colors)); } catch { /* optional */ } }, [colorStorageKey, colors]);

  useEffect(() => {
    if (selectedDesign || selectedColor || formMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedDesign, selectedColor, formMode]);

  useEffect(() => {
    const handleSync = () => {
      const freshInv = loadInventoryItems(tenantName, inventorySeed);
      setInventory(freshInv);
      setColors((current) => syncColorsWithInventory(current, freshInv));
    };
    window.addEventListener('salonsys_inventory_updated', handleSync);
    return () => window.removeEventListener('salonsys_inventory_updated', handleSync);
  }, [tenantName]);

  const findBaseService = (serviceId?: string): SalonService => {
    const found = baseServices.find((s) => s.id === serviceId);
    if (found) return found;
    const defaultSvc = baseServices.find((s) => s.status === 'ACTIVE') || baseServices[0] || serviceSeed[0];
    return defaultSvc;
  };

  const requireManage = () => {
    if (canManage) return true;
    const message = readOnlyReason || 'Gói hiện tại chỉ cho phép xem thư viện màu và mẫu Nail.';
    setNotice(message); onNotify?.(message); return false;
  };

  const branchDesigns = useMemo(() => designs.filter((item) => selectedBranch === 'ALL' || item.branches.includes(selectedBranch as BranchCode)), [designs, selectedBranch]);
  const branchColors = useMemo(() => colors.filter((item) => selectedBranch === 'ALL' || item.branches.includes(selectedBranch as BranchCode)), [colors, selectedBranch]);
  const styles = useMemo(() => Array.from(new Set(branchDesigns.flatMap((item) => item.styles))).sort((a, b) => a.localeCompare(b, 'vi')), [branchDesigns]);

  const filteredDesigns = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi');
    return branchDesigns
      .filter((item) => styleFilter === 'ALL' || item.styles.includes(styleFilter))
      .filter((item) => statusFilter === 'ALL' || item.status === statusFilter)
      .filter((item) => {
        if (!query) return true;
        const baseSvc = findBaseService(item.baseServiceId);
        return `${item.id} ${item.name} ${item.collection} ${baseSvc.name} ${item.styles.join(' ')} ${item.colors.map((c) => c.name).join(' ')}`
          .toLocaleLowerCase('vi')
          .includes(query);
      })
      .sort((a, b) => sortBy === 'NEWEST' ? b.id.localeCompare(a.id) : sortBy === 'SURCHARGE_HIGH' ? b.surcharge - a.surcharge : sortBy === 'DURATION' ? a.duration - b.duration : b.bookings - a.bookings);
  }, [branchDesigns, searchQuery, sortBy, statusFilter, styleFilter, baseServices]);

  const filteredColors = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi');
    return branchColors
      .filter((item) => statusFilter === 'ALL' || item.status === statusFilter)
      .filter((item) => styleFilter === 'ALL' || item.finish.includes(styleFilter))
      .filter((item) => !query || `${item.id} ${item.name} ${item.brand} ${item.code} ${item.finish} ${item.collection}`.toLocaleLowerCase('vi').includes(query))
      .sort((a, b) => sortBy === 'NEWEST' ? b.updatedAt.localeCompare(a.updatedAt) : sortBy === 'STOCK_LOW' ? a.stock - b.stock : sortBy === 'USAGE' || sortBy === 'POPULAR' ? b.monthlyUsage - a.monthlyUsage : a.name.localeCompare(b.name, 'vi'));
  }, [branchColors, searchQuery, sortBy, statusFilter, styleFilter]);

  const activeDesigns = branchDesigns.filter((item) => item.status === 'ACTIVE' || item.status === 'TRENDING').length;
  const unavailableColors = branchColors.filter((item) => item.status !== 'ACTIVE').length;
  const totalBookings = branchDesigns.reduce((sum, item) => sum + item.bookings, 0);
  const averageSurcharge = branchDesigns.length ? Math.round(branchDesigns.reduce((sum, item) => sum + item.surcharge, 0) / branchDesigns.length / 10000) * 10000 : 0;
  const activeFilterCount = [styleFilter !== 'ALL', statusFilter !== 'ALL'].filter(Boolean).length;

  const openDesignForm = (design?: NailDesign) => {
    if (!requireManage()) return;
    if (design) {
      setDesignForm({
        name: design.name,
        collection: design.collection,
        baseServiceId: design.baseServiceId || 'SVC-006',
        style: design.styles[0] || 'French',
        level: String(design.level),
        duration: String(design.duration),
        surcharge: String(design.surcharge),
        status: design.status,
        colors: design.colors.map((color) => color.name).join(', '),
        materials: design.materials.join(', '),
        technicians: design.technicians.join(', '),
        notes: design.notes,
        branchQ1: design.branches.includes('Q1'),
        branchQ3: design.branches.includes('Q3'),
        online: design.online,
        imageUrl: design.imageUrl || ''
      });
    } else {
      setDesignForm({
        name: '',
        collection: '',
        baseServiceId: baseServices[0]?.id || 'SVC-006',
        style: 'French',
        level: '2',
        duration: '45',
        surcharge: '350000',
        status: 'DRAFT',
        colors: '',
        materials: '',
        technicians: '',
        notes: '',
        branchQ1: selectedBranch !== 'Q3',
        branchQ3: selectedBranch !== 'Q1',
        online: false,
        imageUrl: ''
      });
    }
    setFormError('');
    setDesignImageError('');
    setFormMode('DESIGN');
  };

  const openColorForm = (colorToEdit?: PolishColor) => {
    if (!requireManage()) return;
    if (colorToEdit) {
      setSelectedColor(colorToEdit);
      setColorForm({
        name: colorToEdit.name,
        brand: colorToEdit.brand,
        code: colorToEdit.code,
        hex: colorToEdit.hex,
        finish: colorToEdit.finish,
        stock: String(colorToEdit.stock),
        minimumStock: String(colorToEdit.minimumStock),
        collection: colorToEdit.collection,
        location: colorToEdit.location,
        inventoryItemId: colorToEdit.inventoryItemId || 'SKU-OPI-BB',
        capacityMl: String(colorToEdit.capacityMl || 15),
        dosagePerServiceMl: String(colorToEdit.dosagePerServiceMl || 5),
        branchQ1: colorToEdit.branches.includes('Q1'),
        branchQ3: colorToEdit.branches.includes('Q3')
      });
    } else {
      setColorForm({
        name: '',
        brand: '',
        code: '',
        hex: '#d8b4b4',
        finish: 'Cream · Opaque',
        stock: '10',
        minimumStock: '5',
        collection: '',
        location: '',
        inventoryItemId: inventory[0]?.id || 'SKU-OPI-BB',
        capacityMl: '15',
        dosagePerServiceMl: '5',
        branchQ1: selectedBranch !== 'Q3',
        branchQ3: selectedBranch !== 'Q1'
      });
    }
    setFormError('');
    setFormMode('COLOR');
  };

  const submitDesign = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage()) return;

    if (!designForm.imageUrl.trim()) {
      setDesignImageError('Vui lòng tải lên hình ảnh mẫu Nail trước khi tạo mẫu.');
      setFormError('Vui lòng bổ sung hình ảnh cho mẫu thiết kế.');
      return;
    }

    if (!designForm.name.trim() || !designForm.collection.trim() || Number(designForm.duration) < 15 || Number(designForm.surcharge) < 0) {
      setFormError('Vui lòng nhập tên, bộ sưu tập, thời lượng và giá phụ thu hợp lệ.');
      return;
    }

    if (!designForm.baseServiceId) {
      setFormError('Vui lòng chọn dịch vụ áp dụng (Dịch vụ nền) cho mẫu Nail.');
      return;
    }

    if (!designForm.branchQ1 && !designForm.branchQ3) {
      setFormError('Mẫu Nail cần áp dụng tại ít nhất một chi nhánh.');
      return;
    }

    const branches = [designForm.branchQ1 ? 'Q1' : null, designForm.branchQ3 ? 'Q3' : null].filter(Boolean) as BranchCode[];

    if (selectedDesign) {
      const updated: NailDesign = {
        ...selectedDesign,
        name: designForm.name.trim(),
        collection: designForm.collection.trim(),
        baseServiceId: designForm.baseServiceId,
        styles: [designForm.style],
        level: Number(designForm.level) as NailDesign['level'],
        duration: Number(designForm.duration),
        surcharge: Number(designForm.surcharge),
        status: designForm.status,
        branches,
        materials: designForm.materials.split(',').map((item) => item.trim()).filter(Boolean),
        technicians: designForm.technicians.split(',').map((item) => item.trim()).filter(Boolean),
        online: designForm.online,
        notes: designForm.notes.trim(),
        imageUrl: designForm.imageUrl,
        updatedAt: '20/07/2026 · vừa xong'
      };
      setDesigns((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedDesign(updated);
      setNotice(`Đã cập nhật mẫu ${updated.name}.`);
    } else {
      const colorNames = designForm.colors.split(',').map((item) => item.trim()).filter(Boolean);
      const created: NailDesign = {
        id: `NAIL-${200 + designs.length}`,
        name: designForm.name.trim(),
        collection: designForm.collection.trim(),
        baseServiceId: designForm.baseServiceId,
        styles: [designForm.style],
        level: Number(designForm.level) as NailDesign['level'],
        duration: Number(designForm.duration),
        surcharge: Number(designForm.surcharge),
        status: designForm.status,
        branches,
        colors: colorNames.map((name, index) => ({ name, hex: ['#ead8d0', '#d6c7e5', '#b9c8d8'][index % 3], code: 'MỚI' })),
        materials: designForm.materials.split(',').map((item) => item.trim()).filter(Boolean),
        technicians: designForm.technicians.split(',').map((item) => item.trim()).filter(Boolean),
        bookings: 0,
        rating: 0,
        online: designForm.online,
        updatedAt: '20/07/2026 · vừa xong',
        notes: designForm.notes.trim(),
        preview: designs.length % previewBackgrounds.length,
        imageUrl: designForm.imageUrl
      };
      setDesigns((current) => [created, ...current]);
      setSelectedDesign(created);
      setNotice(`Đã tạo mẫu ${created.name}.`);
    }
    setFormMode(null);
  };

  const submitColor = (event: FormEvent) => {
    event.preventDefault();
    if (!requireManage()) return;

    if (!colorForm.name.trim() || !colorForm.brand.trim() || !colorForm.code.trim()) {
      setFormError('Vui lòng nhập tên màu, thương hiệu và mã màu.');
      return;
    }

    if (!colorForm.branchQ1 && !colorForm.branchQ3) {
      setFormError('Màu sơn cần được quản lý tại ít nhất một chi nhánh.');
      return;
    }

    const stock = Math.max(0, Number(colorForm.stock) || 0);
    const minimumStock = Math.max(0, Number(colorForm.minimumStock) || 0);
    const capacityMl = Math.max(1, Number(colorForm.capacityMl) || 15);
    const dosagePerServiceMl = Math.max(1, Number(colorForm.dosagePerServiceMl) || 5);

    const colorId = selectedColor ? selectedColor.id : `CLR-${colorForm.brand.slice(0, 3).toUpperCase()}-${colorForm.code.toUpperCase()}`;

    const created: PolishColor = {
      id: colorId,
      name: colorForm.name.trim(),
      brand: colorForm.brand.trim(),
      code: colorForm.code.trim(),
      hex: colorForm.hex,
      finish: colorForm.finish,
      stock,
      minimumStock,
      monthlyUsage: selectedColor ? selectedColor.monthlyUsage : 0,
      linkedDesigns: selectedColor ? selectedColor.linkedDesigns : 0,
      status: stock === 0 ? 'OUT' : stock <= minimumStock ? 'LOW' : 'ACTIVE',
      branches: [colorForm.branchQ1 ? 'Q1' : null, colorForm.branchQ3 ? 'Q3' : null].filter(Boolean) as BranchCode[],
      collection: colorForm.collection.trim() || 'Chưa phân loại',
      location: colorForm.location.trim() || 'Chưa xếp kệ',
      updatedAt: '20/07/2026',
      inventoryItemId: colorForm.inventoryItemId,
      capacityMl,
      dosagePerServiceMl
    };

    setColors((current) => {
      const exists = current.some((c) => c.id === created.id);
      const nextList = exists ? current.map((c) => (c.id === created.id ? created : c)) : [created, ...current];
      return syncColorsWithInventory(nextList, inventory);
    });
    setSelectedColor(created);
    setFormMode(null);
    setNotice(`Đã lưu màu sơn ${created.brand} ${created.name} và liên kết với Kho vật tư.`);
  };

  const updateDesignStatus = (design: NailDesign) => {
    if (!requireManage()) return;
    const next = design.status === 'HIDDEN' ? 'ACTIVE' : 'HIDDEN';
    const updated = { ...design, status: next as DesignStatus, online: next !== 'HIDDEN' && design.online };
    setDesigns((current) => current.map((item) => item.id === design.id ? updated : item));
    setSelectedDesign(updated);
    setNotice(next === 'HIDDEN' ? `Đã ẩn mẫu ${design.name}.` : `Đã mở bán lại mẫu ${design.name}.`);
  };

  const exportLibrary = () => {
    const rows = tab === 'DESIGNS'
      ? filteredDesigns.map((item) => {
          const baseSvc = findBaseService(item.baseServiceId);
          return [
            item.id,
            item.name,
            item.collection,
            `${baseSvc.id} - ${baseSvc.name}`,
            money(baseSvc.price),
            money(item.surcharge),
            money(baseSvc.price + item.surcharge),
            item.styles.join(' · '),
            `Cấp ${item.level}`,
            item.duration,
            designStatusMeta[item.status].label
          ];
        })
      : filteredColors.map((item) => [item.id, item.brand, item.name, item.code, item.finish, item.stock, item.minimumStock, colorStatusMeta[item.status].label]);

    const header = tab === 'DESIGNS'
      ? ['Mã mẫu', 'Tên mẫu', 'Bộ sưu tập', 'Dịch vụ áp dụng', 'Giá dịch vụ nền', 'Phụ thu mẫu', 'Tổng dự kiến', 'Phong cách', 'Độ khó', 'Thời lượng làm thêm', 'Trạng thái']
      : ['Mã', 'Thương hiệu', 'Tên màu', 'Mã màu', 'Hiệu ứng', 'Tồn kho', 'Tồn tối thiểu', 'Trạng thái'];

    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    link.download = tab === 'DESIGNS' ? 'thu-vien-mau-nail.csv' : 'bang-mau-son.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice('Đã xuất dữ liệu theo bộ lọc hiện tại.');
  };

  const switchTab = (next: LibraryTab) => {
    setTab(next);
    setStyleFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('POPULAR');
    onSearchQueryChange('');
  };

  const showNotice = notice || (accessMode !== 'full' ? (readOnlyReason || 'Bạn đang xem thư viện ở chế độ chỉ đọc theo quyền của gói.') : '');
  const selectedBaseServiceInForm = findBaseService(designForm.baseServiceId);

  return (
    <div className="space-y-5">
      {showNotice && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-800">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
              <Check className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-black">Cập nhật thư viện</p>
              <p className="mt-1 text-xs leading-5">{showNotice}</p>
            </div>
          </div>
          {notice && (
            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="Đóng thông báo"
              className="flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 text-violet-500 shadow-none"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <PageHeader
        title="Màu & mẫu Nail"
        actions={(
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:w-auto">
          <button
            type="button"
            onClick={exportLibrary}
            className="flex h-11 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 xl:min-w-[148px]"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span>Xuất dữ liệu</span>
          </button>
          <button
            type="button"
            onClick={() => openColorForm()}
            disabled={!canManage}
            className="flex h-11 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-violet-200 bg-violet-50 px-4 text-xs font-black text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 xl:min-w-[158px]"
          >
            <Palette className="h-4 w-4 shrink-0" />
            <span>Thêm màu sơn</span>
          </button>
          <button
            type="button"
            onClick={() => openDesignForm()}
            disabled={!canManage}
            className="flex h-11 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-violet-700 bg-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 xl:min-w-[164px]"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Thêm mẫu Nail</span>
          </button>
          </div>
        )}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Mẫu đang mở bán', value: activeDesigns.toLocaleString('vi-VN'), detail: `${branchDesigns.length - activeDesigns} bản nháp hoặc đang ẩn`, icon: Sparkles, tone: 'bg-violet-50 text-violet-600' },
          { label: 'Mã màu trong thư viện', value: branchColors.length.toLocaleString('vi-VN'), detail: `${unavailableColors} màu sắp hết hoặc hết hàng`, icon: Palette, tone: 'bg-blue-50 text-blue-600' },
          { label: 'Lượt chọn trong tháng', value: totalBookings.toLocaleString('vi-VN'), detail: '+18,6% so với tháng trước', icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-600' },
          { label: 'Phụ thu trung bình', value: money(averageSurcharge), detail: 'Theo các mẫu trong phạm vi', icon: CircleDollarSign, tone: 'bg-amber-50 text-amber-600' }
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="ta-metric-value mt-1.5 text-slate-950">{value}</p>
              </div>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-400">{detail}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 p-4 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => switchTab('DESIGNS')}
                className={`flex h-9 items-center gap-2 border-0 px-4 text-xs font-black shadow-none ${tab === 'DESIGNS' ? 'bg-white text-violet-700 shadow-sm' : 'bg-transparent text-slate-500'}`}
              >
                <Image className="h-4 w-4" />
                Thư viện mẫu Nail <span className="rounded-full bg-violet-50 px-2 py-0.5 text-caption text-violet-700">{branchDesigns.length}</span>
              </button>
              <button
                type="button"
                onClick={() => switchTab('COLORS')}
                className={`flex h-9 items-center gap-2 border-0 px-4 text-xs font-black shadow-none ${tab === 'COLORS' ? 'bg-white text-violet-700 shadow-sm' : 'bg-transparent text-slate-500'}`}
              >
                <Palette className="h-4 w-4" />
                Bảng màu sơn <span className="rounded-full bg-violet-50 px-2 py-0.5 text-caption text-violet-700">{branchColors.length}</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen((value) => !value)}
                className={`flex h-10 items-center gap-2 border px-3 text-xs font-bold shadow-sm ${filtersOpen || activeFilterCount ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                <Filter className="h-4 w-4" />
                Bộ lọc
                {activeFilterCount > 0 && <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-caption text-white">{activeFilterCount}</span>}
              </button>
              <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('GRID')}
                  aria-label="Xem dạng lưới"
                  className={`flex h-8 w-8 items-center justify-center border-0 p-0 shadow-none ${viewMode === 'GRID' ? 'bg-slate-100 text-violet-700' : 'bg-transparent text-slate-400'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  aria-label="Xem dạng danh sách"
                  className={`flex h-8 w-8 items-center justify-center border-0 p-0 shadow-none ${viewMode === 'LIST' ? 'bg-slate-100 text-violet-700' : 'bg-transparent text-slate-400'}`}
                >
                  <LayoutList className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {filtersOpen && (
            <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  placeholder={tab === 'DESIGNS' ? 'Tên mẫu, dịch vụ áp dụng, bộ sưu tập...' : 'Mã màu, thương hiệu...'}
                  className={`${inputClass} pl-10`}
                />
              </div>
              <BeautifulSelect value={styleFilter} onChange={(event) => setStyleFilter(event.target.value)} className={inputClass}>
                <option value="ALL">Tất cả {tab === 'DESIGNS' ? 'phong cách' : 'hiệu ứng'}</option>
                {tab === 'DESIGNS'
                  ? styles.map((style) => <option key={style} value={style}>{style}</option>)
                  : ['Cream', 'Sheer', 'Chrome', 'Jelly', 'Metallic'].map((finish) => <option key={finish} value={finish}>{finish}</option>)}
              </BeautifulSelect>
              <BeautifulSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>
                <option value="ALL">Tất cả trạng thái</option>
                {tab === 'DESIGNS'
                  ? Object.entries(designStatusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)
                  : Object.entries(colorStatusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </BeautifulSelect>
              <BeautifulSelect value={sortBy} onChange={(event) => setSortBy(event.target.value)} className={inputClass}>
                {tab === 'DESIGNS' ? (
                  <>
                    <option value="POPULAR">Lượt chọn nhiều nhất</option>
                    <option value="NEWEST">Mới cập nhật</option>
                    <option value="SURCHARGE_HIGH">Phụ thu cao nhất</option>
                    <option value="DURATION">Thời gian làm thêm ngắn nhất</option>
                  </>
                ) : (
                  <>
                    <option value="POPULAR">Dùng nhiều nhất</option>
                    <option value="STOCK_LOW">Tồn kho thấp nhất</option>
                    <option value="NEWEST">Mới cập nhật</option>
                    <option value="NAME">Tên A–Z</option>
                  </>
                )}
              </BeautifulSelect>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900">
                {tab === 'DESIGNS' ? `${filteredDesigns.length} mẫu Nail thiết kế` : `${filteredColors.length} màu sơn trong kho`}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Phạm vi: {selectedBranch === 'ALL' ? 'Tất cả chi nhánh' : `Chi nhánh ${branchLabel(selectedBranch as BranchCode)}`} · Quyền: {roleLabel}
              </p>
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setStyleFilter('ALL'); setStatusFilter('ALL'); }}
                className="h-8 border-0 bg-transparent px-2 text-xs font-black text-violet-600 shadow-none"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {tab === 'DESIGNS' ? (
            viewMode === 'GRID' ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredDesigns.map((design) => {
                  const baseSvc = findBaseService(design.baseServiceId);
                  const totalPrice = baseSvc.price + design.surcharge;

                  return (
                    <button
                      key={design.id}
                      type="button"
                      onClick={() => setSelectedDesign(design)}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-left shadow-sm transition hover:border-violet-300 hover:shadow-xl"
                    >
                      <div>
                        <NailPreview design={design} />
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-caption font-black uppercase tracking-wider text-violet-600">{design.id}</span>
                              <h3 className="mt-0.5 truncate text-base font-black text-slate-900">{design.name}</h3>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-bold ring-1 ${designStatusMeta[design.status].badge}`}>
                              {designStatusMeta[design.status].label}
                            </span>
                          </div>

                          {/* Base service linkage banner */}
                          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-violet-50/80 px-2.5 py-1.5 text-body font-bold text-violet-900">
                            <Link2 className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                            <span className="truncate">Nền: <span className="font-extrabold">{baseSvc.name}</span> ({money(baseSvc.price)})</span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1">
                            {design.styles.map((style) => (
                              <span key={style} className="rounded-md bg-slate-100 px-2 py-0.5 text-caption font-bold text-slate-600">
                                {style}
                              </span>
                            ))}
                          </div>

                          <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5">
                            <div>
                              <p className="text-caption font-semibold text-slate-400">Phụ thu mẫu</p>
                              <p className="mt-0.5 text-xs font-black text-violet-700">+{money(design.surcharge)}</p>
                            </div>
                            <div className="border-l border-slate-200 pl-2">
                              <p className="text-caption font-semibold text-slate-400">Tổng giá dự kiến</p>
                              <p className="mt-0.5 text-xs font-black text-emerald-600">{money(totalPrice)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs">
                        <div className="flex -space-x-1.5">
                          {design.colors.map((color) => (
                            <span
                              key={color.code}
                              title={`${color.name} · ${color.code}`}
                              className="h-5 w-5 rounded-full border border-white shadow-sm"
                              style={{ backgroundColor: color.hex }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-body font-bold text-slate-500">
                          <span>+{design.duration} phút</span>
                          <span className="flex items-center gap-1 text-amber-600">
                            <Star className="h-3.5 w-3.5 fill-amber-400" />
                            {design.rating || 'Mới'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {filteredDesigns.map((design) => {
                  const baseSvc = findBaseService(design.baseServiceId);
                  const totalPrice = baseSvc.price + design.surcharge;

                  return (
                    <button
                      key={design.id}
                      type="button"
                      onClick={() => setSelectedDesign(design)}
                      className="grid h-auto w-full items-center gap-3 rounded-none border-0 bg-white p-3 text-left shadow-none transition hover:bg-slate-50 sm:grid-cols-[110px_1.3fr_1.1fr_120px_100px]"
                    >
                      <div className="overflow-hidden rounded-xl">
                        <NailPreview design={design} compact />
                      </div>
                      <div className="min-w-0">
                        <p className="text-caption font-black text-violet-600">{design.id}</p>
                        <p className="mt-0.5 truncate text-sm font-black text-slate-900">{design.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{design.collection}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-xs font-bold text-violet-900">
                          <Link2 className="h-3 w-3 shrink-0 text-violet-600" />
                          <span className="truncate">{baseSvc.name} ({money(baseSvc.price)})</span>
                        </div>
                        <p className="mt-1 text-body text-slate-500">Độ khó cấp {design.level} · +{design.duration} phút</p>
                      </div>
                      <div>
                        <p className="text-caption font-medium text-slate-400">Phụ thu: +{money(design.surcharge)}</p>
                        <p className="text-xs font-black text-emerald-600">Tổng: {money(totalPrice)}</p>
                      </div>
                      <span className={`w-fit rounded-full px-2.5 py-1 text-caption font-bold ring-1 ${designStatusMeta[design.status].badge}`}>
                        {designStatusMeta[design.status].label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          ) : viewMode === 'GRID' ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredColors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="h-auto rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-200 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <span className="h-14 w-14 rounded-2xl border-4 border-white shadow-md ring-1 ring-slate-200" style={{ backgroundColor: color.hex }} />
                    <span className={`rounded-full px-2 py-1 text-caption font-bold ring-1 ${colorStatusMeta[color.status].badge}`}>
                      {colorStatusMeta[color.status].label}
                    </span>
                  </div>
                  <p className="mt-3 text-caption font-black uppercase tracking-wide text-slate-400">{color.brand} · {color.code}</p>
                  <h3 className="mt-1 text-base font-black text-slate-900">{color.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{color.finish}</p>
                  <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                    <div>
                      <p className="text-caption text-slate-400">Tồn kho</p>
                      <p className="mt-0.5 font-black text-slate-800">{color.stock} chai</p>
                    </div>
                    <div className="text-right">
                      <p className="text-caption text-slate-400">Mẫu liên kết</p>
                      <p className="mt-0.5 font-black text-violet-700">{color.linkedDesigns}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {filteredColors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="grid h-auto w-full items-center gap-3 rounded-none border-0 bg-white p-3 text-left shadow-none transition hover:bg-slate-50 sm:grid-cols-[54px_1.2fr_1fr_90px_110px]"
                >
                  <span className="h-11 w-11 rounded-xl border-2 border-white shadow ring-1 ring-slate-200" style={{ backgroundColor: color.hex }} />
                  <div>
                    <p className="text-xs font-black text-slate-900">{color.name}</p>
                    <p className="mt-0.5 text-caption text-slate-400">{color.brand} · {color.code}</p>
                  </div>
                  <p className="text-xs font-bold text-slate-600">{color.finish}</p>
                  <p className="text-xs font-black text-slate-800">{color.stock} chai</p>
                  <span className={`w-fit rounded-full px-2 py-1 text-caption font-bold ring-1 ${colorStatusMeta[color.status].badge}`}>
                    {colorStatusMeta[color.status].label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {((tab === 'DESIGNS' && filteredDesigns.length === 0) || (tab === 'COLORS' && filteredColors.length === 0)) && (
            <div className="py-20 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                {tab === 'DESIGNS' ? <Image className="h-6 w-6" /> : <Palette className="h-6 w-6" />}
              </span>
              <p className="mt-4 text-sm font-black text-slate-800">Không tìm thấy dữ liệu phù hợp</p>
              <p className="mt-1 text-xs text-slate-400">Thử đổi từ khóa hoặc xóa bộ lọc đang áp dụng.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Xu hướng thiết kế</h2>
              <p className="mt-1 text-xs text-slate-400">30 ngày gần nhất</p>
            </div>
            <BarChart3 className="h-5 w-5 text-violet-500" />
          </div>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Chrome & Pearl', value: 86, detail: '+38%' },
              { label: 'Milky Nude', value: 70, detail: '+24%' },
              { label: 'Cat Eye', value: 58, detail: '+18%' }
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-bold text-slate-600">{item.label}</span>
                  <span className="font-black text-violet-700">{item.detail}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Chất lượng thư viện</h2>
              <p className="mt-1 text-xs text-slate-400">Mức độ sẵn sàng phục vụ</p>
            </div>
            <PackageCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-xl font-black text-emerald-700">92%</p>
              <p className="mt-1 text-caption font-bold text-emerald-600">Có đủ màu</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-xl font-black text-blue-700">84%</p>
              <p className="mt-1 text-caption font-bold text-blue-600">Đủ KTV</p>
            </div>
            <div className="rounded-xl bg-violet-50 p-3">
              <p className="text-xl font-black text-violet-700">76%</p>
              <p className="mt-1 text-caption font-bold text-violet-600">Đã mở online</p>
            </div>
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            Tất cả mẫu Nail đều có dịch vụ nền được liên kết đúng cấu trúc giá.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Việc cần xử lý</h2>
              <p className="mt-1 text-xs text-slate-400">Ưu tiên của Tenant Admin</p>
            </div>
            <Tag className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {['Duyệt ảnh mẫu Ocean Glass 3D', `Tạo đề xuất nhập ${unavailableColors} màu`, 'Gắn KTV cho bộ sưu tập tháng 8'].map((item, index) => (
              <button key={item} type="button" className="flex h-auto w-full items-center gap-3 rounded-none border-0 bg-white py-3 text-left shadow-none">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${index === 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                  {index + 1}
                </span>
                <span className="flex-1 text-xs font-bold text-slate-700">{item}</span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            ))}
          </div>
        </article>
      </section>

      {/* Selected Design Modal */}
      {selectedDesign && (() => {
        const baseSvc = findBaseService(selectedDesign.baseServiceId);
        const totalPrice = baseSvc.price + selectedDesign.surcharge;

        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
            <button
              type="button"
              aria-label="Đóng chi tiết mẫu Nail"
              onClick={() => setSelectedDesign(null)}
              className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none cursor-default"
            />
            <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto z-10">
              {/* Header */}
              <div className="relative border-b border-slate-100 bg-white">
                <NailPreview design={selectedDesign} />
                <button
                  type="button"
                  onClick={() => setSelectedDesign(null)}
                  aria-label="Đóng"
                  className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-md backdrop-blur transition hover:bg-white hover:text-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="p-5 sm:p-6 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-violet-100/80 px-2.5 py-0.5 text-body font-black uppercase tracking-wide text-violet-700">
                      {selectedDesign.id}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-body font-bold ring-1 ${designStatusMeta[selectedDesign.status].badge}`}>
                      {designStatusMeta[selectedDesign.status].label}
                    </span>
                    {selectedDesign.online && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-body font-bold text-blue-700 ring-1 ring-blue-200">
                        Đang hiển thị online
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{selectedDesign.name}</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Bộ sưu tập: <span className="font-bold text-slate-700">{selectedDesign.collection}</span></p>
                </div>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                {/* Block 1: Dịch vụ nền & Tính giá */}
                <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-violet-900 font-extrabold text-xs">
                    <Link2 className="h-4 w-4 text-violet-600 shrink-0" />
                    <span>Dịch vụ nền áp dụng & Giá dự kiến</span>
                  </div>

                  <div className="mt-3.5 grid gap-3 sm:grid-cols-3 bg-white/80 rounded-xl p-3.5 border border-violet-100 shadow-xs text-xs">
                    <div>
                      <p className="text-caption font-bold uppercase tracking-wider text-slate-400">Dịch vụ nền áp dụng</p>
                      <p className="mt-1 font-extrabold text-slate-900">{baseSvc.name}</p>
                      <p className="mt-0.5 text-body text-slate-500">Mã: {baseSvc.id} · {money(baseSvc.price)}</p>
                    </div>
                    <div>
                      <p className="text-caption font-bold uppercase tracking-wider text-violet-600">Phụ thu mẫu Nail</p>
                      <p className="mt-1 font-black text-violet-700 text-sm">+{money(selectedDesign.surcharge)}</p>
                      <p className="mt-0.5 text-body text-violet-500">Chi phí thiết kế thêm</p>
                    </div>
                    <div className="rounded-xl bg-violet-600 p-2.5 text-white sm:text-right flex flex-col justify-center">
                      <p className="text-caption font-bold uppercase tracking-wider text-violet-200">Tổng giá dự kiến</p>
                      <p className="mt-0.5 text-base font-black">{money(totalPrice)}</p>
                    </div>
                  </div>

                  <p className="mt-2.5 text-body leading-4 text-violet-700/80">
                    * Mẫu Nail áp dụng kèm theo dịch vụ nền đã liên kết. Khách đặt mẫu sẽ được tính tổng chi phí dự kiến bao gồm dịch vụ nền và phụ thu mẫu.
                  </p>
                </section>

                {/* Block 2: Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                    <Clock3 className="h-4 w-4 text-blue-500" />
                    <p className="mt-2 text-caption font-bold text-slate-400 uppercase tracking-wider">Thời gian làm thêm</p>
                    <p className="mt-1 text-sm font-black text-slate-900">+{selectedDesign.duration} phút</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                    <p className="mt-2 text-caption font-bold text-amber-600 uppercase tracking-wider">Độ khó & Đánh giá</p>
                    <p className="mt-1 text-sm font-black text-amber-900">Cấp {selectedDesign.level} · {selectedDesign.rating || '—'}/5⭐</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <p className="mt-2 text-caption font-bold text-emerald-600 uppercase tracking-wider">Lượt đặt hàng</p>
                    <p className="mt-1 text-sm font-black text-emerald-900">{selectedDesign.bookings} lượt</p>
                  </div>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3.5">
                    <Store className="h-4 w-4 text-violet-500" />
                    <p className="mt-2 text-caption font-bold text-violet-600 uppercase tracking-wider">Chi nhánh áp dụng</p>
                    <p className="mt-1 text-xs font-black text-violet-900">{selectedDesign.branches.map(branchLabel).join(', ')}</p>
                  </div>
                </div>

                {/* Block 3: Màu sơn sử dụng */}
                <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-violet-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Màu sơn sử dụng ({selectedDesign.colors.length})</h3>
                  </div>
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                    {selectedDesign.colors.map((color) => (
                      <div key={color.code} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                        <span className="h-9 w-9 shrink-0 rounded-xl border-2 border-white shadow-xs ring-1 ring-slate-200" style={{ backgroundColor: color.hex }} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-slate-800">{color.name}</p>
                          <p className="mt-0.5 text-caption font-mono text-slate-400">{color.code}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Block 4: Materials & Technicians */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <section className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-fuchsia-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Vật liệu & Phụ kiện</h3>
                    </div>
                    <div className="mt-3 space-y-2">
                      {selectedDesign.materials.map((item) => (
                        <div key={item} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check className="h-3 w-3" />
                          </span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2">
                      <UserRoundCheck className="h-4 w-4 text-blue-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Kỹ thuật viên đủ kỹ năng</h3>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selectedDesign.technicians.length ? selectedDesign.technicians.map((item) => (
                        <span key={item} className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-body font-bold text-blue-700">{item}</span>
                      )) : <span className="text-xs text-rose-600">Chưa gắn kỹ thuật viên</span>}
                    </div>
                  </section>
                </div>

                {/* Block 5: Style tags */}
                <section className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-body font-bold text-slate-400 uppercase tracking-wider">Phong cách/Tag:</span>
                  {selectedDesign.styles.map((style) => (
                    <span key={style} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200 shadow-xs">
                      #{style}
                    </span>
                  ))}
                </section>

                {/* Block 6: Notes */}
                <section className="rounded-2xl bg-amber-50/90 border border-amber-200/80 p-4">
                  <p className="text-caption font-black uppercase tracking-wider text-amber-700">Lưu ý tư vấn & vận hành</p>
                  <p className="mt-1.5 text-xs leading-relaxed font-medium text-amber-900">{selectedDesign.notes || 'Chưa có lưu ý cho mẫu này.'}</p>
                </section>

                <p className="text-caption text-slate-400 text-center sm:text-left">
                  Cập nhật gần nhất: {selectedDesign.updatedAt} · Chi nhánh: {selectedDesign.branches.map(branchLabel).join(', ')}
                </p>
              </div>

              {/* Footer / Actions */}
              <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/90 px-6 py-4 backdrop-blur">
                <button
                  type="button"
                  onClick={() => openDesignForm(selectedDesign)}
                  disabled={!canManage}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  <Pencil className="h-4 w-4" />
                  Chỉnh sửa
                </button>
                <button
                  type="button"
                  onClick={() => updateDesignStatus(selectedDesign)}
                  disabled={!canManage}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-700 bg-violet-600 px-5 text-xs font-black text-white shadow-md shadow-violet-200 hover:bg-violet-700 transition disabled:opacity-50"
                >
                  {selectedDesign.status === 'HIDDEN' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {selectedDesign.status === 'HIDDEN' ? 'Mở bán mẫu Nail' : 'Ẩn khỏi thư viện'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Selected Color Modal */}
      {selectedColor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <button
            type="button"
            aria-label="Đóng chi tiết màu sơn"
            onClick={() => setSelectedColor(null)}
            className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none cursor-default"
          />
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto z-10">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <span
                  className="h-16 w-16 shrink-0 rounded-2xl border-4 border-white shadow-lg ring-1 ring-slate-200"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-caption font-bold ring-1 ${colorStatusMeta[selectedColor.status].badge}`}>
                      {colorStatusMeta[selectedColor.status].label}
                    </span>
                    <span className="text-body font-mono font-bold text-slate-400 uppercase">{selectedColor.id}</span>
                  </div>
                  <h2 className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight">{selectedColor.name}</h2>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">{selectedColor.brand} · Mã màu: <span className="font-bold text-slate-700">{selectedColor.code}</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedColor(null)}
                aria-label="Đóng"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs hover:bg-slate-100 hover:text-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Block 1: Chi tiết màu sơn & Mã HEX */}
              <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <p className="text-caption font-bold uppercase tracking-wider text-slate-400">Mã màu nội bộ</p>
                    <p className="mt-0.5 text-base font-black text-slate-900">{selectedColor.id}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl">
                    <span className="h-4 w-4 rounded-full border border-white/40" style={{ backgroundColor: selectedColor.hex }} />
                    <span className="font-mono text-xs font-black uppercase">{selectedColor.hex}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-caption font-bold text-slate-400 uppercase tracking-wider">Hiệu ứng</p>
                    <p className="mt-1 text-xs font-black text-slate-800">{selectedColor.finish}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-caption font-bold text-slate-400 uppercase tracking-wider">Bộ sưu tập</p>
                    <p className="mt-1 text-xs font-black text-slate-800">{selectedColor.collection}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-caption font-bold text-slate-400 uppercase tracking-wider">Vị trí lưu</p>
                    <p className="mt-1 text-xs font-black text-slate-800">{selectedColor.location}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-caption font-bold text-slate-400 uppercase tracking-wider">Định mức / lượt</p>
                    <p className="mt-1 text-xs font-black text-slate-800">{selectedColor.dosagePerServiceMl || 5} ml</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-caption font-bold text-slate-400 uppercase tracking-wider">Mẫu liên kết</p>
                    <p className="mt-1 text-xs font-black text-violet-700">{selectedColor.linkedDesigns} mẫu</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-caption font-bold text-slate-400 uppercase tracking-wider">Phạm vi sử dụng</p>
                    <p className="mt-1 text-xs font-black text-slate-800">{selectedColor.branches.map(branchLabel).join(' · ')}</p>
                  </div>
                </div>

                {/* Linked Inventory Item info */}
                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/80 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-violet-900">
                    <Link2 className="h-4 w-4 text-violet-600 shrink-0" />
                    Sản phẩm kho vật tư liên kết
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {inventory.find((i) => i.id === selectedColor.inventoryItemId)?.name || selectedColor.inventoryItemId || 'Chưa liên kết'}
                  </p>
                  <p className="mt-0.5 text-body text-slate-500">
                    Mã kho: {selectedColor.inventoryItemId || '—'} · Dung tích chai: {selectedColor.capacityMl || 15} ml
                  </p>
                </div>
              </div>

              {/* Block 2: Tồn kho & Định mức */}
              <section className={`rounded-2xl border p-4 sm:p-5 ${selectedColor.status === 'OUT' ? 'border-rose-200 bg-rose-50' : selectedColor.status === 'LOW' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-700">Tồn kho khả dụng</p>
                    <p className="mt-1 text-3xl font-black text-slate-950">{selectedColor.stock} <span className="text-sm font-semibold text-slate-500">chai</span></p>
                  </div>
                  <PackageCheck className="h-6 w-6 text-slate-500" />
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/80 border border-black/5">
                  <div
                    className={`h-full rounded-full transition-all ${selectedColor.status === 'OUT' ? 'bg-rose-500' : selectedColor.status === 'LOW' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (selectedColor.stock / Math.max(1, selectedColor.minimumStock)) * 100)}%` }}
                  />
                </div>
                <div className="mt-3 flex justify-between text-xs font-bold text-slate-600">
                  <span>Định mức tối thiểu: {selectedColor.minimumStock} chai</span>
                  <span>Sử dụng tháng: {selectedColor.monthlyUsage} lượt</span>
                </div>
              </section>
            </div>

            {/* Footer / Actions */}
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/90 px-6 py-4 backdrop-blur">
              <button
                type="button"
                onClick={() => { const c = selectedColor; setSelectedColor(null); openColorForm(c); }}
                disabled={!canManage}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" />
                Sửa thông tin
              </button>
              <button
                type="button"
                onClick={() => { if (!requireManage()) return; setNotice(`Đã tạo đề xuất nhập màu ${selectedColor.name}.`); setSelectedColor(null); }}
                disabled={!canManage}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-700 bg-violet-600 px-5 text-xs font-black text-white shadow-md shadow-violet-200 hover:bg-violet-700 transition disabled:opacity-50"
              >
                <PackageCheck className="h-4 w-4" />
                Tạo đề xuất nhập hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {formMode && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Đóng biểu mẫu" onClick={() => setFormMode(null)} className="absolute inset-0 min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none" />
          <form onSubmit={formMode === 'DESIGN' ? submitDesign : submitColor} className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <p className="text-caption font-black uppercase tracking-[0.12em] text-violet-600">{tenantName} · {roleLabel}</p>
                <h2 className="mt-1 text-lg font-black text-slate-900">
                  {formMode === 'DESIGN' ? (selectedDesign ? `Chỉnh sửa ${selectedDesign.id}` : 'Thêm mẫu Nail mới') : 'Thêm màu sơn mới'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {formMode === 'DESIGN'
                    ? 'Mẫu Nail được liên kết với một dịch vụ nền trong "Dịch vụ & giá". Giá tổng = Dịch vụ nền + Phụ thu mẫu.'
                    : 'Khai báo mã màu, hiệu ứng, tồn kho và phạm vi chi nhánh.'}
                </p>
              </div>
              <button type="button" onClick={() => setFormMode(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white p-0 text-slate-500 shadow-sm">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {formError && <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{formError}</div>}

              {formMode === 'DESIGN' ? (
                <>
                  <fieldset>
                    <legend className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
                      <Sparkles className="h-4 w-4 text-violet-600" />
                      Thông tin mẫu thiết kế
                    </legend>

                    {/* Image Upload Area */}
                    <div className="mb-4">
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <UploadCloud className="h-4 w-4 text-violet-600" />
                        Tải ảnh mẫu Nail <span className="text-rose-500">*</span>
                      </label>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />

                      {designForm.imageUrl ? (
                        <div className="space-y-2">
                          <div className="relative h-48 sm:h-56 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs">
                            <img
                              src={designForm.imageUrl}
                              alt="Preview mẫu Nail"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute right-3 top-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3 text-xs font-bold text-slate-700 shadow-md backdrop-blur transition hover:bg-white"
                              >
                                <Pencil className="h-3.5 w-3.5 text-violet-600" />
                                Đổi ảnh
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="flex h-8 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-500 px-3 text-xs font-bold text-white shadow-md transition hover:bg-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Xóa ảnh
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`group flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition ${
                            isDraggingImage
                              ? 'border-violet-500 bg-violet-100/50 scale-[0.99]'
                              : designImageError
                              ? 'border-rose-300 bg-rose-50/50 hover:border-rose-400'
                              : 'border-slate-300 bg-slate-50/60 hover:border-violet-400 hover:bg-violet-50/30'
                          }`}
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100/70 text-violet-600 shadow-xs transition group-hover:scale-105">
                            <UploadCloud className="h-5 w-5" />
                          </div>
                          <p className="mt-2 text-xs font-black text-slate-800">
                            Bấm để chọn ảnh hoặc kéo thả ảnh vào đây
                          </p>
                          <p className="mt-1 text-body text-slate-400">
                            Định dạng: <span className="font-bold text-slate-600">JPG, JPEG, PNG, WEBP</span> · Dung lượng tối đa: <span className="font-bold text-slate-600">5MB</span>
                          </p>
                        </div>
                      )}

                      {designImageError && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-600">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>{designImageError}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Tên mẫu Nail *</span>
                        <input
                          value={designForm.name}
                          onChange={(event) => setDesignForm((current) => ({ ...current, name: event.target.value }))}
                          className={inputClass}
                          placeholder="Ví dụ: Crystal French Chrome"
                        />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Bộ sưu tập *</span>
                        <input
                          value={designForm.collection}
                          onChange={(event) => setDesignForm((current) => ({ ...current, collection: event.target.value }))}
                          className={inputClass}
                          placeholder="Summer 2026"
                        />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Phong cách chính</span>
                        <BeautifulSelect
                          value={designForm.style}
                          onChange={(event) => setDesignForm((current) => ({ ...current, style: event.target.value }))}
                          className={inputClass}
                        >
                          {['French', 'Chrome', 'Ombre', 'Đính đá', '3D Gel', 'Minimal', 'Cat Eye'].map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </BeautifulSelect>
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Trạng thái</span>
                        <BeautifulSelect
                          value={designForm.status}
                          onChange={(event) => setDesignForm((current) => ({ ...current, status: event.target.value as DesignStatus }))}
                          className={inputClass}
                        >
                          {Object.entries(designStatusMeta).map(([value, meta]) => (
                            <option key={value} value={value}>{meta.label}</option>
                          ))}
                        </BeautifulSelect>
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="border-t border-slate-100 pt-5">
                    <legend className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
                      <Link2 className="h-4 w-4 text-violet-600" />
                      Liên kết Dịch vụ áp dụng & Tính giá
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="sm:col-span-2">
                        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          Dịch vụ áp dụng (Dịch vụ nền) *
                        </span>
                        <BeautifulSelect
                          value={designForm.baseServiceId}
                          onChange={(event) => setDesignForm((current) => ({ ...current, baseServiceId: event.target.value }))}
                          className={inputClass}
                        >
                          {baseServices.filter(s => s.status === 'ACTIVE').map((svc) => (
                            <option key={svc.id} value={svc.id}>
                              {svc.id} · {svc.name} ({money(svc.price)})
                            </option>
                          ))}
                        </BeautifulSelect>
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Phụ thu mẫu Nail (₫) *</span>
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          value={designForm.surcharge}
                          onChange={(event) => setDesignForm((current) => ({ ...current, surcharge: event.target.value }))}
                          className={inputClass}
                        />
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Độ khó</span>
                        <BeautifulSelect
                          value={designForm.level}
                          onChange={(event) => setDesignForm((current) => ({ ...current, level: event.target.value }))}
                          className={inputClass}
                        >
                          {[1, 2, 3, 4].map((level) => (
                            <option key={level} value={level}>Cấp {level}</option>
                          ))}
                        </BeautifulSelect>
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Thời gian làm thêm (phút)</span>
                        <input
                          type="number"
                          min="15"
                          step="5"
                          value={designForm.duration}
                          onChange={(event) => setDesignForm((current) => ({ ...current, duration: event.target.value }))}
                          className={inputClass}
                        />
                      </label>

                      {/* Live calculated price box */}
                      <div className="sm:col-span-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-3.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-3 font-semibold text-slate-700">
                          <div>
                            <span className="text-caption uppercase font-bold text-slate-500 block">Giá dịch vụ nền</span>
                            <span className="text-sm font-black text-slate-900">{selectedBaseServiceInForm ? selectedBaseServiceInForm.name : 'Sơn gel'} ({money(selectedBaseServiceInForm?.price || 0)})</span>
                          </div>
                          <span className="text-xl font-bold text-violet-400">+</span>
                          <div>
                            <span className="text-caption uppercase font-bold text-slate-500 block">Phụ thu mẫu</span>
                            <span className="text-sm font-black text-violet-700">{money(Number(designForm.surcharge) || 0)}</span>
                          </div>
                          <span className="text-xl font-bold text-violet-400">=</span>
                          <div className="rounded-xl bg-violet-600 px-3.5 py-2 text-white shadow-sm">
                            <span className="text-caption uppercase font-bold text-violet-200 block">Tổng giá dự kiến</span>
                            <span className="text-base font-black">{money((selectedBaseServiceInForm?.price || 0) + (Number(designForm.surcharge) || 0))}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="border-t border-slate-100 pt-5">
                    <legend className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
                      <Layers3 className="h-4 w-4 text-fuchsia-600" />
                      Màu, vật liệu & kỹ thuật viên
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Màu sử dụng</span>
                        <textarea
                          value={designForm.colors}
                          onChange={(event) => setDesignForm((current) => ({ ...current, colors: event.target.value }))}
                          className="min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                          placeholder="Bubble Bath, Aurora Pearl..."
                        />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Vật liệu & phụ kiện</span>
                        <textarea
                          value={designForm.materials}
                          onChange={(event) => setDesignForm((current) => ({ ...current, materials: event.target.value }))}
                          className="min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                          placeholder="Chrome powder, Crystal Mix..."
                        />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Kỹ thuật viên đủ kỹ năng</span>
                        <input
                          value={designForm.technicians}
                          onChange={(event) => setDesignForm((current) => ({ ...current, technicians: event.target.value }))}
                          className={inputClass}
                          placeholder="Thảo Nguyễn, Hà My..."
                        />
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="border-t border-slate-100 pt-5">
                    <legend className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
                      <Store className="h-4 w-4 text-blue-600" />
                      Phân phối & lưu ý
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <input
                          type="checkbox"
                          checked={designForm.branchQ1}
                          onChange={(event) => setDesignForm((current) => ({ ...current, branchQ1: event.target.checked }))}
                          className="h-4 w-4 accent-violet-600"
                        />
                        <span className="text-xs font-bold text-slate-700">Chi nhánh Quận 1</span>
                      </label>
                      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <input
                          type="checkbox"
                          checked={designForm.branchQ3}
                          onChange={(event) => setDesignForm((current) => ({ ...current, branchQ3: event.target.checked }))}
                          className="h-4 w-4 accent-violet-600"
                        />
                        <span className="text-xs font-bold text-slate-700">Chi nhánh Quận 3</span>
                      </label>
                      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <input
                          type="checkbox"
                          checked={designForm.online}
                          onChange={(event) => setDesignForm((current) => ({ ...current, online: event.target.checked }))}
                          className="h-4 w-4 accent-violet-600"
                        />
                        <span className="text-xs font-bold text-slate-700">Hiển thị đặt online</span>
                      </label>
                    </div>
                    <label className="mt-3 block">
                      <span className="mb-1.5 block text-xs font-bold text-slate-600">Lưu ý tư vấn & vận hành</span>
                      <textarea
                        value={designForm.notes}
                        onChange={(event) => setDesignForm((current) => ({ ...current, notes: event.target.value }))}
                        className="min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      />
                    </label>
                  </fieldset>
                </>
              ) : (
                <>
                  <fieldset>
                    <legend className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
                      <Palette className="h-4 w-4 text-violet-600" />
                      Nhận diện màu sơn
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Tên màu *</span>
                        <input
                          value={colorForm.name}
                          onChange={(event) => setColorForm((current) => ({ ...current, name: event.target.value }))}
                          className={inputClass}
                          placeholder="Bubble Bath"
                        />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Thương hiệu *</span>
                        <input
                          value={colorForm.brand}
                          onChange={(event) => setColorForm((current) => ({ ...current, brand: event.target.value }))}
                          className={inputClass}
                          placeholder="OPI"
                        />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Mã màu *</span>
                        <input
                          value={colorForm.code}
                          onChange={(event) => setColorForm((current) => ({ ...current, code: event.target.value }))}
                          className={inputClass}
                          placeholder="NL S86"
                        />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Mã HEX tham chiếu</span>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={colorForm.hex}
                            onChange={(event) => setColorForm((current) => ({ ...current, hex: event.target.value }))}
                            className="h-11 w-14 rounded-xl border border-slate-200 bg-white p-1"
                          />
                          <input
                            value={colorForm.hex}
                            onChange={(event) => setColorForm((current) => ({ ...current, hex: event.target.value }))}
                            className={inputClass}
                          />
                        </div>
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Hiệu ứng bề mặt</span>
                        <BeautifulSelect
                          value={colorForm.finish}
                          onChange={(event) => setColorForm((current) => ({ ...current, finish: event.target.value }))}
                          className={inputClass}
                        >
                          {['Cream · Opaque', 'Sheer · Nude', 'Chrome · Pearl', 'Jelly · Translucent', 'Metallic · Foil', 'Cat Eye · Magnetic'].map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </BeautifulSelect>
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Bộ sưu tập</span>
                        <input
                          value={colorForm.collection}
                          onChange={(event) => setColorForm((current) => ({ ...current, collection: event.target.value }))}
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="border-t border-slate-100 pt-5">
                    <legend className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
                      <PackageCheck className="h-4 w-4 text-emerald-600" />
                      Liên kết Kho vật tư & Tồn kho
                    </legend>

                    <div className="mb-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-3.5">
                      <label className="block">
                        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <Link2 className="h-3.5 w-3.5 text-violet-600" />
                          Liên kết sản phẩm Kho vật tư *
                        </span>
                        <BeautifulSelect
                          value={colorForm.inventoryItemId}
                          onChange={(event) => setColorForm((current) => ({ ...current, inventoryItemId: event.target.value }))}
                          className={inputClass}
                        >
                          {inventory.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.id} · {inv.name} ({inv.variant}) — Tồn: {inv.stock} {inv.unit}
                            </option>
                          ))}
                        </BeautifulSelect>
                        <p className="mt-1 text-body text-slate-500">
                          Tồn kho và trạng thái còn/hết hàng của màu sơn sẽ tự động cập nhật theo sản phẩm này.
                        </p>
                      </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Dung tích chai (ml) *</span>
                        <input
                          type="number"
                          min="1"
                          value={colorForm.capacityMl}
                          onChange={(event) => setColorForm((current) => ({ ...current, capacityMl: event.target.value }))}
                          className={inputClass}
                          placeholder="15"
                        />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Định mức sử dụng (ml/lượt) *</span>
                        <input
                          type="number"
                          min="1"
                          value={colorForm.dosagePerServiceMl}
                          onChange={(event) => setColorForm((current) => ({ ...current, dosagePerServiceMl: event.target.value }))}
                          className={inputClass}
                          placeholder="5"
                        />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Vị trí lưu</span>
                        <input
                          value={colorForm.location}
                          onChange={(event) => setColorForm((current) => ({ ...current, location: event.target.value }))}
                          className={inputClass}
                          placeholder="Kệ G-01"
                        />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Tồn hiện tại</span>
                        <input
                          type="number"
                          min="0"
                          value={colorForm.stock}
                          onChange={(event) => setColorForm((current) => ({ ...current, stock: event.target.value }))}
                          className={inputClass}
                        />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Tồn tối thiểu</span>
                        <input
                          type="number"
                          min="0"
                          value={colorForm.minimumStock}
                          onChange={(event) => setColorForm((current) => ({ ...current, minimumStock: event.target.value }))}
                          className={inputClass}
                        />
                      </label>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <input
                          type="checkbox"
                          checked={colorForm.branchQ1}
                          onChange={(event) => setColorForm((current) => ({ ...current, branchQ1: event.target.checked }))}
                          className="h-4 w-4 accent-violet-600"
                        />
                        <span className="text-xs font-bold text-slate-700">Chi nhánh Quận 1</span>
                      </label>
                      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <input
                          type="checkbox"
                          checked={colorForm.branchQ3}
                          onChange={(event) => setColorForm((current) => ({ ...current, branchQ3: event.target.checked }))}
                          className="h-4 w-4 accent-violet-600"
                        />
                        <span className="text-xs font-bold text-slate-700">Chi nhánh Quận 3</span>
                      </label>
                    </div>
                  </fieldset>
                </>
              )}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setFormMode(null)}
                className="border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 border border-violet-700 bg-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-violet-200"
              >
                <Check className="h-4 w-4" />
                {formMode === 'DESIGN' ? (selectedDesign ? 'Lưu thay đổi' : 'Tạo mẫu Nail') : 'Thêm màu sơn'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
