import express, { type Express } from 'express';
import type { Server } from 'node:http';

import type { AppConfig } from '../config/env.js';
import type { Container } from '../di/Container.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { createAuthRouter } from './routes/authRoutes.js';

/**
 * Dựng ứng dụng Express từ container.
 *
 * Không có CORS: frontend gọi `/api` qua proxy của Vite nên trình duyệt coi là
 * cùng origin. Nhờ vậy cookie `SameSite=Strict` hoạt động bình thường, và không
 * phải mở CORS ra cho ai cả.
 */
export const createApp = (container: Container, config: AppConfig): Express => {
  const app = express();

  app.disable('x-powered-by');
  // Cần cho `request.ip` trả về địa chỉ thật khi chạy sau proxy của Vite.
  app.set('trust proxy', true);

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/auth', createAuthRouter(container.authController, config.useSecureCookies));

  app.use(notFoundHandler(config.useSecureCookies));
  app.use(errorHandler(config.useSecureCookies));

  return app;
};

export const startServer = (app: Express, port: number): Promise<Server> =>
  new Promise((resolve) => {
    const server = app.listen(port, () => resolve(server));
  });
