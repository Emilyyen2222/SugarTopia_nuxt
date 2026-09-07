/**
 * 統一呼叫 FastAPI 後端的入口，取代 vanilla 版本裡每支 JS 檔案各自組
 * apiBaseUrl、各自寫 fetch 的做法（auth.js、site-enhancements.js、
 * favorites.js、reviews.js 都各自有一份幾乎一樣的邏輯，這是元件化/框架
 * 化想解決的重複問題之一）。
 *
 * 後端網址從 runtimeConfig 讀（見 nuxt.config.ts 的 runtimeConfig.public.
 * apiBaseUrl，本機開發用 .env 的 NUXT_PUBLIC_API_BASE_URL 覆蓋），不是像
 * vanilla 版本那樣在執行期用 window.location.hostname 猜「現在是本機還是
 * 正式環境」——用環境變數帶入設定值，是更標準、更不容易猜錯的做法（也是
 * BACKEND_LEARNING_NOTES.md 提過的 12-Factor App 原則的延伸）。
 */
export function useApi() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl;

  function authHeaders(): Record<string, string> {
    const token = useAuthToken().value;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function apiFetch<T>(
    path: string,
    options: Parameters<typeof $fetch>[1] = {}
  ): Promise<T> {
    // FormData（大頭貼上傳用）不能手動塞 Content-Type: application/json——
    // multipart/form-data 請求需要瀏覽器自己算出正確的 boundary 字串放進
    // Content-Type，我們自己指定反而會讓後端解析不出檔案內容。其餘一般
    // JSON 請求維持原本的預設值。
    const isFormData = options?.body instanceof FormData;

    // 這一次呼叫送出去的時候，我們「以為」自己是登入的嗎？——後端 session
    // 過期／被刪掉是使用者自己感覺不到的（畫面上還是顯示已登入，直到真的
    // 點了什麼才會發現失敗），所以只有在「原本帶了 token 出去，結果後端
    // 說 401」這個情況，才代表 session 真的過期了，需要自動登出＋導去
    // 登入頁。登入頁本身回的 401（帳號密碼錯誤）不會誤觸這個邏輯，因為
    // 那個當下根本沒有 token 可以帶出去。
    const hadToken = Boolean(useAuthToken().value);

    try {
      return await $fetch<T>(`${baseUrl}${path}`, {
        ...options,
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...authHeaders(),
          ...(options?.headers as Record<string, string> | undefined),
        },
      });
    } catch (error) {
      const status =
        (error as { response?: { status?: number }; statusCode?: number; status?: number })
          ?.response?.status ??
        (error as { statusCode?: number })?.statusCode ??
        (error as { status?: number })?.status;

      if (status === 401 && hadToken) {
        clearAuthState();
        if (import.meta.client && useRoute().path !== "/login") {
          // 不能在這裡用 useI18n()——它規定只能在元件 setup() 最上層呼叫，
          // 這裡是深在一個 catch 區塊裡的非同步流程，不符合那個限制
          // （實測會直接噴 SyntaxError）。改用 useNuxtApp().$i18n.t()，
          // 這是 @nuxtjs/i18n 掛在全域 Nuxt app 上的同一份翻譯，沒有這個
          // 呼叫位置的限制。
          const { show } = useSiteMessage();
          const { $i18n } = useNuxtApp();
          show($i18n.t("auth.sessionExpiredToast"));
          await navigateTo("/login");
        }
      }

      throw error;
    }
  }

  return { apiFetch, baseUrl };
}
