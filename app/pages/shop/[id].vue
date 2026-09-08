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
// business-info（營業時間／官網／電話／地址）原本是完全寫死的假資料，
// 不管點進來的是哪間真實店家，看到的都是同一組肉桂捲工作室的假營業
// 資訊——這個問題已經修掉了，見 displayHours／displayLocation／
// shop.phone／shop.website 這幾個欄位，都是真的從 Google Places 收錄
// 進來的資料。
import type { Shop, ShopPhoto } from "~/composables/useShops";

const route = useRoute();
const { fetchShop, buildStars, getShopPhotos, uploadShopPhotos, deleteShopPhoto } = useShops();
const { getFavoriteShops, addFavorite, removeFavorite } = useFavorites();
const { getShopReviews, formatDate, updateReview, deleteReview } = useReviews();
const { isLoggedIn, user } = useAuth();
const { show } = useSiteMessage();
const { t, locale } = useI18n();

const shopId = computed(() => route.params.id as string);
const shop = ref<Shop | null>(null);
const notFound = ref(false);
const loading = ref(true);

// 跟 ShopCard.vue 一樣：店名／標籤／介紹是店家資料，後端已經有中文版本
// （nameZh／tagsZh／descriptionZh），依語言切換顯示，中文版缺字時退回英文版。
const displayName = computed(() => (shop.value && locale.value === "zh-TW" && shop.value.nameZh) || shop.value?.name || "");
const displayTags = computed(() => {
  if (!shop.value) return [];
  return locale.value === "zh-TW" && shop.value.tagsZh.length ? shop.value.tagsZh : shop.value.tags;
});
const displayDescription = computed(
  () => (shop.value && locale.value === "zh-TW" && shop.value.descriptionZh) || shop.value?.description || ""
);
// 完整營業時間：跟其他 display* 一樣依語言選對應版本，中文版缺資料時
// 退回英文版（跟 displayTags 的退回邏輯一致），兩個都沒有就是真的沒有
// 營業時間資料（Google 沒有這家店的資料，或這家店是補上這個欄位之前
// 就收錄的舊資料）。
const displayHours = computed(() => {
  if (!shop.value) return [];
  return locale.value === "zh-TW" && shop.value.hoursZh?.length ? shop.value.hoursZh : shop.value.hours ?? [];
});
const hoursExpanded = ref(false);
// 地址：跟其他 display* 欄位一樣依語言選版本，退回邏輯也一致。
const displayLocation = computed(
  () => (shop.value && locale.value === "zh-TW" && shop.value.locationZh) || shop.value?.location || ""
);

// 網站連結顯示文字：Google Places 給的 websiteUri 常常是外送平台的頁面
// （UberEats／Foodpanda……），網址本身又臭又長、還帶一堆追蹤用的 query
// string（utm_source 這種），整條印出來畫面會被撐爆、使用者也看不出來
// 這是連去哪裡。不用真的接一個縮網址服務（那要嘛自己另外開一個資料庫
// 存對照表，要嘛依賴第三方 API，兩者都是不成比例的重量級解法）——只取
// 網域名稱當顯示文字就夠了，href 還是完整原始網址，點下去一樣能正確
// 導去該去的地方，只是畫面上乾淨很多。網址格式不合法（理論上不會發生，
// Google Places 給的一定是合法網址，但還是留個防呆）就照原樣顯示，不讓
// 這裡噴錯把整頁弄壞。
const displayWebsiteLabel = computed(() => {
  const url = shop.value?.website;
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
});

const reviews = ref<Awaited<ReturnType<typeof getShopReviews>>["reviews"]>([]);
const reviewsLoading = ref(true);
const reviewsFailed = ref(false);

