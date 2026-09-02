import { test, expect, type Page } from "@playwright/test";

// 對應 vanilla 版本 tests/reviews.spec.js。write_review.html?id= →
// /write-review?id=、.locked-shop-name → data-testid="locked-shop-name"、
// label[for=starN] → button[aria-label="N stars"]（星等元件在 Vue 版本
// 改成 JS 算填色而不是 CSS 選擇器技巧，見 write-review.vue 開頭的註解）、
// .review-list .review-item → data-testid="review-item"。
//
// 原本這裡用的兩家店（caramel-pudding-lab 測空狀態、matcha-mori-house
// 測實際寫評論流程）都是最初 7 家示意店家，使用者要求清掉示意資料、
// 改用 admin 收錄工具批次匯入的真實店家之後，那 7 家整批拿掉了。改用
// 兩家確定目前沒有評論的真實店家，一樣分成「空狀態測試用」跟「寫評論
// 流程測試用」兩家不同的店——如果共用同一家，第二次重跑整個測試套件時
// 那家店已經被寫過評論了，「空狀態」的斷言就會失敗。
const EMPTY_SHOP_ID = "ottimo-gelato-3qiw_m";
const WRITE_SHOP_ID = "cheese-duke-iiaqb4";
const WRITE_SHOP_NAME = "Cheese Duke";
function uniqueEmail() {
  return `playwright-review-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function signUp(page: Page, name = "Review Writer") {
  const email = uniqueEmail();
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", "testpassword123");
  await page.fill("#confirm-password", "testpassword123");
  await page.check('input[type="checkbox"]');
  await page.click('button[type="submit"]');
  await page.waitForURL("**/");
}

// 跟 vanilla 版本一樣：會真的寫評論進資料庫，序列執行。
test.describe.configure({ mode: "serial" });

const BACKEND_URL = process.env.SUGARTOPIA_API_URL || "http://127.0.0.1:8000";

// 這個檔案裡「登入後寫評論會成功送出」那支測試會真的寫一筆評論進資料庫，
// 而且後面「首頁 Latest Reviews」那支測試還要靠它留著才能驗證，所以不能
// 在寫完當下就刪掉。改成整個檔案的測試都跑完後，用 afterAll 統一清掉——
// 之前這裡沒有清乾淨，同一份評論內容跑幾次測試套件就會在正式資料庫裡
// 越堆越多，使用者自己在網站上都看得到「真心推薦者」重複出現好幾次。
// 現在有 DELETE /api/reviews/{id} 了，直接拿建立當下的 review id + token
// 呼叫後端刪掉，不用再手動上資料庫清。
let cleanupReviewId: number | null = null;
let cleanupToken: string | null = null;

test.afterAll(async ({ request }) => {
  if (cleanupReviewId == null || !cleanupToken) return;
  await request.delete(`${BACKEND_URL}/api/reviews/${cleanupReviewId}`, {
    headers: { Authorization: `Bearer ${cleanupToken}` },
  });
});

test.describe("評論功能", () => {
  test("店家詳情頁還沒有評論時，顯示友善的空狀態而不是假評論", async ({ page }) => {
    await page.goto(`/shop/${EMPTY_SHOP_ID}`);
    await expect(page.getByRole("heading", { name: "No reviews yet" })).toBeVisible();
  });

  test("從店家詳情頁點 Write a review 會帶著這間店的 id 過去，店名鎖定不能改", async ({ page }) => {
    await signUp(page);
    await page.goto(`/shop/${WRITE_SHOP_ID}`);
    await page.getByRole("link", { name: /Write a review/ }).click();
    await page.waitForURL(`**/write-review?id=${WRITE_SHOP_ID}`);
    await expect(page.getByTestId("locked-shop-name")).toHaveText(WRITE_SHOP_NAME);
  });

  test("沒登入的人填完表單送出，會被導去登入頁，不會真的送出評論", async ({ page }) => {
    await page.goto(`/write-review?id=${WRITE_SHOP_ID}`);
    await page.waitForLoadState("networkidle");
    await page.fill("#review-text", "隨便寫一段測試用的評論內容");
    await page.getByRole("button", { name: "5 stars" }).click();
    await page.click('button[type="submit"]');
    await page.waitForURL("**/login");
  });

  test("登入後寫評論會成功送出，導回店家詳情頁並看到剛剛寫的內容", async ({ page }) => {
    await signUp(page, "真心推薦者");
    await page.goto(`/write-review?id=${WRITE_SHOP_ID}`);
    await page.waitForLoadState("networkidle");
    await page.fill("#review-text", "座位很舒服，抹茶千層真的好吃！");
    await page.getByRole("button", { name: "5 stars" }).click();

    // 送出評論的回應會帶回真正的 review id，記下來給檔案最後的 afterAll
    // 清掉用；順便從 localStorage 記下這個帳號的登入 token（DELETE 需要
    // 帶 Authorization），不用另外再登入一次。
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/reviews") && res.request().method() === "POST"),
      page.click('button[type="submit"]'),
    ]);
    const created = await response.json();
    cleanupReviewId = created.id;
    cleanupToken = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("sugartopia_auth") || "{}").token ?? null;
      } catch {
        return null;
      }
    });

    await page.waitForURL(`**/shop/${WRITE_SHOP_ID}`);

    const firstReview = page.getByTestId("review-item").first();
    await expect(firstReview.getByText("座位很舒服，抹茶千層真的好吃！")).toBeVisible();
    await expect(firstReview.locator("h4")).toHaveText("真心推薦者");
  });

  test("剛剛寫的評論會出現在首頁 Latest Reviews（不再是寫死的假資料）", async ({ page }) => {
    await page.goto("/");
    // 頁面上第一個 h2 其實是 hero 裡 AI 問答的標題「Ask for a dessert
    // recommendation」（DOM 順序在 Latest Reviews 前面），要把範圍限定在
    // .review-grid 裡才不會選錯。
    await expect(page.locator(".review-grid .review-card h2").first()).toHaveText(WRITE_SHOP_NAME);
    await expect(page.locator(".review-grid").getByText("座位很舒服，抹茶千層真的好吃！").first()).toBeVisible();
  });

  test("沒有帶 id 直接打開 /write-review，會看到真實店家清單的下拉選單", async ({ page }) => {
    await page.goto("/write-review");
    // 店家清單是 fetchShops() 打完 API 才會填進 <select>，goto() 只等頁面
    // 初次載入完成，不會等這個非同步請求跑完，要另外等選項真的出現。
    // <option> 元素在 Playwright 的可見性判斷裡永遠不算「visible」（原生
    // 下拉選單彈出的內容不是一般排版），不能用 locator.waitFor() 等它
    // 出現，改成等數量真的大於 1（「不等於 1」這個條件在 0 筆的當下也會
    // 誤判成通過，第一次寫的時候就踩到這個坑，改成明確等 > 1）。
    await expect.poll(() => page.locator("#dessert-shop-id option").count()).toBeGreaterThan(1);
    const options = await page.locator("#dessert-shop-id option").allTextContents();
    expect(options).toContain(WRITE_SHOP_NAME);
    expect(options.length).toBeGreaterThan(1);
  });

  test("帶不存在的店家 id 打開 /write-review，會顯示找不到店家，送出按鈕被停用", async ({ page }) => {
    await page.goto("/write-review?id=does-not-exist");
    await expect(page.getByText("Could not find this shop")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });
});
