import type { DemoAccount, PortalRole } from '../auth/demoAccounts';

interface AuthResponse {
  account?: DemoAccount;
  error?: string;
}

export interface ManagedAuthAccount {
  id: string;
  email: string;
  username?: string;
  password?: string;
  role: PortalRole;
  displayName: string;
  tenantId?: string;
  tenantName?: string;
  branchCode?: 'Q1' | 'Q3';
  branchName?: string;
  status?: string;
}

const parseAuthResponse = async (response: Response): Promise<AuthResponse> => {
  try {
    return await response.json() as AuthResponse;
  } catch {
    return {};
  }
};

export const fetchAuthenticatedAccount = async (): Promise<DemoAccount | null> => {
  try {
    const response = await fetch('/api/auth/session', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    });
    if (!response.ok) return null;
    const payload = await parseAuthResponse(response);
    return payload.account || null;
  } catch {
    return null;
  }
};

export const loginAccount = async (
  identifier: string,
  password: string,
  remember: boolean
): Promise<DemoAccount | null> => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ identifier, password, remember })
    });
    if (!response.ok) return null;
    const payload = await parseAuthResponse(response);
    return payload.account || null;
  } catch {
    return null;
  }
};

export const logoutAccount = async () => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
  } catch {
    // The local UI still clears its in-memory session if the network is unavailable.
  }
};

export const persistManagedAuthAccount = async (account: ManagedAuthAccount) => {
  const response = await fetch('/api/auth/accounts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(account)
  });
  if (!response.ok) {
    const payload = await parseAuthResponse(response);
    throw new Error(payload.error || 'Không thể đồng bộ tài khoản đăng nhập.');
  }
};

export const deleteManagedAuthAccount = async (identifier: string) => {
  const response = await fetch(`/api/auth/accounts/${encodeURIComponent(identifier)}`, {
    method: 'DELETE',
    credentials: 'same-origin'
  });
  if (!response.ok && response.status !== 404) {
    const payload = await parseAuthResponse(response);
    throw new Error(payload.error || 'Không thể xóa tài khoản đăng nhập.');
  }
};
