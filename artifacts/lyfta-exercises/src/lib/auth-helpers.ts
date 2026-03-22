/**
 * If the API returns 401, clear the session via `logout` and return true so the
 * caller can throw a friendly error instead of treating the body as a generic failure.
 */
export function isUnauthorized(res: Response, logout: () => void): boolean {
  if (res.status !== 401) return false;
  logout();
  return true;
}
