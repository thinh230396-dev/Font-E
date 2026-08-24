import { loadConfig } from './infrastructure/config/env.js';
import { Migrator } from './infrastructure/database/Migrator.js';
import { NodeSqliteClient } from './infrastructure/database/NodeSqliteClient.js';
import { createContainer } from './infrastructure/di/Container.js';
import { createApp, startServer } from './infrastructure/http/ExpressHttpServer.js';
import { seedDemoAccounts } from './infrastructure/seed/seedDemoAccounts.js';

/**
 * Điểm khởi động của backend.
 *
 * Thứ tự: mở database → chạy migration → ráp container → nạp dữ liệu mẫu → mở cổng.
 * Migration phải xong trước khi container chạm vào bảng nào, nếu không lần chạy đầu
 * trên máy sạch sẽ hỏng.
 */
const bootstrap = async (): Promise<void> => {
  const config = loadConfig();

  const db = new NodeSqliteClient(config.databaseFile);

  const applied = await new Migrator(db, config.migrationsDir).run();
  if (applied.length > 0) {
    console.log(`[api] Đã chạy ${applied.length} migration: ${applied.join(', ')}`);
  }

  const container = createContainer(db);

  const seeded = await seedDemoAccounts(container);
  if (seeded > 0) {
    console.log(`[api] Đã nạp ${seeded} tài khoản demo.`);
  }

  const app = createApp(container, config);
  const server = await startServer(app, config.port);

  console.log(`[api] SalonSys API đang chạy tại http://localhost:${config.port}`);
  console.log(`[api] Database: ${config.databaseFile}`);

  const shutdown = (signal: string): void => {
    console.log(`\n[api] Nhận ${signal}, đang đóng...`);
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

bootstrap().catch((error: unknown) => {
  console.error('[api] Không khởi động được máy chủ:', error);
  process.exit(1);
});
