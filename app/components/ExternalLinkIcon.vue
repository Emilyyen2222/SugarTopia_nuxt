<script setup lang="ts">
// 之前用 @nuxt/icon 的 <Icon name="mdi:open-in-new">，即使裝了
// @iconify-json/mdi 在 SSR 還是持續出現「failed to load icon」的警告、
// 圖示也沒畫出來，索性放棄整個 <Icon> 元件，這幾個用到的圖示都改成
// 純 inline SVG，穩定不依賴任何執行時的圖示載入機制。這顆是外部連結
// （cupertino.keki Instagram 連結）用的小箭頭方框圖示，在 header 裡
// 桌機版跟手機版下拉選單各用一次，抽成共用元件避免重複貼同一段 SVG。
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
</template>
