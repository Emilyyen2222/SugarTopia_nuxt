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
    // Macaron 目前的樣本資料裡沒有任何店家，這是刻意測試「後端有回應、
    // 但結果剛好是 0 筆」跟「後端真的連不上」要顯示不同訊息這件事。
    await page.goto("/category?q=Macaron");
    await expect(page.getByRole("heading", { name: "No matching dessert shops yet" })).toBeVisible();
    await expect(page.getByText("0 shops found")).toBeVisible();
  });

  test("店家卡片的連結會帶上真實的 shop id，可以點進對應詳情頁", async ({ page }) => {
    await page.goto("/category?q=matcha");
    const href = await page.locator('a[aria-label^="View"]').first().getAttribute("href");
    expect(href).toBe("/shop/matcha-mori-house");
  });

  test("右下角的地圖會跟著搜尋結果動態更新，不再是寫死的固定位置", async ({ page }) => {
    // matcha-mori-house 在松山區，渲染完結果後地圖應該自動對準它。
    await page.goto("/category?q=matcha");
    await expect(page.locator("#shopMapEmbed")).toHaveAttribute("src", /25\.05,121\.5578/);

    // q=cake 會同時找到大安區跟內湖區兩家店，先確認自動對準第一筆（大安區），
    // 再點第二家的「View on map」，確認地圖真的換成內湖區的座標，證明每張
    // 卡片各自帶著自己的座標，不是全部共用同一組。
    await page.goto("/category?q=cake");
    await expect(page.getByTestId("shop-card")).toHaveCount(2);
    await expect(page.locator("#shopMapEmbed")).toHaveAttribute("src", /25\.0263,121\.5432/);

    // 第一筆已經被 focusFirstShopOnMap() 自動選取（按鈕文字是「Showing on
    // map」），只有第二筆的按鈕文字還是「View on map」，用文字篩選剛好只會
    // 選到第二筆，不用再用 index。
    await page.getByRole("button", { name: /View on map/ }).click();
    await expect(page.locator("#shopMapEmbed")).toHaveAttribute("src", /25\.0693,121\.5885/);
  });

  test("側欄的分類篩選按鈕會換成只看那個分類，不會疊加在目前網址的搜尋條件上", async ({ page }) => {
    // 之前的寫法是「疊加」：網址已經是 ?q=Bagels 時，再點側欄的 Cafes
    // 篩選按鈕，邏輯會變成同時要符合 Bagels 又符合 Cafes，通常兜不出結果。
    await page.goto("/category?q=Bagels");
    await expect(page.getByText("1 shop found")).toBeVisible();

    await page.locator("aside").getByRole("button", { name: "Cafes" }).click();
    await page.waitForURL("**/category?q=Cafes");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Cafes");
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
