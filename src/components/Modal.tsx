import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | string;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  headerIcon?: React.ReactNode;
  headerBadge?: React.ReactNode;
  customHeader?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  zIndex?: string;
  showCloseButton?: boolean;
}

const getMaxWidthClass = (maxWidth?: string) => {
  if (!maxWidth) return 'max-w-xl';
  switch (maxWidth) {
    case 'sm': return 'max-w-sm';
    case 'md': return 'max-w-md';
    case 'lg': return 'max-w-lg';
    case 'xl': return 'max-w-xl';
    case '2xl': return 'max-w-2xl';
    case '3xl': return 'max-w-3xl';
    case '4xl': return 'max-w-4xl';
    case '5xl': return 'max-w-5xl';
    case '6xl': return 'max-w-6xl';
    case '7xl': return 'max-w-7xl';
    default: return maxWidth.startsWith('max-w-') ? maxWidth : `max-w-[${maxWidth}]`;
  }
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  subtitle,
  children,
  footer,
  maxWidth = 'xl',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  headerIcon,
  headerBadge,
  customHeader,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  zIndex = 'z-[100]',
  showCloseButton = true,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEsc) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEsc]);

  if (!isOpen) return null;

  const maxWidthClass = getMaxWidthClass(maxWidth);

  return createPortal(
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden`}>
      {/* Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-200"
        onClick={() => {
          if (closeOnOverlayClick) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog Container */}
      <div
        className={`relative flex flex-col w-full ${maxWidthClass} max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] rounded-3xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden my-auto z-10 ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Custom Header or Standard Header */}
        {customHeader ? (
          <div className="relative shrink-0">
            {customHeader}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="absolute right-4 top-4 z-20 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 p-0 text-white shadow-sm hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (title || showCloseButton) ? (
          <header className={`flex shrink-0 items-start justify-between border-b border-slate-100 bg-white p-5 sm:p-6 ${headerClassName}`}>
            <div className="flex items-start gap-3 min-w-0 pr-4">
              {headerIcon && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  {headerIcon}
                </span>
              )}
              <div className="min-w-0">
                {subtitle && (
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600 mb-0.5">
                    {subtitle}
                  </p>
                )}
                {title && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-950">
                      {title}
                    </h2>
                    {headerBadge}
                  </div>
                )}
                {description && (
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-0 text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </header>
        ) : null}

        {/* Scrollable Body Content */}
        {children && (
          <div className={`flex-1 overflow-y-auto p-5 sm:p-6 ${bodyClassName}`}>
            {children}
          </div>
        )}

        {/* Fixed Footer */}
        {footer && (
          <footer className={`shrink-0 border-t border-slate-100 bg-slate-50 p-4 sm:px-6 flex flex-wrap items-center justify-end gap-2 ${footerClassName}`}>
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
