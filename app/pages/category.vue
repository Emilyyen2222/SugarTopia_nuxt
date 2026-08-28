<script setup lang="ts">
// 對應 vanilla 版本 category.html + Js/site-enhancements.js 裡跟分類頁
// 有關的部分（renderShopList()、setupFilters()、focusFirstShopOnMap()、
// selectShopOnMap()）。
//
// q／location 這兩個篩選條件是伺服器端做的（GET /api/shops?q=...&location=...，
// 見後端 main.py 的 get_shops()），所以網址查詢字串一變就要重新打 API；
// rating／features 這兩種篩選後端沒有對應欄位，維持在前端做（跟 vanilla
// 版本一樣），用 computed 從已經抓回來的資料裡再篩一次，不用重新打 API。
import type { Shop } from "~/composables/useShops";

const route = useRoute();
const router = useRouter();
const { fetchShops } = useShops();
const { show } = useSiteMessage();

const shops = ref<Shop[]>([]);
const loading = ref(true);
const loadFailed = ref(false);

const filterState = reactive({
  rating: 0,
  features: [] as string[],
});

const activeShopId = ref<string | null>(null);
const mapLat = ref<number | null>(null);
const mapLng = ref<number | null>(null);
const mapName = ref("");
const mapEmbedEl = ref<HTMLIFrameElement | null>(null);

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function shopMatches(shop: Shop) {
  const searchable = normalize(
    [shop.name, shop.category, shop.location, shop.description, shop.tags.join(" ")].join(" ")
  );
  const matchesRating = !filterState.rating || shop.rating >= filterState.rating;
  const matchesFeatures = filterState.features.every((feature) => searchable.includes(normalize(feature)));
  return matchesRating && matchesFeatures;
}

const results = computed(() => shops.value.filter(shopMatches));

const queryText = computed(() => (route.query.q as string) || "");
const locationText = computed(() => (route.query.location as string) || "");

const title = computed(() => {
  if (queryText.value || locationText.value) {
    return `Search results for ${queryText.value || "dessert shops"}${locationText.value ? ` in ${locationText.value}` : ""}`;
  }
  return "All dessert shops and cafes in Taipei";
});

async function load() {
  loading.value = true;
  loadFailed.value = false;

  try {
    shops.value = await fetchShops({ q: queryText.value, location: locationText.value });
  } catch {
    loadFailed.value = true;
    if (!shops.value.length) {
      show("Using demo shop data because the backend shop API is unavailable.");
    }
  } finally {
    loading.value = false;
  }
}

watch([queryText, locationText], load, { immediate: true });

