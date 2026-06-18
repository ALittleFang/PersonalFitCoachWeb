const USER_ID_KEY = "user_id";
const TOKEN_KEY = "auth_token";
const USER_NAME_KEY = "user_name";

const isBrowser = () => typeof window !== "undefined";

export const userStorage = {
  getUserId(): string | null {
    return isBrowser() ? window.localStorage.getItem(USER_ID_KEY) : null;
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
