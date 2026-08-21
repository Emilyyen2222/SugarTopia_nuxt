<script setup lang="ts">
// 對應 vanilla 版本 index.html + Js/gemini-chat.js + Js/reviews.js 的
// renderLatestReviews() + Js/loader.js。
//
// 明確排除在這次遷移之外（見 README「遷移範圍與順序」）：Instagram 照片牆
// （.instagram_photo_section）、電子報訂閱區塊（.join-mailing-list）——
// 純展示、沒接後端，優先度較低。
import type { Review } from "~/composables/useReviews";

const { apiFetch } = useApi();
const { getLatestReviews, formatDate } = useReviews();
const { buildStars } = useShops();

// AI 問答 --------------------------------------------------------
// 對應 gemini-chat.js。跟其他頁面不一樣，vanilla 版本這支檔案是唯一一個
// 沒有用 apiBaseUrl 做本機/正式環境切換、直接寫死 Cloud Run 網址的地方
// （其餘 site-enhancements.js／auth.js／favorites.js／reviews.js 都有做
// 這個切換）。這裡判斷是遺漏，不是刻意設計，改用跟其他頁面一致的
// useApi()，本機開發也能測到本機後端的 AI 回覆。
interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const chatMessages = ref<ChatMessage[]>([
  { role: "assistant", text: "Hi! Tell me what dessert you want today, and I will recommend a sweet spot from our SugarTopia notes." },
]);
const chatInput = ref("");
const chatBusy = ref(false);
const chatMessagesEl = ref<HTMLElement | null>(null);

