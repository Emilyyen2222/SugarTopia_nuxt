<script setup lang="ts">
// 首頁 Categories 區塊的單張卡片，桌機版（4 欄一列）跟手機版（每頁 2x2）
// 共用同一份，不要各自維護一份重複的內容——之前兩個地方各寫一份，
// 手機版那份漏改，內容跟高度容易兜不起來。
defineProps<{
  labelKey: string;
  query: string;
  image: string;
}>();

const { t } = useI18n();
</script>

<template>
  <NuxtLink
    :to="`/category?q=${encodeURIComponent(query)}`"
    class="category-card flex h-full flex-col items-center rounded-2xl p-2.5 transition hover:scale-[0.98] hover:bg-[rgba(249,168,38,0.2)]"
  >
    <!-- 邊框改成 CSS 畫（不是圖片本身自帶的邊框），圖示跟文字都放回同一個
         邊框裡（跟原本圖片內建邊框、文字在圖示下方的排版一致），只是
         文字現在是真的 HTML 文字，才能跟著介面語言切換。
         h-full：外層 NuxtLink 已經是 h-full（同一列/同一頁的卡片一樣高，
         由父層 grid 的 align-items: stretch 決定），這裡的邊框 div 也要
         跟著 h-full，不然店名一行的卡片（例如 Bagels）邊框會比店名兩行的
         卡片（例如 Cinnamon Rolls）矮一截。 -->
    <div
      class="flex h-full w-full max-w-[200px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-brand-orange bg-white px-2 py-3 transition-transform hover:scale-95 md:py-6"
    >
      <!-- 圖片本身的畫布（viewBox）已經裁到圖示實際的邊界，沒有多餘留白。 -->
      <img :src="`/img/${image}`" :alt="t(labelKey)" class="h-12 w-auto object-contain" />
      <!-- min-w-0：flex 子項目預設不會主動縮小去符合容器寬度（flexbox 常見
           的坑），沒有這個窄卡片會被長店名文字撐出邊框外。 -->
      <p class="w-full min-w-0 text-center text-sm font-semibold text-brand-orange md:text-base">{{ t(labelKey) }}</p>
    </div>
  </NuxtLink>
</template>
