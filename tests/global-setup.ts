// 對應 vanilla 版本 tests/global-setup.js，但邏輯已經不一樣了：原本這裡
// 會檢查後端連的是不是專門給測試用的獨立 SQLite 檔案（sugartopia_test.db），
// 連到平常開發用的資料庫就直接擋下來，避免測試寫的假帳號/收藏/評論
// 污染到真正在用的資料。
//
// 後端從 SQLite 遷移到 Supabase PostgreSQL 之後，這個機制已經不存在了——
// 現在不管本機開發還是跑測試，後端都只認同一組 DATABASE_URL，沒有
// 「切換成測試專用資料庫」這個選項可以用。這裡的檢查因此改成單純確認
// 後端有沒有跑起來，測試會真的寫進目前這個資料庫（開發/正式共用同一個）
// ——這是刻意接受的取捨，不是遺漏；細節、後續如果要做真正隔離的方向
// 見 PROJECT_ROADMAP.md。
const BACKEND_URL = process.env.SUGARTOPIA_API_URL || "http://127.0.0.1:8000";

export default async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `\n\n找不到跑起來的 SugarTopia 後端（${BACKEND_URL}）。\n` +
        `請先在 SugarTopia_backend 資料夾另開一個終端機執行：\n\n` +
        `  source venv/bin/activate\n` +
        `  uvicorn main:app --reload\n\n` +
        `後端啟動後再重新執行測試。（原始錯誤：${(error as Error).message}）\n`
    );
  }
};