function formatReply(value: unknown): string {
  if (typeof value === "string") {
    return value
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/^\s*#{1,6}\s+/gm, "")
      .replace(/```/g, "")
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map(formatReply).filter(Boolean).join("\n");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (typeof record.content === "string") return record.content;
    if (Array.isArray(record.content)) return formatReply(record.content);
    return JSON.stringify(value, null, 2);
  }

  return "";
}

async function submitChat() {
  const message = chatInput.value.trim();
  if (!message) return;

  chatMessages.value.push({ role: "user", text: message });
  chatInput.value = "";
  chatBusy.value = true;

  const loadingIndex = chatMessages.value.push({ role: "assistant", text: "思考中..." }) - 1;
  await nextTick();
  chatMessagesEl.value?.scrollTo({ top: chatMessagesEl.value.scrollHeight });

  try {
    const data = await apiFetch<{ reply: unknown }>("/api/chat", {
      method: "POST",
      body: { message },
    });
    chatMessages.value[loadingIndex].text = formatReply(data.reply) || "SugarTopia AI 目前有點忙，請稍後再試。";
  } catch (error: any) {
    chatMessages.value[loadingIndex].text = error?.data?.detail || "連不上後端，請稍後再試。";
  } finally {
    chatBusy.value = false;
    await nextTick();
    chatMessagesEl.value?.scrollTo({ top: chatMessagesEl.value.scrollHeight });
  }
}

// Latest Reviews --------------------------------------------------
const reviews = ref<Review[]>([]);

async function loadLatestReviews() {
  try {
    const data = await getLatestReviews(8);
    reviews.value = data.reviews;
  } catch {
    // 跟 vanilla 版本一樣：抓不到就保持原本畫面，不強制蓋成錯誤訊息
    // （通常是後端暫時連不上），避免首頁一進來就整片變成技術性錯誤字樣。
  }
}

onMounted(loadLatestReviews);

// Categories 磚 -----------------------------------------------------
const categoryTiles = [
  { label: "Cinnamon Rolls", query: "Cinnamon Rolls", image: "c1.svg" },
  { label: "Ice Creams", query: "Ice Creams", image: "c2.svg" },
  { label: "Bagels", query: "Bagels", image: "c3.svg" },
  { label: "Cheese Cakes", query: "Cheesecakes", image: "c4.svg" },
  { label: "Macaron", query: "Macaron", image: "c5.svg" },
  { label: "Cafes", query: "Cafes", image: "c6.svg" },
  { label: "Dog Friendly", query: "Dogs Friendly", image: "c7.svg" },
  { label: "Alcohol infused", query: "Alcohol", image: "c8.svg" },
];

// 載入畫面 -----------------------------------------------------------
// 對應 Js/loader.js：進站先蓋一層全版滿版的載入畫面，500ms 後淡出。
const showLoader = ref(true);
onMounted(() => {
  window.setTimeout(() => {
    showLoader.value = false;
  }, 500);
});
</script>

<template>
  <div
    v-if="showLoader"
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(255,165,24,1)]"
  >
    <img src="/sugartopia8.gif" alt="Loading" class="h-auto w-[250px]" />
  </div>

  <!-- Hero：AI 問答 + 輪播 -->
  <section class="split-section relative z-[1] box-border w-full pt-20 min-h-[calc(100vh-80px)] flex items-stretch detail-md:min-h-0 detail-md:flex-col detail-md:items-stretch detail-md:pb-8 detail-md:pt-[100px]">
    <div
      class="pointer-events-none absolute left-0 top-0 h-full w-1/2 -z-10 detail-md:w-full"
      style="background: linear-gradient(to left, #fcdc94, #fff)"
    />
    <div class="pointer-events-none absolute right-0 top-0 h-full w-1/2 -z-10 bg-brand-orange detail-md:hidden" />

    <div class="left-side z-[1] flex w-1/2 flex-col items-start justify-center px-[150px] py-10 box-border detail-md:order-2 detail-md:w-full detail-md:px-5 detail-md:pt-6">
      <!-- 先暫時拿掉看效果，之後再決定要不要留（使用者要求，非遷移疏漏）。 -->
      <p v-if="false" class="overlay-text mb-5 max-w-[400px] text-left text-[1.2rem] font-bold leading-[1.4] text-brand-brown">
        Let's Make Life Sweet, One Dessert at a Time.
      </p>

      <div class="ai-chat-heading mb-4 max-w-[420px] text-left">
        <span class="mb-1.5 inline-block text-[13px] font-bold uppercase text-brand-orange">SugarTopia AI</span>
        <h2 class="m-0 mb-1.5 text-[19px] leading-[1.3] text-brand-brown">Ask for a dessert recommendation</h2>
      </div>

      <div id="chatMessages" ref="chatMessagesEl" class="chat-messages box-border w-full max-w-[420px] min-h-[180px] max-h-[280px] overflow-y-auto rounded-[20px] border border-brand-border bg-white p-[18px]" aria-live="polite">
        <div
          v-for="(message, i) in chatMessages"
          :key="i"
          class="chat-message mb-3 w-fit max-w-[82%] break-words rounded-2xl px-[14px] py-[11px] text-base leading-[1.6]"
          :class="message.role === 'user' ? 'ml-auto bg-brand-orange text-white' : 'mr-auto bg-brand-chat-assistant text-brand-brown'"
        >
          {{ message.text }}
        </div>
      </div>

      <form id="chatForm" class="chat-form mt-3.5 flex w-full max-w-[420px] gap-2.5" @submit.prevent="submitChat">
        <input
          id="chatInput"
          v-model="chatInput"
          type="text"
          placeholder="e.g. Matcha dessert recommendations?"
          autocomplete="off"
          :disabled="chatBusy"
          class="box-border min-w-0 flex-1 rounded-xl border border-brand-border px-[14px] py-[13px] text-base text-brand-brown"
        />
        <button
          type="submit"
          :disabled="chatBusy"
          class="inline-flex items-center gap-2 rounded-xl bg-brand-brown px-5 py-[13px] text-base leading-none text-white hover:bg-brand-brown-hover disabled:opacity-60"
        >
          Send
          <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" /></svg>
        </button>
      </form>
    </div>

    <DessertSwiper />
  </section>

  <!-- Latest Reviews -->
  <div class="latest_review_section mx-auto max-w-[1000px] px-5 py-16 text-center">
    <div class="review-header mb-8 flex items-center justify-between text-left">
      <h1 class="m-0 text-base font-bold text-brand-brown">Latest Reviews</h1>
    </div>
    <div v-if="reviews.length" class="review-grid grid grid-cols-4 gap-5 detail-md:grid-cols-2 nav-sm:grid-cols-1">
      <div v-for="review in reviews" :key="review.id" class="review-card w-full">
        <div class="rounded-2xl bg-brand-gold p-[15px]">
          <div class="flex items-center gap-[15px]">
            <img src="/img/profile.jpg" :alt="review.reviewerName" class="h-[50px] w-[50px] rounded-full object-cover" />
            <div class="text-left">
              <p class="m-0 text-[0.9375rem] font-bold text-black">{{ review.reviewerName }}</p>
              <p class="mt-2 text-[0.8125rem] text-brand-brown">{{ formatDate(review.createdAt) }}</p>
            </div>
          </div>
          <div class="py-[15px] text-left">
            <h2 class="m-0 mb-1.5 text-[1.125rem] font-bold text-black">{{ review.shopName || review.shopId }}</h2>
            <!-- 跟 shop 卡片一樣：全站通用的 `.rating span` 規則把這裡蓋成綠色小字。 -->
            <div class="mb-2.5 text-base">
              <span class="text-[10px] text-brand-green">{{ buildStars(review.rating) }}</span>
            </div>
            <img v-if="review.shopImage" :src="resolveShopImage(review.shopImage)" :alt="review.shopName" class="my-2.5 block w-full rounded-lg" />
            <p class="review-text my-2.5 text-[0.9375rem] text-[#555]">{{ review.text }}</p>
            <NuxtLink :to="`/shop/${review.shopId}`" class="read-more text-sm text-brand-green no-underline hover:underline">Read more</NuxtLink>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="rounded-2xl border border-brand-border bg-brand-cream p-7 text-left">
      <h2 class="mb-2 text-2xl text-brand-brown">No reviews yet</h2>
      <p class="text-brand-brown-light">Be the first to <NuxtLink to="/write-review" class="text-brand-orange underline">write a review</NuxtLink>.</p>
    </div>
  </div>

  <!-- Categories -->
  <section class="dessert_categories_section mx-auto max-w-[1000px] px-5 py-14 text-center">
    <div class="category-header mb-8 flex items-center justify-between text-left">
      <h2 class="m-0 text-base font-bold text-brand-brown">Categories</h2>
      <NuxtLink to="/category" class="category-view-all text-sm text-brand-orange no-underline hover:underline">View All</NuxtLink>
    </div>
    <div class="category-grid grid grid-cols-4 gap-5 detail-md:grid-cols-2 nav-sm:grid-cols-1">
      <NuxtLink
        v-for="tile in categoryTiles"
        :key="tile.query"
        :to="`/category?q=${encodeURIComponent(tile.query)}`"
        class="category-card flex flex-col items-center rounded-2xl p-2.5 transition hover:scale-[0.98] hover:bg-[rgba(249,168,38,0.2)]"
      >
        <img :src="`/img/${tile.image}`" :alt="tile.label" class="w-full max-w-[200px] rounded-lg object-cover transition-transform hover:scale-95" />
      </NuxtLink>
    </div>
  </section>

  <ScrollToTopButton />
</template>
