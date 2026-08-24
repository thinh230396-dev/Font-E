import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type {
  DatabaseClient,
  DatabaseRow
} from '../../application/ports/DatabaseClient.js';

/**
 * Bản cài đặt `DatabaseClient` bằng mô-đun `node:sqlite` có sẵn của Node.
 *
 * Đây là **tệp duy nhất trong toàn bộ backend được phép import `node:sqlite`**.
 * Mọi chỗ khác đi qua cổng `DatabaseClient`.
 *
 * `node:sqlite` chạy đồng bộ. Các hàm ở đây vẫn trả về Promise để cổng không bị
 * trói vào một driver đồng bộ — nếu sau này đổi sang Postgres thì chữ ký hàm
 * không phải sửa.
 */
export class NodeSqliteClient implements DatabaseClient {
  private readonly db: DatabaseSync;
  private transactionDepth = 0;

  constructor(databaseFile: string) {
    if (databaseFile !== ':memory:') {
      fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
    }

    this.db = new DatabaseSync(databaseFile);
    // Khóa ngoại trong SQLite mặc định TẮT — không bật thì mọi REFERENCES chỉ là
    // chú thích và dữ liệu mồ côi lọt qua im lặng.
    this.db.exec('PRAGMA foreign_keys = ON');
    // WAL cho phép đọc trong lúc đang ghi, tránh khóa nhau khi vừa gọi API vừa
    // mở tệp database bằng công cụ xem SQLite.
    this.db.exec('PRAGMA journal_mode = WAL');
  }

  async query<T extends DatabaseRow>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
    const statement = this.db.prepare(sql);
    return statement.all(...(params as never[])) as T[];
  }

  async queryOne<T extends DatabaseRow>(
    sql: string,
    params: readonly unknown[] = []
  ): Promise<T | null> {
    const statement = this.db.prepare(sql);
    const row = statement.get(...(params as never[]));
    return (row as T | undefined) ?? null;
  }

  async execute(sql: string, params: readonly unknown[] = []): Promise<void> {
    const statement = this.db.prepare(sql);
    statement.run(...(params as never[]));
  }

  /** Chạy nhiều câu lệnh một lần — dùng cho tệp migration. */
  async executeScript(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  /**
   * Giao dịch lồng nhau được xử lý bằng cách đếm độ sâu: chỉ lần ngoài cùng mới
   * phát `BEGIN` và `COMMIT`. SQLite không cho phép hai giao dịch lồng thật sự.
   */
  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.transactionDepth > 0) {
      this.transactionDepth += 1;
      try {
        return await work();
      } finally {
        this.transactionDepth -= 1;
      }
    }

    this.db.exec('BEGIN');
    this.transactionDepth = 1;
    try {
      const result = await work();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    } finally {
      this.transactionDepth = 0;
    }
  }

  close(): void {
    this.db.close();
  }
}
