<script setup lang="ts">
// 內部用的店家收錄工具：搜尋 Google Places、選一筆結果、填分類/標籤，
// 加進 curated_shops（跟之前用 curl 手動加「朵朵嚐嚐貓咪中途咖啡廳」/
// 「小春日和 動物雜貨‧珈琲」那兩筆是同一組後端 API，這裡只是做成網頁版）。
//
// 只給自己用，不走 i18n（沒有切換語言的必要），畫面盡量簡單就好，
// 不是要給一般使用者看的頁面。
//
// 權限完全交給後端判斷（main.py 的 require_admin_user／ADMIN_EMAILS）：
// 這裡的 isLoggedIn 檢查只是「沒登入就不用白費力氣打 API」的體驗優化，
// 真正擋人的是後端——就算把這頁網址、甚至原始碼都看光光，沒有在
// ADMIN_EMAILS 白名單裡的帳號一樣會被後端擋下來（403）。
interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number | null;
  googleMapsUrl: string;
  lat: number;
  lng: number;
}

const { isLoggedIn } = useAuth();
const { apiFetch } = useApi();
const { show } = useSiteMessage();

const query = ref("");
const searching = ref(false);
const searchFailed = ref(false);
const forbidden = ref(false);
const results = ref<PlaceResult[]>([]);

// 每一筆搜尋結果各自的分類／標籤輸入框內容，用 placeId 當 key，
// 這樣同時展開好幾筆結果填資料也不會互相蓋掉。
const draftByPlaceId = reactive<Record<string, { category: string; categoryZh: string; tags: string; tagsZh: string }>>({});
const addingPlaceId = ref<string | null>(null);
const addedPlaceIds = reactive(new Set<string>());

function draftFor(placeId: string) {
  if (!draftByPlaceId[placeId]) {
    draftByPlaceId[placeId] = { category: "", categoryZh: "", tags: "", tagsZh: "" };
  }
  return draftByPlaceId[placeId];
}

async function search() {
  const q = query.value.trim();
  if (!q) return;

  searching.value = true;
  searchFailed.value = false;
  forbidden.value = false;
  results.value = [];

  try {
    const data = await apiFetch<{ total: number; places: PlaceResult[] }>(
      `/api/google/places/search?q=${encodeURIComponent(q)}`
    );
    results.value = data.places;
  } catch (error: any) {
    if (error?.response?.status === 403) {
      forbidden.value = true;
    } else {
      searchFailed.value = true;
    }
  } finally {
    searching.value = false;
  }
}

