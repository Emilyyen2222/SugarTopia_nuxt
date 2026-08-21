<script setup lang="ts">
// 對應 vanilla 版本 Js/button_up.js。vanilla 版本裡這顆按鈕只出現在
// category.html 跟 index.html（不是全站共用元件，shop_detail.html／
// favorites.html／login.html／signup.html 都沒有這顆按鈕），所以這裡也
// 沒有放進 app/layouts/default.vue，而是各自需要的頁面自己引用。
//
// 預設是「顯示」，不是「隱藏」：vanilla 版本的 .scroll-to-top-btn 本身的
// CSS 沒有預設 display:none，是完全靠 window.onscroll 的 JS 邏輯決定
// 顯示或隱藏——頁面剛載入、還沒觸發過任何 scroll 事件之前，按鈕其實是
// 顯示的（直到使用者真的捲動過一次，JS 才會依當下捲動距離決定要不要
// 藏起來）。這裡照實際行為遷移，不是憑直覺覺得「一開始應該要藏起來」。
const visible = ref(true);

function handleScroll() {
  visible.value = window.scrollY > 200 || document.documentElement.scrollTop > 200;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => {
  window.addEventListener("scroll", handleScroll);
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <button
    v-show="visible"
    type="button"
    class="fixed bottom-5 right-5 flex h-10 w-10 items-center justify-center rounded-full border-0 bg-[#f9a826c1] text-white shadow-[0_2px_10px_rgba(0,0,0,0.1)] transition-all"
    aria-label="Scroll to top"
    @click="scrollToTop"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="h-[0.8rem] w-[0.8rem]"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
  </button>
</template>
