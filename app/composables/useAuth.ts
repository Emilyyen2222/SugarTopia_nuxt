/**
 * 對應後端 /api/auth/signup、/api/auth/login、/api/auth/logout、/api/auth/me
 * （main.py），登入狀態跟 vanilla 版本的 auth.js 一樣存在 localStorage，
 * key 沿用同一個名字（sugartopia_auth），這樣如果哪天兩個版本並存，登入
 * 狀態還是共用同一份，不會互相衝突。
 *
 * 用 Nuxt 的 useState 存在記憶體裡的 reactive 狀態（SSR 安全，不會像直接
 * 用 window.localStorage 那樣在伺服器端算圖時噴錯），實際的 localStorage
 * 讀寫另外用 import.meta.client 保護。
 */
const STORAGE_KEY = "sugartopia_auth";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  createdAt: string;
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

function persist(state: AuthState) {
  if (!import.meta.client) return;
  if (state.user && state.token) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: state.user, token: state.token })
    );
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** App.vue 掛載時呼叫一次，把 localStorage 裡的登入狀態讀回 useState。 */
export function initAuth() {
  const state = useAuthState();
  if (!import.meta.client) return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.user && parsed?.token) {
      state.value = { user: parsed.user, token: parsed.token };
    }
  } catch {
    // localStorage 裡的內容壞掉就當作沒登入，不要讓整頁掛掉
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function useAuth() {
  const state = useAuthState();
  const { apiFetch } = useApi();

  async function signup(name: string, email: string, password: string) {
    const data = await apiFetch<{ user: AuthUser; token: string }>(
      "/api/auth/signup",
      { method: "POST", body: { name, email, password } }
    );
    state.value = { user: data.user, token: data.token };
    persist(state.value);
    return data.user;
  }

  async function login(email: string, password: string) {
    const data = await apiFetch<{ user: AuthUser; token: string }>(
      "/api/auth/login",
      { method: "POST", body: { email, password } }
    );
    state.value = { user: data.user, token: data.token };
    persist(state.value);
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

  return {
    user: computed(() => state.value.user),
    token: computed(() => state.value.token),
    isLoggedIn: computed(() => Boolean(state.value.user)),
    signup,
    login,
    logout,
  };
}
