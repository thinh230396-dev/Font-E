import { Router } from 'express';

import type { AuthController } from '../../../adapters/controllers/AuthController.js';
import { adapt } from '../expressAdapter.js';

/**
 * Bảng định tuyến cho `/api/auth`.
 *
 * Route chỉ nối đường dẫn với phương thức của controller. Không có logic nào ở đây —
 * thấy chữ `if` xuất hiện trong tệp này là dấu hiệu nghiệp vụ bị rò ra khỏi use case.
 */
export const createAuthRouter = (
  controller: AuthController,
  secureCookies: boolean
): Router => {
  const router = Router();

  router.post('/login', adapt((request) => controller.login(request), secureCookies));
  router.get('/session', adapt((request) => controller.session(request), secureCookies));
  router.post('/logout', adapt((request) => controller.logout(request), secureCookies));

  return router;
};
