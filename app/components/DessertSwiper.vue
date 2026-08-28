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
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const images = [
  "nathan-dumlao-pJllO6r0pKo-unsplash.jpg",
  "natasha-levai-YVsFV0E-CGo-unsplash.jpg",
  "rens-d-6LTAljmu2cY-unsplash.jpg",
  "lp.jpg",
  "theo-crazzolara-BpcTCHoruSo-unsplash.jpg",
  "rens-d-6LTAljmu2cY-unsplash.jpg",
  "yana-gorbunova-usM1_4RAiVE-unsplash.jpg",
  "rens-d-6LTAljmu2cY-unsplash.jpg",
  "rens-d-6LTAljmu2cY-unsplash.jpg",
];
</script>

<template>
  <ClientOnly>
    <Swiper
      class="dessert-swiper"
      :modules="[Autoplay, Navigation, Pagination]"
      :space-between="30"
      :centered-slides="true"
      :autoplay="{ delay: 2500, disableOnInteraction: false }"
      :pagination="{ clickable: true }"
      :navigation="true"
      :loop="true"
    >
      <SwiperSlide v-for="(image, i) in images" :key="i">
        <img :src="`/img/${image}`" alt="" class="h-full w-full object-cover" />
      </SwiperSlide>
    </Swiper>
  </ClientOnly>
</template>

<style scoped>
/* 對應 CSS/swiper2.css 的 .swiper／.swiper-slide／.swiper-slide img，這幾條
   直接寫死尺寸／圓角的規則放進 Tailwind 的 class 組合會很難讀（尤其
   Swiper 元件本身也會產生自己的 class 結構），這裡維持跟 vanilla 版本
   對應的原始 CSS，比較好對照。 */
.dessert-swiper {
  position: relative;
  z-index: 1;
  width: calc(50% - 80px);
  height: calc(100vh - 160px);
  margin: 40px;
  border-radius: 2rem;
  overflow: hidden;
  /* vanilla 版本用的是 Swiper 的舊版 UMD 套件（swiper-bundle.css），沒有
     另外設定過導覽箭頭／分頁小點的顏色，用的就是那個版本的預設值（白色）。
     這裡改用官方 npm 套件後預設值不同（偏藍），用官方支援的 CSS 變數
     明確指定，比對出來的顏色才會一致。 */
  --swiper-navigation-color: #fff;
  --swiper-pagination-color: #fff;
}

@media (max-width: 1024px) {
  .dessert-swiper {
    width: 100%;
    /* 使用者實際用手機看過之後覺得原本的 60vh 太小、下面文字太快擠進來，
       希望「一屏對應一個功能」——輪播圖是進站看到的第一個功能，改成撐滿
       第一屏剩下的高度（扣掉 .split-section 在手機版的 100px 上邊距，
       這樣圖片下緣正好落在螢幕底部，往下滑才會進到下一個功能區塊）。
       跟 60vh 這個舊版直接搬過來的值不同，是這次刻意的設計調整。 */
    height: calc(100vh - 100px);
    margin: 0 0 24px;
    border-radius: 0;
    /* 對應 style.css 的 .swiper{order:1}：手機版上下堆疊時圖片要排在
       文字＋AI 問答上面，即使 DOM 順序（見 index.vue）文字在前、圖片在後。 */
    order: 1;
  }
}
</style>
