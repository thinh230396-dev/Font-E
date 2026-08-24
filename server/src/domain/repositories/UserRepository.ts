import type { User } from '../entities/User.js';

/**
 * Cổng (port) ra kho dữ liệu tài khoản.
 *
 * Đây là interface do tầng domain định nghĩa và tầng ngoài phải tuân theo — chính
 * là chỗ đảo ngược phụ thuộc của Clean Architecture. Domain không biết dữ liệu nằm
 * ở SQLite, Postgres hay trong bộ nhớ.
 */
export interface UserRepository {
  /** Tìm theo email hoặc username, không phân biệt hoa thường. Dùng khi đăng nhập. */
  findByIdentifier(identifier: string): Promise<User | null>;

  findById(id: string): Promise<User | null>;

  /** Ghi đè trạng thái hiện tại của tài khoản. */
  save(user: User): Promise<void>;

  countAll(): Promise<number>;
}
