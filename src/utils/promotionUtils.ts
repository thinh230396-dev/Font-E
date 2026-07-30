export type ProgramType = 'VOUCHER' | 'PACKAGE' | 'REFERRAL' | 'HAPPY_HOUR';
export type ProgramStatus = 'ACTIVE' | 'DRAFT' | 'ENDING' | 'PAUSED';
export type BranchScope = 'ALL' | 'Q1' | 'Q3';
export type DiscountType = 'PERCENT' | 'FIXED';
export type ApplicationScope = 'ALL' | 'SERVICES_ONLY' | 'PRODUCTS_ONLY' | 'SELECTED_ITEMS';
export type ProgramAction = 'PAUSE' | 'DELETE' | 'DUPLICATE';

export interface LoyaltyProgram {
  id: string;
  code?: string;
  name: string;
  type: ProgramType;
  status: ProgramStatus;
  branch: BranchScope;
  audience: string;
  benefit: string;
  start: string;
  end: string;
  issued: number;
  redeemed: number;
  revenue: number;
  cost: number;
  members: number;
  rules: string[];
  channels: string[];
  owner: string;
  audit: string[];
  note?: string;
  userCreated?: boolean;

  // Cấu trúc điều kiện áp dụng
  minInvoiceValue: number;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number;
  maxTotalUsage?: number;
  maxUsagePerCustomer?: number;
  applScope: ApplicationScope;
  selectedItemNames?: string[];
}

export interface InvoiceItemForDiscount {
  name: string;
  type: 'SERVICE' | 'PRODUCT';
  quantity: number;
  unitPrice: number;
}

export interface DiscountValidationResult {
  isValid: boolean;
  reason?: string;
  eligibleSubtotal: number;
  discountAmount: number;
}

const money = (val: number) => `${new Intl.NumberFormat('vi-VN').format(val)}đ`;

