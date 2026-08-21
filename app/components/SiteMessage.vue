<script setup lang="ts">
// 對應 vanilla 版本的 .site-message／.site-message.show（CSS/style.css）。
const { text, visible } = useSiteMessage();
</script>

<template>
  <div
    class="fixed bottom-6 right-6 z-[2000] max-w-[360px] rounded-2xl bg-brand-brown px-4 py-3.5 text-[15px] leading-relaxed text-white shadow-[0_10px_30px_rgba(58,37,19,0.2)] transition-all duration-200 ease-out"
    :class="visible ? 'pointer-events-auto opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-3'"
  >
    {{ text }}
  </div>
</template>
