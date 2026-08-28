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
const { t } = useI18n();

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
const categoryTiles = [
  { labelKey: "category.filterCategories.cinnamonRolls", query: "Cinnamon Rolls", image: "c1-icon.svg" },
  { labelKey: "category.filterCategories.iceCreams", query: "Ice Creams", image: "c2-icon.svg" },
  { labelKey: "category.filterCategories.bagels", query: "Bagels", image: "c3-icon.svg" },
  { labelKey: "category.filterCategories.cheesecakes", query: "Cheesecakes", image: "c4-icon.svg" },
  { labelKey: "category.filterCategories.macaron", query: "Macaron", image: "c5-icon.svg" },
  { labelKey: "category.filterCategories.cafes", query: "Cafes", image: "c6-icon.svg" },
  { labelKey: "category.filterCategories.dogFriendly", query: "Dogs Friendly", image: "c7-icon.svg" },
  { labelKey: "category.filterCategories.alcoholInfusedShort", query: "Alcohol", image: "c8-icon.svg" },
];

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
      <h1 class="m-0 text-base font-bold text-brand-brown">{{ t("home.latestReviews") }}</h1>
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
            <h2 class="m-0 mb-1.5 text-[1.125rem] font-bold text-black">{{ review.shopName || review.shopId }}</h2>
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
      <h2 class="m-0 text-base font-bold text-brand-brown">{{ t("home.categories") }}</h2>
      <NuxtLink to="/category" class="category-view-all text-sm text-brand-orange no-underline hover:underline">{{ t("home.viewAll") }}</NuxtLink>
    </div>
    <!-- 手機版（detail-md 以下）跟 Latest Reviews 一樣改成左右滑動：一次看
         4 個圖示（露一點第 5 個的邊，提示可以滑），跟你截圖參考的 Uber Eats
         分類列同一種做法，也讓整頁的滑動手感一致，不會這裡格狀、那裡滑動
         混著用。桌機版 4 欄 grid 不變。 -->
    <div
      class="category-grid grid grid-cols-4 gap-5 detail-md:flex detail-md:snap-x detail-md:snap-mandatory detail-md:gap-3 detail-md:overflow-x-auto detail-md:pb-2"
    >
      <NuxtLink
        v-for="tile in categoryTiles"
        :key="tile.query"
        :to="`/category?q=${encodeURIComponent(tile.query)}`"
        class="category-card flex flex-col items-center rounded-2xl p-2.5 transition hover:scale-[0.98] hover:bg-[rgba(249,168,38,0.2)] detail-md:w-[27%] detail-md:min-w-[27%] detail-md:shrink-0 detail-md:snap-start"
      >
        <!-- 邊框改成 CSS 畫（不是圖片本身自帶的邊框），圖示跟文字都放回同一個
             邊框裡（跟原本圖片內建邊框、文字在圖示下方的排版一致），只是
             文字現在是真的 HTML 文字，才能跟著介面語言切換。
             高度改成讓內容自己撐開（不用 aspect-[4/3] 這種寫死比例）：手機版
             卡片寬度只有桌機版的一小部分（22% vs 200px），寫死比例算出來的
             高度會跟著等比縮小，圖示卻是固定 px 高度不會跟著變小，兩個一衝突
             文字就會被擠出邊框外——拿掉寫死比例，box 高度看內容（圖示+文字+
             padding）自然決定，兩種寬度都不會互相打架。
             h-full：category-grid（grid／flex）預設就會把同一列的每張卡片
             拉成一樣高（align-items: stretch 是 grid／flex 的預設值），但
             那只讓外層 NuxtLink 一樣高，邊框是「NuxtLink 裡面另一層 div」，
             不會自動跟著撐滿，不加 h-full 的話，店名一行的卡片（例如
             Bagels）邊框會比店名兩行的卡片（例如 Cinnamon Rolls）矮一截，
             即使外層兩張 NuxtLink 其實已經一樣高了。桌機版另外加高
             padding（py-3 → py-6），原本比例撐出來的高度感這次用留白補回來。 -->
        <div class="flex h-full w-full max-w-[200px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-brand-orange bg-white px-2 py-3 transition-transform hover:scale-95 detail-md:px-1 md:py-6">
          <!-- 圖片本身的畫布（viewBox）原本比圖示實際佔的範圍大很多——下半部
               是留給圖片內建文字的空間，拿掉文字後變成透明留白，直接放大
               圖片會把那塊留白一起撐開，圖示跟下面文字之間就會空一大截。
               這裡改成把每張圖的 viewBox 直接裁到圖示本身的邊界（量出每個
               圖示路徑實際的座標範圍，只留這個範圍 + 一點邊距），不再靠
               CSS 裁切，圖片本身的可視內容就是乾淨的圖示，沒有多餘留白。 -->
          <img
            :src="`/img/${tile.image}`"
            :alt="t(tile.labelKey)"
            class="h-12 w-auto object-contain"
          />
          <!-- min-w-0：flex 子項目預設不會主動縮小去符合容器寬度（flexbox
               常見的坑），沒有這個手機版窄卡片會被長店名文字撐出邊框外。 -->
          <p class="w-full min-w-0 text-center text-base font-semibold text-brand-orange detail-md:text-sm">{{ t(tile.labelKey) }}</p>
        </div>
      </NuxtLink>
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
