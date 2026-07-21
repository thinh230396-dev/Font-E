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

type BeautifulSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple'>;

interface SelectOption {
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
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
    const element = child as ReactElement<{ value?: string | number; disabled?: boolean; label?: string; children?: ReactNode }>;
    if (element.type === 'option') {
      options.push({
        value: String(element.props.value ?? nodeText(element.props.children)),
        label: nodeText(element.props.children),
        disabled: Boolean(element.props.disabled),
        group
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
  const filteredOptions = query.trim()
    ? options.filter((option) => option.label.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))
    : options;

  const updateMenuPosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedHeight = Math.min(searchable ? 360 : 304, 64 + options.length * 42);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const openAbove = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    setMenuStyle({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 220) - 8)),
      top: openAbove ? Math.max(8, rect.top - Math.min(estimatedHeight, rect.top - 12) - 8) : rect.bottom + 8,
      width: Math.max(rect.width, 220),
      maxHeight: openAbove ? Math.max(180, rect.top - 20) : Math.max(180, spaceBelow)
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
  }, [isOpen, options.length, searchable]);

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
      className="beautiful-select-menu fixed z-[160] flex flex-col overflow-hidden rounded-xl border border-brand-outline/60 bg-brand-surface shadow-2xl"
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
                className={`beautiful-select-option flex h-auto min-h-9 w-full items-center justify-between gap-3 rounded-lg border-0 px-3 py-2 text-left text-xs shadow-none ${option.value === currentValue ? 'bg-brand-primary/10 font-bold text-brand-primary' : 'bg-transparent font-medium text-brand-text hover:bg-brand-surface-high'}`}
              >
                <span className="min-w-0 flex-1 break-words leading-snug">{option.label}</span>
                {option.value === currentValue && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white"><Check className="h-3 w-3" /></span>}
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
        <span className="min-w-0 flex-1 truncate">{selectedOption?.label || 'Chọn một giá trị'}</span>
        <span className={`beautiful-select-arrow flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-brand-outline/50 bg-brand-surface-high text-brand-text-muted transition-transform ${isOpen ? 'rotate-180 border-brand-primary/40 bg-brand-primary/10 text-brand-primary' : ''}`}><ChevronDown className="h-3.5 w-3.5" /></span>
      </button>
      {menu}
    </div>
  );
}
