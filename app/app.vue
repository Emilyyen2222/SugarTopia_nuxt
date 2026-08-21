<script setup lang="ts">
// 進站時把 localStorage 裡的登入狀態讀回來，等於 vanilla 版本 auth.js
// 裡「頁面載入時檢查有沒有已登入」那段邏輯。
onMounted(() => {
  initAuth();
});
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
