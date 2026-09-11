/**
 * Chuẩn hóa số điện thoại theo **đúng luật của máy chủ**.
 *
 * Máy chủ coi số điện thoại là *khóa tra cứu khách hàng* (BR-CUS-002: duy nhất trong một tiệm,
 * BR-CUS-003: là trường bắt buộc duy nhất khi tạo khách), và nó bỏ đi khoảng trắng, dấu chấm,
 * gạch nối và ngoặc trước khi so — xem `PhoneNumber.Create` trong `NailManagement.Domain`.
 *
 * Frontend phải bỏ **đúng ngần ấy ký tự**, không hơn. Cách viết tắt quen tay là "chỉ giữ chữ số"
 * (`replace(/\D/g, '')`), nhưng nó cũng nuốt luôn dấu cộng của `+84901234567` — và khi đó một
 * khách nhập theo dạng quốc tế sẽ không bao giờ khớp với bản ghi máy chủ đang giữ.
 *
 * ⚠️ Hàm này dành cho phép so **danh tính**. Ô tìm kiếm thì khác: ở đó so theo chữ số là đúng,
 * vì người ta gõ vài số giữa chừng để lọc chứ không gõ trọn số.
 *
 * Lỗi mà nó sinh ra để bịt: quầy lễ tân tra khách cũ bằng chuỗi thô, trong khi số tạm của khách
 * vãng lai ẩn danh viết là `'0900 000 000'` còn máy chủ lưu `'0900000000'`. Phép tra luôn trượt,
 * nên mọi khách vãng lai ẩn danh **sau người đầu tiên** đều bị máy chủ từ chối với câu "tiệm đã
 * có khách mang số điện thoại này".
 */
export const normalizePhone = (raw: string): string => (raw || '').replace(/[\s.\-()]/g, '');
