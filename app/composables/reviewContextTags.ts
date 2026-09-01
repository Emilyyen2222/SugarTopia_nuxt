// Phase 4「情境式心得」的情境標籤固定字典：寫評論的複選按鈕（write-review.vue）
// 跟店家詳情頁顯示評論標籤（shop/[id].vue）共用同一份，不要各自維護
// 一份重複的內容——這學期已經因為同一份清單分開維護在兩個地方漏改吃過
// 好幾次虧了（見 categoryTiles.ts 的教訓），直接抽成共用檔案。
// value 跟後端 main.py 的 REVIEW_CONTEXT_TAGS 一一對應，不能只改一邊。
export interface ReviewContextTagOption {
  value: string;
  labelKey: string;
}

export const REVIEW_CONTEXT_TAGS: ReviewContextTagOption[] = [
  { value: "Work Friendly", labelKey: "writeReview.contextTags.workFriendly" },
  { value: "Quiet", labelKey: "writeReview.contextTags.quiet" },
  { value: "Outlets", labelKey: "writeReview.contextTags.outlets" },
  { value: "Solo Friendly", labelKey: "writeReview.contextTags.soloFriendly" },
  { value: "Instagrammable", labelKey: "writeReview.contextTags.instagrammable" },
  { value: "Long Wait", labelKey: "writeReview.contextTags.longWait" },
];