export const defaultLoyaltyPrograms: LoyaltyProgram[] = [
  {
    id: 'LOY-003', code: 'LOY-003', name: 'Voucher sinh nhật tháng 7', type: 'VOUCHER', status: 'ACTIVE', branch: 'ALL',
    audience: 'Khách có sinh nhật trong tháng 7', benefit: 'Giảm 20% tối đa 250.000đ', start: '01/07/2026', end: '31/07/2026',
    issued: 104, redeemed: 44, revenue: 8600000, cost: 7200000, members: 104,
    minInvoiceValue: 500000, discountType: 'PERCENT', discountValue: 20, maxDiscount: 250000,
    maxTotalUsage: 500, maxUsagePerCustomer: 1, applScope: 'SERVICES_ONLY', selectedItemNames: [],
    rules: [
      'Giá trị hóa đơn tối thiểu: 500.000đ',
      'Giảm 20% (Tối đa 250.000đ)',
      'Phạm vi áp dụng: Chỉ áp dụng cho DỊCH VỤ',
      'Mỗi khách hàng được sử dụng tối đa 1 lần'
    ],
    channels: ['Zalo', 'SMS', 'Email'], owner: 'Lê Hoàng Nam',
    audit: ['18/07 · Hệ thống cấp thêm 3 voucher sinh nhật', '01/07 · Lê Hoàng Nam phê duyệt và kích hoạt', '28/06 · Thảo Nguyễn tạo bản nháp']
  },
  {
    id: 'LOY-008', code: 'MEMBER5', name: 'Mã giảm giá Thành viên', type: 'VOUCHER', status: 'ACTIVE', branch: 'ALL',
    audience: 'Khách hàng thành viên', benefit: 'Giảm 5% toàn bộ hóa đơn', start: '01/01/2026', end: '31/12/2026',
    issued: 500, redeemed: 120, revenue: 15000000, cost: 750000, members: 500,
    minInvoiceValue: 0, discountType: 'PERCENT', discountValue: 5,
    maxTotalUsage: 1000, maxUsagePerCustomer: 10, applScope: 'ALL', selectedItemNames: [],
    rules: ['Không yêu cầu giá trị hóa đơn tối thiểu', 'Giảm 5% (Không giới hạn mức giảm)', 'Phạm vi áp dụng: Toàn bộ hóa đơn'],
    channels: ['Zalo', 'Tại quầy'], owner: 'Tenant Admin',
    audit: ['01/01 · Kích hoạt mã MEMBER5']
  },
  {
    id: 'LOY-009', code: 'SALON10', name: 'Ưu đãi Salon 10%', type: 'VOUCHER', status: 'ACTIVE', branch: 'ALL',
    audience: 'Khách đặt lịch tại quầy', benefit: 'Giảm 10% toàn bộ hóa đơn', start: '01/01/2026', end: '31/12/2026',
    issued: 300, redeemed: 85, revenue: 12000000, cost: 1200000, members: 300,
    minInvoiceValue: 200000, discountType: 'PERCENT', discountValue: 10,
    maxTotalUsage: 500, maxUsagePerCustomer: 5, applScope: 'ALL', selectedItemNames: [],
    rules: ['Giá trị hóa đơn tối thiểu: 200.000đ', 'Giảm 10% (Không giới hạn mức giảm)', 'Phạm vi áp dụng: Toàn bộ hóa đơn'],
    channels: ['Tại quầy'], owner: 'Tenant Admin',
    audit: ['01/01 · Kích hoạt mã SALON10']
  },
  {
    id: 'LOY-010', code: 'VIP15', name: 'Tri ân VIP 15%', type: 'VOUCHER', status: 'ACTIVE', branch: 'ALL',
    audience: 'Khách hàng VIP Diamond', benefit: 'Giảm 15% tối đa 300.000đ', start: '01/01/2026', end: '31/12/2026',
    issued: 100, redeemed: 42, revenue: 25000000, cost: 3750000, members: 100,
    minInvoiceValue: 500000, discountType: 'PERCENT', discountValue: 15, maxDiscount: 300000,
    maxTotalUsage: 200, maxUsagePerCustomer: 3, applScope: 'ALL', selectedItemNames: [],
    rules: ['Giá trị hóa đơn tối thiểu: 500.000đ', 'Giảm 15% (Tối đa 300.000đ)', 'Phạm vi áp dụng: Toàn bộ hóa đơn'],
    channels: ['SMS', 'App'], owner: 'Tenant Admin',
    audit: ['01/01 · Kích hoạt mã VIP15']
  },
  {
    id: 'LOY-002', code: 'GELLOVER', name: 'Gói Gel Lover 6 buổi', type: 'PACKAGE', status: 'ACTIVE', branch: 'ALL',
    audience: 'Khách làm Gel định kỳ', benefit: '6 Gel Manicure · Tặng 1 tháo gel', start: '01/06/2026', end: '31/12/2026',
    issued: 124, redeemed: 79, revenue: 38400000, cost: 9700000, members: 124,
    minInvoiceValue: 0, discountType: 'FIXED', discountValue: 100000,
    maxTotalUsage: 200, maxUsagePerCustomer: 2, applScope: 'SERVICES_ONLY', selectedItemNames: ['Gel Manicure', 'Combo manicure', 'Sơn gel'],
    rules: ['Giá trị hóa đơn tối thiểu: 0đ', 'Giảm trực tiếp 100.000đ', 'Phạm vi áp dụng: Dịch vụ Gel'],
    channels: ['Tại quầy', 'Ứng dụng'], owner: 'Tenant Admin',
    audit: ['19/07 · Còn 418 lượt dịch vụ chưa sử dụng']
  },
  {
    id: 'LOY-004', code: 'REFERRAL100', name: 'Giới thiệu bạn – Cùng đẹp', type: 'REFERRAL', status: 'ACTIVE', branch: 'ALL',
    audience: 'Tất cả thành viên', benefit: 'Người giới thiệu và bạn cùng nhận 100.000đ', start: '01/07/2026', end: '30/09/2026',
    issued: 172, redeemed: 96, revenue: 21200000, cost: 9600000, members: 238,
    minInvoiceValue: 500000, discountType: 'FIXED', discountValue: 100000,
    maxTotalUsage: 1000, maxUsagePerCustomer: 1, applScope: 'ALL', selectedItemNames: [],
    rules: ['Giá trị hóa đơn tối thiểu: 500.000đ', 'Giảm trực tiếp 100.000đ', 'Phạm vi áp dụng: Toàn bộ hóa đơn'],
    channels: ['Zalo', 'QR tại quầy'], owner: 'Lê Hoàng Nam',
    audit: ['19/07 · Xác nhận 4 lượt giới thiệu hợp lệ']
  },
  {
    id: 'LOY-005', code: 'HAPPY15', name: 'Happy Hour 12h–14h', type: 'HAPPY_HOUR', status: 'ENDING', branch: 'Q3',
    audience: 'Khách Tiêu chuẩn và Thân thiết', benefit: 'Giảm 15% dịch vụ dưới 60 phút', start: '01/07/2026', end: '20/07/2026',
    issued: 240, redeemed: 68, revenue: 6800000, cost: 1100000, members: 68,
    minInvoiceValue: 300000, discountType: 'PERCENT', discountValue: 15, maxDiscount: 150000,
    maxTotalUsage: 300, maxUsagePerCustomer: 3, applScope: 'SERVICES_ONLY', selectedItemNames: [],
    rules: ['Giá trị hóa đơn tối thiểu: 300.000đ', 'Giảm 15% (Tối đa 150.000đ)', 'Phạm vi áp dụng: Dịch vụ'],
    channels: ['POS tại quầy', 'Zalo'], owner: 'Quản lý Quận 3',
    audit: ['18/07 · Cảnh báo chương trình còn 2 ngày']
  },
  {
    id: 'LOY-006', code: 'CHROME25', name: 'Summer Chrome Launch', type: 'VOUCHER', status: 'DRAFT', branch: 'Q1',
    audience: 'VIP và Thân thiết', benefit: 'Giảm 25% bộ sưu tập Chrome', start: '25/07/2026', end: '15/08/2026',
    issued: 0, redeemed: 0, revenue: 0, cost: 0, members: 398,
    minInvoiceValue: 400000, discountType: 'PERCENT', discountValue: 25, maxDiscount: 200000,
    maxTotalUsage: 500, maxUsagePerCustomer: 1, applScope: 'SELECTED_ITEMS', selectedItemNames: ['Chrome', 'Nail Art Premium'],
    rules: ['Giá trị hóa đơn tối thiểu: 400.000đ', 'Giảm 25% (Tối đa 200.000đ)'],
    channels: ['Instagram', 'Email'], owner: 'Hà My', note: 'Đang chờ Tenant Admin duyệt ngân sách 4.000.000đ.',
    audit: ['19/07 · Hà My gửi yêu cầu phê duyệt']
  },
  {
    id: 'LOY-007', code: 'WELCOME10', name: 'Welcome New Member', type: 'VOUCHER', status: 'PAUSED', branch: 'ALL',
    audience: 'Khách mới đăng ký thành viên', benefit: 'Giảm 10% đơn dịch vụ đầu tiên', start: '01/06/2026', end: '31/08/2026',
    issued: 186, redeemed: 82, revenue: 14600000, cost: 1640000, members: 186,
    minInvoiceValue: 350000, discountType: 'PERCENT', discountValue: 10, maxDiscount: 100000,
    maxTotalUsage: 500, maxUsagePerCustomer: 1, applScope: 'ALL', selectedItemNames: [],
    rules: ['Giá trị hóa đơn tối thiểu: 350.000đ', 'Giảm 10% (Tối đa 100.000đ)'],
    channels: ['SMS', 'Zalo'], owner: 'Tenant Admin', note: 'Tạm dừng để kiểm tra trùng voucher từ nguồn Instagram.',
    audit: ['17/07 · Tenant Admin tạm dừng chương trình']
  }
];

