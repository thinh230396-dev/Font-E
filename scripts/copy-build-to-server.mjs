/**
 * Chép bản build của giao diện vào `wwwroot/` của máy chủ, để ASP.NET phục vụ luôn nó.
 *
 * Sinh ra ở ngày 20+: lúc trình bày, mở hai cửa sổ lệnh và nhớ đúng thứ tự (backend trước, Vite
 * sau) là một việc thừa và dễ quên. Sau bước này chỉ còn **một lệnh** và **một cổng**:
 *
 *     npm run build:server
 *     dotnet run --project NailManagement.API --launch-profile http
 *     → http://localhost:5282   (cả giao diện lẫn API)
 *
 * Chế độ phát triển KHÔNG đổi: `npm run dev` vẫn chạy Vite ở cổng 3000 và proxy `/api` sang
 * 5282. Máy chủ chỉ phục vụ giao diện khi `wwwroot/index.html` có thật.
 *
 * Đường dẫn máy chủ lấy từ biến môi trường `SERVER_WWWROOT`. Không đặt thì dùng mặc định — chỗ
 * solution `NailManagement` đang nằm trên máy phát triển hiện tại, viết thẳng ra vì hai repo KHÔNG
 * nằm cạnh nhau nên không suy ra được. Máy khác thì đặt biến ấy, đừng sửa dòng mặc định.
 *
 * ## Vì sao có tệp kê khai
 *
 * Bước này phải xóa bản build cũ trước khi chép bản mới, nếu không những gói JavaScript mang mã
 * băm cũ sẽ nằm lại mãi và `wwwroot/` phình lên sau mỗi lần build. Nhưng "xóa sạch một thư mục"
 * là thao tác không lùi lại được, nên nó chỉ xóa **đúng những tệp chính nó đã chép** — ghi trong
 * `.build-manifest.json`. Gặp thư mục có sẵn nội dung mà không có tệp kê khai thì dừng và hỏi,
 * chứ không đoán rằng chỗ đó là của mình.
 */

import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const distDir = path.join(repoRoot, 'dist');

// Mặc định là chỗ solution đang nằm trên máy này. Viết thẳng ra thay vì suy từ repoRoot: hai
// repo không nằm cạnh nhau, nên mọi phép `..` đều là một câu đố chứ không phải một lời giải.
const DEFAULT_SERVER_WWWROOT = 'C:/Users/letru/source/repos/NailManagement/NailManagement.API/wwwroot';
const serverWwwroot = path.resolve(process.env.SERVER_WWWROOT || DEFAULT_SERVER_WWWROOT);
const wwwrootSource = process.env.SERVER_WWWROOT ? 'biến SERVER_WWWROOT' : 'mặc định của máy phát triển';

const MANIFEST = '.build-manifest.json';

/**
 * Hai thư mục của bản mẫu Cloudflare Worker. Từ ngày 26 chỉ `npm run build:legacy` sinh ra chúng,
 * còn `npm run build` thì không — nhưng vẫn bỏ qua ở đây, vì một lần chạy `build:legacy` trước đó
 * để lại chúng trong `dist/` và chúng không có việc gì ở `wwwroot/` của máy chủ thật.
 */
const SKIP = new Set(['server', '.openai', MANIFEST]);

const fail = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

if (!existsSync(distDir) || !existsSync(path.join(distDir, 'index.html'))) {
  fail(`Chưa có bản build ở ${distDir}.\n\n  npm run build`);
}

const serverProject = path.dirname(serverWwwroot);
if (!existsSync(serverProject)) {
  fail(`Không thấy project máy chủ ở ${serverProject}.\n`
    + `Đặt biến SERVER_WWWROOT trỏ tới thư mục wwwroot của NailManagement.API nếu solution nằm chỗ khác.`);
}

// Dọn bản cũ — chỉ những gì lần chạy trước đã chép.
if (existsSync(serverWwwroot)) {
  const present = await readdir(serverWwwroot);
  let previous = null;

  try {
    previous = JSON.parse(await readFile(path.join(serverWwwroot, MANIFEST), 'utf8'));
  } catch {
    previous = null;
  }

  if (!previous && present.length > 0) {
    fail(`${serverWwwroot} đã có sẵn ${present.length} mục nhưng không có ${MANIFEST}.\n`
      + `Script không xóa thứ nó không tự chép vào. Kiểm tra thư mục rồi dọn tay nếu đúng là rác của bản build cũ.`);
  }

  for (const entry of previous?.entries || []) {
    await rm(path.join(serverWwwroot, entry), { recursive: true, force: true });
  }
  await rm(path.join(serverWwwroot, MANIFEST), { force: true });
}

await mkdir(serverWwwroot, { recursive: true });

const copied = [];
for (const entry of await readdir(distDir)) {
  if (SKIP.has(entry)) continue;
  await cp(path.join(distDir, entry), path.join(serverWwwroot, entry), { recursive: true });
  copied.push(entry);
}

await writeFile(
  path.join(serverWwwroot, MANIFEST),
  JSON.stringify({ builtAt: new Date().toISOString(), entries: copied }, null, 2)
);

console.log(`Đã chép ${copied.length} mục sang ${serverWwwroot}`);
console.log(`  (đường dẫn lấy từ ${wwwrootSource})`);
console.log(`  ${copied.join(' · ')}`);
console.log(`\nGiờ chạy máy chủ, giao diện nằm cùng cổng với API:`);
console.log(`  dotnet run --project NailManagement.API --launch-profile http`);
console.log(`  → http://localhost:5282\n`);
