import { test, expect, type Page } from "@playwright/test";

// 對應 vanilla 版本 tests/auth.spec.js。選擇器改成這個專案實際的 DOM：
// header 的使用者名稱／登入表單在 vanilla 版本有 .auth-user／
// [data-auth-form='login'] 這種特地為了測試加的 hook，這裡的 Vue 元件
// 沒有對應的 class（純用 Tailwind utility class），改用文字/角色定位
// （getByText、getByRole），這是 Playwright 官方建議的做法，也比對著
// class name 找更不容易因為改樣式而測試跟著壞掉。

function uniqueEmail() {
  return `playwright-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function signUp(page: Page, { name = "Playwright Tester", password = "testpassword123" } = {}) {
  const email = uniqueEmail();
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.fill("#confirm-password", password);
  await page.check('input[type="checkbox"]');
  await page.click('button[type="submit"]');
  await page.waitForURL("**/");
  return { email, name };
}

test.describe("會員登入/註冊", () => {
  // 跟 vanilla 版本一樣：這幾支測試會真的打 POST /api/auth/signup 寫進
  // SQLite，序列跑避免撞到 SQLite 的寫入鎖。
  test.describe.configure({ mode: "serial" });

  test("註冊會建立帳號、自動登入，header 會顯示使用者名稱", async ({ page }) => {
    const { name } = await signUp(page);
    await expect(page.getByText(`Hi, ${name}`)).toBeVisible();
  });

  test("已登入的使用者打開 /login 會被導回首頁，看不到登入表單", async ({ page }) => {
    await signUp(page);
    await page.goto("/login");
    await page.waitForURL("**/");
    await expect(page.getByRole("heading", { name: "Welcome Back!" })).toHaveCount(0);
  });

  test("已登入的使用者打開 /signup 也會被導回首頁", async ({ page }) => {
    await signUp(page);
    await page.goto("/signup");
  await page.waitForLoadState("networkidle");
    await page.waitForURL("**/");
  });

  test("沒登入的訪客打開 /login 會正常看到表單，不會被誤導開", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome Back!" })).toBeVisible();
    expect(page.url()).toContain("/login");
  });
});
