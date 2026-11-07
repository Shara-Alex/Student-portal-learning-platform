/**
 * Token storage. The backend gives us two JWTs on login:
 *  - access  (short-lived, sent with every request)
 *  - refresh (long-lived, used to get a new access token)
 */
const ACCESS = "access_token";
const REFRESH = "refresh_token";

export const auth = {
  getAccess: () => localStorage.getItem(ACCESS),
  getRefresh: () => localStorage.getItem(REFRESH),
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
  isLoggedIn: () => !!localStorage.getItem(ACCESS),
};