// 評論分頁：原本這排頁碼按鈕是純裝飾（vanilla 版本遷移過來時就是假的，
// 見下面模板拿掉之前的註解），改成真的會動的分頁。後端 GET
// /api/shops/{id}/reviews 一次回傳全部評論、沒有 limit/offset 這種分頁
// 參數，用現有資料量（一家店頂多幾十則）來看，前端自己切頁就夠了，不用
// 為了這個再改後端 API、多一輪打 API 的往返——真的多到要伺服器端分頁
// 是之後資料量大很多之後才需要考慮的事。
const REVIEWS_PER_PAGE = 5;
const currentPage = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(reviews.value.length / REVIEWS_PER_PAGE)));
const paginatedReviews = computed(() => {
  const start = (currentPage.value - 1) * REVIEWS_PER_PAGE;
  return reviews.value.slice(start, start + REVIEWS_PER_PAGE);
});
// reviews 變動時（重新載入、編輯/刪除評論後),如果目前頁碼已經超出範圍
// (例如刪光了最後一頁的評論)，退回最後一頁而不是停在一個空頁面上。
watch(reviews, () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value;
});
function goToPage(page: number) {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value);
}

// 編輯/刪除評論：只有本人能對自己的評論動作（後端 PUT/DELETE
// /api/reviews/{id} 也會擋非本人，這裡只是不要讓按鈕出現在別人的評論下面）。
// 編輯用行內表單，不跳去 /write-review（那個頁面是設計給「新增」用的，
// 沒有帶現有內容進去編輯的邏輯，硬套會比另外寫一小段行內表單更繞）。
const editingReviewId = ref<number | null>(null);
const editRating = ref(0);
const editText = ref("");
const editContextTags = ref<string[]>([]);
const savingEdit = ref(false);

function toggleEditContextTag(value: string) {
  editContextTags.value = editContextTags.value.includes(value)
    ? editContextTags.value.filter((v) => v !== value)
    : [...editContextTags.value, value];
}

function startEdit(review: (typeof reviews.value)[number]) {
  editingReviewId.value = review.id;
  editRating.value = review.rating;
  editText.value = review.text;
  editContextTags.value = [...review.contextTags];
}

function cancelEdit() {
  editingReviewId.value = null;
}

async function saveEdit(reviewId: number) {
  if (editRating.value < 1 || editText.value.trim().length < 2) {
    show(t("shop.reviewEditInvalid"));
    return;
  }

  savingEdit.value = true;
  try {
    const updated = await updateReview(reviewId, editRating.value, editText.value.trim(), editContextTags.value);
    const index = reviews.value.findIndex((r) => r.id === reviewId);
    if (index !== -1) reviews.value[index] = { ...reviews.value[index], ...updated };
    editingReviewId.value = null;
    show(t("shop.reviewUpdated"));
  } catch {
    show(t("shop.reviewEditFailed"));
  } finally {
    savingEdit.value = false;
  }
}

async function removeReview(reviewId: number) {
  // eslint-disable-next-line no-alert -- 站內沒有現成的自訂確認彈窗元件，
  // 刪除是不可逆動作，先用瀏覽器原生 confirm 擋一下，避免手滑點到就刪掉。
  if (!window.confirm(t("shop.confirmDeleteReview"))) return;

  try {
    await deleteReview(reviewId);
    reviews.value = reviews.value.filter((r) => r.id !== reviewId);
    show(t("shop.reviewDeleted"));
  } catch {
    show(t("shop.reviewDeleteFailed"));
  }
}

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
  currentPage.value = 1;

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
    // 帶著這一頁的網址一起導去登入頁，登入完才能送回這一頁，而不是每次
    // 都固定丟回首頁（見 login.vue 的 resolveRedirectTarget()）。
    await navigateTo({ path: "/login", query: { redirect: route.fullPath } });
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

