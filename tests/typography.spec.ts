import { test, expect, type Page } from "@playwright/test";

// 對應 vanilla 版本 tests/typography.spec.js。vanilla 版本踩過的那個雷
// （style.css/category.css/shop_detail.css 各自的 `html { font-size:
// clamp(...) }` 讓 rem 單位隨視窗寬度跑掉）在這個 Tailwind 專案裡從一
// 開始就不存在（Tailwind 的 base reset 用瀏覽器標準 16px，沒有自訂過
// html 的 font-size），但這裡還是照樣保留這個迴歸測試：便宜、也能防止
// 之後有人不小心在某個元件裡加了類似的 clamp() 寫法。
async function getRootFontSize(page: Page) {
  return page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
}

const pagesToCheck = [
  { path: "/", label: "首頁" },
  { path: "/category", label: "分類頁" },
  { path: "/shop/ottimo-gelato-3qiw_m", label: "店家詳情頁" },
];

test.describe("字體大小不會隨視窗寬度跑掉", () => {
  for (const { path, label } of pagesToCheck) {
    test(`${label}：1rem 在窄視窗跟寬視窗都固定是 16px`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      expect(await getRootFontSize(page)).toBe("16px");

      await page.setViewportSize({ width: 2560, height: 1200 });
      await page.reload();
      expect(await getRootFontSize(page)).toBe("16px");
    });
  }
});
