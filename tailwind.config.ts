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
    },
  },
};
