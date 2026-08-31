// Playwright 設定檔，對應 vanilla 版本（SugarTopia/playwright.config.js）
// 同一套理由，細節請參考那邊的註解；這裡只列跟這個專案不一樣的地方。
//
// baseURL 是 4000，不是 3000：`npm run dev` 這個專案的 dev script 本來就
// 寫死 `nuxt dev --port 4000`（本機開發用的 port，3000 跟開發者另一個
// 工作專案衝突），這裡原本寫 3000，跟實際跑起來的 port 對不上，是造成
// 這份測試檔案完全跑不動的其中一個原因。webServer 的 timeout 拉長到
// 60 秒：Nuxt dev server 第一次啟動要編譯，比 python3 -m http.server
// 慢上不少，vanilla 版本的 30 秒不夠用。
//
// fullyParallel 關掉、workers 設成 1：後端從 SQLite 遷移到 Supabase
// PostgreSQL 之後這個理由本身變了（Postgres 本來就能處理併發寫入，
// 不會像 SQLite 那樣整個資料庫被單一寫入鎖住），但 auth/favorites/
// reviews 這幾支測試會真的建立帳號、寫真實資料，平行跑多個 worker
// 之間互相干擾、測試斷言互相踩到的風險還是在，序列執行比較好除錯，
// 先維持這個設定不變。
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  globalSetup: fileURLToPath(new URL("./tests/global-setup.ts", import.meta.url)),
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],

  use: {
    baseURL: "http://127.0.0.1:4000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  webServer: {
    // --host 127.0.0.1：Nuxt dev server 預設有時只先綁 IPv6（[::1]），
    // Playwright 用 127.0.0.1 去戳會連不上、誤判成「還沒準備好」，實測
    // 踩過這個雷（見 README 踩過的雷）。明確指定 IPv4 位址，兩邊才會
    // 講同一種語言。
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:4000/",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
