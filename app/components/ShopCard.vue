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
const { t, locale } = useI18n();

const hasCoordinates = computed(() => props.shop.lat != null && props.shop.lng != null);
const imageSrc = computed(() => resolveShopImage(props.shop.image));

// 店名／標籤／介紹是店家本身的資料（不是介面文案），後端其實已經有
// 中文版本（nameZh／tagsZh／descriptionZh），只是原本這裡沒有依語言切換，
// 一律顯示英文版——不是資料缺漏，是這裡漏接。中文版缺字（空字串／空陣列）
// 時退回英文版，比顯示空白好。
const displayName = computed(() => (locale.value === "zh-TW" && props.shop.nameZh) || props.shop.name);
const displayTags = computed(() =>
  locale.value === "zh-TW" && props.shop.tagsZh.length ? props.shop.tagsZh : props.shop.tags
);
const displayDescription = computed(
  () => (locale.value === "zh-TW" && props.shop.descriptionZh) || props.shop.description
);
</script>

<template>
  <div
    data-testid="shop-card"
    class="flex border-b border-[#ddd] py-5 first:pt-0"
    :class="isActiveOnMap ? '-ml-5 border-l-4 border-l-brand-orange bg-brand-cream pl-4' : ''"
  >
    <div class="shrink-0">
      <NuxtLink :to="`/shop/${shop.id}`" :aria-label="`View ${displayName}`">
        <!-- 手機窄螢幕（≤480px，沿用 header 已經在用的 nav-sm 斷點）把圖縮小，
             不然固定 200px 寬的圖片會把旁邊 flex-1 的文字內容擠到快沒有寬度可用，
             導致整個卡片橫向超出畫面（螢幕出現橫向捲動）。 -->
        <img
          :src="imageSrc"
          :alt="displayName"
          class="h-[150px] w-[200px] rounded-lg object-cover nav-sm:h-[85px] nav-sm:w-[110px]"
        />
      </NuxtLink>
    </div>
    <!-- min-w-0：flex 子項目預設的隱性最小寬度是「自己內容的自然寬度」，
         沒有這個會讓長店名/長描述把這個區塊撐開,連帶讓整張卡片、甚至整個
         頁面在窄螢幕上橫向超出可視範圍——這是 flexbox 常見的坑,不是內容
         本身有問題。 -->
    <div class="ml-5 min-w-0 flex-1">
      <h2 class="mb-2.5 text-[1.25rem] font-bold text-brand-brown">{{ index + 1 }}. {{ displayName }}</h2>
      <!-- 跟 shop_detail 頁一樣：style.css 有一條全站通用的 `.rating span`
           規則（specificity 比 `.rating-score` 這種自己的規則高），會把
           這裡原本想要的橘色星星／灰色分數蓋成統一的綠色、x-small（約
           10px）小字——這是既有的 CSS cascade 巧合，照實際渲染結果遷移。 -->
      <div class="text-base">
        <span class="text-[10px] text-brand-green">{{ buildStars(shop.rating) }}</span>
        <span class="ml-2.5 text-[10px] text-brand-green">{{ shop.rating.toFixed(1) }} ({{ shop.reviews }})</span>
      </div>
      <div class="my-2.5 flex flex-wrap gap-2">
        <span v-for="tag in displayTags" :key="tag" class="category">
          <button type="button" class="rounded-[20px] bg-brand-orange px-3 py-[5px] text-sm text-white transition-colors hover:bg-brand-gold">
            {{ tag }}
          </button>
        </span>
      </div>
      <p class="my-2.5 text-[0.9375rem] leading-[1.2] text-[#333]">{{ displayDescription }}</p>
      <div class="text-sm text-[#333]">
        <span class="mr-2.5">✔ {{ t("common.takeout") }}</span>
        <span class="mr-2.5">✔ {{ t("common.savedToSugarTopia") }}</span>
      </div>
      <button
        v-if="hasCoordinates"
        type="button"
        class="mt-2.5 mr-2 rounded-full border px-3.5 py-2 text-base transition-colors"
        :class="isActiveOnMap ? 'border-brand-brown bg-brand-brown text-white' : 'border-brand-brown bg-white text-brand-brown hover:bg-brand-cream'"
        @click="emit('viewOnMap')"
      >
        📍 {{ isActiveOnMap ? t("common.showingOnMap") : t("common.viewOnMap") }}
      </button>
    </div>
  </div>
</template>
