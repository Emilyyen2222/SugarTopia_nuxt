// 對應 vanilla 版本 Js/favorites.js 的收藏 API 呼叫部分（getFavoriteShops／
// addFavorite／removeFavorite）。vanilla 版本自己手動組 Authorization
// header、自己判斷 apiBaseUrl，這裡直接用 useApi() 的 apiFetch，已經處理好
// 這兩件事，不用重複寫一次。
import type { Shop } from "~/composables/useShops";

export function useFavorites() {
  const { apiFetch } = useApi();

  async function getFavoriteShops() {
    return apiFetch<{ total: number; shops: Shop[] }>("/api/favorites");
  }

  async function addFavorite(shopId: string) {
    return apiFetch("/api/favorites", {
      method: "POST",
      body: { shop_id: shopId },
    });
  }

  async function removeFavorite(shopId: string) {
    return apiFetch(`/api/favorites/${encodeURIComponent(shopId)}`, {
      method: "DELETE",
    });
  }

  return { getFavoriteShops, addFavorite, removeFavorite };
}
