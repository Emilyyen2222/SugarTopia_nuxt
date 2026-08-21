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
  - [ ] category.html（搜尋/篩選/店卡/地圖）
  - [ ] shop_detail.html（收藏/評論）
  - [ ] favorites.html
  - [ ] 首頁（hero/AI 問答/輪播/Latest Reviews）
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