// 分享：優先用瀏覽器原生的分享面板（navigator.share，手機瀏覽器/部分
// 桌機瀏覽器有支援，會跳出系統的「分享到...」選單），沒有支援的環境
// （多數桌機瀏覽器）退回複製連結到剪貼簿。兩種都不用動到後端——分享的
// 內容就是目前這個頁面的網址，不需要後端另外產生短網址或社群卡片這種
// 更複雜的機制。
async function handleShare() {
  const shareData = {
    title: displayName.value,
    text: t("shop.shareText", { name: displayName.value }),
    url: window.location.href,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (error) {
      // AbortError：使用者自己按取消，不是真的失敗，不用跳錯誤訊息。
      if (error instanceof Error && error.name !== "AbortError") {
        show(t("shop.shareFailedToast"));
      }
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(window.location.href);
    show(t("shop.linkCopiedToast"));
  } catch {
    show(t("shop.shareFailedToast"));
  }
}

// 店家相簿：任何登入的人都可以幫這家店加照片（不用是店家本人的評論），
// 跟評論照片是兩件不同的事——見 useShops.ts 的 getShopPhotos() 註解。
const shopPhotos = ref<ShopPhoto[]>([]);
const photoFileInput = ref<HTMLInputElement | null>(null);
const uploadingShopPhoto = ref(false);
const deletingShopPhotoId = ref<number | null>(null);

async function loadShopPhotos() {
  try {
    const data = await getShopPhotos(shopId.value);
    shopPhotos.value = data.photos;
  } catch {
    // 相簿是錦上添花的展示內容，載入失敗就維持空陣列，不用跳錯誤訊息
    // 打斷使用者看店家頁——店家本身的核心資訊（loadShop()）失敗才需要。
    shopPhotos.value = [];
  }
}

function handleAddPhotoClick() {
  if (!isLoggedIn.value) {
    show(t("shop.loginToAddPhotoToast"));
    navigateTo({ path: "/login", query: { redirect: route.fullPath } });
    return;
  }
  photoFileInput.value?.click();
}

async function handlePhotoFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  if (!files.length) return;

  uploadingShopPhoto.value = true;
  try {
    const data = await uploadShopPhotos(shopId.value, files);
    shopPhotos.value = data.photos;
    show(t("shop.photoUploadedToast"));
  } catch (error: any) {
    show(error?.data?.detail || t("shop.photoUploadFailedToast"));
  } finally {
    uploadingShopPhoto.value = false;
  }
}

async function handleDeleteShopPhoto(photoId: number) {
  if (!window.confirm(t("shop.confirmDeletePhoto"))) return;

  deletingShopPhotoId.value = photoId;
  try {
    const data = await deleteShopPhoto(shopId.value, photoId);
    shopPhotos.value = data.photos;
  } catch {
    show(t("shop.photoDeleteFailedToast"));
  } finally {
    deletingShopPhotoId.value = null;
  }
}

