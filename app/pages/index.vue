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
const { t, locale } = useI18n();

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
  { role: "assistant", text: t("home.aiGreeting") },
]);

// 語言切換時，如果使用者還沒真的開始對話（畫面上就只有那句預設開場白），
// 開場白要跟著換成新語言——不然「英文版卻看到中文開場白」這種不一致
// 會一直卡著，直到使用者重新整理頁面才會消失。一旦真的送出過訊息，
// 就不要再回頭改已經送出/收到的對話紀錄（那些是真的發生過的對話，不是
// 介面文案，跟著使用者切語言亂改反而奇怪，跟真的聊天紀錄的邏輯不符）。
watch(locale, () => {
  if (chatMessages.value.length === 1 && chatMessages.value[0].role === "assistant") {
    chatMessages.value[0].text = t("home.aiGreeting");
  }
});

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
// image 換成 c*-icon.svg：原本的 c1~c8.svg 圖片檔案裡，店名字樣是直接
// 畫在圖片裡的向量圖形（不是真的文字，找不到、也選不到，中英文切換自然
// 也不會跟著變），所以用中文版介面看起來卡片還是英文。這裡另外做了一份
// 只留圖示、拿掉圖片裡文字的版本（做法：圖片裡的路徑，店名文字那條
// 明顯比其他圖示路徑長非常多——量出來是幾千字元 vs 圖示路徑幾百字元，
// 用長度差分辨出來，把文字那條路徑拿掉，其餘圖示路徑原封不動保留），
// 文字改成畫面上真的的 HTML 文字（labelKey 對應語言檔），才能跟著介面
// 語言切換。
// categoryTiles 定義搬到 composables/categoryTiles.ts，跟 header 的
// CategoriesDropdown.vue 共用同一份，不要各自維護一份重複的內容。

// 手機版一次顯示一「頁」2x2（4 張）卡片，左右滑動切換頁，不是單排橫向
// 滑動——把卡片切成每 4 張一組，每一組各自是一個 2 欄 grid，這些
// grid 本身再排成一整排、左右滑動、滑動停在整頁上（scroll-snap）。
// 目前剛好 4 張，只會產生 1 頁，不會有滑動/圓點，以後分類磚增加超過
// 4 張時這裡不用改，會自動變成多頁。
const categoryPages = computed(() => {
  const pages: typeof categoryTiles[] = [];
  for (let i = 0; i < categoryTiles.length; i += 4) {
    pages.push(categoryTiles.slice(i, i + 4));
  }
  return pages;
});

// 手機版滑動軌道本身看不出「這裡可以滑」的暗示，使用者不一定會想到要
// 滑，加一排跟首頁輪播圖（DessertSwiper）同一種手法的頁碼小圓點——
// 使用者看得到「還有第二頁」，也知道目前在第幾頁。用 scrollLeft 除以
// 容器寬度算出目前頁碼（四捨五入到最近的整頁，滑到一半時還是會抓到
// 比較接近的那一頁，不會抓到奇怪的小數頁碼）。
const categoryScrollEl = ref<HTMLElement | null>(null);
const categoryPageIndex = ref(0);
function handleCategoryScroll() {
  const el = categoryScrollEl.value;
  if (!el || el.clientWidth === 0) return;
  categoryPageIndex.value = Math.round(el.scrollLeft / el.clientWidth);
}

