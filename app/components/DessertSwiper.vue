<script setup lang="ts">
// 對應 vanilla 版本 index.html 裡的 .swiper.mySwiper（Js/swiper-bundle.js
// 那份舊版 UMD 套件 + 頁面最下面手動 new Swiper(...) 的寫法）。這裡改用
// Swiper 官方的 Vue 元件（npm 套件 swiper/vue），選項對應原本 script 裡
// new Swiper() 傳的參數（spaceBetween、centeredSlides、autoplay、
// pagination、navigation），效果一致。
//
// 只在瀏覽器端渲染（<ClientOnly>）：Swiper 需要量測實際 DOM 尺寸才能
// 正確初始化，SSR 階段沒有真正的瀏覽器版面可以量，這跟 header 那次放棄
// @nuxt/icon 是同一種「與其冒風險，不如直接排除在 SSR 之外」的判斷。
import { Swiper, SwiperSlide } from "swiper/vue";
import type { Swiper as SwiperInstance } from "swiper/types";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

// 本地備用圖：後端 /api/hero-photos 抓不到照片時用（Pexels key 沒設定、
// API 打不通、額度用完……），確保輪播圖至少有東西可以顯示，不會整塊空白。
const FALLBACK_IMAGES = [
  "nathan-dumlao-pJllO6r0pKo-unsplash.jpg",
  "natasha-levai-YVsFV0E-CGo-unsplash.jpg",
  "rens-d-6LTAljmu2cY-unsplash.jpg",
  "lp.jpg",
  "theo-crazzolara-BpcTCHoruSo-unsplash.jpg",
  "yana-gorbunova-usM1_4RAiVE-unsplash.jpg",
];

interface HeroPhoto {
  url: string;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
}

const { apiFetch } = useApi();

// slides：不管圖片最後是來自 Pexels 還是本地備用圖，統一整理成同一種
// 形狀（src + 可能沒有的 credit 資訊），template 只需要處理一種資料
// 結構，不用另外寫兩套渲染邏輯。
const slides = ref<{ src: string; credit: HeroPhoto | null }[]>(
  FALLBACK_IMAGES.map((image) => ({ src: `/img/${image}`, credit: null }))
);

onMounted(async () => {
  try {
    const data = await apiFetch<{ photos: HeroPhoto[] }>("/api/hero-photos");
    if (data.photos.length) {
      slides.value = data.photos.map((photo) => ({ src: photo.url, credit: photo }));
    }
    // photos 是空陣列（後端有回應，但 Pexels 那批快取是空的）就維持
    // FALLBACK_IMAGES，不用特別處理。
  } catch {
    // 後端本身打不通（例如本機沒開後端）也維持 FALLBACK_IMAGES，輪播圖
    // 不能因為這支非核心的 API 掛掉就整塊消失。
  }
});

// Pexels 不強制要求標示來源（官方說法是「歡迎但不要求」），但這是好
// 習慣，順手加上——只在目前這張確實來自 Pexels（credit 不是 null）時
// 顯示，本地備用圖不會有這行字。用 slideChange 事件追蹤目前是第幾張，
// 不用 Swiper 元件本身複雜的 render-prop 寫法。
const activeIndex = ref(0);
function handleSwiper(swiper: SwiperInstance) {
  activeIndex.value = swiper.realIndex;
}
function handleSlideChange(swiper: SwiperInstance) {
  activeIndex.value = swiper.realIndex;
}
const activeCredit = computed(() => slides.value[activeIndex.value]?.credit ?? null);
</script>

<template>
  <ClientOnly>
    <div class="dessert-swiper-wrapper">
      <Swiper
        class="dessert-swiper"
        :modules="[Autoplay, Navigation, Pagination]"
        :space-between="30"
        :centered-slides="true"
        :autoplay="{ delay: 2500, disableOnInteraction: false }"
        :pagination="{ clickable: true }"
        :navigation="true"
        :loop="true"
        @swiper="handleSwiper"
        @slide-change="handleSlideChange"
      >
        <SwiperSlide v-for="(slide, i) in slides" :key="i">
          <img :src="slide.src" alt="" class="h-full w-full object-cover" />
        </SwiperSlide>
      </Swiper>
      <a
        v-if="activeCredit"
        :href="activeCredit.pexelsUrl || 'https://www.pexels.com'"
        target="_blank"
        rel="noopener noreferrer"
        class="hero-photo-credit"
      >
        Photo by {{ activeCredit.photographer }} on Pexels
      </a>
    </div>
  </ClientOnly>
</template>

<style scoped>
/* 對應 CSS/swiper2.css 的 .swiper／.swiper-slide／.swiper-slide img，這幾條
   直接寫死尺寸／圓角的規則放進 Tailwind 的 class 組合會很難讀（尤其
   Swiper 元件本身也會產生自己的 class 結構），這裡維持跟 vanilla 版本
   對應的原始 CSS，比較好對照。 */
.dessert-swiper-wrapper {
  position: relative;
  width: calc(50% - 80px);
  height: calc(100vh - 160px);
  margin: 40px;
}

.dessert-swiper {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 2rem;
  overflow: hidden;
  /* vanilla 版本用的是 Swiper 的舊版 UMD 套件（swiper-bundle.css），沒有
     另外設定過導覽箭頭／分頁小點的顏色，用的就是那個版本的預設值（白色）。
     這裡改用官方 npm 套件後預設值不同（偏藍），用官方支援的 CSS 變數
     明確指定，比對出來的顏色才會一致。 */
  --swiper-navigation-color: #fff;
  --swiper-pagination-color: #fff;
}

/* Pexels 照片來源標示：右下角小字，半透明底色，不搶輪播圖本身的視覺，
   但看得清楚、點得到。 */
.hero-photo-credit {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 2;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  padding: 4px 12px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: background-color 0.15s;
}
.hero-photo-credit:hover {
  background: rgba(0, 0, 0, 0.65);
}

@media (max-width: 1024px) {
  .dessert-swiper-wrapper {
    width: 100%;
    /* 使用者實際用手機看過之後覺得原本的 60vh 太小、下面文字太快擠進來，
       希望「一屏對應一個功能」——輪播圖是進站看到的第一個功能，改成撐滿
       第一屏剩下的高度（扣掉 .split-section 在手機版的 100px 上邊距，
       這樣圖片下緣正好落在螢幕底部，往下滑才會進到下一個功能區塊）。
       跟 60vh 這個舊版直接搬過來的值不同，是這次刻意的設計調整。 */
    height: calc(100vh - 100px);
    margin: 0 0 24px;
    /* 對應 style.css 的 .swiper{order:1}：手機版上下堆疊時圖片要排在
       文字＋AI 問答上面，即使 DOM 順序（見 index.vue）文字在前、圖片在後。 */
    order: 1;
  }
  .dessert-swiper {
    border-radius: 0;
  }
}
</style>
