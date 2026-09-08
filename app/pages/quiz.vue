<script setup lang="ts">
// 甜點人格測驗（獨立頁面，網址 /quiz，刻意不放進首頁或導覽列——這是一個
// 拿來測試「分享會不會真的帶來流量」的實驗性內容，不是網站的核心功能，
// 現階段先靠使用者自己手動分享連結出去，等真的看到成效再考慮要不要在
// 首頁開一個入口）。
//
// 內容、題目、配分邏輯先在 Claude Artifact 上跟 Emily 反覆調整過（互動
// 預覽：https://claude.ai/code/artifact/25de4c2c-b897-4030-b9ab-2b3399067fc9），
// 這裡是把定案後的版本刻進真正的 Nuxt 專案，畫面改用 Tailwind + 專案既有
// 的品牌顏色（tailwind.config.ts 的 brand.*），不是原本 Artifact 那份
// 內嵌 <style> 的寫法。
//
// 語言：這頁刻意不走 i18n（沒有用 t()、內容直接寫死中文）。測驗的哏
// （「續命依賴者」「話題製造機」這種用詞）本來就是針對中文使用者的網路
// 語感反覆調整出來的，翻成英文會失去原本要的那種「有沒有打到你」的
// 共鳴感，跟網站其他頁面「同一份內容兩種語言」的情況不一樣，所以沒有
// 對應的 en.json／zh-TW.json 詞條。
import type { Shop } from "~/composables/useShops";

interface QuizOption {
  text: string;
  scores: Partial<Record<PersonaKey, number>>;
}

interface QuizQuestion {
  eyebrow: string;
  text: string;
  options: QuizOption[];
}

type PersonaKey = "hermit" | "worker" | "visual" | "hype" | "intel";

interface PersonaCopy {
  type: string;
  tagline: string;
  emoji: string;
}

// 5 種人格的 key 跟後端 main.py 的 QUIZ_PERSONAS 完全對應——這裡負責
// 「文案」（人格名稱、標語、emoji），真正配對到哪家店是後端 GET
// /api/quiz/match 的工作，前端不用、也不該自己再猜一次配對邏輯。
const PERSONAS: Record<PersonaKey, PersonaCopy> = {
  hermit: { type: "獨行厭世人", tagline: "邊界感拉滿，一個人的角落才是真正的充電站。", emoji: "🌙" },
  worker: { type: "續命依賴者", tagline: "被 KPI 榨乾的續命依賴者，甜點是撐過下午的最後一根浮木。", emoji: "💼" },
  visual: { type: "外貌協會", tagline: "手機先吃，濾鏡比口味更早被你決定。", emoji: "📸" },
  hype: { type: "話題製造機", tagline: "不跟風會焦慮，排隊排的不是隊伍，是話題。", emoji: "🔥" },
  intel: { type: "情報中心", tagline: "假吃甜點真八卦，這裡才是你的情報總部。", emoji: "☕️" },
};

// 平手時的優先順序：跟 Artifact 版本一致，固定用同一組順序決定「分數
// 一樣高的時候算誰」，不用每次重新算都不一樣。
const TIE_BREAK_ORDER: PersonaKey[] = ["hermit", "worker", "visual", "hype", "intel"];