// Instagram 社群展示 --------------------------------------------------
// 跟 vanilla 版本用同一組圖片（img/lp.jpg 重複用了兩次，也是照抄原本的
// 寫法，不是筆誤）。純展示、沒有真的接 Instagram API。
const instagramPhotos = [
  "lp.jpg",
  "mae-mu-74HGrqRby2Q-unsplash.jpg",
  "slide3.jpg",
  "rens-d-6LTAljmu2cY-unsplash.jpg",
  "profile2.jpg",
  "lp.jpg",
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
      <p class="overlay-text mb-5 max-w-[400px] text-left text-[1.2rem] font-bold leading-[1.4] text-brand-brown">
        {{ t("home.slogan") }}
      </p>

      <div class="ai-chat-heading mb-4 max-w-[420px] text-left">
        <span class="mb-1.5 inline-block text-[13px] font-bold uppercase text-brand-orange">{{ t("home.aiLabel") }}</span>
        <h2 class="m-0 mb-1.5 text-[19px] leading-[1.3] text-brand-brown">{{ t("home.aiHeading") }}</h2>
      </div>

      <!-- 手機版聊天框加高：原本手機／桌機用同一組高度，使用者反應手機版
           看起來太小、擠不出對話感，這裡只加高 detail-md（手機）這個斷點，
           桌機版維持原本大小不動。 -->
      <div id="chatMessages" ref="chatMessagesEl" class="chat-messages box-border w-full max-w-[420px] min-h-[180px] max-h-[280px] overflow-y-auto rounded-[20px] border border-brand-border bg-white p-[18px] detail-md:min-h-[340px] detail-md:max-h-[460px]" aria-live="polite">
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
          :placeholder="t('home.chatPlaceholder')"
          autocomplete="off"
          :disabled="chatBusy"
          class="box-border min-w-0 flex-1 rounded-xl border border-brand-border px-[14px] py-[13px] text-base text-brand-brown"
        />
        <button
          type="submit"
          :disabled="chatBusy"
          class="inline-flex items-center gap-2 rounded-xl bg-brand-brown px-5 py-[13px] text-base leading-none text-white hover:bg-brand-brown-hover disabled:opacity-60"
        >
          {{ t("home.send") }}
          <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" /></svg>
        </button>
      </form>
    </div>

    <DessertSwiper />
  </section>

  <!-- Latest Reviews -->
  <div class="latest_review_section mx-auto max-w-[1000px] px-5 py-16 text-center">
    <div class="review-header mb-8 flex items-center justify-between text-left">
      <!-- 原本是 text-base（16px），比它下面卡片裡的店名（1.125rem/18px）
           還小，區塊標題比內容還不顯眼，層級感是反的。改成 text-2xl，
           跟 Categories 標題一起調整。 -->
      <h1 class="m-0 text-2xl font-bold text-brand-brown">{{ t("home.latestReviews") }}</h1>
    </div>
    <!-- 手機版（detail-md 以下）從 2 欄 grid 改成左右滑動：窄螢幕硬擠兩欄，
         每張卡片剩不到一半寬度，店名、圖片、文字全部被壓縮成一條，改成
         一次一張卡片（露一點下一張的邊，提示可以滑）、用 scroll-snap 讓
         滑動停在整張卡片上，比較好讀。桌機版 4 欄 grid 不受影響。 -->
    <div
      v-if="reviews.length"
      class="review-grid grid grid-cols-4 gap-5 detail-md:flex detail-md:snap-x detail-md:snap-mandatory detail-md:gap-4 detail-md:overflow-x-auto detail-md:pb-2"
    >
      <div
        v-for="review in reviews"
        :key="review.id"
        class="review-card h-full w-full detail-md:w-[82%] detail-md:min-w-[82%] detail-md:shrink-0 detail-md:snap-center"
      >
        <div class="flex h-full flex-col rounded-2xl bg-brand-gold p-[15px]">
          <div class="flex items-center gap-[15px]">
            <img src="/img/profile.jpg" :alt="review.reviewerName" class="h-[50px] w-[50px] rounded-full object-cover" />
            <div class="text-left">
              <p class="m-0 text-[0.9375rem] font-bold text-black">{{ review.reviewerName }}</p>
              <p class="mt-2 text-[0.8125rem] text-brand-brown">{{ formatDate(review.createdAt) }}</p>
            </div>
          </div>
          <div class="py-[15px] text-left">
            <h2 class="m-0 mb-1.5 text-[1.125rem] font-bold text-black">{{ (locale === "zh-TW" ? review.shopNameZh : review.shopName) || review.shopId }}</h2>
            <!-- 跟 shop 卡片一樣：全站通用的 `.rating span` 規則把這裡蓋成綠色小字。 -->
            <div class="mb-2.5 text-base">
              <span class="text-[10px] text-brand-green">{{ buildStars(review.rating) }}</span>
            </div>
            <img v-if="review.shopImage" :src="resolveShopImage(review.shopImage)" :alt="review.shopName" class="my-2.5 block h-[130px] w-full rounded-lg object-cover" />
            <p class="review-text my-2.5 line-clamp-3 text-[0.9375rem] text-[#555]">{{ review.text }}</p>
            <NuxtLink :to="`/shop/${review.shopId}`" class="read-more text-sm text-brand-green no-underline hover:underline">{{ t("common.readMore") }}</NuxtLink>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="rounded-2xl border border-brand-border bg-brand-cream p-7 text-left">
      <h2 class="mb-2 text-2xl text-brand-brown">{{ t("home.noReviews") }}</h2>
      <p class="text-brand-brown-light">
        {{ t("home.beFirstToReview") }}
        <NuxtLink to="/write-review" class="text-brand-orange underline">{{ t("home.writeAReview") }}</NuxtLink>.
      </p>
    </div>
  </div>

  <!-- Categories -->
  <section class="dessert_categories_section mx-auto max-w-[1000px] px-5 py-14 text-center">
    <div class="category-header mb-8 flex items-center justify-between text-left">
      <h2 class="m-0 text-2xl font-bold text-brand-brown">{{ t("home.categories") }}</h2>
      <NuxtLink to="/category" class="category-view-all text-sm text-brand-orange no-underline hover:underline">{{ t("home.viewAll") }}</NuxtLink>
    </div>
    <!-- 桌機版：4 欄 grid，一列放完 8 張（不變）。 -->
    <div class="category-grid hidden grid-cols-4 gap-5 md:grid">
      <CategoryCard v-for="tile in categoryTiles" :key="tile.query" v-bind="tile" />
    </div>

    <!-- 手機版：每「頁」2x2（4 張），左右滑動切頁，不是單排橫向滑動——8 張
         切成兩組各 4 張，每組是自己的 2 欄 grid，這些 grid 再整排排起來、
         用 scroll-snap 讓滑動停在整頁上，不會停在滑一半的地方。 -->
    <div
      ref="categoryScrollEl"
      class="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:hidden"
      @scroll="handleCategoryScroll"
    >
      <div v-for="(page, i) in categoryPages" :key="i" class="grid w-full shrink-0 snap-start grid-cols-2 gap-3">
        <CategoryCard v-for="tile in page" :key="tile.query" v-bind="tile" />
      </div>
    </div>

    <!-- 頁碼小圓點：跟首頁輪播圖同一種提示手法，讓使用者一眼看出「這裡
         滑得動、還有下一頁」，不用自己碰運氣去滑滑看。只在有一頁以上時
         才顯示（用 categoryPages.length 算，目前剛好 4 張分類磚只有
         1 頁不會顯示，之後分類磚超過 4 張變多頁時會自動出現，不用改
         這段）。 -->
    <div v-if="categoryPages.length > 1" class="mt-4 flex justify-center gap-2 md:hidden">
      <span
        v-for="(page, i) in categoryPages"
        :key="i"
        class="h-2 w-2 rounded-full transition-colors"
        :class="i === categoryPageIndex ? 'bg-brand-orange' : 'bg-brand-border'"
      />
    </div>
  </section>

  <!-- Instagram 社群展示（使用者要求加回來，跟 vanilla 版本一樣的位置：
       Categories 之後、電子報訂閱之前）。純展示、沒接任何後端，圖片跟
       vanilla 版本用的是同一組（img/lp.jpg 等）。 -->
  <section class="instagram_photo_section mt-[120px] mb-[15vh] bg-brand-gold px-5 py-[60px] text-center">
    <div class="instagram-container mx-auto max-w-[1200px]">
      <a
        href="https://www.instagram.com/cupertino.keki/"
        target="_blank"
        rel="noopener noreferrer"
        class="instagram-follow-btn inline-flex items-center gap-2 rounded bg-white px-5 py-2.5 text-[15px] text-brand-orange no-underline transition-all hover:-translate-y-0.5 hover:bg-brand-gold hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
        {{ t("home.followUs") }}
      </a>
      <p class="my-2.5 text-[15px] text-white">@cupertino.keki</p>
      <div class="instagram-grid mx-auto my-5 grid max-w-[1000px] grid-cols-6 gap-5 detail-md:grid-cols-3 nav-sm:grid-cols-2">
        <img
          v-for="(photo, i) in instagramPhotos"
          :key="i"
          :src="`/img/${photo}`"
          alt="Instagram Photo"
          class="h-[120px] w-full rounded-lg object-cover transition-transform hover:scale-105"
        />
      </div>
    </div>
  </section>

  <ScrollToTopButton />
</template>
