/**
 * Tầng gọi API dùng chung.
 *
 * Vì sao tồn tại: `src/utils/authApi.ts` cũ `catch` rồi trả `null`, nên tầng gọi
 * không phân biệt được "không có dữ liệu" với "gọi thất bại" — và hai hàm ghi
 * của nó còn `return true` ngay trong nhánh `catch`, tức báo thành công dù máy
 * chủ lỗi. README-MIGRATION.md §12.4 gọi đó là lỗi phải sửa, không phải phong
 * cách được chọn.
 *
 * Nguyên tắc ở đây: **không bao giờ nuốt lỗi**. Mọi lời gọi trả về một kết quả
 * nói rõ thành công hay thất bại, và thất bại vì lý do gì — vì mỗi lý do cần
 * một cách hiển thị khác nhau.
 */

import type { ToastTone } from '../components/ui/Toast';

/** Một ô nhập bị sai, để gắn thông báo vào đúng chỗ thay vì đổ ra toast chung. */
export interface ApiFieldError {
  field: string;
  message: string;
}

/**
 * Sáu trường hợp bắt buộc phân biệt ở §12.4, cộng hai trường hợp mà backend đã
 * có mã lỗi riêng nên không đáng gộp bừa vào "lỗi máy chủ".
 */
export type ApiFailureKind =
  /** 400 / 422 — gắn thông báo vào đúng ô nhập sai. */
  | 'validation'
  /** 401 — đưa về màn hình đăng nhập. */
  | 'unauthenticated'
  /** 403 — báo không đủ quyền, KHÔNG được đưa về đăng nhập. */
  | 'forbidden'
  /** 404 — bản ghi không tồn tại, hoặc thuộc tiệm khác (BR-TENANT-013 bước 4). */
  | 'notFound'
  /** 409 — vượt hạn mức gói, hoặc trùng lịch kỹ thuật viên. */
  | 'conflict'
  /** `fetch` ném lỗi — mất mạng hoặc máy chủ chưa chạy. Cho thử lại. */
  | 'network'
  /** 5xx — lỗi hệ thống. Cho thử lại. */
  | 'server';

export interface ApiError {
  kind: ApiFailureKind;
  /**
   * Mã lỗi máy đọc được của backend: `VALIDATION_FAILED`, `TENANT_READONLY`,
   * `SLOT_CONFLICT`… Giao diện quyết định hành vi dựa vào mã này, không dựa vào
   * câu chữ — câu chữ có thể đổi bất cứ lúc nào mà không ai coi là thay đổi API.
   */
  code: string;
  /** Câu tiếng Việt để hiển thị thẳng cho người dùng. */
  message: string;
  fields: ApiFieldError[];
  /** Rỗng khi lỗi xảy ra trước lúc có phản hồi, ví dụ mất mạng. */
  status?: number;
}

/**
 * Kết quả của một lời gọi API.
 *
 * Khóa phân biệt là chuỗi `status` chứ không phải cờ `ok: boolean` — và đó là
 * một ràng buộc kỹ thuật, không phải sở thích: `tsconfig.json` của dự án không
 * bật `strictNullChecks`, và ở chế độ đó TypeScript **không thu hẹp được kiểu**
 * theo khóa phân biệt kiểu boolean. Viết `if (!result.ok)` rồi đọc `result.error`
 * sẽ báo lỗi "Property 'error' does not exist". Với chuỗi thì thu hẹp chạy đúng.
 */
export type ApiResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'error'; error: ApiError };

interface BackendErrorBody {
  error?: {
    code?: string;
    message?: string;
    fields?: Array<{ field?: string; message?: string }>;
  };
}

const NETWORK_ERROR: ApiError = {
  kind: 'network',
  code: 'NETWORK_ERROR',
  message: 'Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.',
  fields: []
};

/** Ánh xạ mã HTTP sang loại thất bại. Backend luôn kèm mã lỗi riêng nên đây chỉ là lớp phân loại. */
const kindFromStatus = (status: number): ApiFailureKind => {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  return 'server';
};

