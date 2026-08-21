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

  return { fetchShops, fetchShop, buildStars };
}