function selectShop(shop: Shop, scroll = false) {
  if (shop.lat == null || shop.lng == null) return;

  mapLat.value = shop.lat;
  mapLng.value = shop.lng;
  mapName.value = shop.name;
  activeShopId.value = shop.id;

  if (scroll) {
    mapEmbedEl.value?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// 跟 vanilla 版本一樣：每次篩選結果變動（不管是換頁、換 q，還是切換
// rating／features），地圖都會自動 focus 到目前結果裡第一間有經緯度的店。
watch(
  results,
  (list) => {
    const first = list.find((shop) => shop.lat != null && shop.lng != null);
    if (first) selectShop(first);
  },
  { immediate: true }
);

const mapSrc = computed(() => {
  if (mapLat.value != null && mapLng.value != null) {
    return `https://www.google.com/maps?q=${mapLat.value},${mapLng.value}&z=16&output=embed`;
  }
  return "https://www.google.com/maps?q=25.0504032,121.5182723&z=13&output=embed";
});

const mapLabel = computed(() => (mapName.value ? `📍 Showing on map: ${mapName.value}` : ""));

function applyRatingFilter(stars: number) {
  filterState.rating = stars;
  show(`Showing shops rated ${stars} stars and up.`);
}

function applyCategoryFilter(category: string) {
  // 側欄分類按鈕的行為要跟首頁 Categories 磚一致：直接換成「只看這個
  // 分類」，不是疊加在目前網址已經有的 q 之上（疊加會變成同時要符合兩個
  // 分類，結果通常是 0 筆）。見 vanilla 版本 setupFilters() 裡同一段註解。
  router.push({ path: "/category", query: { q: category } });
}

function toggleFeature(feature: string, checked: boolean) {
  if (checked) {
    if (!filterState.features.includes(feature)) filterState.features.push(feature);
  } else {
    filterState.features = filterState.features.filter((item) => item !== feature);
  }
}

const sidebarCategories = ["Cinnamon Rolls", "Cheesecakes", "Bagels", "Cafes", "Ice Creams"];
const featureOptions = ["Hot and New", "Kids Friendly", "Dogs Friendly", "Alcohol Infused"];
const ratingOptions = [5, 4, 3, 2, 1];
</script>

<template>
  <!-- map-hide（880px）以下：地圖本來就會整個隱藏（見下面 map-hide:hidden），
       這裡順便讓外層改成上下堆疊，Filters 側欄也跟著從左右並排收成上下排列——
       兩者是同一個問題（螢幕太窄，容不下三欄並排），共用同一個斷點判斷。 -->
  <div class="mt-[120px] flex min-h-[calc(100vh-180px)] gap-5 px-5 map-hide:flex-col">
    <!-- 篩選側欄 -->
    <aside
      class="ml-5 w-[200px] shrink-0 sticky top-[100px] h-[calc(100vh-120px)] overflow-y-auto bg-white p-5 map-hide:static map-hide:ml-0 map-hide:h-auto map-hide:w-full"
    >
      <p class="mb-5 text-[1.125rem] font-bold text-brand-brown">Filters</p>

      <div class="mb-5">
        <p class="mb-2.5 text-sm font-bold text-brand-brown">Rating</p>
        <div class="flex flex-col gap-2">
          <button
            v-for="stars in ratingOptions"
            :key="stars"
            type="button"
            class="w-[140px] rounded-[20px] border-2 border-brand-orange px-0.5 py-0.5 text-sm text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
            @click="applyRatingFilter(stars)"
          >
            {{ "★".repeat(stars) + "☆".repeat(5 - stars) }}
          </button>
        </div>
      </div>

      <div class="mb-5">
        <p class="mb-2.5 text-sm font-bold text-brand-brown">Category</p>
        <div class="flex flex-wrap gap-2.5">
          <button
            v-for="category in sidebarCategories"
            :key="category"
            type="button"
            class="rounded-[20px] border-2 border-brand-orange px-2 py-1 text-sm text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
            @click="applyCategoryFilter(category)"
          >
            {{ category }}
          </button>
          <a href="#" class="text-sm text-brand-orange hover:underline" @click.prevent="show('This section is a demo placeholder for now.')">
            See more
          </a>
        </div>
      </div>

      <div class="mb-5">
        <p class="mb-2.5 text-sm font-bold text-brand-brown">Features</p>
        <div class="flex flex-col gap-2.5">
          <label v-for="feature in featureOptions" :key="feature" class="text-sm text-brand-orange">
            <input type="checkbox" @change="toggleFeature(feature, ($event.target as HTMLInputElement).checked)" />
            {{ feature }}
          </label>
        </div>
      </div>
    </aside>

    <!-- 搜尋結果 -->
    <section class="min-w-0 flex-1">
      <template v-if="loading">
        <h1 class="mb-10 text-xl font-bold text-brand-brown">Loading dessert shops...</h1>
        <p class="mb-[18px] mt-1 text-base text-brand-brown-light">Fetching shop data from SugarTopia backend.</p>
      </template>
      <template v-else-if="loadFailed && !shops.length">
        <h1 class="mb-10 text-xl font-bold text-brand-brown">No dessert shops yet</h1>
        <p class="mb-[18px] mt-1 text-base text-brand-brown-light">Shop data is not available right now.</p>
      </template>
      <template v-else>
        <h1 class="mb-10 text-xl font-bold text-brand-brown">{{ title }}</h1>
        <p class="mb-[18px] mt-1 text-base text-brand-brown-light">
          {{ results.length }} shop{{ results.length === 1 ? "" : "s" }} found
        </p>

        <div v-if="!results.length" class="rounded-2xl border border-brand-border bg-brand-cream p-7">
          <h2 class="mb-2 text-2xl text-brand-brown">No matching dessert shops yet</h2>
          <p class="text-base text-brand-brown-light">Try another flavor, category, or Taipei area.</p>
        </div>

        <div v-else class="grid gap-6">
          <ShopCard
            v-for="(shop, index) in results"
            :key="shop.id"
            :shop="shop"
            :index="index"
            :is-active-on-map="activeShopId === shop.id"
            @view-on-map="selectShop(shop, true)"
          />
        </div>
      </template>
    </section>

    <!-- 地圖 -->
    <div class="mb-10 w-[400px] shrink-0 sticky top-[100px] h-[600px] map-hide:hidden">
      <p class="mb-2 min-h-5 px-1 text-sm font-semibold text-brand-brown">{{ mapLabel }}</p>
      <iframe
        id="shopMapEmbed"
        ref="mapEmbedEl"
        :src="mapSrc"
        title="Shop location map"
        class="h-[600px] w-full rounded-lg border-0"
        allowfullscreen
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
      />
    </div>
  </div>

  <ScrollToTopButton />
</template>
