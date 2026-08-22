import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Plugin } from 'vite';

type LocalRole = 'SUPERADMIN' | 'TENANT_ADMIN' | 'RECEPTIONIST';

interface LocalAccount {
  email: string;
  username: string;
  password: string;
  role: LocalRole;
  displayName: string;
  tenantId?: string;
  tenantName?: string;
  branchCode?: 'Q1' | 'Q3';
  branchName?: string;
}

const LOCAL_ACCOUNTS: LocalAccount[] = [
  {
    email: 'superadmin@salonsys.vn',
    username: 'superadmin',
    password: 'Super@2026',
    role: 'SUPERADMIN',
    displayName: 'Superadmin'
  },
  {
    email: 'tenantadmin@lumierehair.vn',
    username: 'nguyenvanboss',
    password: 'Lumiere@2026',
    role: 'TENANT_ADMIN',
    displayName: 'Nguyễn Văn Boss',
    tenantId: 'TEN-LUMIERE',
    tenantName: 'Nailé Studio'
  },
  {
    email: 'receptionist@nailestudio.vn',
    username: 'receptionist',
    password: 'Reception@2026',
    role: 'RECEPTIONIST',
    displayName: 'Lê Hoàng Nam',
    tenantId: 'TEN-LUMIERE',
    tenantName: 'Nailé Studio',
    branchCode: 'Q3',
    branchName: 'Nailé Studio · Chi nhánh Quận 3'
  }
];

const SESSION_COOKIE = 'salonsys_session';
const sessions = new Map<string, { account: LocalAccount; expiresAt: number }>();

interface LocalUpgradeRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  requestedByName: string;
  requestedByEmail: string;
  currentPackageId?: string;
  currentPackageName: string;
  requestedPackageId: string;
  requestedPackageName: string;
  billingCycle: 'monthly' | 'yearly';
  effectiveDate: 'immediate' | 'next_cycle';
  quotedAmount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  invoiceId?: string;
}

const LOCAL_PACKAGE_UPGRADE_REQUESTS: LocalUpgradeRequest[] = [];

const publicAccount = ({ password: _password, username: _username, ...account }: LocalAccount) => account;

const sendJson = (response: ServerResponse, status: number, payload: unknown, headers: Record<string, string> = {}) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  response.end(JSON.stringify(payload));
};

const readJsonBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const getCookie = (request: IncomingMessage, name: string) => {
  const source = request.headers.cookie || '';
  const pair = source.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : '';
};

/* Cửa đăng nhập chỉ dùng khi phát triển: cấp phiên cho một vai trò mà không
   cần mật khẩu, để mở thẳng một cổng khi cần xem giao diện. MẶC ĐỊNH TẮT —
   chỉ bật khi `SALONSYS_DEV_LOGIN` bằng 1/true, đặt trong biến môi trường
   hoặc trong `.env.local` (thư mục gốc đã gitignore mọi file `.env*`).

   Không có đường nào để nó lọt ra bản phát hành: plugin này khai
   `apply: 'serve'` nên chỉ tồn tại trong `npm run dev`, còn xác thực thật khi
   deploy nằm ở `scripts/sites-worker.js` (Cloudflare Worker + D1). */
const isTruthyFlag = (value: string | undefined) => {
  const flag = (value || '').trim().toLowerCase();
  return flag === '1' || flag === 'true';
};

const passwordsMatch = (supplied: string, expected: string) => {
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
};

