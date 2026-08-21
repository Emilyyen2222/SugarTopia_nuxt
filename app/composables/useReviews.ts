// 對應 vanilla 版本 Js/reviews.js。formatDate()／getShopReviews()／
// submitReview() 三個都直接對應同名邏輯；buildReviewCardHtml()、
// renderLatestReviews()、renderShopReviews() 這些是 vanilla 版本手動組
// HTML 字串的部分，在 Vue 裡改用 template 渲染，不需要對應的函式。
export interface Review {
  id: number;
  shopId: string;
  rating: number;
  text: string;
  createdAt: string;
  reviewerName: string;
  // 只有 GET /api/reviews/latest（首頁 Latest Reviews 用）才有這兩個欄位，
  // GET /api/shops/{id}/reviews（店家詳情頁用）沒有——因為店家詳情頁的
  // 評論已經知道自己在哪間店，不需要在每則評論裡重複附上店名/店照。
  shopName?: string;
  shopImage?: string;
}

export function useReviews() {
  const { apiFetch } = useApi();

  function formatDate(isoString: string) {
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  async function getShopReviews(shopId: string) {
    return apiFetch<{ total: number; reviews: Review[] }>(
      `/api/shops/${encodeURIComponent(shopId)}/reviews`
    );
  }

  async function getLatestReviews(limit = 8) {
    return apiFetch<{ total: number; reviews: Review[] }>(`/api/reviews/latest?limit=${limit}`);
  }

  async function submitReview(shopId: string, rating: number, text: string) {
    return apiFetch(`/api/shops/${encodeURIComponent(shopId)}/reviews`, {
      method: "POST",
      body: { rating, text },
    });
  }

  return { formatDate, getShopReviews, getLatestReviews, submitReview };
}
