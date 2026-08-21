# SugarTopia（Nuxt 3 重構版）

這是 SugarTopia 從 vanilla HTML/CSS/JS 遷移到 Nuxt 3 的專案，跟原本的 vanilla 前端（`../SugarTopia`）是完全獨立的兩個專案，遷移完成前 vanilla 版本會繼續照常上線、不會被動到。後端（`../SugarTopia_backend`，FastAPI）維持不變，兩個前端共用同一套 API。

## 為什麼要遷移

vanilla 版本累積到現在，已經明顯感受到「同一段 HTML 要手動複製貼到多個頁面」的技術債：`category.html` 的 header 一直沒跟上其他頁面統一過的版本、共用邏輯（搜尋欄、Categories 選單、登入狀態顯示）散落在好幾支 JS 檔案裡各自維護一份。Nuxt + 元件化可以讓這些東西「寫一次、到處用」，也能用 scoped style 避免 CSS cascade 互相覆蓋的問題（vanilla 版本踩過 `category.css` 悄悄蓋掉 `style.css` 同名 class 的雷）。

之前用 Vuetify 做過一次嘗試（見 `../SugarTopia2.0`，已停用），畫面跟原版對不太起來，推測是 Vuetify 自己的 Material Design 風格跟這個專案手刻的客製化設計衝突。這次改用 Tailwind，顏色／字體直接從 vanilla 版本的 CSS 檔案搬過來（見 `tailwind.config.ts` 裡的註解），目標是遷移後畫面要跟原版一致，不是重新設計。

## 技術選擇

- **Nuxt 3**（實際版本 4.5.2）
- **Tailwind CSS**（`@nuxtjs/tailwindcss` 模組），顏色／字體用自訂 tokens（`brand-orange`、`brand-brown`…），對應 vanilla 版本實際用過的 hex 值
- 後端 API 網址走 `runtimeConfig.public.apiBaseUrl`，本機開發用 `.env` 的 `NUXT_PUBLIC_API_BASE_URL` 覆蓋成本機後端網址（`cp .env.example .env`），這是比 vanilla 版本「執行期判斷 `window.location.hostname`」更標準的做法（環境變數帶入設定值，12-Factor App 原則）
- 登入狀態沿用 vanilla 版本的 localStorage key（`sugartopia_auth`），`app/composables/useAuth.ts`

## 遷移範圍與順序

依照複雜度由淺入深，明確排除在這次遷移之外的：`admin_places.html`（Google Places 內部工具，繼續用現有的獨立靜態頁）、首頁的 Instagram 照片牆／電子報訂閱區塊（純展示、沒接後端）、`aboutus_*.html`（純靜態頁，優先度較低）。

