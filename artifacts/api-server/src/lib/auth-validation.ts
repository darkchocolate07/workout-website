/** Returns error message or null if valid. */
export function validateUsername(raw: string): string | null {
  const u = raw.trim();
  if (u.length < 3 || u.length > 32) {
    return "Username must be 3–32 characters.";
  }
  if (!/^[a-zA-Z0-9_]+$/.test(u)) {
    return "Username may only contain letters, numbers, and underscores.";
  }
  return null;
}

export function validatePassword(raw: string): string | null {
  if (raw.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (raw.length > 128) {
    return "Password is too long.";
  }
  return null;
}