const QUESTIONS: QuizQuestion[] = [
  {
    eyebrow: "第 1 題 / 4",
    text: "難得的週末下午，突然下起大雨，你的直覺反應是？",
    options: [
      { text: "太好了，名正言順窩去一個人的角落", scores: { hermit: 3, worker: 1 } },
      { text: "傳訊息問朋友要不要一起去躲雨聊天", scores: { intel: 3, hype: 1 } },
      { text: "剛好可以躲進那家一直想拍照打卡的新店", scores: { visual: 3, intel: 1 } },
      { text: "正好拿來把上週欠的工作趕一趕", scores: { worker: 3, hermit: 1 } },
    ],
  },
  {
    eyebrow: "第 2 題 / 4",
    text: "踏進一家從沒去過的甜點店，你會先注意什麼？",
    options: [
      { text: "燈光好不好、角度拍不拍得出美照", scores: { visual: 3, intel: 1 } },
      { text: "有沒有插座、位子好不好久坐", scores: { worker: 3, hermit: 1 } },
      { text: "店內夠不夠安靜、適不適合自己一個人待著", scores: { hermit: 3 } },
      { text: "先滑一下這家在網路上紅不紅、排隊人多不多", scores: { hype: 3, intel: 1 } },
    ],
  },
  {
    eyebrow: "第 3 題 / 4",
    text: "走到愛店門口，發現前面排了 15 個人，你會？",
    options: [
      { text: "都來了，排一小時也甘願，就為了那個限定口味", scores: { hype: 3 } },
      { text: "默默轉頭離開，不想罰站", scores: { hermit: 2, worker: 2 } },
      { text: "拍張排隊人潮先發個限動，邊排邊等", scores: { intel: 2, hype: 2 } },
      { text: "反正都排了，滑手機順便回一下工作訊息", scores: { worker: 3 } },
    ],
  },
  {
    eyebrow: "第 4 題 / 4",
    text: "站在琳瑯滿目的甜點櫃前，最後讓你決定結帳的關鍵是？",
    options: [
      { text: "看到「每日限量」或「網路爆款」這幾個字，不買不行。", scores: { hype: 3, visual: 1, intel: 1 } },
      { text: "這款造型太精緻了，跟今天的穿搭和桌色最搭。", scores: { visual: 3, hype: 1 } },
      { text: "這款吃起來最方便，不用切得碎碎的，也不用跟別人分。", scores: { hermit: 3, worker: 1, visual: -1, intel: -1 } },
      { text: "朋友指著它說：「這個超好吃，我們點來一起分！」", scores: { intel: 3, hype: 1, hermit: -1 } },
    ],
  },
];

const { matchQuizPersona } = useShops();
const { show } = useSiteMessage();

type Screen = "intro" | "question" | "result";
const screen = ref<Screen>("intro");
const currentIndex = ref(0);
const scores = ref<Record<PersonaKey, number>>({ hermit: 0, worker: 0, visual: 0, hype: 0, intel: 0 });
const selectedOptionIndex = ref<number | null>(null);

const resultPersona = ref<PersonaKey | null>(null);
const matchedShop = ref<Shop | null>(null);
const matchLoading = ref(false);
const matchFailed = ref(false);

const currentQuestion = computed(() => QUESTIONS[currentIndex.value]);

function startQuiz() {
  currentIndex.value = 0;
  scores.value = { hermit: 0, worker: 0, visual: 0, hype: 0, intel: 0 };
  selectedOptionIndex.value = null;
  resultPersona.value = null;
  matchedShop.value = null;
  matchFailed.value = false;
  screen.value = "question";
}

async function selectOption(option: QuizOption, index: number) {
  if (selectedOptionIndex.value !== null) return; // 已經選過了，避免手滑重複觸發
  selectedOptionIndex.value = index;

  for (const [key, value] of Object.entries(option.scores)) {
    scores.value[key as PersonaKey] += value ?? 0;
  }

  // 留一點時間讓使用者看到自己選到的那個選項被標起來，跟原本 Artifact
  // 版本的節奏一致，不是選完立刻跳下一題，畫面上完全沒有反饋。
  await new Promise((resolve) => setTimeout(resolve, 320));

  selectedOptionIndex.value = null;
  if (currentIndex.value < QUESTIONS.length - 1) {
    currentIndex.value += 1;
  } else {
    await showResult();
  }
}

async function showResult() {
  let best = TIE_BREAK_ORDER[0];
  for (const key of TIE_BREAK_ORDER) {
    if (scores.value[key] > scores.value[best]) best = key;
  }
  resultPersona.value = best;
  screen.value = "result";

  matchLoading.value = true;
  matchFailed.value = false;
  try {
    const data = await matchQuizPersona(best, 1);
    matchedShop.value = data.shops[0] ?? null;
  } catch {
    matchFailed.value = true;
  } finally {
    matchLoading.value = false;
  }
}

