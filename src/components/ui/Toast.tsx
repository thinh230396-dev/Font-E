import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';

/**
 * Toast — thông báo tạm thời (README §20.4).
 *
 * Thay cho `window.alert()`. Vì sao là context chứ không phải prop: các thông
 * báo này phát ra từ mọi tầng — App, màn hình, và cả hộp thoại lồng trong hộp
 * thoại — nên truyền bằng prop thì phải luồn qua từng cấp; đó chính là lý do
 * trước đây mỗi nơi lại tự dựng một hệ toast riêng hoặc rơi về `alert()`.
 *
 * Lớp hiển thị dùng `--z-toast` (12000), nằm TRÊN `--z-overlay` (10000) của hộp
 * thoại. Bản toast cũ trong App.tsx dùng `z-[9999]` nên mọi thông báo phát ra
 * từ trong hộp thoại đều bị chính hộp thoại che mất.
 */

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface ToastOptions {
  /** Dòng phụ, ví dụ cách khắc phục lỗi vừa báo. */
  description?: string;
  /** Ghi đè thời gian tự đóng (ms). */
  duration?: number;
}

export type ShowToast = (message: string, tone?: ToastTone, options?: ToastOptions) => void;

interface ToastRecord extends ToastOptions {
  id: number;
  message: string;
  tone: ToastTone;
}

/** Lỗi và cảnh báo cần đọc kỹ hơn nên ở lại lâu hơn. */
const DURATION_BY_TONE: Record<ToastTone, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 6000
};

/** Giữ tối đa 3 thông báo cùng lúc; cũ nhất rơi ra trước. */
const MAX_VISIBLE = 3;

const TONE_ICON: Record<ToastTone, ReactNode> = {
  success: <CheckCircle aria-hidden="true" />,
  info: <Info aria-hidden="true" />,
  warning: <AlertTriangle aria-hidden="true" />,
  error: <XCircle aria-hidden="true" />
};

const ToastContext = createContext<{ showToast: ShowToast }>({ showToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback<ShowToast>((message, tone = 'success', options) => {
    const id = nextId.current++;
    setToasts((current) => {
      const next = [...current, { id, message, tone, ...options }];
      // Thông báo bị đẩy ra khỏi hàng đợi phải hủy luôn hẹn giờ của nó, nếu
      // không Map hẹn giờ cứ lớn dần trong suốt phiên làm việc.
      next.slice(0, Math.max(0, next.length - MAX_VISIBLE)).forEach((dropped) => {
        const timer = timers.current.get(dropped.id);
        if (timer) {
          clearTimeout(timer);
          timers.current.delete(dropped.id);
        }
      });
      return next.slice(-MAX_VISIBLE);
    });
    const duration = options?.duration ?? DURATION_BY_TONE[tone];
    timers.current.set(id, setTimeout(() => dismiss(id), duration));
  }, [dismiss]);

  // Dọn hẹn giờ khi provider bị gỡ (StrictMode gắn/gỡ hai lần ở môi trường dev).
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className="ui-toast-layer">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`ui-toast ui-toast--${toast.tone}`}
              /* role="alert" được đọc ngay, role="status" chờ người dùng ngơi tay. */
              role={toast.tone === 'error' || toast.tone === 'warning' ? 'alert' : 'status'}
            >
              <span className="ui-toast-icon">{TONE_ICON[toast.tone]}</span>
              <div className="ui-toast-text">
                <p className="ui-toast-message">{toast.message}</p>
                {toast.description && <p className="ui-toast-description">{toast.description}</p>}
              </div>
              <button
                type="button"
                className="ui-toast-close"
                onClick={() => dismiss(toast.id)}
                aria-label="Đóng thông báo"
              >
                <X aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

/** Hàm phát thông báo. Dùng ở bất kỳ component nào nằm trong `ToastProvider`. */
export function useToast(): ShowToast {
  return useContext(ToastContext).showToast;
}