- [x] **Phase 0** 專案建置、Tailwind + 品牌顏色／字體、`useApi`／`useAuth` composables
- [ ] **Phase 1** 依序遷移（進度見下方）：
  - [x] Login/Signup（`app/pages/login.vue`、`signup.vue`，含 `useSiteMessage` 訊息提示元件，已用 Playwright 實測畫面對照 vanilla、signup→login→已登入導回首頁→錯誤訊息全部跑過一輪）
  - [x] Header + Categories 選單元件（`app/components/HeaderNav.vue`、`CategoriesDropdown.vue`，已套進 `app/layouts/default.vue`，全站共用）。用 CSS Grid 三欄置中取代 vanilla 版本的 `position: fixed` logo，用 Playwright 在 375〜1440px 之間量測，確認任何寬度下 header-left 都不會撞到 logo、也沒有橫向 overflow；登入/未登入兩種狀態、漢堡選單開關、Categories 下拉互動都實測過。`@nuxt/icon` 模組在 SSR 一直載入失敗（裝了 `@iconify-json/mdi` 也一樣），改用 inline SVG 並移除該模組。**注意**：實測發現 vanilla 版本本身就有一個既有 bug——手機版透過漢堡選單點開 Categories 時，因為 `.nav-menu.active` 有 `overflow: hidden`，下拉的分類清單其實會被裁切、根本不會顯示出來；這裡是照原樣忠實遷移這個行為（沒有動 vanilla 檔案），之後如果要修可以再另外討論。
  - [x] category.html（`app/pages/category.vue`、`app/components/ShopCard.vue`、`app/composables/useShops.ts`）。q／location 交給後端 `GET /api/shops` 篩選，rating／features 在前端用 computed 再篩一次（跟 vanilla 版本的 filterState 邏輯一樣，不用重新打 API）；篩選結果變動時地圖自動 focus 到第一間有經緯度的店，點 View on map 可以手動切換、並反白對應卡片。跟 vanilla 版本比對時發現：(1) `buildShopCardHtml()` 實際產生的卡片內容跟 category.html 檔案裡寫死的靜態佔位內容其實不一樣（少了一顆完全沒接事件、屬於死碼的 Start order 按鈕），照真正會被使用者看到的動態版本遷移；(2) Tailwind 的任意值中斷點語法 `max-[880px]:hidden`（地圖在窄螢幕隱藏）在這個專案的建置環境下編譯不出來，原因不明，改用具名斷點（`tailwind.config.ts` 新增 `map-hide`）解決——這個問題後來在 shop_detail 頁又發生一次（見下一項），確認是這個專案的建置環境本身就不支援任意值斷點語法，不是單一頁面的偶發問題，之後每個頁面遇到「螢幕寬度收合」需求都直接用具名斷點，不再嘗試任意值語法。用 Playwright 對照 vanilla 版本畫面、測過篩選（rating／category／features 各自與組合情境）、View on map 手動選取、800px 寬度不換行不 overflow、header 搜尋列直接串到這頁的整個流程。**事後修正**：`ShopCard.vue` 的星等原本用橘色／16px（`text-brand-orange text-base`），後來做 shop_detail 頁才發現 vanilla 版本這裡其實也被同一條 `.rating span` 規則蓋成綠色／10px（跟下面 shop_detail 那條註記是同一個 cascade 巧合），回頭用 Playwright 量測 category.html 的真實 computed style 確認後修正——這次教訓：光看 CSS 原始碼判斷「這個 selector 應該長怎樣」不夠，凡是有 `<span>` 在 class 叫 `.rating` 的容器裡，都要實際量測，不能只看該元素自己的 class 對應規則。
  - [x] shop_detail.html（`app/pages/shop/[id].vue`、`app/composables/useFavorites.ts`、`useReviews.ts`）。動態路由 `/shop/:id`。跟 vanilla 版本比對時發現幾個重要落差：(1) shop_detail.html 檔案裡寫死的評論內容（評論者所在地、照片九宮格、Helpful/Thanks/Save/Share 按鈕列、統計數字）其實是死碼，真正串上後端資料後（`renderShopReviews()`）畫面會換成簡單很多的版本，只剩大頭貼、姓名、日期、星等、評論文字，照真正會被使用者看到的版本遷移；(2) `.action-buttons` 的 Save 按鈕才是真的接了收藏 API，其餘（Add photo／Share／See hours／分頁導航／Highest Rated／Most Recent）在 vanilla 版本裡全部是裝飾用、沒有真的功能，照樣遷移成裝飾用；(3) 用實際渲染結果（不是憑 CSS 原始碼推測）比對出好幾處 CSS cascade 巧合——`.rating span`／`.review-item p`／檔案尾端重複的 `.reviews-section h2` 這幾條 specificity 較高或位置較後面的規則，蓋掉了原本看起來「應該」套用的樣式（星星變綠色小字、評論內文變灰色小字、標題變更小），這些已經是 vanilla 版本實際會渲染出來的樣子，照實際結果遷移，不是照 CSS 原始碼字面意思猜測；(4) 發現並修正一個新 bug（vanilla 沒有這個問題）：後端存的圖片路徑是相對路徑（例如 `img/lp.jpg`），vanilla 版本每頁都在網站根目錄所以沒事，但 Nuxt 這邊巢狀路由（`/shop/matcha-mori-house`）會讓瀏覽器把路徑解析錯，圖片 404；加了 `resolveShopImage()` 共用函式統一補成絕對路徑解決，`ShopCard.vue` 也一併套用；(5) business-info（營業時間／官網／電話／地址）在 vanilla 版本裡本來就是寫死的假資料，不管點進哪間真實店家看到的都是同一組肉桂捲工作室資訊，照樣忠實遷移這個「有點怪」的既有行為，沒有偷偷幫它補真資料。已知既有問題（vanilla 版本本身就有、非這次遷移引入）：手機窄螢幕（≤430px 左右）`.tags` 分類標籤列沒有 `flex-wrap`，會讓卡片被撐寬造成輕微橫向 overflow，兩邊版本都有這個狀況，之後如果要修可以另外討論。
  - [x] favorites.html（`app/pages/favorites.vue`）。直接重用 `ShopCard.vue`，跟 vanilla 版本的 `renderFavoritesPage()` 一樣重用 `buildShopCardHtml()`，畫面才會跟分類頁的卡片一致。這頁沒有側欄篩選、也沒有地圖，卡片上如果店家有經緯度還是會顯示「View on map」按鈕（跟 vanilla 版本一樣，卡片產生器不知道目前是哪一頁），點了只會反白卡片、沒有地圖可以捲動過去，照樣忠實遷移這個「有點多餘」的既有行為。測過：未登入／loading／API 失敗／0 筆收藏／有收藏五種狀態，以及登入後直接整頁重新整理進 `/favorites`（測試 `initAuth()` 跟這頁 `onMounted` 之間有沒有競爭條件——實測沒有問題，資料正確等到登入狀態還原後才載入）。
  - [x] 首頁（`app/pages/index.vue`、`app/components/DessertSwiper.vue`、`ScrollToTopButton.vue`、`SiteFooter.vue`）。明確排除範圍內的 Instagram 照片牆／電子報訂閱區塊，其餘全部遷移。
    - **意外發現：全站共用的 `<footer>` 一直漏掉了。** 之前做 category／shop_detail／favorites 三頁時都沒注意到 vanilla 版本每一頁其實都有同一份 `<footer>`（連 login/signup 也有），做首頁才想到要建 `SiteFooter.vue`，順手放進 `app/layouts/default.vue`，等於回頭把前面三頁一起補上了，不用每頁重新加一次。
    - Swiper 改用官方 npm 套件（`swiper/vue`），對應 vanilla 版本手動 `new Swiper(...)` 的參數（spaceBetween／centeredSlides／autoplay／pagination／navigation）。用 `<ClientOnly>` 包起來，理由跟放棄 `@nuxt/icon` 一樣：與其冒 SSR 風險，不如直接排除在 SSR 之外。踩到兩個真的 bug：(1) 一開始把 `<DessertSwiper>` 包在一層 `w-1/2` 的 wrapper div 裡，結果 Swiper 自己 CSS 裡的 `width: calc(50% - 80px)` 是相對這層 wrapper 算的，變成只有整個 hero 寬度的 1/4，改成讓 Swiper 元件的根元素直接當 hero 區塊的 flex 子元素（比照 vanilla 版本 `.swiper` 直接是 `.split-section` 的子元素），問題才消失；(2) hero 區塊背景色（左米色右橘色）完全沒顯示——vanilla 版本的 `.split-section` 有明確寫 `z-index: 1`，這裡漏掉了，導致沒有建立新的 stacking context，兩層負 z-index 的背景 div 直接脫出跑到頁面更底層去，補上 `z-[1]` 後才正常。導覽箭頭顏色也跟 vanilla 版本用的舊版 swiper-bundle.css 預設值不同（偏藍，vanilla 是白），用 `--swiper-navigation-color`／`--swiper-pagination-color` 這兩個官方 CSS 變數明確指定成白色才一致。
    - `ScrollToTopButton.vue`：vanilla 版本這顆按鈕只出現在 category.html 跟 index.html（不是全站共用），所以沒放進共用 layout，兩個頁面各自引用；也發現按鈕預設其實是「顯示」的（vanilla 版本的 CSS 沒有預設 `display:none`，完全靠 `window.onscroll` 這個 JS 事件才會決定要不要藏起來，頁面剛載入、還沒觸發過 scroll 事件之前按鈕是可見的），一開始寫成預設隱藏，跟 vanilla 版本比對截圖才發現不一致，改成預設可見。
    - AI 問答（`gemini-chat.js` 對應邏輯直接寫在 `index.vue` 裡，因為這段 vanilla 版本本來就只有首頁在用）：發現 `gemini-chat.js` 是全部 JS 檔案裡唯一一個沒有做本機/正式環境切換、直接寫死 Cloud Run 網址的地方（其餘檔案都有），判斷是遺漏不是刻意設計，改用跟其他頁面一致的 `useApi()`，本機開發也能測到本機後端的 AI 回覆。已用 Playwright 實測真的問一句話、等真實 Gemini 回覆、確認訊息正確顯示在對話框裡。
    - Latest Reviews／Categories 兩個 grid 一樣被 `.rating span` 那條全站規則影響（星等變綠色小字），照實際渲染結果遷移，跟 shop 卡片、shop_detail 頁的做法一致。
    - 用 Playwright 對照 vanilla 版本桌機／400px 手機寬度畫面（AI 問答/輪播上下堆疊、swiper 因為 order 排到最上面）、實測 AI 問答真的送出訊息拿到真實回覆、Latest Reviews／Categories 兩個區塊資料正確渲染，全程零 console 錯誤。
  - [ ] write_review.html
