<script setup lang="ts">
// 重設密碼：從信件裡的連結進來，網址帶 ?token=...（forgot-password 那封
// 信裡組的連結，見後端 forgot_password() 的註解）。跟 signup.vue 一樣
// 要求兩次密碼輸入一致，另外多一個「token 缺失/無效/過期」的狀態要處理
// ——不是表單驗證失敗，是整頁一開始就不該顯示表單（沒有 token 代表這頁
// 根本不是從信件連結點進來的，直接顯示錯誤，不要讓人以為隨便打開這頁
// 就能重設密碼）。
const route = useRoute();
const { resetPassword } = useAuth();
const { t } = useI18n();

const token = computed(() => (route.query.token as string) || "");

const password = ref("");
const confirmPassword = ref("");
const submitting = ref(false);
const succeeded = ref(false);
const errorMessage = ref("");

async function handleSubmit() {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = t("auth.passwordsDontMatch");
    return;
  }

  submitting.value = true;
  errorMessage.value = "";
  try {
    await resetPassword(token.value, password.value);
    succeeded.value = true;
  } catch (error: any) {
    errorMessage.value = error?.data?.detail || t("auth.requestFailed");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main
    class="flex min-h-[calc(100vh-180px)] items-start justify-center px-5 pb-20 pt-24"
    style="background: linear-gradient(to right, #fff, #fcdc94 50%, #f9a726 50%)"
  >
    <div class="flex min-h-[380px] w-full max-w-[450px] flex-col justify-center rounded-[20px] bg-white px-10 py-[54px] shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
      <template v-if="!token">
        <h1 class="mb-2.5 text-center text-[28px] text-brand-brown">{{ t("auth.resetLinkInvalidTitle") }}</h1>
        <p class="mb-[30px] text-center text-brand-brown-light">{{ t("auth.resetLinkInvalidBody") }}</p>
        <NuxtLink to="/forgot-password" class="text-center font-medium text-brand-orange no-underline hover:underline">{{ t("auth.forgotPassword") }}</NuxtLink>
      </template>

      <template v-else-if="succeeded">
        <h1 class="mb-2.5 text-center text-[28px] text-brand-brown">{{ t("auth.resetSucceededTitle") }}</h1>
        <p class="mb-[30px] text-center text-brand-brown-light">{{ t("auth.resetSucceededBody") }}</p>
        <NuxtLink to="/login" class="text-center font-medium text-brand-orange no-underline hover:underline">{{ t("auth.logIn") }}</NuxtLink>
      </template>

      <template v-else>
        <h1 class="mb-2.5 text-center text-[28px] text-brand-brown">{{ t("auth.resetPasswordTitle") }}</h1>
        <p class="mb-[30px] text-center text-brand-brown-light">{{ t("auth.resetPasswordSubheading") }}</p>

        <form @submit.prevent="handleSubmit">
          <div class="mb-5">
            <label for="password" class="mb-2 block font-medium text-brand-brown">{{ t("auth.password") }}</label>
            <input
              id="password"
              v-model="password"
              type="password"
              :placeholder="t('auth.createPasswordPlaceholder')"
              required
              minlength="8"
              class="w-full rounded-lg border border-[#ddd] p-3 text-base text-brand-brown transition-colors focus:border-brand-orange focus:outline-none"
            />
          </div>

          <div class="mb-5">
            <label for="confirm-password" class="mb-2 block font-medium text-brand-brown">{{ t("auth.confirmPassword") }}</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              :placeholder="t('auth.confirmPasswordPlaceholder')"
              required
              minlength="8"
              class="w-full rounded-lg border border-[#ddd] p-3 text-base text-brand-brown transition-colors focus:border-brand-orange focus:outline-none"
            />
          </div>

          <p v-if="errorMessage" class="mb-5 text-sm text-[#c0392b]">{{ errorMessage }}</p>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full rounded-lg bg-brand-orange py-3.5 text-base font-medium text-white transition-colors hover:bg-brand-orange-dark disabled:cursor-wait disabled:opacity-65"
          >
            {{ submitting ? t("auth.resetting") : t("auth.resetPasswordButton") }}
          </button>
        </form>
      </template>
    </div>
  </main>
</template>
