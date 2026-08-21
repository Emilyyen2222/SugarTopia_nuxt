import { test, expect, type Page } from "@playwright/test";

// 對應 vanilla 版本 tests/favorites.spec.js。.action-btn.save →
// getByRole('button', {name: 'Save'|'Saved'})（文字本身就會隨收藏狀態
// 切換，不需要另外對 class 斷言）；.auth-favorites → header 窄螢幕版的
// 帳號 icon（aria-label="My Favorites"，見 HeaderNav.vue）。
function uniqueEmail() {
  return `playwright-fav-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function signUp(page: Page) {
  const email = uniqueEmail();
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await page.fill("#name", "Favorites Tester");
  await page.fill("#email", email);
  await page.fill("#password", "testpassword123");
  await page.fill("#confirm-password", "testpassword123");
  await page.check('input[type="checkbox"]');
  await page.click('button[type="submit"]');
  await page.waitForURL("**/");
}

// 跟 vanilla 版本一樣：收藏也是一種寫入，序列跑避免撞到 SQLite 的寫入鎖。
test.describe.configure({ mode: "serial" });

test.describe("收藏功能", () => {
  test("沒登入的訪客點 Save 會被導去登入頁，不會直接收藏成功", async ({ page }) => {
    await page.goto("/shop/matcha-mori-house");
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL("**/login");
  });

  test("登入後點 Save 可以收藏、再點一次可以取消收藏", async ({ page }) => {
    await signUp(page);
    await page.goto("/shop/matcha-mori-house");

    const saveButton = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveButton).toBeVisible();

    await saveButton.click();
    await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();

    await page.getByRole("button", { name: "Saved" }).click();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  });

  test("收藏過的店家會出現在「我的收藏」頁面，重新整理詳情頁也記得收藏狀態", async ({ page }) => {
    await signUp(page);
    await page.goto("/shop/matcha-mori-house");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();

    // 重新整理詳情頁，確認收藏狀態是從後端讀回來的，不是只存在當下這次點擊的記憶體裡。
    await page.reload();
    await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();

    await page.goto("/favorites");
    await expect(page.getByRole("heading", { name: "My Favorites" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 }).first()).toContainText("Matcha Mori House");
  });

  test("沒有任何收藏時，我的收藏頁面顯示友善的空狀態", async ({ page }) => {
    await signUp(page);
    await page.goto("/favorites");
    await expect(page.getByRole("heading", { name: "No favorites yet" })).toBeVisible();
  });

  test("沒登入的訪客打開我的收藏頁面，會看到請先登入的提示，不是空白或報錯", async ({ page }) => {
    await page.goto("/favorites");
    await expect(page.getByRole("heading", { name: "Please log in first" })).toBeVisible();
  });

  test("已登入的人在窄螢幕 header 會出現帳號連結，可以點過去我的收藏", async ({ page }) => {
    await signUp(page);
    // 這顆連結只在 ≤1024px（nav-md）才會顯示，見 HeaderNav.vue。
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto("/");
    await page.getByRole("link", { name: "My Favorites" }).click();
    await page.waitForURL("**/favorites");
  });
});
