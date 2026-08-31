import { test, expect } from "@playwright/test";

// 對應 vanilla 版本 tests/category.spec.js。網址/選擇器改成這個專案的：
// category.html?q= → /category?q=、shop_detail.html?id= → /shop/、
// .map-link → aria-label="View {name}" 的連結、.filters .category-button
// → aside 裡的分類按鈕。座標數字（25.05,121.5578 這幾組）直接對應後端
// main.py 的 TAIPEI_DISTRICT_COORDINATES，兩個前端共用同一個後端，數字
// 不會因為前端專案不同而變。
test.describe("分類頁 /category", () => {
  test("搜尋 matcha 可以找到後端真實的抹茶店家", async ({ page }) => {
    await page.goto("/category?q=matcha");
    await expect(page.getByText("1 shop found")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 }).first()).toContainText("Matcha Mori House");
  });

  test("查無資料的分類要顯示友善的『沒有符合的店家』，不能顯示成『後端掛了』", async ({ page }) => {
    // 這是刻意測試「後端有回應、但結果剛好是 0 筆」跟「後端真的連不上」
    // 要顯示不同訊息這件事。Macaron 原本是沒有真實店家的空分類，後來
    // 用 admin 收錄工具補了真實資料，改用「Hot and New」——目前還沒有
    // 任何真實店家標過這個 feature 標籤（見 PROJECT_ROADMAP.md），是
    // 現在真正查得到 0 筆的分類。
    await page.goto("/category?q=Hot%20and%20New");
    await expect(page.getByRole("heading", { name: "No matching dessert shops yet" })).toBeVisible();
    await expect(page.getByText("no shops found")).toBeVisible();
  });

  test("店家卡片的連結會帶上真實的 shop id，可以點進對應詳情頁", async ({ page }) => {
    await page.goto("/category?q=matcha");
    const href = await page.locator('a[aria-label^="View"]').first().getAttribute("href");
    expect(href).toBe("/shop/matcha-mori-house");
  });

  test("右下角的地圖會跟著搜尋結果動態更新，不再是寫死的固定位置", async ({ page }) => {
    // 原本這裡用 q=cake 一次抓兩家店測「地圖跟著換」，但 cake 這種很泛用
    // 的關鍵字，之後從 admin 收錄工具收錄越多真實店家，符合的家數只會
    // 越來越多，斷言「剛好 2 家」很容易因為收錄新店家就跟著壞掉。改成
    // 分別用兩家「店名精準比對、幾乎不會跟未來收錄的新店家撞名」的店，
        // 各自驗證地圖座標會換成該店所在行政區，一樣能證明地圖是動態的、
    // 不是每家店都共用同一組寫死座標。
    // matcha-mori-house 在松山區，渲染完結果後地圖應該自動對準它。
    await page.goto("/category?q=matcha");
    await expect(page.locator("#shopMapEmbed")).toHaveAttribute("src", /25\.05,121\.5578/);

    // Cupertino.keki 在大安區。
    await page.goto("/category?q=Cupertino.keki");
    await expect(page.locator("#shopMapEmbed")).toHaveAttribute("src", /25\.0263,121\.5432/);

    // Paw & Pastry Cafe 在內湖區，證明不同店家對應到不同座標。
    await page.goto("/category?q=Paw%20%26%20Pastry%20Cafe");
    await expect(page.locator("#shopMapEmbed")).toHaveAttribute("src", /25\.0693,121\.5885/);
  });

  test("側欄的分類篩選按鈕會換成只看那個分類，不會疊加在目前網址的搜尋條件上", async ({ page }) => {
    // 之前的寫法是「疊加」：網址已經是 ?q=Bagels 時，再點側欄的另一個
    // 分類篩選按鈕，邏輯會變成同時要符合 Bagels 又符合另一個分類，通常
    // 兜不出結果。這裡直接看網址的 q 是否真的被「換掉」而不是疊加上去，
    // 不斷言確切幾家店符合（隨著之後用 admin 收錄工具收錄越多真實店家，
    // 確切家數本來就會一直變，斷言確切數字容易無緣無故壞掉）。
    // Cafes 已經搬去「特色」勾選框了（見 category.vue 的 featureOptions），
    // 這裡改用還留在「分類」單選按鈕裡的 Cheesecakes。
    await page.goto("/category?q=Bagels");
    await expect(page).toHaveURL(/\?q=Bagels$/);

    await page.locator("aside").getByRole("button", { name: "Cheesecakes" }).click();
    await page.waitForURL("**/category?q=Cheesecakes");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Cheesecakes");
  });

  // 對應 vanilla 版本「沒有照片的店家會顯示佔位圖，不是破圖」那支測試。
  // vanilla 版本直接呼叫 window.buildShopCardHtml() 餵一筆 image 是空字串
  // 的假資料——這個技巧是因為 vanilla 版本把產生卡片 HTML 的函式掛在
  // window 上，測試可以直接呼叫。這個 Vue 版本的 ShopCard.vue 是元件，
  // 沒有對應的全域函式可以這樣呼叫，而且目前 sugartopia_test.db 裡的 7
  // 筆樣本資料剛好每一筆都有圖片，沒有天然的「無圖片店家」可以測。改成
  // 退一步的迴歸防呆：確認畫面上目前所有店家卡片的 <img> 都沒有
  // src=""（vanilla 版本原本的 bug 就是空字串 src 會被瀏覽器當成「載入
  // 目前這個網頁本身」，這裡至少守住這個底線）。
  test("店家卡片的圖片永遠不會是空字串 src（避免瀏覽器把空 src 當成重新載入本頁）", async ({ page }) => {
    await page.goto("/category");
    await expect(page.getByTestId("shop-card").first()).toBeVisible();

    const srcs = await page.getByTestId("shop-card").locator("img").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src")));
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) {
      expect(src).not.toBe("");
      expect(src).not.toBeNull();
    }
  });
});
