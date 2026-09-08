import type { Config } from "tailwindcss";

// 這裡的顏色數值直接從 vanilla 版本（SugarTopia/CSS/*.css）裡實際使用的
// hex 值搬過來，不是憑印象重新調色——目標是遷移後畫面看起來要跟原版
// 一模一樣，顏色數值當然也要完全一致，不能自己重新猜一套「看起來差不多」
// 的顏色。
export default <Partial<Config>>{
  content: [
    "./app/**/*.{vue,js,ts}",
    "./app/components/**/*.{vue,js,ts}",
    "./app/layouts/**/*.vue",
    "./app/pages/**/*.vue",
    "./app/app.vue",
  ],
  theme: {
    extend: {
      // 對應 vanilla 版本 header 在不同寬度下的收合邏輯（CSS/style.css）。
      // vanilla 版本原本是三個各自獨立的 max-width 媒體查詢，這裡統一
      // 命名成三個斷點，之後任何元件要用同一套收合邏輯都能直接引用同一個
      // 名字，不用到處重複寫 1024px／1380px／480px 這種魔術數字。
      // 用 { max: ... } 是因為 vanilla 版本的邏輯是「螢幕比這個寬度窄的時候」
      // （max-width），不是 Tailwind 預設 sm/md/lg 那種「比這個寬度寬的時候」
      // （min-width），兩種語意不一樣，不能直接借用 Tailwind 內建的斷點名稱。
      screens: {
        "nav-lg": { max: "1380px" }, // Categories 收進漢堡選單
        "nav-md": { max: "1024px" }, // Login/Sign Up 收成 avatar 圖示，write a review／cupertino.keki 收進漢堡選單
        "nav-sm": { max: "480px" }, // 搜尋欄收成只剩按鈕
        // 對應 category.html 分類頁的地圖側欄（CSS/category.css）：螢幕比
        // 這個窄的時候地圖直接整個隱藏，讓結果列表獨佔畫面寬度。
        "map-hide": { max: "880px" },
        // 對應 shop_detail.html 店家詳情頁（CSS/shop_detail.css）的三個
        // 響應式斷點：768 是 shop-header 從左右並排改成上下堆疊，500 是
        // shop-image 置中縮寬，430 是 shop-info 兩側留白。任意值語法
        // （例如 max-[768px]:）在這個專案編譯不出來（原因不明，跟
        // map-hide 那次遇到的問題一樣），所以一律用具名斷點。
        "detail-md": { max: "768px" },
        "detail-sm": { max: "500px" },
        "detail-xs": { max: "430px" },
      },
      colors: {
        brand: {
          orange: "#F9A726", // 主色：按鈕、強調色
          "orange-dark": "#E89615", // 按鈕 hover
          gold: "#FCDC94", // 米金色，hero 漸層、header 左半邊
          brown: "#3A2513", // 主要文字顏色
          "brown-light": "#6F5B49", // 次要/說明文字
          "brown-hover": "#5A3B22", // 深色按鈕 hover（例如 AI 問答 Send 按鈕）
          cream: "#FFF8EF", // 淺色背景
          border: "#EAD7BD", // 淺色邊框
          panel: "#F1E3C8", // 下拉選單邊框
          hover: "#FEF6E4", // 選單項目 hover 底色
          avatar: "#FCE3A8", // 帳號 avatar 圖示底色
          green: "#5A8F29", // 評分星星顏色
          "chat-assistant": "#F5EADC", // AI 問答，AI 回覆的訊息泡泡底色
        },
      },
      // Huninn（粉圓體）：中文字體換成比較圓潤溫暖的字型，不用系統預設
      // 中文字體那種偏方正嚴肅的感覺（見 nuxt.config.ts 引入的 Google
      // Fonts 連結）。這裡也要跟著改，不能只改 main.css 的 body 選擇器——
      // app.vue／layout 的根層 <div> 用了 font-sans 這個 utility class，
      // 直接把這裡設定的字體清單套上去，蓋掉從 body 繼承下來的值，實測
      // 過只改 main.css 中文字體不會生效，兩個地方要同步。
      fontFamily: {
        sans: ["Poppins", "Huninn", "sans-serif"],
      },
      // 字級系統（2026-09）：在這之前每個頁面的每個文字元素都是各自用
      // Tailwind 的任意值語法（text-[19px]、text-[0.9375rem]……）現場
      // 決定一個看起來順眼的數字，光首頁一頁就有 8 種彼此接近但不完全
      // 一樣的字級混在一起，這是「標題沒有視覺重量」這類問題的根本
      // 原因——不是排版沒對齊，是從來沒有「這是主標、這是內文」的比例
      // 規則存在。
      //
      // 這 8 級是從現有畫面實際在用的數字收斂出來的（不是憑空發明），
      // 用 1.25（大三度）的比例往上疊，每一級都配好對應的行距／字距，
      // 不是只有大小數字。跟 Emily 在 Artifact 上實際套到 Hero slogan／
      // 分類方塊／評論卡片這三個真實區塊比對過
      // （https://claude.ai/code/artifact/b709fb2b-57a4-43e1-86c9-b3d81a2e08a2），
      // display 原本照數學比例算出來是 48-60px，套到中文 slogan 上發現
      // 太大，第一輪先手動下修到 34-40px；實際套上首頁看過真實效果後，
      // Emily 覺得還是比原本（1.2rem／19.2px）的份量重、沒有原本精緻，
      // 又再降了一次，改成 26-28px。這一級因此變得比 h1（36px）還小，
      // 打破了原本「display 該是最大級」的排序——目前刻意保留這個不一致，
      // 因為首頁 slogan 這個原本設想的主要使用情境已經改回不用這一級（見
      // index.vue 的 overlay-text），這個級距先當作「之後如果有需要一個
      // 比 h1 更保守的大字級」的備用選項，不是目前有任何地方在用。
      //
      // 之後任何頁面的文字大小都從這 8 個裡面選（text-caption／
      // text-small／text-body／text-body-lg／text-h3／text-h2／text-h1／
      // text-display），不會再有現場憑感覺打任意數值的情況。
      fontSize: {
        caption: ["12px", { lineHeight: "1.5", letterSpacing: "0.04em" }],
        small: ["13px", { lineHeight: "1.5" }],
        body: ["15px", { lineHeight: "1.7" }],
        "body-lg": ["17px", { lineHeight: "1.65" }],
        h3: ["20px", { lineHeight: "1.35" }],
        h2: ["26px", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
        h1: ["36px", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        display: ["clamp(26px, 3vw, 28px)", { lineHeight: "1.3", letterSpacing: "-0.005em" }],
      },
    },
  },
};
