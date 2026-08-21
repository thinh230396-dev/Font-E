import { useId } from 'react';

/**
 * Switch — README §11.3.
 *
 * Chỉ dùng cho thay đổi có hiệu lực gần như ngay lập tức; lựa chọn cần bấm Lưu
 * phải dùng checkbox hoặc radio. Control thật là `<input type="checkbox">` để
 * bàn phím và trình đọc màn hình hoạt động đúng (§19.1); phần nhìn thấy chỉ là
 * lớp trang trí `aria-hidden`.
 */
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Tên của công tắc. Luôn bắt buộc để trình đọc màn hình đọc được (§14). */
  label: string;
  /** Ẩn nhãn khỏi thị giác khi hàng đã có nhãn riêng, vẫn giữ cho screen reader. */
  labelHidden?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export default function Switch({
  checked,
  onChange,
  label,
  labelHidden = false,
  disabled = false,
  id,
  className = '',
}: SwitchProps) {
  const autoId = useId();
  const controlId = id || `switch-${autoId}`;

  return (
    <label htmlFor={controlId} className={`ui-switch ${className}`.trim()}>
      <input
        id={controlId}
        type="checkbox"
        role="switch"
        className="ui-switch-input"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span aria-hidden="true" className="ui-switch-track">
        <span className="ui-switch-thumb" />
      </span>
      <span className={labelHidden ? 'sr-only' : 'ui-switch-text'}>{label}</span>
    </label>
  );
}
