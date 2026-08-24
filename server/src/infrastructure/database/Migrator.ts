import fs from 'node:fs';
import path from 'node:path';

import type { DatabaseRow } from '../../application/ports/DatabaseClient.js';
import type { NodeSqliteClient } from './NodeSqliteClient.js';

interface AppliedRow extends DatabaseRow {
  name: string;
}

/**
 * Chạy các tệp `.sql` trong thư mục migrations theo thứ tự tên tệp, mỗi tệp đúng
 * một lần, và ghi lại tệp nào đã chạy vào bảng `schema_migrations`.
 *
 * Cố ý viết tay thay vì dùng drizzle-kit: quyết định ở README-BACKEND-ROADMAP.md
 * §0 mục 3 là dùng SQL thuần, và toàn bộ cơ chế cần thiết chỉ gói gọn trong tệp này.
 */
export class Migrator {
  constructor(
    private readonly db: NodeSqliteClient,
    private readonly migrationsDir: string
  ) {}

  async run(): Promise<string[]> {
    await this.db.executeScript(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
    `);

    const appliedRows = await this.db.query<AppliedRow>('SELECT name FROM schema_migrations');
    const applied = new Set(appliedRows.map((row) => row.name));

    if (!fs.existsSync(this.migrationsDir)) {
      throw new Error(`Không tìm thấy thư mục migrations: ${this.migrationsDir}`);
    }

    const files = fs
      .readdirSync(this.migrationsDir)
      .filter((name) => name.endsWith('.sql'))
      .sort();

    const justApplied: string[] = [];

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(this.migrationsDir, file), 'utf8');

      // Mỗi migration chạy trong một giao dịch: hỏng giữa chừng thì không để lại
      // schema nửa vời.
      await this.db.transaction(async () => {
        await this.db.executeScript(sql);
        await this.db.execute('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)', [
          file,
          new Date().toISOString()
        ]);
      });

      justApplied.push(file);
    }

    return justApplied;
  }
}
