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
const { t } = useI18n();

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
    const query = queryText.value || t("category.dessertShops");
    const location = locationText.value ? t("category.inLocation", { location: locationText.value }) : "";
    return t("category.searchResultsFor", { query }) + location;
  }
  return t("category.allShopsTitle");
});

// shopsFound／showNShops 沒有用 vue-i18n 內建的複數語法（{count} 那種
// pipe 分段格式），改成自己用 count 挑 key——這個專案裝的 vue-i18n 版本
// 內建複數的插值變數名稱沒查證過，與其賭一個沒把握的寫法，不如自己挑 key
// 這個做法肯定不會出錯，看得懂、也好維護。
function shopsFoundText(count: number) {
  if (count === 0) return t("category.shopsFoundZero");
  return t(count === 1 ? "category.shopsFoundOne" : "category.shopsFoundOther", { count });
}
function showNShopsText(count: number) {
  return t(count === 1 ? "category.showNShopsOne" : "category.showNShopsOther", { count });
}

async function load() {
  loading.value = true;
  loadFailed.value = false;

  try {
    shops.value = await fetchShops({ q: queryText.value, location: locationText.value });
  } catch {
    loadFailed.value = true;
    if (!shops.value.length) {
      show(t("category.demoDataWarning"));
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

const mapLabel = computed(() => (mapName.value ? `📍 ${t("category.showingOnMap", { name: mapName.value })}` : ""));

function applyRatingFilter(stars: number) {
  filterState.rating = stars;
  show(t("category.ratingFilterApplied", { stars }));
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

// value 是實際拿去打 API／比對店家資料用的英文字串（後端資料是英文），
// label 是畫面上顯示、會跟著語言切換的文字——這兩個故意分開，不能把 value
// 換成中文，不然篩選會直接找不到任何符合的店家（店家的 tags／category
// 欄位本身是英文，不會因為介面切成中文就跟著變）。
const sidebarCategories = [
  { value: "Cinnamon Rolls", labelKey: "category.filterCategories.cinnamonRolls" },
  { value: "Cheesecakes", labelKey: "category.filterCategories.cheesecakes" },
  { value: "Bagels", labelKey: "category.filterCategories.bagels" },
  { value: "Cafes", labelKey: "category.filterCategories.cafes" },
  { value: "Ice Creams", labelKey: "category.filterCategories.iceCreams" },
];
const featureOptions = [
  { value: "Hot and New", labelKey: "category.filterFeatures.hotAndNew" },
  { value: "Kids Friendly", labelKey: "category.filterFeatures.kidsFriendly" },
  { value: "Dogs Friendly", labelKey: "category.filterFeatures.dogsFriendly" },
  { value: "Alcohol Infused", labelKey: "category.filterFeatures.alcoholInfused" },
];
const ratingOptions = [5, 4, 3, 2, 1];

// 這頁專屬的搜尋框（跟共用 HeaderNav 上那個放大鏡是分開的兩件事——手機版
// header 空間太窄放不下輸入框，使用者點放大鏡進來這頁之後，真正打字搜尋
// 的地方是這裡）。用網址上的 q 帶初始值，輸入框跟網址保持同步。
const searchBoxQuery = ref(queryText.value);
watch(queryText, (value) => {
  searchBoxQuery.value = value;
});

function applySearchBox() {
  const q = searchBoxQuery.value.trim();
  router.push({ path: "/category", query: { ...route.query, q: q || undefined } });
}

// 窄螢幕（map-hide 斷點，880px）Filters 不再用側欄，改成點「Filters」按鈕
// 從畫面下方滑出一片浮層（bottom sheet）蓋在頁面上面，關掉就直接收回去，
// 不會像側欄那樣把店家列表往下推。桌機版維持原本一直展開的側欄，兩者是
// 完全獨立的兩塊 DOM（見下面模板），不共用同一個開關狀態的顯示邏輯。
const filtersOpen = ref(false);
function toggleFilters() {
  filtersOpen.value = true;
}
function closeFilters() {
  filtersOpen.value = false;
}
</script>

<template>
  <!-- map-hide（880px）以下：地圖本來就會整個隱藏（見下面 map-hide:hidden），
       這裡順便讓外層改成上下堆疊，Filters 側欄也跟著從左右並排收成上下排列——
       兩者是同一個問題（螢幕太窄，容不下三欄並排），共用同一個斷點判斷。 -->
  <div class="mt-[120px] flex min-h-[calc(100vh-180px)] gap-5 px-5 map-hide:flex-col">
    <!-- 篩選側欄：桌機版（>880px）維持原本一直展開的樣子，窄螢幕整個隱藏
         （改用下面的 bottom sheet，兩塊 DOM 完全分開，不共用開關狀態）。 -->
    <aside
      class="ml-5 w-[200px] shrink-0 sticky top-[100px] h-[calc(100vh-120px)] overflow-y-auto bg-white p-5 map-hide:hidden"
    >
      <p class="mb-5 text-[1.125rem] font-bold text-brand-brown">{{ t("category.filters") }}</p>

      <div class="mb-5">
        <p class="mb-2.5 text-sm font-bold text-brand-brown">{{ t("category.rating") }}</p>
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
        <p class="mb-2.5 text-sm font-bold text-brand-brown">{{ t("category.categoryLabel") }}</p>
        <div class="flex flex-wrap gap-2.5">
          <button
            v-for="category in sidebarCategories"
            :key="category.value"
            type="button"
            class="rounded-[20px] border-2 border-brand-orange px-2 py-1 text-sm text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
            @click="applyCategoryFilter(category.value)"
          >
            {{ t(category.labelKey) }}
          </button>
          <a href="#" class="text-sm text-brand-orange hover:underline" @click.prevent="show(t('common.demoPlaceholder'))">
            {{ t("category.seeMore") }}
          </a>
        </div>
      </div>

      <div class="mb-5">
        <p class="mb-2.5 text-sm font-bold text-brand-brown">{{ t("category.features") }}</p>
        <div class="flex flex-col gap-2.5">
          <label v-for="feature in featureOptions" :key="feature.value" class="text-sm text-brand-orange">
            <input type="checkbox" @change="toggleFeature(feature.value, ($event.target as HTMLInputElement).checked)" />
            {{ t(feature.labelKey) }}
          </label>
        </div>
      </div>
    </aside>

    <!-- 窄螢幕（map-hide 以下）Filters：從畫面下方滑出的浮層蓋在頁面上面，
         關掉直接收回去，不會像側欄那樣把下面的店家列表往下推。跟上面桌機
         版側欄內容重複，是刻意分開維護的兩塊（各自的容器/排版需求不同：
         一個是常駐側欄，一個是可滾動、有固定底部按鈕的浮層），不是遷移
         疏漏。 -->
    <div v-if="filtersOpen" class="fixed inset-0 z-50 hidden map-hide:flex">
      <div class="absolute inset-0 bg-brand-brown/45" @click="closeFilters" />
      <div class="relative mt-auto flex max-h-[78vh] w-full flex-col rounded-t-[20px] bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
        <div class="flex justify-center pt-2.5">
          <div class="h-1 w-10 rounded-full bg-[#ddd]" />
        </div>
        <div class="flex items-center justify-between px-5 pb-1 pt-3.5">
          <h2 class="text-[1.0625rem] font-bold text-brand-brown">{{ t("category.filters") }}</h2>
          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f5f5]" @click="closeFilters">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6F5B49" stroke-width="2.5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-5 pt-3">
          <div class="mb-5">
            <p class="mb-2.5 text-sm font-bold text-brand-brown">{{ t("category.rating") }}</p>
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
            <p class="mb-2.5 text-sm font-bold text-brand-brown">{{ t("category.categoryLabel") }}</p>
            <div class="flex flex-wrap gap-2.5">
              <button
                v-for="category in sidebarCategories"
                :key="category.value"
                type="button"
                class="rounded-[20px] border-2 border-brand-orange px-2 py-1 text-sm text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
                @click="applyCategoryFilter(category.value)"
              >
                {{ t(category.labelKey) }}
              </button>
              <a href="#" class="text-sm text-brand-orange hover:underline" @click.prevent="show(t('common.demoPlaceholder'))">
                {{ t("category.seeMore") }}
              </a>
            </div>
          </div>

          <div class="mb-5">
            <p class="mb-2.5 text-sm font-bold text-brand-brown">{{ t("category.features") }}</p>
            <div class="flex flex-col gap-2.5">
              <label v-for="feature in featureOptions" :key="feature.value" class="text-sm text-brand-orange">
                <input type="checkbox" @change="toggleFeature(feature.value, ($event.target as HTMLInputElement).checked)" />
                {{ t(feature.labelKey) }}
              </label>
            </div>
          </div>
        </div>

        <div class="border-t border-[#eee] px-5 py-3.5">
          <button
            type="button"
            class="h-12 w-full rounded-lg bg-brand-orange text-[0.9375rem] font-semibold text-white"
            @click="closeFilters"
          >
            {{ showNShopsText(results.length) }}
          </button>
        </div>
      </div>
    </div>

    <!-- 搜尋結果 -->
    <section class="min-w-0 flex-1">
      <template v-if="loading">
        <h1 class="mb-10 text-xl font-bold text-brand-brown">{{ t("category.loadingTitle") }}</h1>
        <p class="mb-[18px] mt-1 text-base text-brand-brown-light">{{ t("category.loadingBody") }}</p>
      </template>
      <template v-else-if="loadFailed && !shops.length">
        <h1 class="mb-10 text-xl font-bold text-brand-brown">{{ t("category.emptyTitle") }}</h1>
        <p class="mb-[18px] mt-1 text-base text-brand-brown-light">{{ t("category.emptyBody") }}</p>
      </template>
      <template v-else>
        <h1 class="mb-10 text-xl font-bold text-brand-brown">{{ title }}</h1>

        <!-- 這頁專屬的搜尋框，只有這一頁有，跟共用 header 上的放大鏡分開。
             手機版點 header 放大鏡進來這頁後，這裡才是真正能打字搜尋的地方。
             只在窄螢幕（跟 Filters 按鈕同一個 map-hide 斷點）顯示——桌機版
             header 本來就有可以打字的搜尋框，這裡再放一個會變成兩個功能
             重複的搜尋框，沒有必要。 -->
        <div class="relative mb-3.5 hidden map-hide:block">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6F5B49"
            stroke-width="2.3"
            class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="searchBoxQuery"
            type="text"
            :placeholder="t('category.searchPlaceholder')"
            class="h-12 w-full rounded-lg border border-[#ddd] pl-10 pr-4 text-sm text-brand-brown outline-none"
            @keydown.enter="applySearchBox"
          />
        </div>

        <div class="mb-5 flex items-center justify-between">
          <!-- 篩選按鈕只在 Filters 側欄收合成按鈕的窄螢幕（map-hide 以下）才
               顯示；桌機版側欄本來就一直展開著，不需要這顆按鈕。 -->
          <button
            type="button"
            class="hidden items-center gap-1.5 rounded-[20px] border-2 border-brand-orange px-3.5 py-1.5 text-sm font-semibold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white map-hide:flex"
            @click="toggleFilters"
          >
            {{ t("category.filters") }}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <p class="text-base text-brand-brown-light">
            {{ shopsFoundText(results.length) }}
          </p>
        </div>

        <div v-if="!results.length" class="rounded-2xl border border-brand-border bg-brand-cream p-7">
          <h2 class="mb-2 text-2xl text-brand-brown">{{ t("category.noMatchTitle") }}</h2>
          <p class="text-base text-brand-brown-light">{{ t("category.noMatchBody") }}</p>
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
