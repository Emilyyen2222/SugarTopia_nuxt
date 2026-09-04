<script setup lang="ts">
// 對應 vanilla 版本的 <header class="header"> 整塊（index.html + CSS/style.css
// + Js/hamburger.js）。
//
// 跟 vanilla 版本最大的不同：logo 置中不再用 position: fixed 硬定位（vanilla
// 版本這樣做，今天在 vanilla 上就因為這個踩了兩次「header 其他內容變寬時
// 撞到 logo」的 bug，一次是桌機版 My Favorites、一次是真手機寬度的搜尋欄）。
// 這裡改用 CSS Grid 三欄（grid-template-columns: 1fr auto 1fr），logo 放中間
// 欄、天生置中，左右兩欄各自變寬變窄都不會撞到中間，是這次重構順便修掉的
// 結構性問題，畫面結果跟 vanilla 版本一樣。
//
// nav-menu 在窄螢幕（≤1380px）要嘛整個隱藏、要嘛變成漢堡選單點開的下拉
// 面板，這段「同一個區塊在不同螢幕寬度 + 不同互動狀態下要長得完全不一樣」
// 的邏輯，用 Tailwind 的 class 組合表達會很難讀，這裡用一小段 scoped CSS
// （直接對應 vanilla 版本原本的媒體查詢）處理，其餘顏色/間距還是走 Tailwind。

const { user, isLoggedIn, logout } = useAuth();
const searchQuery = ref("");
const mobileMenuOpen = ref(false);
const headerLeftEl = ref<HTMLElement | null>(null);
const router = useRouter();
const route = useRoute();
const { show } = useSiteMessage();
const { t, locale, locales, setLocale } = useI18n();

// 語言切換：按鈕顯示的是「切過去會變成哪個語言」，不是目前語言（跟大部分
// 網站的慣例一致，例如按鈕顯示「中文」代表按下去會切成中文）。用
// nuxt.config.ts 裡設定的 locales 清單反查另一個語言，不寫死「英文/中文」
// 這兩個字，以後真的要加第三語言也不用改這段邏輯。
// 顯示文字改用縮寫（EN／中文），不是完整的 English／繁體中文——原本的
// 完整字放進 header 右側那排 write a review／cupertino.keki 中間，在
// 1024～1380px 這個寬度區間（漢堡選單跟桌機文字連結會同時出現的地帶）
// 太長，擠得整排換行、很亂，縮寫比較不占位置，也更接近使用者自己
// portfolio 網站上那種簡潔的圓角切換鈕做法。
const SHORT_LOCALE_LABELS: Record<string, string> = { en: "EN", "zh-TW": "中文" };
const otherLocale = computed(() => locales.value.find((l) => (typeof l === "string" ? l : l.code) !== locale.value));
const otherLocaleCode = computed(() => {
  const other = otherLocale.value;
  if (!other) return "";
  return typeof other === "string" ? other : other.code;
});
const otherLocaleName = computed(() => SHORT_LOCALE_LABELS[otherLocaleCode.value] || otherLocaleCode.value);
function toggleLocale() {
  if (otherLocaleCode.value) setLocale(otherLocaleCode.value);
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}

// 帳號選單（我的最愛／我的願望單／登出）：跟 CategoriesDropdown.vue 同一種
// 「純用 Vue 的 v-if 開關、不依賴 CSS 媒體查詢」的下拉選單寫法，不是借用
// .nav-menu 那組只在 ≤1380px 才有效的 is-active 機制——一開始想直接把
// 「我的最愛」「我的願望單」塞進 .nav-menu（跟 Categories 共用），結果
// 實測發現寬螢幕（>1380px）時 .nav-menu 預設就是 display:flex，is-active
// 這個 class 在那個寬度完全沒有作用，兩個連結還是會直接攤開顯示在
// header 上，沒有真的達到使用者要的「收進選單、header 保持乾淨」。
// 獨立做一個不受那個斷點限制的選單，才會在所有寬度都是「點了才展開」。
const accountMenuOpen = ref(false);
const accountMenuEl = ref<HTMLElement | null>(null);
function toggleAccountMenu() {
  accountMenuOpen.value = !accountMenuOpen.value;
}
function closeAccountMenu() {
  accountMenuOpen.value = false;
}

