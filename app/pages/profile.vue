<script setup lang="ts">
// 大頭貼真上傳的頁面：跟 favorites.vue／wishlist.vue 同一種「未登入請先
// 登入」骨架，內容換成大頭貼預覽＋上傳／移除。圖片本身存在後端 Postgres
// 的 bytea 欄位（POST/DELETE /api/users/me/avatar），不是這裡處理——這頁
// 只負責選檔案、丟給 useAuth() 的 uploadAvatar()/removeAvatar()，成功後
// 兩者都會回傳最新的 user 物件並直接更新 state，畫面上的頭貼馬上換新。
const { user, uploadAvatar, removeAvatar } = useAuth();
const { show } = useSiteMessage();
const { t } = useI18n();

const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const removing = ref(false);

function pickFile() {
  fileInput.value?.click();
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ""; // 允許連續選同一個檔案也能觸發 change
  if (!file) return;

  uploading.value = true;
  try {
    await uploadAvatar(file);
    show(t("profile.uploadedToast"));
  } catch (error) {
    show(error instanceof Error ? error.message : t("profile.uploadFailedToast"));
  } finally {
    uploading.value = false;
  }
}

async function handleRemove() {
  removing.value = true;
  try {
    await removeAvatar();
    show(t("profile.removedToast"));
  } catch {
    show(t("profile.removeFailedToast"));
  } finally {
    removing.value = false;
  }
}
</script>

<template>
  <div class="mt-[120px] flex min-h-[calc(100vh-180px)] gap-5 px-5">
    <div class="mx-auto w-full max-w-[500px]">
      <template v-if="!user">
        <h1 class="mb-10 text-xl font-bold text-brand-brown">{{ t("profile.title") }}</h1>
        <div class="rounded-2xl border border-brand-border bg-brand-cream p-7">
          <h2 class="mb-2 text-2xl text-brand-brown">{{ t("profile.pleaseLoginTitle") }}</h2>
          <p class="text-brand-brown-light">
            {{ t("profile.pleaseLoginBody") }}
            <NuxtLink to="/login" class="text-brand-orange underline">{{ t("header.logIn") }}</NuxtLink>
          </p>
        </div>
      </template>

      <template v-else>
        <h1 class="mb-2.5 text-xl font-bold text-brand-brown">{{ t("profile.title") }}</h1>
        <p class="mb-[18px] text-sm text-brand-brown-light">{{ t("profile.subtitle") }}</p>

        <div class="flex flex-col items-center gap-4 rounded-2xl border border-brand-border bg-brand-cream p-7">
          <ReviewerAvatar :name="user.name" :avatar-url="user.avatarUrl" :size="120" class="border-[3px] border-brand-orange" />

          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange" />

          <div class="flex gap-2.5">
            <button
              type="button"
              :disabled="uploading"
              class="rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white transition hover:bg-[#e89615] disabled:opacity-50"
              @click="pickFile"
            >
              {{ uploading ? t("profile.uploading") : t("profile.uploadButton") }}
            </button>
            <button
              v-if="user.avatarUrl"
              type="button"
              :disabled="removing"
              class="rounded-lg border border-brand-border px-5 py-2 text-sm font-medium text-brand-brown transition hover:bg-brand-hover disabled:opacity-50"
              @click="handleRemove"
            >
              {{ removing ? t("profile.removing") : t("profile.removeButton") }}
            </button>
          </div>

          <p class="text-center text-xs text-brand-brown-light">{{ t("profile.hint") }}</p>
        </div>
      </template>
    </div>
  </div>
</template>
