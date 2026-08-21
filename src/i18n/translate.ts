import type { InterfaceLanguage } from '../components/AccountPreferences';
import { EN_TRANSLATIONS } from './translations';

/**
 * Phần lõi của lớp ngôn ngữ, cố ý tách khỏi `LanguageProvider.tsx` để các module
 * tiện ích thuần (ví dụ `utils/money.ts`) dùng được mà không phải kéo React vào.
 */

const missingKeysReported = new Set<string>();

function isDev(): boolean {
  // `import.meta.env` do Vite cung cấp; dự án chưa nạp type `vite/client` nên
  // đọc qua ép kiểu thay vì thêm một phụ thuộc type mới.
  return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
}

/**
 * Ngôn ngữ đang áp dụng, đọc từ `<html data-language>` mà LanguageProvider ghi.
 *
 * Dành cho code chạy ngoài cây React (hàm định dạng, hàm sắp xếp…). Trong
 * component hãy dùng `useT()` để component tự render lại khi đổi ngôn ngữ —
 * đọc từ DOM sẽ không kích hoạt render lại.
 */
export function getDocumentLanguage(): InterfaceLanguage {
  if (typeof document === 'undefined') return 'vi';
  return document.documentElement.dataset.language === 'en' ? 'en' : 'vi';
}

/** Dịch một chuỗi nguồn tiếng Việt, có nội suy biến dạng `{ten}`. */
export function translate(
  source: string,
  language: InterfaceLanguage,
  vars?: Record<string, string | number>
): string {
  let text = source;
  if (language === 'en') {
    const translated = EN_TRANSLATIONS[source];
    if (translated === undefined) {
      // Chuỗi chưa dịch rơi về tiếng Việt — màn hình vẫn dùng được trong lúc
      // migrate dần. Cảnh báo một lần mỗi khoá để biết còn thiếu những gì.
      if (isDev() && !missingKeysReported.has(source)) {
        missingKeysReported.add(source);
        console.warn('[i18n] Thiếu bản dịch tiếng Anh cho:', JSON.stringify(source));
      }
    } else {
      text = translated;
    }
  }
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (
    key in vars ? String(vars[key]) : match
  ));
}
