/**
 * Thư viện component dùng chung của SalonSys (README §22.1 — lớp primitive và composite).
 *
 * Trước khi tạo component mới ở màn hình, kiểm tra ở đây trước (§22.2).
 */
export { default as Button } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';

export { default as Field } from './Field';
export type { FieldProps } from './Field';

export { default as Switch } from './Switch';
export type { SwitchProps } from './Switch';

export { default as StatusBadge, STATUS_MAP, getStatusDefinition } from './StatusBadge';
export type { StatusBadgeProps, StatusKey, StatusTone } from './StatusBadge';

export { default as DataTable } from './DataTable';
export type { DataTableColumn, DataTableProps } from './DataTable';

export { default as PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

export { default as Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

export { ToastProvider, useToast } from './Toast';
export type { ShowToast, ToastOptions, ToastTone } from './Toast';
