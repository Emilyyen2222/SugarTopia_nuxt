<script setup lang="ts">
// 對應 vanilla 版本 favorites.html + Js/favorites.js 的 renderFavoritesPage()。
// vanilla 版本這頁的卡片是直接重用 site-enhancements.js 的
// window.buildShopCardHtml()（跟 category.html 同一份產生器），這裡一樣
// 直接重用 ShopCard.vue，畫面才會跟分類頁的卡片長得一致。
//
// 這頁沒有側欄篩選、也沒有地圖（vanilla 版本的 .main-content 在這頁只有
// 一個 .favorites-page 子元素），所以 ShopCard 上如果店家有經緯度還是會
// 顯示「View on map」按鈕（跟 vanilla 版本一樣，buildShopCardHtml() 不知道
// 目前是哪個頁面），但點了不會有地圖可以捲動過去——這是 vanilla 版本原本
// 就有的行為，不是這次遷移漏做地圖。
import type { Shop } from "~/composables/useShops";

const { isLoggedIn } = useAuth();
const { getFavoriteShops } = useFavorites();

const loading = ref(true);
const failed = ref(false);
const errorMessage = ref("");
const favorites = ref<Shop[]>([]);
const activeShopId = ref<string | null>(null);

async function load() {
  if (!isLoggedIn.value) return;

  loading.value = true;
  failed.value = false;

  try {
    const data = await getFavoriteShops();
    favorites.value = data.shops;
  } catch (error) {
    failed.value = true;
    errorMessage.value = error instanceof Error ? error.message : "Request failed.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="mt-[120px] flex min-h-[calc(100vh-180px)] gap-5 px-5">
    <div class="min-w-0 flex-1">
      <template v-if="!isLoggedIn">
        <h1 class="mb-10 text-xl font-bold text-brand-brown">My Favorites</h1>
        <div class="rounded-2xl border border-brand-border bg-brand-cream p-7">
          <h2 class="mb-2 text-2xl text-brand-brown">Please log in first</h2>
          <p class="text-brand-brown-light">
            You need to be logged in to see your saved shops.
            <NuxtLink to="/login" class="text-brand-orange underline">Log in</NuxtLink>
          </p>
        </div>
      </template>

      <template v-else-if="loading">
        <h1 class="mb-10 text-xl font-bold text-brand-brown">My Favorites</h1>
        <p class="mb-[18px] mt-1 text-base text-brand-brown-light">Loading your saved shops...</p>
      </template>

      <template v-else-if="failed">
        <h1 class="mb-10 text-xl font-bold text-brand-brown">My Favorites</h1>
        <div class="rounded-2xl border border-brand-border bg-brand-cream p-7">
          <h2 class="mb-2 text-2xl text-brand-brown">Could not load your favorites</h2>
          <p class="text-brand-brown-light">{{ errorMessage }}</p>
        </div>
      </template>

      <template v-else-if="!favorites.length">
        <h1 class="mb-10 text-xl font-bold text-brand-brown">My Favorites</h1>
        <div class="rounded-2xl border border-brand-border bg-brand-cream p-7">
          <h2 class="mb-2 text-2xl text-brand-brown">No favorites yet</h2>
          <p class="text-brand-brown-light">
            Browse <NuxtLink to="/category" class="text-brand-orange underline">dessert shops</NuxtLink> and tap Save on the ones you like.
          </p>
        </div>
      </template>

      <template v-else>
        <h1 class="mb-10 text-xl font-bold text-brand-brown">My Favorites</h1>
        <p class="mb-[18px] mt-1 text-base text-brand-brown-light">
          {{ favorites.length }} shop{{ favorites.length === 1 ? "" : "s" }} saved
        </p>
        <div class="grid gap-6">
          <ShopCard
            v-for="(shop, index) in favorites"
            :key="shop.id"
            :shop="shop"
            :index="index"
            :is-active-on-map="activeShopId === shop.id"
            @view-on-map="activeShopId = shop.id"
          />
        </div>
      </template>
    </div>
  </div>
</template>
