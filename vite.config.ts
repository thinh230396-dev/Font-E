import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Backend thật là solution ASP.NET Core ở C:\Users\letru\source\repos\NailManagement,
// chạy bằng `dotnet run --project NailManagement.API --launch-profile http`.
const API_ORIGIN = process.env.API_ORIGIN || 'http://localhost:5282';

export default defineConfig(() => {
  return {
    // Plugin `localAuthPlugin` cũ đã được gỡ khỏi đây: nó chặn `/api/auth/*` ngay trong
    // Vite, nên nếu còn thì request không bao giờ tới được máy chủ ASP.NET Core.
    // Tệp `scripts/vite-local-auth.ts` giữ lại chỉ để tra ba tài khoản demo.
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // Chuyển tiếp mọi lời gọi API sang backend .NET. Nhờ đi qua cùng một origin nên
      // trình duyệt không coi đây là request chéo miền — cookie `SameSite=Strict` hoạt
      // động bình thường và backend không cần mở CORS cho ai cả.
      proxy: {
        '/api': {
          target: API_ORIGIN,
          changeOrigin: false,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