export function parseDateString(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const str = dateStr.trim();
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    return new Date(year, month, day);
  }
  const yyyymmdd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10) - 1;
    const day = parseInt(yyyymmdd[3], 10);
    return new Date(year, month, day);
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function generateProgramRulesText(program: Partial<LoyaltyProgram>): string[] {
  const rules: string[] = [];

  if (program.minInvoiceValue && program.minInvoiceValue > 0) {
    rules.push(`Giá trị hóa đơn tối thiểu: ${money(program.minInvoiceValue)}`);
  } else {
    rules.push('Không yêu cầu giá trị hóa đơn tối thiểu');
  }

  if (program.discountType === 'PERCENT') {
    if (program.maxDiscount && program.maxDiscount > 0) {
      rules.push(`Giảm ${program.discountValue}% (Tối đa ${money(program.maxDiscount)})`);
    } else {
      rules.push(`Giảm ${program.discountValue}% (Không giới hạn mức giảm)`);
    }
  } else if (program.discountType === 'FIXED') {
    rules.push(`Giảm trực tiếp ${money(program.discountValue || 0)}`);
  }

  if (program.applScope === 'SERVICES_ONLY') {
    rules.push('Phạm vi áp dụng: Chỉ áp dụng cho DỊCH VỤ');
  } else if (program.applScope === 'PRODUCTS_ONLY') {
    rules.push('Phạm vi áp dụng: Chỉ áp dụng cho SẢN PHẨM');
  } else if (program.applScope === 'SELECTED_ITEMS') {
    const itemsStr = (program.selectedItemNames || []).filter(Boolean).join(', ');
    rules.push(`Phạm vi áp dụng: Dịch vụ/Sản phẩm được chọn (${itemsStr || 'Mục đã chọn'})`);
  } else {
    rules.push('Phạm vi áp dụng: Toàn bộ hóa đơn');
  }

  if (program.maxUsagePerCustomer && program.maxUsagePerCustomer > 0) {
    rules.push(`Mỗi khách hàng được sử dụng tối đa ${program.maxUsagePerCustomer} lần`);
  }
  if (program.maxTotalUsage && program.maxTotalUsage > 0) {
    rules.push(`Tổng số lần sử dụng tối đa: ${program.maxTotalUsage} lượt`);
  }

  return rules;
}

