/** Cổng sinh định danh. Tách ra để test bơm được giá trị cố định. */
export interface IdGenerator {
  /** Định danh ngẫu nhiên không đoán được — dùng cho id phiên đăng nhập. */
  generate(): string;

  /** Định danh có tiền tố cho dễ đọc khi tra cứu, ví dụ `USR-a1b2c3`. */
  generateWithPrefix(prefix: string): string;
}
