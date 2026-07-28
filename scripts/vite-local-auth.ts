import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

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

const passwordsMatch = (supplied: string, expected: string) => {
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
};

export const localAuthPlugin = (): Plugin => ({
  name: 'salonsys-local-auth',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url || '/', 'http://localhost');
      if (!url.pathname.startsWith('/api/auth/')) {
        next();
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

      sendJson(response, 404, { error: 'Không tìm thấy API local.' });
    });
  }
});
