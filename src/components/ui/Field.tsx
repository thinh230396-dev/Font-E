import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

/**
 * Field — README §11.1 và §19.4.
 *
 * Bọc một control và tự nối label, helper text và thông báo lỗi vào nó, để
 * từng màn hình không phải tự viết `htmlFor` / `aria-describedby` / `aria-invalid`.
 *
 * Cấu trúc theo §11.1:
 *   Label *
 *   [Control]
 *   Helper text hoặc thông báo lỗi
 */
export interface FieldProps {
  label: ReactNode;
  /** Control nhận id, aria-describedby, aria-invalid, required và disabled. */
  children: ReactElement;
  /** Giải thích định dạng hoặc tác động của dữ liệu (§11.1). */
  helper?: ReactNode;
  /** Khi có lỗi, helper bị thay bằng thông báo này và control được đánh dấu invalid. */
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Ghi đè id tự sinh khi cần trỏ tới control từ nơi khác. */
  id?: string;
  className?: string;
  /** Ẩn nhãn khỏi thị giác nhưng vẫn giữ cho trình đọc màn hình. */
  labelHidden?: boolean;
}

interface ControlAriaProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export default function Field({
  label,
  children,
  helper,
  error,
  required = false,
  disabled = false,
  id,
  className = '',
  labelHidden = false,
}: FieldProps) {
  const autoId = useId();
  const controlId = id || `field-${autoId}`;
  const helperId = `${controlId}-helper`;
  const errorId = `${controlId}-error`;

  const hasError = Boolean(error);
  // Khi có lỗi, chỉ trỏ tới thông báo lỗi để trình đọc màn hình không đọc thừa.
  const describedBy = hasError ? errorId : helper ? helperId : undefined;

  const control = isValidElement<ControlAriaProps>(children)
    ? cloneElement(children, {
        id: children.props.id || controlId,
        'aria-describedby':
          [children.props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined,
        'aria-invalid': hasError || undefined,
        required: children.props.required ?? (required || undefined),
        disabled: children.props.disabled ?? (disabled || undefined),
      })
    : children;

  return (
    <div className={`ui-field ${hasError ? 'is-invalid' : ''} ${className}`.trim()}>
      <label
        htmlFor={controlId}
        className={`ui-field-label ${labelHidden ? 'sr-only' : ''}`.trim()}
      >
        {label}
        {required && (
          <span className="ui-field-required" title="Bắt buộc">
            <span aria-hidden="true">*</span>
            <span className="sr-only">Bắt buộc</span>
          </span>
        )}
      </label>

      {control}

      {hasError ? (
        <p id={errorId} className="ui-field-error" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="ui-field-helper">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
