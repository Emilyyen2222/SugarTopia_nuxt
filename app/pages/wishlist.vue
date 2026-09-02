<script setup lang="ts">
// Phase 4「甜點願望單」：跟 favorites.vue 同一種頁面結構（登入判斷/
// 載入中/錯誤/空狀態/列表），但多一段新增用的輸入表單——收藏是「點一個
// 既有的按鈕」，願望單則是使用者自己打一段情境描述進來，資料本質不同：
// 願望單存的是「使用者想要什麼」，不是「使用者對已知的東西做了什麼」。
import type { WishlistItem } from "~/composables/useWishlist";

const { isLoggedIn } = useAuth();
const { getWishlist, addWishlistItem, removeWishlistItem } = useWishlist();
const { formatDate } = useReviews();
const { show } = useSiteMessage();
const { t } = useI18n();

const loading = ref(true);
const failed = ref(false);
const errorMessage = ref("");
const items = ref<WishlistItem[]>([]);

const newWishText = ref("");
const submitting = ref(false);
const deletingId = ref<number | null>(null);

async function load() {
  if (!isLoggedIn.value) return;

  loading.value = true;
  failed.value = false;

  try {
    const data = await getWishlist();
    items.value = data.items;
  } catch (error) {
    failed.value = true;
    errorMessage.value = error instanceof Error ? error.message : t("shop.requestFailed");
  } finally {
    loading.value = false;
  }
}

async function handleAdd() {
  const text = newWishText.value.trim();
  if (text.length < 2) {
    show(t("wishlist.textTooShortToast"));
    return;
  }

  submitting.value = true;
  try {
    const created = await addWishlistItem(text);
    items.value = [created, ...items.value];
    newWishText.value = "";
    show(t("wishlist.addedToast"));
  } catch {
    show(t("wishlist.addFailedToast"));
  } finally {
    submitting.value = false;
  }
}

async function handleRemove(id: number) {
  deletingId.value = id;
  try {
    await removeWishlistItem(id);
    items.value = items.value.filter((item) => item.id !== id);
  } catch {
    show(t("wishlist.removeFailedToast"));
  } finally {
    deletingId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="mt-[120px] flex min-h-[calc(100vh-180px)] gap-5 px-5">
    <div class="mx-auto w-full max-w-[700px]">
      <template v-if="!isLoggedIn">
        <h1 class="mb-10 text-xl font-bold text-brand-brown">{{ t("wishlist.title") }}</h1>
        <div class="rounded-2xl border border-brand-border bg-brand-cream p-7">
          <h2 class="mb-2 text-2xl text-brand-brown">{{ t("wishlist.pleaseLoginTitle") }}</h2>
          <p class="text-brand-brown-light">
            {{ t("wishlist.pleaseLoginBody") }}
            <NuxtLink to="/login" class="text-brand-orange underline">{{ t("header.logIn") }}</NuxtLink>
          </p>
        </div>
      </template>

      <template v-else>
        <h1 class="mb-2.5 text-xl font-bold text-brand-brown">{{ t("wishlist.title") }}</h1>
        <p class="mb-[18px] text-sm text-brand-brown-light">{{ t("wishlist.subtitle") }}</p>

        <form class="mb-8 flex flex-col gap-2.5 rounded-2xl border border-brand-border bg-brand-cream p-5" @submit.prevent="handleAdd">
          <label for="wishlist-text" class="text-sm font-medium text-brand-brown">{{ t("wishlist.inputLabel") }}</label>
          <textarea
            id="wishlist-text"
            v-model="newWishText"
            rows="2"
            :placeholder="t('wishlist.inputPlaceholder')"
            class="w-full rounded-lg border border-brand-border bg-white p-2.5 text-sm text-brand-brown focus:border-brand-orange focus:outline-none"
          />
          <button
            type="submit"
            :disabled="submitting"
            class="self-start rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white transition hover:bg-[#e89615] disabled:opacity-50"
          >
            {{ submitting ? t("wishlist.adding") : t("wishlist.addButton") }}
          </button>
        </form>

        <template v-if="loading">
          <p class="text-base text-brand-brown-light">{{ t("wishlist.loadingBody") }}</p>
        </template>

        <template v-else-if="failed">
          <div class="rounded-2xl border border-brand-border bg-brand-cream p-7">
            <h2 class="mb-2 text-2xl text-brand-brown">{{ t("wishlist.errorTitle") }}</h2>
            <p class="text-brand-brown-light">{{ errorMessage }}</p>
          </div>
        </template>

        <template v-else-if="!items.length">
          <div class="rounded-2xl border border-brand-border bg-brand-cream p-7">
            <h2 class="mb-2 text-2xl text-brand-brown">{{ t("wishlist.emptyTitle") }}</h2>
            <p class="text-brand-brown-light">{{ t("wishlist.emptyBody") }}</p>
          </div>
        </template>

        <template v-else>
          <div class="flex flex-col gap-3">
            <div
              v-for="item in items"
              :key="item.id"
              class="flex items-start justify-between gap-3 rounded-xl border border-brand-border bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
            >
              <div class="min-w-0">
                <p class="text-sm leading-[1.6] text-brand-brown">{{ item.text }}</p>
                <p class="mt-1 text-xs text-brand-brown-light">{{ formatDate(item.createdAt) }}</p>
              </div>
              <button
                type="button"
                class="shrink-0 text-xs text-[#c0392b] underline"
                :disabled="deletingId === item.id"
                @click="handleRemove(item.id)"
              >
                {{ deletingId === item.id ? t("wishlist.removing") : t("wishlist.removeButton") }}
              </button>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
