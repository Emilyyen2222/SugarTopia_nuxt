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

依照複雜度由淺入深，明確排除在這次遷移之外的：`admin_places.html`（Google Places 內部工具，繼續用 vanilla 版本現有的獨立靜態頁，見下方說明）、首頁的電子報訂閱區塊（純展示、沒接後端）、`aboutus_*.html`（純靜態頁，優先度較低）。**Instagram 照片牆原本也排除在外，後來使用者要求加回來了**（`app/pages/index.vue` 裡的 `.instagram_photo_section`，位置跟 vanilla 版本一樣在 Categories 之後、電子報訂閱之前），純展示、沒接任何後端，跟 vanilla 版本用同一組圖片。

`admin_places.html` 沒有被遷移、也不需要被遷移：它是一個獨立、沒連結進主站導覽的靜態頁，只會呼叫後端的 `/api/google/places/*` 端點（金鑰在後端 `.env`，這個檔案本身沒有內嵌任何金鑰），不依賴、也不知道現在跑的是 vanilla 版本還是 Nuxt 版本的前端。換句話說，這個工具現在、以後都可以直接用（`open SugarTopia/admin_places.html` 或用任何靜態伺服器開，只要後端有跑起來），不受這次前端遷移影響。

- [x] **Phase 0** 專案建置、Tailwind + 品牌顏色／字體、`useApi`／`useAuth` composables
- [x] **Phase 1** 依序遷移（全部完成，明細見下方）：
  - [x] Login/Signup（`app/pages/login.vue`、`signup.vue`，含 `useSiteMessage` 訊息提示元件，已用 Playwright 實測畫面對照 vanilla、signup→login→已登入導回首頁→錯誤訊息全部跑過一輪）
  - [x] Header + Categories 選單元件（`app/components/HeaderNav.vue`、`CategoriesDropdown.vue`，已套進 `app/layouts/default.vue`，全站共用）。用 CSS Grid 三欄置中取代 vanilla 版本的 `position: fixed` logo，用 Playwright 在 375〜1440px 之間量測，確認任何寬度下 header-left 都不會撞到 logo、也沒有橫向 overflow；登入/未登入兩種狀態、漢堡選單開關、Categories 下拉互動都實測過。`@nuxt/icon` 模組在 SSR 一直載入失敗（裝了 `@iconify-json/mdi` 也一樣），改用 inline SVG 並移除該模組。**注意**：實測發現 vanilla 版本本身就有一個既有 bug——手機版透過漢堡選單點開 Categories 時，因為 `.nav-menu.active` 有 `overflow: hidden`，下拉的分類清單其實會被裁切、根本不會顯示出來；這裡是照原樣忠實遷移這個行為（沒有動 vanilla 檔案），之後如果要修可以再另外討論。**事後補強**：使用者反映漢堡選單裡的連結（例如 Categories 面板裡的分類）點下去換頁後，選單本身沒有跟著收合。`CategoriesDropdown.vue` 只會收合自己內部的下拉狀態，不知道要通知外層 `HeaderNav.vue` 也收合漢堡選單；改成直接 watch 路由變化（`route.fullPath`），任何一次換頁都收合漢堡選單，不用每個連結各自接一次收合邏輯，之後選單裡加新連結也不用記得補這件事。
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
  - [x] write_review.html（`app/pages/write-review.vue`）。網址帶 `?id=` 時鎖定店家（純文字顯示店名），沒帶的話載入全部店家給下拉選單選。**星等選擇器刻意照抄一個「有點特別」的既有行為**：vanilla 版本用 5 個 radio（DOM 順序是反過來的，第一顆 value=5、最後一顆 value=1）搭配 `input:checked ~ label{color:orange}` 這個常見 CSS 技巧做填色，但沒有搭配一般會一起用的 `flex-direction:row-reverse`；實際用 Playwright 點開真的頁面測過，點第 3 顆星（從左數，value=3）填色的是「從點擊位置往右填到底」（第 3、4、5 顆亮），不是一般直覺以為的「從最左邊往點擊位置填」。Vue 版本沒有用同一個 CSS 技巧（改用 JS 算比較好維護），但特地算出跟 vanilla 版本完全一樣的視覺結果，不是自己覺得「這樣比較合理」的常見版本。照片上傳欄位跟 vanilla 版本一樣是純裝飾，`submitReview()` 只送評分和文字，不會真的上傳照片。用 Playwright 測過：未登入時送出會被導去 `/login`、登入後真的送出評論並確認後端資料庫真的多了一筆、送出後導回對應店家的詳情頁。
