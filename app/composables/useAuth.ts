/**
 * 對應後端 /api/auth/signup、/api/auth/login、/api/auth/logout、/api/auth/me
 * （main.py），登入狀態跟 vanilla 版本的 auth.js 一樣存在 localStorage，
 * key 沿用同一個名字（sugartopia_auth），這樣如果哪天兩個版本並存，登入
 * 狀態還是共用同一份，不會互相衝突。
 *
 * 用 Nuxt 的 useState 存在記憶體裡的 reactive 狀態（SSR 安全，不會像直接
 * 用 window.localStorage 那樣在伺服器端算圖時噴錯），實際的 localStorage
 * 讀寫另外用 import.meta.client 保護。
 *
 * 「記住我」：登入頁的 checkbox 原本是純裝飾，勾不勾都一樣（一律寫進
 * localStorage，關掉瀏覽器再打開還是登入狀態）。現在真的有差——勾選（預設
 * 就是勾的，維持原本的行為當預設值，只有使用者主動取消才改變）存進
 * localStorage，關掉瀏覽器整個重開還是登入的；取消勾選則存進
 * sessionStorage，分頁/瀏覽器關掉就會登出，這是「記住我」這個功能常見的
 *標準語意。
 */
const STORAGE_KEY = "sugartopia_auth";

type StorageKind = "local" | "session";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

function useAuthState() {
  return useState<AuthState>("auth", () => ({ user: null, token: null }));
}

export function useAuthToken() {
  const state = useAuthState();
  return computed(() => state.value.token);
}

export function useAuthUser() {
  const state = useAuthState();
  return computed(() => state.value.user);
}

// 目前登入狀態實際存在哪一種 storage——用「哪一種目前有資料」判斷，不用
// 另外存一個「記得住的旗標」欄位。這樣像 uploadAvatar()／logout() 這種
// 不知道（也不需要知道）當初是不是勾了「記住我」的呼叫端，更新資料時
// 才能繼續寫回原本那一種 storage，不會不小心把 sessionStorage 的登入狀態
// 升級成 localStorage（或反過來）。
function getActiveStorageKind(): StorageKind {
  if (!import.meta.client) return "local";
  return sessionStorage.getItem(STORAGE_KEY) ? "session" : "local";
}

function writeToStorage(kind: StorageKind, value: string | null) {
  const storage = kind === "session" ? sessionStorage : localStorage;
  const other = kind === "session" ? localStorage : sessionStorage;
  if (value) {
    storage.setItem(STORAGE_KEY, value);
  } else {
    storage.removeItem(STORAGE_KEY);
  }
  // 兩種 storage 只會有一份生效中的登入狀態，另一種要清乾淨，不然
  // 下次 initAuth() 有可能讀到一份過期、沒同步更新的舊資料。
  other.removeItem(STORAGE_KEY);
}

// rememberMe 只有 login() 會明確傳進來（使用者當下勾選的結果）；其餘呼叫
// （signup、logout、上傳大頭貼後更新 user 物件……）都不傳，交給
// getActiveStorageKind() 決定要寫回目前正在用的哪一種 storage。
function persist(state: AuthState, rememberMe?: boolean) {
  if (!import.meta.client) return;
  const kind: StorageKind = rememberMe === undefined ? getActiveStorageKind() : rememberMe ? "local" : "session";
  writeToStorage(kind, state.user && state.token ? JSON.stringify({ user: state.user, token: state.token }) : null);
}

// 給 useApi.ts 的全域 401 攔截用：伺服器回 401（session 已經過期或被
// 刪除）時，直接在這裡清掉登入狀態＋localStorage/sessionStorage，不用等
// 使用者自己發現「明明看起來是登入的，點什麼都失敗」。特意獨立匯出成
// 一個函式（不是直接 export useAuthState），呼叫端只需要知道「清掉登入
// 狀態」這個意圖，不需要拿到整個 state ref 自己改。
export function clearAuthState() {
  const state = useAuthState();
  state.value = { user: null, token: null };
  persist(state.value);
}

/** App.vue 掛載時呼叫一次，把 localStorage／sessionStorage 裡的登入狀態讀回 useState。 */
export function initAuth() {
  const state = useAuthState();
  if (!import.meta.client) return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.user && parsed?.token) {
      state.value = { user: parsed.user, token: parsed.token };
    }
  } catch {
    // 存的內容壞掉就當作沒登入，不要讓整頁掛掉
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function useAuth() {
  const state = useAuthState();
  const { apiFetch } = useApi();
  // useI18n() 一定要在這裡（useAuth() 呼叫當下，也就是元件 setup() 最
  // 上層執行的時候）拿，不能等到 forgotPassword() 真的被呼叫（按下表單
  // 送出鈕）才臨時呼叫——那時候已經離開 setup() 的同步執行範圍，useI18n()
  // 會直接噴「Must be called at the top of a setup function」（跟
  // useApi.ts 的 401 攔截曾經踩過的雷一樣）。
  const { locale } = useI18n();

  async function signup(name: string, email: string, password: string) {
    const data = await apiFetch<{ user: AuthUser; token: string }>(
      "/api/auth/signup",
      { method: "POST", body: { name, email, password } }
    );
    state.value = { user: data.user, token: data.token };
    persist(state.value, true);
    return data.user;
  }

  async function login(email: string, password: string, rememberMe = true) {
    const data = await apiFetch<{ user: AuthUser; token: string }>(
      "/api/auth/login",
      { method: "POST", body: { email, password } }
    );
    state.value = { user: data.user, token: data.token };
    persist(state.value, rememberMe);
    return data.user;
  }

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      state.value = { user: null, token: null };
      persist(state.value);
    }
  }

  // 上傳/刪除大頭貼都回傳最新的完整 user 物件（含新的 avatarUrl），直接
  // 整個換掉 state 裡的 user 就好，不用自己組 avatarUrl——後端才知道
  // ?v= 版本號要用哪個時間戳記，前端猜的話容易跟後端算出來的不一致。
  async function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const data = await apiFetch<{ user: AuthUser }>("/api/users/me/avatar", {
      method: "POST",
      body: formData,
    });
    state.value = { ...state.value, user: data.user };
    persist(state.value);
    return data.user;
  }

  async function removeAvatar() {
    const data = await apiFetch<{ user: AuthUser }>("/api/users/me/avatar", {
      method: "DELETE",
    });
    state.value = { ...state.value, user: data.user };
    persist(state.value);
    return data.user;
  }

  // 忘記密碼／重設密碼都不涉及目前的登入狀態（forgotPassword 甚至不用
  // 登入就能呼叫），不用碰 state，單純轉呼叫後端就好。
  // 讓重設密碼信跟著使用者當下的介面語言走（跟 index.vue 呼叫 /api/chat
  // 時傳 language 是同一個道理）。
  async function forgotPassword(email: string) {
    return apiFetch<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: { email, language: locale.value },
    });
  }

  async function resetPassword(token: string, password: string) {
    return apiFetch<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: { token, password },
    });
  }

  return {
    user: computed(() => state.value.user),
    token: computed(() => state.value.token),
    isLoggedIn: computed(() => Boolean(state.value.user)),
    signup,
    login,
    logout,
    uploadAvatar,
    removeAvatar,
    forgotPassword,
    resetPassword,
  };
}
