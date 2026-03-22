/**
 * Resolves an API path the same way the generated client does when
 * `VITE_API_BASE_URL` is set in `main.tsx`.
 */
export function resolveApiPath(path: string): string {
  const explicit = import.meta.env.VITE_API_BASE_URL?.trim();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (explicit) {
    return `${explicit.replace(/\/+$/, "")}${normalized}`;
  }
  return normalized;
}
