// 對應 vanilla 版本 Js/site-enhancements.js 裡跟店家資料有關的部分
// （loadShops()、buildStars()、shopMatches() 的搜尋文字組合邏輯）。
// 後端 GET /api/shops 已經處理 q／location／category 三個參數的伺服器端
// 篩選（見 SugarTopia_backend/main.py 的 get_shops()），rating／features
// 這兩種篩選後端沒有對應欄位可以查，維持在前端做（跟 vanilla 版本一樣）。

export interface Shop {
  id: string;
  name: string;
  nameZh: string;
  category: string;
  categoryZh: string;
  location: string;
  locationZh: string;
  rating: number;
  reviews: string | number;
  tags: string[];
  tagsZh: string[];
  image: string;
  description: string;
  descriptionZh: string;
  comments: string[];
  lat: number | null;
  lng: number | null;
  source?: string;
  googleMapsUrl?: string;
  // 完整營業時間：Google Places 回傳的一週七天固定格式（例如
  // "Monday: 9:00 AM – 6:00 PM"），不是「現在有沒有營業」這種即時狀態
  // ——後端只在店家被收錄的當下抓一次存起來，不是每次看店家頁都重新問
  // Google，所以這裡不會有 openNow 這種欄位。舊資料／樣本店可能是空
  // 陣列（Google 沒有這家店的營業時間資料，或這家店是在補上這個功能
  // 之前就收錄的），前端要處理「沒有資料」的情況。
  hours?: string[];
  hoursZh?: string[];
  // 電話／網站：跟 hours 一樣是 Google Places 收錄當下存下來的真實資料，
  // 空字串代表 Google 對這家店沒有這筆資料（不是抓取失敗）。地址不需要
  // 額外的欄位——location／locationZh 本來就是 Google 的 formattedAddress，
  // 早就有了，只是店家詳情頁一直沒有真的顯示出來。
  phone?: string;
  website?: string;
}

// 後端存的圖片路徑是相對路徑（例如 "img/lp.jpg"），這在 vanilla 版本沒問題，
// 因為每個 HTML 頁面都在網站根目錄，相對路徑一定會解析成 /img/lp.jpg。
// 但 Nuxt 這邊有些頁面是巢狀路由（例如 /shop/matcha-mori-house），瀏覽器
// 解析相對路徑時會拿掉網址最後一段當作「目錄」，結果變成錯的
// /shop/img/lp.jpg，圖片整個 404。統一在這裡補成絕對路徑（開頭加「/」），
// 不管頁面路由巢不巢狀都不會壞。
export function resolveShopImage(path?: string | null) {
  if (!path || !path.trim()) return "/img/no-photo.svg";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) {
    return path;
  }
  return `/${path}`;
}

export function useShops() {
  const { apiFetch } = useApi();

  async function fetchShops(params: { q?: string; location?: string; category?: string } = {}) {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.location) search.set("location", params.location);
    if (params.category) search.set("category", params.category);

    const query = search.toString();
    const data = await apiFetch<{ total: number; shops: Shop[] }>(
      `/api/shops${query ? `?${query}` : ""}`
    );

    return data.shops;
  }

  async function fetchShop(id: string) {
    return apiFetch<Shop>(`/api/shops/${encodeURIComponent(id)}`);
  }

  function buildStars(rating: number) {
    const rounded = Math.round(rating);
    return "★★★★★".slice(0, rounded) + "☆☆☆☆☆".slice(0, 5 - rounded);
  }

  // 店家層級的使用者投稿照片（不綁在某一則評論下面）——沒有內嵌在
  // fetchShop() 回傳的物件裡，是另外一支 API，店家詳情頁載入時自己
  // 再打一次。這跟評論照片的做法不一樣：評論列表本來就要抓，照片
  // 順便一起回傳很自然；但店家相簿是選配的展示內容，多數瀏覽情境
  // 用不到，沒必要每次讀店家資料都跟著抓一份相簿。
  async function getShopPhotos(shopId: string) {
    return apiFetch<{ photos: ShopPhoto[] }>(`/api/shops/${encodeURIComponent(shopId)}/photos`);
  }

  async function uploadShopPhotos(shopId: string, files: File[]) {
    const formData = new FormData();
    for (const file of files) formData.append("files", file);
    return apiFetch<{ photos: ShopPhoto[] }>(`/api/shops/${encodeURIComponent(shopId)}/photos`, {
      method: "POST",
      body: formData,
    });
  }

  async function deleteShopPhoto(shopId: string, photoId: number) {
    return apiFetch<{ photos: ShopPhoto[] }>(`/api/shops/${encodeURIComponent(shopId)}/photos/${photoId}`, {
      method: "DELETE",
    });
  }

  // 甜點人格測驗結果頁用：拿一組人格 key（hermit／worker／visual／hype／
  // intel，跟後端 main.py 的 QUIZ_PERSONAS 對應）換回配對到的真實店家。
  // 配對邏輯（用哪些分類標籤、怎麼排序）全部在後端，這裡單純轉呼叫。
  async function matchQuizPersona(persona: string, limit = 1) {
    return apiFetch<{ persona: string; shops: Shop[] }>(
      `/api/quiz/match?persona=${encodeURIComponent(persona)}&limit=${limit}`
    );
  }

  return { fetchShops, fetchShop, buildStars, getShopPhotos, uploadShopPhotos, deleteShopPhoto, matchQuizPersona };
}

export interface ShopPhoto {
  id: number;
  url: string;
  uploaderName: string;
  // 用來跟目前登入使用者的 id 比對，決定要不要顯示刪除按鈕——不能用
  // uploaderName 比對，兩個使用者的顯示名稱可能剛好一樣。
  uploaderId: number;
  createdAt: string;
}
