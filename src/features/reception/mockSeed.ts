/**
 * Dữ liệu mẫu còn lại của quầy: hàng bán lẻ, danh sách kỹ thuật viên cho ô chọn trên hóa đơn
 * nhập tay, và sơ đồ ghế theo chi nhánh.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27, và **cố ý gom vào một file mang tên "mock"** thay
 * vì để lẫn với hằng số thật: ba thứ dưới đây không có bảng nào phía sau (§9.3 và §9.4 cắt kho
 * sản phẩm bán lẻ và sơ đồ ghế khỏi MVP), nên nhìn tên file là biết ngay chúng chưa phải sự thật
 * của máy chủ. Hai màn dùng chúng đều đang mang dải nhãn "Dữ liệu mẫu".
 *
 * Bán một món cho khách vẫn ghi được vào hóa đơn THẬT — người ở quầy thêm nó thành một dòng
 * nhập tay; chỉ phần tồn kho và lượt bán ở đây là bịa.
 */

import type { BranchCode, CatalogItem } from './types';

export const productCatalog: CatalogItem[] = [
  { name: 'Dầu dưỡng móng Keratin', price: 170000, category: 'Dưỡng móng', stock: 24 },
  { name: 'Kem dưỡng tay Hạnh Nhân', price: 220000, category: 'Chăm sóc tay', stock: 18 },
  { name: 'Serum phục hồi móng Keratin', price: 290000, category: 'Dưỡng móng', stock: 12 },
  { name: 'Sơn dưỡng bóng tại nhà', price: 260000, category: 'Sơn bán lẻ', stock: 16 },
  { name: 'Bộ chăm sóc móng mini', price: 390000, category: 'Bộ sản phẩm', stock: 8 },
  { name: 'Nước rửa tay dưỡng ẩm', price: 145000, category: 'Chăm sóc tay', stock: 22 },
  { name: 'Dũa móng cao cấp OPI', price: 85000, category: 'Phụ kiện', stock: 35 },
  { name: 'Set Sticker Nail Art 3D', price: 95000, category: 'Phụ kiện', stock: 28 },
  { name: 'Muối ngâm chân thảo mộc 500g', price: 180000, category: 'Chăm sóc chân', stock: 15 },
];

export const invoiceStaff = ['Thảo Nguyễn', 'Minh Châu', 'Hà My', 'Quốc Bảo', 'Thuỳ Dương', 'An Nhiên', 'Gia Huy', 'Chưa phân công'];
/**
 * Ghế và phòng theo chi nhánh — dữ liệu mẫu, vì "Ghế & khu vực" nằm ở mức C của §9.3 và
 * không có bảng nào phía sau. Chi nhánh không có trong bảng này thì rơi về `DEFAULT_STATIONS`.
 */
export const stationCatalog: Record<string, string[]> = {
  Q3: ['M-01', 'M-02', 'M-03', 'M-04', 'M-05', 'M-06', 'P-01', 'P-02', 'P-03', 'P-04', 'VIP-01', 'VIP-02'],
  Q1: ['M-11', 'M-12', 'M-13', 'M-14', 'P-11', 'P-12', 'P-13', 'V-11', 'V-12'],
};

/** Chi nhánh chưa có sơ đồ ghế mẫu vẫn phải chọn được chỗ, thay vì nhận một danh sách rỗng. */
export const DEFAULT_STATIONS = ['M-01', 'M-02', 'M-03', 'M-04', 'P-01', 'P-02', 'VIP-01'];

export const stationsFor = (branch: BranchCode): string[] => stationCatalog[branch] || DEFAULT_STATIONS;