export function validateAndCalculatePromotion({
  program,
  items,
  customerUsageCount = 0,
  branch,
  currentDate = new Date(),
}: {
  program: LoyaltyProgram;
  items: InvoiceItemForDiscount[];
  customerUsageCount?: number;
  branch?: string;
  currentDate?: Date;
}): DiscountValidationResult {
  const totalInvoiceSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  if (totalInvoiceSubtotal <= 0) {
    return {
      isValid: false,
      reason: 'Hóa đơn chưa có dịch vụ hoặc sản phẩm nào.',
      eligibleSubtotal: 0,
      discountAmount: 0,
    };
  }

  // 1. Kiểm tra trạng thái chương trình
  if (program.status === 'DRAFT') {
    return {
      isValid: false,
      reason: `Chương trình ưu đãi "${program.name}" đang ở trạng thái bản nháp, chưa được kích hoạt.`,
      eligibleSubtotal: 0,
      discountAmount: 0,
    };
  }
  if (program.status === 'PAUSED') {
    return {
      isValid: false,
      reason: `Chương trình ưu đãi "${program.name}" hiện đang bị tạm dừng hoạt động.`,
      eligibleSubtotal: 0,
      discountAmount: 0,
    };
  }
  if (program.status !== 'ACTIVE' && program.status !== 'ENDING') {
    return {
      isValid: false,
      reason: `Chương trình ưu đãi "${program.name}" không khả dụng.`,
      eligibleSubtotal: 0,
      discountAmount: 0,
    };
  }

  // 2. Kiểm tra ngày áp dụng / hết hạn
  if (program.start) {
    const startDate = parseDateString(program.start);
    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(currentDate);
      checkDate.setHours(0, 0, 0, 0);
      if (checkDate < startDate) {
        return {
          isValid: false,
          reason: `Ưu đãi "${program.name}" chưa đến ngày áp dụng (bắt đầu từ ${program.start}).`,
          eligibleSubtotal: 0,
          discountAmount: 0,
        };
      }
    }
  }

  if (program.end) {
    const endDate = parseDateString(program.end);
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
      const checkDate = new Date(currentDate);
      if (checkDate > endDate) {
        return {
          isValid: false,
          reason: `Ưu đãi "${program.name}" đã hết hạn sử dụng (ngày hết hạn: ${program.end}).`,
          eligibleSubtotal: 0,
          discountAmount: 0,
        };
      }
    }
  }

  // 3. Kiểm tra chi nhánh áp dụng
  if (branch && program.branch && program.branch !== 'ALL' && program.branch !== branch) {
    const targetBranch = program.branch === 'Q1' ? 'Quận 1' : program.branch === 'Q3' ? 'Quận 3' : program.branch;
    const currentBranch = branch === 'Q1' ? 'Quận 1' : branch === 'Q3' ? 'Quận 3' : branch;
    return {
      isValid: false,
      reason: `Chương trình "${program.name}" chỉ áp dụng tại chi nhánh ${targetBranch}, không áp dụng cho chi nhánh ${currentBranch}.`,
      eligibleSubtotal: 0,
      discountAmount: 0,
    };
  }

  // 4. Kiểm tra tổng số lần sử dụng tối đa
  if (program.maxTotalUsage && program.maxTotalUsage > 0 && program.redeemed >= program.maxTotalUsage) {
    return {
      isValid: false,
      reason: `Ưu đãi "${program.name}" đã hết lượt sử dụng (đã dùng ${program.redeemed}/${program.maxTotalUsage} lượt).`,
      eligibleSubtotal: 0,
      discountAmount: 0,
    };
  }

  // 5. Kiểm tra số lần sử dụng tối đa của mỗi khách hàng
  if (program.maxUsagePerCustomer && program.maxUsagePerCustomer > 0 && customerUsageCount >= program.maxUsagePerCustomer) {
    return {
      isValid: false,
      reason: `Khách hàng đã dùng tối đa số lần cho phép (${program.maxUsagePerCustomer} lần) cho ưu đãi này.`,
      eligibleSubtotal: 0,
      discountAmount: 0,
    };
  }

  // 6. Tính toán tổng tiền hợp lệ theo phạm vi áp dụng
  let eligibleSubtotal = 0;
  if (program.applScope === 'SERVICES_ONLY') {
    eligibleSubtotal = items
      .filter((item) => item.type === 'SERVICE')
      .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    if (eligibleSubtotal === 0) {
      return {
        isValid: false,
        reason: `Chương trình "${program.name}" chỉ áp dụng cho dịch vụ, nhưng hóa đơn chưa có dịch vụ nào.`,
        eligibleSubtotal: 0,
        discountAmount: 0,
      };
    }
  } else if (program.applScope === 'PRODUCTS_ONLY') {
    eligibleSubtotal = items
      .filter((item) => item.type === 'PRODUCT')
      .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    if (eligibleSubtotal === 0) {
      return {
        isValid: false,
        reason: `Chương trình "${program.name}" chỉ áp dụng cho sản phẩm, nhưng hóa đơn chưa có sản phẩm nào.`,
        eligibleSubtotal: 0,
        discountAmount: 0,
      };
    }
  } else if (program.applScope === 'SELECTED_ITEMS') {
    const selectedNames = (program.selectedItemNames || []).map((n) => n.trim().toLowerCase());
    eligibleSubtotal = items
      .filter((item) => selectedNames.length === 0 || selectedNames.some((s) => item.name.toLowerCase().includes(s)))
      .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    if (eligibleSubtotal === 0) {
      return {
        isValid: false,
        reason: `Hóa đơn chưa chứa các mục được áp dụng cho ưu đãi "${program.name}".`,
        eligibleSubtotal: 0,
        discountAmount: 0,
      };
    }
  } else {
    // 'ALL'
    eligibleSubtotal = totalInvoiceSubtotal;
  }

  // 7. Kiểm tra giá trị hóa đơn tối thiểu
  const minVal = program.minInvoiceValue || 0;
  if (eligibleSubtotal < minVal) {
    return {
      isValid: false,
      reason: `Hóa đơn chưa đạt giá trị tối thiểu (${money(minVal)}). Giá trị tính ưu đãi hiện tại: ${money(eligibleSubtotal)}.`,
      eligibleSubtotal,
      discountAmount: 0,
    };
  }

  // 8. Tính số tiền giảm giá
  let calculatedDiscount = 0;
  if (program.discountType === 'PERCENT') {
    calculatedDiscount = Math.round(eligibleSubtotal * (program.discountValue / 100));
    if (program.maxDiscount && program.maxDiscount > 0) {
      calculatedDiscount = Math.min(calculatedDiscount, program.maxDiscount);
    }
  } else {
    // 'FIXED'
    calculatedDiscount = program.discountValue || 0;
  }

  // Khống chế không cho giảm quá tổng tiền hóa đơn (đảm bảo sau giảm >= 0)
  const discountAmount = Math.min(Math.max(0, calculatedDiscount), totalInvoiceSubtotal);

  return {
    isValid: true,
    eligibleSubtotal,
    discountAmount,
  };
}

