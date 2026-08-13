# Quy chuẩn và quy tắc thiết kế UI/UX Frontend

> Tài liệu này là nguồn tham chiếu chung khi thiết kế, phát triển và kiểm thử giao diện. Nội dung ưu tiên cho phần mềm quản lý tiệm Nail, nhưng có thể áp dụng cho phần lớn dashboard, trang quản trị và ứng dụng frontend khác.

## Bắt đầu nhanh

Cài đặt và chạy dự án ở chế độ phát triển:

```bash
npm install
npm run dev
```

Ứng dụng mặc định chạy tại `http://localhost:3000` (cấu hình trong `package.json` và `.env.example`).

Các lệnh khác:

| Lệnh | Mục đích |
|---|---|
| `npm run build` | Build bản production vào thư mục `dist/` |
| `npm run preview` | Xem trước bản build production |
| `npm run lint` | Kiểm tra kiểu dữ liệu TypeScript (`tsc --noEmit`) |

## Mục lục

1. [Mục tiêu và phạm vi](#1-mục-tiêu-và-phạm-vi)
2. [Nguyên tắc chung](#2-nguyên-tắc-chung)
3. [Design token](#3-design-token)
4. [Typography](#4-typography)
5. [Màu sắc](#5-màu-sắc)
6. [Spacing system](#6-spacing-system)
7. [Layout và grid](#7-layout-và-grid)
8. [Cấu trúc module và trang](#8-cấu-trúc-module-và-trang)
9. [Card](#9-card)
10. [Button](#10-button)
11. [Form, input và validation](#11-form-input-và-validation)
12. [Table](#12-table)
13. [Modal và drawer](#13-modal-và-drawer)
14. [Icon](#14-icon)
15. [Trạng thái và badge](#15-trạng-thái-và-badge)
16. [Navigation, sidebar và header](#16-navigation-sidebar-và-header)
17. [Responsive](#17-responsive)
18. [Dark mode](#18-dark-mode)
19. [Accessibility](#19-accessibility)
20. [Các trạng thái UX](#20-các-trạng-thái-ux)
21. [Quy ước đặt tên CSS và component](#21-quy-ước-đặt-tên-css-và-component)
22. [Tái sử dụng component](#22-tái-sử-dụng-component)
23. [Những điều không nên làm](#23-những-điều-không-nên-làm)
24. [Checklist hoàn thành màn hình](#24-checklist-hoàn-thành-màn-hình)
25. [Ví dụ CSS variables](#25-ví-dụ-css-variables)
26. [Cấu trúc thư mục frontend](#26-cấu-trúc-thư-mục-frontend)

---

## 1. Mục tiêu và phạm vi

Tài liệu nhằm bảo đảm:

- Giao diện nhất quán giữa các module như Lịch hẹn, Khách hàng, Kỹ thuật viên, Dịch vụ, Sản phẩm, Hóa đơn và Báo cáo.
- Người dùng hoàn thành công việc nhanh, ít nhầm lẫn và luôn hiểu trạng thái của hệ thống.
- Component dễ tái sử dụng, bảo trì, kiểm thử và mở rộng.
- Giao diện hoạt động tốt trên desktop, tablet, mobile, chế độ sáng và tối.
- Sản phẩm đáp ứng các yêu cầu accessibility cơ bản.

Mọi ngoại lệ so với quy chuẩn cần có lý do về nghiệp vụ hoặc trải nghiệm người dùng, được ghi lại trong tài liệu thiết kế hoặc pull request.

## 2. Nguyên tắc chung

### 2.1. Nhất quán

Một thành phần có cùng vai trò phải có cùng hình thức và hành vi trên mọi màn hình. Ví dụ, `Tạo lịch hẹn`, `Thêm khách hàng` và `Tạo hóa đơn` đều là hành động chính nên dùng cùng một kiểu Primary Button.

### 2.2. Phân cấp thị giác rõ ràng

- Mỗi màn hình chỉ nên có một tiêu đề trang rõ ràng.
- Mỗi khu vực chỉ nên có một hành động chính nổi bật.
- Dùng kích thước chữ, độ đậm, màu sắc và khoảng cách để thể hiện mức độ quan trọng.
- Nội dung quan trọng xuất hiện trước; chi tiết phụ có thể đặt trong trang chi tiết, tooltip, popover hoặc drawer.

### 2.3. Ưu tiên công việc của người dùng

- Thiết kế theo luồng công việc, không theo cấu trúc dữ liệu nội bộ.
- Hạn chế số bước để hoàn thành tác vụ thường xuyên.
- Giữ lại ngữ cảnh khi người dùng quay lại danh sách: bộ lọc, từ khóa, trang hiện tại và vị trí cuộn nếu phù hợp.
- Dùng ngôn ngữ gần với nghiệp vụ tiệm Nail, ví dụ `Lịch hẹn`, `Kỹ thuật viên`, `Ghế`, `Dịch vụ`, `Tiền tip`.

### 2.4. Có phản hồi cho mọi thao tác

Sau khi người dùng thao tác, hệ thống phải thể hiện ít nhất một trong các trạng thái: đang xử lý, thành công, thất bại hoặc cần bổ sung thông tin. Không để nút bấm “im lặng”.

### 2.5. Phòng tránh lỗi trước khi báo lỗi

- Vô hiệu hóa hành động khi chưa đủ điều kiện và giải thích lý do nếu không hiển nhiên.
- Cảnh báo xung đột lịch hẹn trước khi lưu.
- Xác nhận các thao tác phá hủy hoặc khó hoàn tác.
- Không xóa dữ liệu chỉ bằng một thao tác vô tình; ưu tiên soft delete hoặc cho phép hoàn tác nếu nghiệp vụ hỗ trợ.

### 2.6. Nội dung dễ hiểu

- Dùng câu ngắn, động từ rõ: `Lưu thay đổi`, `Xác nhận thanh toán`, `Hủy lịch hẹn`.
- Tránh thuật ngữ kỹ thuật, viết tắt không phổ biến và thông báo lỗi chung chung.
- Định dạng ngày, giờ, tiền tệ và số điện thoại nhất quán theo locale của sản phẩm.

## 3. Design token

Design token là tên có ý nghĩa đại diện cho màu, kích thước, khoảng cách, bo góc, bóng đổ, typography và chuyển động. Không dùng giá trị rời rạc trực tiếp trong component nếu giá trị đó đã có token.

### 3.1. Các nhóm token tối thiểu

- `color`: brand, background, surface, text, border, trạng thái.
- `font`: family, size, weight, line-height.
- `space`: khoảng cách theo thang đo.
- `radius`: bo góc.
- `shadow`: độ nổi.
- `size`: chiều cao control, sidebar, header.
- `z-index`: lớp hiển thị.
- `motion`: thời lượng và easing.
- `breakpoint`: mốc responsive.

### 3.2. Token gốc và token ngữ nghĩa

Ưu tiên token ngữ nghĩa trong component:

```css
/* Token gốc */
--violet-600: #7c3aed;
--gray-900: #111827;

/* Token ngữ nghĩa */
--color-primary: var(--violet-600);
--color-text-primary: var(--gray-900);
```

Component dùng `--color-primary`, không dùng trực tiếp `#7c3aed`. Cách này giúp thay thương hiệu và hỗ trợ dark mode dễ hơn.

## 4. Typography

### 4.1. Font chữ

- Dùng tối đa 1–2 font trong toàn hệ thống.
- Khuyến nghị: `Inter`, `Be Vietnam Pro`, `Roboto` hoặc font hệ thống.
- Luôn có fallback:

```css
font-family: "Inter", "Be Vietnam Pro", system-ui, -apple-system, sans-serif;
```

### 4.2. Thang chữ đề xuất

| Vai trò | Kích thước | Line-height | Độ đậm |
|---|---:|---:|---:|
| Display/Số liệu lớn | 32px | 40px | 700 |
| Tiêu đề trang | 28px | 36px | 700 |
| Tiêu đề khu vực | 22–24px | 30–32px | 600–700 |
| Tiêu đề card | 16–18px | 24–26px | 600 |
| Nội dung chính | 14–16px | 20–24px | 400 |
| Label/Button | 14px | 20px | 500–600 |
| Chú thích | 12–13px | 16–18px | 400–500 |

### 4.3. Quy tắc

- Cỡ chữ nội dung mặc định không nhỏ hơn `14px`; nội dung đọc dài ưu tiên `16px`.
- Không tạo kích thước tùy ý như `15px`, `17px`, `19px` nếu không có trong token.
- Không dùng màu sắc là cách duy nhất để phân cấp nội dung.
- Văn bản dài nên có chiều rộng tối đa khoảng `65–75` ký tự mỗi dòng.
- Dùng tabular numbers cho cột tiền hoặc số liệu cần so sánh:

```css
.numeric {
  font-variant-numeric: tabular-nums;
}
```

## 5. Màu sắc

### 5.1. Nhóm màu

- `Primary`: thương hiệu và hành động chính.
- `Success`: hoàn thành, thanh toán thành công, đang hoạt động.
- `Warning`: chờ xử lý, cần chú ý.
- `Danger`: lỗi, hủy, quá hạn, thao tác phá hủy.
- `Info`: thông tin hoặc tiến trình trung tính.
- `Neutral`: nền, chữ, border và trạng thái không hoạt động.

### 5.2. Quy tắc sử dụng

- Mỗi màu phải có vai trò nhất quán.
- Không dùng màu trạng thái cho mục đích trang trí.
- Luôn kiểm tra độ tương phản giữa chữ và nền.
- Trạng thái không chỉ dựa vào màu; kết hợp icon, nhãn hoặc hình dạng.
- Primary Button không nên xuất hiện quá nhiều trong cùng một vùng nhìn.
- Dùng nền màu nhạt và chữ màu đậm cho badge để bảo đảm dễ đọc.

### 5.3. Ánh xạ trạng thái tham khảo

| Trạng thái | Màu ngữ nghĩa |
|---|---|
| Đã hoàn thành / Đã thanh toán | Success |
| Đã xác nhận / Đang phục vụ | Info hoặc Primary |
| Chờ xác nhận / Sắp đến hạn | Warning |
| Đã hủy / Thất bại / Quá hạn | Danger |
| Không hoạt động / Bản nháp | Neutral |

## 6. Spacing system

Dùng hệ khoảng cách theo bội số của `4px`, ưu tiên các giá trị:

| Token | Giá trị | Cách dùng phổ biến |
|---|---:|---|
| `space-1` | 4px | Khoảng cách rất nhỏ |
| `space-2` | 8px | Icon và chữ |
| `space-3` | 12px | Thành phần trong control |
| `space-4` | 16px | Khoảng cách tiêu chuẩn |
| `space-5` | 20px | Padding nhỏ của card |
| `space-6` | 24px | Nhóm nội dung/card |
| `space-8` | 32px | Khu vực lớn |
| `space-10` | 40px | Phân tách section |
| `space-12` | 48px | Phân tách lớn |

Quy tắc:

- Không dùng khoảng cách ngẫu nhiên như `17px`, `21px`, `29px`.
- Khoảng cách bên trong một nhóm phải nhỏ hơn khoảng cách giữa các nhóm.
- Mobile có thể giảm page padding từ `24–32px` xuống `16px`.
- Dùng `gap` cho flex/grid thay vì margin rời rạc giữa các phần tử con.

## 7. Layout và grid

### 7.1. Khung trang quản trị

- Sidebar mở rộng: `240–280px`; khuyến nghị `260px`.
- Sidebar thu gọn: `64–80px`.
- Header: `64–72px`; khuyến nghị `68px`.
- Page padding desktop: `24–32px`.
- Chiều rộng nội dung tối đa: `1440–1600px` tùy mật độ dữ liệu.

### 7.2. Grid

- Dùng grid 12 cột cho layout phức tạp.
- Khoảng cách cột: `16–24px`.
- Card thống kê: 4 cột ở desktop lớn, 2 cột ở tablet, 1 cột ở mobile.
- Tránh đặt chiều rộng cố định cho nội dung cần co giãn.

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-6);
}
```

### 7.3. Căn chỉnh

- Nội dung và tiêu đề trong cùng khu vực cần chung trục căn.
- Văn bản căn trái; số và tiền tệ trong bảng căn phải.
- Không căn giữa đoạn văn dài hoặc form.
- Dùng vùng trắng có chủ đích; không lấp đầy mọi khoảng trống.

## 8. Cấu trúc module và trang

### 8.1. Cấu trúc module chuẩn

Mỗi module nên có:

1. Tên module và mô tả ngắn.
2. Hành động chính.
3. Tìm kiếm và bộ lọc.
4. Nội dung chính: danh sách, bảng, lịch, biểu đồ hoặc chi tiết.
5. Phân trang hoặc cơ chế tải thêm.
6. Các trạng thái loading, empty, error và success.

Ví dụ module Khách hàng:

```text
Khách hàng                              [+ Thêm khách hàng]
Quản lý hồ sơ và lịch sử sử dụng dịch vụ

[Tìm theo tên hoặc số điện thoại] [Trạng thái ▾] [Bộ lọc]

[Bảng danh sách khách hàng]
[Thông tin phân trang]
```

### 8.2. Cấu trúc trang chuẩn

```text
App shell
├── Sidebar
├── Header
└── Main
    ├── Breadcrumb (khi cần)
    ├── Page header
    ├── Toolbar / Filter
    ├── Main content
    └── Pagination / Footer actions
```

### 8.3. Quy tắc hành động

- Hành động chính đặt ở góc trên bên phải trên desktop, dễ tiếp cận trên mobile.
- Các hành động phụ nằm cạnh hành động chính hoặc trong menu `Thêm`.
- Hành động theo từng dòng đặt ở cuối dòng; khi có hơn 2–3 hành động, dùng overflow menu.
- Breadcrumb chỉ dùng khi hệ thống có phân cấp sâu; không thay thế nút quay lại trong luồng tác vụ.

## 9. Card

Card dùng để nhóm nội dung liên quan, không dùng để bọc mọi phần tử.

### 9.1. Thông số đề xuất

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
}
```

- Padding: `20–24px`.
- Border radius: `12px`.
- Gap nội bộ: `12–16px`.
- Bóng đổ nhẹ; ưu tiên border để phân tách trong dashboard dày dữ liệu.

### 9.2. Cấu trúc

- Header: tiêu đề, mô tả ngắn, thao tác tùy chọn.
- Body: nội dung chính.
- Footer: metadata hoặc hành động nếu cần.

### 9.3. Quy tắc

- Card cùng hàng nên có cấu trúc và chiều cao thị giác tương đương.
- Toàn card chỉ được click khi người dùng có thể nhận biết rõ nó tương tác được.
- Không lồng quá nhiều lớp card.
- Không nhồi quá nhiều dữ liệu; chuyển chi tiết sang trang chi tiết hoặc drawer.

## 10. Button

### 10.1. Các biến thể

- `Primary`: hành động quan trọng nhất.
- `Secondary`: hành động phụ.
- `Tertiary/Ghost`: thao tác nhẹ, ít ưu tiên.
- `Danger`: hành động phá hủy.
- `Link`: điều hướng trong nội dung.
- `Icon Button`: hành động quen thuộc, phải có accessible name.

### 10.2. Kích thước

| Size | Chiều cao | Padding ngang | Icon |
|---|---:|---:|---:|
| Small | 32–36px | 12px | 16px |
| Medium | 40–44px | 16px | 18–20px |
| Large | 48px | 20px | 20px |

### 10.3. Quy tắc

- Mặc định dùng Medium, bán kính `8px`, font `14px/600`.
- Vùng bấm cảm ứng tối thiểu khoảng `44 × 44px`.
- Nút phải có trạng thái default, hover, active, focus-visible, disabled và loading.
- Khi loading, giữ nguyên chiều rộng nút để tránh layout shift.
- Nút chỉ có icon phải có tooltip khi ý nghĩa không hiển nhiên và luôn có `aria-label`.
- Không dùng disabled để che giấu lý do; hiển thị hướng dẫn khi cần.
- Thứ tự nút phải nhất quán. Với giao diện trái sang phải, hành động chính thường ở phía phải trong footer modal.

## 11. Form, input và validation

### 11.1. Cấu trúc field

```text
Label *
[Control]
Helper text hoặc thông báo lỗi
```

- Label luôn hiển thị; không dùng placeholder thay cho label.
- Dấu `*` cần đi kèm chú thích `Bắt buộc` hoặc quy ước rõ ràng.
- Helper text giải thích định dạng hoặc tác động của dữ liệu.

### 11.2. Thông số

- Input/select mặc định cao `40–44px`.
- Textarea có chiều cao phù hợp, cho phép resize dọc nếu cần.
- Border radius `8px`.
- Padding ngang `12px`.
- Khoảng cách label–control `6–8px`; control–message `4–6px`.

### 11.3. Chọn control đúng

- Checkbox: chọn nhiều lựa chọn độc lập.
- Radio: chọn một trong ít lựa chọn hiển thị đồng thời.
- Select: danh sách lựa chọn dài hoặc cần tiết kiệm diện tích.
- Switch: thay đổi có hiệu lực gần như ngay lập tức; không dùng cho lựa chọn cần bấm Lưu.
- Date/time picker: hỗ trợ nhập bàn phím và định dạng locale.
- Autocomplete: khách hàng, dịch vụ hoặc kỹ thuật viên có danh sách lớn.

### 11.4. Validation

- Kiểm tra phía client để phản hồi nhanh, nhưng server vẫn là nguồn xác thực cuối cùng.
- Validate khi blur hoặc submit; tránh báo lỗi khi người dùng vừa bắt đầu nhập.
- Sau submit thất bại, tập trung vào lỗi đầu tiên và hiển thị tổng hợp lỗi nếu form dài.
- Thông báo nêu rõ vấn đề và cách sửa:
  - Tốt: `Số điện thoại phải có 10 chữ số.`
  - Không tốt: `Dữ liệu không hợp lệ.`
- Không xóa dữ liệu người dùng đã nhập khi lỗi.
- Đối chiếu lỗi server với đúng field; lỗi toàn cục đặt ở đầu form.
- Dữ liệu phụ thuộc cần được kiểm tra theo nghiệp vụ, ví dụ:
  - Giờ kết thúc phải sau giờ bắt đầu.
  - Kỹ thuật viên không được trùng lịch.
  - Số tiền giảm không vượt quá tổng hóa đơn.

## 12. Table

Table phù hợp với dữ liệu cần so sánh theo cột. Với nội dung thiên về đọc hoặc hành động trên mobile, cân nhắc list/card.

### 12.1. Quy chuẩn

- Chiều cao dòng: `44–56px`.
- Header phải dễ phân biệt và có nhãn rõ.
- Văn bản căn trái; số, tiền và phần trăm căn phải.
- Cột thao tác nằm bên phải.
- Giới hạn khoảng `8–10` cột hiển thị; thông tin phụ đưa vào trang chi tiết hoặc drawer.
- Cột quan trọng có thể sticky khi cuộn ngang.
- Header sticky khi bảng dài, nếu không che khuất nội dung.
- Cho biết rõ cột đang sắp xếp và chiều sắp xếp.

### 12.2. Tương tác

- Chọn nhiều dòng phải hiển thị số lượng đã chọn và bulk actions.
- Không vừa click toàn dòng vừa đặt nhiều control tương tác mà không phân biệt rõ.
- Phân trang hiển thị tổng số bản ghi, phạm vi đang xem và kích thước trang khi cần.
- Giữ bộ lọc và trang hiện tại khi xem chi tiết rồi quay lại.
- Cung cấp trạng thái loading, empty và error ngay trong vùng bảng.

### 12.3. Dữ liệu

- Tiền tệ: nhất quán, ví dụ `450.000 ₫`.
- Ngày giờ: nhất quán và đủ ngữ cảnh, ví dụ `27/07/2026, 09:30`.
- Giá trị thiếu dùng `—`, không dùng chuỗi `null` hoặc ô trống khó hiểu.
- Nội dung bị cắt cần cách xem đầy đủ, chẳng hạn tooltip hoặc trang chi tiết.

## 13. Modal và drawer

### 13.1. Khi nào sử dụng

- Modal: xác nhận hoặc tác vụ ngắn, cần tập trung.
- Drawer: xem/chỉnh sửa thông tin phụ mà vẫn giữ ngữ cảnh trang hiện tại.
- Trang riêng: form dài, nhiều bước, nội dung phức tạp hoặc cần URL riêng.

### 13.2. Kích thước modal tham khảo

- Small: `400–480px`.
- Medium: `560–720px`.
- Large: `800–960px`.
- Trên mobile: gần toàn màn hình, giữ khoảng cách an toàn.

### 13.3. Quy tắc

- Có tiêu đề rõ, nút đóng có accessible name và footer hành động nhất quán.
- Focus được đưa vào modal khi mở, giữ trong modal và trả về phần tử kích hoạt khi đóng.
- `Escape` đóng modal nếu không làm mất dữ liệu nguy hiểm.
- Click backdrop chỉ đóng khi không có nguy cơ mất dữ liệu.
- Nội dung dài cuộn trong body; header/footer có thể sticky.
- Không mở modal chồng modal. Thay bằng cập nhật nội dung, drawer hoặc trang riêng.
- Cảnh báo trước khi đóng form có thay đổi chưa lưu.

## 14. Icon

- Chỉ dùng một hệ icon chính, ví dụ Lucide, Material Symbols hoặc Heroicons.
- Kích thước phổ biến:
  - `16px`: input, badge, nút nhỏ.
  - `18–20px`: nút tiêu chuẩn.
  - `20–24px`: navigation.
  - `24–32px`: minh họa nhỏ hoặc card thống kê.
- Giữ cùng stroke width và phong cách.
- Icon trang trí dùng `aria-hidden="true"`.
- Icon truyền đạt thông tin phải có text hoặc accessible name.
- Không dùng icon mơ hồ thay cho nhãn ở tác vụ quan trọng.

## 15. Trạng thái và badge

### 15.1. Badge

- Dùng để thể hiện trạng thái hoặc phân loại ngắn.
- Nội dung nên từ 1–3 từ.
- Không dùng badge như nút nếu nó không tương tác.
- Không chỉ dùng màu để phân biệt trạng thái.
- Bán kính có thể là pill; padding và chiều cao thống nhất.

### 15.2. Trạng thái nghiệp vụ mẫu

```ts
type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_service"
  | "completed"
  | "cancelled"
  | "no_show";
```

Ánh xạ nhãn, màu và icon tại một nơi dùng chung, không lặp lại trong từng màn hình.

### 15.3. Trạng thái tương tác

Mọi control phải định nghĩa:

- Default
- Hover
- Active/Pressed
- Focus-visible
- Selected
- Disabled
- Read-only nếu có
- Loading nếu có
- Error nếu có

## 16. Navigation, sidebar và header

### 16.1. Sidebar

- Nhóm menu theo nghiệp vụ và tần suất sử dụng.
- Active item phải rõ bằng nhiều tín hiệu: nền, màu chữ và/hoặc indicator.
- Icon không thay thế hoàn toàn label ở trạng thái mở rộng.
- Khi thu gọn, cung cấp tooltip cho icon.
- Không đặt quá nhiều cấp lồng; tối đa khoảng 2 cấp nếu có thể.
- Ghi nhớ trạng thái mở/thu gọn khi phù hợp.

### 16.2. Header

Header thường chứa:

- Nút mở menu trên mobile.
- Tên chi nhánh hoặc bộ chọn chi nhánh.
- Tìm kiếm toàn cục nếu cần.
- Thông báo.
- Hồ sơ và menu tài khoản.

Không đưa mọi chức năng lên header. Ưu tiên các thao tác toàn cục và thường xuyên.

### 16.3. Navigation

- Tên menu dùng danh từ rõ ràng: `Lịch hẹn`, `Khách hàng`, `Hóa đơn`.
- URL phải ổn định, có thể bookmark cho trang quan trọng.
- Nút Back của trình duyệt phải hoạt động đúng.
- Không thay đổi vị trí navigation giữa các trang tương đương.

## 17. Responsive

### 17.1. Breakpoint tham khảo

```css
/* Mobile: < 768px */
/* Tablet: 768px–1023px */
/* Desktop: >= 1024px */
/* Large desktop: >= 1440px */
```

Breakpoint nên xuất phát từ thời điểm nội dung bị vỡ, không phụ thuộc tuyệt đối vào tên thiết bị.

### 17.2. Quy tắc thích ứng

- Desktop: sidebar cố định hoặc thu gọn.
- Tablet: sidebar thu gọn hoặc drawer.
- Mobile: sidebar thành navigation drawer; page padding khoảng `16px`.
- Grid chuyển từ 4 → 2 → 1 cột.
- Filter phức tạp chuyển vào drawer/bottom sheet nhưng vẫn hiển thị số bộ lọc đang áp dụng.
- Table có thể cuộn ngang, cố định cột quan trọng hoặc chuyển sang list/card.
- Hành động chính phải dễ tiếp cận và không bị bàn phím ảo che.
- Không ẩn chức năng cốt lõi chỉ vì màn hình nhỏ.
- Kiểm tra ở độ rộng hẹp và khi zoom `200%`, không chỉ tại vài thiết bị mẫu.

```css
@media (max-width: 1023px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
}
```

## 18. Dark mode

Dark mode phải dùng token ngữ nghĩa, không đảo màu cơ học.

### 18.1. Thành phần cần kiểm tra

- Nền trang, surface và elevated surface.
- Chữ chính, chữ phụ và chữ disabled.
- Border, divider và focus ring.
- Input, dropdown, table, tooltip, modal và drawer.
- Hover, active, selected.
- Badge và màu trạng thái.
- Biểu đồ, logo, ảnh và scrollbar nếu tùy biến.

### 18.2. Quy tắc

- Không dùng trắng tinh cho toàn bộ chữ; dùng độ sáng theo phân cấp.
- Không dùng đen tuyệt đối cho mọi nền; tạo các lớp surface rõ ràng.
- Màu trạng thái có thể cần giảm saturation hoặc đổi độ sáng.
- Tôn trọng `prefers-color-scheme`, đồng thời cho phép người dùng chọn `Sáng`, `Tối` hoặc `Theo hệ thống`.
- Lưu lựa chọn nhưng tránh flash sai theme khi tải trang.

## 19. Accessibility

Mục tiêu tối thiểu: đáp ứng WCAG 2.2 mức AA cho các luồng chính.

### 19.1. Semantic HTML

- Dùng đúng `button`, `a`, `label`, `input`, `table`, `nav`, `main`, `header`.
- Không dùng `div` giả làm button khi có thể dùng phần tử chuẩn.
- Heading theo thứ tự logic, không chọn cấp heading chỉ vì kích thước.
- Mỗi trang chỉ có một vùng `main`.

### 19.2. Bàn phím và focus

- Mọi thao tác phải thực hiện được bằng bàn phím.
- Focus order theo thứ tự thị giác và nghiệp vụ.
- Focus indicator rõ, không xóa `outline` nếu chưa có thay thế.
- Có cơ chế skip link cho trang có navigation dài.
- Không tạo keyboard trap, ngoại trừ focus trap có chủ đích trong modal.

### 19.3. Màu và nội dung

- Độ tương phản chữ thường tối thiểu `4.5:1`; chữ lớn tối thiểu `3:1`.
- Thành phần UI và focus indicator cần độ tương phản phù hợp.
- Không truyền đạt thông tin chỉ bằng màu.
- Alt text mô tả mục đích ảnh; ảnh trang trí dùng alt rỗng.
- Link phải có tên mô tả, tránh `Bấm vào đây`.

### 19.4. Form và thông báo

- Mỗi control có label được liên kết.
- Lỗi được liên kết bằng `aria-describedby` và thể hiện bằng chữ.
- Thông báo động quan trọng dùng live region phù hợp, tránh đọc lặp.
- Trường bắt buộc và hướng dẫn định dạng phải được screen reader nhận biết.

### 19.5. Chuyển động

- Tôn trọng `prefers-reduced-motion`.
- Tránh animation nhấp nháy hoặc chuyển động không cần thiết.
- Animation phục vụ định hướng, phản hồi hoặc quan hệ không gian; thường dùng `150–250ms`.

## 20. Các trạng thái UX

Mỗi màn hình lấy dữ liệu phải thiết kế tối thiểu các trạng thái sau.

### 20.1. Loading

- Dùng skeleton khi biết trước cấu trúc nội dung.
- Dùng spinner cho thao tác ngắn hoặc vùng nhỏ.
- Giữ layout ổn định, tránh nội dung nhảy.
- Với hành động submit, khóa submit lặp nhưng không khóa những phần không liên quan.
- Nếu tải lâu, hiển thị thông điệp và lựa chọn thử lại/hủy khi phù hợp.

### 20.2. Empty

Phân biệt:

- Chưa có dữ liệu: giải thích và đưa CTA tạo dữ liệu.
- Không có kết quả tìm kiếm: gợi ý đổi từ khóa hoặc xóa bộ lọc.
- Không có quyền: giải thích phạm vi quyền và cách liên hệ hỗ trợ.

Ví dụ:

```text
Chưa có lịch hẹn hôm nay
Tạo lịch hẹn mới để bắt đầu sắp xếp công việc.
[+ Tạo lịch hẹn]
```

### 20.3. Error

- Nói rõ điều gì thất bại và người dùng có thể làm gì.
- Giữ dữ liệu đã nhập.
- Có nút `Thử lại` cho lỗi có thể phục hồi.
- Không hiển thị stack trace, mã kỹ thuật hoặc dữ liệu nhạy cảm.
- Lỗi toàn trang, lỗi vùng và lỗi field cần có cách trình bày khác nhau.

### 20.4. Success

- Xác nhận ngắn gọn kết quả và đối tượng bị tác động.
- Toast dùng cho xác nhận không cần phản hồi.
- Thay đổi quan trọng có thể hiển thị inline confirmation hoặc chuyển đến trang kết quả.
- Nếu có thể hoàn tác, cung cấp `Hoàn tác` trong thời gian hợp lý.
- Không dùng modal success cho thao tác nhỏ, thường xuyên.

## 21. Quy ước đặt tên CSS và component

### 21.1. Component

- React/Vue component: `PascalCase`, ví dụ `AppointmentCard`, `CustomerTable`.
- Hook/composable: `use` + mục đích, ví dụ `useAppointmentFilters`.
- Props và biến: `camelCase`.
- Boolean bắt đầu bằng `is`, `has`, `can`, `should`, ví dụ `isLoading`, `canEdit`.
- Event handler: `handle` bên trong component; callback prop dùng `on`, ví dụ `handleSubmit`, `onSubmit`.
- Constant toàn cục: `UPPER_SNAKE_CASE`.
- Type/interface: `PascalCase`; tránh tiền tố mơ hồ.

### 21.2. CSS

Chọn một chiến lược và dùng nhất quán: CSS Modules, BEM, utility classes hoặc CSS-in-JS. Không trộn tùy tiện trong cùng phạm vi.

Ví dụ BEM:

```css
.appointment-card {}
.appointment-card__header {}
.appointment-card__time {}
.appointment-card--cancelled {}
```

Ví dụ CSS Modules:

```text
AppointmentCard.tsx
AppointmentCard.module.css
AppointmentCard.test.tsx
```

Quy tắc:

- Tên theo vai trò, không theo hình thức: `formError` tốt hơn `redText`.
- Tránh selector phụ thuộc sâu vào DOM.
- Tránh `!important`, trừ trường hợp tích hợp bên thứ ba có tài liệu giải thích.
- Không đặt class chung chung như `.box`, `.item`, `.left` ở phạm vi toàn cục.
- Dùng token thay cho màu/kích thước hard-code.

### 21.3. File và route

- Component: `PascalCase.tsx` hoặc theo chuẩn framework đã chọn.
- Utility/service: `camelCase.ts`.
- Route URL: chữ thường, dùng dấu gạch ngang, ví dụ `/appointment-history`.
- Feature folder: nhất quán `kebab-case` hoặc `camelCase`, không trộn.

## 22. Tái sử dụng component

### 22.1. Phân lớp

- Primitive: Button, Input, Text, Icon, Stack.
- Composite: FormField, SearchBox, StatusBadge, DataTable.
- Domain: AppointmentCard, TechnicianSelector, InvoiceSummary.
- Page: ghép domain component và xử lý luồng trang.

### 22.2. Quy tắc

- Trước khi tạo component mới, kiểm tra thư viện dùng chung.
- Tách component khi có hành vi hoặc cấu trúc lặp lại, không chỉ vì vài dòng JSX dài.
- Component dùng chung không chứa logic nghiệp vụ cụ thể nếu không được thiết kế là domain component.
- Dùng props/variant có giới hạn rõ, tránh hàng loạt boolean gây tổ hợp khó kiểm soát.
- Không “tổng quát hóa sớm”; chỉ trừu tượng khi đã hiểu điểm chung ổn định.
- Component phải có API rõ, trạng thái tương tác đầy đủ và tài liệu ví dụ.
- Các thay đổi design system cần kiểm tra ảnh hưởng đến mọi nơi sử dụng.

Ví dụ ưu tiên:

```tsx
<Button variant="primary" size="medium" loading={isSaving}>
  Lưu thay đổi
</Button>
```

Thay vì:

```tsx
<Button purple rounded shadow compact bold />
```

## 23. Những điều không nên làm

- Không dùng quá nhiều font, cỡ chữ, màu, bo góc hoặc bóng đổ.
- Không hard-code màu và spacing lặp lại trong từng component.
- Không có nhiều Primary Button cạnh tranh trong cùng một khu vực.
- Không dùng placeholder thay cho label.
- Không dùng chỉ màu sắc để biểu thị lỗi hoặc trạng thái.
- Không ẩn focus outline mà không có focus style thay thế.
- Không dùng icon không nhãn cho hành động khó đoán.
- Không đặt form dài hoặc quy trình nhiều bước trong modal nhỏ.
- Không mở modal chồng modal.
- Không làm toàn bộ card có thể click khi bên trong có nhiều thao tác không rõ ràng.
- Không đưa quá nhiều cột vào bảng; không ép chữ nhỏ để “nhét” dữ liệu.
- Không xóa dữ liệu ngay lập tức mà thiếu xác nhận/hoàn tác phù hợp.
- Không làm mất dữ liệu form sau lỗi mạng hoặc validation.
- Không vô hiệu hóa nút mà không cho biết điều kiện cần hoàn thành.
- Không hiển thị loading toàn trang cho một thay đổi nhỏ cục bộ.
- Không dùng animation dài, gây cản trở hoặc bỏ qua reduced motion.
- Không thiết kế chỉ cho màn hình mẫu; phải thử nội dung dài, dữ liệu rỗng và màn hình hẹp.
- Không trộn nhiều hệ icon hoặc nhiều chiến lược CSS trong cùng phạm vi.
- Không sao chép component rồi sửa nhẹ nếu có thể mở rộng API dùng chung hợp lý.
- Không dùng thông báo kỹ thuật như `500`, `null`, stack trace cho người dùng cuối.

## 24. Checklist hoàn thành màn hình

### Nội dung và nghiệp vụ

- [ ] Tiêu đề trang, mô tả và CTA chính rõ ràng.
- [ ] Nội dung dùng thuật ngữ đúng nghiệp vụ và nhất quán.
- [ ] Ngày, giờ, tiền tệ, số điện thoại và số liệu đúng locale.
- [ ] Quyền xem/sửa/xóa được xử lý đúng.
- [ ] Tác vụ nguy hiểm có xác nhận hoặc hoàn tác phù hợp.

### Thiết kế

- [ ] Dùng đúng typography, màu, spacing, radius, shadow và design token.
- [ ] Phân cấp thị giác rõ; không có nhiều hành động chính cạnh tranh.
- [ ] Căn chỉnh và khoảng cách nhất quán với các màn hình khác.
- [ ] Component có đủ hover, active, focus, disabled, selected và loading.
- [ ] Nội dung dài, thiếu dữ liệu và dữ liệu cực trị không làm vỡ layout.

### Form và dữ liệu

- [ ] Mọi input có label và hướng dẫn cần thiết.
- [ ] Validation client và lỗi server được hiển thị đúng vị trí.
- [ ] Thông báo lỗi nêu rõ cách khắc phục.
- [ ] Dữ liệu người dùng không bị mất sau lỗi.
- [ ] Chống submit lặp và xử lý xung đột nghiệp vụ.

### UX states

- [ ] Có trạng thái initial/loading.
- [ ] Có empty state cho chưa có dữ liệu.
- [ ] Có trạng thái không có kết quả do tìm kiếm/bộ lọc.
- [ ] Có trạng thái error và cách thử lại.
- [ ] Có phản hồi success phù hợp.

### Responsive

- [ ] Kiểm tra mobile, tablet, desktop và màn hình lớn.
- [ ] Không có cuộn ngang ngoài ý muốn.
- [ ] Table/filter/navigation có phương án trên mobile.
- [ ] Vùng bấm đủ lớn và không bị bàn phím ảo che.
- [ ] Hoạt động khi zoom `200%`.

### Accessibility

- [ ] Dùng semantic HTML và heading đúng thứ tự.
- [ ] Mọi thao tác dùng được bằng bàn phím.
- [ ] Focus indicator rõ và focus order hợp lý.
- [ ] Label, alt text, accessible name và ARIA dùng đúng.
- [ ] Độ tương phản đạt mục tiêu AA.
- [ ] Trạng thái không chỉ dựa vào màu.
- [ ] Modal quản lý focus đúng; animation hỗ trợ reduced motion.

### Chất lượng kỹ thuật

- [ ] Không tạo component trùng chức năng đã có.
- [ ] Không có giá trị style hard-code trái design token.
- [ ] Naming tuân theo quy ước.
- [ ] Có test phù hợp cho logic và luồng quan trọng.
- [ ] Không có lỗi console, request thừa hoặc layout shift đáng kể.
- [ ] Đã kiểm tra light mode và dark mode.
- [ ] Đã review trên dữ liệu thật hoặc dữ liệu sát thực tế.

## 25. Ví dụ CSS variables

```css
:root {
  /* Typography */
  --font-sans: "Inter", "Be Vietnam Pro", system-ui, -apple-system, sans-serif;
  --font-size-xs: 0.75rem;   /* 12px */
  --font-size-sm: 0.875rem;  /* 14px */
  --font-size-md: 1rem;      /* 16px */
  --font-size-lg: 1.125rem;  /* 18px */
  --font-size-xl: 1.5rem;    /* 24px */
  --font-size-2xl: 1.75rem;  /* 28px */

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  /* Primitive colors */
  --violet-50: #f5f3ff;
  --violet-100: #ede9fe;
  --violet-600: #7c3aed;
  --violet-700: #6d28d9;
  --green-50: #f0fdf4;
  --green-700: #15803d;
  --amber-50: #fffbeb;
  --amber-700: #b45309;
  --red-50: #fef2f2;
  --red-700: #b91c1c;
  --blue-50: #eff6ff;
  --blue-700: #1d4ed8;

  /* Semantic colors — light */
  --color-primary: var(--violet-600);
  --color-primary-hover: var(--violet-700);
  --color-primary-subtle: var(--violet-50);
  --color-background: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-hover: #f9fafb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-disabled: #9ca3af;
  --color-border: #e5e7eb;
  --color-border-strong: #d1d5db;
  --color-focus: #8b5cf6;

  --color-success-bg: var(--green-50);
  --color-success-text: var(--green-700);
  --color-warning-bg: var(--amber-50);
  --color-warning-text: var(--amber-700);
  --color-danger-bg: var(--red-50);
  --color-danger-text: var(--red-700);
  --color-info-bg: var(--blue-50);
  --color-info-text: var(--blue-700);

  /* Shape and elevation */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;
  --shadow-sm: 0 1px 3px rgb(15 23 42 / 0.08);
  --shadow-md: 0 8px 24px rgb(15 23 42 / 0.12);

  /* Component sizes */
  --control-height-sm: 2.25rem;
  --control-height-md: 2.625rem;
  --control-height-lg: 3rem;
  --sidebar-width: 16.25rem;
  --sidebar-collapsed-width: 4.5rem;
  --header-height: 4.25rem;

  /* Motion */
  --duration-fast: 120ms;
  --duration-normal: 200ms;
  --easing-standard: cubic-bezier(0.2, 0, 0, 1);

  /* Layering */
  --z-dropdown: 1000;
  --z-sticky: 1100;
  --z-overlay: 1200;
  --z-modal: 1300;
  --z-toast: 1400;
}

[data-theme="dark"] {
  --color-primary: #a78bfa;
  --color-primary-hover: #c4b5fd;
  --color-primary-subtle: #2e1065;
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-surface-hover: #263449;
  --color-text-primary: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-disabled: #64748b;
  --color-border: #334155;
  --color-border-strong: #475569;
  --color-focus: #c4b5fd;

  --color-success-bg: #052e16;
  --color-success-text: #86efac;
  --color-warning-bg: #451a03;
  --color-warning-text: #fcd34d;
  --color-danger-bg: #450a0a;
  --color-danger-text: #fca5a5;
  --color-info-bg: #172554;
  --color-info-text: #93c5fd;

  --shadow-sm: 0 1px 3px rgb(0 0 0 / 0.3);
  --shadow-md: 0 8px 24px rgb(0 0 0 / 0.4);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: var(--color-text-primary);
  background: var(--color-background);
  font-family: var(--font-sans);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 26. Cấu trúc thư mục frontend

Ví dụ dưới đây phù hợp với React/TypeScript theo hướng feature-based. Có thể điều chỉnh cho Vue, Angular, Svelte hoặc framework khác nhưng nên giữ nguyên nguyên tắc phân tách trách nhiệm.

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   ├── providers/
│   └── layouts/
│       ├── AppLayout.tsx
│       └── AuthLayout.tsx
├── assets/
│   ├── icons/
│   ├── images/
│   └── fonts/
├── components/
│   ├── ui/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Badge/
│   │   └── DataTable/
│   └── common/
│       ├── EmptyState/
│       ├── ErrorState/
│       └── PageHeader/
├── features/
│   ├── appointments/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── schemas/
│   │   ├── types/
│   │   └── utils/
│   ├── customers/
│   ├── technicians/
│   ├── services/
│   ├── products/
│   ├── invoices/
│   └── reports/
├── hooks/
├── lib/
│   ├── httpClient.ts
│   ├── queryClient.ts
│   └── dateTime.ts
├── services/
├── styles/
│   ├── globals.css
│   ├── tokens.css
│   ├── themes.css
│   └── utilities.css
├── types/
├── utils/
├── config/
├── tests/
│   ├── fixtures/
│   ├── mocks/
│   └── setup.ts
└── main.tsx
```

### Quy tắc phụ thuộc

- `components/ui` không phụ thuộc vào feature.
- Feature có thể dùng component dùng chung, nhưng không import trực tiếp nội bộ của feature khác nếu chưa có API công khai.
- API, schema, type và logic nghiệp vụ đặt gần feature sử dụng.
- Chỉ đưa utility lên cấp dùng chung khi có từ hai nơi dùng độc lập và ý nghĩa thực sự tổng quát.
- Tránh file `utils.ts` hoặc `helpers.ts` quá lớn; đặt tên theo trách nhiệm cụ thể.

---

## Kết luận

Quy chuẩn tốt không nhằm làm mọi màn hình giống hệt nhau, mà tạo ra một ngôn ngữ chung để đội ngũ đưa ra quyết định nhất quán. Khi có tình huống mới, ưu tiên theo thứ tự:

1. Nhu cầu và khả năng hoàn thành công việc của người dùng.
2. Accessibility và an toàn dữ liệu.
3. Tính nhất quán với design system.
4. Khả năng tái sử dụng và bảo trì.
5. Tính thẩm mỹ và hiệu ứng trang trí.

Mọi component mới nên trả lời được ba câu hỏi: người dùng cần nó để làm gì, nó phản hồi ra sao ở mọi trạng thái, và vì sao component hiện có chưa đáp ứng được nhu cầu đó.
