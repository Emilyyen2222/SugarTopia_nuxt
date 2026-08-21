import { test, expect } from "@playwright/test";

// 對應 vanilla 版本 tests/shop-detail.spec.js。動態路由改成 /shop/:id，
// .shop-info h1 → 頁面唯一的 h1、.shop-description → h1 後面那段 <p>、
// .tags .tag → tag 的 <span>。
test.describe("店家詳情頁 /shop/:id", () => {
  test("帶真實 id 會顯示對應店家的真實資料，不是寫死的假店家", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));

    await page.goto("/shop/matcha-mori-house");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Matcha Mori House");
    await expect(page.getByText("matcha mille crepe")).toBeVisible();

    const tagTexts = await page
      .locator("span")
      .filter({ hasText: /^(Matcha|Pudding|Hojicha|Quiet|Work Friendly|Limited Time)$/ })
      .allTextContents();
    expect(tagTexts).toEqual(["Matcha", "Pudding", "Hojicha", "Quiet", "Work Friendly", "Limited Time"]);

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