export const localAuthPlugin = (): Plugin => ({
  name: 'salonsys-local-auth',
  apply: 'serve',
  configureServer(server) {
    const fileEnv = loadEnv(server.config.mode, server.config.root, '');
    const devLoginEnabled = isTruthyFlag(process.env.SALONSYS_DEV_LOGIN ?? fileEnv.SALONSYS_DEV_LOGIN);

    if (devLoginEnabled) {
      server.config.logger.warn(
        '[salonsys] SALONSYS_DEV_LOGIN đang bật — GET /api/auth/dev-login?role=SUPERADMIN cấp phiên mà không cần mật khẩu. Chỉ dùng khi phát triển.'
      );
    }

    server.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url || '/', 'http://localhost');
      if (!url.pathname.startsWith('/api/')) {
        next();
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/package-upgrade-requests') {
        sendJson(response, 200, { requests: LOCAL_PACKAGE_UPGRADE_REQUESTS });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/package-upgrade-requests') {
        const body = await readJsonBody(request) as Partial<LocalUpgradeRequest>;
        if (!body.id || !body.tenantId || !body.requestedPackageName) {
          sendJson(response, 400, { error: 'Thiếu thông tin yêu cầu nâng cấp gói.' });
          return;
        }
        const newReq: LocalUpgradeRequest = {
          id: body.id,
          tenantId: body.tenantId,
          tenantName: body.tenantName || 'Salon',
          requestedByName: body.requestedByName || 'Admin',
          requestedByEmail: body.requestedByEmail || '',
          currentPackageId: body.currentPackageId,
          currentPackageName: body.currentPackageName || 'Basic',
          requestedPackageId: body.requestedPackageId || '',
          requestedPackageName: body.requestedPackageName,
          billingCycle: body.billingCycle || 'monthly',
          effectiveDate: body.effectiveDate || 'immediate',
          quotedAmount: body.quotedAmount || 0,
          currency: body.currency || 'VND',
          status: 'PENDING',
          requestedAt: body.requestedAt || new Date().toISOString()
        };
        const index = LOCAL_PACKAGE_UPGRADE_REQUESTS.findIndex((req) => req.id === newReq.id);
        if (index >= 0) {
          LOCAL_PACKAGE_UPGRADE_REQUESTS[index] = newReq;
        } else {
          LOCAL_PACKAGE_UPGRADE_REQUESTS.unshift(newReq);
        }
        sendJson(response, 200, { ok: true, request: newReq });
        return;
      }

      if (request.method === 'PATCH' && url.pathname.startsWith('/api/package-upgrade-requests/')) {
        const reqId = decodeURIComponent(url.pathname.slice('/api/package-upgrade-requests/'.length));
        const body = await readJsonBody(request) as Partial<LocalUpgradeRequest>;
        const index = LOCAL_PACKAGE_UPGRADE_REQUESTS.findIndex((req) => req.id === reqId);
        if (index >= 0) {
          LOCAL_PACKAGE_UPGRADE_REQUESTS[index] = {
            ...LOCAL_PACKAGE_UPGRADE_REQUESTS[index],
            ...body
          };
          sendJson(response, 200, { ok: true, request: LOCAL_PACKAGE_UPGRADE_REQUESTS[index] });
        } else {
          sendJson(response, 200, { ok: true });
        }
        return;
      }

      if (request.method === 'DELETE' && url.pathname.startsWith('/api/package-upgrade-requests/')) {
        const reqId = decodeURIComponent(url.pathname.slice('/api/package-upgrade-requests/'.length));
        const index = LOCAL_PACKAGE_UPGRADE_REQUESTS.findIndex((req) => req.id === reqId);
        if (index >= 0) {
          LOCAL_PACKAGE_UPGRADE_REQUESTS.splice(index, 1);
        }
        sendJson(response, 200, { ok: true });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/login') {
        const body = await readJsonBody(request);
        const identifier = typeof body.identifier === 'string' ? body.identifier.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const account = LOCAL_ACCOUNTS.find((candidate) =>
          candidate.email.toLowerCase() === identifier || candidate.username.toLowerCase() === identifier
        );
        if (!account || !passwordsMatch(password, account.password)) {
          sendJson(response, 401, { error: 'Tài khoản hoặc mật khẩu không đúng.' });
          return;
        }

        const remember = body.remember === true;
        const maxAge = remember ? 30 * 86_400 : 8 * 3_600;
        const sessionId = randomUUID();
        sessions.set(sessionId, { account, expiresAt: Date.now() + maxAge * 1000 });
        sendJson(response, 200, { account: publicAccount(account) }, {
          'Set-Cookie': `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`
        });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/auth/dev-login') {
        if (!devLoginEnabled) {
          sendJson(response, 404, { error: 'Không tìm thấy API local.' });
          return;
        }

        const requestedRole = (url.searchParams.get('role') || 'SUPERADMIN').trim().toUpperCase();
        const account = LOCAL_ACCOUNTS.find((candidate) => candidate.role === requestedRole);
        if (!account) {
          sendJson(response, 400, {
            error: `Vai trò không hợp lệ: ${requestedRole}. Dùng SUPERADMIN, TENANT_ADMIN hoặc RECEPTIONIST.`
          });
          return;
        }

        const maxAge = 8 * 3_600;
        const sessionId = randomUUID();
        sessions.set(sessionId, { account, expiresAt: Date.now() + maxAge * 1000 });
        response.writeHead(302, {
          'Cache-Control': 'no-store',
          Location: '/',
          'Set-Cookie': `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`
        });
        response.end();
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/auth/session') {
        const sessionId = getCookie(request, SESSION_COOKIE);
        const session = sessions.get(sessionId);
        if (!session || session.expiresAt <= Date.now()) {
          if (sessionId) sessions.delete(sessionId);
          sendJson(response, 401, { error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
          return;
        }
        sendJson(response, 200, { account: publicAccount(session.account) });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
        const sessionId = getCookie(request, SESSION_COOKIE);
        if (sessionId) sessions.delete(sessionId);
        sendJson(response, 200, { ok: true }, {
          'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
        });
        return;
      }

      if (request.method === 'PUT' && url.pathname === '/api/auth/accounts') {
        const body = await readJsonBody(request) as Partial<LocalAccount>;
        if (!body.email || !body.role) {
          sendJson(response, 400, { error: 'Thiếu thông tin tài khoản.' });
          return;
        }
        const index = LOCAL_ACCOUNTS.findIndex(
          (acc) => acc.email.toLowerCase() === body.email?.toLowerCase() || (body.username && acc.username.toLowerCase() === body.username?.toLowerCase())
        );
        const updatedAccount: LocalAccount = {
          email: body.email,
          username: body.username || body.email.split('@')[0],
          password: body.password || '123456',
          role: body.role,
          displayName: body.displayName || body.username || body.email,
          tenantId: body.tenantId,
          tenantName: body.tenantName,
          branchCode: body.branchCode,
          branchName: body.branchName
        };
        if (index >= 0) {
          LOCAL_ACCOUNTS[index] = { ...LOCAL_ACCOUNTS[index], ...updatedAccount };
        } else {
          LOCAL_ACCOUNTS.push(updatedAccount);
        }
        sendJson(response, 200, { ok: true, account: publicAccount(updatedAccount) });
        return;
      }

      if (request.method === 'DELETE' && url.pathname.startsWith('/api/auth/accounts/')) {
        const identifier = decodeURIComponent(url.pathname.slice('/api/auth/accounts/'.length)).toLowerCase();
        const index = LOCAL_ACCOUNTS.findIndex(
          (acc) => acc.email.toLowerCase() === identifier || acc.username.toLowerCase() === identifier
        );
        if (index >= 0) {
          LOCAL_ACCOUNTS.splice(index, 1);
        }
        sendJson(response, 200, { ok: true });
        return;
      }

      sendJson(response, 404, { error: 'Không tìm thấy API local.' });
    });
  }
});
