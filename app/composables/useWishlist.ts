// Phase 4「甜點願望單」：對應後端 GET/POST /api/wishlist、DELETE
// /api/wishlist/{id}。跟 useFavorites.ts／useReviews.ts 同一種薄封裝，
// 純粹轉呼叫 apiFetch，不在這裡放商業邏輯。
export interface WishlistItem {
  id: number;
  text: string;
  createdAt: string;
}

export function useWishlist() {
  const { apiFetch } = useApi();

  async function getWishlist() {
    return apiFetch<{ total: number; items: WishlistItem[] }>("/api/wishlist");
  }

  async function addWishlistItem(text: string) {
    return apiFetch<WishlistItem>("/api/wishlist", {
      method: "POST",
      body: { text },
    });
  }

  async function removeWishlistItem(id: number) {
    return apiFetch(`/api/wishlist/${id}`, { method: "DELETE" });
  }

  return { getWishlist, addWishlistItem, removeWishlistItem };
}
