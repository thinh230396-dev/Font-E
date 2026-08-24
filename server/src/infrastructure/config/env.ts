import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Gốc thư mục `server/`. */
export const SERVER_ROOT = path.resolve(here, '..', '..', '..');

const readInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface AppConfig {
  port: number;
  databaseFile: string;
  migrationsDir: string;
  isProduction: boolean;
  /** Bật cờ `Secure` cho cookie. Localhost chạy HTTP nên mặc định tắt. */
  useSecureCookies: boolean;
}

export const loadConfig = (): AppConfig => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    port: readInt(process.env.API_PORT, 4000),
    databaseFile:
      process.env.SALONSYS_DB_FILE ?? path.join(SERVER_ROOT, 'data', 'salonsys.db'),
    migrationsDir: path.join(here, '..', 'database', 'migrations'),
    isProduction,
    useSecureCookies: process.env.SALONSYS_SECURE_COOKIES === 'true'
  };
};