const readErrorBody = async (response: Response): Promise<ApiError> => {
  let body: BackendErrorBody | null = null;

  try {
    body = (await response.json()) as BackendErrorBody;
  } catch {
    // Phản hồi không phải JSON — thường là trang lỗi của máy chủ proxy. Bỏ qua và
    // dựng lỗi từ mã HTTP; đọc không nổi phần thân không có nghĩa là không có lỗi.
  }

  const kind = kindFromStatus(response.status);

  return {
    kind,
    code: body?.error?.code || `HTTP_${response.status}`,
    message: body?.error?.message || defaultMessageFor(kind),
    fields: (body?.error?.fields || [])
      .filter((item): item is { field: string; message: string } =>
        Boolean(item.field && item.message)),
    status: response.status
  };
};

const defaultMessageFor = (kind: ApiFailureKind): string => {
  switch (kind) {
    case 'unauthenticated':
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 'forbidden':
      return 'Bạn không có quyền thực hiện thao tác này.';
    case 'notFound':
      return 'Không tìm thấy dữ liệu yêu cầu.';
    case 'conflict':
      return 'Thao tác bị từ chối vì xung đột dữ liệu.';
    case 'validation':
      return 'Dữ liệu nhập chưa hợp lệ.';
    default:
      return 'Máy chủ gặp sự cố. Vui lòng thử lại.';
  }
};

/**
 * Gọi một endpoint và trả về kết quả đã phân loại.
 *
 * `credentials: 'same-origin'` là bắt buộc: phiên đăng nhập nằm trong cookie
 * HttpOnly (BR-AUTH-024), và frontend đi qua proxy của Vite nên cùng origin với
 * API.
 */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers
      }
    });
  } catch {
    return { status: 'error', error: NETWORK_ERROR };
  }

  if (!response.ok) {
    return { status: 'error', error: await readErrorBody(response) };
  }

  // 204 No Content — thao tác thành công và cố ý không có thân phản hồi.
  if (response.status === 204) {
    return { status: 'ok', data: undefined as T };
  }

  try {
    return { status: 'ok', data: (await response.json()) as T };
  } catch {
    return {
      status: 'error',
      error: {
        kind: 'server',
        code: 'INVALID_RESPONSE',
        message: 'Máy chủ trả về dữ liệu không đọc được.',
        fields: [],
        status: response.status
      }
    };
  }
}

export const apiGet = <T>(path: string) => apiRequest<T>(path);

export const apiPost = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body)
  });

export const apiPut = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body)
  });

/**
 * `PATCH` dành cho những thao tác chỉ đụng tới **một** thuộc tính — khóa tiệm,
 * ngừng một chi nhánh. Backend cố ý tách chúng khỏi `PUT` sửa hồ sơ, để việc
 * khóa một tiệm không bao giờ xảy ra như tác dụng phụ của một lần sửa tên.
 */
export const apiPatch = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body)
  });

export const apiDelete = <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' });

/**
 * Chuyển lỗi thành nội dung cho `ToastProvider` có sẵn.
 *
 * Cố ý KHÔNG tự gọi toast bên trong `apiRequest`: có những lỗi không nên hiện
 * toast chút nào — lỗi 401 lúc mở trang chỉ có nghĩa là chưa đăng nhập, và lỗi
 * validation phải hiện ngay tại ô nhập sai chứ không phải ở góc màn hình.
 * Quyết định đó thuộc về nơi gọi, không thuộc về tầng vận chuyển.
 */
export const describeApiError = (error: ApiError): { message: string; tone: ToastTone } => ({
  message: error.message,
  tone: error.kind === 'validation' || error.kind === 'conflict' ? 'warning' : 'error'
});

/** Gộp danh sách lỗi theo ô nhập thành một bản đồ để form tra nhanh. */
export const fieldErrorMap = (error: ApiError): Record<string, string> =>
  Object.fromEntries(error.fields.map((item) => [item.field, item.message]));
