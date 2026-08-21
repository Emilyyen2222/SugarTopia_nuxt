<script setup lang="ts">
// Phase 0 驗證頁：確認 Tailwind、自訂顏色 tokens、Poppins 字體、
// useApi／useAuth 這幾個 composable 都正常運作，還沒有真正的首頁內容
// （首頁本體排在 Phase 1 最後，因為 hero／AI 問答那塊今天在 vanilla 版本
// 上就改了一整個下午，複雜度最高）。
const { baseUrl } = useApi();
const { isLoggedIn } = useAuth();
</script>

<template>
  <main class="mx-auto max-w-3xl px-6 py-16">
    <p class="mb-2 text-xs font-bold uppercase tracking-wide text-brand-orange">
      SugarTopia · Nuxt Phase 0
    </p>
    <h1 class="mb-4 text-3xl font-bold text-brand-brown">
      Let's Make Life Sweet, One Dessert at a Time.
    </h1>
    <p class="mb-8 text-brand-brown-light">
      這是 Phase 0 的驗證頁，用來確認 Tailwind、自訂顏色 tokens
      （brand-orange／brand-brown／brand-gold…）、Poppins 字體、
      composables 都正常運作。
    </p>

    <div class="space-y-3 rounded-2xl border border-brand-border bg-brand-cream p-6">
      <p class="text-sm text-brand-brown">
        API base URL：<code class="text-brand-orange">{{ baseUrl }}</code>
      </p>
      <p class="text-sm text-brand-brown">
        登入狀態：<span class="font-semibold">{{ isLoggedIn ? "已登入" : "未登入" }}</span>
      </p>
      <button
        class="rounded-lg bg-brand-brown px-5 py-3 font-semibold text-white transition hover:bg-brand-brown-hover"
      >
        Send（樣式測試按鈕）
      </button>
      <button
        class="ml-3 rounded-lg bg-brand-orange px-5 py-3 font-semibold text-white transition hover:bg-brand-orange-dark"
      >
        Start order（樣式測試按鈕）
      </button>
    </div>
  </main>
</template>
