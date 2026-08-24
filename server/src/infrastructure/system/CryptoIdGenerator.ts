import { randomUUID } from 'node:crypto';

import type { IdGenerator } from '../../application/ports/IdGenerator.js';

/**
 * Sinh định danh bằng `randomUUID` của `node:crypto`.
 *
 * Id phiên bắt buộc phải không đoán được — đoán được id phiên là chiếm được phiên.
 * `randomUUID` dùng nguồn ngẫu nhiên mã hóa, khác hẳn `Math.random()`.
 */
export class CryptoIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }

  generateWithPrefix(prefix: string): string {
    return `${prefix}-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  }
}