watch(
  shopId,
  async () => {
    await loadShop();
    if (!notFound.value) {
      await Promise.all([loadReviews(), loadFavoriteState(), loadShopPhotos()]);
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
          <h1 class="mb-[15px] text-[0.8rem] font-bold text-brand-brown">{{ displayName }}</h1>
          <p class="text-base text-brand-brown">{{ displayDescription }}</p>

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
            <span v-for="tag in displayTags" :key="tag" class="rounded-[20px] bg-[#f5f5f5] px-3 py-[5px] text-[0.875rem] text-[#666]">
              {{ tag }}
            </span>
          </div>

          <!-- 網站／電話／地址現在都是真實資料了（見 useShops.ts 的
               Shop.phone／website／location 註解）——網站、電話是 Google
               沒有資料就整行不顯示（不是顯示空白或佔位文字，那樣看起來
               像壞掉），地址一定有（Google 的 formattedAddress），
               「Get Directions」如果有真實的 Google Maps 連結就整段包成
               連結，點了會開 Google Maps 導航到這家店。 -->
          <div class="text-[0.9375rem] text-brand-brown">
            <div class="p-[5px]">
              <template v-if="displayHours.length">
                <button type="button" class="text-[#FFA518] underline" @click="hoursExpanded = !hoursExpanded">
                  {{ hoursExpanded ? t("shop.hideHours") : t("shop.seeHours") }}
                </button>
                <ul v-if="hoursExpanded" class="mt-1.5 space-y-0.5 text-sm text-brand-brown-light">
                  <li v-for="line in displayHours" :key="line">{{ line }}</li>
                </ul>
              </template>
              <span v-else class="text-brand-brown-light">{{ t("shop.hoursUnavailable") }}</span>
            </div>
            <div v-if="shop.website" class="p-[5px]">
              <a :href="shop.website" target="_blank" rel="noopener noreferrer" class="text-[#FFA518] underline">{{ displayWebsiteLabel }} ↗</a>
            </div>
            <div v-if="shop.phone" class="p-[5px]">
              <a :href="`tel:${shop.phone}`" class="text-brand-brown no-underline hover:underline">{{ shop.phone }}</a>
            </div>
            <div class="p-[5px]">
              <strong>{{ t("shop.getDirections") }}</strong>
              <a v-if="shop.googleMapsUrl" :href="shop.googleMapsUrl" target="_blank" rel="noopener noreferrer" class="block hover:underline">
                <p>{{ displayLocation }}</p>
              </a>
              <p v-else>{{ displayLocation }}</p>
            </div>
          </div>
        </div>

        <div class="w-64 shrink-0 rounded-[20px] bg-[#FCDC94] p-[15px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] detail-md:mt-5 detail-md:w-full detail-sm:mx-auto detail-sm:max-w-[80%]">
          <img
            :src="resolveShopImage(shop.image)"
            :alt="displayName"
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
        <input
          ref="photoFileInput"
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          @change="handlePhotoFilesSelected"
        />
        <button
          type="button"
          :disabled="uploadingShopPhoto"
          class="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-brand-orange px-6 py-3 text-[0.9375rem] text-white transition hover:-translate-y-0.5 hover:bg-[#e89615] disabled:opacity-60"
          @click="handleAddPhotoClick"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
          {{ uploadingShopPhoto ? t("shop.uploadingPhoto") : t("shop.addPhoto") }}
        </button>
        <button
          type="button"
          class="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-brand-orange px-6 py-3 text-[0.9375rem] text-white transition hover:-translate-y-0.5 hover:bg-[#e89615]"
          @click="handleShare"
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

      <!-- 店家相簿：跟評論照片是分開的一批資料（見 handleAddPhotoClick()
           的註解），沒有照片就整段不顯示，不用留一個空相簿框。 -->
      <section v-if="shopPhotos.length" class="mb-10">
        <h2 class="mb-[15px] text-xl font-bold text-brand-brown">{{ t("shop.photosTitle") }}</h2>
        <div class="flex flex-wrap gap-3">
          <div v-for="photo in shopPhotos" :key="photo.id" class="group relative">
            <a :href="photo.url" target="_blank" rel="noopener noreferrer">
              <img :src="photo.url" :alt="displayName" class="h-28 w-28 rounded-lg border border-brand-border object-cover" />
            </a>
            <button
              v-if="user?.id === photo.uploaderId"
              type="button"
              :disabled="deletingShopPhotoId === photo.id"
              class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100"
              :aria-label="t('shop.deletePhoto')"
              @click="handleDeleteShopPhoto(photo.id)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>
      </section>

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
              {{ t("shop.beFirstSuffixFor", { shopName: displayName }) }}
            </p>
          </div>
        </template>
        <div v-else class="flex flex-col gap-[30px]">
          <div v-for="review in paginatedReviews" :key="review.id" data-testid="review-item" class="rounded-xl bg-white p-[15px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-transform duration-300 hover:-translate-y-[5px]">
            <div class="w-[200px]">
              <ReviewerAvatar :name="review.reviewerName" :avatar-url="review.reviewerAvatarUrl" :size="70" class="mb-[15px] border-[3px] border-brand-orange" />
              <div>
                <h4 class="mb-[5px] text-[18px] text-brand-brown">{{ review.reviewerName }}</h4>
                <p class="mb-2.5 text-sm text-[#666]">{{ formatDate(review.createdAt) }}</p>
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <template v-if="editingReviewId === review.id">
                <!-- 行內編輯表單：星等選擇跟 write-review.vue 同一套「點第幾顆星
                     評分就是幾分」邏輯，只是縮小版、沒有拆成獨立元件（只有這裡
                     一個地方用得到，拆元件反而多一層間接）。 -->
                <div class="mb-[15px] flex items-center gap-1">
                  <button
                    v-for="position in 5"
                    :key="position"
                    type="button"
                    class="text-[24px] leading-none transition-colors"
                    :class="position <= editRating ? 'text-brand-orange' : 'text-brand-brown/30'"
                    :aria-label="`${position} stars`"
                    @click="editRating = position"
                  >
                    ★
                  </button>
                </div>
                <textarea
                  v-model="editText"
                  rows="3"
                  class="mb-2.5 w-full rounded-lg border border-brand-border p-2.5 text-sm text-brand-brown focus:border-brand-orange focus:outline-none"
                />
                <div class="mb-2.5 flex flex-wrap gap-2">
                  <button
                    v-for="option in REVIEW_CONTEXT_TAGS"
                    :key="option.value"
                    type="button"
                    class="rounded-[20px] border-2 border-brand-orange px-2.5 py-0.5 text-xs transition-colors"
                    :class="editContextTags.includes(option.value) ? 'bg-brand-orange text-white' : 'text-brand-orange hover:bg-brand-orange hover:text-white'"
                    @click="toggleEditContextTag(option.value)"
                  >
                    {{ t(option.labelKey) }}
                  </button>
                </div>
                <div class="flex gap-2.5">
                  <button
                    type="button"
                    class="rounded-lg bg-brand-orange px-4 py-2 text-xs font-medium text-white transition hover:bg-[#e89615] disabled:opacity-50"
                    :disabled="savingEdit"
                    @click="saveEdit(review.id)"
                  >
                    {{ savingEdit ? t("shop.reviewSaving") : t("shop.reviewSave") }}
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-brand-border px-4 py-2 text-xs font-medium text-brand-brown transition hover:bg-brand-cream"
                    @click="cancelEdit"
                  >
                    {{ t("shop.reviewCancel") }}
                  </button>
                </div>
              </template>
              <template v-else>
                <div class="mb-[15px] flex items-center justify-between gap-[15px]">
                  <div class="text-[20px] tracking-[2px] text-brand-orange">{{ buildStars(review.rating) }}</div>
                  <!-- 只有本人的評論才會看到編輯/刪除，見 startEdit()/removeReview()
                       的註解——按鈕擋不擋得住是前端的事，後端 PUT/DELETE
                       /api/reviews/{id} 才是真正擋非本人的地方。 -->
                  <div v-if="user?.id === review.userId" class="flex shrink-0 gap-3 text-xs">
                    <button type="button" class="text-brand-orange underline" @click="startEdit(review)">{{ t("shop.reviewEdit") }}</button>
                    <button type="button" class="text-[#c0392b] underline" @click="removeReview(review.id)">{{ t("shop.reviewDelete") }}</button>
                  </div>
                </div>
                <!-- 跟 vanilla 版本一樣：shop_detail.css 裡另一條給「reviews-grid」
                     卡片用的 `.review-item p` 規則（specificity 比 `.review-text`
                     高）蓋掉了這裡原本想要的樣式，實際渲染出來是 13px 灰色，
                     不是設計稿看起來想要的 16px 深咖啡色。照實際結果遷移。 -->
                <p class="mb-2.5 text-[0.8125rem] leading-[1.6] text-[#666]">{{ review.text }}</p>
                <!-- Phase 4「情境式心得」：評論者當初複選的情境標籤，用比
                     店家標籤（.category button）小一號、無底色的版本呈現，
                     視覺上明確是「這則評論附帶的資訊」，不是店家本身的
                     固定標籤。非必填欄位，沒選任何標籤時整排不顯示——但
                     不管有沒有標籤都保留 mb-5，維持卡片下緣間距一致，
                     不會因為這則剛好沒填標籤，底部間距就跟著變窄。 -->
                <div class="mb-5 flex flex-wrap gap-1.5">
                  <span
                    v-for="tagValue in review.contextTags"
                    :key="tagValue"
                    class="rounded-full border border-brand-border px-2 py-0.5 text-xs text-brand-brown-light"
                  >
                    {{ t(REVIEW_CONTEXT_TAGS.find((o) => o.value === tagValue)?.labelKey ?? tagValue) }}
                  </span>
                  <!-- Phase 4「AI 標籤整理」：AI 從評論文字自動分析出來的
                       標籤，故意用完全不同的樣式（淡紫底色 + ✨ 圖示）跟
                       上面使用者自己勾的標籤分開，讓人一眼看出「這是 AI
                       判斷的，不是本人親自勾選」，不是為了好看而已，是
                       誠實標示資料來源。 -->
                  <span
                    v-for="tagValue in review.aiContextTags"
                    :key="`ai-${tagValue}`"
                    class="flex items-center gap-1 rounded-full border border-[#d8c6f0] bg-[#f3ecfb] px-2 py-0.5 text-xs text-[#6b4ea3]"
                    :title="t('shop.aiTagHint')"
                  >
                    <span aria-hidden="true">✨</span>
                    {{ t(REVIEW_CONTEXT_TAGS.find((o) => o.value === tagValue)?.labelKey ?? tagValue) }}
                  </span>
                </div>
                <!-- 評論照片：v-if 整排不顯示，跟情境標籤那排不一樣——標籤
                     那排刻意保留固定間距（見上面註解），照片沒有的話留一排
                     空縮圖框反而更奇怪，直接不渲染。 -->
                <div v-if="review.photos.length" class="mb-5 flex flex-wrap gap-2">
                  <a v-for="photoUrl in review.photos" :key="photoUrl" :href="photoUrl" target="_blank" rel="noopener noreferrer">
                    <img :src="photoUrl" alt="" class="h-20 w-20 rounded-lg border border-brand-border object-cover" />
                  </a>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 真的會動的分頁：原本這排是裝飾用的（不管點哪裡都是同一個 demo
             提示），現在會真的切換頁碼、只有一頁時整排不顯示（沒必要看到
             一組只能點自己的分頁按鈕）。頁碼邏輯見上面 REVIEWS_PER_PAGE／
             paginatedReviews／goToPage 的註解。 -->
        <div v-if="totalPages > 1" class="mt-10 flex items-center justify-center gap-2.5 py-5">
          <button
            type="button"
            :disabled="currentPage === 1"
            class="flex h-10 w-10 items-center justify-center rounded-full border border-[#ddd] text-brand-brown transition hover:-translate-y-0.5 hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:bg-transparent"
            :aria-label="t('shop.previousPage')"
            @click="goToPage(currentPage - 1)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            v-for="n in totalPages"
            :key="n"
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full border text-[0.9375rem] transition"
            :class="n === currentPage ? 'border-brand-orange bg-brand-orange text-white' : 'border-[#ddd] text-brand-brown hover:-translate-y-0.5 hover:bg-[#f5f5f5]'"
            @click="goToPage(n)"
          >
            {{ n }}
          </button>
          <button
            type="button"
            :disabled="currentPage === totalPages"
            class="flex h-10 w-10 items-center justify-center rounded-full border border-[#ddd] text-brand-brown transition hover:-translate-y-0.5 hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:bg-transparent"
            :aria-label="t('shop.nextPage')"
            @click="goToPage(currentPage + 1)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </section>
    </template>
  </section>
</template>
