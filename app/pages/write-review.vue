<script setup lang="ts">
// 對應 vanilla 版本 write_review.html + Js/reviews.js 的
// setupWriteReviewForm()。
//
// 星等選擇器（Rate Desserts）：原本刻意照抄 vanilla 版本一個「不直覺」的
// 既有行為——vanilla 用 5 個 DOM 順序反過來的 radio 做填色，點第 3 顆星
// 會變成第 3～5 顆星（從點擊位置「往右」）被填色，不是一般常見的「從最
// 左邊往點擊位置填」。使用者實際用起來覺得這樣違反直覺，改成一般星等
// selector 常見的「從左邊填到點擊位置」：position 直接等於 value（點第
// 幾顆星，評分就是幾分），isStarFilled 判斷也跟著改成「position 小於等於
// 目前選的位置」就填色。
import type { Shop } from "~/composables/useShops";

const route = useRoute();
const router = useRouter();
const { fetchShop, fetchShops } = useShops();
const { submitReview } = useReviews();
const { isLoggedIn } = useAuth();
const { show } = useSiteMessage();
const { t } = useI18n();

const lockedShop = ref<Shop | null>(null);
const shopOptions = ref<Shop[]>([]);
const selectedShopId = ref("");
const shopFieldFailed = ref(false);
const loadingShopField = ref(true);

const reviewText = ref("");
const submitting = ref(false);

// Phase 4「情境式心得」：複選式情境標籤，非必填。用陣列存目前選中的
// value（跟 category.vue 的 filterState.features 同一種「複選陣列」寫法）。
const selectedContextTags = ref<string[]>([]);
function toggleContextTag(value: string) {
  selectedContextTags.value = selectedContextTags.value.includes(value)
    ? selectedContextTags.value.filter((v) => v !== value)
    : [...selectedContextTags.value, value];
}

// 5 顆星星，position 1～5（畫面上從左到右），value 直接等於 position——
// 點第幾顆星，評分就是幾分，跟大部分星等 selector 的直覺一致。
const stars = [
  { position: 1, value: 1 },
  { position: 2, value: 2 },
  { position: 3, value: 3 },
  { position: 4, value: 4 },
  { position: 5, value: 5 },
];
const selectedPosition = ref<number | null>(null);
const rating = computed(() => (selectedPosition.value ? stars.find((s) => s.position === selectedPosition.value)!.value : 0));

function isStarFilled(position: number) {
  return selectedPosition.value != null && position <= selectedPosition.value;
}

async function loadShopField() {
  loadingShopField.value = true;
  shopFieldFailed.value = false;

  const id = route.query.id as string | undefined;

  if (id) {
    try {
      lockedShop.value = await fetchShop(id);
      selectedShopId.value = lockedShop.value.id;
    } catch {
      shopFieldFailed.value = true;
    } finally {
      loadingShopField.value = false;
    }
    return;
  }

  try {
    shopOptions.value = await fetchShops();
  } catch {
    shopFieldFailed.value = true;
  } finally {
    loadingShopField.value = false;
  }
}

onMounted(loadShopField);

async function handleSubmit() {
  if (!isLoggedIn.value) {
    show(t("writeReview.loginToReviewToast"));
    await navigateTo("/login");
    return;
  }

  if (!selectedShopId.value) {
    show(t("writeReview.chooseShopToast"));
    return;
  }

  if (!rating.value) {
    show(t("writeReview.chooseRatingToast"));
    return;
  }

  submitting.value = true;

  try {
    await submitReview(selectedShopId.value, rating.value, reviewText.value.trim(), selectedContextTags.value);
    show(t("writeReview.postedToast"));
    await router.push(`/shop/${encodeURIComponent(selectedShopId.value)}`);
  } catch (error) {
    show(error instanceof Error ? error.message : t("shop.requestFailed"));
    submitting.value = false;
  }
}
</script>

