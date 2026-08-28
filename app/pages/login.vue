<script setup lang="ts">
// 對應 vanilla 版本 login.html + auth.js 的 setupLoginForm()。樣式數值
// (padding/顏色/圓角…) 都是照 CSS/login.css 原封不動搬過來的，不是重新
//設計。Header 這次先不做（排在 Phase 1 的下一步，做成全站共用元件后一次
// 補齊所有頁面），所以這頁目前看起來會缺一個 header，這是預期中的狀態。

const { login, user } = useAuth();
const { show } = useSiteMessage();
const router = useRouter();
const { t } = useI18n();

const email = ref("");
const password = ref("");
const isSubmitting = ref(false);

// 進頁面時如果已經登入，導回首頁——對應 auth.js 裡
// 「data-auth-form 存在 + 使用者已登入」那段邏輯。
onMounted(() => {
  if (user.value) {
    show(t("auth.alreadyLoggedIn", { name: user.value.name }));
    router.push("/");
  }
});

async function handleSubmit() {
  isSubmitting.value = true;
  try {
    const loggedInUser = await login(email.value.trim(), password.value);
    show(t("auth.welcomeBack", { name: loggedInUser.name }));
    router.push("/");
  } catch (error: any) {
    show(error?.data?.detail || t("auth.requestFailed"));
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main
    class="flex min-h-[calc(100vh-180px)] items-start justify-center px-5 pb-20 pt-24"
    style="background: linear-gradient(to right, #fff, #fcdc94 50%, #f9a726 50%)"
  >
    <div class="flex min-h-[440px] w-full max-w-[450px] flex-col justify-center rounded-[20px] bg-white px-10 py-[54px] shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
      <h1 class="mb-2.5 text-center text-[28px] text-brand-brown">{{ t("auth.loginWelcomeBack") }}</h1>
      <p class="mb-[30px] text-center text-brand-brown">{{ t("auth.loginSubheading") }}</p>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div class="mb-5">
          <label for="email" class="mb-2 block font-medium text-brand-brown">{{ t("auth.email") }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            :placeholder="t('auth.emailPlaceholder')"
            required
            class="w-full rounded-lg border border-[#ddd] p-3 text-base text-brand-brown transition-colors focus:border-brand-orange focus:outline-none"
          />
        </div>

        <div class="mb-5">
          <label for="password" class="mb-2 block font-medium text-brand-brown">{{ t("auth.password") }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            :placeholder="t('auth.passwordPlaceholder')"
            required
            class="w-full rounded-lg border border-[#ddd] p-3 text-base text-brand-brown transition-colors focus:border-brand-orange focus:outline-none"
          />
        </div>

        <div class="mb-5 flex items-center justify-between">
          <label class="flex items-center gap-2 text-brand-brown">
            <input type="checkbox" />
            <span class="text-sm leading-snug">{{ t("auth.rememberMe") }}</span>
          </label>
          <a
            href="#"
            class="text-brand-orange no-underline hover:underline"
            @click.prevent="show(t('auth.forgotPasswordToast'))"
          >{{ t("auth.forgotPassword") }}</a>
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-lg bg-brand-orange py-3.5 text-base font-medium text-white transition-colors hover:bg-brand-orange-dark disabled:cursor-wait disabled:opacity-65"
        >
          {{ isSubmitting ? t("auth.loggingIn") : t("auth.logIn") }}
        </button>

        <p class="mt-5 text-center text-brand-brown">
          {{ t("auth.noAccount") }}
          <NuxtLink to="/signup" class="font-medium text-brand-orange no-underline hover:underline">{{ t("auth.signUp") }}</NuxtLink>
        </p>
      </form>
    </div>
  </main>
</template>
