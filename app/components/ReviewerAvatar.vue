<script setup lang="ts">
// 評論列表原本每個人的頭貼都是同一張寫死的哈士奇照片（/img/profile.jpg）
// ——網站原本沒有頭貼上傳功能，之前遷移時就是直接沿用 vanilla 版本的假
// 資料。後來補上了真的大頭貼上傳（POST /api/users/me/avatar），但不是
// 每個使用者都會去上傳——avatarUrl 是 null（沒上傳過）時，還是退回類似
// Gravatar 預設樣式的做法：用姓名的第一個字＋依姓名算出的固定顏色圓底，
// 同一個人每次看到的顏色都一樣（不是每次隨機换色）。
const props = withDefaults(defineProps<{ name: string; avatarUrl?: string | null; size?: number }>(), {
  avatarUrl: null,
  size: 50,
});

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
  <img
    v-if="avatarUrl"
    :src="avatarUrl"
    :alt="name"
    class="shrink-0 rounded-full object-cover"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
  <div
    v-else
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
