<script setup lang="ts">
// 對應 vanilla 版本 shop_detail.html + Js/site-enhancements.js 的
// loadShopDetail() + Js/favorites.js 的 setupSaveButton() + Js/reviews.js
// 的 renderShopReviews()。
//
// 重要：shop_detail.html 檔案裡寫死的那些評論內容（含評論者所在地、
// 24 張照片、15 則評論這種統計數字、評論照片九宮格、Helpful/Thanks/Save/
// Share 這排按鈕）只是頁面還沒載入完成前的靜態佔位內容，真正串上後端資料
// 後（renderShopReviews()），畫面會被換成簡單很多的版本——評論者只有大頭貼
// 跟姓名、日期搬到姓名下面那個 <p> 裡（借用同一個標籤，不是原本顯示地區
// 用的那個），星等跟評論文字，其餘（地區、照片、統計數字、按鈕列）通通沒有
// 對應的後端欄位、也從來不會被真正的使用者看到。這裡照真正會被使用者看到
// 的動態版本遷移，不是照靜態佔位內容。
//
// business-info（營業時間／官網／電話／地址）在 vanilla 版本裡也是完全
// 寫死的假資料，loadShopDetail() 從頭到尾沒有更新這幾個欄位，所以不管
// 點進來的是哪間真實店家，看到的都是同一組肉桂捲工作室的假營業資訊。
// 這裡照樣忠實遷移這個既有的「有點怪」的行為，沒有偷偷幫它補真的資料
// （後端 shop 物件本來就沒有 hours/website/phone/address 這些欄位）。
import type { Shop } from "~/composables/useShops";

const route = useRoute();
const { fetchShop, buildStars } = useShops();
const { getFavoriteShops, addFavorite, removeFavorite } = useFavorites();
const { getShopReviews, formatDate } = useReviews();
const { isLoggedIn } = useAuth();
const { show } = useSiteMessage();
const { t } = useI18n();

const shopId = computed(() => route.params.id as string);
const shop = ref<Shop | null>(null);
const notFound = ref(false);
const loading = ref(true);

const reviews = ref<Awaited<ReturnType<typeof getShopReviews>>["reviews"]>([]);
const reviewsLoading = ref(true);
const reviewsFailed = ref(false);

const isFavorited = ref(false);
const saveBusy = ref(false);