<template>
  <section class="mx-auto my-24 max-w-[600px] rounded-[10px] border border-brand-gold bg-brand-gold p-5 text-sm text-brand-brown">
    <h1 class="mb-5 text-center text-2xl text-brand-brown">{{ t("writeReview.title") }}</h1>

    <form @submit.prevent="handleSubmit">
      <div class="mb-[15px]">
        <label for="dessert-shop-id" class="mb-[5px] block text-sm text-brand-brown">{{ t("writeReview.dessertShop") }}</label>

        <p v-if="loadingShopField" class="m-0">{{ t("writeReview.loadingShops") }}</p>
        <p v-else-if="shopFieldFailed" class="m-0">
          {{ t("writeReview.shopNotFoundPrefix") }} <NuxtLink to="/category" class="text-brand-orange underline">{{ t("shop.browseAllShops") }}</NuxtLink>.
        </p>
        <p v-else-if="lockedShop" data-testid="locked-shop-name" class="m-0">{{ lockedShop.name }}</p>
        <select
          v-else
          id="dessert-shop-id"
          v-model="selectedShopId"
          required
          class="w-full rounded-[5px] border border-brand-gold p-[10px]"
        >
          <option value="" disabled>{{ t("writeReview.chooseAShop") }}</option>
          <option v-for="shop in shopOptions" :key="shop.id" :value="shop.id">{{ shop.name }}</option>
        </select>
      </div>

      <div class="mb-[15px]">
        <label for="review-text" class="mb-[5px] block text-sm text-brand-brown">{{ t("writeReview.yourReview") }}</label>
        <textarea
          id="review-text"
          v-model="reviewText"
          rows="4"
          required
          class="w-4/5 rounded-[5px] border border-brand-gold p-[10px]"
        />
      </div>

      <div class="mb-[15px]">
        <label class="mb-[5px] block text-sm text-brand-brown">{{ t("writeReview.rateDesserts") }}</label>
        <div class="flex justify-start">
          <button
            v-for="star in stars"
            :key="star.position"
            type="button"
            class="cursor-pointer border-0 bg-transparent p-0 text-xl"
            :class="isStarFilled(star.position) ? 'text-brand-orange' : 'text-brand-brown'"
            :aria-label="t(star.value === 1 ? 'writeReview.starLabelOne' : 'writeReview.starLabelOther', { count: star.value })"
            @click="selectedPosition = star.position"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" /></svg>
          </button>
        </div>
      </div>

      <!-- Phase 4「情境式心得」：跟分類頁篩選 chip 同一套視覺（圓角外框、
           選中變實心橘底），非必填，使用者可以直接送出不勾任何一個。 -->
      <div class="mb-[15px]">
        <label class="mb-[5px] block text-sm text-brand-brown">{{ t("writeReview.contextTagsLabel") }}</label>
        <p class="mb-2 text-xs text-brand-brown-light">{{ t("writeReview.contextTagsHint") }}</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in REVIEW_CONTEXT_TAGS"
            :key="option.value"
            type="button"
            class="rounded-[20px] border-2 border-brand-orange px-3 py-1 text-sm transition-colors"
            :class="selectedContextTags.includes(option.value) ? 'bg-brand-orange text-white' : 'text-brand-orange hover:bg-brand-orange hover:text-white'"
            @click="toggleContextTag(option.value)"
          >
            {{ t(option.labelKey) }}
          </button>
        </div>
      </div>

      <div class="mb-[15px]">
        <label for="photo-upload" class="mb-[5px] block text-sm text-brand-brown">{{ t("writeReview.sharePhotos") }}</label>
        <!-- 跟 vanilla 版本一樣：這個欄位沒有真的接上傳功能，submitReview()
             只送出評分跟文字，這裡選了照片也不會真的送出去。 -->
        <input id="photo-upload" type="file" accept="image/*" multiple class="w-full rounded-[5px] border border-brand-gold p-[10px]" />
      </div>

      <button
        type="submit"
        :disabled="submitting || shopFieldFailed"
        class="w-full rounded-[5px] bg-brand-orange px-5 py-[10px] text-base text-white transition-colors hover:bg-[#e89615] disabled:opacity-60"
      >
        {{ t("writeReview.submitReview") }}
      </button>
    </form>
  </section>
</template>