- [x] **Phase 2** Playwright 測試遷移（37 支測試全部搬過來、全部通過）
  - 對應 vanilla 版本 `tests/*.spec.js` 八個檔案，一比一搬過來（`auth`／`category`／`favorites`／`home`／`reviews`／`shop-detail`／`typography`，`global-setup` 也照搬，同一套「檢查後端有沒有先啟動、有沒有連到測試專用資料庫」的把關邏輯，兩個前端共用同一個後端，這個檢查在哪個專案跑都一樣重要）。網址／選擇器改成這個專案實際的路由與 DOM。
  - **選擇器策略**：vanilla 版本的測試大多對著 class name／id 斷言，這個 Vue 版本大部分元件已經全面轉成 Tailwind utility class（沒有對應的語意 class），所以優先改用 Playwright 建議的 `getByRole`／`getByText` 這種語意定位，只在少數真的需要（地圖 iframe、店家卡片、評論卡片、鎖定的店家名稱……）才回頭幫元件加 `id`／`data-testid`／少量 class（純粹給測試用，不影響樣式，例如 `ShopCard.vue` 的 `data-testid="shop-card"`、`write-review.vue` 的 `data-testid="locked-shop-name"`）。`HeaderNav.vue`／`CategoriesDropdown.vue`／`index.vue` 則刻意保留了不少 vanilla 版本原本就有的 class name（`.header-left`、`.logo-container`、`.nav-categories-panel`、`.split-section`、`.overlay-text`……），純粹是為了讓這幾支測試檔案能盡量照 vanilla 版本的原始邏輯搬、方便對照，不是又走回「用 class 當測試 hook」的回頭路。
  - 過程中發現並補上一個真的可及性（accessibility）缺口：窄螢幕（≤1024px）用來取代文字版 Log In/My Favorites 的帳號圖示連結，原本（跟 vanilla 版本的 `.login_avatar`/`.auth-favorites` 一樣）完全沒有 `aria-label`，純圖示連結對螢幕閱讀器使用者來說沒有可讀的名字。補上 `aria-label`（"Log In" 或 "My Favorites"，依登入狀態切換）之後，這個連結也順便有了穩定、不受樣式影響的測試定位點，一舉兩得。
  - **踩到的雷（SSR + hydration 相關，vanilla 版本完全不會遇到，因為它是純靜態 HTML，沒有 hydration 這個階段）**：一開始所有需要「`page.goto()` 之後馬上 `page.fill()`」的測試（主要是 signup 表單）都會在送出時等不到導頁、逾時失敗，排查後發現不是邏輯錯誤——填表單的動作在 Vue 完成 hydration 之前就發生了，Playwright 確實把值填進了 SSR 先吐出來的原始 DOM 節點，但如果那個節點在 hydration 過程中被 Vue 判定為不匹配而整個重新掛載，剛剛填的值就會被沖掉，送出時拿到的其實是空表單（截圖親眼確認過：欄位全部是 placeholder，不是打錯字或選錯 selector）。修法是在每個「`goto()` 後緊接著要操作表單」的地方加 `page.waitForLoadState("networkidle")`，等 hydration 真的做完再互動。這跟這次遷移全程手動用 Playwright 驗證畫面時，每次都會多等 300~800ms 是同一個原因，只是自動化測試這次逼著把它寫清楚、變成可重複的規則，而不是憑經驗多等一下。
  - 另外兩個比較單純的等待時機問題：`<option>` 元素在 Playwright 的可見性判斷裡永遠不算「visible」（原生下拉選單彈出的內容不算一般排版），不能用 `locator.waitFor()` 等它出現，要改成 poll 數量；還有一次不小心寫成 `not.toHaveCount(1)` 而不是「數量大於 1」，在資料还没載入完成（0 筆）的當下這個條件同樣會通過，等於沒有真的等到東西，這是這次自己寫測試踩到的邏輯坑，不是框架的問題。
  - `playwright.config.ts` 的 `webServer.command` 需要明確加 `--host 127.0.0.1`：Nuxt dev server 有時只先綁 IPv6（`[::1]`），Playwright 用設定裡的 `127.0.0.1` 去戳會連不上、誤判成「伺服器還沒準備好」，逾時失敗，這個 IPv6/IPv4 沒對齊的雷這次遷移前面（本機手動開發時）就踩過一次，這裡是自動化測試又踩到同一個雷。
  - 跑測試前要先手動把用 `npm run dev` 開著的 dev server 關掉，讓 Playwright 自己的 `webServer` 全權接管——兩個各自啟動的 Nuxt dev server 會撞到 Nuxt 自己的 dev lock 機制（同一個專案資料夾同時只能有一個 dev server），這點跟 vanilla 版本（純靜態檔案伺服器，本來就可以同時開好幾個）不一樣。
  - 執行：`npm run test:e2e`（等同 `npx playwright test`），需要後端先用 `DATABASE_PATH=sugartopia_test.db uvicorn main:app --reload` 啟動（跟 vanilla 版本共用同一套規則，見 `tests/global-setup.ts`）。