- [ ] **Phase 2** Playwright 測試遷移（選擇器改指向新 DOM）、全站回歸測試、正式上線切換

## 踩過的雷

- **CORS**：後端（`SugarTopia_backend/main.py`）原本的 `allow_origins` 清單只列了 vanilla 版本用的 5500/5501 port，沒有 Nuxt 預設的 3000，第一次測 signup 時瀏覽器直接擋掉請求。已經把 `http://localhost:3000`／`http://127.0.0.1:3000` 加進允許清單，兩個前端現在可以共用同一個後端本機開發。
- **checkbox 樣式**：vanilla 版本在 `CSS/style.css` 有全站套用的自訂 checkbox 樣式（橘色圓角方框、選中打勾），不是瀏覽器預設樣式，這條規則放進 `app/assets/css/main.css` 全域套用，不要在每個用到 checkbox 的頁面重複寫。

## 本機開發

```bash
cd SugarTopia_nuxt
cp .env.example .env   # 第一次執行才需要
npm install
npm run dev
```

打開 `http://localhost:3000`。如果要測本機後端（而不是 Cloud Run 正式環境），確認 `.env` 裡的 `NUXT_PUBLIC_API_BASE_URL` 指到 `http://127.0.0.1:8000`，並且另外開一個終端機把後端跑起來：

```bash
cd ../SugarTopia_backend
source venv/bin/activate
uvicorn main:app --reload
```
