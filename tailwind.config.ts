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
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },
    },
  },
};
