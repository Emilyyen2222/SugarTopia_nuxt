<script setup lang="ts">
// 評論列表原本每個人的頭貼都是同一張寫死的哈士奇照片（/img/profile.jpg）
// ——網站沒有頭貼上傳功能，之前遷移時就是直接沿用 vanilla 版本的假資料。
// 這裡改成類似 Gravatar 預設樣式的做法：不用真的存照片，用姓名的第一個
// 字＋依姓名算出的固定顏色圓底，同一個人每次看到的顏色都一樣（不是每次
// 隨機换色），跟真的頭貼上傳比起來零後端/資料庫改動，缺點是終究不是
// 「真人照片」——真的想做到大頭貼上傳，需要另外存欄位、另外做上傳 API，
// 是更大的功能，先不做。
const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 50 });

// 用暖色調色盤（跟品牌橘/綠是同一個「溫暖甜點店」調性，不是隨便挑幾個
// 鮮豔色），姓名 hash 出一個固定 index，同一個名字永遠對應同一個顏色。
const PALETTE = ["#F9A726", "#5A8F29", "#C1666B", "#4A7C82", "#B08968", "#8A6BBE"];

function hashName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const initial = computed(() => props.name?.trim()?.[0]?.toUpperCase() || "?");
const bgColor = computed(() => PALETTE[hashName(props.name || "") % PALETTE.length]);
</script>

<template>
  <div
    class="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: bgColor,
      fontSize: `${size * 0.4}px`,
    }"
    :aria-label="name"
  >
    {{ initial }}
  </div>
</template>
