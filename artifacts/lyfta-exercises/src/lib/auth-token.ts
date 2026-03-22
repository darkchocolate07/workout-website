/** localStorage key for JWT (must match AuthProvider). */
export const AUTH_TOKEN_STORAGE_KEY = "lyfta_auth_token";

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function getAuthBearerHeaders(): HeadersInit {
  const t = getStoredAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
