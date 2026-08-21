<script setup lang="ts">
// 對應 vanilla 版本 Js/site-enhancements.js 的 buildShopCardHtml()。
//
// 注意：category.html 檔案裡寫死的那些 <div class="shop-item">（Elephant
// Garden Neihu 假資料）只是頁面還沒載入完成前的靜態佔位內容，畫面載入後
// 會被 renderShopList() 整個換掉，換成 buildShopCardHtml() 產生的版本——
// 這兩份 HTML 其實不一樣（靜態佔位版多了「Delivery」跟一個 Start order
// 按鈕，這顆按鈕沒有接任何點擊事件，是遺留下來、實際上不會被使用者看到
// 的內容）。這裡照真正會被使用者看到的 buildShopCardHtml() 版本遷移，
// 不是照 category.html 裡那份已經是死碼的靜態佔位內容。
import type { Shop } from "~/composables/useShops";

const props = defineProps<{
  shop: Shop;
  index: number;
  isActiveOnMap: boolean;
}>();

const emit = defineEmits<{ viewOnMap: [] }>();

const { buildStars } = useShops();

const hasCoordinates = computed(() => props.shop.lat != null && props.shop.lng != null);
const imageSrc = computed(() => resolveShopImage(props.shop.image));
</script>

<template>
  <div
    class="flex border-b border-[#ddd] py-5 first:pt-0"
    :class="isActiveOnMap ? '-ml-5 border-l-4 border-l-brand-orange bg-brand-cream pl-4' : ''"
  >
    <div class="shrink-0">
      <NuxtLink :to="`/shop/${shop.id}`" :aria-label="`View ${shop.name}`">
        <img :src="imageSrc" :alt="shop.name" class="h-[150px] w-[200px] rounded-lg object-cover" />
      </NuxtLink>
    </div>
    <div class="ml-5 flex-1">
      <h2 class="mb-2.5 text-[1.25rem] font-bold text-brand-brown">{{ index + 1 }}. {{ shop.name }}</h2>
      <div class="text-base text-brand-orange">
        <span>{{ buildStars(shop.rating) }}</span>
        <span class="ml-2.5 text-[0.875rem] text-[#777]">{{ shop.rating.toFixed(1) }} ({{ shop.reviews }})</span>
      </div>
      <div class="my-2.5 flex flex-wrap gap-2">
        <span v-for="tag in shop.tags" :key="tag" class="category">
          <button type="button" class="rounded-[20px] bg-brand-orange px-3 py-[5px] text-sm text-white transition-colors hover:bg-brand-gold">
            {{ tag }}
          </button>
        </span>
      </div>
      <p class="my-2.5 text-[0.9375rem] leading-[1.2] text-[#333]">{{ shop.description }}</p>
      <div class="text-sm text-[#333]">
        <span class="mr-2.5">✔ Takeout</span>
        <span class="mr-2.5">✔ Saved to SugarTopia</span>
      </div>
      <button
        v-if="hasCoordinates"
        type="button"
        class="mt-2.5 mr-2 rounded-full border px-3.5 py-2 text-base transition-colors"
        :class="isActiveOnMap ? 'border-brand-brown bg-brand-brown text-white' : 'border-brand-brown bg-white text-brand-brown hover:bg-brand-cream'"
        @click="emit('viewOnMap')"
      >
        {{ isActiveOnMap ? "📍 Showing on map" : "📍 View on map" }}
      </button>
    </div>
  </div>
</template>
