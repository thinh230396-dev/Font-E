import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import type {
  HashedPassword,
  PasswordHasher
} from '../../application/ports/PasswordHasher.js';
import type { RawPassword } from '../../domain/value-objects/RawPassword.js';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/**
 * Băm mật khẩu bằng scrypt của `node:crypto`.
 *
 * **Khác với backend cũ, có chủ đích.** `scripts/sites-worker.js` dùng SHA-256 +
 * salt, nhưng đó là vì Cloudflare Workers chỉ có WebCrypto, không có hàm băm chậm.
 * SHA-256 nhanh nên thuận lợi cho việc dò mật khẩu hàng loạt; scrypt cố ý chậm và
 * tốn bộ nhớ nên chống được kiểu tấn công đó.
 *
 * Trên Node thì ràng buộc kia không còn: scrypt nằm sẵn trong `node:crypto`, không
 * phải cài thêm gói nào. Vì chưa có dữ liệu thật nên đổi luôn ở đây rẻ hơn đổi sau.
 */
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: RawPassword): Promise<HashedPassword> {
    const salt = randomBytes(SALT_BYTES).toString('hex');
    const derived = await scryptAsync(password.toString(), salt, KEY_LENGTH);
    return { hash: derived.toString('hex'), salt };
  }

  async verify(password: string, hashed: HashedPassword): Promise<boolean> {
    const expected = Buffer.from(hashed.hash, 'hex');
    if (expected.length !== KEY_LENGTH) return false;

    const derived = await scryptAsync(password, hashed.salt, KEY_LENGTH);

    // So sánh theo thời gian hằng số: dùng `===` sẽ dừng ngay ở byte đầu khác nhau,
    // và chênh lệch thời gian đó đủ để suy ra dần từng ký tự.
    return timingSafeEqual(derived, expected);
  }
}
