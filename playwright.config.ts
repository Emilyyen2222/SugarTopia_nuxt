// Playwright 設定檔，對應 vanilla 版本（SugarTopia/playwright.config.js）
// 同一套理由，細節請參考那邊的註解；這裡只列跟這個專案不一樣的地方。
//
// baseURL 換成 Nuxt dev server 的 3000（vanilla 版本是純靜態 http-server
// 的 5501）。webServer 的 timeout 拉長到 60 秒：Nuxt dev server 第一次啟動
// 要編譯，比 python3 -m http.server 慢上不少，vanilla 版本的 30 秒不夠用。
//
// fullyParallel 關掉、workers 設成 1，理由跟 vanilla 版本一樣：後端目前用
// SQLite，同一時間只能有一個寫入者，signup/收藏/寫評論這幾支測試都會真的
// 寫進資料庫，平行跑容易撞到 SQLite 的寫入鎖。
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
    baseURL: "http://127.0.0.1:3000",
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
    url: "http://127.0.0.1:3000/",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
