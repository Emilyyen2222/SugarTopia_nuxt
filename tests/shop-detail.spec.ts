import { test, expect } from "@playwright/test";

// 對應 vanilla 版本 tests/shop-detail.spec.js。動態路由改成 /shop/:id，
// .shop-info h1 → 頁面唯一的 h1、.shop-description → h1 後面那段 <p>、
// .tags .tag → tag 的 <span>。
//
// 原本這裡用最初 7 家示意店家之一（matcha-mori-house，資料裡有精心寫的
// description、6 個標籤），使用者要求清掉示意資料、改用 admin 收錄工具
// 批次匯入的真實店家之後，那 7 家整批拿掉了。真實店家（Google Places
// 收錄）沒有 description、標籤通常只有 1-2 個（見 main.py 的
// add_curated_shop()／批次匯入腳本），斷言跟著改成符合真實資料的形狀，
// 不是硬湊出跟以前一樣的假設。
test.describe("店家詳情頁 /shop/:id", () => {
  test("帶真實 id 會顯示對應店家的真實資料，不是寫死的假店家", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));

    await page.goto("/shop/ottimo-gelato-3qiw_m");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("OttiMo Gelato");
    await expect(page.getByText("Ice Creams", { exact: true })).toBeVisible();

    // 評論筆數會隨其他測試檔案（reviews.spec.ts）寫入的資料變動，這裡不鎖死
    // 筆數，只確認評論區塊是「真的評論」或「沒有評論的空狀態」。
    const reviewHeading = page.getByRole("heading", { name: "No reviews yet" });
    const hasEmptyState = await reviewHeading.isVisible().catch(() => false);
    if (!hasEmptyState) {
      await expect(page.getByText("Loading reviews...")).toHaveCount(0);
    }

    expect(errors.some((e) => e.includes("Swiper"))).toBe(false);
  });

  test("查無此店的 id 會顯示『Shop not found』，不是空白頁或殘留假資料", async ({ page }) => {
    await page.goto("/shop/this-shop-does-not-exist");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Shop not found");
  });
});
