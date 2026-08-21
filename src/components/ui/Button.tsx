import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button — README §10.
 *
 * Biến thể theo §10.1, kích thước theo §10.2, trạng thái theo §10.3.
 * Mọi giá trị hình thức lấy từ design token; không viết màu hay bán kính rời rạc.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'small' | 'medium' | 'large';

type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export interface ButtonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Hiện spinner và khoá tương tác. Chiều rộng nút được giữ nguyên (§10.3). */
  loading?: boolean;
  /** Icon đứng trước nhãn. */
  iconLeading?: ReactNode;
  /** Icon đứng sau nhãn. */
  iconTrailing?: ReactNode;
  /** Nút chỉ có icon. Bắt buộc kèm `aria-label` (§10.3, §14). */
  iconOnly?: boolean;
  /** Chiếm trọn chiều ngang của khối chứa. */
  block?: boolean;
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'medium',
    loading = false,
    iconLeading,
    iconTrailing,
    iconOnly = false,
    block = false,
    disabled,
    type = 'button',
    className = '',
    children,
    ...rest
  },
  ref
) {
  const isDisabled = Boolean(disabled) || loading;

  const classes = [
    'ui-btn',
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    iconOnly ? 'ui-btn--icon' : '',
    block ? 'ui-btn--block' : '',
    loading ? 'is-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (process.env.NODE_ENV !== 'production' && iconOnly && !rest['aria-label']) {
    console.warn('Button: nút chỉ có icon phải có aria-label để người dùng trình đọc màn hình hiểu được hành động.');
  }

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={classes}
    >
      {/* Nội dung bị ẩn thị giác khi loading để chiều rộng nút không đổi. */}
      <span className="ui-btn-content" aria-hidden={loading || undefined}>
        {iconLeading && <span className="ui-btn-icon">{iconLeading}</span>}
        {!iconOnly && children}
        {iconOnly && children}
        {iconTrailing && <span className="ui-btn-icon">{iconTrailing}</span>}
      </span>
      {loading && (
        <span className="ui-btn-spinner">
          <Loader2 aria-hidden="true" />
          <span className="sr-only">Đang xử lý</span>
        </span>
      )}
    </button>
  );
});

export default Button;
