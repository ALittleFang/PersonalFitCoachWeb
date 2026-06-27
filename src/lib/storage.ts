const USER_ID_KEY = "user_id";
const TOKEN_KEY = "auth_token";
const USER_NAME_KEY = "user_name";

const isBrowser = () => typeof window !== "undefined";

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return window.atob(padded);
};

const getUserIdFromToken = (token: string | null) => {
  if (!token || !isBrowser()) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(token.split(".")[1] || ""));
    return typeof payload.sub === "string" && /^\d{16,}$/.test(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
};

export const userStorage = {
  getUserId(): string | null {
    if (!isBrowser()) return null;
    const storedUserId = window.localStorage.getItem(USER_ID_KEY);
    const tokenUserId = getUserIdFromToken(window.localStorage.getItem(TOKEN_KEY));

    if (tokenUserId && tokenUserId !== storedUserId) {
      window.localStorage.setItem(USER_ID_KEY, tokenUserId);
      return tokenUserId;
    }

    return storedUserId;
  },
  setUserId(userId: string | number): void {
    if (isBrowser()) window.localStorage.setItem(USER_ID_KEY, String(userId));
  },
  clearUserId(): void {
    if (isBrowser()) window.localStorage.removeItem(USER_ID_KEY);
  },
  getToken(): string | null {
    return isBrowser() ? window.localStorage.getItem(TOKEN_KEY) : null;
  },
  getAuthToken(): string | null {
    return this.getToken();
  },
  setToken(token: string): void {
    if (isBrowser()) window.localStorage.setItem(TOKEN_KEY, token);
  },
  setAuthToken(token: string): void {
    this.setToken(token);
  },
  getUserName(): string | null {
    return isBrowser() ? window.localStorage.getItem(USER_NAME_KEY) : null;
  },
  setUserName(name: string): void {
    if (isBrowser()) window.localStorage.setItem(USER_NAME_KEY, name);
  },
  clear(): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(USER_ID_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_NAME_KEY);
  },
  clearAll(): void {
    this.clear();
  },
};
