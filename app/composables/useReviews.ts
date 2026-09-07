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
  // null 代表這個評論者沒上傳過真的大頭貼——ReviewerAvatar.vue 會退回
  // 用姓名色塊+字母頂著，不是這裡要處理的事。
  reviewerAvatarUrl: string | null;
  // 前端要知道「這則是不是我自己寫的」才能決定要不要顯示編輯／刪除
  // 按鈕（後端 PUT/DELETE /api/reviews/{id} 本來就會擋非本人，這裡只是
  // 讓按鈕一開始就不要顯示在別人的評論下面）。
  userId: number;
  // 只有 GET /api/reviews/latest（首頁 Latest Reviews 用）才有這兩個欄位，
  // GET /api/shops/{id}/reviews（店家詳情頁用）沒有——因為店家詳情頁的
  // 評論已經知道自己在哪間店，不需要在每則評論裡重複附上店名/店照。
  shopName?: string;
  shopNameZh?: string;
  shopImage?: string;
  // Phase 4「情境式心得」：使用者寫評論時複選的情境標籤（適合工作、安靜、
  // 有插座……），固定字典見 composables/reviewContextTags.ts，後端也會
  // 過濾掉不在字典裡的值，這裡收到的一定是乾淨的子集。
  contextTags: string[];
  // Phase 4「AI 標籤整理」：AI 從評論文字自動分析出來的標籤，跟上面
  // 使用者自己勾的分開存——顯示時要用不同樣式區分「使用者自選」跟
  // 「AI 分析」，不能混在一起讓人以為全部都是使用者自己勾的。
  aiContextTags: string[];
  // 評論照片：一則評論可以有 0～REVIEW_PHOTOS_MAX_PER_REVIEW（後端定義，
  // 目前是 4）張照片，剛建立的評論一定是空陣列——照片是拿到 review id
  // 之後才用另一支 POST /api/reviews/{id}/photos 上傳的，不是同一步存進去。
  photos: string[];
}

export function useReviews() {
  const { apiFetch } = useApi();
  // 日期格式跟著介面語言走（原本寫死 en-US，不管切哪個語言日期都是英文
  // 格式，例如中文介面卻顯示 "Aug 25, 2026"）。zh-TW 用瀏覽器內建的
  // Intl 格式化，會變成「2026年8月25日」這種中文慣用寫法，不用自己刻。
  const { locale } = useI18n();

  function formatDate(isoString: string) {
    try {
      return new Date(isoString).toLocaleDateString(locale.value, {
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

  async function submitReview(shopId: string, rating: number, text: string, contextTags: string[] = []) {
    // 回傳型別標成 Review（不是原本沒指定的 unknown）——送出評論之後
    // 馬上要用回傳的 review.id 呼叫 uploadReviewPhotos()，需要拿得到這個
    // 欄位，不能只是丟出去不管回傳值。
    return apiFetch<Review>(`/api/shops/${encodeURIComponent(shopId)}/reviews`, {
      method: "POST",
      body: { rating, text, context_tags: contextTags },
    });
  }

  async function updateReview(reviewId: number, rating: number, text: string, contextTags: string[] = []) {
    return apiFetch<Review>(`/api/reviews/${reviewId}`, {
      method: "PUT",
      body: { rating, text, context_tags: contextTags },
    });
  }

  async function deleteReview(reviewId: number) {
    return apiFetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
  }

  // 評論照片是送出評論成功、拿到 review id 之後另外呼叫的一步（不是
  // submitReview() 本身的一部分）——理由見 Review.photos 上面的註解。
  async function uploadReviewPhotos(reviewId: number, files: File[]) {
    const formData = new FormData();
    for (const file of files) formData.append("files", file);
    return apiFetch<{ photos: string[] }>(`/api/reviews/${reviewId}/photos`, {
      method: "POST",
      body: formData,
    });
  }

  async function deleteReviewPhoto(reviewId: number, photoUrl: string) {
    // photoUrl 是完整網址（.../api/reviews/{reviewId}/photos/{photoId}），
    // 最後一段路徑就是 photo id，不用另外維護一份 id 對照表。
    const photoId = photoUrl.split("/").pop();
    return apiFetch<{ photos: string[] }>(`/api/reviews/${reviewId}/photos/${photoId}`, {
      method: "DELETE",
    });
  }

  return {
    formatDate,
    getShopReviews,
    getLatestReviews,
    submitReview,
    updateReview,
    deleteReview,
    uploadReviewPhotos,
    deleteReviewPhoto,
  };
}
