import type { User } from '../../domain/entities/User.js';
import type { AccountDTO } from '../dto/AccountDTO.js';

/**
 * Chuyển entity `User` sang DTO gửi ra ngoài.
 *
 * Đây là chỗ duy nhất quyết định trường nào của tài khoản được phép rời khỏi máy chủ.
 * Mọi trường không liệt kê ở đây — `passwordHash`, `passwordSalt`, `failedAttempts`,
 * `lockedUntil` — mặc nhiên bị bỏ lại.
 */
export const AccountMapper = {
  toDTO(user: User): AccountDTO {
    const dto: AccountDTO = {
      id: user.id,
      email: user.email.toString(),
      role: user.role,
      displayName: user.displayName
    };

    const { tenantId, tenantName, branchCode, branchName } = user.scope;
    if (tenantId) dto.tenantId = tenantId;
    if (tenantName) dto.tenantName = tenantName;
    if (branchCode) dto.branchCode = branchCode;
    if (branchName) dto.branchName = branchName;

    return dto;
  }
};
