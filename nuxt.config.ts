// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  // 原本有裝 @nuxt/icon，但 SSR 一直出現「failed to load icon」的警告，
  // 圖示也沒畫出來，即使裝了 @iconify-json/mdi 還是一樣，所以整個放棄
  // 這個模組，header 裡用到的圖示都改成穩定的 inline SVG（見
  // app/components/ExternalLinkIcon.vue 跟 HeaderNav.vue 內的 svg）。
  modules: ["@nuxtjs/tailwindcss", "@nuxtjs/i18n"],
  // 中英文切換：策略選 no_prefix（不加 /zh、/en 這種網址前綴），單純用同一個
  // 網址、依照使用者選的語言切換畫面文字——這個專案規模不需要多語系各自
  // 獨立網址帶來的 SEO 好處，no_prefix 比較單純，也不用額外處理路由邏輯。
  i18n: {
    strategy: "no_prefix",
    defaultLocale: "en",
    locales: [
      { code: "en", language: "en-US", name: "English", file: "en.json" },
      { code: "zh-TW", language: "zh-TW", name: "繁體中文", file: "zh-TW.json" },
    ],
  },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      title: "Sugar.Topia",
      link: [
        { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
        },
        // Huninn（粉圓體）：中文字體圓潤、比較活潑，跟系統預設中文字體
        // （方正、偏嚴肅）比起來更貼近甜點店的溫馨調性。Poppins 本身沒有
        // 中文字符，瀏覽器對中文字會自動 fallback 到這個字體（見
        // main.css 的 font-family 順序），拉丁字母還是走 Poppins，不會
        // 互相蓋過去。
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Huninn&display=swap",
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      // 跟 vanilla 版本的 auth.js／site-enhancements.js 同一套邏輯：本機開發
      // 打本機後端，正式環境打 Cloud Run。這裡先寫 Cloud Run 網址當預設值，
      // 本機開發時可以用 .env 的 NUXT_PUBLIC_API_BASE_URL 覆蓋成
      // http://127.0.0.1:8000。
      apiBaseUrl: "https://sugartopia-backend-673387630043.asia-east1.run.app",
    },
  },
});