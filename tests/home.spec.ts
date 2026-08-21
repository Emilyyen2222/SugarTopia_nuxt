import { test, expect } from "@playwright/test";

// 對應 vanilla 版本 tests/home.spec.js。index.html → /、大部分 class name
// 都刻意保留（見 index.vue／HeaderNav.vue／CategoriesDropdown.vue 裡新增
// 的 class，純粹為了讓這些測試斷言能對照 vanilla 版本、不用另外接
// data-testid），只有少數幾個 vanilla 版本用 id 的地方（#chatMessages 等）
// 也對應加了同名 id。
test.describe("首頁 /", () => {
  test("AI 問答區塊有正常顯示", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ai-chat-heading h2")).toHaveText("Ask for a dessert recommendation");
    await expect(page.locator("#chatInput")).toBeVisible();
  });

  test("手機版 hero：圖片滿版貼齊螢幕邊緣、文字區塊左邊界對齊、對話框不會超出螢幕", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto("/");
    // Swiper 包在 <ClientOnly> 裡，要等瀏覽器端真的把它掛載出來才量得到，
    // 不能只靠固定的 waitForTimeout。
    await page.locator(".dessert-swiper").waitFor();

    const rects = await page.evaluate(() => {
      const rectOf = (sel: string) => document.querySelector(sel)?.getBoundingClientRect();
      return {
        swiper: rectOf(".dessert-swiper"),
        overlayText: rectOf(".overlay-text"),
        aiChatHeading: rectOf(".ai-chat-heading"),
        chatMessages: rectOf(".chat-messages"),
      };
    });

    expect(rects.swiper!.left).toBe(0);
    expect(rects.swiper!.right).toBe(375);
    expect(rects.overlayText!.left).toBeCloseTo(rects.aiChatHeading!.left, 0);
    expect(rects.chatMessages!.right).toBeLessThanOrEqual(375);
  });

  test("手機版（≤1024px）AI 問答不會被隱藏，會排在圖片下面、Latest Reviews 上面", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 850 });
    await page.goto("/");
    await page.waitForTimeout(200);

    await expect(page.locator("#chatForm")).toBeVisible();

    const swiperTop = await page.locator(".dessert-swiper").evaluate((el) => el.getBoundingClientRect().top);
    const leftSideTop = await page.locator(".left-side").evaluate((el) => el.getBoundingClientRect().top);
    expect(swiperTop).toBeLessThan(leftSideTop);
  });

  test("手機版 header 不會被卡在正中間的 logo 蓋住，write a review／cupertino.keki 收進漢堡選單", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/");
    await page.waitForTimeout(200);

    const headerLeftRight = await page.locator(".header-left").evaluate((el) => el.getBoundingClientRect().right);
    const logoLeft = await page.locator(".logo-container").evaluate((el) => el.getBoundingClientRect().left);
    expect(headerLeftRight).toBeLessThanOrEqual(logoLeft);

    await expect(page.locator(".actions-write-review")).toBeHidden();
    await page.click("#mobile-menu");
    await expect(page.locator(".nav-menu-mobile-links")).toContainText("write a review");
    await expect(page.locator(".nav-menu-mobile-links")).toContainText("cupertino.keki");
  });

  test("hero 右半邊的圖片輪播四周留白要固定、對稱，不會隨螢幕寬度跑掉", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(200);

    const rects = await page.evaluate(() => {
      const rectOf = (sel: string) => document.querySelector(sel)?.getBoundingClientRect();
      return {
        splitSection: rectOf(".split-section"),
        leftSide: rectOf(".left-side"),
        swiper: rectOf(".dessert-swiper"),
      };
    });

    const gapLeft = rects.swiper!.left - rects.leftSide!.right;
    const gapRight = rects.splitSection!.right - rects.swiper!.right;

    expect(gapLeft).toBeCloseTo(40, 0);
    expect(gapRight).toBeCloseTo(40, 0);
  });

  test("AI 問答對話變長時，最上面的 slogan 不會被固定在頂端的 header 蓋住", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(() => {
      const chatMessages = document.querySelector("#chatMessages")!;
      const messages: [string, string][] = [
        ["user", "I want matcha dessert recommendations please"],
        ["assistant", "Sure! Based on SugarTopia notes, Matcha Mori House in Songshan has a great matcha mille crepe and hojicha pudding, with quiet seating and outlets for working."],
        ["user", "What about something with less sugar?"],
        ["assistant", "For a lighter option, try the hojicha pudding at Matcha Mori House - it has a smooth texture and is not too sweet."],
      ];
      messages.forEach(([role, text]) => {
        const el = document.createElement("div");
        el.className = `chat-message ${role}`;
        el.textContent = text;
        chatMessages.appendChild(el);
      });
    });

    const headerBottom = await page.locator(".header").evaluate((el) => el.getBoundingClientRect().bottom);
    const slogonTop = await page.locator(".overlay-text").evaluate((el) => el.getBoundingClientRect().top);

    expect(slogonTop).toBeGreaterThanOrEqual(headerBottom);
  });

  test("Latest Reviews 區塊改吃真實評論資料，不再是寫死的 8 張假卡片，也沒有連去空頁面的 View All 連結", async ({ page }) => {
    await page.goto("/");

    const cardCount = await page.locator(".review-grid .review-card").count();

    if (cardCount > 0) {
      const shopNames = await page.locator(".review-grid .review-card h2").allTextContents();
      expect(shopNames.every((name) => name.trim().length > 0)).toBe(true);
    } else {
      await expect(page.getByRole("heading", { name: "No reviews yet" })).toBeVisible();
    }

    // 這個 Vue 版本的 review-header 本來就沒有做 View All 連結（vanilla
    // 版本的 .review-view-all 對應到一個空的 review.html，這裡從一開始就
    // 沒有遷移這個連結），鎖住不要有人不小心加回來。
    await expect(page.locator(".review-header .review-view-all")).toHaveCount(0);
  });

  test("Categories 8 個磚都帶有真實的 ?q= 查詢參數，不是全部連到同一個空白分類頁", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator(".category-grid .category-card").evaluateAll((els) => els.map((el) => el.getAttribute("href")));

    expect(hrefs).toHaveLength(8);
    for (const href of hrefs) {
      expect(href).toMatch(/^\/category\?q=.+/);
    }
    expect(new Set(hrefs).size).toBe(8);
  });

  test("header 的 Categories 下拉選單：預設收起、點了才展開、點外面會收回去", async ({ page }) => {
    await page.goto("/");

    const menu = page.locator(".nav-menu .nav-categories").first();
    const panel = menu.locator(".nav-categories-panel");

    await expect(panel).toBeHidden();

    await menu.locator(".nav-categories-toggle").click();
    await expect(panel).toBeVisible();

    const hrefs = await panel.locator("a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    expect(hrefs).toContain("/category?q=Cinnamon%20Rolls");
    expect(hrefs).toContain("/category?q=Dogs%20Friendly");
    expect(hrefs).toHaveLength(8);

    // 點選單外面應該要收起來，換一個確定在面板範圍外的目標。
    await page.locator(".dessert-swiper img").first().click();
    await expect(panel).toBeHidden();
  });
});
