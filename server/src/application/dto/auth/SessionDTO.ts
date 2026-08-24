import type { AccountDTO } from '../AccountDTO.js';

export interface GetCurrentAccountInputDTO {
  sessionId: string | null;
}

export interface GetCurrentAccountOutputDTO {
  account: AccountDTO;
  /** BR-AUTH-024 — tiệm đang làm việc. Ngày 1 luôn null, ngày 3 mới đặt được. */
  activeTenantId: string | null;
}

export interface LogoutInputDTO {
  sessionId: string | null;
}