function restart() {
  screen.value = "intro";
}

// 分享：跟店家詳情頁 handleShare() 是同一套邏輯（見 shop/[id].vue）——
// 優先用瀏覽器原生分享面板，沒有支援就退回複製連結到剪貼簿。分享的內容
// 是「這個測驗」的網址，不是某次測驗結果專屬的網址（目前沒有把結果編碼
// 進網址參數，先讓分享的人自己重新測一次）。
async function handleShare() {
  const shareData = {
    title: "甜點人格測驗",
    text: resultPersona.value
      ? `我的甜點人格是「${PERSONAS[resultPersona.value].type}」，你呢？`
      : "來測測看你是哪一種甜點人格！",
    url: window.location.href,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        show("分享失敗，請稍後再試一次。");
      }
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(window.location.href);
    show("連結已複製！");
  } catch {
    show("分享失敗，請稍後再試一次。");
  }
}
</script>

<template>
  <section
    class="flex min-h-[calc(100vh-180px)] w-full items-start justify-center px-5 pb-20 pt-24"
    style="
      background-color: #fdf3e1;
      background-image: radial-gradient(circle at 6px 6px, rgba(249, 167, 38, 0.16) 1.6px, transparent 1.6px),
        radial-gradient(circle at 26px 26px, rgba(90, 143, 41, 0.12) 1.6px, transparent 1.6px);
      background-size: 32px 32px;
    "
  >
    <div class="w-full max-w-[420px]">
      <div
        class="relative flex min-h-[560px] flex-col overflow-hidden rounded-[24px] border border-brand-border bg-white shadow-[0_12px_40px_rgba(58,37,19,0.12)]"
      >
        <!-- 進度條：只在題目畫面顯示 -->
        <div v-if="screen === 'question'" class="flex gap-1.5 px-6 pt-5">
          <div
            v-for="(_, i) in QUESTIONS"
            :key="i"
            class="h-1 flex-1 overflow-hidden rounded-full bg-brand-panel"
          >
            <span
              class="block h-full bg-brand-orange transition-[width] duration-300 ease-out"
              :style="{ width: i < currentIndex ? '100%' : i === currentIndex ? '50%' : '0%' }"
            />
          </div>
        </div>

        <!-- Intro -->
        <div v-if="screen === 'intro'" class="flex flex-1 flex-col items-center justify-center gap-1 px-6 py-7 text-center">
          <div class="mb-3.5 text-5xl leading-none">🍮</div>
          <div class="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-orange-dark">
            Sugar.Topia 甜點人格測驗
          </div>
          <h1 class="mb-2.5 text-[1.55rem] font-bold text-balance text-brand-brown">你的靈魂甜點人格是？</h1>
          <p class="mb-7 max-w-[30ch] text-[0.9375rem] leading-relaxed text-brand-brown-light">
            4 題情境題，看看你到底是「獨行厭世人」還是「話題製造機」——測完還附上一家真的適合你的店。
          </p>
          <div class="mb-7 flex justify-center gap-[18px] text-[0.8125rem] text-brand-brown-light">
            <span class="flex items-center gap-1.5">⏱️ 30 秒</span>
            <span class="flex items-center gap-1.5">🎯 4 題</span>
            <span class="flex items-center gap-1.5">🍰 5 種人格</span>
          </div>
          <button
            class="w-full rounded-xl bg-brand-orange px-5 py-3.5 text-[0.9375rem] font-semibold text-white transition hover:-translate-y-px hover:bg-brand-orange-dark"
            @click="startQuiz"
          >
            開始測驗
          </button>
        </div>

        <!-- Question -->
        <div v-else-if="screen === 'question'" class="flex flex-1 flex-col px-6 pb-6 pt-7">
          <div class="mb-2.5 mt-[18px] text-xs font-bold tracking-[0.06em] text-brand-orange-dark">
            {{ currentQuestion.eyebrow }}
          </div>
          <div class="mb-[22px] text-lg font-semibold leading-relaxed text-balance text-brand-brown">
            {{ currentQuestion.text }}
          </div>
          <div class="mt-auto flex flex-col gap-2.5">
            <button
              v-for="(option, i) in currentQuestion.options"
              :key="i"
              type="button"
              class="rounded-[14px] border-[1.5px] px-4 py-3.5 text-left text-sm leading-relaxed text-brand-brown transition active:scale-[0.99]"
              :class="
                selectedOptionIndex === i
                  ? 'border-brand-orange bg-brand-hover shadow-[inset_0_0_0_1px_#F9A726]'
                  : 'border-brand-border bg-brand-cream hover:border-brand-orange hover:bg-brand-hover'
              "
              :disabled="selectedOptionIndex !== null"
              @click="selectOption(option, i)"
            >
              {{ option.text }}
            </button>
          </div>
        </div>

        <!-- Result -->
        <div v-else-if="screen === 'result' && resultPersona" class="flex flex-1 flex-col">
          <div
            class="relative overflow-hidden px-6 pb-[30px] pt-10 text-center"
            style="background: linear-gradient(160deg, #fcdc94, #f9a726)"
          >
            <div class="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-brand-brown/70">你的甜點人格是</div>
            <div class="relative mb-3.5 inline-block">
              <div class="relative z-10 text-[2rem] font-bold text-balance text-brand-brown">
                {{ PERSONAS[resultPersona].type }}
              </div>
              <svg class="absolute -inset-x-[6%] -bottom-1.5 z-0 h-3.5 opacity-55" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
                <path
                  d="M0,8 C20,2 40,14 60,8 C80,2 100,14 120,8 C140,2 160,14 180,8 C190,5 195,7 200,8"
                  fill="none"
                  stroke="#3A2513"
                  stroke-width="3"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <p class="mx-auto max-w-[32ch] text-[0.9375rem] leading-relaxed text-brand-brown">
              {{ PERSONAS[resultPersona].tagline }}
            </p>
          </div>

          <div class="flex flex-col gap-4 px-6 pb-6 pt-[22px]">
            <div>
              <div class="mb-2 text-xs font-bold tracking-[0.04em] text-brand-brown-light">為你配對的真實店家</div>

              <p v-if="matchLoading" class="rounded-2xl border border-brand-border bg-brand-cream p-3 text-sm text-brand-brown-light">
                配對中…
              </p>
              <p v-else-if="matchFailed || !matchedShop" class="rounded-2xl border border-brand-border bg-brand-cream p-3 text-sm text-brand-brown-light">
                目前配對不到店家，
                <NuxtLink to="/category" class="text-brand-orange underline">去逛逛所有店家</NuxtLink>
                。
              </p>
              <NuxtLink
                v-else
                :to="`/shop/${matchedShop.id}`"
                class="flex items-center gap-3 rounded-2xl border border-brand-border bg-brand-cream p-3 text-inherit no-underline"
              >
                <img
                  :src="resolveShopImage(matchedShop.image)"
                  :alt="matchedShop.nameZh || matchedShop.name"
                  class="h-14 w-14 shrink-0 rounded-xl bg-brand-gold object-cover"
                />
                <div>
                  <h3 class="mb-0.5 text-[0.9375rem] font-bold text-brand-brown">
                    {{ matchedShop.nameZh || matchedShop.name }}
                  </h3>
                  <p class="text-[0.8125rem] font-semibold text-brand-green">
                    {{ matchedShop.locationZh || matchedShop.location }}
                  </p>
                </div>
              </NuxtLink>
            </div>

            <div class="flex gap-2.5">
              <button
                type="button"
                class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-orange px-5 py-3.5 text-[0.9375rem] font-semibold text-white transition hover:-translate-y-px hover:bg-brand-orange-dark"
                @click="handleShare"
              >
                📤 分享結果
              </button>
              <button
                type="button"
                class="max-w-[110px] flex-1 rounded-xl border-[1.5px] border-brand-border px-5 py-3 text-sm font-semibold text-brand-brown transition hover:bg-brand-hover"
                @click="restart"
              >
                再測一次
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