function splitTags(text: string) {
  return text
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function addShop(place: PlaceResult) {
  const draft = draftFor(place.placeId);
  addingPlaceId.value = place.placeId;

  try {
    await apiFetch("/api/shops/curated", {
      method: "POST",
      body: {
        place_id: place.placeId,
        category: draft.category.trim(),
        category_zh: draft.categoryZh.trim(),
        tags: splitTags(draft.tags),
        tags_zh: splitTags(draft.tagsZh),
      },
    });
    addedPlaceIds.add(place.placeId);
    show(`已加入：${place.name}`);
  } catch (error: any) {
    if (error?.response?.status === 403) {
      forbidden.value = true;
    } else {
      show("加入失敗，稍後再試一次。");
    }
  } finally {
    addingPlaceId.value = null;
  }
}
</script>

<template>
  <div class="mx-auto mt-[120px] min-h-[calc(100vh-180px)] max-w-[720px] px-5 pb-20">
    <h1 class="mb-2 text-xl font-bold text-brand-brown">店家收錄工具</h1>
    <p class="mb-8 text-sm text-brand-brown-light">
      搜尋 Google Places，把真實店家加進 SugarTopia 的資料庫。只有這個帳號本身有權限，其他登入的使用者打這支 API 會被擋下來。
    </p>

    <template v-if="!isLoggedIn">
      <div class="rounded-2xl border border-brand-border bg-brand-cream p-7">
        <h2 class="mb-2 text-lg text-brand-brown">請先登入</h2>
        <p class="text-brand-brown-light">
          這個頁面需要登入。
          <NuxtLink to="/login" class="text-brand-orange underline">去登入</NuxtLink>
        </p>
      </div>
    </template>

    <template v-else>
      <form class="mb-6 flex gap-2.5" @submit.prevent="search">
        <input
          v-model="query"
          type="text"
          placeholder="例如：貓咖 松山區 台北"
          class="min-w-0 flex-1 rounded-lg border border-brand-border px-4 py-2.5 text-sm text-brand-brown focus:border-brand-orange focus:outline-none"
        />
        <button
          type="submit"
          class="shrink-0 rounded-lg bg-brand-orange px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#e89615] disabled:opacity-50"
          :disabled="searching || !query.trim()"
        >
          {{ searching ? "搜尋中…" : "搜尋" }}
        </button>
      </form>

      <p v-if="forbidden" class="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        這個帳號沒有收錄店家的權限（後端擋下來了，不是前端的問題）。
      </p>
      <p v-else-if="searchFailed" class="text-sm text-red-600">搜尋失敗，稍後再試一次。</p>

      <div v-if="results.length" class="flex flex-col gap-4">
        <div
          v-for="place in results"
          :key="place.placeId"
          class="rounded-2xl border border-brand-border p-4"
          :class="addedPlaceIds.has(place.placeId) ? 'bg-brand-cream' : 'bg-white'"
        >
          <div class="mb-1 flex items-start justify-between gap-3">
            <h3 class="text-base font-bold text-brand-brown">{{ place.name }}</h3>
            <a :href="place.googleMapsUrl" target="_blank" rel="noopener" class="shrink-0 text-xs text-brand-orange underline">
              地圖
            </a>
          </div>
          <p class="mb-3 text-xs text-brand-brown-light">{{ place.address }}</p>
          <p class="mb-3 text-xs text-brand-green">
            {{ place.rating != null ? `★ ${place.rating}` : "尚無評分" }}
            <span v-if="place.reviewCount != null">（{{ place.reviewCount }} 則評論）</span>
          </p>

          <template v-if="addedPlaceIds.has(place.placeId)">
            <p class="text-sm font-medium text-brand-orange">已加入 SugarTopia ✓</p>
          </template>
          <template v-else>
            <div class="mb-2 grid grid-cols-2 gap-2">
              <input v-model="draftFor(place.placeId).category" type="text" placeholder="分類（英文，例如 Cat Cafe）" class="rounded-lg border border-brand-border px-3 py-2 text-xs text-brand-brown focus:border-brand-orange focus:outline-none" />
              <input v-model="draftFor(place.placeId).categoryZh" type="text" placeholder="分類（中文，例如 貓咖啡廳）" class="rounded-lg border border-brand-border px-3 py-2 text-xs text-brand-brown focus:border-brand-orange focus:outline-none" />
              <input v-model="draftFor(place.placeId).tags" type="text" placeholder="標籤（英文，逗號分隔）" class="rounded-lg border border-brand-border px-3 py-2 text-xs text-brand-brown focus:border-brand-orange focus:outline-none" />
              <input v-model="draftFor(place.placeId).tagsZh" type="text" placeholder="標籤（中文，逗號分隔）" class="rounded-lg border border-brand-border px-3 py-2 text-xs text-brand-brown focus:border-brand-orange focus:outline-none" />
            </div>
            <button
              type="button"
              class="rounded-lg bg-brand-brown px-4 py-2 text-xs font-medium text-white transition hover:bg-brand-brown/90 disabled:opacity-50"
              :disabled="addingPlaceId === place.placeId"
              @click="addShop(place)"
            >
              {{ addingPlaceId === place.placeId ? "加入中…" : "加入 SugarTopia" }}
            </button>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>
