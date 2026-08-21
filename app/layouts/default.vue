<template>
  <div class="min-h-screen bg-white font-sans text-brand-brown">
    <!-- Header/Footer 元件之後在 Phase 1 才會做，這裡先留位置，確保
         layout 本身、Tailwind、顏色 tokens 都正常運作。 -->
    <slot />
    <SiteMessage />
  </div>
</template>