async function loadShop() {
  loading.value = true;
  notFound.value = false;

  try {
    shop.value = await fetchShop(shopId.value);
  } catch {
    notFound.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadReviews() {
  reviewsLoading.value = true;
  reviewsFailed.value = false;

  try {
    const data = await getShopReviews(shopId.value);
    reviews.value = data.reviews;
  } catch {
    reviewsFailed.value = true;
  } finally {
    reviewsLoading.value = false;
  }
}

async function loadFavoriteState() {
  if (!isLoggedIn.value) return;

  try {
    const data = await getFavoriteShops();
    isFavorited.value = data.shops.some((favorite) => favorite.id === shopId.value);
  } catch {
    // 抓不到收藏清單就維持預設的「未收藏」樣式，不擋住其他功能（跟 vanilla 版本一樣）。
  }
}

async function toggleSave() {
  if (!isLoggedIn.value) {
    show(t("shop.loginToSaveToast"));
    await navigateTo("/login");
    return;
  }

  saveBusy.value = true;

  try {
    if (isFavorited.value) {
      await removeFavorite(shopId.value);
      isFavorited.value = false;
      show(t("shop.removedFromFavorites"));
    } else {
      await addFavorite(shopId.value);
      isFavorited.value = true;
      show(t("shop.savedToFavorites"));
    }
  } catch (error) {
    show(error instanceof Error ? error.message : t("shop.requestFailed"));
  } finally {
    saveBusy.value = false;
  }
}

watch(
  shopId,
  async () => {
    await loadShop();
    if (!notFound.value) {
      await Promise.all([loadReviews(), loadFavoriteState()]);
    }
  },
  { immediate: true }
);

const writeReviewHref = computed(() => `/write-review${shop.value ? `?id=${encodeURIComponent(shop.value.id)}` : ""}`);
</script>

<template>
  <section class="mx-auto mt-24 max-w-[1100px] px-5">
    <template v-if="loading">
      <p class="py-10 text-center text-brand-brown-light">{{ t("shop.loading") }}</p>
    </template>

    <template v-else-if="notFound">
      <div class="flex items-start gap-2">
        <div class="flex-1 rounded-[20px] bg-[#FCDC94] p-[30px] shadow-[0_4px_15px_rgba(0,0,0,0.05)]">
          <h1 class="mb-4 text-xl font-bold text-brand-brown">{{ t("shop.notFoundTitle") }}</h1>
          <p class="text-brand-brown">
            {{ t("shop.notFoundBody") }}
            <NuxtLink to="/category" class="text-brand-orange underline">{{ t("shop.browseAllShops") }}</NuxtLink>.
          </p>
        </div>
      </div>
    </template>

    <template v-else-if="shop">
      <!-- 店家標題區塊 -->
      <div class="flex items-stretch gap-2 detail-md:flex-col">
        <div class="relative flex-1 overflow-hidden rounded-[20px] bg-[#FCDC94] p-[30px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] detail-md:w-full detail-xs:mx-2.5 detail-xs:w-auto">
          <h1 class="mb-[15px] text-[0.8rem] font-bold text-brand-brown">{{ shop.name }}</h1>
          <p class="text-base text-brand-brown">{{ shop.description }}</p>

          <!-- 跟 vanilla 版本一樣：style.css 有一條全站通用的 `.rating span`
               規則（specificity 比 shop_detail.css 自己那條 `.stars` 規則高，
               因為多了一層元素選擇器），會蓋掉這裡原本想要的橘色大字星星，
               變成綠色、x-small（約 10px）的小字——這是既有的 CSS cascade
               巧合，不是我這次遷移引入的，照實際渲染結果忠實遷移。 -->
          <div class="mb-[15px] flex items-center gap-2">
            <span class="text-[10px] text-brand-green">{{ buildStars(shop.rating) }}</span>
            <span class="text-[10px] text-brand-green">{{ shop.rating }}</span>
          </div>

          <div class="mb-[15px] flex flex-wrap gap-2.5">
            <span v-for="tag in shop.tags" :key="tag" class="rounded-[20px] bg-[#f5f5f5] px-3 py-[5px] text-[0.875rem] text-[#666]">
              {{ tag }}
            </span>
          </div>

          <!-- 跟 vanilla 版本一樣：這整塊營業資訊是固定的示範內容，不是這間店的真實資料。 -->
          <div class="text-[0.9375rem] text-brand-brown">
            <div class="p-[5px]">
              <span>{{ t("shop.closed") }}</span>
              <span class="ml-1">11:30 AM-7:30 PM</span>
              <a href="#" class="pl-[5px] text-[#FFA518]" @click.prevent="show(t('shop.seeHoursToast'))">{{ t("shop.seeHours") }}</a>
            </div>
            <div class="p-[5px]">cinnamonrollsstudio.com.tw</div>
            <div class="p-[5px]">02-2250 5431</div>
            <div class="p-[5px]">
              <strong>{{ t("shop.getDirections") }}</strong>
              <p>No. 5, Lane 500, Section 1, Neihu Rd, Neihu District, Taipei City, 114</p>
            </div>
          </div>
        </div>

        <div class="w-64 shrink-0 rounded-[20px] bg-[#FCDC94] p-[15px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] detail-md:mt-5 detail-md:w-full detail-sm:mx-auto detail-sm:max-w-[80%]">
          <img
            :src="resolveShopImage(shop.image)"
            :alt="shop.name"
            class="h-full min-h-[220px] w-full rounded-xl object-cover transition-transform duration-300 hover:scale-[1.02]"
          />
        </div>
      </div>

      <!-- 操作按鈕區 -->
      <div class="my-[30px] flex flex-nowrap justify-start gap-[15px] detail-md:overflow-x-auto detail-md:pb-2.5">
        <NuxtLink
          :to="writeReviewHref"
          class="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-brand-orange px-6 py-3 text-[0.9375rem] text-white no-underline transition hover:-translate-y-0.5 hover:bg-[#e89615]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          {{ t("shop.writeReview") }}
        </NuxtLink>
        <button
          type="button"
          class="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-brand-orange px-6 py-3 text-[0.9375rem] text-white transition hover:-translate-y-0.5 hover:bg-[#e89615]"
          @click="show(t('shop.addPhotoToast'))"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
          {{ t("shop.addPhoto") }}
        </button>
        <button
          type="button"
          class="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-brand-orange px-6 py-3 text-[0.9375rem] text-white transition hover:-translate-y-0.5 hover:bg-[#e89615]"
          @click="show(t('shop.shareToast'))"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
          {{ t("shop.share") }}
        </button>
        <button
          type="button"
          class="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-6 py-3 text-[0.9375rem] transition hover:-translate-y-0.5 disabled:opacity-60"
          :class="isFavorited ? 'bg-brand-brown text-white hover:bg-brand-brown-hover' : 'bg-brand-orange text-white hover:bg-[#e89615]'"
          :disabled="saveBusy"
          @click="toggleSave"
        >
          <svg viewBox="0 0 24 24" :fill="isFavorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" /></svg>
          {{ isFavorited ? t("shop.saved") : t("shop.save") }}
        </button>
      </div>

      <!-- 評論區塊 -->
      <section class="my-10">
        <div class="mb-[30px] flex flex-wrap items-center justify-between gap-3">
          <!-- 跟前面 .review-text 一樣：shop_detail.css 檔案尾端有一段重複的
               `.reviews-section h2` 規則（specificity 打平、但因為在檔案裡
               寫在更後面所以贏），把這裡原本想要的 1.25rem/600 蓋成 0.8rem。 -->
          <h2 class="text-[0.8rem] font-semibold text-brand-brown">{{ t("shop.recommendedReviews") }}</h2>
          <!-- 跟 vanilla 版本一樣：這兩顆按鈕沒有真的排序功能，Highest Rated
               永遠顯示成 active，後端 API 也只支援依時間排序，不支援依評分排序。
               圓角刻意跟 vanilla 版本不一樣（原本是 30px 全圓）：使用者覺得緊貼在
               上面 8px 方正的 Write a review 那排按鈕下面，兩種圓角放這麼近看起來
               不協調，要求改成跟那排一致的 8px，其餘 tag／卡片維持原本的圓角
               不動——這是刻意的風格調整，不是遷移疏漏。 -->
          <div class="flex gap-[15px]">
            <button type="button" class="flex items-center gap-2 rounded-lg border border-brand-orange bg-brand-orange px-5 py-2.5 text-[0.9375rem] text-white">
              <svg viewBox="0 0 24 24" fill="currentColor" class="h-3.5 w-3.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" /></svg>
              {{ t("shop.highestRated") }}
            </button>
            <button type="button" class="flex items-center gap-2 rounded-lg border border-[#ddd] bg-white px-5 py-2.5 text-[0.9375rem] text-[#666] transition hover:-translate-y-0.5 hover:bg-[#f5f5f5]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
              {{ t("shop.mostRecent") }}
            </button>
          </div>
        </div>

        <template v-if="reviewsLoading">
          <p class="text-brand-brown-light">{{ t("shop.reviewsLoading") }}</p>
        </template>
        <template v-else-if="reviewsFailed">
          <p class="text-brand-brown-light">{{ t("shop.reviewsFailed") }}</p>
        </template>
        <template v-else-if="!reviews.length">
          <div class="rounded-2xl border border-brand-border bg-brand-cream p-7">
            <h2 class="mb-2 text-2xl text-brand-brown">{{ t("shop.noReviewsTitle") }}</h2>
            <p class="text-brand-brown-light">
              {{ t("shop.beFirstPrefix") }}
              <NuxtLink :to="writeReviewHref" class="text-brand-orange underline">{{ t("home.writeAReview") }}</NuxtLink>
              {{ t("shop.beFirstSuffixFor", { shopName: shop.name }) }}
            </p>
          </div>
        </template>
        <div v-else class="flex flex-col gap-[30px]">
          <div v-for="review in reviews" :key="review.id" data-testid="review-item" class="rounded-xl bg-white p-[15px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-transform duration-300 hover:-translate-y-[5px]">
            <div class="w-[200px]">
              <img src="/img/profile.jpg" :alt="review.reviewerName" class="mb-[15px] h-[70px] w-[70px] rounded-full border-[3px] border-brand-orange object-cover" />
              <div>
                <h4 class="mb-[5px] text-[18px] text-brand-brown">{{ review.reviewerName }}</h4>
                <p class="mb-2.5 text-sm text-[#666]">{{ formatDate(review.createdAt) }}</p>
              </div>
            </div>
            <div>
              <div class="mb-[15px] flex items-center gap-[15px]">
                <div class="text-[20px] tracking-[2px] text-brand-orange">{{ buildStars(review.rating) }}</div>
              </div>
              <!-- 跟 vanilla 版本一樣：shop_detail.css 裡另一條給「reviews-grid」
                   卡片用的 `.review-item p` 規則（specificity 比 `.review-text`
                   高）蓋掉了這裡原本想要的樣式，實際渲染出來是 13px 灰色，
                   不是設計稿看起來想要的 16px 深咖啡色。照實際結果遷移。 -->
              <p class="mb-5 text-[0.8125rem] leading-[1.6] text-[#666]">{{ review.text }}</p>
            </div>
          </div>
        </div>

        <!-- 跟 vanilla 版本一樣：分頁導航是裝飾用的，沒有真的分頁功能
             （後端評論 API 一次回傳全部評論，沒有分頁參數）。 -->
        <div class="mt-10 flex items-center justify-center gap-2.5 py-5">
          <a href="#" class="flex h-10 w-10 items-center justify-center rounded-full border border-[#ddd] text-brand-brown transition hover:-translate-y-0.5 hover:bg-[#f5f5f5]" @click.prevent="show(t('common.demoPlaceholder'))">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M15 18l-6-6 6-6" /></svg>
          </a>
          <a
            v-for="n in 6"
            :key="n"
            href="#"
            class="flex h-10 w-10 items-center justify-center rounded-full border text-[0.9375rem] no-underline transition"
            :class="n === 1 ? 'border-brand-orange bg-brand-orange text-white' : 'border-[#ddd] text-brand-brown hover:-translate-y-0.5 hover:bg-[#f5f5f5]'"
            @click.prevent="show(t('common.demoPlaceholder'))"
          >
            {{ n }}
          </a>
          <a href="#" class="flex h-10 w-10 items-center justify-center rounded-full border border-[#ddd] text-brand-brown transition hover:-translate-y-0.5 hover:bg-[#f5f5f5]" @click.prevent="show(t('common.demoPlaceholder'))">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M9 18l6-6-6-6" /></svg>
          </a>
        </div>
      </section>
    </template>
  </section>
</template>
