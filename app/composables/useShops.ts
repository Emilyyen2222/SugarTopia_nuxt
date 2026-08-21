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
