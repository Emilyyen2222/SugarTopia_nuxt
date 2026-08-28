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

// 點漢堡選單裡任何一個會換頁的連結（Categories 面板裡的分類、write a
// review）都要收合選單，不是只有點外面才收合。原本只靠個別連結各自的
// @click="closeMobileMenu"，Categories 面板裡的連結是 CategoriesDropdown
// 元件自己管的、沒有接手這個父層的收合邏輯，直接監看路由變化更保險、
// 不用每個連結都手動接一次。
watch(
  () => route.fullPath,
  () => closeMobileMenu()
);

function handleClickOutside(event: MouseEvent) {
  if (headerLeftEl.value && !headerLeftEl.value.contains(event.target as Node)) {
    closeMobileMenu();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") closeMobileMenu();
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
          <CategoriesDropdown />

          <div class="nav-menu-mobile-links">
            <!-- 「寫評論」這個不指定店家的全站入口拿掉了：寫評論一定要先
                 進到某家店的詳情頁，從那裡的「寫評論」按鈕進去（會直接鎖定
                 那家店，見 write-review.vue 的 lockedShop），不再讓使用者
                 從 header 憑空跳進一個要先選店的下拉選單。 -->
            <button
              type="button"
              class="block w-full rounded-[10px] px-3 py-2.5 text-left text-[0.9375rem] font-medium text-brand-brown hover:bg-brand-hover"
              @click="toggleLocale"
            >
              {{ otherLocaleName }}
            </button>
          </div>
        </nav>
      </div>

      <!-- 中欄：logo，Grid 天生置中，不用 position: fixed -->
      <div class="logo-container justify-self-center">
        <NuxtLink to="/">
          <img src="/img/logo.svg" alt="Sugar.Topia" class="h-[clamp(40px,13vw,70px)] w-auto transition-transform nav-sm:h-[clamp(32px,11vw,70px)] hover:scale-90" />
        </NuxtLink>
      </div>

      <!-- 右欄：actions -->
      <div class="flex items-center justify-self-end">
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
          <span class="mr-2.5 ml-5 whitespace-nowrap text-[0.9375rem] font-semibold text-white nav-md:hidden">
            {{ t("header.hi", { name: user?.name }) }}
          </span>
          <button
            type="button"
            class="whitespace-nowrap rounded-[9px] border border-white bg-transparent px-4 py-2 text-[0.9375rem] font-medium text-white hover:bg-brand-gold hover:text-brand-orange nav-md:hidden"
            @click="handleLogout"
          >
            {{ t("header.logOut") }}
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
             文字可以定位，不用另外接一個只為了測試用的 class。 -->
        <NuxtLink
          :to="isLoggedIn ? '/favorites' : '/login'"
          :aria-label="isLoggedIn ? t('header.myFavorites') : t('header.logIn')"
          class="hidden h-[47px] w-[47px] items-center justify-center rounded-lg border-2 border-brand-avatar bg-brand-avatar text-[1.6rem] text-brand-orange hover:scale-105 hover:text-white hover:shadow-md nav-md:flex"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-[1.6rem] w-[1.6rem]">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="10" r="3" />
            <path d="M6.2 18.5a6 6 0 0 1 11.6 0" />
          </svg>
        </NuxtLink>
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

.nav-menu-mobile-links {
  display: none;
}

@media (max-width: 1380px) {
  .nav-menu {
    display: none;
  }

  .nav-menu.is-active {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 80px;
    left: 0;
    width: 50%;
    background-color: white;
    z-index: 1000;
    padding: 10px 0;
    border-radius: 0 0 12px 12px;
    /* 這裡原本跟 vanilla 版本一樣有 overflow: hidden，圓角裁切乾淨是好看，
       但也會把 CategoriesDropdown 裡絕對定位的分類子選單一起裁掉，點開
       Categories 完全看不到任何分類——這是 vanilla 版本自己就有的既有
       bug（見 README），使用者這次實際點開發現後要求順便修掉，拿掉
       overflow: hidden 讓子選單可以正常顯示，換來的代價只是面板本身的
       圓角在極少數情況下可能被裡面的方形子選單邊緣蓋到一點點，比起「這個
       功能完全打不開」是划算的取捨。 */
  }
}

@media (max-width: 1024px) {
  .nav-menu-mobile-links {
    display: block;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #f1e3c8;
  }
}

/* 這幾個裝飾用的小圓點（漢堡按鈕的三條線）用純 CSS class 名稱
   （.menu-toggle 內的 span）已經用 Tailwind utility 寫在 template
   裡了，這裡不用重複定義。 */
</style>
