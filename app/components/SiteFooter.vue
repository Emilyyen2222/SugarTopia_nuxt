<script setup lang="ts">
// 對應 vanilla 版本每個頁面都有的 <footer>（category.html、shop_detail.html、
// favorites.html、index.html 都是同一份 markup，複製貼上了四次）。這裡
// 抽成共用元件放進 app/layouts/default.vue，全站只寫一次。
//
// 圖示原本用 FontAwesome（fa-youtube／fa-facebook-f／fa-twitter／
// fa-instagram／fa-linkedin-in），跟 header 那次一樣的理由（@nuxt/icon
// 在 SSR 不穩定）改用 inline SVG，不額外掛 FontAwesome CDN。
const { show } = useSiteMessage();
const { t } = useI18n();
</script>

<template>
  <footer class="flex w-full items-center justify-center bg-brand-orange py-[100px] text-center">
    <div class="mx-auto w-full max-w-[1200px] px-5 text-center">
      <p class="mb-2.5 text-sm text-white">{{ t("footer.copyright") }}</p>
      <div class="mb-2.5">
        <a href="#" class="mx-[15px] text-sm text-white no-underline hover:underline" @click.prevent="show(t('common.demoPlaceholder'))">{{ t("footer.about") }}</a>
        <a href="#" class="mx-[15px] text-sm text-white no-underline hover:underline" @click.prevent="show(t('common.demoPlaceholder'))">{{ t("footer.service") }}</a>
        <a href="#" class="mx-[15px] text-sm text-white no-underline hover:underline" @click.prevent="show(t('common.demoPlaceholder'))">{{ t("footer.business") }}</a>
      </div>
      <div>
        <a href="#" class="mx-2.5 inline-block text-white hover:opacity-70" @click.prevent="show(t('common.demoPlaceholder'))">
          <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c2 .6 9.4.6 9.4.6s7.4 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.5V8.5l6.3 3.5-6.3 3.5Z" /></svg>
        </a>
        <a href="#" class="mx-2.5 inline-block text-white hover:opacity-70" @click.prevent="show(t('common.demoPlaceholder'))">
          <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M13.5 22v-8.5H16l.4-3H13.5V8.4c0-.9.2-1.5 1.5-1.5H16.5V4.3C16.2 4.3 15.2 4.2 14 4.2c-2.4 0-4 1.5-4 4.1v2.2H7.5v3H10V22h3.5Z" /></svg>
        </a>
        <a href="#" class="mx-2.5 inline-block text-white hover:opacity-70" @click.prevent="show(t('common.demoPlaceholder'))">
          <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M22 5.9c-.7.3-1.5.6-2.3.7a4 4 0 0 0 1.8-2.2 8 8 0 0 1-2.5 1 4 4 0 0 0-6.9 3.6A11.4 11.4 0 0 1 3.9 4.9a4 4 0 0 0 1.2 5.3c-.6 0-1.2-.2-1.7-.5v.1a4 4 0 0 0 3.2 3.9c-.6.1-1.2.2-1.8.1a4 4 0 0 0 3.7 2.8A8 8 0 0 1 2 18.4a11.3 11.3 0 0 0 6.1 1.8c7.3 0 11.3-6.1 11.3-11.3v-.5c.8-.6 1.4-1.3 2-2.1a8 8 0 0 1-2.3.6Z" /></svg>
        </a>
        <a href="https://www.instagram.com/cupertino.keki/" target="_blank" rel="noopener noreferrer" class="mx-2.5 inline-block text-white hover:opacity-70">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
        </a>
        <a href="#" class="mx-2.5 inline-block text-white hover:opacity-70" @click.prevent="show(t('common.demoPlaceholder'))">
          <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM2.5 21h5V9h-5v12Zm7.5 0h5v-6.5c0-1.6 1-2.3 2-2.3s2 .7 2 2.3V21h5v-7.4c0-3.7-2-5.4-4.6-5.4-2.1 0-3 1.2-3.5 2v-1.7h-5c.1 1.1 0 12.5 0 12.5Z" /></svg>
        </a>
      </div>
      <!-- 店家收錄工具的入口：低調放在 footer 最底下，不特別標註「管理」
           之類的字樣、字級刻意跟其他連結有差。真正擋人的是後端的
           ADMIN_EMAILS 檢查（見 main.py 的 require_admin_user），這裡
           純粹只是不想讓一般訪客一眼就看到、點進去問東問西。 -->
      <NuxtLink to="/admin/places" class="mt-6 inline-block text-[11px] text-white/30 no-underline hover:text-white/70">admin</NuxtLink>
    </div>
  </footer>
</template>
