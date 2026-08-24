import type { AccountDTO } from '../AccountDTO.js';

export interface LoginInputDTO {
  /** Email hoặc username. */
  identifier: string;
  password: string;
  remember: boolean;
  /** Lấy từ request, dùng để ghi vào phiên (README-MIGRATION.md §8.5). */
  ip: string | null;
  userAgent: string | null;
}

export interface IssuedSessionDTO {
  id: string;
  expiresAt: string;
  /** Số giây sống của cookie. Tầng ngoài dùng để đặt `Max-Age`. */
  maxAgeSeconds: number;
}

export interface LoginOutputDTO {
  account: AccountDTO;
  /**
   * Use case chỉ nói "phiên này sống bao lâu". Việc biến nó thành cookie HttpOnly
   * là chuyện của tầng ngoài — tầng application không biết HTTP có cookie.
   */
  session: IssuedSessionDTO;
}