// 點漢堡選單裡任何一個會換頁的連結（Categories 面板裡的分類、write a
// review）都要收合選單，不是只有點外面才收合。原本只靠個別連結各自的
// @click="closeMobileMenu"，Categories 面板裡的連結是 CategoriesDropdown
// 元件自己管的、沒有接手這個父層的收合邏輯，直接監看路由變化更保險、
// 不用每個連結都手動接一次。
watch(
  () => route.fullPath,
  () => {
    closeMobileMenu();
    closeAccountMenu();
  }
);

function handleClickOutside(event: MouseEvent) {
  if (headerLeftEl.value && !headerLeftEl.value.contains(event.target as Node)) {
    closeMobileMenu();
  }
  if (accountMenuEl.value && !accountMenuEl.value.contains(event.target as Node)) {
    closeAccountMenu();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeMobileMenu();
    closeAccountMenu();
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeydown);
});

// event.isComposing：用中文/日文注音等輸入法打字時，選字後按下的第一次
// Enter 其實是輸入法在「確認候選字」，瀏覽器還是會照樣觸發一次 keydown
// Enter 事件，但這時候 v-model 綁定的 searchQuery 還沒同步成剛選好的文字
// （例如打「貝果」，選字那次 Enter 抓到的還是打到一半/空字串），送出去
// 會變成搜尋空字串（等於顯示全部店家）；真正打完字之後的第二次 Enter
// 才會抓到正確內容。isComposing 為 true 就代表「這次 Enter 是輸入法在
// 確認候選字，不是使用者要送出搜尋」，直接跳過即可，不會誤觸發。
function handleSearchSubmit(event?: KeyboardEvent) {
  if (event?.isComposing) return;

  const query = searchQuery.value.trim();
  router.push(query ? `/category?q=${encodeURIComponent(query)}` : "/category");
}

async function handleLogout() {
  await logout();
  show(t("header.loggedOut"));
}
</script>

