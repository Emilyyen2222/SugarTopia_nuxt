<script setup lang="ts">
// 對應 vanilla 版本的 .nav-categories／setupCategoriesMenu()
// （Js/site-enhancements.js）：點擊切換、點外面關閉、按 Escape 關閉。
// 在 Vue 裡這些行為變成元件自己的 state + onMounted 監聽，不用像 vanilla
// 版本那樣手動查詢 DOM、切換 class。

const categories = [
  { label: "Cinnamon Rolls", query: "Cinnamon Rolls" },
  { label: "Ice Creams", query: "Ice Creams" },
  { label: "Bagels", query: "Bagels" },
  { label: "Cheese Cakes", query: "Cheesecakes" },
  { label: "Macaron", query: "Macaron" },
  { label: "Cafes", query: "Cafes" },
  { label: "Dog Friendly", query: "Dogs Friendly" },
  { label: "Alcohol Infused", query: "Alcohol" },
];

const isOpen = ref(false);
const rootEl = ref<HTMLElement | null>(null);

function toggle() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(event.target as Node)) {
    close();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div ref="rootEl" class="nav-categories relative" :class="{ 'is-open': isOpen }">
    <button
      type="button"
      class="nav-categories-toggle flex items-center gap-2 bg-transparent px-1 py-2 font-medium text-brand-brown hover:text-brand-gold"
      @click.stop="toggle"
    >
      Categories
      <svg
        class="shrink-0 transition-transform duration-150"
        :class="{ 'rotate-180': isOpen }"
        width="12"
        height="8"
        viewBox="0 0 12 8"
        fill="none"
      >
        <path
          d="M1 1.5L6 6.5L11 1.5"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="nav-categories-panel absolute left-0 top-[calc(100%+8px)] z-[1100] grid w-[360px] grid-cols-2 gap-1 rounded-2xl border border-brand-panel bg-white p-4 shadow-[0_12px_32px_rgba(58,37,19,0.18)]"
    >
      <NuxtLink
        v-for="category in categories"
        :key="category.query"
        :to="`/category?q=${encodeURIComponent(category.query)}`"
        class="block rounded-[10px] px-3 py-2.5 text-[0.9375rem] font-medium text-brand-brown hover:bg-brand-hover"
        @click="close"
      >
        {{ category.label }}
      </NuxtLink>
    </div>
  </div>
</template>
