/**
 * Danh mục tra cứu của quầy lễ tân: độ khó vẽ nail art, mẫu nail art, bảng màu sơn, phụ liệu
 * đính kèm, và các ghi chú dị ứng thường gặp.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27 — đây là **dữ liệu tra cứu thuần túy**, không có
 * một nhánh logic nào, nên nó chẳng có lý do gì để nằm chung với một cây render sáu nghìn dòng.
 *
 * ⚠️ Năm danh mục này vẫn là dữ liệu mẫu: §9.4 của lộ trình cắt thư viện mẫu nail và bảng màu
 * khỏi MVP, nên máy chủ không có bảng nào cho chúng. Chúng KHÔNG sinh ra lịch hẹn hay hóa đơn
 * thật — chỉ làm phần mô tả và phụ thu trên dòng hóa đơn mà người ở quầy tự nhập.
 */

export interface ArtDifficultyPreset {
  level: number;
  label: string;
  shortLabel: string;
  surcharge: number;
  badge: string;
  description: string;
}

export const ART_DIFFICULTY_PRESETS: ArtDifficultyPreset[] = [
  { level: 0, label: 'Sơn trơn / Không kèm vẽ mẫu (+0đ)', shortLabel: 'Sơn trơn (+0đ)', surcharge: 0, badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', description: 'Chỉ sơn màu trơn cơ bản, không có vẽ mẫu hoặc họa tiết' },
  { level: 1, label: 'Độ khó 1 · Cơ bản (+50.000đ)', shortLabel: 'Cơ bản (+50k)', surcharge: 50000, badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800', description: 'Vẽ line đơn giản, chấm bi, french đầu móng, dán sticker 2-4 ngón' },
  { level: 2, label: 'Độ khó 2 · Tiêu chuẩn (+100.000đ)', shortLabel: 'Tiêu chuẩn (+100k)', surcharge: 100000, badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800', description: 'Ombre chuyển màu, vân đá Marble, mắt mèo Cat Eye, vẽ hoa nổi 4-6 ngón' },
  { level: 3, label: 'Độ khó 3 · Nâng cao / Chi tiết (+200.000đ)', shortLabel: 'Nâng cao (+200k)', surcharge: 200000, badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800', description: 'Vẽ hoạt hình Anime, vẽ hoa tả thực nhiều tầng, họa tiết phức tạp 10 ngón' },
  { level: 4, label: 'Độ khó 4 · Masterpiece / 3D (+350.000đ)', shortLabel: '3D/Full set (+350k)', surcharge: 350000, badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800', description: 'Vẽ tranh phong cảnh nghệ thuật, đắp nổi 3D, đính đá & charm pha lê full set' },
  { level: 99, label: 'Tùy chỉnh giá theo mẫu riêng của khách', shortLabel: 'Tùy chỉnh giá', surcharge: 0, badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800', description: 'Lễ tân tự nhập mức phụ thu / giá thỏa thuận riêng dựa trên mẫu khách gửi' },
];

export interface NailArtTemplate {
  id: string;
  name: string;
  defaultLevel: number;
  category: string;
  surcharge: number;
  description: string;
  popularTone?: string;
  tags: string[];
  duration: number;
  baseServiceId?: string;
  imageUrl?: string;
  preview?: number;
  colors?: Array<{ name: string; hex: string; code: string }>;
  materials?: string[];
}

export const NAIL_ART_TEMPLATES: NailArtTemplate[] = [
  { id: 'ART-01', name: 'Vẽ hoa nổi 3D (3D Floral Art)', defaultLevel: 2, category: 'Vẽ hoa & Đắp nổi', surcharge: 100000, description: 'Đắp cánh hoa nổi 3D mềm mại, đính nhụy ngọc trai nhỏ xinh', tags: ['hoa 3D', 'ngọc trai', 'nữ tính'], duration: 30 },
  { id: 'ART-02', name: 'Vẽ hoạt hình Anime / Nhân vật', defaultLevel: 3, category: 'Nhân vật hoạt hình', surcharge: 200000, description: 'Vẽ cọ nét nhân vật hoạt hình Anime, chi tiết mắt và biểu cảm tinh xảo', tags: ['anime', 'hoạt hình', 'chi tiết'], duration: 45 },
  { id: 'ART-03', name: 'Vẽ tranh phong cảnh / Nghệ thuật trừu tượng', defaultLevel: 4, category: 'Tranh nghệ thuật', surcharge: 350000, description: 'Vẽ tranh nghệ thuật phong cảnh/sơn dầu đa tầng theo yêu cầu riêng', tags: ['phong cảnh', 'sơn dầu', 'masterpiece'], duration: 60 },
  { id: 'ART-04', name: 'Vân đá cẩm thạch Marble Art', defaultLevel: 2, category: 'Hiệu ứng đá', surcharge: 100000, description: 'Vân đá loang cẩm thạch tự nhiên viền nhũ vàng sang trọng', tags: ['marble', 'vân đá', 'sang trọng'], duration: 25 },
  { id: 'ART-05', name: 'Ombre chuyển sắc Hàn Quốc', defaultLevel: 1, category: 'Ombre & Gradient', surcharge: 50000, description: 'Chuyển sắc mượt mà phong cách Hàn Quốc dịu dàng', tags: ['ombre', 'gradient', 'hàn quốc'], duration: 20 },
  { id: 'ART-06', name: 'Mắt mèo kim cương Cat Eye', defaultLevel: 2, category: 'Hiệu ứng lấp lánh', surcharge: 100000, description: 'Hút mắt mèo vệt sáng kim cương chuyển động theo góc nhìn', tags: ['cat eye', 'mắt mèo', 'lấp lánh'], duration: 20 },
  { id: 'ART-07', name: 'Tráng gương Chrome Aurora', defaultLevel: 2, category: 'Tráng gương Chrome', surcharge: 100000, description: 'Hiệu ứng tráng gương ánh xà cừ / bạc bóng gương siêu sáng', tags: ['chrome', 'tráng gương', 'aurora'], duration: 20 },
  { id: 'ART-08', name: 'Đính đá Swarovski & Charm nơ 3D', defaultLevel: 3, category: 'Đính đá & Charm', surcharge: 200000, description: 'Đính pha lê Swarovski sáng lấp lánh kết hợp charm nơ 3D', tags: ['đính đá', 'swarovski', 'charm 3d'], duration: 35 },
  { id: 'ART-09', name: 'French nghệ thuật cách điệu', defaultLevel: 1, category: 'French Art', surcharge: 50000, description: 'Vẽ french đầu móng đường lượn sóng hoặc viền đôi cá tính', tags: ['french', 'đầu móng', 'tối giản'], duration: 20 },
  { id: 'ART-10', name: 'Mẫu vẽ tùy chọn theo ảnh khách gửi', defaultLevel: 99, category: 'Mẫu tự chọn', surcharge: 150000, description: 'Khách gửi ảnh mẫu trên điện thoại, KTV và quầy định giá linh hoạt', tags: ['tự chọn', 'theo mẫu', 'linh hoạt'], duration: 40 },
];

export interface PolishColorOption {
  id: string;
  name: string;
  brand: string;
  code: string;
  hex: string;
  finish: string;
}

export const POLISH_COLOR_OPTIONS: PolishColorOption[] = [
  { id: 'CLR-01', name: 'Bubble Bath (Nude hồng sheer)', brand: 'OPI', code: 'NL S86', hex: '#e9c9c2', finish: 'Sheer Nude' },
  { id: 'CLR-02', name: 'Merlot Ruby (Đỏ rượu sang chảnh)', brand: 'DND', code: '751', hex: '#681c2c', finish: 'Cream Đỏ rượu' },
  { id: 'CLR-03', name: 'Milky White (Trắng sữa tự nhiên)', brand: 'DND', code: 'MW-01', hex: '#f5eee8', finish: 'Milky Pastel' },
  { id: 'CLR-04', name: 'Aurora Pearl (Ánh ngọc trai tím)', brand: 'AP', code: 'AP-03', hex: '#d9d4ea', finish: 'Pearl Shimmer' },
  { id: 'CLR-05', name: 'Glass Ocean Blue (Thạch pha lê)', brand: 'GB', code: 'GB-02', hex: '#7bc5d9', finish: 'Jelly Blue' },
  { id: 'CLR-06', name: 'Liquid Gold (Nhũ vàng ánh kim)', brand: 'LG', code: 'LG-08', hex: '#c99b42', finish: 'Metallic Gold' },
  { id: 'CLR-07', name: 'Blush Petal (Hồng cánh hoa)', brand: 'BP', code: 'BP-08', hex: '#efb7c0', finish: 'Soft Blush' },
  { id: 'CLR-08', name: 'Cat Eye Magnet Silver (Mắt mèo xám)', brand: 'CE', code: 'CE-05', hex: '#949bb0', finish: 'Magnetic Silver' },
];

export interface AttachedAccessoryOption {
  id: string;
  name: string;
  price: number;
  category: string;
}

export const ATTACHED_ACCESSORY_OPTIONS: AttachedAccessoryOption[] = [
  { id: 'ACC-01', name: 'Không kèm phụ kiện thêm', price: 0, category: 'Mặc định' },
  { id: 'ACC-02', name: 'Charm nơ 3D ngọc trai (2 ngón)', price: 40000, category: 'Charm 3D' },
  { id: 'ACC-03', name: 'Set đá pha lê Swarovski mini (4 ngón)', price: 60000, category: 'Đá pha lê' },
  { id: 'ACC-04', name: 'Foil ánh kim & Xà cừ đại dương', price: 50000, category: 'Hiệu ứng' },
  { id: 'ACC-05', name: 'Dầu dưỡng viền móng Keratin (tại chỗ)', price: 30000, category: 'Dưỡng móng' },
  { id: 'ACC-06', name: 'Top coat tráng gương bóng siêu bền', price: 35000, category: 'Sơn phủ' },
];

export interface AllergyOrSpecialNoteOption {
  id: string;
  label: string;
  shortLabel: string;
  type: 'ALLERGY' | 'SENSITIVITY' | 'PREFERENCE' | 'VIP';
  icon: string;
  tone: string;
}

export const COMMON_ALLERGY_SPECIAL_NOTES: AllergyOrSpecialNoteOption[] = [
  { id: 'AL-01', label: 'Dị ứng Axeton / Cồn / Hóa chất', shortLabel: 'Dị ứng axeton/cồn', type: 'ALLERGY', icon: '⚠️', tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30' },
  { id: 'AL-02', label: 'Da mỏng / Dễ rát / Chảy máu', shortLabel: 'Da tay mỏng dễ rát', type: 'SENSITIVITY', icon: '⚠️', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30' },
  { id: 'AL-03', label: 'Móng yếu / Mỏng / Dễ gãy nứt', shortLabel: 'Móng mỏng yếu', type: 'SENSITIVITY', icon: '💅', tone: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/30' },
  { id: 'AL-04', label: 'Không dùng tinh dầu / Bạc hà', shortLabel: 'Tránh bạc hà', type: 'ALLERGY', icon: '🌿', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' },
  { id: 'AL-05', label: 'Yêu cầu thợ làm nhẹ tay, sợ đau', shortLabel: 'Làm nhẹ tay', type: 'PREFERENCE', icon: '✨', tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30' },
  { id: 'AL-06', label: 'Khách VIP / Tiêu chuẩn khắt khe', shortLabel: 'Khách VIP', type: 'VIP', icon: '⭐', tone: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30' },
  { id: 'AL-07', label: 'Khách đang vội / Cần làm nhanh', shortLabel: 'Cần làm gấp', type: 'PREFERENCE', icon: '⚡', tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30' },
];
