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

    return $fetch<T>(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...authHeaders(),
        ...(options?.headers as Record<string, string> | undefined),
      },
    });
  }

  return { apiFetch, baseUrl };
}
