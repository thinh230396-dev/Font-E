/** Một dòng dữ liệu thô đọc từ database. */
export type DatabaseRow = Record<string, unknown>;

/**
 * Cổng thực thi SQL.
 *
 * Nhờ cổng này mà các repository ở tầng adapters viết được SQL mà **không** cần
 * import `node:sqlite`. Bản cài đặt cụ thể nằm ở
 * `infrastructure/database/NodeSqliteClient.ts`.
 */
export interface DatabaseClient {
  query<T extends DatabaseRow>(sql: string, params?: readonly unknown[]): Promise<T[]>;

  queryOne<T extends DatabaseRow>(sql: string, params?: readonly unknown[]): Promise<T | null>;

  execute(sql: string, params?: readonly unknown[]): Promise<void>;

  /**
   * Chạy một khối lệnh trong cùng một giao dịch. Hỏng ở bất kỳ bước nào thì
   * rollback toàn bộ.
   *
   * Cần cho những chỗ nhiều bảng phải cùng thành công: tạo tenant kèm chi nhánh
   * chính và tài khoản chủ tiệm (BR-TENANT-004/005), và thu tiền hóa đơn kéo theo
   * hoàn tất lịch hẹn (BR-APT-026).
   */
  transaction<T>(work: () => Promise<T>): Promise<T>;
}