- [ ] **正式上線切換**：Playwright 測試通過只代表功能面沒問題，正式把 Nuxt 版本換上線（取代 vanilla 版本的 Vercel 部署）前，還需要視覺方面再走一輪完整的人工核對（尤其是這次測試沒有覆蓋到的細節：字體渲染、間距微調、瀏覽器相容性），加上這次刻意排除在遷移範圍外的頁面/區塊（`admin_places.html`、Instagram 照片牆、電子報訂閱、`aboutus_*.html`）要決定各自的去留，這些留給之後另外討論。

## 踩過的雷

- **CORS**：後端（`SugarTopia_backend/main.py`）原本的 `allow_origins` 清單只列了 vanilla 版本用的 5500/5501 port，沒有 Nuxt 預設的 3000，第一次測 signup 時瀏覽器直接擋掉請求。已經把 `http://localhost:3000`／`http://127.0.0.1:3000` 加進允許清單，兩個前端現在可以共用同一個後端本機開發。
- **checkbox 樣式**：vanilla 版本在 `CSS/style.css` 有全站套用的自訂 checkbox 樣式（橘色圓角方框、選中打勾），不是瀏覽器預設樣式，這條規則放進 `app/assets/css/main.css` 全域套用，不要在每個用到 checkbox 的頁面重複寫。
- **Focus 框線顏色**：使用者發現搜尋欄／輪播箭頭點下去會出現瀏覽器預設的藍色 focus 外框，這其實 vanilla 版本也有（從來沒特別處理過），但使用者要求這裡順便改掉。在 `main.css` 加一條全站 `:focus-visible { outline: #f9a726 }` 規則，用網站自己的橘色取代瀏覽器預設藍色，用 `:focus-visible` 而不是整個拿掉 outline，鍵盤操作（Tab）還是看得到焦點在哪。這是刻意跟 vanilla 版本不一樣的地方（使用者要求的改善，不是遷移疏漏），只在這個 Nuxt 專案做，沒有回頭改 vanilla 版本。
- **Vue SFC 的 `<template>` 忘記寫結束標籤**：這次遷移過程中三次忘記幫新建的 `.vue` 檔案加上結束的 `</template>`（`SiteFooter.vue`、`ScrollToTopButton.vue` 各一次，`shop/[id].vue` 一次），編譯錯誤訊息一開始容易誤導成別的問題（例如指向完全不相關的一行）。之後新增檔案前都會先跑一個小 Python 腳本數開始/結束標籤有沒有配對，養成習慣再啟動 dev server，不要等編譯報錯才發現。

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
