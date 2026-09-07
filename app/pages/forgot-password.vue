<script setup lang="ts">
// 忘記密碼：跟 login.vue 同一套版面（左右分色的置中卡片），故意不套用
// 太多花樣——這頁只做一件事，送出後不管信箱有沒有註冊過都顯示同一句
// 通用訊息（後端 forgot_password() 已經是同一套邏輯，這裡只是照樣顯示
// 後端回傳的訊息，不用自己另外判斷），避免讓人拿這個表單測試「這個
// email 是不是 SugarTopia 的會員」。
const { forgotPassword } = useAuth();
const { t } = useI18n();

const email = ref("");
const submitting = ref(false);
const submitted = ref(false);

async function handleSubmit() {
  submitting.value = true;
  try {
    await forgotPassword(email.value.trim());
  } catch {
    // 忘意：就算後端真的出錯（不是「查無帳號」，是真的連不上資料庫這種
    // 例外），畫面上還是顯示同一個「已寄出」狀態，不要因為這樣就洩漏
    // 內部錯誤細節，也不要讓使用者卡在表單上重試轟炸後端。
  } finally {
    submitting.value = false;
    submitted.value = true;
  }
}
</script>

<template>
  <main
    class="flex min-h-[calc(100vh-180px)] items-start justify-center px-5 pb-20 pt-24"
    style="background: linear-gradient(to right, #fff, #fcdc94 50%, #f9a726 50%)"
  >
    <div class="flex min-h-[380px] w-full max-w-[450px] flex-col justify-center rounded-[20px] bg-white px-10 py-[54px] shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
      <template v-if="submitted">
        <h1 class="mb-2.5 text-center text-[28px] text-brand-brown">{{ t("auth.forgotPasswordSentTitle") }}</h1>
        <p class="mb-[30px] text-center text-brand-brown-light">{{ t("auth.forgotPasswordSentBody") }}</p>
        <NuxtLink to="/login" class="text-center font-medium text-brand-orange no-underline hover:underline">{{ t("auth.backToLogin") }}</NuxtLink>
      </template>

      <template v-else>
        <h1 class="mb-2.5 text-center text-[28px] text-brand-brown">{{ t("auth.forgotPassword") }}</h1>
        <p class="mb-[30px] text-center text-brand-brown-light">{{ t("auth.forgotPasswordSubheading") }}</p>

        <form @submit.prevent="handleSubmit">
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

          <button
            type="submit"
            :disabled="submitting"
            class="w-full rounded-lg bg-brand-orange py-3.5 text-base font-medium text-white transition-colors hover:bg-brand-orange-dark disabled:cursor-wait disabled:opacity-65"
          >
            {{ submitting ? t("auth.sending") : t("auth.sendResetLink") }}
          </button>

          <p class="mt-5 text-center text-brand-brown">
            <NuxtLink to="/login" class="font-medium text-brand-orange no-underline hover:underline">{{ t("auth.backToLogin") }}</NuxtLink>
          </p>
        </form>
      </template>
    </div>
  </main>
</template>
