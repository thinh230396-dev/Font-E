import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal — README §13.
 *
 * Thay thế cho các overlay `fixed inset-0` tự dựng. Xử lý sẵn:
 * đưa focus vào hộp thoại khi mở, giữ focus bên trong, trả focus về phần tử
 * kích hoạt khi đóng, Escape, khoá cuộn nền, backdrop, và lớp hiển thị (§13.3).
 */

/**
 * Kích thước theo §13.2.
 * `fullscreen` dành riêng cho không gian làm việc chiếm trọn màn hình (ví dụ
 * quầy thu ngân), không dùng cho hộp thoại thông thường.
 */
export type ModalSize = 'small' | 'medium' | 'large' | 'fullscreen';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Mô tả ngắn dưới tiêu đề. Được nối vào aria-describedby. */
  description?: ReactNode;
  /** Nhãn nhỏ phía trên tiêu đề. */
  eyebrow?: ReactNode;
  icon?: ReactNode;
  /** Badge cạnh tiêu đề, ví dụ trạng thái bản ghi. */
  headerAside?: ReactNode;
  children?: ReactNode;
  /** Hành động ở chân hộp thoại. Hành động chính đặt bên phải (§10.3). */
  footer?: ReactNode;
  size?: ModalSize;
  /** Tắt khi đóng nhầm sẽ làm mất dữ liệu người dùng đã nhập (§13.3). */
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
  bodyClassName?: string;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Ngăn xếp hộp thoại đang mở. Khi có hộp thoại lồng nhau, mọi listener Escape
 * đều nằm trên `document` nên `stopPropagation` không chặn được nhau; chỉ hộp
 * thoại trên cùng ngăn xếp mới được phép đóng.
 */
const modalStack: symbol[] = [];

/**
 * Hộp thoại portal ra `document.body` nên nằm NGOÀI shell vai trò, mà
 * `--accent` chỉ được định nghĩa trên `.role-shell--*`. Thiếu accent thì
 * `background-color: var(--accent)` của nút primary trở thành trong suốt (nút
 * chính gần như tàng hình), eyebrow và ô icon mất màu, còn menu của
 * `BeautifulSelect` rơi về tím mặc định — hộp thoại lệch hẳn với màn hình phía
 * sau nó. Vì vậy lớp phủ mượn lại lớp vai trò đang hiển thị, và index.css vô
 * hiệu nền/bóng của shell trên lớp phủ để nó không tô đè trang.
 */
const ROLE_SHELL_SELECTOR = '.role-shell--superadmin, .role-shell--tenant, .role-shell--reception';

function resolveRoleShellClass(): string {
  if (typeof document === 'undefined') return '';
  const shells = Array.from(document.querySelectorAll<HTMLElement>(ROLE_SHELL_SELECTOR))
    // Bỏ qua lớp vai trò nằm trong một hộp thoại khác: chỉ shell của trang mới tính.
    .filter((element) => !element.closest('.ui-modal-layer'));
  const shell = shells[shells.length - 1];
  return Array.from(shell?.classList ?? []).find((name) => name.startsWith('role-shell--')) ?? '';
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  eyebrow,
  icon,
  headerAside,
  children,
  footer,
  size = 'medium',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
  bodyClassName = '',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const stackTokenRef = useRef<symbol>(undefined as unknown as symbol);
  if (!stackTokenRef.current) stackTokenRef.current = Symbol('ui-modal');
  const autoId = useId();
  const titleId = `modal-title-${autoId}`;
  const descriptionId = `modal-description-${autoId}`;

  const getFocusable = useCallback(() => {
    const root = dialogRef.current;
    if (!root) return [] as HTMLElement[];
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
  }, []);

  // Ghi nhớ phần tử đang focus, đưa focus vào hộp thoại, và trả lại khi đóng (§13.3).
  useEffect(() => {
    if (!open) return;

    // Chỉ ghi nhớ phần tử nằm NGOÀI hộp thoại này. Khi React StrictMode gắn lại
    // effect, phần tử đang focus đã là nút bên trong hộp thoại — ghi đè bằng nó
    // sẽ làm mất đường quay về vì nút đó biến mất lúc đóng.
    //
    // Điều kiện là "ngoài hộp thoại NÀY", không phải "ngoài mọi hộp thoại":
    // hộp thoại lồng nhau được mở từ một nút nằm trong hộp thoại cha, và nút đó
    // vẫn tồn tại sau khi lớp trên đóng nên vẫn là đích trả focus đúng (§13.3).
    const opener = document.activeElement as HTMLElement | null;
    if (opener && !dialogRef.current?.contains(opener)) restoreFocusRef.current = opener;

    // Focus đồng bộ ngay sau khi DOM được commit. Không dùng
    // requestAnimationFrame: callback bất đồng bộ sẽ đua với cleanup mà React
    // StrictMode gọi khi gắn lại effect, làm focus bị trả về nút mở.
    const [first] = getFocusable();
    (first ?? dialogRef.current)?.focus();

    return () => {
      const target = restoreFocusRef.current;
      if (target && document.contains(target)) target.focus();
    };
  }, [open, getFocusable]);

  // Ghi tên vào ngăn xếp và khoá cuộn nền theo số hộp thoại đang mở.
  useEffect(() => {
    if (!open) return;

    const token = stackTokenRef.current;
    const body = document.body;
    if (modalStack.length === 0) {
      body.dataset.uiScrollLock = body.style.overflow;
      body.style.overflow = 'hidden';
    }
    modalStack.push(token);

    return () => {
      const index = modalStack.lastIndexOf(token);
      if (index >= 0) modalStack.splice(index, 1);
      if (modalStack.length === 0) {
        body.style.overflow = body.dataset.uiScrollLock ?? '';
        delete body.dataset.uiScrollLock;
      }
    };
  }, [open]);

  // Escape để đóng, Tab để quay vòng focus bên trong hộp thoại.
  useEffect(() => {
    if (!open) return;

    const isTopmost = () => modalStack[modalStack.length - 1] === stackTokenRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Hộp thoại lồng nhau: chỉ lớp trên cùng phản hồi bàn phím.
      if (!isTopmost()) return;

      if (event.key === 'Escape' && closeOnEscape) {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, closeOnEscape, onClose, getFocusable]);

  if (!open) return null;

  return createPortal(
    <div className={`ui-modal-layer ${resolveRoleShellClass()}`.trim()}>
      <div
        className="ui-modal-backdrop"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`ui-modal ui-modal--${size} ${className}`.trim()}
      >
        <header className="ui-modal-header">
          <div className="ui-modal-heading">
            {icon && <span className="ui-modal-icon">{icon}</span>}
            <div className="ui-modal-heading-text">
              {eyebrow && <p className="ui-modal-eyebrow">{eyebrow}</p>}
              <div className="ui-modal-title-row">
                <h2 id={titleId} className="ui-modal-title">
                  {title}
                </h2>
                {headerAside}
              </div>
              {description && (
                <p id={descriptionId} className="ui-modal-description">
                  {description}
                </p>
              )}
            </div>
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hộp thoại"
              className="ui-modal-close"
            >
              <X aria-hidden="true" />
            </button>
          )}
        </header>

        {children && <div className={`ui-modal-body ${bodyClassName}`.trim()}>{children}</div>}

        {footer && <footer className="ui-modal-footer">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
