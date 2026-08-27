/**
 * Phạm vi khóa `localStorage` của tiệm đang đăng nhập.
 *
 * ## Vì sao đổi từ tên tiệm sang mã tiệm
 *
 * Cho tới hết ngày 8, mọi màn hình mức C dựng khóa lưu trữ theo **tên** tiệm:
 * `tenant-admin-customers-v1:Nailé Studio`. Tên tiệm không phải một định danh —
 * chủ tiệm đổi tên lúc nào cũng được, và hai tiệm khác nhau đặt trùng tên là
 * chuyện bình thường. Hệ quả là hai lỗi mà không ai thấy cho tới khi gặp:
 *
 * 1. **Đổi tên tiệm là mất sạch dữ liệu cục bộ** — khóa cũ vẫn nằm đó nhưng
 *    không màn nào đọc tới nữa.
 * 2. **Hai tiệm trùng tên dùng chung một ngăn** — khách của tiệm này hiện ở
 *    tiệm kia, ngay trên cùng một trình duyệt.
 *
 * Mã tiệm thì do máy chủ sinh và không bao giờ đổi, nên nó là thứ đúng để đặt tên
 * ngăn. `README-MIGRATION.md` §13 đã chốt dữ liệu cũ bỏ được: không có script di
 * trú, chỉ cần xóa `localStorage` trên máy dev.
 *
 * ## Vì sao là trạng thái ở tầng module chứ không phải một prop
 *
 * Phạm vi lưu trữ là một sự thật của **phiên đăng nhập**, giống hệt nhau ở cả
 * mười tám màn hình đang giữ dữ liệu cục bộ. Truyền nó xuống mười tám chỗ là mở
 * ra đúng một khả năng: một màn bị quên, và màn đó lặng lẽ ghi sang ngăn của
 * người khác — đúng loại lỗi mà lần đổi này đang đi vá. Gom về một nơi thì
 * `tenantStorageKey` là con đường duy nhất dựng ra khóa, và không còn chỗ để quên.
 *
 * `App.tsx` gọi `setTenantStorageScope` ngay trong thân hàm dựng, trước khi cổng
 * con render lần đầu, nên không có lần render nào đọc nhầm phạm vi cũ.
 */

let activeScope = '';

/**
 * Ghi nhận tiệm của phiên hiện tại. Truyền **mã tiệm**, không phải tên.
 *
 * Gọi ở `App.tsx` mỗi lần dựng lại cây giao diện; phép gán này lặp lại bao nhiêu
 * lần cũng cho cùng một kết quả.
 */
export const setTenantStorageScope = (tenantId?: string) => {
  activeScope = tenantId || '';
};

/**
 * Phạm vi đang hiệu lực.
 *
 * Rỗng nghĩa là chưa có phiên nào nhận tiệm — chỉ xảy ra ở cổng Superadmin, nơi
 * không màn nào đọc dữ liệu cục bộ theo tiệm. Trả một chuỗi cố định thay vì rỗng
 * để khóa vẫn đọc được bằng mắt khi mở công cụ nhà phát triển.
 */
export const tenantStorageScope = () => activeScope || 'chua-chon-tiem';

/** Cách duy nhất được phép dựng một khóa `localStorage` gắn với tiệm. */
export const tenantStorageKey = (prefix: string) => `${prefix}:${tenantStorageScope()}`;