<template>
  <header class="header fixed left-0 top-0 z-[1000] h-20 w-full text-[1rem]">
    <!-- 左右兩色背景，跟置中機制（Grid）完全獨立，維持 vanilla 版本原本
         「左邊米色漸層、右邊橘色」的視覺。 -->
    <div
      class="pointer-events-none absolute left-0 top-0 h-full w-1/2"
      style="background: linear-gradient(to left, #fcdc94, #fff)"
    />
    <div class="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-brand-orange" />

    <div class="relative z-[1] mx-auto grid h-full max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center px-5">
      <!-- 左欄：漢堡、搜尋欄、Categories -->
      <div ref="headerLeftEl" class="header-left flex items-center gap-[22px] nav-sm:gap-2">
        <!-- 三顆圖示按鈕（漢堡、搜尋、下面 template 裡的帳號頭像）統一成
             47×47px 正方形、8px 圓角（rounded-lg）——原本三顆是三套不同時期
             各自加的尺寸／圓角寫法，湊在一起看起來像拼裝的，這裡統一成同一組
             視覺語言，帳號頭像本來就是這個尺寸，不用改，另外兩顆對齊它。 -->
        <div
          id="mobile-menu"
          class="menu-toggle hidden h-[47px] w-[47px] cursor-pointer flex-col items-center justify-center gap-[3px] rounded-lg border-[3px] border-brand-orange bg-white hover:scale-105 hover:bg-brand-gold hover:shadow-md nav-lg:flex"
          @click.stop="toggleMobileMenu"
        >
          <span class="h-[3px] w-4 bg-brand-orange" />
          <span class="h-[3px] w-4 bg-brand-orange" />
          <span class="h-[3px] w-4 bg-brand-orange" />
        </div>

        <div class="search-bar flex items-center gap-1.5 nav-sm:gap-0">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('header.searchPlaceholder')"
            class="search-input h-[47px] w-[160px] rounded border border-[#ddd] px-2 text-[0.8rem] nav-sm:hidden"
            @keydown.enter="handleSearchSubmit"
          />
          <button
            type="button"
            class="flex h-[47px] w-[47px] items-center justify-center rounded-lg bg-brand-orange text-white"
            @click="handleSearchSubmit"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        <nav class="nav-menu" :class="{ 'is-active': mobileMenuOpen }">
          <!-- 原本這裡還有一個 .nav-menu-mobile-links 區塊，裝著「寫評論」
               連結跟中英文切換按鈕，兩個後來都搬走了：「寫評論」整個拿掉
               （見上面歷史留言／write-review.vue 的 lockedShop 設計），
               中英文切換則是使用者要求改放回 header 上跟帳號圖示放一起
               （下面 nav-md:inline-flex 那顆），漢堡選單裡這顆變成完全
               重複的第二顆語言切換按鈕，一併拿掉，不留一個空殼 div。 -->
          <!-- 「我的最愛」「我的願望單」原本試著塞進這個 .nav-menu，跟
               Categories 共用——但這裡在寬螢幕（>1380px）預設就是
               display:flex，不受 mobileMenuOpen 控制，兩個連結在桌機版
               還是會直接攤開顯示，沒有真的收起來。改成獨立的帳號選單
               （accountMenuOpen，見下面），不跟這裡共用開關狀態。 -->
          <CategoriesDropdown />
        </nav>
      </div>

      <!-- 中欄：logo，Grid 天生置中，不用 position: fixed -->
      <div class="logo-container justify-self-center">
        <NuxtLink to="/">
          <img src="/img/logo.svg" alt="Sugar.Topia" class="h-[clamp(40px,13vw,70px)] w-auto transition-transform nav-sm:h-[clamp(32px,11vw,70px)] hover:scale-90" />
        </NuxtLink>
      </div>

      <!-- 右欄：actions -->
      <div ref="accountMenuEl" class="relative flex items-center justify-self-end">
        <!-- whitespace-nowrap：這排全部強制單行，寧可整排在極窄的中間寬度
             區間被裁切／溢出，也不要讓短短兩三個字被硬拆成兩行（例如
             「Log In」拆成「Log／In」）——那種斷字方式比裁切還難看，也
             更難一眼看懂按鈕在寫什麼。 -->
        <!-- 中英文切換：按鈕文字顯示「切過去會變成的語言」，縮寫成
             EN／中文，做成小圓角膠囊按鈕（不是純文字連結），視覺上跟
             write a review／cupertino.keki 那種文字連結分開，也比完整
             單字省空間。桌機版放在這排 meta 連結旁邊，窄螢幕版本在上面
             的漢堡選單面板裡（避免再往本來就擠的 header 圖示列塞第四顆
             按鈕）。 -->
        <button
          type="button"
          class="mr-6 whitespace-nowrap rounded-full border border-white/70 px-3 py-1 text-[0.8125rem] font-medium text-white transition-colors hover:border-white hover:bg-white hover:text-brand-orange nav-md:hidden"
          @click="toggleLocale"
        >
          {{ otherLocaleName }}
        </button>

        <template v-if="isLoggedIn">
          <!-- 「我的最愛」「我的願望單」原本是這裡各自一條常駐連結，使用者
               要求收起來、header 保持乾淨，改成點「Hi, {name}」才展開的
               帳號選單（accountMenuOpen，跟 CategoriesDropdown 同一種
               v-if 開關寫法，不受任何寬度限制，任何螢幕寬度都是「點了
               才展開」，不會像 .nav-menu 那樣在寬螢幕變成常駐攤開）。 -->
          <button
            type="button"
            class="ml-5 flex items-center gap-1 whitespace-nowrap text-[0.9375rem] font-semibold text-white nav-md:hidden"
            @click.stop="toggleAccountMenu"
          >
            {{ t("header.hi", { name: user?.name }) }}
            <svg
              class="shrink-0 transition-transform duration-150"
              :class="{ 'rotate-180': accountMenuOpen }"
              width="10"
              height="7"
              viewBox="0 0 12 8"
              fill="none"
            >
              <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </template>
        <template v-else>
          <NuxtLink
            to="/login"
            class="ml-5 mr-1 whitespace-nowrap rounded-[9px] border border-white px-4 py-2 text-[0.9375rem] text-white no-underline hover:bg-brand-gold nav-md:hidden"
          >
            {{ t("header.logIn") }}
          </NuxtLink>
          <NuxtLink
            to="/signup"
            class="whitespace-nowrap rounded-[9px] border border-white bg-white px-4 py-2 text-[0.9375rem] text-brand-orange no-underline hover:bg-brand-gold nav-md:hidden"
          >
            {{ t("header.signUp") }}
          </NuxtLink>
        </template>

        <!-- 中英文切換（窄螢幕版）：之前收進漢堡選單面板，怕使用者想不到
             要點開漢堡選單才找得到，改放回 header 上、跟帳號圖示放一起。
             顏色跟桌機版那顆一樣用白色（border-white/text-white），不是
             橘色——這裡是 header 右半邊的橘色底色，一開始寫成橘色邊框
             配橘色文字，等於橘色疊橘色，完全看不見，是這次修正的重點。 -->
        <button
          type="button"
          class="mr-2 hidden whitespace-nowrap rounded-full border border-white/70 px-3 py-1 text-[0.8125rem] font-medium text-white transition-colors hover:border-white hover:bg-white hover:text-brand-orange nav-md:inline-flex"
          @click="toggleLocale"
        >
          {{ otherLocaleName }}
        </button>

        <!-- 窄螢幕（≤1024px）用一顆帳號 icon 取代上面那排文字按鈕。
             vanilla 版本這顆按鈕（.login_avatar／.auth-favorites）也沒有
             aria-label，純圖示連結沒有可讀的名字，這裡順便補上，螢幕
             閱讀器使用者才知道這顆按鈕是做什麼的；同時也讓測試有穩定的
             文字可以定位，不用另外接一個只為了測試用的 class。
             登入時這顆點下去打開的是跟桌機版同一個帳號選單
             （accountMenuOpen），不是漢堡選單——帳號相關的連結（我的
             最愛／願望單／登出）都集中在這一個選單裡，跟 Categories
             那個漢堡選單是分開的兩件事。沒登入時維持原本行為，直接連去
             登入頁。 -->
        <button
          v-if="isLoggedIn"
          type="button"
          :aria-label="t('header.accountMenu')"
          class="hidden h-[47px] w-[47px] items-center justify-center rounded-lg border-2 border-brand-avatar bg-brand-avatar text-[1.6rem] text-brand-orange hover:scale-105 hover:text-white hover:shadow-md nav-md:flex"
          @click.stop="toggleAccountMenu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-[1.6rem] w-[1.6rem]">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="10" r="3" />
            <path d="M6.2 18.5a6 6 0 0 1 11.6 0" />
          </svg>
        </button>
        <NuxtLink
          v-else
          to="/login"
          :aria-label="t('header.logIn')"
          class="hidden h-[47px] w-[47px] items-center justify-center rounded-lg border-2 border-brand-avatar bg-brand-avatar text-[1.6rem] text-brand-orange hover:scale-105 hover:text-white hover:shadow-md nav-md:flex"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-[1.6rem] w-[1.6rem]">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="10" r="3" />
            <path d="M6.2 18.5a6 6 0 0 1 11.6 0" />
          </svg>
        </NuxtLink>

        <!-- 帳號選單面板：「Hi, {name}」文字按鈕（桌機版）跟帳號 icon
             （窄螢幕版）共用同一個面板、同一個 accountMenuOpen 開關，兩顆
             觸發按鈕不會同時出現（各自的 nav-md 斷點互斥），面板固定貼齊
             最外層容器（accountMenuEl，有 position: relative）的右邊，不用
             另外為兩種寬度各寫一份定位邏輯。 -->
        <div
          v-if="isLoggedIn && accountMenuOpen"
          class="absolute right-0 top-[calc(100%+10px)] z-[1100] w-[180px] rounded-2xl border border-brand-panel bg-white p-2 shadow-[0_12px_32px_rgba(58,37,19,0.18)]"
        >
          <NuxtLink to="/favorites" class="block rounded-[10px] px-3 py-2.5 text-[0.9375rem] font-medium text-brand-brown no-underline hover:bg-brand-hover" @click="closeAccountMenu">
            {{ t("header.myFavorites") }}
          </NuxtLink>
          <NuxtLink to="/wishlist" class="block rounded-[10px] px-3 py-2.5 text-[0.9375rem] font-medium text-brand-brown no-underline hover:bg-brand-hover" @click="closeAccountMenu">
            {{ t("header.myWishlist") }}
          </NuxtLink>
          <NuxtLink to="/profile" class="block rounded-[10px] px-3 py-2.5 text-[0.9375rem] font-medium text-brand-brown no-underline hover:bg-brand-hover" @click="closeAccountMenu">
            {{ t("header.editAvatar") }}
          </NuxtLink>
          <div class="my-1 border-t border-brand-panel" />
          <button
            type="button"
            class="block w-full rounded-[10px] px-3 py-2.5 text-left text-[0.9375rem] font-medium text-brand-brown hover:bg-brand-hover"
            @click="handleLogout(); closeAccountMenu();"
          >
            {{ t("header.logOut") }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* 對應 vanilla 版本 CSS/style.css 裡 .nav-menu 在 ≤1380px 的收合邏輯：
   預設（>1380px）用一般 flex 排在 header-left 裡；≤1380px 整個隱藏，
   除非被漢堡按鈕點開（.is-active），這時候變成貼在 header 下面的
   下拉面板。這段狀態切換寫成 Tailwind 的 class 組合會很難讀，直接寫
   對應的 CSS 規則，跟 vanilla 版本的原始邏輯一一對應。 */
.nav-menu {
  display: flex;
  align-items: center;
  gap: 22px;
}

@media (max-width: 1380px) {
  .nav-menu {
    display: none;
  }

  .nav-menu.is-active {
    display: flex;
    flex-direction: column;
    /* 這裡原本沒有覆寫 align-items，會沿用上面 .nav-menu 基本規則的
       align-items: center——橫排（flex-direction: row）時 center 是對的
       （置中對齊同一列的項目），但直排（column）時 align-items 管的是
       水平方向，會讓「甜點分類」這種內容自身寬度較窄的項目在面板裡水平
       置中，看起來像被推到偏右邊，不是貼齊面板左邊界。改成 flex-start
       讓面板裡每一項都靠左對齊，跟外面漢堡按鈕的左邊界視覺對齊。 */
    align-items: flex-start;
    position: absolute;
    top: 80px;
    left: 0;
    width: 50%;
    background-color: white;
    z-index: 1000;
    padding: 14px 20px;
    border-radius: 0 0 12px 12px;
    /* 原本只有 background-color: white，面板底色跟頁面本身的米白色背景
       太接近，肉眼幾乎分不出「這是一塊獨立浮起來的選單」還是「頁面本身
       的一部分」，看起來像沒有底色一樣、容易讓人搞不清楚選單範圍在哪。
       補上邊框跟陰影，跟 CategoriesDropdown 展開的子選單（.nav-categories-panel）
       用同一組視覺語言（border-brand-panel + 同樣的陰影數值），面板邊界
       才會清楚浮出來。 */
    border: 1px solid #f1e3c8;
    box-shadow: 0 12px 32px rgba(58, 37, 19, 0.18);
    /* 這裡原本跟 vanilla 版本一樣有 overflow: hidden，圓角裁切乾淨是好看，
       但也會把 CategoriesDropdown 裡絕對定位的分類子選單一起裁掉，點開
       Categories 完全看不到任何分類——這是 vanilla 版本自己就有的既有
       bug（見 README），使用者這次實際點開發現後要求順便修掉，拿掉
       overflow: hidden 讓子選單可以正常顯示，換來的代價只是面板本身的
       圓角在極少數情況下可能被裡面的方形子選單邊緣蓋到一點點，比起「這個
       功能完全打不開」是划算的取捨。 */
  }
}

/* 這幾個裝飾用的小圓點（漢堡按鈕的三條線）用純 CSS class 名稱
   （.menu-toggle 內的 span）已經用 Tailwind utility 寫在 template
   裡了，這裡不用重複定義。 */
</style>
