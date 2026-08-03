import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

type BeautifulSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple'> & {
  optionLayout?: 'default' | 'technician';
};

interface SelectOption {
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
  description?: string;
  helper?: string;
  status?: string;
  tone?: 'auto' | 'available' | 'busy' | 'off';
}

const nodeText = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children);
  return '';
};

const collectOptions = (children: ReactNode, group?: string): SelectOption[] => {
  const options: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{
      value?: string | number;
      disabled?: boolean;
      label?: string;
      children?: ReactNode;
      'data-description'?: string;
      'data-helper'?: string;
      'data-status'?: string;
      'data-tone'?: SelectOption['tone'];
    }>;
    if (element.type === 'option') {
      options.push({
        value: String(element.props.value ?? nodeText(element.props.children)),
        label: nodeText(element.props.children),
        disabled: Boolean(element.props.disabled),
        group,
        description: element.props['data-description'],
        helper: element.props['data-helper'],
        status: element.props['data-status'],
        tone: element.props['data-tone'],
      });
    } else if (element.type === 'optgroup') {
      options.push(...collectOptions(element.props.children, element.props.label));
    }
  });
  return options;
};

export default function BeautifulSelect({
  children,
  className = '',
  value,
  defaultValue,
  disabled,
  onChange,
  id,
  name,
  optionLayout = 'default',
  ...selectProps
}: BeautifulSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const nativeSelectRef = useRef<HTMLSelectElement>(null);
  const generatedId = useId().replace(/:/g, '');
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? ''));
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const options = useMemo(() => collectOptions(children), [children]);
  const optionValues = new Set(options.map((option) => option.value));
  const isBranchScopeSelect = options.length >= 2
    && optionValues.has('ALL')
    && options.every((option) => option.value === 'ALL' || /^Q\d+$/i.test(option.value));
  const isGlobalBranchSelect = String(selectProps['aria-label'] || '').startsWith('Chọn phạm vi chi nhánh');
  const isDuplicatePageBranchSelect = isBranchScopeSelect && !isGlobalBranchSelect;
  const menuId = `${id || name || generatedId}-options`;
  const currentValue = String(value ?? internalValue);
  const selectedOption = options.find((option) => option.value === currentValue) ?? options[0];
  const searchable = options.length > 8;
  const isTechnicianLayout = optionLayout === 'technician';
  const filteredOptions = query.trim()
    ? options.filter((option) => option.label.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))
    : options;
  const isTenantSelect = Boolean(rootRef.current?.closest('.role-shell--tenant'));

  const updateMenuPosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const optionHeight = isTechnicianLayout ? 68 : 42;
    const estimatedHeight = Math.min(searchable ? 420 : 368, 72 + options.length * optionHeight);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const openAbove = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    setMenuStyle({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 220) - 8)),
      top: openAbove ? Math.max(8, rect.top - Math.min(estimatedHeight, rect.top - 12) - 8) : rect.bottom + 8,
      width: Math.max(rect.width, 220),
      maxHeight: openAbove ? Math.max(180, rect.top - 20) : Math.max(180, spaceBelow),
      zIndex: 10050
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    const reposition = () => updateMenuPosition();
    document.addEventListener('mousedown', closeOnOutside);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [isOpen, isTechnicianLayout, options.length, searchable]);

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  const chooseOption = (option: SelectOption) => {
    if (option.disabled) return;
    setInternalValue(option.value);
    const nativeSelect = nativeSelectRef.current;
    if (nativeSelect) {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
      valueSetter?.call(nativeSelect, option.value);
      nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const menu = isOpen && createPortal(
    <div
      id={menuId}
      ref={menuRef}
      role="listbox"
      aria-label={selectProps['aria-label'] || name || 'Danh sách lựa chọn'}
      className={`beautiful-select-menu ${isTenantSelect ? 'beautiful-select-menu--tenant' : ''} fixed z-[10050] flex flex-col overflow-hidden rounded-xl border border-brand-outline/60 bg-brand-surface shadow-2xl`}
      style={menuStyle}
      onKeyDown={(event) => { if (event.key === 'Escape') { setIsOpen(false); buttonRef.current?.focus(); } }}
    >
      {searchable && (
        <div className="shrink-0 border-b border-brand-outline/40 p-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-text-muted" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm lựa chọn..." className="h-9 w-full rounded-lg border border-brand-outline/50 bg-brand-surface-lowest pl-9 pr-3 text-xs text-brand-text outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15" />
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-brand-text-muted">Không tìm thấy lựa chọn</div>
        ) : filteredOptions.map((option, index) => {
          const previousGroup = index > 0 ? filteredOptions[index - 1].group : undefined;
          return (
            <div key={`${option.group || 'option'}-${option.value}`}>
              {option.group && option.group !== previousGroup && <p className="px-3 pb-1 pt-2 text-[9px] font-bold uppercase tracking-wider text-brand-text-muted">{option.group}</p>}
              <button
                type="button"
                role="option"
                aria-selected={option.value === currentValue}
                disabled={option.disabled}
                onClick={() => chooseOption(option)}
                className={`beautiful-select-option ${isTechnicianLayout ? 'beautiful-select-option--technician min-h-[58px] px-2.5 py-2.5' : 'min-h-9 px-3 py-2'} flex h-auto w-full items-center justify-between gap-3 rounded-lg border-0 text-left text-xs shadow-none ${option.value === currentValue ? 'bg-brand-primary/10 font-bold text-brand-primary' : 'bg-transparent font-medium text-brand-text hover:bg-brand-surface-high'}`}
              >
                {isTechnicianLayout ? (
                  <>
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-black ${
                        option.tone === 'available'
                          ? 'bg-emerald-50 text-emerald-700'
                          : option.tone === 'busy'
                          ? 'bg-rose-50 text-rose-700'
                          : option.tone === 'off'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-violet-50 text-violet-700'
                      }`}
                      aria-hidden="true"
                    >
                      {option.value === 'ANY' ? 'TĐ' : option.label.trim().slice(0, 1).toLocaleUpperCase('vi')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-extrabold leading-5 text-slate-800">
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="block truncate text-[11px] font-medium leading-4 text-slate-500">
                          {option.description}
                        </span>
                      )}
                      {option.helper && (
                        <span className={`mt-0.5 block truncate text-[10px] font-semibold leading-4 ${
                          option.tone === 'available' ? 'text-emerald-600' : option.tone === 'auto' ? 'text-violet-600' : 'text-rose-600'
                        }`}>
                          {option.helper}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {option.status && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                          option.tone === 'available'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : option.tone === 'busy'
                            ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                            : option.tone === 'off'
                            ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                            : 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            option.tone === 'available'
                              ? 'bg-emerald-500'
                              : option.tone === 'busy'
                              ? 'bg-rose-500'
                              : option.tone === 'off'
                              ? 'bg-slate-400'
                              : 'bg-violet-500'
                          }`} />
                          {option.status}
                        </span>
                      )}
                      {option.value === currentValue && (
                        <span className="beautiful-select-selected-check flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 break-words leading-snug">{option.label}</span>
                    {option.value === currentValue && <span className="beautiful-select-selected-check flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white"><Check className="h-3 w-3" /></span>}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );

  return (
    <div
      ref={rootRef}
      data-page-branch-filter={isDuplicatePageBranchSelect ? 'true' : undefined}
      className={`beautiful-select relative min-w-0 ${isDuplicatePageBranchSelect ? 'page-branch-filter' : ''}`}
    >
      <select
        {...selectProps}
        ref={nativeSelectRef}
        id={id ? `${id}-native` : undefined}
        name={name}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        disabled={disabled}
        onChange={onChange}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
      >
        {Children.map(children, (child) => isValidElement(child) ? cloneElement(child) : child)}
      </select>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={selectProps['aria-label']}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleButtonKeyDown}
        className={`beautiful-select-trigger ${className} flex items-center justify-between gap-3 text-left`}
      >
        {isTechnicianLayout ? (
          <span className="flex min-w-0 flex-1 items-center gap-2.5 py-1">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              selectedOption?.tone === 'available'
                ? 'bg-emerald-500'
                : selectedOption?.tone === 'busy'
                ? 'bg-rose-500'
                : selectedOption?.tone === 'off'
                ? 'bg-slate-400'
                : 'bg-violet-500'
            }`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-extrabold leading-5 text-slate-800">
                {selectedOption?.label || 'Chọn kỹ thuật viên'}
              </span>
              <span className="block truncate text-[10px] font-semibold leading-4 text-slate-500">
                {[selectedOption?.description, selectedOption?.status].filter(Boolean).join(' · ')}
              </span>
            </span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate">{selectedOption?.label || 'Chọn một giá trị'}</span>
        )}
        <span className={`beautiful-select-arrow flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-brand-outline/50 bg-brand-surface-high text-brand-text-muted transition-transform ${isOpen ? 'rotate-180 border-brand-primary/40 bg-brand-primary/10 text-brand-primary' : ''}`}><ChevronDown className="h-3.5 w-3.5" /></span>
      </button>
      {menu}
    </div>
  );
}
