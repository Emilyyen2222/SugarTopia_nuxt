// 首頁 Categories 磚跟 header「分類」下拉選單共用同一份清單，不要各自
// 維護一份重複的內容——之前 8 個分類時這份清單就同時存在 index.vue 跟
// CategoriesDropdown.vue 裡，改一邊很容易漏改另一邊。
//
// 原本 8 個分類混雜了兩種不同維度：「品類」（肉桂捲／冰淇淋／貝果／
// 起司蛋糕／馬卡龍，賣什麼）跟「屬性」（咖啡廳／寵物友善／酒香甜點，
// 適合做什麼），使用者會覺得同一排卡片邏輯不一致。現在合併成 4 張，
// 都收斂成同一種邏輯：
//   - 烘焙甜點：肉桂捲／貝果／馬卡龍／起司蛋糕合併成一個大分類，
//     這幾個本來就都是烘焙類品項，不需要各自佔一張卡。
//   - 冰品／咖啡廳：保留。
//   - 毛孩友善：原本叫「寵物友善」，但目前資料庫裡符合這個標籤的
//     店家全部都是狗狗友善（後端 tag 是「Dogs Friendly」），沒有真的
//     貓咖店家有標籤，所以文案刻意用比較籠統的「毛孩友善」，不要
//     窄化成「狗」，等以後貓咖店家夠多再考慮拆成獨立分類。
//
// 「烘焙甜點」是唯一一個合併分類：後端 GET /api/shops 的 q 參數是單一
// 子字串比對（不支援 OR），沒辦法直接查「符合肉桂捲或貝果或馬卡龍或
// 起司蛋糕任一個」。用一個不會跟真實查詢字串撞名的特殊值代表這張磚，
// category.vue 抓到這個值時會展開成多個關鍵字、任一符合就算（比對邏輯
// 見 category.vue 的 queryTerms／shopMatches）。
export const BAKED_DESSERTS_QUERY = "__baked-desserts__";

export const COMPOSITE_CATEGORIES: Record<string, { terms: string[]; labelKey: string }> = {
  [BAKED_DESSERTS_QUERY]: {
    terms: ["Cinnamon Rolls", "Bagels", "Macaron", "Cheesecakes"],
    labelKey: "category.filterCategories.bakedDesserts",
  },
};

export interface CategoryTile {
  labelKey: string;
  query: string;
  image: string;
}

// image 沿用原本 8 個分類已經裁切好的圖示：肉桂捲圖示代表烘焙甜點（合併
// 進去的品項裡肉桂捲最先做、圖示也最有辨識度），其他 3 個各自沿用原本
// 對應的圖示。header 下拉選單目前是純文字連結、不需要 image，但共用同
// 一份清單資料結構比較不會漏改，多一個沒用到的欄位沒有壞處。
export const categoryTiles: CategoryTile[] = [
  { labelKey: "category.filterCategories.bakedDesserts", query: BAKED_DESSERTS_QUERY, image: "c1-icon.svg" },
  { labelKey: "category.filterCategories.iceCreams", query: "Ice Creams", image: "c2-icon.svg" },
  { labelKey: "category.filterCategories.cafes", query: "Cafes", image: "c6-icon.svg" },
  { labelKey: "category.filterCategories.petFriendly", query: "Dogs Friendly", image: "c7-icon.svg" },
];
