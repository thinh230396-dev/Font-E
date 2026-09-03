import { Info } from 'lucide-react';

/**
 * MockDataNotice — dải nhãn báo màn hình đang chạy bằng dữ liệu mẫu.
 *
 * Có mặt vì quyết định 8 của `README-BACKEND-ROADMAP.md`: những màn nằm ngoài
 * phạm vi backend MVP vẫn giữ `localStorage` và vẫn đi qua được khi demo,
 * nhưng phải nói rõ dữ liệu là mẫu. Để màn trống thì mạch demo đứt; để im
 * lặng thì màn hình đang trình bày dữ liệu giả như thật.
 *
 * Cố ý mỏng và không có bóng: nó là chú thích, không phải một khối nội dung.
 * Một card đầy đủ ở đây sẽ nặng ngang phần dữ liệu mà nó đang chú thích.
 */
export interface MockDataNoticeProps {
  /** Vì sao màn này chưa nối máy chủ. Một câu, viết cho người dùng chứ không cho lập trình viên. */
  reason?: string;
  /**
   * Câu in đậm mở đầu. Mặc định là lời cảnh báo dữ liệu mẫu.
   *
   * Có mặt từ ngày 19, sau khi buổi tổng duyệt cho thấy hai màn **chạy bằng số thật** vẫn
   * đang mang đúng câu "Dữ liệu mẫu — chưa nối máy chủ": báo cáo doanh thu của chủ tiệm và
   * báo cáo nền tảng của superadmin. Cả hai chỉ cần nói một phạm vi — thứ có trên trang và
   * thứ nằm ngoài MVP — chứ không cần phủ nhận chính con số mình vừa hiện ra. Một dải nhãn
   * nói sai theo hướng hạ thấp cũng là nói sai; người xem không có cách nào biết chỗ nào tin
   * được nữa.
   */
  title?: string;
  className?: string;
}

export default function MockDataNotice({ reason, title, className = '' }: MockDataNoticeProps) {
  return (
    <p
      className={`flex items-start gap-2 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-caption text-amber-900 ${className}`.trim()}
    >
      <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        <span className="font-bold">{title || 'Dữ liệu mẫu — chưa nối máy chủ.'}</span>
        {reason ? ` ${reason}` : ' Mọi thay đổi ở màn này chỉ lưu trên trình duyệt.'}
      </span>
    </p>
  );
}
