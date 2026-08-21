// 對應 vanilla 版本 tests/global-setup.js，邏輯完全一樣（檢查後端有沒有
//先啟動、檢查連的是不是測試專用資料庫），只是搬進這個專案、改成 .ts。
// 兩邊共用同一個後端，這個檢查在哪個前端專案跑都一樣重要。
const BACKEND_URL = process.env.SUGARTOPIA_API_URL || "http://127.0.0.1:8000";
const DEV_DATABASE_NAME = "sugartopia_app.db";

export default async () => {
  let health: { database?: string };

  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }
    health = await response.json();
  } catch (error) {
    throw new Error(
      `\n\n找不到跑起來的 SugarTopia 後端（${BACKEND_URL}）。\n` +
        `請先在 SugarTopia_backend 資料夾另開一個終端機執行：\n\n` +
        `  source venv/bin/activate\n` +
        `  DATABASE_PATH=sugartopia_test.db uvicorn main:app --reload\n\n` +
        `後端啟動後再重新執行測試。（原始錯誤：${(error as Error).message}）\n`
    );
  }

  if (health.database === DEV_DATABASE_NAME) {
    throw new Error(
      `\n\n後端目前連的是平常開發在用的資料庫（${DEV_DATABASE_NAME}）。\n` +
        `測試會建立真的帳號寫進去，混到你自己的開發資料，所以先擋下來。\n\n` +
        `請把後端終端機停掉（Ctrl+C），改用測試專用的資料庫重新啟動：\n\n` +
        `  DATABASE_PATH=sugartopia_test.db uvicorn main:app --reload\n\n` +
        `這樣後端會自己建一個全新的 sugartopia_test.db（跟平常開發用的檔案完全分開，\n` +
        `已加進 .gitignore，不會被提交），測試愛怎麼寫都不會動到你真正的資料。\n`
    );
  }
};
