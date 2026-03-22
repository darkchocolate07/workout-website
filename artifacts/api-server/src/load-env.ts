import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function resolveEnvFilePath(): string | undefined {
  const bundleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(bundleDir, "..", ".env"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "artifacts", "api-server", ".env"),
  ];
  const seen = new Set<string>();
  for (const p of candidates) {
    const norm = path.normalize(p);
    if (seen.has(norm)) continue;
    seen.add(norm);
    if (existsSync(norm)) return norm;
  }
  return undefined;
}

/**
 * Load the first existing `.env` (next to the built bundle, cwd, or monorepo
 * `artifacts/api-server/.env`) into `process.env` before other modules read env.
 * Does not override variables already set (e.g. Replit secrets, shell exports).
 */
export function loadLocalEnv(): void {
  const envPath = resolveEnvFilePath();
  if (!envPath) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadLocalEnv();
