// Real localStorage usage — legitimate here since this is a deployed Next.js
// app, not a claude.ai artifact (the "never use localStorage" restriction is
// specifically about sandboxed artifacts, not production web apps).
const TOKEN_KEY = "k_auth_token";
const USER_KEY = "k_auth_user";

export interface AuthUser {
  id: string; email: string; fullName: string; role: string; emailVerified: boolean;
}

export function getStoredAuth(): { token: string; user: AuthUser } | null {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    if (!token || !userRaw) return null;
    return { token, user: JSON.parse(userRaw) };
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