export function evaluateDiscountCode({
  rawCode,
  programs,
  items,
  branch,
  customerUsageCount = 0,
}: {
  rawCode: string;
  programs: LoyaltyProgram[];
  items: InvoiceItemForDiscount[];
  branch?: string;
  customerUsageCount?: number;
}): {
  appliedProgram: LoyaltyProgram | null;
  discountAmount: number;
  feedback: { isError: boolean; text: string } | null;
} {
  const cleanCode = rawCode.trim();
  if (!cleanCode) {
    return { appliedProgram: null, discountAmount: 0, feedback: null };
  }

  const upperCode = cleanCode.toUpperCase();
  const matchedProgram = programs.find((p) => {
    if (p.code && p.code.trim().toUpperCase() === upperCode) return true;
    if (p.id.trim().toUpperCase() === upperCode) return true;
    if (p.id.replace(/-/g, '').toUpperCase() === upperCode.replace(/-/g, '')) return true;
    if (p.name.trim().toUpperCase() === upperCode) return true;
    return false;
  });

  if (!matchedProgram) {
    return {
      appliedProgram: null,
      discountAmount: 0,
      feedback: {
        isError: true,
        text: `Mã giảm giá "${cleanCode}" không tồn tại trên hệ thống.`
      }
    };
  }

  const result = validateAndCalculatePromotion({
    program: matchedProgram,
    items,
    branch,
    customerUsageCount,
  });

  if (!result.isValid) {
    return {
      appliedProgram: matchedProgram,
      discountAmount: 0,
      feedback: {
        isError: true,
        text: result.reason || 'Mã chưa hợp lệ.'
      }
    };
  }

  return {
    appliedProgram: matchedProgram,
    discountAmount: result.discountAmount,
    feedback: {
      isError: false,
      text: `Áp dụng thành công: ${matchedProgram.name} (Giảm ${money(result.discountAmount)})`
    }
  };
}

