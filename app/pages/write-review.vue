<script setup lang="ts">
// 對應 vanilla 版本 write_review.html + Js/reviews.js 的
// setupWriteReviewForm()。
//
// 星等選擇器（Rate Desserts）刻意照抄一個「有點特別」的既有行為：vanilla
// 版本用 5 個 radio + `input:checked ~ label { color: orange }` 這個常見
// CSS 技巧做星星填色，但 DOM 順序是反過來的（第一顆 radio 的 value 是 5，
// 最後一顆是 1），而且沒有搭配 flex-direction: row-reverse。實際量測結果
// （見 README）是：點第 3 顆星（從左數，value=3），填色的是第 3～5 顆星
// （從點擊位置「往右」填到底），不是一般常見的「從最左邊往點擊位置填」。
// 這裡不用 CSS 那個技巧（Vue 裡更適合直接用 JS 算），但刻意算出跟 vanilla
// 版本完全一樣的視覺結果，不是自己覺得「這樣比較合理」的常見左填色版本。
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

// 5 顆星星，position 1～5（畫面上從左到右），value 是點了它會存的實際評分
// （5,4,3,2,1，跟 vanilla 版本的 DOM 順序一樣是反過來的）。
const stars = [
  { position: 1, value: 5 },
  { position: 2, value: 4 },
  { position: 3, value: 3 },
  { position: 4, value: 2 },
  { position: 5, value: 1 },
];
const selectedPosition = ref<number | null>(null);
const rating = computed(() => (selectedPosition.value ? stars.find((s) => s.position === selectedPosition.value)!.value : 0));

function isStarFilled(position: number) {
  return selectedPosition.value != null && position >= selectedPosition.value;
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
    await submitReview(selectedShopId.value, rating.value, reviewText.value.trim());
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
