import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { InterfaceLanguage } from '../components/AccountPreferences';
import { translate } from './translate';

/**
 * Lớp ngôn ngữ dùng chung cho cả ba cổng (Superadmin, Tenant Admin, Lễ tân).
 *
 * Vì sao là context chứ không phải prop: trước đây ngôn ngữ được truyền xuống
 * bằng prop, nên chỉ những component nằm ngay trên đường truyền mới dịch được —
 * thực tế chỉ có phần vỏ Tenant Admin, còn cổng Lễ tân không hề nhận prop này.
 * Với context, bất kỳ component nào cũng gọi `useT()` là dùng được, không phải
 * luồn prop qua từng cấp.
 *
 * Provider giữ luôn state và việc lưu trữ, nên `localStorage`, `<html lang>` và
 * `<html data-language>` chỉ được viết ở một chỗ duy nhất.
 */

const STORAGE_KEY = 'salonsys_interface_language';

export type Translate = (source: string, vars?: Record<string, string | number>) => string;

interface LanguageContextValue {
  language: InterfaceLanguage;
  setLanguage: (language: InterfaceLanguage) => void;
  t: Translate;
}

function readStoredLanguage(): InterfaceLanguage {
  if (typeof window === 'undefined') return 'vi';
  return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'vi';
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'vi',
  setLanguage: () => {},
  t: (source) => source
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<InterfaceLanguage>(readStoredLanguage);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dataset.language = language;
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((next: InterfaceLanguage) => {
    setLanguageState(next);
  }, []);

  const t = useCallback<Translate>(
    (source, vars) => translate(source, language, vars),
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** Ngôn ngữ hiện tại kèm hàm đổi ngôn ngữ. */
export function useLanguage() {
  return useContext(LanguageContext);
}

/** Chỉ lấy hàm dịch — dạng dùng phổ biến nhất trong các màn hình. */
export function useT(): Translate {
  return useContext(LanguageContext).t;
}
