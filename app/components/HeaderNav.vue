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

function handleSearchSubmit() {
  const query = searchQuery.value.trim();
  router.push(query ? `/category?q=${encodeURIComponent(query)}` : "/category");
}

async function handleLogout() {
  await logout();
  show("You have logged out.");
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
      <div ref="headerLeftEl" class="flex items-center gap-[22px] nav-sm:gap-2">
        <div
          class="menu-toggle hidden cursor-pointer flex-col rounded-[0.3rem] border-[3px] border-brand-orange bg-white px-[0.4rem] py-[0.2rem] hover:scale-105 hover:bg-brand-gold hover:shadow-md nav-lg:flex"
          @click.stop="toggleMobileMenu"
        >
          <span class="my-[2.6px] h-[3px] w-4 bg-brand-orange" />
          <span class="my-[2.6px] h-[3px] w-4 bg-brand-orange" />
          <span class="my-[2.6px] h-[3px] w-4 bg-brand-orange" />
        </div>

        <div class="search-bar flex items-center gap-1.5 nav-sm:gap-0">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search Dessert Shops"
            class="search-input w-[150px] rounded border border-[#ddd] p-2 text-[0.85rem] nav-sm:hidden"
            @keydown.enter="handleSearchSubmit"
          />
          <button
            type="button"
            class="flex items-center rounded bg-brand-orange px-3 py-2 text-white"
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
            <NuxtLink to="/write-review" class="block rounded-[10px] px-3 py-2.5 text-[0.9375rem] font-medium text-brand-brown no-underline hover:bg-brand-hover" @click="closeMobileMenu">
              write a review
            </NuxtLink>
            <a
              href="https://www.instagram.com/cupertino.keki/"
              target="_blank"
              rel="noopener noreferrer"
              class="block rounded-[10px] px-3 py-2.5 text-[0.9375rem] font-medium text-brand-brown no-underline hover:bg-brand-hover"
              @click="closeMobileMenu"
            >
              cupertino.keki
              <ExternalLinkIcon class="ml-1 inline h-[0.75em] w-[0.75em]" />
            </a>
          </div>
        </nav>
      </div>

      <!-- 中欄：logo，Grid 天生置中，不用 position: fixed -->
      <div class="justify-self-center">
        <NuxtLink to="/">
          <img src="/img/logo.svg" alt="Sugar.Topia" class="h-[clamp(40px,13vw,70px)] w-auto nav-sm:h-[clamp(32px,11vw,70px)]" />
        </NuxtLink>
      </div>

      <!-- 右欄：actions -->
      <div class="flex items-center justify-self-end">
        <NuxtLink
          to="/write-review"
          class="actions-write-review mr-6 text-[0.9375rem] font-medium text-white no-underline hover:text-brand-gold nav-md:hidden"
        >
          write a review
        </NuxtLink>
        <a
          href="https://www.instagram.com/cupertino.keki/"
          target="_blank"
          rel="noopener noreferrer"
          class="brand-name mr-6 text-[0.9375rem] font-medium text-white no-underline hover:text-brand-gold nav-md:hidden"
        >
          cupertino.keki
          <ExternalLinkIcon class="inline h-[0.8125rem] w-[0.8125rem]" />
        </a>

        <template v-if="isLoggedIn">
          <span class="mr-2.5 ml-5 whitespace-nowrap text-[0.9375rem] font-semibold text-white nav-md:hidden">
            Hi, {{ user?.name }}
          </span>
          <button
            type="button"
            class="rounded-[9px] border border-white bg-transparent px-4 py-2 text-[0.9375rem] font-medium text-white hover:bg-brand-gold hover:text-brand-orange nav-md:hidden"
            @click="handleLogout"
          >
            Log Out
          </button>
        </template>
        <template v-else>
          <NuxtLink
            to="/login"
            class="ml-5 mr-1 rounded-[9px] border border-white px-4 py-2 text-[0.9375rem] text-white no-underline hover:bg-brand-gold nav-md:hidden"
          >
            Log In
          </NuxtLink>
          <NuxtLink
            to="/signup"
            class="rounded-[9px] border border-white bg-white px-4 py-2 text-[0.9375rem] text-brand-orange no-underline hover:bg-brand-gold nav-md:hidden"
          >
            Sign Up
          </NuxtLink>
        </template>

        <!-- 窄螢幕（≤1024px）用一顆帳號 icon 取代上面那排文字按鈕 -->
        <NuxtLink
          :to="isLoggedIn ? '/favorites' : '/login'"
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
    overflow: hidden;
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
